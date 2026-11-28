/**
 * The scenario comparison download: the CSV text behind SCR-04's "export the comparison as CSV",
 * composed once for both adapters of the service port.
 *
 * WHY IT IS HERE RATHER THAN IN THE ADAPTER THAT EXPORTS IT. AAP 0.12.3 requires both adapters to share
 * "the observable behaviour that makes the swap invisible", and the file is part of that behaviour: the
 * CSV a reader downloads must not change because the application was bound to the other adapter. AAP
 * 0.12.1's "Exports" row keeps the assemblers in `src/services/mock/exports/`, so those modules stay
 * where the plan puts them and this module holds the composition they call. The comparison is a pure
 * function of the `ScenarioSet` the service already returned, which is what lets an adapter with no
 * records of its own build the same bytes from its own scenario-set read (AAP 0.6.2, rule P-2).
 *
 * THE FILE REPRODUCES THE SCREEN, CELL FOR CELL. The checkpoint holds an export payload to the screen it
 * exports, and `src/features/scr-04-scenario-comparison/comparison-matrix.tsx` is that screen, so every
 * word and every rendering below is the matrix's own rather than a shape invented here:
 *
 * - The nine measure rows are `COMPARISON_MEASURE_LABELS`, in the order the matrix states them, and each
 *   cell is the text the matrix prints for that measure: the record's own number for units late, maximum
 *   days late, orders on time and line idle days; `formatMoney` for added cost and for the value inside a
 *   side effect; `runOutReading` for the Run-out row AAP §0.8 requires; the level and its reason together
 *   for confidence; `CONSTRAINT_CHECK_LABELS` followed by the record's own messages for the constraint
 *   check; and `SIDE_EFFECT_FIELD_LABELS` with the money among them for side effects.
 * - The header record names each column the way the matrix's column header does: the option's name, its
 *   SCN identifier, the §5.3 label its origin carries, and — on the column `recommendedId` names — the
 *   recommendation label.
 * - The options the set held back follow the measures as one record each, opened with
 *   `COMPARISON_SET_ASIDE_LABEL`, which is the list the matrix renders beneath its table.
 *
 * WHICH MODULE OWNS EACH WORD AND EACH RENDERING, AND WHY NONE IS RESTATED HERE. The words come from
 * `src/types/comparison-text.ts` and from `SIM_LABELS`, the money from `formatMoney` in
 * `src/types/figure-text.ts`, and the run-out reading from `runOutReading` in that same module. Those two
 * modules sit in `src/types` rather than in the component layer because a service module may not import
 * `src/components` or a feature module (AAP §0.18.1 boundary discipline), and a label or a rendering the
 * export wrote for itself is a second copy of the matrix's that drifts the first time either side is
 * edited. `CANNOT_COMPUTE_LABEL` in `src/types/primitives.ts` records the same precedent, and the file
 * this module replaced is the proof of the drift: it printed `18600.00` where the matrix printed
 * `18.600 EUR`, `0 of 2` where the matrix printed `0`, `pass` where the matrix printed `Pass`, and
 * `kitsDelayed` where the matrix said `Kits deferred`, and it carried no Run-out row and no record of the
 * options the set held back.
 *
 * A pure function of that set. Every figure in the text is copied from it: the module adds no measure up,
 * takes none apart, rounds nothing and types no figure of its own (rule P-6). It reads no clock, no random
 * source and no module-level mutable state, so the same set yields the same bytes on every call. It
 * performs no I/O and opens no network or document API: it returns a payload, and the caller's browser
 * code turns that payload into a download (rule B-1).
 *
 * The text is RFC 4180. Fields are comma-separated; a field carrying a comma, a double quote or a line
 * break is wrapped in double quotes with every embedded quote doubled; `\n` is the only line separator,
 * so the output does not vary by platform. Every record carries the same field count — the row label plus
 * one cell per option column — so the file has one width from its first record to its last and a strict
 * reader never meets a record it cannot align with the header. A rendered cell may hold a comma of its
 * own (the `, ` between two side-effect fields, a sentence a record states), which is exactly the case
 * that quoting exists for: the quoting hides the separator and the record's width never moves.
 *
 * A column whose option could not be measured states so rather than showing a figure. When a scenario's
 * constraint check fails the solver has measured nothing, so its measure members carry the neutral zeros
 * a `SolverResult` is built with; the file writes `Cannot compute` in the eight measure cells of that
 * column that state a figure and keeps the reason in the constraint-check cell, exactly as the comparison
 * matrix does, so no zero, no `0 of 0` and no blank stands where the measurement was refused (AAP §0.8,
 * rule P-6).
 *
 * Labelling (rule P-1). The payload opens with a marker record declaring the whole comparison simulated —
 * the flag the two sibling exports carry as `simulated: true` at their top level — and it names itself
 * with the §5.3 label `Simulated data` rather than with an unlabelled key, so the declaration is labelled
 * the way every other simulated element of the interface is. The marker is a record of the table's own
 * shape: the label in the row-label cell, then the flag `true` in every option column's cell, so the first
 * record is as wide as the rest and the declaration says which columns it covers. A set with no options
 * has no column to carry a flag, so its single cell reads `Simulated data=true` and the statement survives
 * in a file of one column. The origin label and the recommendation label each column carries are the same
 * §5.3 strings, read from `SIM_LABELS` at the position specification §5.3 gives them rather than retyped,
 * so none of them can drift from the vocabulary the screens render.
 */
