/**
 * The three products of the demonstration: `PRD-R75`, `PRD-A200` and `PRD-V40`.
 *
 * Fixing inputs: AAP 0.12.2's entity row for the §1 records this module belongs to — "`Plant`,
 * `Line`, `Product`, `Customer` (seed §1) … A product is built at one or two lines" — plus the
 * three identifiers the portfolio is fixed at (`src/types/primitives.ts`, AAP 0.2.3, 0.6.3). The
 * section itself is not part of this repository, so the values it would transcribe are authored
 * here.
 *
 * Two consumers fix the members. `priceEur` is the unit price the exception aggregation multiplies
 * by units at risk (AAP 0.8), so it is a record value of at most two decimals and never a revenue,
 * an aggregate or an expected result — every figure derived from it is computed by
 * `src/domain/aggregation` (rule P-6). `productClass` is the class the competitive atlas's selector
 * filters the client and the competitors by (AAP 0.12.4 SCR-13); the three products occupy three
 * distinct classes so that selector has something to separate, and the class labels are authored
 * here because no input names them.
 *
 * Records stay flat (AAP 0.18.1): `lineIds` names, as data, lines that `src/seed/plants.ts`
 * declares, and this module does not import that sibling. Seed modules are joined by the mock
 * adapter's handlers, never by each other, so a product carries identifiers rather than line
 * records. The scheme is `LN-<plant key>-<line number>`, the `LineId` shape
 * `src/types/primitives.ts` fixes.
 *
 * DERIVATION — seed §1 is not on disk. `platform-seed-data.md` §1, which holds the product
 * records, is not part of this repository, so no value below is transcribed from it. What the
 * inputs fix is the scale and the keys: AAP 0.2.3's three products, the three identifiers
 * `src/types/primitives.ts` carries, and AAP 0.12.2's rule that a product is built at one or two
 * lines. Each name, description, unit price and product class is authored, because no input fixes
 * any of them; the price is the record value the exception aggregation multiplies, never a
 * revenue, and the classes exist so the atlas selector of AAP 0.12.4 SCR-13 has three to separate.
 * If §1 is supplied later, its table transcribes over these records and supersedes them with no
 * change to any consumer, because every consumer reads a product through the service.
 *
 * Rules served:
 * - P-6: every member is a record value or an identifier; no computed figure, no aggregate and no
 *   expected result appears in this module.
 * - P-2: the only import is the shared type barrel, so this module reaches no service, no adapter
 *   and no component, and only `src/services/mock/seed-loader.ts` may import it.
 * - P-7: names, classes and descriptions are synthetic — no real company, customer, carmaker or
 *   cloud service is named, no field is a placeholder, and the barred product name is absent.
 * - B-1, B-2: the file holds no URL, no credential and no environment read.
 */

import type { LineId, Money, ProductId } from '../types';

/**
 * One product of the demonstration's portfolio.
 *
 * `lineIds` holds one or two lines and never more (AAP 0.12.2): one line for a single-plant build,
 * two for a build split across plants. The relation is not exclusive in either direction — a plant
 * may build several products, and a product may be built on more than one line.
 */
export interface Product {
  /** The product's identifier: `PRD-R75`, `PRD-A200` or `PRD-V40`. */
  id: ProductId;

  /** The name the exception queue, the FileMap canvas and the atlas print for the product. */
  name: string;

  /** The class the competitive atlas's selector filters by (AAP 0.12.4 SCR-13). */
  productClass: string;

  /** The unit price in euro, at most two decimals: the factor the revenue-at-risk rule applies. */
  priceEur: Money;

  /** The one or two production lines that build the product, as `src/seed/plants.ts` declares them. */
  lineIds: readonly LineId[];

  /** The one-line account of what the product is, in the portfolio's own words. */
  description: string;
}

/**
 * The demonstration's three products, in identifier order.
 *
 * The array is `readonly` because the seed is the record set of the demonstration: the mock
 * adapter's loader deep-clones it into mutable state and a reset restores from the modules, so
 * nothing in the application writes to these records.
 */
export const PRODUCTS: readonly Product[] = [
  {
    id: 'PRD-R75',
    name: 'R75 Rotor Assembly',
    productClass: 'Rotating assembly',
    priceEur: 1240,
    lineIds: ['LN-RGB-1', 'LN-BRN-1'],
    description:
      'Balanced twin-stage rotor assembly built to a customer drawing, produced at two plants.',
  },
  {
    id: 'PRD-A200',
    name: 'A200 Actuation Module',
    productClass: 'Actuation module',
    priceEur: 480,
    lineIds: ['LN-RGB-2', 'LN-QRO-1'],
    description:
      'Electromechanical actuation module built from one machined housing, assembled at two plants.',
  },
  {
    id: 'PRD-V40',
    name: 'V40 Flow-Control Valve',
    productClass: 'Flow-control valve',
    priceEur: 120,
    lineIds: ['LN-BRN-2', 'LN-RAK-1'],
    description:
      'Service-replacement flow-control valve supplied in kits, built on two lines at two plants.',
  },
];
