/**
 * Seed records of the seven tier-1 suppliers, and of the materials each one is the primary
 * supplier of.
 *
 * Fixing inputs:
 * - `platform-seed-data.md` §2 is the section the supplier, tier-2 origin and material records
 *   belong to, and AAP 0.12.2 states the relations they carry: each material has one primary
 *   supplier and may have an alternate, each origin feeds one or more suppliers, and
 *   supplier-to-product reach is derived from materials and drives the graph lens. AAP 0.2.3 fixes
 *   the scale at 7 suppliers, 7 tier-2 origins and 24 materials. That section is absent from this
 *   repository, so the record content below is derived rather than transcribed.
 * - `./materials.ts` states each material's `primarySupplierId`, its optional
 *   `alternateSupplierId` and the origin behind it, so material identity and the supplier pairing
 *   are that module's to declare and this one's to mirror: every `materialIds` entry below is
 *   exactly the materials whose `primarySupplierId` is this supplier, and the union is the 24
 *   materials, once each. An alternate supplier is a second name on a material and stays on that
 *   record, so it never appears in `materialIds`.
 * - AAP 0.12.2 keeps supplier-to-product reach in the seed "because the graph lens and the canvas
 *   node badges in S2 need both before the pin screens exist in S4". A supplier reaches the
 *   products of the materials it supplies, and the handler behind `GET /topology` derives that
 *   reach by joining `materialIds` here to the material records. No product member is written here,
 *   because the reach is a derivation over two record sets rather than a property of one supplier.
 *
 * Each supplier is a tier-1 processor of one material family. The tier-2 origins behind it are every
 * origin that carries one of its materials, so a supplier whose materials span more than one
 * substance draws on more than one origin:
 *
 * | Supplier key                | Process                                    | Country              | Behind it                                |
 * | --------------------------- | ------------------------------------------ | -------------------- | ---------------------------------------- |
 * | `SUP-HANSA-METALL`          | steel and stainless long products          | Norway               | `ORG-FE`                                 |
 * | `SUP-BAJIO-METALES`         | aluminium sheet and copper busbar          | Mexico               | `ORG-ALU`, `ORG-CU`                      |
 * | `SUP-VLTAVA-GUSS`           | iron and aluminium castings                | Czechia              | `ORG-ALU`, `ORG-FE`                      |
 * | `SUP-RHEINSTERN-ELEKTRONIK` | control electronics, sensors and drives    | Germany              | `ORG-CU`, `ORG-RE`, `ORG-CO`, `ORG-SEMI` |
 * | `SUP-NORDWERK-ANTRIEB`      | bearings, shafts and gear blanks           | Austria              | `ORG-FE`                                 |
 * | `SUP-DONAU-DICHTUNG`        | seals, gaskets and hose assemblies         | Austria              | `ORG-POL`                                |
 * | `SUP-MERIDIAN-INDUSTRIAL`   | fasteners, springs, finish and consumables | United Arab Emirates | `ORG-FE`, `ORG-POL`                      |
 *
 * `onTimeDeliveryPct` is seeded record content, never a computed figure: the monthly readings of a
 * supplier ship with this dataset the way the seed file states them, and no rule of
 * `platform-contracts.md` §5 produces, rounds or aggregates them (rule P-6).
 *
 * Identifier scheme: `SUP-` and `MAT-` followed by a short uppercase mnemonic — the spelling
 * `src/types/primitives.ts` fixes, in the same `<PREFIX>-<KEY>` shape as the `PLT-` plant ids, and
 * the keys are the ones the material records name.
 *
 * DERIVATION — seed §2 is not on disk, so the seven suppliers below are authored rather than
 * transcribed. What the inputs fix is the scale and the relations: AAP 0.2.3's 7 suppliers, 7 tier-2
 * origins and 24 materials, and AAP 0.12.2's one-primary-supplier rule with an optional alternate.
 * No input fixes a company name, a country, a coordinate, a contracted lead time or a monthly on-time
 * reading, so each is invented inside the record set's own vocabulary; the `materialIds` sets are
 * not this module's to state either, because they mirror `./materials.ts` one for one. If §2 is
 * supplied later, its table transcribes over these records and supersedes them with no change to any
 * consumer, because every consumer reads a supplier through the service.
 *
 * Rules this module is built to satisfy:
 * - P-7: every company name is invented for this demonstration. No real vendor, customer, carmaker
 *   or cloud product name appears, and no real person is named.
 * - P-6: nothing here computes. The only numbers are record values — coordinates, a contracted lead
 *   time and the monthly delivery readings — and no aggregate of contracts §5 is stored.
 * - P-4: nothing here states a quality standing for a supplier. Those states belong to the PPAP
 *   records, so this module claims none of them.
 * - B-1 and B-2: no address, URL or credential appears, and nothing reads an environment variable.
 * - P-2: this folder is read only by `src/services/mock/seed-loader.ts`, and this module imports
 *   only the identifier types of `src/types`.
 *
 * OPEN ITEM: no member dates the delivery series. The interface AAP fixes carries the readings
 * only, and the seed fixes them as the six months ending November 2026 — the month before the
 * demonstration clock of contracts §1 — oldest first.
 *
 * The origin keys in the table are `./origins.ts`'s: that module owns the `ORG-…` identifiers, and its
 * `supplierIds` name every supplier above, so the "Behind it" column reads the lane set back — each
 * supplier draws on every origin that carries one of its materials.
 */

import type { MaterialId, SupplierId } from '../types';

/* ---------------------------------------------------------------------------------------------
 * The record — platform-seed-data.md §2
 * ------------------------------------------------------------------------------------------- */

/**
 * One supplier: the party a material is bought from, placed at its own site so the map lens can
 * plot it and the graph lens can band it among the supplier nodes.
 */
