/**
 * The purchase orders of the demonstration: the five named procurement commitments the record set
 * states a fact about, out of the sixty the plan's scale table fixes, the rest of which
 * `src/seed/filler.ts` generates and `src/seed/index.ts` composes into the book the mock adapter
 * loads (AAP 0.2.3, AAP 0.12.2, AAP 0.15.1).
 *
 * Fixing inputs: `platform-contracts.md` §3 fixes the entity vocabulary and AAP 0.12.2 fixes the
 * three references a purchase order carries — "a purchase order names one supplier, one material
 * and one plant" — while AAP 0.12.1 fixes that a scenario is measured against the delayed purchase
 * order rather than against a stored total. The `PO-nnnnnnnn` identifier shape is the contracts §1
 * pattern. Each `materialId` below is a material of `./materials.ts` and its `supplierId` is that
 * material's primary supplier, the pairing `./suppliers.ts` mirrors; each `plantId` is one of the
 * four `./plants.ts` rows. Seed modules stay flat (AAP 0.18.1) and are joined by the mock adapter's
 * handlers, never by importing one another.
 *
 * The material master owns the price and the lead time, and each named record below restates them
 * rather than deciding them: `unitCostEur` repeats the figure `./materials.ts` states for the same
 * `materialId`, and `orderedDate` plus that material's `leadTimeDays` is exactly the record's
 * `originalDueDate`, so the first promise sits the quoted lead time after call-off and no order
 * falls due before its material's lead allows.
 *
 * The five named records, in identifier order:
 * - `PO-45011884` is the delayed order of the investigation, and the only delayed one: the seal kits
 *   the Brno service-kit line builds with, two weeks past the promised date. It is the record
 *   `./solver-cases.ts` names as the `delayedPurchaseOrderId` of `CASE-1184`, and the exception that
 *   case measures is `EXC-2026-1184` at `PLT-BRN`.
 * - `PO-45011907` is an open cast-housing order for the same Brno line, due inside the projection
 *   window.
 * - `PO-45011924` is an open stainless-bar order for the Rakovník valve line.
 * - `PO-45011946` is a control-board order the Querétaro module line has already received.
 * - `PO-45011963` is an open aluminium-sheet order for the Riga rotor line, from the supplier whose
 *   on-time record has slipped furthest over the last six months.
 *
 * The set therefore carries three of the four statuses and all four plants; the remaining orders,
 * the cancellation status and the filler's own spread across suppliers and materials come from the
 * deterministic generator, which is the only place they may be produced.
 *
 * DERIVATION — seed §3, the section the customer and purchase order records belong to, is not
 * part of this repository, so the five named orders below are authored rather than transcribed.
 * What the inputs fix is the scale the record set serves — AAP 0.2.3's 60 purchase orders of which
 * 5 are named — and the three references each order carries, which AAP 0.12.2 states: one
 * supplier, one material and one plant. AAP 0.12.1 also fixes that an option is measured against
 * the case's delayed purchase order rather than against a stored total. Each quantity, cost,
 * promise date and current date below is derived inside the money and calendar conventions of
 * contracts §1. If §3 is supplied later, its table transcribes over these records and supersedes
 * them with no change to any consumer, because every consumer reads a purchase order through the
 * service.
 *
 * Rules served:
 * - P-6: `unitCostEur` is record content, never a computed figure. No line value, added cost, idle
 *   day or delayed revenue appears here — those are the solver's measures and its fixtures'
 *   expectations.
 * - P-2: the only import is the shared type barrel, so this module reaches no service, no adapter
 *   and no component, and only `src/services/mock/seed-loader.ts` may import it.
 * - P-7: every identifier, quantity, cost and date is synthetic; no real vendor, customer, product
 *   or cloud service is named and no field stands in for a value this dataset does not hold.
 * - B-1, B-2: the file holds no address, no credential and no environment read.
 *
 * The import is type-only, so the module emits the record array and nothing else.
 */

import type { IsoDate, MaterialId, Money, PlantId, PurchaseOrderId, SupplierId } from '../types';

