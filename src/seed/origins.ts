/**
 * The seven tier-2 origins of the supply network: the upstream sites whose output reaches the
 * plants through the seven tier-1 suppliers.
 *
 * Fixing inputs:
 * - AAP 0.12.2 §2 (`Supplier`, `Origin`, `Material`): "each origin feeds one or more suppliers;
 *   supplier-to-product reach is derived from materials and drives the graph lens".
 * - AAP 0.2.3 scale table: "7 tier-2 origins".
 * - `src/types/topology.ts`: the topology handler turns each record here into a `TopologyNode` of
 *   kind `origin` (id, label, latitude and longitude filled from `id`, `name`, `latitude` and
 *   `longitude`) and emits one origin-to-supplier `TopologyLane` per `supplierIds` entry. This
 *   module is therefore what the graph lens's upstream path and the map lens's origin marks are
 *   drawn from, and an unreachable supplier would be a network node with no upstream edge.
 *
 * This module owns the origin identifiers: every `ORG-…` key in the seed is one of the seven records
 * below, and the material records of `src/seed/materials.ts` name one of them in their `originId`.
 * The supplier keys `supplierIds` names are the seven tier-1 suppliers declared in
 * `src/seed/suppliers.ts`, each derived as the primary supplier of every material that names the
 * site — the one exception, `ORG-CO`, is stated below — and every one of those suppliers is
 * reachable from at least one origin below:
 *
 * | Supplier key                | Supplier's role                            | Country              | Fed by                                   |
 * | --------------------------- | ------------------------------------------ | -------------------- | ---------------------------------------- |
 * | `SUP-HANSA-METALL`          | steel and stainless long products          | Norway               | `ORG-FE`                                 |
 * | `SUP-BAJIO-METALES`         | aluminium sheet and copper busbar          | Mexico               | `ORG-ALU`, `ORG-CU`                      |
 * | `SUP-VLTAVA-GUSS`           | iron and aluminium castings                | Czechia              | `ORG-ALU`, `ORG-FE`                      |
 * | `SUP-RHEINSTERN-ELEKTRONIK` | control electronics, sensors and drives    | Germany              | `ORG-CU`, `ORG-RE`, `ORG-CO`, `ORG-SEMI` |
 * | `SUP-NORDWERK-ANTRIEB`      | bearings, shafts and gear blanks           | Austria              | `ORG-FE`                                 |
 * | `SUP-DONAU-DICHTUNG`        | seals, gaskets and hose assemblies         | Austria              | `ORG-POL`                                |
 * | `SUP-MERIDIAN-INDUSTRIAL`   | fasteners, springs, finish and consumables | United Arab Emirates | `ORG-FE`, `ORG-POL`                      |
 *
 * `ORG-CO` is the one site that no material's substance reaches. The cobalt it refines enters the
 * network through the permanent magnets of the brushless motor, which `SUP-RHEINSTERN-ELEKTRONIK`
 * builds, so this site names that supplier even though no material's `originId` points here.
 *
 * Four origins feed more than one supplier and four suppliers draw on more than one origin, so a
 * network position can be shared: that density is what lets the two crossings the client network
 * actually shares (`CHK-01` and `CHK-02` of `src/seed/market-intelligence.ts`) be described against
 * this graph instead of restated. The pack's other two crossings reach no position here and stand in
 * the pack alone, and the chokepoint records themselves are not here.
 *
 * DERIVATION — seed §2 is not on disk, so the seven origin records below are authored rather than
 * transcribed. What the inputs fix is the scale and the relation: AAP 0.2.3's 7 tier-2 origins, and
 * AAP 0.12.2's "each origin feeds one or more suppliers". No input fixes a facility name, a country
 * or a coordinate, so each is invented inside the record set's own vocabulary, with the country
 * chosen so that its coordinate sits inside it the way the map lens expects. If §2 is supplied
 * later, its table transcribes over these records and supersedes them with no change to any
 * consumer, because every consumer reads an origin through the service.
 *
 * Rules this module is built to satisfy:
 * - P-2: only `src/services/mock/seed-loader.ts` imports this folder, and this module imports the
 *   identifier aliases of `src/types` and nothing else, so an origin reaches a screen only through
 *   the typed service interface.
 * - P-6: `name`, `country`, `latitude` and `longitude` are record content, not a computation. No
 *   aggregate, expected result or fixture value appears here, and nothing in this module reads the
 *   clock, a random source or a mutable global.
 * - P-5: no competitor, radar score, chokepoint measure or other market-intelligence value. The
 *   first-party network stays separate from the market pack.
 * - P-7: every facility name is synthetic and no real vendor, customer, carmaker or cloud product
 *   name appears. Countries are real because a coordinate has to sit inside one.
 * - B-1: no address, tile reference or other URL — coordinates are record content for the bundled
 *   boundaries, and the map lens projects them. B-2: no credential, no environment read.
 *
 * Coordinates are decimal degrees in the WGS 84 datum on the usual signed convention (south and
 * west negative), each inside the named country.
 */