export interface Supplier {
  /** The supplier's identifier, `SUP-` followed by its own key. */
  id: SupplierId;

  /** The trading name the lenses, the tables and the evidence drawer print. */
  name: string;

  /** The country the site stands in, spelled as the seed set spells it. */
  country: string;

  /** Site latitude in decimal degrees, north positive, for the map lens to project. */
  latitude: number;

  /** Site longitude in decimal degrees, east positive, for the map lens to project. */
  longitude: number;

  /** Contracted lead time in calendar days, from order release to goods receipt at the plant. */
  leadTimeDays: number;

  /** The materials this supplier is the primary supplier of; each material has exactly one. */
  materialIds: readonly MaterialId[];

  /**
   * Six monthly on-time delivery readings in per cent, oldest first, ending with November 2026.
   *
   * Seeded record content under rule P-6: every value ships with the dataset, and no rule computes,
   * rounds or aggregates it. The series is the same length for every supplier so a comparison reads
   * month against month.
   */
  onTimeDeliveryPct: readonly number[];
}

/* ---------------------------------------------------------------------------------------------
 * The seven suppliers — AAP 0.2.3 scale table, one process family and one site per supplier
 * ------------------------------------------------------------------------------------------- */

/**
 * The seven suppliers of the demonstration, in identifier order.
 *
 * Between them they own the 24 materials exactly once each, and each stands in the country its
 * coordinates place it in. Their sites are the origin ends of the lanes the canvas draws toward the
 * plants, and each one is fed by the tier-2 origins its materials name.
 */
export const SUPPLIERS: readonly Supplier[] = [
  {
    // Steel and stainless long products, from the Bergen service centre.
    id: 'SUP-HANSA-METALL',
    name: 'Nordfjell Stålverk AS',
    country: 'Norway',
    latitude: 60.3913,
    longitude: 5.3221,
    leadTimeDays: 14,
    materialIds: ['MAT-STEEL-PLATE', 'MAT-STAINLESS-BAR', 'MAT-FASTENER-SET'],
    onTimeDeliveryPct: [96, 95, 96, 94, 93, 94],
  },
  {
    // Aluminium sheet and copper busbar, cut and edge-finished at the Bajío site.
    id: 'SUP-BAJIO-METALES',
    name: 'Cobreval Metales S.A. de C.V.',
    country: 'Mexico',
    latitude: 21.125,
    longitude: -101.686,
    leadTimeDays: 22,
    materialIds: ['MAT-ALUMINIUM-SHEET', 'MAT-COPPER-BUSBAR'],
    onTimeDeliveryPct: [92, 90, 88, 86, 84, 82],
  },
  {
    // Iron and aluminium castings, moulded and machined at the Vysocina foundry.
    id: 'SUP-VLTAVA-GUSS',
    name: 'Vltava Slévárna s.r.o.',
    country: 'Czechia',
    latitude: 49.3961,
    longitude: 15.5903,
    leadTimeDays: 8,
    materialIds: ['MAT-CAST-IRON-HOUSING', 'MAT-ALUMINIUM-DIE-CAST-COVER'],
    onTimeDeliveryPct: [95, 96, 94, 95, 93, 94],
  },
  {
    // Assembled electronics, harnesses and sensors, at the Karlsruhe site.
    id: 'SUP-RHEINSTERN-ELEKTRONIK',
    name: 'Rheinstern Elektronik GmbH',
    country: 'Germany',
    latitude: 49.0069,
    longitude: 8.4037,
    leadTimeDays: 16,
    materialIds: [
      'MAT-CONTROL-PCBA',
      'MAT-WIRE-HARNESS',
      'MAT-CONNECTOR-SET',
      'MAT-PRESSURE-SENSOR',
      'MAT-BRUSHLESS-MOTOR',
    ],
    onTimeDeliveryPct: [97, 96, 97, 95, 96, 95],
  },
  {
    // Bearings, turned shafts and gear blanks, at the Styrian site.
    id: 'SUP-NORDWERK-ANTRIEB',
    name: 'Antriebswerk Steiermark GmbH',
    country: 'Austria',
    latitude: 47.0707,
    longitude: 15.4395,
    leadTimeDays: 11,
    materialIds: [
      'MAT-BALL-BEARING-6205',
      'MAT-TAPER-ROLLER-BEARING',
      'MAT-DRIVE-SHAFT',
      'MAT-GEAR-BLANK',
    ],
    onTimeDeliveryPct: [94, 93, 92, 93, 91, 92],
  },
  {
    // Moulded seals, gaskets and hose assemblies, at the Linz site.
    id: 'SUP-DONAU-DICHTUNG',
    name: 'Donauform Dichtungstechnik GmbH',
    country: 'Austria',
    latitude: 48.3069,
    longitude: 14.2858,
    leadTimeDays: 9,
    materialIds: ['MAT-SEAL-KIT', 'MAT-O-RING-NBR-45', 'MAT-PTFE-GASKET-60', 'MAT-HYDRAULIC-HOSE'],
    onTimeDeliveryPct: [93, 94, 92, 91, 93, 92],
  },
  {
    // Springs, fasteners and finishing consumables, shipped from the Jebel Ali site.
    id: 'SUP-MERIDIAN-INDUSTRIAL',
    name: 'Meridian Gulf Industrial FZE',
    country: 'United Arab Emirates',
    latitude: 25.011,
    longitude: 55.061,
    leadTimeDays: 27,
    materialIds: [
      'MAT-COMPRESSION-SPRING',
      'MAT-POWDER-COATING',
      'MAT-LITHIUM-GREASE',
      'MAT-SHIPPING-CARTON',
    ],
    onTimeDeliveryPct: [89, 88, 86, 85, 83, 84],
  },
];
