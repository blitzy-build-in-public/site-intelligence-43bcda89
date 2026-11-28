/**
 * The comparison's words: the nine measure labels, the two axis labels, the two constraint states and
 * the four field labels inside one side effect, held once for the matrix and for the export of it.
 *
 * WHY THEY LIVE IN THIS FOLDER RATHER THAN IN THE MATRIX. The comparison matrix states these words and
 * the comparison CSV states the same words, because the checkpoint holds the export to the screen
 * ("export payload equals the screen"). A service module may not import a feature module (AAP §0.18.1
 * boundary discipline), so a label whose only copy sat in `comparison-matrix.tsx` could never be the
 * export's, and a label the export wrote for itself is a second copy that drifts the first time either
 * side is edited — which is what happened here: the matrix read `Orders on time` beside a count, and
 * the file read `0 of 2`, `pass` where the screen read `Pass`, and `kitsDelayed` where the screen read
 * `Kits deferred`. `CANNOT_COMPUTE_LABEL` in `./primitives` records the precedent, and its own TSDoc
 * states the reason: a word both the matrix and the CSV state lives in this folder, beside the
 * vocabulary the inputs fix, so neither surface can paraphrase it.
 *
 * WHAT FIXES EACH GROUP. Eight of the nine measure labels are AAP §0.12.4's SCR-04 row verbatim, in
 * the order that row lists them; the ninth names the run-out reading AAP §0.8 requires those screens to
 * render beside them. The column and set-aside labels, the two constraint states and the four
 * side-effect field labels are grouping vocabulary the plan leaves to the implementation. None of them
 * is a fixed specification string, none carries a figure, an amount, a date or a record identifier, and
 * no record sentence — a confidence reason, a constraint message, a blocking constraint — is
 * paraphrased here: those arrive with the record and are rendered as the record states them (rule P-6).
 *
 * Order is part of the contract of `COMPARISON_MEASURE_LABELS`: both surfaces read the measures in the
 * order it declares them, so a reader of the file meets the rows in the order the table shows them.
 */
import type { ConstraintCheck } from './solver';

/**
 * The nine measure rows, in the order both surfaces state them: AAP §0.12.4's SCR-04 row — units late,
 * maximum days late, orders on time, added cost, line idle days, confidence, constraint check, side
 * effects — with the run-out reading sitting immediately after the idle days it explains.
 *
 * The keys are the `Scenario` members the rows read, so a row and the field behind it cannot come
 * apart. The matrix renders a row per member and the CSV writes a record per member in this same
 * order; neither reorders them, because a reader comparing the file with the table aligns them row by
 * row.
 */
export const COMPARISON_MEASURE_LABELS = {
  unitsLate: 'Units late',
  maxDaysLate: 'Maximum days late',
  ordersOnTime: 'Orders on time',
  addedCost: 'Added cost',
  lineIdleDays: 'Line idle days',
  runOut: 'Run-out',
  confidence: 'Confidence',
  constraintCheck: 'Constraint check',
  sideEffects: 'Side effects',
} as const;

/**
 * The corner cell naming the row axis, so every row beneath it is read as one measure rather than as
 * another column of names.
 */
export const COMPARISON_MEASURE_COLUMN_LABEL = 'Measure';

/**
 * The heading over the options the set held back, and the opening of each such option's record in the
 * file: a reader meets the same two words whether they look at the table or at its export.
 */
export const COMPARISON_SET_ASIDE_LABEL = 'Set aside';

/**
 * The two states a `ConstraintCheck` reports, each stated as the word shown beside its icon.
 *
 * Typed as a record over the union rather than as a free object, so a third state fails to compile
 * until its word is decided here, and neither surface falls back to printing the member's own value —
 * which is how the file came to read `pass` where the table read `Pass`.
 */
export const CONSTRAINT_CHECK_LABELS: Record<ConstraintCheck, string> = {
  pass: 'Pass',
  fail: 'Fail',
};

/**
 * The field labels inside one side effect, so no bare number stands unexplained on either surface.
 *
 * The keys are the `SideEffect` members the labels name, which is what keeps the file from printing a
 * member's own name (`kitsDelayed`, `valueDeferredEur`) where the table states a reader's words.
 */
export const SIDE_EFFECT_FIELD_LABELS = {
  product: 'Product',
  kits: 'Kits deferred',
  value: 'Value deferred',
  days: 'Days deferred',
} as const;
