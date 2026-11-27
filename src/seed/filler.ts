/**
 * The deterministic generator behind the demonstration's unnamed records.
 *
 * Fixing inputs. AAP 0.2.3 fixes the scale the record set serves — 40 customer orders of which 15
 * are named, 60 purchase orders of which 5 are named, and 200 seeded audit events — and the file
 * plan of AAP 0.12.1 with AAP 0.15.1 puts the remainder here: one module, one fixed seed, no record
 * left to a clock or a random source. `src/seed/customer-orders.ts` and
 * `src/seed/purchase-orders.ts` carry the named records and state that the rest of each set is
 * derived here; the audit-event seed module carries the named events and hands this module their
 * identifiers, so a generated event cannot take a named one.
 *
 * Three builders, and nothing else:
 * - `buildFillerCustomerOrders` returns the 25 unnamed orders, so the book totals 40.
 * - `buildFillerPurchaseOrders` returns the 55 unnamed orders, so procurement totals 60.
 * - `buildFillerAuditEvents` returns the events that bring the seeded chain to the caller's target,
 *   so the chain totals 200.
 *
 * Production orders are deliberately absent. `src/seed/production-orders.ts` declares all 90
 * literally, because the inputs name no production order individually and 90 records read more
 * plainly there than a generator's rules; deriving them here as well would leave two sources of
 * truth for one record set. The split is stated once, in this paragraph, so a later reader extends
 * that module rather than adding a fourth builder to this one.
 *
 * Determinism is the property every builder is written to hold (AAP 0.2.1, AAP 0.18.2). No builder
 * reads the host clock, a random source, the file system, a locale or a module-level mutable value:
 * every field is derived from `FILLER_SEED` and the record's own position by integer arithmetic,
 * and every instant is the constant demonstration clock `DEMO_CLOCK` of contracts §1 minus a whole
 * number of minutes. The same arguments therefore produce byte-identical output on every run and on
 * every engine, which is what makes the seeded chain reproducible and its hashes comparable.
 *
 * Record content only (rule P-6). The builders state ordered quantities, agreed prices, promised
 * dates and recorded activity — never a revenue, an idle day, a readiness, a median or any other
 * measure the solver or an aggregation owns, and never an expected result.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports the shared types plus the two declared record shapes it emits, and nothing
 *   else, so it cannot become a second data boundary; only `src/services/mock/seed-loader.ts` may
 *   import the seed folder.
 * - P-7: every identifier, quantity, cost, date and activity is synthetic, no company or person
 *   outside the seeded personas and their keys is named, and no placeholder prose stands in for
 *   record content.
 * - P-6: the numbers below are record values — an ordered quantity, an agreed unit price, a quoted
 *   lead time — and each of them is read by whoever computes a figure from it.
 * - B-1 and B-2: the module contacts nothing, holds no reachable address and reads no configuration.
 * - P-4: the generated activity records what happened and claims no control the workspace does not
 *   exercise; the chain it extends is labelled "Simulated control" wherever it surfaces.
 */

import type {
  AuditActorType,
  AuditEventDraft,
  AuditEventId,
  AuditPayload,
  AuditResult,
  CustomerId,
  CustomerOrderId,
  IsoDate,
  MaterialId,
  Money,
  PlantId,
  PolicyId,
  ProductId,
  PurchaseOrderId,
  SourceId,
  SupplierId,
  Timestamp,
  UserId,
} from '../types';
import { DEMO_CLOCK, SOURCE_IDS } from '../types';
import type { CustomerOrder } from './customer-orders';
import type { PurchaseOrder } from './purchase-orders';

/* ---------------------------------------------------------------------------------------------
 * A. The fixed seed and the counts the scale table fixes — AAP 0.2.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The generator's seed: the demonstration date, written as a whole number.
 *
 * Every derived field mixes this seed with the record's position and a per-field salt, so two runs
 * of one builder return identical records while two fields of one record never repeat each other.
 * It is a fixed literal rather than a clock reading, because a seed read from the clock would make
 * every run a different dataset and no fixture could hold.
 */
export const FILLER_SEED = 20261203;

/** How many customer orders the order book holds (AAP 0.2.3). */
const CUSTOMER_ORDER_TOTAL = 40;

/** How many of them `src/seed/customer-orders.ts` carries as named records (AAP 0.2.3). */
const NAMED_CUSTOMER_ORDER_COUNT = 15;

/** The count `buildFillerCustomerOrders` returns: the difference, 25. */
const FILLER_CUSTOMER_ORDER_COUNT = CUSTOMER_ORDER_TOTAL - NAMED_CUSTOMER_ORDER_COUNT;

/** How many purchase orders procurement holds (AAP 0.2.3). */
const PURCHASE_ORDER_TOTAL = 60;

/** How many of them `src/seed/purchase-orders.ts` carries as named records (AAP 0.2.3). */
const NAMED_PURCHASE_ORDER_COUNT = 5;

/** The count `buildFillerPurchaseOrders` returns: the difference, 55. */
const FILLER_PURCHASE_ORDER_COUNT = PURCHASE_ORDER_TOTAL - NAMED_PURCHASE_ORDER_COUNT;

/**
 * The first identifier `buildFillerCustomerOrders` issues: `CO-770300`.
 *
 * The named series runs `CO-770206` to `CO-770294` in due-date order, so the generated block
 * continues that series above it and keeps the six digits the `CO-nnnnnn` shape of contracts §1
 * fixes. Sitting above the named series is a convention, not a promise: the collision guard in §E
 * is what turns it into a checked fact on every call.
 */
const CUSTOMER_ORDER_ID_BASE = 770300;

/**
 * The first identifier `buildFillerPurchaseOrders` issues: `PO-45020100`, above the named series
 * `PO-45011884` to `PO-45011963` and eight digits wide, which is the `PO-nnnnnnnn` shape.
 */
const PURCHASE_ORDER_ID_BASE = 45020100;

/**
 * How many customer identifiers `src/seed/customers.ts` holds: `CUS-001` to `CUS-014`.
 *
 * The generated orders spread over that series by its own `CUS-nnn` shape rather than restating
 * fourteen literals here, so the only fact this module needs about the customer master is its size.
 */
const CUSTOMER_ID_SERIES_SIZE = 14;

/** The earliest due date a generated order carries, in days from the demonstration date. */
const CUSTOMER_ORDER_FIRST_DUE_OFFSET_DAYS = -21;

/** How far the generated book's due dates spread from that first date, in days. */
const CUSTOMER_ORDER_DUE_SPAN_DAYS = 76;

/**
 * The most days a generated due-date step may be nudged, so consecutive orders still fall due in
 * the order they are numbered: each step is at least three days before the nudge.
 */
const CUSTOMER_ORDER_DUE_JITTER_DAYS = 2;

/** The earliest placement date a generated purchase order carries, in days from the demo date. */
const PURCHASE_ORDER_FIRST_PLACEMENT_OFFSET_DAYS = -70;

/** How far the generated placement dates spread from that first date, in days. */
const PURCHASE_ORDER_PLACEMENT_SPAN_DAYS = 67;

