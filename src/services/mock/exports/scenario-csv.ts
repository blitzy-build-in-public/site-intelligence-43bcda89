/**
 * The scenario-comparison download's assembler for the demonstration adapter.
 *
 * It re-exports the shared CSV builder so both adapters emit the same bytes for the same set (AAP
 * 0.12.3), and the name stays exported from this path per AAP 0.13.1.
 */

export { buildScenarioComparisonCsv } from '../../exports/scenario-csv';
