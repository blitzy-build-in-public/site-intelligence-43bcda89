/**
 * The material records: the twenty-four materials the three products are built from, each with the
 * products that consume it, the supplier it is bought from, the tier-2 origin behind that supplier,
 * its quantity per finished unit, its seeded unit cost and its lead time.
 *
 * Fixing inputs:
 * - AAP 0.12.2's entity row "`Supplier`, `Origin`, `Material` (seed §2)" and its invariant — each
 *   material has one primary supplier and may have an alternate, and a product reaches its materials
 *   through them.
 * - AAP 0.2.1's implicit requirement "supplier-to-product reach in the seed … because the graph lens
 *   and the canvas node badges in S2 need both before the pin screens exist in S4". `productIds` is
 *   that reach: the value the topology handler copies onto a supplier's `TopologyNode.productIds`
 *   (AAP 0.12.2), which is why every record below populates it rather than leaving it empty.
 * - This file's own contract (AAP 0.13.1, 0.15.1): the `Material` interface and `MATERIALS`, exactly
 *   twenty-four records, importing nothing but `src/types`.
 *
 * DERIVATION — seed §2 is not on disk. `platform-seed-data.md` is not part of this repository, so the
 * twenty-four records below are derived rather than transcribed: their names are generic material
 * designations and their quantities, unit costs and lead times are plausible record content for the
 * three products. Neither identifier vocabulary is this module's: every `SUP-…` key belongs to a
 * record of `src/seed/suppliers.ts` and every `ORG-…` key to a record of `src/seed/origins.ts`, and
 * this module only ever references the two. Each `originId` names the origin whose site produces the
 * material's substance, so a supplier draws on every origin that carries one of its materials:
 *
 *   ORG-ALU    aluminium sheet, aluminium die-cast cover
 *   ORG-CU     copper busbar, wire harness, connector set
 *   ORG-SEMI   control PCBA, pressure sensor
 *   ORG-RE     brushless motor — its permanent magnets
 *   ORG-FE     steel plate, stainless bar, cast iron housing, drive shaft, gear blank, ball bearing,
 *              taper roller bearing, fastener set, compression spring
 *   ORG-POL    seal kit, O-ring, PTFE gasket, hydraulic hose, powder coating, lithium grease,
 *              shipping carton — its rubber, polymer and coating output
 *   ORG-CO     no record below points here: cobalt reaches the network through the motor's magnets,
 *              and `src/seed/origins.ts` records that lane
 *
 * If the seed file is supplied later, its values transcribe over these without a consumer changing:
 * every reader takes a material from `MATERIALS` and none restates a record.
 *
 * Rules served:
 * - P-2: the only import is `../types`, and this folder is imported only by
 *   `src/services/mock/seed-loader.ts`, so no screen reaches a material except through the typed
 *   service interface.
 * - P-6: `quantityPerUnit`, `unitCostEur` and `leadTimeDays` are record content — what a supplier
 *   sheet states — and not a computed figure, an aggregate or an expected test result. Nothing here
 *   calculates, and no solver output appears in this module.
 * - P-7: every material name is a generic designation (a material standard, a dimension, a shape) and
 *   every supplier a synthetic company. No real vendor, customer, carmaker or cloud product is named.
 * - P-5: no market-intelligence value sits in a first-party record; competitor figures belong to
 *   `src/seed/market-intelligence.ts`.
 * - B-1: no address, URL or external asset appears. B-2: no credential and no environment read.
 */

import type { MaterialId, Money, OriginId, ProductId, SupplierId } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Record — AAP 0.12.2, seed §2
 * ------------------------------------------------------------------------------------------- */

/**
 * One material: what a product is built from, which supplier it is bought from and which tier-2
 * origin stands behind that supplier.
 *
 * A material is not itself a topology node. Its `productIds` are the reach that makes a *supplier* a
 * node reaching those products, and its `originId` is the lane from the origin to the supplier, so
 * the canvas needs both before it can draw either.
 */
export interface Material {
  /** The material's identifier, `MAT-` followed by its own key. */
  id: MaterialId;

  /** The name the investigation's impact chain, the package screens and the tables print. */
  name: string;

  /** The products this material goes into; a supplier reaches the union over its materials. */
  productIds: readonly ProductId[];

  /** The supplier the material is bought from. */
  primarySupplierId: SupplierId;

  /**
   * A second qualified supplier that can cover the material, omitted where the material is
   * single-sourced. Never equal to `primarySupplierId`: an alternate that were the primary would
   * state a redundancy the record does not have.
   */
  alternateSupplierId?: SupplierId;

  /** The tier-2 origin behind the primary supplier; that origin's record names the supplier back. */
  originId: OriginId;

  /**
   * How much of the material one finished unit consumes, in the purchasing unit its name states —
   * square metres for sheet and plate, metres for bar and busbar, kilograms for coating and grease,
   * a count of pieces or sets otherwise.
   */
  quantityPerUnit: number;

  /** The supplier's price per purchasing unit in EUR, at most two decimals. */
  unitCostEur: Money;

