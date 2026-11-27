/**
 * The simulated market-intelligence pack v2026.11: the three competitor networks, the four shared
 * chokepoints, the five resilience axes of the SCR-13 radar and the four series drawn on it.
 *
 * Fixing inputs:
 * - AAP 0.12.2's `Atlas` row fixes what the pack contributes to the competitive atlas —
 *   `competitors`, `chokepoints`, `radarAxes` and `radarSeries` — and AAP 0.12.4's SCR-13 row
 *   fixes how each is shown: a banner naming the simulated pack, a selector filtered by product
 *   class, a network view with shared chokepoints, a five-axis radar whose competitor and client
 *   series each carry their own label, and a chokepoint table of overlap, competitor buffer days
 *   and a contention note.
 * - `platform-contracts.md` §1 fixes the identifier patterns — `CMP-nn` for a competitor and
 *   `CHK-nn` for a chokepoint — and AAP 0.2.3 fixes the scale at three competitors and four
 *   chokepoints.
 * - The market-intelligence pack belongs to the seed document, which is not part of this
 *   repository. Its values are therefore invented for this demonstration rather than transcribed
 *   from it: the three competitor networks and their lanes, the four crossings, the buffer days,
 *   the radar axes and every radar score below are this module's own authored records, as the
 *   DERIVATION paragraph states.
 *
 * This is the only module in the application that holds a market-intelligence value (rule P-5).
 * Provenance is therefore structural rather than conventional: every competitor network, every
 * chokepoint and every competitor series carries `provenance: 'market_intelligence'`, the client's
 * own radar series sits beside them as its own record carrying its own label, and no member of this
 * module sums, averages or compares a market-intelligence value with a first-party one. The
 * chokepoint fields the table shows are record content shipped with the pack; the live overlap and
 * contention the chokepoint table prints are computed from the pack alone by the aggregation layer
 * and the atlas handler (AAP 0.8), never here.
 *
 * The exported `MarketIntelligencePack` is the market-intelligence half of the `Atlas` DTO and
 * deliberately omits two of its members. `clientSites` is the client's own network and
 * `productClasses` names the client's own products, so both are first-party records that live in
 * `src/seed/plants.ts` and `src/seed/products.ts`; the atlas handler merges them into the DTO. A
 * second copy here would be a first-party record inside the pack, which rule P-5 keeps out.
 *
 * The pack classifies its competitors too, which is what SCR-13's product-class selector narrows
 * (AAP 0.12.4, rule P-6). Each network states the client product classes it competes in — the
 * identifiers `src/seed/products.ts` holds, so the selector's list and the classification share one
 * vocabulary — and each competitor series names the network it scores, the client's own series
 * naming none. Both members are classification rather than measurement: no competitor figure is
 * added, summed or compared with a first-party one through either (rule P-5).
 *
 * Labels are referenced, never retyped (rule P-1). `packLabel` is the `ATLAS_PACK_BANNER`
 * constant of `src/types/primitives.ts`, whose text is also where the pack's release version is
 * quoted; `MARKET_PACK_VERSION` below is the one owner of that release label for the records
 * themselves, so a re-versioned pack moves both together. Every competitor series carries the
 * market-intelligence member of `SIM_LABELS` and the client series carries
 * `CLIENT_SELF_ASSESSMENT_LABEL`, the companion string that records a self-assessment rather than
 * a competitor estimate. Competitor names carry the competitor-name tag of `./primitives` where
 * the interface prints them, which the rendering components apply, so no name string and no tag
 * text is written here.
 *
 * Scales, all of them record content on the pack's own conventions:
 * - `Chokepoint.overlap` is the share of the pack's three competitor networks that route through
 *   the crossing, as a whole percent: `100` for all three, `67` for two, `33` for one. Each value
 *   below agrees with the lanes that carry the crossing's identifier, so the record can be read off
 *   the networks without a second source.
 * - `Chokepoint.competitorBufferDays` holds one entry per competitor that routes through the
 *   crossing, in days of buffer that competitor holds there. A competitor absent from the map does
 *   not use the crossing, so the table renders no buffer for it rather than a misleading zero.
 * - A radar score is an integer from `0` to `100` on a fixed pack scale where `100` is the
 *   strongest reading the pack records, one score per axis in `radarAxes` order. The mapping from
 *   that range to the radar's axes belongs to the chart component, which owns the axis scale.
 *
 * DERIVATION — the pack is authored in full. `platform-seed-data.md` is not part of this repository,
 * so no competitor name, site, lane, crossing, buffer day or radar score below is transcribed from
 * it, and the whole pack is invented for this demonstration. What the inputs fix is the pack's shape
 * and scale: AAP 0.2.3's three competitors and four chokepoints, contracts §1's `CMP-nn` and `CHK-nn`
 * patterns, and AAP 0.12.4's SCR-13 statement of what the atlas renders from it. If the seed
 * document is supplied later, its pack transcribes over these records and supersedes them with no
 * change to any consumer, because every consumer reads the pack through the service.
 *
 * Rules this module is built to satisfy:
 * - P-5: `provenance` on every network, chokepoint and series; the client's series and the
 *   competitors' series stay separate records with separate labels; no member combines the two
 *   families and no first-party measure appears anywhere in the pack.
 * - P-1: the pack banner, the competitor-series label and the client-series label are the fixed
 *   constants of `./primitives`, and no label text is retyped.
 * - P-6: nothing here computes. Every value is record content the seed dataset states, and no
 *   aggregate, expected result or fixture value appears.
 * - P-7: every company name is invented for this demonstration; no real vendor, customer, carmaker
 *   or cloud product name appears. The crossings and the sites are places, because a coordinate has
 *   to sit somewhere real.
 * - P-2: it imports `../types` and nothing else, and only `src/services/mock/seed-loader.ts` may
 *   import this module, so the pack reaches a screen only through the typed service interface.
 * - B-1: no address, feed or tile reference — the network view is drawn over the boundaries
 *   bundled in `src/assets/geo/`. B-2: no credential field and no environment read.
 *
 * `Chokepoint.overlap` is a bare number whose scale the atlas types leave to the record that
 * supplies it, stated here as a whole percent of the three networks. The chokepoint records also
 * carry `latitude` and `longitude` for the halo the map lens draws, and `clientNodeIds` — node
 * identifiers only, never a first-party measure — so the pack reads against the origin and supplier
 * graph. The client's radar series sits here at `provenance: 'first_party'`, no other record set
 * carrying that self-assessment, and shares no member with a competitor series.
 */

