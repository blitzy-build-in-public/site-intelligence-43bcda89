/**
 * Customer master records of the synthetic Site Intelligence dataset: the parties the 40 customer
 * orders belong to, and the `customer` node family the FileMap canvas places on its map lens.
 *
 * Fixing inputs:
 * - `platform-seed-data.md` §1 is the section the customer record belongs to, and AAP 0.2.3 fixes
 *   the volume it has to cover: 40 customer orders, 15 of them named. That document is absent from
 *   this repository, so the customer values themselves are derived rather than transcribed — see the
 *   DERIVATION paragraph below.
 * - AAP 0.12.2 states the relationship these records carry — "a customer order names one customer,
 *   one product and one plant" — so this module supplies identity alone: an order carries the
 *   `CustomerId` defined here, and no order, quantity, price or total lives in this module.
 * - `src/types/topology.ts` puts a customer in the canvas's `customer` node family, whose mark the
 *   map lens projects from `latitude` and `longitude` and whose label is the `name` below.
 *
 * DERIVATION — seed §1 is not on disk, so nothing below transcribes it. What the inputs fix is the
 * relation these records serve — AAP 0.12.2's "a customer order names one customer, one product and
 * one plant" — and the order book that names them, AAP 0.2.3's 40 customer orders of which 15 are
 * named. No input fixes a customer's identity: every name, segment, country and coordinate is
 * authored for this synthetic world, and the identifier is the contracts §1 `CUS-` key. If §1 is
 * supplied later, its table transcribes over these records and supersedes them with no change to any
 * consumer, because every consumer reads a customer through the service.
 *
 * Rules this module is built to satisfy:
 * - P-7: every name, segment and place is invented for this synthetic world. No real vendor,
 *   customer, carmaker or cloud product is named, and no filler text stands in for record content.
 * - P-6: nothing here is a computed figure. `latitude` and `longitude` are record content the map
 *   lens projects; order values, revenue at risk and every aggregate are computed in
 *   `src/domain/aggregation`.
 * - P-5: no market-intelligence value and no competitor reference. Competitor records belong to
 *   `src/seed/market-intelligence.ts` and carry `market_intelligence` provenance.
 * - P-2: this folder is read only by `src/services/mock/seed-loader.ts`, and this module imports
 *   nothing at all beyond the shared types.
 * - B-1 and B-2: a record carries no address, no URL, no credential field and no environment read.
 *
 * Identifier scheme: `CUS-nnn` in ascending order, matching the `CustomerId` pattern of
 * `platform-contracts.md` §1 (`CUS-` followed by the customer's own key). The ids are stable because
 * customer order records reference them, so a record is added rather than renumbered.
 */
import type { CustomerId } from '../types';

/**
 * One customer of the synthetic dataset.
 *
 * A customer reaches the products it buys through its customer orders rather than through a member
 * of this record, which is why it carries no product reference: `src/types/topology.ts` reads an
 * empty product reach on a customer node as "reaches products through orders", not as a gap.
 */
export interface Customer {
  /** The customer's identifier, `CUS-nnn`: the value a customer order carries. */
  id: CustomerId;

  /** The customer's display name, invented for this dataset. */
  name: string;

  /** The market segment the customer buys in. */
  segment: string;

  /** The country the customer's site sits in; its coordinates fall inside this country. */
  country: string;

  /** The site's latitude in degrees, a record value the map lens projects. */
  latitude: number;

  /** The site's longitude in degrees, a record value the map lens projects. */
  longitude: number;
}

/**
 * Every customer of the dataset, in ascending identifier order.
 *
 * The set carries the 40 customer orders with no orphan id: every `CUS-` identifier an order in
 * `src/seed/customer-orders.ts` carries, and every one the deterministic filler in
 * `src/seed/filler.ts` generates, must resolve to a record below. A new customer therefore arrives
 * by adding a record here rather than by naming an identifier an order holds alone.
 *
 * Coordinates are the site's own city to the precision the map lens needs at world scale; each pair
 * sits inside the bounding box of the country named beside it, so a mark cannot land outside the
 * country its record claims.
 */
export const CUSTOMERS: readonly Customer[] = [
  {
    id: 'CUS-001',
    name: 'Haldenwerk Motoren GmbH',
    segment: 'Passenger vehicle OEM',
    country: 'Germany',
    latitude: 48.7758,
    longitude: 9.1829,
  },
  {
    id: 'CUS-002',
    name: 'Vltava Strojirenstvi a.s.',
    segment: 'Commercial vehicle OEM',
    country: 'Czechia',
    latitude: 49.7384,
    longitude: 13.3736,
  },
  {
    id: 'CUS-003',
    name: 'Wisla Nutzfahrzeuge Sp. z o.o.',
    segment: 'Commercial vehicle OEM',
    country: 'Poland',
    latitude: 51.1079,
    longitude: 17.0385,
  },
  {
    id: 'CUS-004',
    name: 'Alpenrand Fahrzeugbau AG',
    segment: 'Passenger vehicle OEM',
    country: 'Austria',
    latitude: 47.0707,
    longitude: 15.4395,
  },
  {
    id: 'CUS-005',
    name: 'Loiretal Motoren SAS',
    segment: 'Passenger vehicle OEM',
    country: 'France',
    latitude: 47.9029,
    longitude: 1.9093,
  },
  {
    id: 'CUS-006',
    name: 'Maasdelta Trucking B.V.',
    segment: 'Fleet operator',
    country: 'Netherlands',
    latitude: 51.9244,
    longitude: 4.4777,
  },
  {
    id: 'CUS-007',
    name: 'Meseta Vehiculos S.A.',
    segment: 'Passenger vehicle OEM',
    country: 'Spain',
    latitude: 41.6488,
    longitude: -0.8891,
  },
  {
    id: 'CUS-008',
    name: 'Meccanica Valsesia S.p.A.',
    segment: 'Tier-1 systems integrator',
    country: 'Italy',
    latitude: 45.0703,
    longitude: 7.6869,
  },
  {
    id: 'CUS-009',
    name: 'Nordkalotten Motorverk AB',
    segment: 'Commercial vehicle OEM',
    country: 'Sweden',
    latitude: 57.7089,
    longitude: 11.9746,
  },
  {
    id: 'CUS-010',
    name: 'Bosporus Otomotiv A.S.',
    segment: 'Bus and coach OEM',
    country: 'Turkey',
    latitude: 41.0082,
    longitude: 28.9784,
  },
  {
    id: 'CUS-011',
    name: 'Fenshire Vehicle Group Ltd',
    segment: 'Off-highway equipment',
    country: 'United Kingdom',
    latitude: 52.5695,
    longitude: -0.2405,
  },
  {
    id: 'CUS-012',
    name: 'Pannon Jarmuipari Kft.',
    segment: 'Passenger vehicle OEM',
    country: 'Hungary',
    latitude: 47.6875,
    longitude: 17.6504,
  },
  {
    id: 'CUS-013',
    name: 'Bajio Vehiculos S.A. de C.V.',
    segment: 'Passenger vehicle OEM',
    country: 'Mexico',
    latitude: 21.125,
    longitude: -101.686,
  },
  {
    id: 'CUS-014',
    name: 'Huron Powertrain Inc.',
    segment: 'Tier-1 systems integrator',
    country: 'United States',
    latitude: 42.3314,
    longitude: -83.0458,
  },
];
