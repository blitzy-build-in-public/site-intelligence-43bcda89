/**
 * The run-out pair as the reading AAP §0.8 requires: the day contracts §4 rule 4 reports, followed by
 * the half-day wording such as "day 5, end of day" or "day 4, midday".
 *
 * The wording lives in `src/types/figure-text.ts`: the comparison CSV states the row the matrix
 * states, its composer is a service module that may not import `src/components`, so a copy kept here
 * could never be the export's (AAP §0.18.1). This module only re-exports `RUN_OUT_READING_TEXT`,
 * `runOutReading` and `runOutStatement`, deciding no word, boundary or sentence of its own, so SCR-03's
 * projection, the comparison matrix and their suites keep importing the module they already import.
 */
export { RUN_OUT_READING_TEXT, runOutReading, runOutStatement } from '../types';