  /** The supplier's quoted lead time in days from call-off to goods-in. */
  leadTimeDays: number;
}

/* ---------------------------------------------------------------------------------------------
 * Records — one row per material, grouped by material family in bill-of-materials order
 * ------------------------------------------------------------------------------------------- */

/**
 * The twenty-four materials, grouped by family in bill-of-materials order.
 *
 * Every identifier a `productIds` entry names is one of the three products the plant records build;
 * every `primarySupplierId` is one of the seven suppliers of `src/seed/suppliers.ts`, and every
 * `alternateSupplierId` a different one of them. Every `originId` is one of the seven origins of
 * `src/seed/origins.ts`, and that origin names back the `primarySupplierId` of each material that
 * points at it, so the two halves of the network are stated once and agree.
 */
export const MATERIALS: readonly Material[] = [
  // Metals — sheet, plate, bar and busbar.
  {
    id: 'MAT-ALUMINIUM-SHEET',
    name: 'Aluminium sheet, 2.0 mm, alloy 5754',
    productIds: ['PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-BAJIO-METALES',
    alternateSupplierId: 'SUP-HANSA-METALL',
    originId: 'ORG-ALU',
    quantityPerUnit: 1.6,
    unitCostEur: 18.4,
    leadTimeDays: 28,
  },
  {
    id: 'MAT-STEEL-PLATE',
    name: 'Steel plate, S355, 6 mm',
    productIds: ['PRD-R75', 'PRD-A200'],
    primarySupplierId: 'SUP-HANSA-METALL',
    alternateSupplierId: 'SUP-BAJIO-METALES',
    originId: 'ORG-FE',
    quantityPerUnit: 2.2,
    unitCostEur: 41.75,
    leadTimeDays: 35,
  },
  {
    id: 'MAT-STAINLESS-BAR',
    name: 'Stainless steel bar, 316L, 20 mm',
    productIds: ['PRD-R75', 'PRD-V40'],
    primarySupplierId: 'SUP-HANSA-METALL',
    originId: 'ORG-FE',
    quantityPerUnit: 1.8,
    unitCostEur: 26.9,
    leadTimeDays: 42,
  },
  {
    id: 'MAT-COPPER-BUSBAR',
    name: 'Copper busbar, 4 x 20 mm',
    productIds: ['PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-BAJIO-METALES',
    alternateSupplierId: 'SUP-HANSA-METALL',
    originId: 'ORG-CU',
    quantityPerUnit: 2.4,
    unitCostEur: 22.15,
    leadTimeDays: 30,
  },

  // Castings — the machined housing and the die-cast cover.
  {
    id: 'MAT-CAST-IRON-HOUSING',
    name: 'Cast iron housing, GG25, machined',
    productIds: ['PRD-R75'],
    primarySupplierId: 'SUP-VLTAVA-GUSS',
    originId: 'ORG-FE',
    quantityPerUnit: 1,
    unitCostEur: 118.5,
    leadTimeDays: 45,
  },
  {
    id: 'MAT-ALUMINIUM-DIE-CAST-COVER',
    name: 'Aluminium die-cast cover, alloy A380',
    productIds: ['PRD-A200'],
    primarySupplierId: 'SUP-VLTAVA-GUSS',
    originId: 'ORG-ALU',
    quantityPerUnit: 1,
    unitCostEur: 34.8,
    leadTimeDays: 38,
  },

  // Electronics — the control board, its loom, its terminations, its sensor and its drive.
  {
    id: 'MAT-CONTROL-PCBA',
    name: 'Control PCBA, four-layer, populated',
    productIds: ['PRD-R75', 'PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    originId: 'ORG-SEMI',
    quantityPerUnit: 1,
    unitCostEur: 268.4,
    leadTimeDays: 84,
  },
  {
    id: 'MAT-WIRE-HARNESS',
    name: 'Wire harness, 12-core, 1.8 m',
    productIds: ['PRD-A200'],
    primarySupplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    originId: 'ORG-CU',
    quantityPerUnit: 1,
    unitCostEur: 41.9,
    leadTimeDays: 35,
  },
  {
    id: 'MAT-CONNECTOR-SET',
    name: 'Connector set, M12, 8-pin',
    productIds: ['PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    alternateSupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-CU',
    quantityPerUnit: 2,
    unitCostEur: 12.75,
    leadTimeDays: 28,
  },
  {
    id: 'MAT-PRESSURE-SENSOR',
    name: 'Pressure sensor, 0-16 bar',
    productIds: ['PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    originId: 'ORG-SEMI',
    quantityPerUnit: 1,
    unitCostEur: 63.5,
    leadTimeDays: 56,
  },
  {
    id: 'MAT-BRUSHLESS-MOTOR',
    name: 'Brushless motor, 24 V, 400 W',
    productIds: ['PRD-A200'],
    primarySupplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    alternateSupplierId: 'SUP-NORDWERK-ANTRIEB',
    originId: 'ORG-RE',
    quantityPerUnit: 1,
    unitCostEur: 186,
    leadTimeDays: 63,
  },

  // Drivetrain — bearings, the turned shaft and the gear blank.
  {
    id: 'MAT-BALL-BEARING-6205',
    name: 'Ball bearing, 6205-2RS',
    productIds: ['PRD-R75', 'PRD-V40'],
    primarySupplierId: 'SUP-NORDWERK-ANTRIEB',
    alternateSupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-FE',
    quantityPerUnit: 4,
    unitCostEur: 6.35,
    leadTimeDays: 21,
  },
  {
    id: 'MAT-TAPER-ROLLER-BEARING',
    name: 'Taper roller bearing, 30206',
    productIds: ['PRD-R75'],
    primarySupplierId: 'SUP-NORDWERK-ANTRIEB',
    originId: 'ORG-FE',
    quantityPerUnit: 2,
    unitCostEur: 14.9,
    leadTimeDays: 28,
  },
  {
    id: 'MAT-DRIVE-SHAFT',
    name: 'Drive shaft, 42CrMo4, turned',
    productIds: ['PRD-R75', 'PRD-A200'],
    primarySupplierId: 'SUP-NORDWERK-ANTRIEB',
    originId: 'ORG-FE',
    quantityPerUnit: 1,
    unitCostEur: 74.2,
    leadTimeDays: 32,
  },
  {
    id: 'MAT-GEAR-BLANK',
    name: 'Gear blank, 18-tooth, 42CrMo4',
    productIds: ['PRD-A200'],
    primarySupplierId: 'SUP-NORDWERK-ANTRIEB',
    originId: 'ORG-FE',
    quantityPerUnit: 2,
    unitCostEur: 38.6,
    leadTimeDays: 31,
  },

  // Sealing and fluid — seal kit, O-rings, gasket and the hose assembly.
  {
    id: 'MAT-SEAL-KIT',
    name: 'Seal kit, EPDM',
    productIds: ['PRD-R75', 'PRD-V40'],
    primarySupplierId: 'SUP-DONAU-DICHTUNG',
    alternateSupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-POL',
    quantityPerUnit: 1,
    unitCostEur: 17.45,
    leadTimeDays: 24,
  },
  {
    id: 'MAT-O-RING-NBR-45',
    name: 'O-ring, NBR 70, 45 mm bore',
    productIds: ['PRD-V40'],
    primarySupplierId: 'SUP-DONAU-DICHTUNG',
    alternateSupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-POL',
    quantityPerUnit: 6,
    unitCostEur: 0.82,
    leadTimeDays: 18,
  },
  {
    id: 'MAT-PTFE-GASKET-60',
    name: 'PTFE gasket, 60 mm',
    productIds: ['PRD-V40'],
    primarySupplierId: 'SUP-DONAU-DICHTUNG',
    originId: 'ORG-POL',
    quantityPerUnit: 2,
    unitCostEur: 3.65,
    leadTimeDays: 22,
  },
  {
    id: 'MAT-HYDRAULIC-HOSE',
    name: 'Hydraulic hose assembly, 12 mm',
    productIds: ['PRD-R75'],
    primarySupplierId: 'SUP-DONAU-DICHTUNG',
    originId: 'ORG-POL',
    quantityPerUnit: 2,
    unitCostEur: 47.3,
    leadTimeDays: 33,
  },

  // Fasteners, finish and consumables.
  {
    id: 'MAT-FASTENER-SET',
    name: 'Fastener set, A2 stainless',
    productIds: ['PRD-R75', 'PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-HANSA-METALL',
    alternateSupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-FE',
    quantityPerUnit: 1,
    unitCostEur: 9.85,
    leadTimeDays: 20,
  },
  {
    id: 'MAT-COMPRESSION-SPRING',
    name: 'Compression spring, 1.4310 stainless',
    productIds: ['PRD-R75', 'PRD-A200'],
    primarySupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    alternateSupplierId: 'SUP-NORDWERK-ANTRIEB',
    originId: 'ORG-FE',
    quantityPerUnit: 8,
    unitCostEur: 1.24,
    leadTimeDays: 26,
  },
  {
    id: 'MAT-POWDER-COATING',
    name: 'Powder coating, anthracite, matte',
    productIds: ['PRD-R75', 'PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-POL',
    quantityPerUnit: 0.8,
    unitCostEur: 12.6,
    leadTimeDays: 25,
  },
  {
    id: 'MAT-LITHIUM-GREASE',
    name: 'Lithium grease, NLGI 2',
    productIds: ['PRD-R75', 'PRD-V40'],
    primarySupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-POL',
    quantityPerUnit: 0.35,
    unitCostEur: 8.45,
    leadTimeDays: 19,
  },
  {
    id: 'MAT-SHIPPING-CARTON',
    name: 'Shipping carton with foam inserts',
    productIds: ['PRD-R75', 'PRD-A200', 'PRD-V40'],
    primarySupplierId: 'SUP-MERIDIAN-INDUSTRIAL',
    originId: 'ORG-POL',
    quantityPerUnit: 1,
    unitCostEur: 7.2,
    leadTimeDays: 14,
  },
];
