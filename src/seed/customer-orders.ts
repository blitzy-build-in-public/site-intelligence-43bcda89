/**
 * The customer orders the demonstration ships as records.
 *
 * Fixing inputs. `platform-contracts.md` §3 fixes what an exception's affected line reads from an
 * order (`AffectedLine`: order, product, plant, promise date, units at risk), and AAP 0.12.2 records
 * the invariants this module holds: a customer order names one customer, one product and one plant,
 * and it is the record an exception's affected lines point at. AAP 0.2.3 fixes the size of the order
 * book — 40 customer orders of which 15 are named.
 *
 * The count, stated once. The 15 records below are the named orders; `src/seed/filler.ts` derives
 * the remaining 25 deterministically, so the two together are the 40 the scale table fixes. This
 * module is also the only place those named orders exist, so a consumer that needs one reads it from
 * the service and never from here (rule P-2: only `src/services/mock/seed-loader.ts` imports
 * `src/seed`, and it deep-clones what it reads, so a demonstration reset can never write back into
 * this array).
 *
 * DERIVATION — `platform-seed-data.md` §3 is not part of this checkout, so the record content below
 * is derived from the anchors the Agent Action Plan states, from the identifier, money and calendar
 * conventions of contracts §1, and from the product, plant and customer keys of the shared
 * vocabulary. If that file is supplied later, its §3 table transcribes over this content and
 * supersedes it with no change to any consumer, because every consumer reads orders through the
 * service rather than from a literal:
 * - `CO-770233` and `CO-770251` are two orders of solver case `CASE-1184`, whose baseline solve AAP
 *   0.8 quotes (580 and 640 units late). Each order's quantity is the whole of that late quantity,
 *   so no measure the solver returns for an order can exceed the order it was measured from.
 * - `CO-770219` is the Brno service-kit order the transfer lever of that case defers. It carries 900
 *   kits, and its unit price is the price at which AAP 0.8's side-effect sentence — 900 Brno service
 *   kits, EUR 108,000 — is this order's own quantity times its own unit price. That price is record
 *   content, not a computed revenue (rule P-6).
 * - Each product ships from a plant whose lines build it: `PRD-R75` from `PLT-RGB`, `PRD-A200` from
 *   `PLT-QRO`, `PRD-V40` from `PLT-BRN`. Three of the four plants therefore appear in the book:
 *   `PLT-RAK` builds `PRD-V40` on `LN-RAK-1` and carries no customer order here, and no order pairs a
 *   product with a plant that does not build it.
 * - Dates sit around the constant clock `DEMO_CLOCK` (`2026-12-03T08:00:00+01:00`, Europe/Berlin) and
 *   across the projection window the investigation screen draws. `originalDueDate` never follows
 *   `dueDate`; where the two differ, the order was pushed out at the customer's agreement.
 * - `status` is the order's position at that clock: `shipped` left before it, `late` was due before it
 *   and has not left, `at-risk` is named by an open exception's affected lines, `open` is neither.
 * - `customerId` is a key, not a name: every value below is a `CUS-nnn` record of
 *   `src/seed/customers.ts`, which spells the names out, so this module can neither invent a company
 *   nor leak one into a screen.
 *
 * Values only. This module declares one interface and one array of records: no branch, no
 * arithmetic, no derived field. Every euro below is an agreed order price and every quantity an
 * ordered quantity. Revenue at risk, delayed revenue and each order's outcome under an option are
 * computed from these records by `src/domain/aggregation/` and `src/domain/solver/` (rule P-6), so
 * none of them is stored here.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports types from `src/types/primitives` and nothing else, and only the mock adapter's
 *   seed loader imports it, so it cannot become a second data boundary.
 * - P-7: every identifier and figure is synthetic, and a customer is a key rather than a company.
 * - P-6: ordered quantities, agreed prices and dates only — no revenue, no aggregate, no expected
 *   result and no fixture value.
 * - B-1 and B-2: no address of any kind is recorded, and no field here can hold a credential.
 */
