/**
 * The run-out pair as the reading AAP §0.8 requires: the day contracts §4 rule 4 reports, followed by
 * the half-day wording that says where inside that day the position ran out — "day 5, end of day",
 * "day 4, midday".
 *
 * WHERE THE WORDING LIVES, AND WHY THIS MODULE STILL EXISTS. The wording itself is held in
 * `src/types/figure-text.ts`: the three half-day readings, the two fraction boundaries that choose
 * between them, and the two sentences a surface composes from them, beside the interface's one money
 * formatter and for the same reason. The comparison CSV states the run-out row the matrix states, its
 * composer is a service module, and a service module may not import `src/components` (AAP §0.18.1) — so
 * a wording whose only copy sat in the component layer could never be the export's, and a wording the
 * export wrote for itself would be that copy's twin and drift from it the first time either was edited.
 *
 * This module therefore re-exports the three names its importers already read from it —
 * `RUN_OUT_READING_TEXT`, `runOutReading` and `runOutStatement` — so SCR-03's projection, the comparison
 * matrix and the suites beside them keep compiling untouched, and so a surface asks the component layer
 * for the reading it always asked for while the words have one home. It states no rule of its own:
 * nothing in it decides a word, a boundary or a sentence.
 *
 * Rules served: P-6 (no typed figure, no typed record identifier), P-1 (a run-out is a computed figure;
 * the surface that draws it carries its §5.3 label, which is the caller's business rather than this
 * module's), B-1 and B-2 (no address, no request, no configuration), P-2 (no service, no seed record,
 * no domain import — the pair arrives as a value).
 */
export { RUN_OUT_READING_TEXT, runOutReading, runOutStatement } from '../types';
