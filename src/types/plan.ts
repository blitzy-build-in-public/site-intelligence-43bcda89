/**
 * Production plan vocabulary: the plan grid a plant's lines are stated over, one cell per line and
 * working date.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §3 declares `PlanGrid` among the core types and directs that the
 *   topology, atlas, plan-grid, source, model and exit-package types be defined in the types folder
 *   next to those types. It fixes none of `PlanGrid`'s members, so each member below is derived from
 *   the consumer that names it — AAP 0.12.2 records the grid's contents as "plan cells" — and no
 *   member is added that no input states.
 * - AAP 0.12.2 lists `PlanGrid` as declared for interface completeness and as surfaced by no S1-S3
 *   screen. The production plan screen, SCR-09, belongs to stage S5, which AAP 0.14.2 places out of
 *   scope; the route `/plants/:plantId/plan` renders the stage notice instead. This module
 *   therefore types the grid so the port and the seed type-check for the stage that builds the
 *   screen, and it describes no screen: no screen object for SCR-09 exists anywhere.
 * - AAP 0.12.1 fixes the Monday-to-Friday calendar in `src/domain/solver/calendar.ts` and says the
 *   grid carries results. No working-day rule, shift arithmetic or capacity rule belongs here, and
 *   none is declared.
 *
 * A grid's figures are computed by the solver or read from a seed record (rule P-6), so this module
 * declares the slots they arrive in and holds no value, no threshold and no capacity. The label a
 * plan figure carries where the screen renders it is that screen's concern, so no label string is
 * typed here either.
 *
 * Rules served: P-6 (the cell declares a slot and states no figure), P-2 (the grid arrives through
 * the typed service interface, so this module imports nothing but the shared primitives and reaches
 * no seed, service or domain module).
 *
 * The horizon's length, the set of rows and every `units` value are seed content the S5 stage
 * supplies, so this module types none of them. A cell names no product, although one line can build
 * more than one product (AAP 0.12.2); no input fixes a product dimension on a plan cell. No
 * capacity, shift or plan-status member exists, because no input fixes a plan rule or a plan state.
 * That a row's cells align to the grid's horizon by date is an invariant no type can express, so
 * the handler that builds the grid keeps it.
 */
import type { IsoDate, LineId, PlantId } from './primitives';

/**
 * One line's planned output on one calendar date.
 *
 * `units` is a computed or seeded quantity carried in the slot; nothing in this module plans, caps
 * or derives it.
 */
export interface PlanCell {
  /** The date the cell's units are planned for, as a calendar date in the application's zone. */
  date: IsoDate;

  /** Planned output for the line on `date`, computed by the solver or read from a seed record. */
  units: number;
}

/**
 * One line's cells across the whole horizon.
 *
 * A plan is stated per line, and a line belongs to exactly one plant, so the row carries both
 * identifiers and a consumer can group by either. `cells` aligns to the grid's horizon by date
 * rather than by position: a date the row does not carry is a missing cell, never a shifted one.
 */
export interface PlanGridRow {
  /** Plant the line belongs to, so a consumer can group rows without looking the line up. */
  plantId: PlantId;

  /** The line whose output the row's cells plan. */
  lineId: LineId;

  /** One cell per date the line carries; find a cell by its date, never by its index. */
  cells: PlanCell[];
}

/**
 * A plant's production plan over a horizon of working dates.
 *
 * `horizon` is the ordered list of dates the grid covers and `rows` are the lines planned over it.
 * The horizon comes from the seed through the service; it is never derived from the system clock,
 * so the same seed always yields the same grid.
 */
export interface PlanGrid {
  /** Ordered dates the grid covers, earliest first, spanning the planning horizon. */
  horizon: IsoDate[];

  /** One row per planned line. */
  rows: PlanGridRow[];
}