import type {
  CustomerId,
  CustomerOrderId,
  IsoDate,
  Money,
  PlantId,
  ProductId,
} from '../types/primitives';

/**
 * The position a customer order holds at the demonstration clock.
 *
 * Not exported: a consumer that needs the vocabulary reads it from the record, as
 * `CustomerOrder['status']`, so this union has exactly one home.
 */
type CustomerOrderStatus = 'open' | 'at-risk' | 'late' | 'shipped';

/**
 * One customer order: the demand side of the order book.
 *
 * The nine members are the record AAP 0.12.2 fixes. Two of them are the same date twice on purpose:
 * `dueDate` is the promise the customer holds today and `originalDueDate` is the promise the order
 * was placed with, so the difference between them is the slip an order has already absorbed and it is
 * readable without a second record. Both are calendar dates in the application's time zone, never
 * instants, because a promise is kept or missed on a day.
 */
export interface CustomerOrder {
  /** The order's identifier, `CO-nnnnnn` (contracts §1). */
  readonly id: CustomerOrderId;

  /** The customer that placed the order, a key into `src/seed/customers.ts`. */
  readonly customerId: CustomerId;

  /** The product ordered, one of the three the demonstration ships. */
  readonly productId: ProductId;

  /** The plant that has to ship it, which is a plant that builds that product. */
  readonly plantId: PlantId;

  /** How many units the order is for. */
  readonly quantity: number;

  /**
   * The price agreed per unit, in euro with at most two decimals (contracts §1).
   *
   * It restates the product master's `priceEur` for this order's `productId`
   * (`src/seed/products.ts`), so an order is valued one way by every reader: the revenue-at-risk rule
   * multiplies units at risk by the product price (AAP 0.8), and this record states that same figure
   * instead of offering a second valuation of the same units.
   *
   * A record value, never a computed one: the order's revenue is `quantity` times this price, and
   * that product is taken by the aggregation that needs it rather than being stored here (rule P-6).
   */
  readonly unitPriceEur: Money;

  /** The date the customer is promised, `YYYY-MM-DD`. */
  readonly dueDate: IsoDate;

  /** The date the order was placed with, never later than `dueDate`. */
  readonly originalDueDate: IsoDate;

  /** Where the order stands at the demonstration clock. */
  readonly status: CustomerOrderStatus;
}

/**
 * The 15 named customer orders of the order book, in the order they fall due.
 *
 * Read-only at the type level as well as in fact: the mock adapter clones these records into its own
 * mutable state and edits the clone, so nothing in the application can reorder or rewrite this array.
 */