import type {
  AtlasSeries,
  Chokepoint,
  CompetitorNetwork,
  OriginId,
  RadarAxis,
  SimLabel,
  SupplierId,
} from '../types';
import { ATLAS_PACK_BANNER, CLIENT_SELF_ASSESSMENT_LABEL, SIM_LABELS } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Pack identity and labels
 * ------------------------------------------------------------------------------------------- */

/**
 * The one owner of the pack's release label. The banner string in `./primitives` quotes the same
 * release, so a re-versioned pack moves this constant and that banner together.
 */
export const MARKET_PACK_VERSION = 'v2026.11';

/**
 * The label every competitor series carries: the market-intelligence member of `SIM_LABELS`, taken
 * by position so the fixed text is written once, in `./primitives` (rule P-1).
 */
const MARKET_INTELLIGENCE_SIM_LABEL: SimLabel = SIM_LABELS[5];

/* ---------------------------------------------------------------------------------------------
 * Record shapes
 * ------------------------------------------------------------------------------------------- */

/**
 * One shared chokepoint as this pack records it: the `Chokepoint` row the table lists, plus the
 * position the map lens draws its halo at and the client network positions the crossing reaches.
 *
 * The three added members are seed content, not members of the shared `Chokepoint` shape:
 * `latitude` and `longitude` are decimal degrees on the usual signed convention (south and west
 * negative) for the halo the S3 canvas draws, and `clientNodeIds` names the client's own
 * topology nodes — `ORG-…` or `SUP-…` — whose inbound lane crosses the crossing. An empty list
 * is a reading rather than a gap: the crossing exists in the market pack alone.
 */