/**
 * The delivery slips a generated purchase order may record, in days after its original promise.
 *
 * The zeros keep most orders on their first promise, as the named five are; the larger values are
 * the slips that make an order `delayed`, which is the state the investigation screen reads.
 */
const PURCHASE_ORDER_SLIP_DAYS: readonly number[] = [0, 0, 0, 0, 3, 6, 10, 14];

/**
 * The slips a generated customer order absorbed before it was due, in days.
 *
 * `originalDueDate` is what the order was placed with and `dueDate` what the customer holds now, so
 * a non-zero slip is a promise that already moved at the customer's agreement — the same reading
 * the named records carry.
 */
const CUSTOMER_ORDER_SLIP_DAYS: readonly number[] = [0, 0, 0, 2, 3, 5, 7];

/** The first event of the seeded chain falls a few minutes before the demonstration clock. */
const AUDIT_LAST_EVENT_MINUTES_BEFORE_CLOCK = 6;

/** The shortest gap between two consecutive seeded audit events, in minutes. */
const AUDIT_MINIMUM_GAP_MINUTES = 45;

/** The longest gap between two consecutive seeded audit events, in minutes. */
const AUDIT_MAXIMUM_GAP_MINUTES = 330;

/* ---------------------------------------------------------------------------------------------
 * B. The records a generated record may refer to
 * ------------------------------------------------------------------------------------------- */

/* Plant groups. Each material's `plantIds` below is the set of plants that build a product the
 * material goes into, and each product's is the set of plants that build it; both are read from
 * `src/seed/materials.ts` and `src/seed/products.ts`, whose identifiers `src/types/primitives.ts`
 * fixes. A generated order therefore never pairs a product with a plant that does not build it. */

/** The two plants that build `PRD-R75`. */
const RIGA_AND_BRNO: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN'];

/** The two plants that build `PRD-A200`. */
const RIGA_AND_QUERETARO: readonly PlantId[] = ['PLT-RGB', 'PLT-QRO'];

/** The two plants that build `PRD-V40`. */
const BRNO_AND_RAKOVNIK: readonly PlantId[] = ['PLT-BRN', 'PLT-RAK'];

/** The plants that build a product reaching all of `PLT-RGB`, `PLT-BRN` and `PLT-QRO`. */
const RIGA_BRNO_AND_QUERETARO: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN', 'PLT-QRO'];

/** The plants that build a product reaching all of `PLT-RGB`, `PLT-BRN` and `PLT-RAK`. */
const RIGA_BRNO_AND_RAKOVNIK: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN', 'PLT-RAK'];

/** The four plants of `src/seed/plants.ts`, in the order the plant filter lists them. */
const ALL_PLANTS: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'];

/**
 * What a generated customer order needs to know about a product: what it is worth, where it is
 * built, and the range the generated order quantities sit in.
 *
 * The three values that mirror `src/seed/products.ts` are `unitPriceEur`, which every order of that
 * product restates so one product is valued one way by every reader, and `plantIds`, the lines'
 * plants. The quantity range is this module's own: a book of 40 orders needs a spread of order
 * sizes, and no input fixes one.
 */
interface ProductSupply {
  /** The product this row describes. */
  readonly productId: ProductId;

  /** The unit price the product master states, restated by every generated order of it. */
  readonly unitPriceEur: Money;

  /** The plants whose lines build the product. */
  readonly plantIds: readonly PlantId[];

  /** The smallest quantity a generated order of this product carries. */
  readonly minimumQuantity: number;

  /** The largest quantity a generated order of this product carries. */
  readonly maximumQuantity: number;

  /** The step between two admissible quantities, so an order reads as a planned batch size. */
  readonly quantityStep: number;
}

/** The three products, with the price and build plants `src/seed/products.ts` states. */
const PRODUCT_SUPPLY: readonly ProductSupply[] = [
  {
    productId: 'PRD-R75',
    unitPriceEur: 1240,
    plantIds: RIGA_AND_BRNO,
    minimumQuantity: 120,
    maximumQuantity: 760,
    quantityStep: 20,
  },
  {
    productId: 'PRD-A200',
    unitPriceEur: 480,
    plantIds: RIGA_AND_QUERETARO,
    minimumQuantity: 150,
    maximumQuantity: 900,
    quantityStep: 10,
  },
  {
    productId: 'PRD-V40',
    unitPriceEur: 120,
    plantIds: BRNO_AND_RAKOVNIK,
    minimumQuantity: 220,
    maximumQuantity: 1180,
    quantityStep: 20,
  },
];

/**
 * The commercial facts of one material that a generated purchase order restates.
 *
 * A mirror of `src/seed/materials.ts` rather than an import of it: seed modules stay flat
 * (AAP 0.18.1) and a seed module imports `src/types` alone, which is the boundary the source check
 * on seed imports reads. The five members are exactly the facts an order repeats — which supplier
 * the material is bought from, what a purchasing unit costs, the supplier's quoted lead time, and
 * which plants consume the material — so a change to any of them in the master is a change to the
 * matching row below, and no consumer of a purchase order can see the two disagree.
 */
interface MaterialSupply {
  /** The material the purchase order is for. */
  readonly materialId: MaterialId;

  /** The supplier the material master names as the primary source of that material. */
  readonly supplierId: SupplierId;

  /** The supplier's price per purchasing unit, restated by every order of that material. */
  readonly unitCostEur: Money;

  /** The supplier's quoted lead time in days, which dates an order's first promise. */
  readonly leadTimeDays: number;

  /** The plants that build a product the material goes into, so an order lands where it is used. */
  readonly plantIds: readonly PlantId[];
}

/** Builds one row of `MATERIAL_SUPPLY`, so the table below states facts rather than boilerplate. */
function materialSupply(
  materialId: MaterialId,
  supplierId: SupplierId,
  unitCostEur: Money,
  leadTimeDays: number,
  plantIds: readonly PlantId[],
): MaterialSupply {
  return { materialId, supplierId, unitCostEur, leadTimeDays, plantIds };
}

/**
 * The twenty-four materials of `src/seed/materials.ts`, in bill-of-materials order, with the
 * supplier, unit cost, lead time and reach that module states for each.
 *
 * One row per material and no row per order: a generated order draws its material from this table
 * and repeats that row's supplier, cost and lead time, so every purchase order in the record set
 * describes a real supplier-material pairing at the price the master states.
 */