/**
 * One purchase order: what a supplier is delivering, where, how much of it, at what unit cost, and
 * when it was placed and is due.
 *
 * The record carries no line total and no delivery progress beyond its status, because `quantity`
 * multiplied by `unitCostEur` is a computed figure and belongs to whoever computes it (rule P-6).
 */
export interface PurchaseOrder {
  /** The order's identifier, `PO-nnnnnnnn` (contracts §1). */
  id: PurchaseOrderId;

  /** The supplier delivering the material: the primary supplier the material record names. */
  supplierId: SupplierId;

  /** The material on order, as `./materials.ts` declares it. */
  materialId: MaterialId;

  /** The plant the material is delivered to, one of the four `./plants.ts` rows. */
  plantId: PlantId;

  /** How many purchasing units of the material are on order. */
  quantity: number;

  /**
   * The price per purchasing unit in euro, at most two decimals: the figure `./materials.ts` states
   * for the material, restated from that master and never a line total or a computed figure.
   */
  unitCostEur: Money;

  /** The date the order was placed. */
  orderedDate: IsoDate;

  /** The date delivery was first promised. */
  originalDueDate: IsoDate;

  /** The date delivery is promised now, later than the original date only when the order is late. */
  currentDueDate: IsoDate;

  /** Where the order stands: open, delayed past its original date, received or cancelled. */
  status: 'open' | 'delayed' | 'received' | 'cancelled';
}

/**
 * The five named purchase orders, in identifier order.
 *
 * The array is `readonly` because the seed is the demonstration's record set: the mock adapter's
 * loader deep-clones it into mutable state and a reset restores from the modules, so nothing in the
 * application writes to these records (AAP 0.2.1).
 */
export const PURCHASE_ORDERS: readonly PurchaseOrder[] = [
  // The disruption EXC-2026-1184 reports and CASE-1184 measures: the seal kits the Brno kit line
  // builds with came two weeks after the promise, so the original date stands as the promise and
  // the current date as the slip. Light, compact and urgent is also why recovering sets by air is
  // one of the case's two levers.
  {
    id: 'PO-45011884',
    supplierId: 'SUP-DONAU-DICHTUNG',
    materialId: 'MAT-SEAL-KIT',
    plantId: 'PLT-BRN',
    quantity: 2400,
    unitCostEur: 17.45,
    orderedDate: '2026-11-10',
    originalDueDate: '2026-12-04',
    currentDueDate: '2026-12-16',
    status: 'delayed',
  },
  // The housing stock the Brno kit line builds with, due inside the projection window.
  {
    id: 'PO-45011907',
    supplierId: 'SUP-VLTAVA-GUSS',
    materialId: 'MAT-CAST-IRON-HOUSING',
    plantId: 'PLT-BRN',
    quantity: 900,
    unitCostEur: 118.5,
    orderedDate: '2026-10-23',
    originalDueDate: '2026-12-07',
    currentDueDate: '2026-12-07',
    status: 'open',
  },
  {
    id: 'PO-45011924',
    supplierId: 'SUP-HANSA-METALL',
    materialId: 'MAT-STAINLESS-BAR',
    plantId: 'PLT-RAK',
    quantity: 1250,
    unitCostEur: 26.9,
    orderedDate: '2026-10-29',
    originalDueDate: '2026-12-10',
    currentDueDate: '2026-12-10',
    status: 'open',
  },
  {
    id: 'PO-45011946',
    supplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    materialId: 'MAT-CONTROL-PCBA',
    plantId: 'PLT-QRO',
    quantity: 260,
    unitCostEur: 268.4,
    orderedDate: '2026-09-04',
    originalDueDate: '2026-11-27',
    currentDueDate: '2026-11-27',
    status: 'received',
  },
  {
    id: 'PO-45011963',
    supplierId: 'SUP-BAJIO-METALES',
    materialId: 'MAT-ALUMINIUM-SHEET',
    plantId: 'PLT-RGB',
    quantity: 4200,
    unitCostEur: 18.4,
    orderedDate: '2026-11-11',
    originalDueDate: '2026-12-09',
    currentDueDate: '2026-12-09',
    status: 'open',
  },
];
