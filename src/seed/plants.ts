/**
 * The plant and production-line records: the four plants every plant-scoped read and aggregate is
 * keyed on, and the lines whose nominal per-day rate the solver consumes.
 *
 * Fixing inputs:
 * - AAP 0.12.2's entity row "`Plant`, `Line`, `Product`, `Customer` (seed §1)" and its invariant —
 *   "a line belongs to one plant", while a product is built at one or two lines (recorded on the
 *   product, not here).
 * - `platform-contracts.md` §1 fixes the identifier shapes, `PLT-…` for a plant and `LN-…` for a
 *   line; AAP 0.12.2 and specification §5.1 fix the four plant identifiers themselves.
 * - AAP 0.8 fixes the one line this run names through a plan: the "900 Brno service kits" a response
 *   defers are built on a line of `PLT-BRN`, which is `LN-BRN-2` below.
 *
 * Only `PLT-BRN`'s city is fixed by an input (Brno). The other three are the plausible locations of
 * a manufacturer with three European plants and one in the Americas, and each coordinate is that
 * city's own, so the map lens projects the plants onto the bundled boundaries with no placement data
 * of its own.
 *
 * DERIVATION — seed §1 is not on disk. `platform-seed-data.md` §1, which holds these plant and
 * line records, is not part of this repository, so none of the values below is transcribed from
 * it. What the inputs fix is named above and no more: AAP 0.2.3's scale of four plants, the four
 * plant identifiers AAP 0.12.2 and specification §5.1 give, and AAP 0.8's statement that the 900
 * service kits are built on a line of `PLT-BRN`. The city, country and coordinate of the other
 * three plants, and each line's identifier and nominal per-day rate beyond the ones a named input
 * fixes, are derived. If §1 is supplied later, its table transcribes over these records and
 * supersedes them with no change to any consumer, because every consumer reads a plant or a line
 * through the service.
 *
 * Every value here is record content — a city, a coordinate, a nominal per-day rate. No solver
 * result, aggregate or fixture value appears in this module (rule P-6), no URL or external asset is
 * named (rule B-1), and the module lives in the one folder only `src/services/mock/seed-loader.ts`
 * may import (rule P-2).
 */

import type { LineId, PlantId } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Records — AAP 0.12.2, seed §1
 * ------------------------------------------------------------------------------------------- */

/**
 * One production line: the unit a plan is stated per, and the unit an exception names as the line it
 * disturbs (`OperationalException.lineId`).
 *
 * A line belongs to exactly one plant, and `unitsPerDay` is the nominal output the solver compares a
 * disrupted day's actual output against. Both are record content; what a disruption does to the rate
 * is the solver's arithmetic, not this record's.
 */
export interface Line {
  /** The line's identifier, `LN-` followed by its own key. */
  id: LineId;

  /** The plant the line belongs to; the plant's `lineIds` names it back. */
  plantId: PlantId;

  /** The name the plan grid and the investigation screen print for the line. */
  name: string;

  /** The line's nominal output per working day, the rate the solver measures idle time against. */
  unitsPerDay: number;
}

/**
 * One plant: a place a disruption lands on, a node of the FileMap canvas, and one of the values the
 * top bar's plant filter and the role's plant scope select between.
 *
 * `latitude` and `longitude` are decimal degrees in the order the type states them; they are seed
 * record values the topology handler copies onto the plant's node and the map lens projects, so
 * nothing in this module places a plant on a map.
 */
export interface Plant {
  /** The plant's identifier, one of the four AAP 0.12.2 fixes. */
  id: PlantId;

  /** The name the queue, the overview's by-plant table and the canvas print for the plant. */
  name: string;

  /** The city and country the plant sits in, as the screens show it. */
  location: string;

  /** The plant's latitude in degrees. */
  latitude: number;

  /** The plant's longitude in degrees. */
  longitude: number;

  /** The lines the plant runs; each one names this plant back through its `plantId`. */
  lineIds: readonly LineId[];
}

/* ---------------------------------------------------------------------------------------------
 * Records — one row per line, one row per plant
 * ------------------------------------------------------------------------------------------- */

/**
 * The six production lines, grouped by plant.
 *
 * `LN-BRN-2` is the service-kit line of AAP 0.8. Line names repeat across plants because a line is
 * identified by its `id`; the plant a name belongs to is the row's `plantId`.
 */
export const LINES: readonly Line[] = [
  { id: 'LN-RGB-1', plantId: 'PLT-RGB', name: 'Final assembly line 1', unitsPerDay: 480 },
  { id: 'LN-RGB-2', plantId: 'PLT-RGB', name: 'Final assembly line 2', unitsPerDay: 360 },
  { id: 'LN-BRN-1', plantId: 'PLT-BRN', name: 'Final assembly line 1', unitsPerDay: 540 },
  { id: 'LN-BRN-2', plantId: 'PLT-BRN', name: 'Service kit line', unitsPerDay: 300 },
  { id: 'LN-QRO-1', plantId: 'PLT-QRO', name: 'Final assembly line 1', unitsPerDay: 420 },
  { id: 'LN-RAK-1', plantId: 'PLT-RAK', name: 'Component line 1', unitsPerDay: 260 },
];

/**
 * The four plants, in the order the plant filter lists them.
 *
 * Every identifier a `lineIds` entry names is a `LINES` row whose `plantId` is this plant, and every
 * `LINES` row appears in exactly one plant's `lineIds`, so neither direction holds an orphan.
 */
export const PLANTS: readonly Plant[] = [
  {
    id: 'PLT-RGB',
    name: 'Riga plant',
    location: 'Riga, Latvia',
    latitude: 56.9496,
    longitude: 24.1052,
    lineIds: ['LN-RGB-1', 'LN-RGB-2'],
  },
  {
    id: 'PLT-BRN',
    name: 'Brno plant',
    location: 'Brno, Czech Republic',
    latitude: 49.1951,
    longitude: 16.6068,
    lineIds: ['LN-BRN-1', 'LN-BRN-2'],
  },
  {
    id: 'PLT-QRO',
    name: 'Querétaro plant',
    location: 'Querétaro, Mexico',
    latitude: 20.5888,
    longitude: -100.3899,
    lineIds: ['LN-QRO-1'],
  },
  {
    id: 'PLT-RAK',
    name: 'Rakovník plant',
    location: 'Rakovník, Czech Republic',
    latitude: 50.1061,
    longitude: 13.7331,
    lineIds: ['LN-RAK-1'],
  },
];