import type { OriginId, SupplierId } from '../types';

/**
 * One tier-2 origin: an upstream site, its position and the suppliers it feeds.
 */
export interface Origin {
  /** The origin's own identifier, `ORG-` followed by its key; the topology node id. */
  id: OriginId;

  /** The facility name the map lens, the graph lens and the "View as table" view print. */
  name: string;

  /** The country the site stands in, which the coordinate below must fall inside. */
  country: string;

  /** Latitude in decimal degrees; a record value the map lens projects. */
  latitude: number;

  /** Longitude in decimal degrees; a record value the map lens projects. */
  longitude: number;

  /**
   * The tier-1 suppliers this origin feeds, by their keys in `src/seed/suppliers.ts`. One entry per
   * origin-to-supplier lane the topology payload emits; never empty, because an origin that feeds
   * nothing would be an unreachable node in the graph lens. The set holds the `primarySupplierId` of
   * every material whose `originId` is this origin, so a lane exists for each material bought
   * through a supplier that carries this site's output, and it also names, for the one site whose
   * substance reaches the network through a component rather than through a material of its own,
   * the supplier that builds that component: `ORG-CO` names `SUP-RHEINSTERN-ELEKTRONIK`, which
   * builds the brushless motor whose permanent magnets carry the site's cobalt.
   */
  supplierIds: readonly SupplierId[];
}

/**
 * The seven tier-2 origins, ordered by the material family each site produces.
 */
export const ORIGINS: readonly Origin[] = [
  {
    id: 'ORG-ALU',
    name: 'Vardhavn Billet Works',
    country: 'Norway',
    latitude: 62.34,
    longitude: 6.36,
    supplierIds: ['SUP-BAJIO-METALES', 'SUP-VLTAVA-GUSS'],
  },
  {
    id: 'ORG-CU',
    name: 'Punta Alcora Copper Refinery',
    country: 'Chile',
    latitude: -23.48,
    longitude: -69.9,
    supplierIds: ['SUP-BAJIO-METALES', 'SUP-RHEINSTERN-ELEKTRONIK'],
  },
  {
    id: 'ORG-RE',
    name: 'Yinshan Separation Works',
    country: 'China',
    latitude: 40.62,
    longitude: 109.98,
    supplierIds: ['SUP-RHEINSTERN-ELEKTRONIK'],
  },
  {
    // Cobalt reaches the network through the permanent-magnet motor this supplier builds, so the
    // refined-cobalt site feeds the control-electronics supplier even though no material names it.
    id: 'ORG-CO',
    name: 'Lualaba Cobalt Refinery',
    country: 'Democratic Republic of the Congo',
    latitude: -10.78,
    longitude: 25.6,
    supplierIds: ['SUP-RHEINSTERN-ELEKTRONIK'],
  },
  {
    id: 'ORG-FE',
    name: 'Alcorva Steel Works',
    country: 'Spain',
    latitude: 43.26,
    longitude: -2.95,
    supplierIds: [
      'SUP-HANSA-METALL',
      'SUP-VLTAVA-GUSS',
      'SUP-NORDWERK-ANTRIEB',
      'SUP-MERIDIAN-INDUSTRIAL',
    ],
  },
  {
    id: 'ORG-POL',
    name: 'Weserbrook Polymer Works',
    country: 'Germany',
    latitude: 52.28,
    longitude: 8.92,
    supplierIds: ['SUP-DONAU-DICHTUNG', 'SUP-MERIDIAN-INDUSTRIAL'],
  },
  {
    id: 'ORG-SEMI',
    name: 'Kinta Wafer Works',
    country: 'Malaysia',
    latitude: 4.6,
    longitude: 101.09,
    supplierIds: ['SUP-RHEINSTERN-ELEKTRONIK'],
  },
];
