/**
 * Source-health vocabulary: the six modelled data sources, the name to print for each, the state and
 * as-of instant the freshness pills report, and the ordered catalogue the strip renders.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §3 declares `SourceHealth` among the core types and directs that the
 *   source types be defined in this folder beside them, fixing none of its members. Every member
 *   below is derived from the consumer that needs it — AAP 0.12.2 records the content as "source
 *   state and age" — and nothing is added that no input states.
 * - `platform-seed-data.md` §7 fixes the six sources by display name: ERP, MES, Scheduling,
 *   PLM and QMS, Transport, Market pack. `SOURCE_LABELS` carries those names against the six
 *   `SourceId` keys of `./primitives`, so a component prints a source name from the map rather than
 *   spelling one itself.
 * - The six are modelled and never contacted: no connector, no connection detail and no endpoint
 *   shape exists anywhere in the demonstration (AAP 0.6.3, rule B-1). A source record states when it
 *   last answered and how current that answer is, and nothing more.
 *
 * Freshness is a live stage-S1 surface rather than a placeholder. The top bar renders the six pills
 * (`src/app/freshness-strip.tsx`), and ERP's state gates `requestApproval` and `decideApproval`: the
 * service refuses both with a `Problem` naming the source and its as-of time, and every screen
 * offering those controls renders the stale banner and disables them with the same reason
 * (AAP 0.2.1, T-13). That one source is named once, by `APPROVAL_GATE_SOURCE` below, so the refusal,
 * the stale trigger and the banner read one value. The S5 data-source screen is outside this run's scope (AAP 0.14.2) and its
 * route renders the stage notice, so nothing here describes a screen.
 *
 * `SourceHealth` and `Freshness` in `./entities` report the same three facts, and only one of them
 * carries a printable name. A service response's `Meta.freshness` carries `Freshness` — the
 * adapter's own report of what it read — while the strip renders `SourceHealth` from
 * `SourceCatalogue`, which is that same source, state and instant with the label from
 * `SOURCE_LABELS` attached. Neither shape is a second computation: both are record values the
 * adapter supplies, and no screen resolves a source name for itself.
 *
 * Age is deliberately absent. The pills print "state and age", and age is derived from `asOf`
 * against the constant demonstration clock of `./primitives` at render time, by the component that
 * prints it, because no business logic reads the system clock (AAP 0.2.1). This module therefore
 * holds no age member, no duration, no count and no threshold — not one numeric literal.
 *
 * Rules served: P-6 (the module types a state and an instant and states no figure), P-2 (source
 * health reaches a screen through the typed service interface, so this module imports only the
 * shared primitives and the core entities and reaches no seed, service, domain or React module),
 * P-1 (the label a pill carries where the shell renders it is a `SimLabel` from `./primitives`, so
 * no label string is retyped here), P-4 (a source's state reports what the adapter read and says
 * nothing further about it), P-7 (the six names are the generic data categories of seed §7, never a
 * product, vendor or cloud service name), and B-2 (a source carries no connection detail, because no
 * connector exists).
 *
 * OPEN ITEM: the order of the six is the specification's and no type can enforce it. The handler
 * that builds the catalogue supplies ERP, MES, Scheduling, PLM and QMS, Transport, Market pack in
 * that order; the catalogue is a list rather than a map keyed by `SourceId` precisely because a map
 * would not preserve it.
 * OPEN ITEM: `SourceHealth.label` must equal `SOURCE_LABELS[source]`, a pairing no type can enforce
 * while a pill prints one field. The handler fills both from the map, so a record cannot print a
 * name that contradicts its own key.
 * OPEN ITEM: `asOf` must be an instant the seed supplies and never a reading of the system clock,
 * which no type can enforce; the seed supplies every instant (rule P-6, determinism).
 */

import type { SourceId, Timestamp } from './primitives';
import type { FreshnessState } from './entities';

/**
 * The six display names fixed by `platform-seed-data.md` §7, keyed by `SourceId`.
 *
 * The map is exhaustive over `SourceId`, so a source added to or renamed in `./primitives` fails to
 * compile until its display name is supplied here. The freshness strip, the outbound ledger and the
 * evidence drawer print a source name from this map and never spell one themselves.
 */
export const SOURCE_LABELS: Record<SourceId, string> = {
  erp: 'ERP',
  mes: 'MES',
  scheduling: 'Scheduling',
  'plm-qms': 'PLM and QMS',
  transport: 'Transport',
  'market-pack': 'Market pack',
};

/**
 * The one source the freshness rule gates approval on — `platform-contracts.md` §3, AAP 0.2.1, T-13.
 *
 * ERP is the order book behind every plan: `requireFreshOrderBook` refuses `requestApproval` and
 * `decideApproval` while this source reports `stale` or `unavailable`, the stale trigger of
 * `src/services/mock/simulation.ts` marks this same source, and the audit trail's stale banner names
 * it. Declared here because `src/types` is the one vocabulary every consuming module may import
 * (rule P-2): the refusal and the visible half of the rule read one value, so the source the service
 * refuses on and the source a banner names cannot drift apart if the gate ever moves.
 */
export const APPROVAL_GATE_SOURCE: SourceId = 'erp';

/**
 * One source's contribution as the six freshness pills report it: which source it is, the name to
 * print, how current its answer is, and when it last answered.
 *
 * `label` is filled from `SOURCE_LABELS` by the handler that builds the catalogue and is never
 * retyped at a call site. `asOf` is a record value the seed supplies; a pill's age is derived from
 * it against the constant demonstration clock at render time, which is why no age member appears
 * here (rule P-6).
 */
export interface SourceHealth {
  /** Which of the six sources this record describes. */
  source: SourceId;

  /** The source's display name, taken from `SOURCE_LABELS`. */
  label: string;

  /** How current the source's answer is; `stale` and `unavailable` both gate approval. */
  state: FreshnessState;

  /** When the source last answered, an instant in the application's time zone. */
  asOf: Timestamp;
}

/**
 * The six sources as one ordered set, in the order the freshness strip renders them left to right.
 *
 * The order is the specification's — ERP, MES, Scheduling, PLM and QMS, Transport, Market pack — and
 * the handler that builds the catalogue supplies both the order and the records.
 */
export interface SourceCatalogue {
  /** The six source records, in the specification's order. */
  health: SourceHealth[];
}