const MATERIAL_SUPPLY: readonly MaterialSupply[] = [
  // Metals — sheet, plate, bar and busbar.
  materialSupply('MAT-ALUMINIUM-SHEET', 'SUP-BAJIO-METALES', 18.4, 28, ALL_PLANTS),
  materialSupply('MAT-STEEL-PLATE', 'SUP-HANSA-METALL', 41.75, 35, RIGA_BRNO_AND_QUERETARO),
  materialSupply('MAT-STAINLESS-BAR', 'SUP-HANSA-METALL', 26.9, 42, RIGA_BRNO_AND_RAKOVNIK),
  materialSupply('MAT-COPPER-BUSBAR', 'SUP-BAJIO-METALES', 22.15, 30, ALL_PLANTS),
  // Castings — the machined housing and the die-cast cover.
  materialSupply('MAT-CAST-IRON-HOUSING', 'SUP-VLTAVA-GUSS', 118.5, 45, RIGA_AND_BRNO),
  materialSupply('MAT-ALUMINIUM-DIE-CAST-COVER', 'SUP-VLTAVA-GUSS', 34.8, 38, RIGA_AND_QUERETARO),
  // Electronics — the control board, its loom, its terminations, its sensor and its drive.
  materialSupply('MAT-CONTROL-PCBA', 'SUP-RHEINSTERN-ELEKTRONIK', 268.4, 84, ALL_PLANTS),
  materialSupply('MAT-WIRE-HARNESS', 'SUP-RHEINSTERN-ELEKTRONIK', 41.9, 35, RIGA_AND_QUERETARO),
  materialSupply('MAT-CONNECTOR-SET', 'SUP-RHEINSTERN-ELEKTRONIK', 12.75, 28, ALL_PLANTS),
  materialSupply('MAT-PRESSURE-SENSOR', 'SUP-RHEINSTERN-ELEKTRONIK', 63.5, 56, ALL_PLANTS),
  materialSupply('MAT-BRUSHLESS-MOTOR', 'SUP-RHEINSTERN-ELEKTRONIK', 186, 63, RIGA_AND_QUERETARO),
  // Drivetrain — bearings, the turned shaft and the gear blank.
  materialSupply('MAT-BALL-BEARING-6205', 'SUP-NORDWERK-ANTRIEB', 6.35, 21, RIGA_BRNO_AND_RAKOVNIK),
  materialSupply('MAT-TAPER-ROLLER-BEARING', 'SUP-NORDWERK-ANTRIEB', 14.9, 28, RIGA_AND_BRNO),
  materialSupply('MAT-DRIVE-SHAFT', 'SUP-NORDWERK-ANTRIEB', 74.2, 32, RIGA_BRNO_AND_QUERETARO),
  materialSupply('MAT-GEAR-BLANK', 'SUP-NORDWERK-ANTRIEB', 38.6, 31, RIGA_AND_QUERETARO),
  // Sealing and fluid — the seal kit, the O-rings, the gasket and the hose assembly.
  materialSupply('MAT-SEAL-KIT', 'SUP-DONAU-DICHTUNG', 17.45, 24, RIGA_BRNO_AND_RAKOVNIK),
  materialSupply('MAT-O-RING-NBR-45', 'SUP-DONAU-DICHTUNG', 0.82, 18, BRNO_AND_RAKOVNIK),
  materialSupply('MAT-PTFE-GASKET-60', 'SUP-DONAU-DICHTUNG', 3.65, 22, BRNO_AND_RAKOVNIK),
  materialSupply('MAT-HYDRAULIC-HOSE', 'SUP-DONAU-DICHTUNG', 47.3, 33, RIGA_AND_BRNO),
  // Fasteners, finish and consumables.
  materialSupply('MAT-FASTENER-SET', 'SUP-HANSA-METALL', 9.85, 20, ALL_PLANTS),
  materialSupply('MAT-COMPRESSION-SPRING', 'SUP-MERIDIAN-INDUSTRIAL', 1.24, 26, RIGA_BRNO_AND_QUERETARO),
  materialSupply('MAT-POWDER-COATING', 'SUP-MERIDIAN-INDUSTRIAL', 12.6, 25, ALL_PLANTS),
  materialSupply('MAT-LITHIUM-GREASE', 'SUP-MERIDIAN-INDUSTRIAL', 8.45, 19, RIGA_BRNO_AND_RAKOVNIK),
  materialSupply('MAT-SHIPPING-CARTON', 'SUP-MERIDIAN-INDUSTRIAL', 7.2, 14, ALL_PLANTS),
];

/**
 * The four endpoints the declared configuration blocks, transcribed from AAP 0.6.3.
 *
 * Every one is an opaque `.example` host, which is reserved for documentation and resolves nowhere,
 * so a trail that names it states an attempt that could not reach anything (rule B-1). The
 * sovereignty record declares the same four and its ledger reads the counts from these events by
 * `objectRef` (AAP 0.12.1), which is why the trail has to carry them: a blocked attempt is the only
 * last-attempt reading the panel can show.
 */
const OUTBOUND_ENDPOINTS: readonly string[] = [
  'api.external-llm.example',
  'public-risk-feed.example',
  'telemetry.vendor.example',
  'license-check.vendor.example',
];

/** The policy that blocks every one of those endpoints: the empty allowed list of AAP 0.6.3. */
const OUTBOUND_POLICY_ID: PolicyId = 'POL-001';

/** The source whose extraction pipeline produces the parts and quality evidence of a package. */
const EXTRACTION_SOURCE_ID: SourceId = 'plm-qms';

/**
 * The personas whose exports the seeded trail records.
 *
 * Exports belong to the personas who read records at book scale — the two planners, the head of
 * supply chain, the platform administrator and the auditor (specification §3) — so a generated
 * export names one of them rather than any random member of the eight.
 */
const EXPORTING_PERSONAS: readonly UserId[] = ['USR-01', 'USR-02', 'USR-03', 'USR-04', 'USR-06'];

/**
 * The activity the seeded trail records, cycled in this order across the generated events.
 *
 * The twelve positions give four source synchronisations, three freshness checks, two extraction
 * reviews, two exports and one blocked outbound attempt per cycle, which is the shape of a month of
 * integration activity: mostly synchronising, occasionally failing, and refusing an outside call at
 * a steady rate. Each kind's actor, object and payload are built in §I.
 */
const AUDIT_EVENT_KINDS: readonly AuditEventKind[] = [
  'source-sync',
  'source-sync',
  'freshness-check',
  'extraction-review',
  'export',
  'source-sync',
  'freshness-check',
  'policy-block',
  'extraction-review',
  'source-sync',
  'export',
  'freshness-check',
];

/** One kind of seeded audit activity. */
type AuditEventKind =
  | 'source-sync'
  | 'freshness-check'
  | 'extraction-review'
  | 'export'
  | 'policy-block';

/* ---------------------------------------------------------------------------------------------
 * C. The deterministic integer generator
 * ------------------------------------------------------------------------------------------- */

/*
 * Every field of every generated record comes from these three helpers. A 32-bit mix of the seed,
 * the record's position and a per-field salt gives a well-spread value; `between` maps it onto a
 * closed range; `choose` reads one member of a table. None of them reads a clock or a random source,
 * so the same arguments return the same numbers on every run (AAP 0.18.2). Under a JavaScript
 * engine a number such as `1 / 3` could differ in the last place between platforms; integer
 * arithmetic cannot, and `Math.imul` keeps every step inside 32 bits.
 */

/** The first mixing constant, the 32-bit golden-ratio increment. */
const HASH_INCREMENT = 0x9e3779b1;

/** The second mixing constant, applied to the per-field salt. */
const HASH_SALT_MULTIPLIER = 0x85ebca6b;