import {
  CANNOT_COMPUTE_LABEL,
  COMPARISON_MEASURE_COLUMN_LABEL,
  COMPARISON_MEASURE_LABELS,
  COMPARISON_SET_ASIDE_LABEL,
  CONSTRAINT_CHECK_LABELS,
  SIDE_EFFECT_FIELD_LABELS,
  SIM_LABELS,
  formatMoney,
  runOutReading,
} from '../../types';
import type {
  ExportPayload,
  Rejected,
  Scenario,
  ScenarioId,
  ScenarioOrigin,
  ScenarioSet,
  SideEffect,
  SimLabel,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * Fixed strings
 * ------------------------------------------------------------------------------------------- */

/** The media type, fixed so a spreadsheet opens the payload as comma-separated text. */
const CSV_MEDIA_TYPE = 'text/csv;charset=utf-8';

/** The file name's stem, before the exception identifier and the extension are appended. */
const FILE_NAME_STEM = 'scenario-comparison';

/**
 * The marker record's row label: `SIM_LABELS[0]`, which reads "Simulated data".
 *
 * The two sibling exports carry the flag as `simulated: true` at their top level; this file states the
 * same declaration inside a record of the table's own shape, and names it with the §5.3 label every
 * other simulated element of the interface carries rather than with a bare key a reader would have to
 * interpret. It sits in the row-label cell every other record keeps its row label in, which is what
 * makes the marker a record of the table's own shape (rule P-1).
 */
const SIMULATED_MARKER_LABEL: SimLabel = SIM_LABELS[0];

/**
 * The marker record's value: the flag itself, `true`, in every option column's cell of that record.
 * It is set on every comparison this module builds, so a reader opening the file meets the
 * declaration before the first figure, and it is stated once per column so the marker is as wide as
 * the table below it.
 */
const SIMULATED_MARKER_VALUE = 'true';

/**
 * What separates the entries of one cell's list: two constraint messages, or two side effects.
 *
 * The matrix states a record's messages as a list and its side effects as a list, and it puts them one
 * below the other rather than punctuating them; a cell that has to hold the list on one line states the
 * same separation with one separator, so the file reads as the table does.
 */
const CELL_LIST_SEPARATOR = '; ';

/**
 * What separates the fields of one side effect inside its cell, where the matrix puts one definition per
 * line. It states the fields in the record's own order, each under its label.
 */
const SIDE_EFFECT_FIELD_SEPARATOR = ', ';

/**
 * The §5.3 label each `ScenarioOrigin` carries, and the only place this module chooses one.
 *
 * The comparison matrix holds the same rule for its column headers: an option shipped with the dataset
 * is dataset content and carries `Simulated data`, while an option the solver measured in this session
 * (`solver`) or the sandbox recomputed from edited levers (`sandbox`) carries `Simulated calculation`.
 * Every member is read from `SIM_LABELS` at the position specification §5.3 gives it and typed
 * `SimLabel`, so no paraphrase of either can compile. The map is exhaustive over the union and has no
 * index signature, so a fourth origin added to `ScenarioOrigin` fails to compile until its label is
 * decided here rather than defaulting to whichever entry happened to be listed first (rule P-1, AAP
 * §0.10).
 */
const ORIGIN_SIM_LABEL: Record<ScenarioOrigin, SimLabel> = {
  solver: SIM_LABELS[1],
  seeded: SIM_LABELS[0],
  sandbox: SIM_LABELS[1],
};

/* ---------------------------------------------------------------------------------------------
 * Renderers
 * ------------------------------------------------------------------------------------------- */

/** The renderer for the whole-number measures: units, days and order counts, as the record holds them. */
function renderCount(value: number): string {
  return String(value);
}

/**
 * One CSV field, quoted only where RFC 4180 requires it: a field carrying a comma, a double quote, a
 * carriage return or a line break is wrapped in double quotes with every embedded quote doubled, and
 * every other field is returned unchanged. Applied to every field of every row, labels included, so a
 * record's own text can never shift the column count.
 */
function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** One CSV record: every field escaped and comma-separated, carrying no line break of its own. */
function csvRow(fields: readonly string[]): string {
  return fields.map(csvField).join(',');
}

/* ---------------------------------------------------------------------------------------------
 * Cells whose value is more than one record field
 * ------------------------------------------------------------------------------------------- */

/** The `Confidence` cell: the level the record states, then the reason it carries for that level. */
function renderConfidence(scenario: Scenario): string {
  return `${scenario.confidence.level} — ${scenario.confidence.reason}`;
}

/**
 * The `Constraint check` cell: the word the matrix shows beside the state's icon, then the record's own
 * messages where it recorded any.
 *
 * An option inside its bounds states `Pass`. An option that breached a bound states `Fail` and then, in
 * the record's own words, one message per breach — the sandbox path of AAP §0.12.3, where a breach comes
 * back as a scenario whose check fails rather than as a service failure. Printing the member's value
 * instead of the label is what made the file this module replaced read `pass` where the screen read
 * `Pass`, so the word is read from `CONSTRAINT_CHECK_LABELS`, the record the matrix reads too (rule P-6,
 * AAP §0.8).
 */
function renderConstraintCheck(scenario: Scenario): string {
  const state = CONSTRAINT_CHECK_LABELS[scenario.constraintCheck];

  return scenario.constraintMessages.length > 0
    ? `${state} — ${scenario.constraintMessages.join(CELL_LIST_SEPARATOR)}`
    : state;
}

/**
 * The `Side effects` cell: what an option costs a record other than the one it rescues.
 *
 * Each side effect renders as the four fields the matrix's definition lists state, under the labels
 * `SIDE_EFFECT_FIELD_LABELS` holds and with the money through the interface's one formatter, so a reader
 * of the file meets `Product: …`, `Kits deferred: …`, `Value deferred: …` and `Days deferred: …` rather
 * than the member names the record happens to use. Several side effects are separated by the list
 * separator; an option that carries none leaves the cell empty, as the matrix leaves it.
 */
function renderSideEffects(sideEffects: readonly SideEffect[]): string {
  return sideEffects
    .map((sideEffect) =>
      [
        `${SIDE_EFFECT_FIELD_LABELS.product}: ${sideEffect.productId}`,
        `${SIDE_EFFECT_FIELD_LABELS.kits}: ${renderCount(sideEffect.kitsDelayed)}`,
        `${SIDE_EFFECT_FIELD_LABELS.value}: ${formatMoney(sideEffect.valueDeferredEur)}`,
        `${SIDE_EFFECT_FIELD_LABELS.days}: ${renderCount(sideEffect.daysDeferred)}`,
      ].join(SIDE_EFFECT_FIELD_SEPARATOR),
    )
    .join(CELL_LIST_SEPARATOR);
}

/**
 * The header cell above one option's column: the option's name, its identifier and the label its origin
 * carries, with the recommendation label on the column the set recommends.
 *
 * The matrix's column header states exactly these four things — the name, the identifier the rest of the
 * interface quotes, the origin's §5.3 label, and the §5.3 recommendation label on the recommended column
 * — so this record tells a reader of the file which option each column belongs to, where the option came
 * from, and which one the service recommended. A name alone left all three out, and the two label rows the
 * file this module replaced wrote instead were rows the table does not have.
 */
function renderOptionHeader(scenario: Scenario, recommendedId: ScenarioId | undefined): string {
  const column = `${scenario.name} (${scenario.id}) — ${ORIGIN_SIM_LABEL[scenario.origin]}`;

  return scenario.id === recommendedId ? `${column} — ${SIM_LABELS[2]}` : column;
}

/* ---------------------------------------------------------------------------------------------
 * The export
 * ------------------------------------------------------------------------------------------- */

/**
 * The marker record: the simulated declaration, labelled and stated in a record as wide as the table
 * below it.
 *
 * RFC 4180 gives a file one width, so this record carries the row label plus one cell per option
 * column, like every other. The label sits where the measure names sit and the flag fills each option
 * column's cell, which keeps that width and says what the declaration covers: every column of the
 * comparison below it. A set with no options has no column to carry a flag, so the file's one cell
 * carries the label together with its value, `Simulated data=true`; the flag never leaves the file (rule
 * P-1) and the record still has the width of every other record in that file.
 *
 * @param scenarios - The options the comparison holds, one column each.
 * @returns The marker record, ready to lead the file.
 */
function renderMarkerRecord(scenarios: readonly Scenario[]): string {
  return scenarios.length === 0
    ? csvRow([`${SIMULATED_MARKER_LABEL}=${SIMULATED_MARKER_VALUE}`])
    : csvRow([SIMULATED_MARKER_LABEL, ...scenarios.map(() => SIMULATED_MARKER_VALUE)]);
}

/**
 * One record for an option the set held back: the heading the matrix gives that list, the option's
 * identifier, and the constraint that blocked it.
 *
 * The matrix renders this list beneath its table, one entry per record the set holds back, and the file
 * states the same entry in the row-label cell with an empty cell under every option column, so the record
 * keeps the table's width. A set with no option has no column to fill, and that one field is then the
 * whole record.
 *
 * @param rejected - The option set aside and the constraint that blocked it, as the set states them.
 * @param scenarios - The options the comparison holds, one empty cell each.
 * @returns The record, ready to follow the measures.
 */
function renderSetAsideRecord(rejected: Rejected, scenarios: readonly Scenario[]): string {
  return csvRow([
    `${COMPARISON_SET_ASIDE_LABEL}: ${rejected.scenarioId} — ${rejected.blockingConstraint}`,
    ...scenarios.map(() => ''),
  ]);
}

/**
 * Builds the comparison of one exception's options as CSV text.
 *
 * The payload opens with the marker record — the §5.3 declaration in the row-label cell and the flag in
 * every option column's cell — then the header record names each column as the matrix's header does,
 * then the nine measure rows follow in the matrix's order, then one record per option the set held back.
 * The columns keep the order the set holds them in: the order is never sorted, since a re-sort would
 * rename the columns between two exports of the same set. A column whose option could not be measured
 * states `Cannot compute` in the eight measure cells that state a figure, the constraint-check row alone
 * carrying the record's own reason, so the file never reports a refused measurement as a zero (AAP §0.8,
 * rule P-6).
 *
 * @param set - The options, recommendation and trade-off the service returned for the exception.
 * @returns The payload: the file name, the media type and the CSV text, the marker record leading it.
 */
export function buildScenarioComparisonCsv(set: ScenarioSet): ExportPayload {
  const { scenarios } = set;

  /**
   * The measure cells of one row: each option's own rendered cell, or `Cannot compute` where the solver
   * refused to measure it.
   *
   * The gate is the comparison matrix's own rule, applied to the eight rows that state a figure: a
   * scenario whose `constraintCheck` is `'fail'` carries no measurement, so the neutral zeros its members
   * hold are replaced by the fixed words instead of being reported as measured values (AAP §0.8, rule
   * P-6). The constraint-check row is rendered from the record directly, because that row is where the
   * reason for the refusal is stated.
   */
  const measureCells = (render: (scenario: Scenario) => string): string[] =>
    scenarios.map((scenario) =>
      scenario.constraintCheck === 'fail' ? CANNOT_COMPUTE_LABEL : render(scenario),
    );

  const lines: string[] = [
    renderMarkerRecord(scenarios),
    csvRow([
      COMPARISON_MEASURE_COLUMN_LABEL,
      ...scenarios.map((scenario) => renderOptionHeader(scenario, set.recommendedId)),
    ]),
    csvRow([
      COMPARISON_MEASURE_LABELS.unitsLate,
      ...measureCells((scenario) => renderCount(scenario.unitsLate)),
    ]),
    csvRow([
      COMPARISON_MEASURE_LABELS.maxDaysLate,
      ...measureCells((scenario) => renderCount(scenario.maxDaysLate)),
    ]),
    csvRow([
      COMPARISON_MEASURE_LABELS.ordersOnTime,
      ...measureCells((scenario) => renderCount(scenario.ordersOnTime)),
    ]),
    csvRow([
      COMPARISON_MEASURE_LABELS.addedCost,
      ...measureCells((scenario) => formatMoney(scenario.addedCostEur)),
    ]),
    csvRow([
      COMPARISON_MEASURE_LABELS.lineIdleDays,
      ...measureCells((scenario) => renderCount(scenario.lineIdleDays)),
    ]),
    csvRow([
      COMPARISON_MEASURE_LABELS.runOut,
      ...measureCells((scenario) => runOutReading(scenario.runOut)),
    ]),
    csvRow([COMPARISON_MEASURE_LABELS.confidence, ...measureCells(renderConfidence)]),
    csvRow([COMPARISON_MEASURE_LABELS.constraintCheck, ...scenarios.map(renderConstraintCheck)]),
    csvRow([
      COMPARISON_MEASURE_LABELS.sideEffects,
      ...measureCells((scenario) => renderSideEffects(scenario.sideEffects)),
    ]),
    ...set.rejected.map((rejected) => renderSetAsideRecord(rejected, scenarios)),
  ];

  return {
    filename: `${FILE_NAME_STEM}-${set.exceptionId}.csv`,
    mediaType: CSV_MEDIA_TYPE,
    content: `${lines.join('\n')}\n`,
  };
}