export interface ChokepointRecord extends Chokepoint {
  /** Latitude of the crossing in decimal degrees, for the canvas halo. */
  latitude: number;

  /** Longitude of the crossing in decimal degrees, for the canvas halo. */
  longitude: number;

  /** The client's own network positions whose inbound lane crosses here; empty when none does. */
  clientNodeIds: Array<OriginId | SupplierId>;
}

/**
 * The market-intelligence half of the `Atlas` DTO: every member the competitive atlas takes from
 * the pack, and no member that carries a first-party record.
 *
 * `clientSites` and `productClasses` are absent on purpose — they are the client's own plants and
 * products, held in `src/seed/plants.ts` and `src/seed/products.ts` and merged into the DTO by the
 * atlas handler (rule P-5). Every list stays mutable so the adapter can build and replace it from
 * seeded state, exactly as the shapes in `./atlas` do.
 */
export interface MarketIntelligencePack {
  /** The banner naming the simulated pack: the fixed `ATLAS_PACK_BANNER` string. */
  packLabel: string;

  /** The three competitor networks, ordered `CMP-01` to `CMP-03`. */
  competitors: CompetitorNetwork[];

  /** The four shared chokepoints, ordered `CHK-01` to `CHK-04`. */
  chokepoints: ChokepointRecord[];

  /** The five radar axes, in the order every series' scores align to. */
  radarAxes: RadarAxis[];

  /** The client's self-assessment and one series per competitor, each carrying its own label. */
  radarSeries: AtlasSeries[];
}

/* ---------------------------------------------------------------------------------------------
 * The pack
 * ------------------------------------------------------------------------------------------- */

/**
 * The simulated market-intelligence pack v2026.11 the competitive atlas serves.
 *
 * Three peer manufacturers of the client's own product classes, each with its sites and the lanes
 * between them; the four crossings those lanes share; the five axes of the resilience radar; and
 * four series — the client's self-assessment and one per competitor. Every competitor record is
 * tagged `market_intelligence` and no record here carries a first-party figure (rule P-5).
 */