/** The first avalanche multiplier of the finalisation step. */
const HASH_MIX_FIRST = 0x7feb352d;

/** The second avalanche multiplier of the finalisation step. */
const HASH_MIX_SECOND = 0x846ca68b;

/** Bits in a 32-bit word: how far each avalanche shift moves a value. */
const FIRST_SHIFT = 16;

/** The second avalanche shift, which mixes the high bits back into the low ones. */
const SECOND_SHIFT = 15;

/**
 * One 32-bit unsigned value derived from the seed, a position and a field's salt.
 *
 * The mix is a fixed sequence of multiplies and exclusive-ors over 32-bit integers, so it is a pure
 * function of its three arguments on every engine. Two different salts over the same position give
 * unrelated values, which is what keeps a record's quantity independent of its customer.
 */
function hashedValue(position: number, salt: number): number {
  const seeded =
    FILLER_SEED + Math.imul(position + 1, HASH_INCREMENT) + Math.imul(salt + 1, HASH_SALT_MULTIPLIER);
  let value = seeded | 0;
  value ^= value >>> FIRST_SHIFT;
  value = Math.imul(value, HASH_MIX_FIRST);
  value ^= value >>> SECOND_SHIFT;
  value = Math.imul(value, HASH_MIX_SECOND);
  value ^= value >>> FIRST_SHIFT;
  return value >>> 0;
}

/**
 * A whole number in the closed range `minimum` to `maximum`, derived from the position and salt.
 *
 * The caller passes a range that holds at least one value; a range that does not is a programming
 * error rather than a record's state, so it is refused instead of silently widened.
 */
function between(position: number, salt: number, minimum: number, maximum: number): number {
  const span = maximum - minimum + 1;
  if (!Number.isInteger(span) || span < 1) {
    throw new Error(
      `The range ${minimum} to ${maximum} holds no whole number, so no record can be derived from it.`,
    );
  }
  return minimum + (hashedValue(position, salt) % span);
}

/**
 * One member of `items`, derived from the position and salt.
 *
 * The table is never empty in this module, and the guard states that rather than trusting it: an
 * empty table would make the modulo meaningless, and a thrown error names the table so a later
 * reader sees which one lost its rows.
 */
function choose<T>(items: readonly T[], position: number, salt: number, label: string): T {
  if (items.length === 0) {
    throw new Error(`The ${label} table holds no record, so no value can be drawn from it.`);
  }
  const chosen = items[hashedValue(position, salt) % items.length];
  if (chosen === undefined) {
    throw new Error(`The ${label} table has no record at the position drawn for record ${position}.`);
  }
  return chosen;
}

/* ---------------------------------------------------------------------------------------------
 * D. Calendar arithmetic on the demonstration clock — contracts §1
 * ------------------------------------------------------------------------------------------- */

/*
 * Every instant this module writes is the demonstration clock minus a whole number of minutes, and
 * every calendar date is a whole number of days from the date that clock falls on. Both are computed
 * by integer arithmetic over the clock's own fields: no `Date` object is built, so neither the host
 * clock nor the host time zone can reach a generated record, and the offset the timestamps carry is
 * the one the clock itself states.
 */

/** Minutes in an hour, hours in a day and minutes in a day. */
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MINUTES_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR;

/** Days in a four-hundred-year Gregorian era, and the shift that puts the epoch at day zero. */
const DAYS_PER_ERA = 146097;
const CIVIL_EPOCH_SHIFT = 719468;

/** The year, month and day a day number falls on. */
interface CalendarDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** The clock fields a timestamp states, plus the offset it is written in. */
interface ClockReading {
  /** Whole minutes from the epoch to the instant, so two readings compare as numbers. */
  readonly minutesSinceEpoch: number;

  /** The offset the reading records, in minutes east of UTC. */
  readonly offsetMinutes: number;

  /** That offset as the timestamp writes it, so a generated instant repeats the clock's own form. */
  readonly offsetText: string;
}

/** The shape of an ISO 8601 instant: a calendar date, a clock time and an offset (contracts §1). */
const CLOCK_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:\d{2})$/;

/** The shape of a calendar date: `YYYY-MM-DD`. */
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A number with leading zeros up to `width` digits, which is how both formats are written. */
function padded(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/** One numeric group of a matched pattern, refusing a missing or non-integral capture. */
function groupOfNumber(match: RegExpExecArray, group: number): number {
  const text = match[group];
  if (text === undefined) {
    throw new Error(`The instant or date ${match[0]} is missing the field at position ${group}.`);
  }
  const value = Number(text);
  if (!Number.isInteger(value)) {
    throw new Error(`The instant or date ${match[0]} states ${text} where a whole number belongs.`);
  }
  return value;
}

/**
 * The days from the epoch to a calendar date in the proleptic Gregorian calendar.
 *
 * The standard days-from-civil conversion, held as integer arithmetic over the date's own fields so
 * it reads no clock and allocates nothing. Dates are counted rather than measured because every
 * offset below is a whole number of days.
 */
function daysFromCivil(year: number, month: number, day: number): number {
  const shiftedYear = month <= 2 ? year - 1 : year;
  const era = Math.floor(shiftedYear / 400);
  const yearOfEra = shiftedYear - era * 400;
  const marchMonth = month > 2 ? month - 3 : month + 9;
  const dayOfYear = Math.floor((153 * marchMonth + 2) / 5) + day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * DAYS_PER_ERA + dayOfEra - CIVIL_EPOCH_SHIFT;
}

/** The calendar date a day number falls on: the inverse of `daysFromCivil`. */
function civilFromDays(dayNumber: number): CalendarDate {
  const shifted = dayNumber + CIVIL_EPOCH_SHIFT;
  const era = Math.floor(shifted / DAYS_PER_ERA);
  const dayOfEra = shifted - era * DAYS_PER_ERA;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36524) -
      Math.floor(dayOfEra / 146096)) /
      365,
  );
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const marchMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * marchMonth + 2) / 5) + 1;
  const month = marchMonth < 10 ? marchMonth + 3 : marchMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

/** The offset a timestamp records, in minutes east of UTC; the pattern has already fixed its shape. */
function offsetOfText(offsetText: string): number {
  if (offsetText === 'Z') {
    return 0;
  }
  const sign = offsetText.startsWith('-') ? -1 : 1;
  const hours = Number(offsetText.slice(1, 3));
  const minutes = Number(offsetText.slice(4, 6));
  return sign * (hours * MINUTES_PER_HOUR + minutes);
}

/** The fields of an ISO 8601 instant, read as a number of minutes from the epoch. */
function readClock(timestamp: Timestamp): ClockReading {
  const match = CLOCK_PATTERN.exec(timestamp);
  if (match === null) {
    throw new Error(`The demonstration clock ${timestamp} is not an ISO 8601 instant with an offset.`);
  }
  const offsetText = match[7];
  if (offsetText === undefined) {
    throw new Error(`The demonstration clock ${timestamp} states no offset.`);
  }
  const offsetMinutes = offsetOfText(offsetText);
  const dayNumber = daysFromCivil(
    groupOfNumber(match, 1),
    groupOfNumber(match, 2),
    groupOfNumber(match, 3),
  );
  const minutesSinceEpoch =
    dayNumber * MINUTES_PER_DAY +
    groupOfNumber(match, 4) * MINUTES_PER_HOUR +
    groupOfNumber(match, 5) -
    offsetMinutes;
  return { minutesSinceEpoch, offsetMinutes, offsetText };
}

