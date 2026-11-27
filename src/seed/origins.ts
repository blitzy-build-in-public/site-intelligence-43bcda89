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
 * The supplier keys `supplierIds` names are the seven tier-1 suppliers declared in
 * `src/seed/suppliers.ts`, and every one of them is reachable from at least one origin below:
 *
 * | Supplier key | Supplier's role                           | Country  | Fed by                        |
 * | ------------ | ----------------------------------------- | -------- | ----------------------------- |
 * | `SUP-ORVA`   | die-cast and machined aluminium housings  | Poland   | `ORG-ALU`                     |
 * | `SUP-TALV`   | aluminium sheet and structural bracketry  | Czechia  | `ORG-ALU`                     |
 * | `SUP-VELT`   | copper windings and electrical laminations| Italy    | `ORG-CU`, `ORG-FE`            |
 * | `SUP-SOND`   | permanent magnets and magnetic assemblies | Vietnam  | `ORG-RE`, `ORG-CO`            |
 * | `SUP-KRIM`   | circuit-board assemblies and sensors      | Malaysia | `ORG-CU`, `ORG-RE`, `ORG-SEMI`|
 * | `SUP-HALV`   | steel stampings and turned fasteners      | Spain    | `ORG-FE`                      |
 * | `SUP-MIRK`   | engineered polymer mouldings and seals    | Morocco  | `ORG-POL`                     |
 *
 * Four origins feed more than one supplier and three suppliers draw on more than one origin, so a
 * network position can be shared: that density is what lets the four chokepoints of the
 * market-intelligence pack (`CHK-01` to `CHK-04`, `src/seed/market-intelligence.ts`) be described
 * against this graph instead of restating it. The chokepoint records themselves are not here.
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
   * nothing would be an unreachable node in the graph lens.
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
    supplierIds: ['SUP-ORVA', 'SUP-TALV'],
  },
  {
    id: 'ORG-CU',
    name: 'Punta Alcora Copper Refinery',
    country: 'Chile',
    latitude: -23.48,
    longitude: -69.9,
    supplierIds: ['SUP-VELT', 'SUP-KRIM'],
  },
  {
    id: 'ORG-RE',
    name: 'Yinshan Separation Works',
    country: 'China',
    latitude: 40.62,
    longitude: 109.98,
    supplierIds: ['SUP-SOND', 'SUP-KRIM'],
  },
  {
    id: 'ORG-CO',
    name: 'Lualaba Cobalt Refinery',
    country: 'Democratic Republic of the Congo',
    latitude: -10.78,
    longitude: 25.6,
    supplierIds: ['SUP-SOND'],
  },
  {
    id: 'ORG-FE',
    name: 'Alcorva Steel Works',
    country: 'Spain',
    latitude: 43.26,
    longitude: -2.95,
    supplierIds: ['SUP-HALV', 'SUP-VELT'],
  },
  {
    id: 'ORG-POL',
    name: 'Weserbrook Polymer Works',
    country: 'Germany',
    latitude: 52.28,
    longitude: 8.92,
    supplierIds: ['SUP-MIRK'],
  },
  {
    id: 'ORG-SEMI',
    name: 'Kinta Wafer Works',
    country: 'Malaysia',
    latitude: 4.6,
    longitude: 101.09,
    supplierIds: ['SUP-KRIM'],
  },
];