export const MARKET_INTELLIGENCE: MarketIntelligencePack = {
  packLabel: ATLAS_PACK_BANNER,

  competitors: [
    /**
     * CMP-01: an Asian-assembly network with a European finishing plant and a Mexican components
     * plant. Its Europe-bound lane names the Suez Canal crossing and its transpacific lane the
     * Panama Canal crossing; the Atlantic lane between its two western plants names none.
     *
     * The pack classifies it in the client's `PRD-R75` class, which is the class SCR-13's selector
     * filters on: a classification of the competitor, carrying no first-party measure.
     */
    {
      competitorId: 'CMP-01',
      label: 'Aurelvik Drive Systems',
      provenance: 'market_intelligence',
      productClasses: ['PRD-R75'],
      sites: [
        {
          id: 'CMP-01-S1',
          competitorId: 'CMP-01',
          label: 'Aurelvik Ningbo Drive Plant',
          latitude: 29.87,
          longitude: 121.55,
        },
        {
          id: 'CMP-01-S2',
          competitorId: 'CMP-01',
          label: 'Aurelvik Gdańsk Assembly',
          latitude: 54.35,
          longitude: 18.65,
        },
        {
          id: 'CMP-01-S3',
          competitorId: 'CMP-01',
          label: 'Aurelvik Monterrey Components',
          latitude: 25.69,
          longitude: -100.32,
        },
      ],
      lanes: [
        { fromId: 'CMP-01-S1', toId: 'CMP-01-S2', chokepointId: 'CHK-02' },
        { fromId: 'CMP-01-S1', toId: 'CMP-01-S3', chokepointId: 'CHK-03' },
        { fromId: 'CMP-01-S2', toId: 'CMP-01-S3' },
      ],
    },

    /**
     * CMP-02: a southeast-Asian moulding plant feeding a Moroccan finishing plant and a Czech
     * housings plant. Its two Malay-bound lanes name the Strait of Malacca crossing and the Suez
     * Canal crossing, and the Moroccan-to-Czech lane names the Strait of Gibraltar crossing.
     *
     * The pack classifies it in the client's `PRD-A200` class, which is the class SCR-13's selector
     * filters on: a classification of the competitor, carrying no first-party measure.
     */
    {
      competitorId: 'CMP-02',
      label: 'Norbrek Housings Group',
      provenance: 'market_intelligence',
      productClasses: ['PRD-A200'],
      sites: [
        {
          id: 'CMP-02-S1',
          competitorId: 'CMP-02',
          label: 'Norbrek Kuantan Moulding Plant',
          latitude: 3.81,
          longitude: 103.33,
        },
        {
          id: 'CMP-02-S2',
          competitorId: 'CMP-02',
          label: 'Norbrek Tanger Finishing Plant',
          latitude: 35.76,
          longitude: -5.83,
        },
        {
          id: 'CMP-02-S3',
          competitorId: 'CMP-02',
          label: 'Norbrek Ostrava Housings Plant',
          latitude: 49.82,
          longitude: 18.26,
        },
      ],
      lanes: [
        { fromId: 'CMP-02-S1', toId: 'CMP-02-S2', chokepointId: 'CHK-01' },
        { fromId: 'CMP-02-S1', toId: 'CMP-02-S3', chokepointId: 'CHK-02' },
        { fromId: 'CMP-02-S2', toId: 'CMP-02-S3', chokepointId: 'CHK-04' },
      ],
    },

    /**
     * CMP-03: a Taiwanese sensor plant feeding a Portuguese assembly plant and a Mexican stamping
     * plant. Its Europe-bound lane names the Strait of Malacca crossing and its transpacific lane
     * the Panama Canal crossing; the Atlantic lane between its western plants names none.
     *
     * The pack classifies it in the client's `PRD-V40` class, which is the class SCR-13's selector
     * filters on: a classification of the competitor, carrying no first-party measure.
     */
    {
      competitorId: 'CMP-03',
      label: 'Kasvara Components',
      provenance: 'market_intelligence',
      productClasses: ['PRD-V40'],
      sites: [
        {
          id: 'CMP-03-S1',
          competitorId: 'CMP-03',
          label: 'Kasvara Kaohsiung Sensor Plant',
          latitude: 22.62,
          longitude: 120.3,
        },
        {
          id: 'CMP-03-S2',
          competitorId: 'CMP-03',
          label: 'Kasvara Aveiro Assembly',
          latitude: 40.64,
          longitude: -8.65,
        },
        {
          id: 'CMP-03-S3',
          competitorId: 'CMP-03',
          label: 'Kasvara Veracruz Stamping Plant',
          latitude: 19.17,
          longitude: -96.13,
        },
      ],
      lanes: [
        { fromId: 'CMP-03-S1', toId: 'CMP-03-S2', chokepointId: 'CHK-01' },
        { fromId: 'CMP-03-S1', toId: 'CMP-03-S3', chokepointId: 'CHK-03' },
        { fromId: 'CMP-03-S3', toId: 'CMP-03-S2' },
      ],
    },
  ],

  chokepoints: [
    /**
     * CHK-01: the Strait of Malacca crossing, used by two of the three networks, so its overlap is
     * 67 whole percent. The client's own network reaches it on the inbound lane of its Malaysian
     * tier-2 origin, `ORG-SEMI`, and of the German tier-1 supplier that draws on it,
     * `SUP-RHEINSTERN-ELEKTRONIK`.
     */
    {
      id: 'CHK-01',
      label: 'Strait of Malacca',
      overlap: 67,
      competitorBufferDays: { 'CMP-02': 5, 'CMP-03': 11 },
      contentionNote:
        'Two networks route through the strait on their Asia-Europe legs; the pack records five and eleven days of buffer for them, so a closure here reaches the assembly plant of one network within a week.',
      provenance: 'market_intelligence',
      latitude: 2.8,
      longitude: 101.4,
      clientNodeIds: ['ORG-SEMI', 'SUP-RHEINSTERN-ELEKTRONIK'],
    },

    /**
     * CHK-02: the Suez Canal crossing, used by two of the three networks, so its overlap is 67
     * whole percent. The client's own network reaches it on its Chinese and Malaysian inbound legs —
     * the lane of its Chinese tier-2 origin, `ORG-RE`, and the Malaysian lane inbound to the German
     * supplier that draws on it, `SUP-RHEINSTERN-ELEKTRONIK`.
     */
    {
      id: 'CHK-02',
      label: 'Suez Canal',
      overlap: 67,
      competitorBufferDays: { 'CMP-01': 9, 'CMP-02': 14 },
      contentionNote:
        'Two networks use the canal on their Asia-Europe legs; the pack records nine and fourteen days of buffer for them.',
      provenance: 'market_intelligence',
      latitude: 30.5,
      longitude: 32.3,
      clientNodeIds: ['ORG-RE', 'SUP-RHEINSTERN-ELEKTRONIK'],
    },

    /**
     * CHK-03: the Panama Canal crossing, used by two of the three networks, so its overlap is 67
     * whole percent. No position of the client's own network routes through it, so its
     * `clientNodeIds` is empty and the market pack uses it alone.
     */
    {
      id: 'CHK-03',
      label: 'Panama Canal',
      overlap: 67,
      competitorBufferDays: { 'CMP-01': 6, 'CMP-03': 13 },
      contentionNote:
        'Two networks use the canal on their Asia-Pacific legs; the pack records six and thirteen days of buffer for them.',
      provenance: 'market_intelligence',
      latitude: 9.08,
      longitude: -79.68,
      clientNodeIds: [],
    },

    /**
     * CHK-04: the Strait of Gibraltar crossing, used by one of the three networks, so its overlap
     * is 33 whole percent. No position of the client's own network is recorded as routing through
     * it — no material, origin or supplier record places any of their lanes at this crossing — so
     * `clientNodeIds` is empty and the market pack uses the crossing alone.
     */
    {
      id: 'CHK-04',
      label: 'Strait of Gibraltar',
      overlap: 33,
      competitorBufferDays: { 'CMP-02': 4 },
      contentionNote:
        'One network uses the strait on its Morocco-Europe leg; the pack records four days of buffer for it.',
      provenance: 'market_intelligence',
      latitude: 35.95,
      longitude: -5.6,
      clientNodeIds: [],
    },
  ],

  radarAxes: [
    { id: 'AX-SRC', label: 'Source diversity' },
    { id: 'AX-BUF', label: 'Buffer depth' },
    { id: 'AX-FLEX', label: 'Transport flexibility' },
    { id: 'AX-VIS', label: 'Visibility and traceability' },
    { id: 'AX-REC', label: 'Recovery speed' },
  ],

  radarSeries: [
    /**
     * The client's own self-assessment: a first-party reading that the radar draws beside the
     * competitor series, labelled with the companion string of `./primitives` so a reader can tell
     * the two families apart (rule P-5).
     */
    {
      id: 'SER-CLIENT',
      competitorId: null,
      label: 'Client network',
      provenance: 'first_party',
      simLabel: CLIENT_SELF_ASSESSMENT_LABEL,
      values: [72, 58, 64, 81, 66],
    },
    {
      id: 'SER-CMP-01',
      competitorId: 'CMP-01',
      label: 'Aurelvik Drive Systems',
      provenance: 'market_intelligence',
      simLabel: MARKET_INTELLIGENCE_SIM_LABEL,
      values: [83, 71, 76, 68, 74],
    },
    {
      id: 'SER-CMP-02',
      competitorId: 'CMP-02',
      label: 'Norbrek Housings Group',
      provenance: 'market_intelligence',
      simLabel: MARKET_INTELLIGENCE_SIM_LABEL,
      values: [59, 84, 61, 57, 62],
    },
    {
      id: 'SER-CMP-03',
      competitorId: 'CMP-03',
      label: 'Kasvara Components',
      provenance: 'market_intelligence',
      simLabel: MARKET_INTELLIGENCE_SIM_LABEL,
      values: [77, 63, 88, 71, 69],
    },
  ],
};