/** The clock the whole module derives from, read once at load time from the constant it names. */
const DEMO_CLOCK_READING = readClock(DEMO_CLOCK);

/** The demonstration clock as minutes from the epoch. */
const DEMO_CLOCK_MINUTES = DEMO_CLOCK_READING.minutesSinceEpoch;

/** The offset the demonstration clock records, in minutes east of UTC. */
const DEMO_CLOCK_OFFSET_MINUTES = DEMO_CLOCK_READING.offsetMinutes;

/** That offset as the clock writes it, so a generated instant carries the clock's own form. */
const DEMO_CLOCK_OFFSET_TEXT = DEMO_CLOCK_READING.offsetText;

/** The local day number the demonstration clock falls on, which every generated date counts from. */
const DEMO_DAY_INDEX = Math.floor((DEMO_CLOCK_MINUTES + DEMO_CLOCK_OFFSET_MINUTES) / MINUTES_PER_DAY);

/** The calendar date the demonstration clock falls on. */
const DEMO_DATE: IsoDate = isoDateOfDay(DEMO_DAY_INDEX);

/** The calendar date a local day number falls on. */
function isoDateOfDay(dayNumber: number): IsoDate {
  const date = civilFromDays(dayNumber);
  return `${padded(date.year, 4)}-${padded(date.month, 2)}-${padded(date.day, 2)}`;
}

/** The local day number a calendar date falls on. */
function dayNumberOfIsoDate(date: IsoDate): number {
  const match = ISO_DATE_PATTERN.exec(date);
  if (match === null) {
    throw new Error(`The calendar date ${date} is not written as YYYY-MM-DD.`);
  }
  return daysFromCivil(groupOfNumber(match, 1), groupOfNumber(match, 2), groupOfNumber(match, 3));
}

/** A calendar date moved by a whole number of days, forwards or backwards. */
function addDaysToIsoDate(date: IsoDate, days: number): IsoDate {
  return isoDateOfDay(dayNumberOfIsoDate(date) + days);
}

/**
 * The instant a whole number of minutes from the epoch falls on, written in the clock's own offset.
 *
 * The offset is applied before the day and minute of day are split out, so a reading never lands on
 * the wrong calendar day: the whole module's timestamps carry the demonstration clock's offset,
 * which contracts §1 fixes for the application's time zone.
 */
function timestampAt(minutesSinceEpoch: number): Timestamp {
  const localMinutes = minutesSinceEpoch + DEMO_CLOCK_OFFSET_MINUTES;
  const dayNumber = Math.floor(localMinutes / MINUTES_PER_DAY);
  const minuteOfDay = localMinutes - dayNumber * MINUTES_PER_DAY;
  const date = civilFromDays(dayNumber);
  const hour = Math.floor(minuteOfDay / MINUTES_PER_HOUR);
  const minute = minuteOfDay - hour * MINUTES_PER_HOUR;
  return (
    `${padded(date.year, 4)}-${padded(date.month, 2)}-${padded(date.day, 2)}` +
    `T${padded(hour, 2)}:${padded(minute, 2)}:00${DEMO_CLOCK_OFFSET_TEXT}`
  );
}

/* ---------------------------------------------------------------------------------------------
 * E. The guards that make an identifier collision a refusal rather than a duplicate
 * ------------------------------------------------------------------------------------------- */

/*
 * Two identifiers must never meet: a generated one and a named one. The blocks this module issues
 * sit above the named series (§A), but a convention is not a fact, so each builder checks what it
 * produced against the identifiers the caller passed in and refuses the call with the collision
 * named. A silent duplicate would give two records one identity, which no consumer could tell apart.
 */

/** The identifier the chain derives for the given sequence: `AUD-nnnnnn` (contracts §1). */
function auditEventIdForSequence(sequence: number): AuditEventId {
  return `AUD-${padded(sequence, 6)}`;
}

/**
 * The correlation identifier a seeded event carries.
 *
 * Contracts §1 fixes no pattern for a trace identifier, so this module derives one from the event's
 * own position in the chain: the same event therefore quotes the same identifier on every run, and a
 * reader can follow a cited trace back to the seeded record it names.
 */
function traceIdForSequence(sequence: number): string {
  return `TRC-${padded(sequence, 6)}`;
}

/**
 * Refuses a generated identifier that repeats a named one, or another generated one.
 *
 * The comparison is over strings rather than over numbers, because that is how a consumer will meet
 * them: two identifiers that differ only in their digits are two records, and two that are equal are
 * one record stored twice.
 */
function assertNoNamedCollision(
  kindLabel: string,
  namedIds: readonly string[],
  generatedIds: readonly string[],
): void {
  const named = new Set<string>(namedIds);
  const seen = new Set<string>();
  for (const id of generatedIds) {
    if (named.has(id)) {
      throw new Error(
        `The generated ${kindLabel} identifier ${id} repeats a named ${kindLabel} identifier, so one of the two has no identity of its own.`,
      );
    }
    if (seen.has(id)) {
      throw new Error(
        `The generated ${kindLabel} identifier ${id} was issued twice, so two records would share it.`,
      );
    }
    seen.add(id);
  }
}

/**
 * Refuses a call whose generated events would take an identifier the caller already named.
 *
 * The chain numbers its events from one and derives each identifier from the sequence (contracts §6,
 * and the identifier shape of §1), so the events this builder returns occupy the positions after
 * the named ones. A named identifier that already sits at one of those positions would be issued
 * twice, and the sequence it claims is what the message names, so a caller can see which of the two
 * has to move.
 */
