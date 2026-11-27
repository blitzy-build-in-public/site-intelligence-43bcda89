/**
 * The scenario-comparison download's assembler for the demonstration adapter.
 *
 * This module is the one AAP 0.12.1's "Exports" row puts in `src/services/mock/exports/`, and it holds
 * no assembly of its own: the comparison is a pure function of the `ScenarioSet` the adapter's scenario
 * read already returned, with nothing of the session's state left to read, so the composition lives in
 * `src/services/exports/scenario-csv.ts` — which both adapters call, because AAP 0.12.3 requires the two
 * adapters to share the observable behaviour that makes the swap invisible, the same CSV byte for byte
 * for the same set.
 *
 * The name stays exported from this path because the adapter's dispatcher imports it here, as AAP 0.13.1's
 * tree lays the exports folder out, and because a stage that adds an adapter-specific part of the
 * comparison has one place to add it (rule P-2).
 */

export { buildScenarioComparisonCsv } from '../../exports/scenario-csv';
