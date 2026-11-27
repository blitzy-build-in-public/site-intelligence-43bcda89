/**
 * The six modelled data sources of Site Intelligence: each one's display name, its freshness state
 * and the instant it last answered, in the order the shell's freshness strip renders them.
 *
 * Fixing inputs:
 * - AAP 0.6.3 models the six sources as freshness records and never as connections, and makes one of
 *   them a gate: ERP's state decides whether `requestApproval` and `decideApproval` may proceed.
 * - AAP 0.12.2's `SourceHealth` row fixes the four members of every record — the source, the name
 *   printed for it, the state and the as-of instant — and nothing beyond them.
 * - AAP 0.2.1 and T-13 fix that gate's observable behaviour, which this record serves: when ERP is
 *   stale the service refuses both calls with a `Problem` naming ERP and the instant below, and every
 *   screen offering those controls renders the stale banner and disables them with that same reason.
 *   ERP's `asOf` is therefore a single unambiguous instant, never a range and never a reading of the
 *   system clock.
 * - AAP 0.13.1 and 0.15.1 name this module in the seed list. `src/services/mock/seed-loader.ts` is
 *   the only module that may import it (rule P-2); every screen reads these records through the typed
 *   service interface instead.
 *
 * Every seeded source is `fresh`, ERP included. Staleness is a condition the simulation popover turns
 * on at run time (AAP 0.12.1, `src/services/mock/simulation.ts`), not a property of the seed data: a
 * seeded stale ERP would start the application in the state T-13 is meant to reach from a healthy one
 * and would leave its trigger unobservable.
 *
 * No elapsed-time member appears here. The pills print the state together with how long ago the source
 * last answered, and that quantity is derived from `asOf` against the constant demonstration clock
 * (`DEMO_CLOCK`) at render time, by the component that prints it, because no business logic reads the
 * system clock (AAP 0.2.1, rule P-6). A stored quantity would be wrong on every render after the one it
 * was written for.
 *
 * DERIVATION — `platform-seed-data.md` §7 is not part of this repository, so nothing here transcribes
 * it directly. The six display names are `SOURCE_LABELS` in `src/types/sources.ts`, which already
 * carries that section's names against the six `SourceId` keys, and each record reads its name from
 * that map rather than retyping it. The six as-of instants are chosen inside the fresh window of the
 * demonstration morning: all on 2026-12-03 between 06:00 and 08:00 Europe/Berlin, none later than
 * `DEMO_CLOCK`, all distinct, and ERP's distinct from the other five so the stale banner names one
 * instant unambiguously. If the seed file is supplied later, its instants transcribe over these
 * without changing a consumer, because every reader takes the value from this record.
 *
 * Rules served: B-1 (a source is a record, never an endpoint — the module holds no URL, host,
 * connector or polling setting), B-2 (no credential field and no environment read), P-1 and P-4 (a
 * state reports what the adapter read and asserts nothing further about it; the six are generic data
 * categories, never a product or vendor name), P-5 (the market pack is one source record; no
 * competitor figure is mixed into a first-party value here), P-6 (instants only — no figure is typed
 * or derived in this module), P-2 (imports nothing but the shared types) and P-7 (synthetic content
 * only).
 */

import { SOURCE_LABELS, type SourceCatalogue } from '../types';

/**
 * The six sources as the freshness strip renders them, left to right in the specification's order:
 * ERP, MES, Scheduling, PLM and QMS, Transport, Market pack.
 *
 * The order lives in this array because `SourceCatalogue` is a list rather than a map keyed by
 * `SourceId`, which is what a map would lose. Every record takes its `label` from `SOURCE_LABELS`, so a
 * record cannot print a name that contradicts its own `source` key.
 */
export const SOURCES: SourceCatalogue = {
  health: [
    {
      // Orders, stock and goods receipts: the plan of record. Its state is the gate on approval
      // (test T-13), which is why its instant is its own and is read back verbatim by the refusal.
      source: 'erp',
      label: SOURCE_LABELS.erp,
      state: 'fresh',
      asOf: '2026-12-03T07:52:00+01:00',
    },
    {
      // Line output and work in progress: the figures a projected idle window is measured against.
      source: 'mes',
      label: SOURCE_LABELS.mes,
      state: 'fresh',
      asOf: '2026-12-03T07:58:00+01:00',
    },
    {
      // The production sequence whose orders the solver projects forward from the opening stock.
      source: 'scheduling',
      label: SOURCE_LABELS.scheduling,
      state: 'fresh',
      asOf: '2026-12-03T07:30:00+01:00',
    },
    {
      // Parts, revisions and the quality evidence behind each approval element. No customer document
      // body travels with this record; that content is classified separately (rule P-4).
      source: 'plm-qms',
      label: SOURCE_LABELS['plm-qms'],
      state: 'fresh',
      asOf: '2026-12-03T06:45:00+01:00',
    },
    {
      // The freight leg that carries an expedited or transshipped option, and the lane times it needs.
      source: 'transport',
      label: SOURCE_LABELS.transport,
      state: 'fresh',
      asOf: '2026-12-03T07:40:00+01:00',
    },
    {
      // The simulated pack the competitive atlas reads. It feeds competitor series only; a
      // first-party value is never summed with it (rule P-5).
      source: 'market-pack',
      label: SOURCE_LABELS['market-pack'],
      state: 'fresh',
      asOf: '2026-12-03T06:10:00+01:00',
    },
  ],
};