function assertAuditPositionsFree(
  namedIds: readonly AuditEventId[],
  firstSequence: number,
  lastSequence: number,
): void {
  const named = new Set<string>(namedIds);
  for (let sequence = firstSequence; sequence <= lastSequence; sequence += 1) {
    const derivedId = auditEventIdForSequence(sequence);
    if (named.has(derivedId)) {
      throw new Error(
        `The seeded chain would issue ${derivedId} at position ${sequence}, which the caller already names, so two events would share an identifier.`,
      );
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * F. The field salts
 * ------------------------------------------------------------------------------------------- */

/*
 * One salt per generated field. A salt only has to differ between fields: the mix in §C turns
 * (seed, position, salt) into a value that shares nothing with the value another salt produces for
 * the same record, so a record's quantity, customer and plant vary independently of one another.
 * Named rather than inlined, because a repeated literal would make two fields move together.
 */

const SALT_ORDER_PRODUCT = 1;
const SALT_ORDER_DUE_JITTER = 2;
const SALT_ORDER_SLIP = 3;
const SALT_ORDER_QUANTITY = 4;
const SALT_ORDER_CUSTOMER = 5;
const SALT_ORDER_PLANT = 6;
const SALT_ORDER_STATUS = 7;
const SALT_PURCHASE_MATERIAL = 8;
const SALT_PURCHASE_PLANT = 9;
const SALT_PURCHASE_SLIP = 10;
const SALT_PURCHASE_STATUS = 11;
const SALT_PURCHASE_QUANTITY = 12;
const SALT_AUDIT_GAP = 13;
const SALT_SYNC_SOURCE = 14;
const SALT_SYNC_CADENCE = 15;
const SALT_SYNC_RESULT = 16;
const SALT_FRESHNESS_SOURCE = 17;
const SALT_FRESHNESS_RESULT = 18;
const SALT_FRESHNESS_PRIOR_STATE = 19;
const SALT_EXTRACTION_MATERIAL = 20;
const SALT_EXTRACTION_RESULT = 21;
const SALT_EXPORT_PERSONA = 22;
const SALT_EXPORT_PLANT = 23;
const SALT_EXPORT_FORMAT = 24;
const SALT_POLICY_ENDPOINT = 25;

/* ---------------------------------------------------------------------------------------------
 * G. The customer order builder
 * ------------------------------------------------------------------------------------------- */

/** The customer identifier at a position in the master's `CUS-nnn` series, which starts at one. */
function customerIdAt(position: number): CustomerId {
  return `CUS-${padded(position + 1, 3)}`;
}

/**
 * The 25 unnamed customer orders, which bring the order book to the 40 of AAP 0.2.3.
 *
 * What each record states, and the rule it follows:
 * - `id` continues the `CO-nnnnnn` series above the named block, issued in due-date order so the
 *   book reads the way the named records do.
 * - `customerId` is a `CUS-nnn` key of the customer master; `productId` one of the three products;
 *   `plantId` a plant whose lines build that product, so no order asks a plant for something it does
 *   not make.
 * - `quantity` is a planned batch size within that product's range, and `unitPriceEur` restates the
 *   product master's price, so one product is valued one way by every reader.
 * - `dueDate` is a calendar date relative to the demonstration clock, moving forward across the
 *   generated set; `originalDueDate` is that date or an earlier promise it absorbed, never later.
 * - `status` is the order's position at the clock: an order whose date has passed has shipped or is
 *   late, and one still ahead is open. Never `at-risk`, which is not a date's state but the fact
 *   that an open exception's affected lines name the order — a relationship the generator cannot
 *   assert about a record no exception mentions.
 *
 * Determinism: every field is derived from `FILLER_SEED` and the record's position alone, so two
 * calls with the same arguments return identical records. The builder throws a plain `Error` naming
 * the identifier if a generated one repeats an identifier of `namedIds`.
 */
export function buildFillerCustomerOrders(namedIds: readonly CustomerOrderId[]): CustomerOrder[] {
  const orders: CustomerOrder[] = [];

  for (let position = 0; position < FILLER_CUSTOMER_ORDER_COUNT; position += 1) {
    const product = choose(PRODUCT_SUPPLY, position, SALT_ORDER_PRODUCT, 'product');
    const dueOffsetDays =
      CUSTOMER_ORDER_FIRST_DUE_OFFSET_DAYS +
      Math.floor((position * CUSTOMER_ORDER_DUE_SPAN_DAYS) / FILLER_CUSTOMER_ORDER_COUNT) +
      between(position, SALT_ORDER_DUE_JITTER, 0, CUSTOMER_ORDER_DUE_JITTER_DAYS);
    const dueDate = addDaysToIsoDate(DEMO_DATE, dueOffsetDays);
    const slipDays = choose(CUSTOMER_ORDER_SLIP_DAYS, position, SALT_ORDER_SLIP, 'customer order slip');
    const quantitySteps = Math.floor(
      (product.maximumQuantity - product.minimumQuantity) / product.quantityStep,
    );

    orders.push({
      id: `CO-${CUSTOMER_ORDER_ID_BASE + position}`,
      customerId: customerIdAt(between(position, SALT_ORDER_CUSTOMER, 0, CUSTOMER_ID_SERIES_SIZE - 1)),
      productId: product.productId,
      plantId: choose(product.plantIds, position, SALT_ORDER_PLANT, 'plant'),
      quantity:
        product.minimumQuantity +
        product.quantityStep * between(position, SALT_ORDER_QUANTITY, 0, quantitySteps),
      unitPriceEur: product.unitPriceEur,
      dueDate,
      originalDueDate: addDaysToIsoDate(dueDate, -slipDays),
      status:
        dueOffsetDays < 0
          ? between(position, SALT_ORDER_STATUS, 0, 2) === 0
            ? 'late'
            : 'shipped'
          : 'open',
    });
  }

  assertNoNamedCollision(
    'customer order',
    namedIds,
    orders.map((order) => order.id),
  );
  return orders;
}

/* ---------------------------------------------------------------------------------------------
 * H. The purchase order builder
 * ------------------------------------------------------------------------------------------- */

/**
 * How many generated purchase orders describe a cancelled call-off, as one in this number of them.
 *
 * The named five carry `open`, `delayed` and `received` and no cancellation, so the record set's
 * fourth status is the generated block's to state; a rate rather than a count keeps the spread even
 * as the block grows.
 */
const PURCHASE_ORDER_CANCELLATION_ONE_IN = 23;

/** Which of those draws is the cancelled one, so the position is fixed rather than left to chance. */
const PURCHASE_ORDER_CANCELLATION_POSITION = 7;

/** A band of generated purchase quantities, applied by the unit cost of the material on order. */
interface QuantityBand {
  /** The smallest quantity an order in this band carries. */
  readonly minimumQuantity: number;

  /** The step between two admissible quantities in this band. */
  readonly step: number;

  /** How many steps above the minimum a quantity may sit. */
  readonly steps: number;
}

/** The band for a material costing less than 5 euro a unit, ordered in pallet-scale volume. */
const CHEAP_MATERIAL_QUANTITY_BAND: QuantityBand = { minimumQuantity: 2000, step: 500, steps: 40 };

/** The band for a material costing from 5 to 50 euro a unit. */
const MID_PRICED_MATERIAL_QUANTITY_BAND: QuantityBand = { minimumQuantity: 400, step: 50, steps: 40 };

/** The band for a material costing 50 euro a unit or more, ordered in smaller lots. */
const HIGH_COST_MATERIAL_QUANTITY_BAND: QuantityBand = { minimumQuantity: 100, step: 25, steps: 40 };

/** The unit cost, in euro, up to which the cheapest band applies. */
const CHEAP_MATERIAL_UNIT_COST = 5;

/** The unit cost, in euro, up to which the mid-priced band applies. */
const MID_PRICED_MATERIAL_UNIT_COST = 50;

/**
 * A generated order quantity for a material at a given unit cost.
 *
 * The unit cost decides the band and the position decides the step within it, so a cheap fastener
 * set is ordered in the thousands and a control board in the hundreds — the scale the material's
 * own price implies, rather than one quantity range for every material.
 */
function purchaseQuantity(position: number, unitCostEur: Money): number {
  const band =
    unitCostEur < CHEAP_MATERIAL_UNIT_COST
      ? CHEAP_MATERIAL_QUANTITY_BAND
      : unitCostEur < MID_PRICED_MATERIAL_UNIT_COST
        ? MID_PRICED_MATERIAL_QUANTITY_BAND
        : HIGH_COST_MATERIAL_QUANTITY_BAND;
  return band.minimumQuantity + band.step * between(position, SALT_PURCHASE_QUANTITY, 0, band.steps - 1);
}

/**
 * The 55 unnamed purchase orders, which bring procurement to the 60 of AAP 0.2.3.
 *
 * What each record states, and the rule it follows:
 * - `id` continues the `PO-nnnnnnnn` series above the named block, issued in placement order.
 * - `supplierId`, `materialId` and `unitCostEur` come from one row of `MATERIAL_SUPPLY`, so every
 *   order names the master's primary supplier for its material at the master's price — the pairing
 *   the named records state and AAP 0.12.2 requires.
 * - `plantId` is a plant that builds a product the material goes into, so an order is delivered
 *   where the material is consumed.
 * - `orderedDate` is a calendar date relative to the demonstration clock, moving forward across the
 *   generated set; `originalDueDate` is exactly the supplier's quoted lead time after it, which is
 *   how the named records date their first promise.
 * - `currentDueDate` equals the original promise or a later one, never an earlier date.
 * - `status` follows the named records' reading: a cancelled call-off stays cancelled, an order due
 *   on or before the clock is `received`, one whose promise slipped is `delayed`, and the rest are
 *   `open`.
 *
 * Determinism: every field is derived from `FILLER_SEED` and the record's position alone. The
 * builder throws a plain `Error` naming the identifier if a generated one repeats an identifier of
 * `namedIds`.
 */
export function buildFillerPurchaseOrders(namedIds: readonly PurchaseOrderId[]): PurchaseOrder[] {
  const orders: PurchaseOrder[] = [];
  const demoDayIndex = dayNumberOfIsoDate(DEMO_DATE);

  for (let position = 0; position < FILLER_PURCHASE_ORDER_COUNT; position += 1) {
    const supply = choose(MATERIAL_SUPPLY, position, SALT_PURCHASE_MATERIAL, 'material');
    const placementOffsetDays =
      PURCHASE_ORDER_FIRST_PLACEMENT_OFFSET_DAYS +
      Math.floor((position * PURCHASE_ORDER_PLACEMENT_SPAN_DAYS) / FILLER_PURCHASE_ORDER_COUNT);
    const orderedDate = addDaysToIsoDate(DEMO_DATE, placementOffsetDays);
    const originalDueDate = addDaysToIsoDate(orderedDate, supply.leadTimeDays);
    const slipDays = choose(PURCHASE_ORDER_SLIP_DAYS, position, SALT_PURCHASE_SLIP, 'delivery slip');
    const currentDueDate = addDaysToIsoDate(originalDueDate, slipDays);
    const cancelled =
      between(position, SALT_PURCHASE_STATUS, 0, PURCHASE_ORDER_CANCELLATION_ONE_IN - 1) ===
      PURCHASE_ORDER_CANCELLATION_POSITION;
    const received = dayNumberOfIsoDate(currentDueDate) <= demoDayIndex;

    orders.push({
      id: `PO-${PURCHASE_ORDER_ID_BASE + position}`,
      supplierId: supply.supplierId,
      materialId: supply.materialId,
      plantId: choose(supply.plantIds, position, SALT_PURCHASE_PLANT, 'plant'),
      quantity: purchaseQuantity(position, supply.unitCostEur),
      unitCostEur: supply.unitCostEur,
      orderedDate,
      originalDueDate,
      currentDueDate,
      status: cancelled ? 'cancelled' : received ? 'received' : slipDays > 0 ? 'delayed' : 'open',
    });
  }

  assertNoNamedCollision(
    'purchase order',
    namedIds,
    orders.map((order) => order.id),
  );
  return orders;
}

/* ---------------------------------------------------------------------------------------------
 * I. The seeded audit trail builder
 * ------------------------------------------------------------------------------------------- */

/** The shortest interval between two synchronisations of one source, in minutes. */
const SYNC_CADENCE_MINIMUM_MINUTES = 6 * MINUTES_PER_HOUR;

/** The longest interval between two synchronisations of one source, in minutes. */
const SYNC_CADENCE_MAXIMUM_MINUTES = 48 * MINUTES_PER_HOUR;

/** How many generated synchronisations end in one recorded failure. */
const SYNC_FAILURE_ONE_IN = 11;

/** How many generated freshness checks end in one recorded failure. */
const FRESHNESS_FAILURE_ONE_IN = 9;

/** How many generated extraction reviews end in one element that did not pass. */
const EXTRACTION_FAILURE_ONE_IN = 5;

/**
 * The actor- and payload-carrying half of a generated audit event.
 *
 * `timestamp`, `traceId` and the optional `policyId` are added by `buildAuditDraft`, so this shape
 * holds exactly what distinguishes one kind of activity from another: who acted, on which record,
 * what the outcome was, and the record's values either side of it.
 */
interface DraftContent {
  /** Which kind of actor appended the event. */
  readonly actorType: AuditActorType;

  /** The acting persona, the acting source, or the policy identifier (contracts §6). */
  readonly actorId: string;

  /** What the event records, spelled as the appending activity spells it. */
  readonly action: string;

  /** The record the event is about, which the outbound ledger groups by. */
  readonly objectRef: string;

  /** The outcome the event records. */
  readonly result: AuditResult;

  /** The affected record's values before the activity, or `null` when it created the record. */
  readonly before: AuditPayload | null;

  /** The affected record's values after the activity, or `null` when it removed the record. */
  readonly after: AuditPayload | null;

  /** The policy that decided the outcome, present only on a policy-actor event. */
  readonly policyId?: PolicyId;
}

/**
 * The instant series the generated events occupy, oldest first.
 *
 * The newest event falls a few minutes before the demonstration clock and each earlier one a whole
 * number of minutes before its successor, so the positions of the chain and the passage of time
 * agree. Gaps vary between the bounds in §A, which is what a month of integration activity looks
 * like: a run of events close together, then a quiet stretch.
 */
function buildAuditTimestamps(count: number): readonly number[] {
  const newest = DEMO_CLOCK_MINUTES - AUDIT_LAST_EVENT_MINUTES_BEFORE_CLOCK;
  const fromNewest: number[] = [];
  let instant = newest;

  for (let position = count - 1; position >= 0; position -= 1) {
    fromNewest.push(instant);
    instant -= between(position, SALT_AUDIT_GAP, AUDIT_MINIMUM_GAP_MINUTES, AUDIT_MAXIMUM_GAP_MINUTES);
  }

  return fromNewest.reverse();
}

/** The actor, object, outcome and payload of one kind of seeded activity. */
function contentFor(
  kind: AuditEventKind,
  position: number,
  minutesSinceEpoch: number,
): DraftContent {
  switch (kind) {
    case 'source-sync': {
      const sourceId = choose(SOURCE_IDS, position, SALT_SYNC_SOURCE, 'data source');
      const cadenceMinutes = between(
        position,
        SALT_SYNC_CADENCE,
        SYNC_CADENCE_MINIMUM_MINUTES,
        SYNC_CADENCE_MAXIMUM_MINUTES,
      );
      const previousAsOf = timestampAt(minutesSinceEpoch - cadenceMinutes);
      const failed = between(position, SALT_SYNC_RESULT, 0, SYNC_FAILURE_ONE_IN - 1) === 0;
      return {
        actorType: 'system',
        actorId: sourceId,
        action: 'source sync',
        objectRef: sourceId,
        result: failed ? 'failed' : 'succeeded',
        before: { asOf: previousAsOf },
        after: { asOf: failed ? previousAsOf : timestampAt(minutesSinceEpoch) },
      };
    }
    case 'freshness-check': {
      const sourceId = choose(SOURCE_IDS, position, SALT_FRESHNESS_SOURCE, 'data source');
      const failed = between(position, SALT_FRESHNESS_RESULT, 0, FRESHNESS_FAILURE_ONE_IN - 1) === 0;
      const priorState = between(position, SALT_FRESHNESS_PRIOR_STATE, 0, 1) === 0 ? 'stale' : 'review';
      return {
        actorType: 'system',
        actorId: sourceId,
        action: 'freshness check',
        objectRef: sourceId,
        result: failed ? 'failed' : 'succeeded',
        before: { state: priorState },
        after: { state: failed ? 'unavailable' : 'fresh' },
      };
    }
    case 'extraction-review': {
      const supply = choose(MATERIAL_SUPPLY, position, SALT_EXTRACTION_MATERIAL, 'material');
      const passed = between(position, SALT_EXTRACTION_RESULT, 0, EXTRACTION_FAILURE_ONE_IN - 1) !== 0;
      return {
        actorType: 'system',
        actorId: EXTRACTION_SOURCE_ID,
        action: 'extraction review',
        objectRef: supply.materialId,
        result: 'succeeded',
        before: { state: 'review' },
        after: { state: passed ? 'pass' : 'fail' },
      };
    }
    case 'export': {
      const persona = choose(EXPORTING_PERSONAS, position, SALT_EXPORT_PERSONA, 'persona');
      const plantId = choose(ALL_PLANTS, position, SALT_EXPORT_PLANT, 'plant');
      const format = between(position, SALT_EXPORT_FORMAT, 0, 1) === 0 ? 'json' : 'csv';
      return {
        actorType: 'user',
        actorId: persona,
        action: 'export',
        objectRef: plantId,
        result: 'succeeded',
        before: null,
        after: { format },
      };
    }
    case 'policy-block': {
      const endpoint = choose(OUTBOUND_ENDPOINTS, position, SALT_POLICY_ENDPOINT, 'outbound endpoint');
      return {
        actorType: 'policy',
        actorId: OUTBOUND_POLICY_ID,
        action: 'policy block',
        objectRef: endpoint,
        result: 'blocked',
        policyId: OUTBOUND_POLICY_ID,
        before: null,
        after: { destination: endpoint, allowedList: 'empty' },
      };
    }
  }
}

/** One generated audit event, from its instant, its position in the generated block and its sequence. */
function buildAuditDraft(
  minutesSinceEpoch: number,
  position: number,
  sequence: number,
): AuditEventDraft {
  const kindPosition = position % AUDIT_EVENT_KINDS.length;
  const kind = AUDIT_EVENT_KINDS[kindPosition];
  if (kind === undefined) {
    throw new Error(`The seeded trail has no activity at position ${kindPosition}.`);
  }
  const content = contentFor(kind, position, minutesSinceEpoch);
  const draft: AuditEventDraft = {
    timestamp: timestampAt(minutesSinceEpoch),
    actorType: content.actorType,
    actorId: content.actorId,
    action: content.action,
    objectRef: content.objectRef,
    result: content.result,
    before: content.before,
    after: content.after,
    traceId: traceIdForSequence(sequence),
  };

  // `exactOptionalPropertyTypes` is on, so an absent policy is an absent member rather than a
  // member set to `undefined`: the chain writes the empty string for `policyId` exactly when the
  // member is missing (contracts §6), and a present-but-undefined member would serialize as one.
  return content.policyId === undefined ? draft : { ...draft, policyId: content.policyId };
}

/**
 * The audit events that bring the seeded chain to `targetCount`, so the demonstration opens on 200
 * of them (AAP 0.2.3, AAP 0.12.4).
 *
 * What the generated events record is integration activity over the month before the demonstration
 * clock, cycled through the kinds in §B: a source synchronisation, a freshness check, an extraction
 * review of a material, an export a persona made, and a call to an outbound endpoint that the
 * declared configuration blocked. Every object is a record the seed holds — a source, a material, a
 * plant — and every blocked attempt names one of the four endpoints the sovereignty record declares,
 * so the outbound ledger's counts and last-attempt reading are computed from these events rather
 * than typed into a panel (rule P-6).
 *
 * Sequence and identity belong to the chain, not to this module. `AuditEventDraft` carries no
 * identifier, because `appendEvent` (AAP 0.12.1) computes the sequence, the `AUD-nnnnnn` identifier
 * and both hashes when the draft is appended. The drafts returned here therefore occupy the
 * positions after the named events, and the builder refuses a call whose positions the caller has
 * already named, throwing a plain `Error` that quotes the identifier at fault.
 *
 * Ordering the caller owes the chain: the returned drafts ascend strictly in time and the last of
 * them falls a few minutes before the demonstration clock, so a caller that appends them after
 * events older than the first draft keeps the whole chain's timestamps ascending. A named event
 * later than that first draft has to be placed by its own instant instead — the chain orders its
 * positions, so the mixed set is sorted by timestamp before it is appended rather than
 * concatenated.
 *
 * Determinism: every field is derived from `FILLER_SEED`, the record's position and the constant
 * demonstration clock, so the same arguments return identical records and identical instants.
 */
export function buildFillerAuditEvents(
  namedIds: readonly AuditEventId[],
  targetCount: number,
): AuditEventDraft[] {
  if (!Number.isInteger(targetCount) || targetCount < 0) {
    throw new Error(
      `The seeded audit chain cannot hold ${targetCount} events: the count must be a whole number of zero or more.`,
    );
  }
  if (targetCount < namedIds.length) {
    throw new Error(
      `The seeded audit chain cannot hold ${targetCount} events: the caller already names ${namedIds.length} of them.`,
    );
  }

  const count = targetCount - namedIds.length;
  if (count === 0) {
    return [];
  }

  const firstSequence = namedIds.length + 1;
  assertAuditPositionsFree(namedIds, firstSequence, targetCount);

  return buildAuditTimestamps(count).map((minutesSinceEpoch, position) =>
    buildAuditDraft(minutesSinceEpoch, position, firstSequence + position),
  );
}