export const CUSTOMER_ORDERS: readonly CustomerOrder[] = [
  {
    id: 'CO-770206',
    customerId: 'CUS-001',
    productId: 'PRD-R75',
    plantId: 'PLT-RGB',
    quantity: 210,
    unitPriceEur: 1240,
    dueDate: '2026-11-24',
    originalDueDate: '2026-11-24',
    status: 'shipped',
  },
  {
    id: 'CO-770212',
    customerId: 'CUS-002',
    productId: 'PRD-A200',
    plantId: 'PLT-QRO',
    quantity: 360,
    unitPriceEur: 480,
    dueDate: '2026-11-27',
    originalDueDate: '2026-11-27',
    status: 'late',
  },
  {
    // The Brno service-kit order the transfer lever of CASE-1184 defers by ten days.
    id: 'CO-770219',
    customerId: 'CUS-003',
    productId: 'PRD-V40',
    plantId: 'PLT-BRN',
    quantity: 900,
    unitPriceEur: 120,
    dueDate: '2026-12-04',
    originalDueDate: '2026-12-04',
    status: 'at-risk',
  },
  {
    id: 'CO-770227',
    customerId: 'CUS-004',
    productId: 'PRD-A200',
    plantId: 'PLT-QRO',
    quantity: 275,
    unitPriceEur: 480,
    dueDate: '2026-12-07',
    originalDueDate: '2026-12-04',
    status: 'at-risk',
  },
  {
    // One of the two orders whose baseline lateness AAP 0.8 quotes: 580 units late.
    id: 'CO-770233',
    customerId: 'CUS-005',
    productId: 'PRD-R75',
    plantId: 'PLT-RGB',
    quantity: 580,
    unitPriceEur: 1240,
    dueDate: '2026-12-09',
    originalDueDate: '2026-12-09',
    status: 'at-risk',
  },
  {
    id: 'CO-770238',
    customerId: 'CUS-006',
    productId: 'PRD-V40',
    plantId: 'PLT-BRN',
    quantity: 720,
    unitPriceEur: 120,
    dueDate: '2026-12-10',
    originalDueDate: '2026-12-10',
    status: 'at-risk',
  },
  {
    id: 'CO-770244',
    customerId: 'CUS-001',
    productId: 'PRD-A200',
    plantId: 'PLT-QRO',
    quantity: 300,
    unitPriceEur: 480,
    dueDate: '2026-12-11',
    originalDueDate: '2026-12-11',
    status: 'at-risk',
  },
  {
    // The second order AAP 0.8 quotes: 640 units late under the do-nothing baseline.
    id: 'CO-770251',
    customerId: 'CUS-003',
    productId: 'PRD-R75',
    plantId: 'PLT-RGB',
    quantity: 640,
    unitPriceEur: 1240,
    dueDate: '2026-12-16',
    originalDueDate: '2026-12-16',
    status: 'at-risk',
  },
  {
    id: 'CO-770257',
    customerId: 'CUS-002',
    productId: 'PRD-V40',
    plantId: 'PLT-BRN',
    quantity: 480,
    unitPriceEur: 120,
    dueDate: '2026-12-18',
    originalDueDate: '2026-12-18',
    status: 'at-risk',
  },
  {
    id: 'CO-770263',
    customerId: 'CUS-004',
    productId: 'PRD-A200',
    plantId: 'PLT-QRO',
    quantity: 160,
    unitPriceEur: 480,
    dueDate: '2026-12-21',
    originalDueDate: '2026-12-21',
    status: 'open',
  },
  {
    id: 'CO-770269',
    customerId: 'CUS-005',
    productId: 'PRD-A200',
    plantId: 'PLT-QRO',
    quantity: 420,
    unitPriceEur: 480,
    dueDate: '2026-12-23',
    originalDueDate: '2026-12-23',
    status: 'open',
  },
  {
    // Pushed out one week at the customer's request: the promise moved, the order did not.
    id: 'CO-770275',
    customerId: 'CUS-003',
    productId: 'PRD-V40',
    plantId: 'PLT-BRN',
    quantity: 750,
    unitPriceEur: 120,
    dueDate: '2027-01-05',
    originalDueDate: '2026-12-29',
    status: 'open',
  },
  {
    id: 'CO-770281',
    customerId: 'CUS-006',
    productId: 'PRD-R75',
    plantId: 'PLT-RGB',
    quantity: 240,
    unitPriceEur: 1240,
    dueDate: '2027-01-08',
    originalDueDate: '2027-01-08',
    status: 'open',
  },
  {
    id: 'CO-770288',
    customerId: 'CUS-001',
    productId: 'PRD-A200',
    plantId: 'PLT-QRO',
    quantity: 180,
    unitPriceEur: 480,
    dueDate: '2027-01-12',
    originalDueDate: '2027-01-12',
    status: 'open',
  },
  {
    id: 'CO-770294',
    customerId: 'CUS-004',
    productId: 'PRD-V40',
    plantId: 'PLT-BRN',
    quantity: 520,
    unitPriceEur: 120,
    dueDate: '2027-01-15',
    originalDueDate: '2027-01-15',
    status: 'open',
  },
];
