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
 * A pure function of that set. Every figure in the text is copied from it: the module adds no measure up,
 * takes none apart, rounds nothing and types no figure of its own (rule P-6). It reads no clock, no random
 * source and no module-level mutable state, so the same set yields the same bytes on every call. It
 * performs no I/O and opens no network or document API: it returns a payload, and the caller's browser
 * code turns that payload into a download (rule B-1).
 *
 * The text is RFC 4180. Fields are comma-separated; a field carrying a comma, a double quote or a line
 * break is wrapped in double quotes with every embedded quote doubled; `\n` is the only line separator,
 * so the output does not vary by platform.
 *
 * Labelling (rule P-1). The payload opens with a marker record, `simulated,true`, declaring the whole
 * comparison simulated — the flag the two sibling exports carry as `simulated: true` at their top
 * level — so the file states what it is before a reader meets the first figure and no download can
 * present a synthetic comparison as a real one. Separate from that marker, and inside the table, a
 * scenario column states whether its figures were computed in this session or shipped with the
 * dataset, and the recommended option's column carries the recommendation label. Those two label rows
 * are the fixed strings of `platform-specification.md` §5.3, read from `SIM_LABELS` rather than
 * retyped, so none of them can drift from the vocabulary the screens render.
 */
import { SIM_LABELS } from '../../types';
import type { ExportPayload, Scenario, ScenarioSet, SideEffect, SimLabel } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * Fixed strings
 * ------------------------------------------------------------------------------------------- */

/** The media type, fixed so a spreadsheet opens the payload as comma-separated text. */
const CSV_MEDIA_TYPE = 'text/csv;charset=utf-8';

/** The file name's stem, before the exception identifier and the extension are appended. */
const FILE_NAME_STEM = 'scenario-comparison';

/**
 * The marker record's key: `simulated`, the member the two sibling exports set at their top level, so
 * the three downloads name the flag the same way.
 */
const SIMULATED_MARKER_KEY = 'simulated';

/**
 * The marker record's value: the flag itself, `true`. It is set on every comparison this module
 * builds, so a reader opening the file meets the declaration before the first figure.
 */
const SIMULATED_MARKER_VALUE = 'true';

/**
 * The label a column whose figures shipped with the dataset carries: `SIM_LABELS[0]`, which reads
 * "Simulated data" (AAP §0.10 lists the seven labels in this order).
 */
const SEEDED_SOURCE_LABEL: SimLabel = SIM_LABELS[0];

/**
 * The label a column computed in this session carries: `SIM_LABELS[1]`, which reads
 * "Simulated calculation".
 */
const COMPUTED_SOURCE_LABEL: SimLabel = SIM_LABELS[1];

/**
 * The label the recommended option's column carries: `SIM_LABELS[2]`, which reads
 * "Simulated recommendation".
 */
const RECOMMENDED_LABEL: SimLabel = SIM_LABELS[2];

/* ---------------------------------------------------------------------------------------------
 * Renderers
 * ------------------------------------------------------------------------------------------- */

/**
 * The two-decimal renderer for the money measures and for line idle days.
 *
 * A CSV is read by a spreadsheet, so the field is machine-readable: dot decimal, no grouping separator,
 * exactly two decimals, and an explicit locale so an engine's default cannot change the separators. It
 * renders a value and never rounds one — the domain's `halfUp2` already fixed the scale, and rounding
 * belongs to `src/domain/solver/rounding.ts` alone (AAP §0.8).
 */
const TWO_DECIMALS = new Intl.NumberFormat('en-US', {
  useGrouping: false,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The renderer for the whole-number measures: units, days and order counts, as the record holds them. */
function renderCount(value: number): string {
  return String(value);
}

/** The renderer for record text: every entry verbatim and in order, joined into the one cell. */
function renderTexts(values: readonly string[]): string {
  return values.join('; ');
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
 * The `Constraint check` cell.
 *
 * An option inside its bounds shows the reading its own type carries. An option that breached a bound
 * shows the messages the solver recorded, one per breach, so the cell carries the reason and never a
 * blank or a partial figure — the sandbox path of AAP §0.12.3, where a breach comes back as a scenario
 * whose check fails rather than as a service failure.
 */
function renderConstraintCheck(scenario: Scenario): string {
  return scenario.constraintCheck === 'fail' && scenario.constraintMessages.length > 0
    ? renderTexts(scenario.constraintMessages)
    : scenario.constraintCheck;
}

/**
 * The `Side effects` cell: what an option costs a record other than the one it rescues.
 *
 * A side effect carries no descriptive sentence of its own, so each record renders as its own field
 * names against its own values, the money measure through the two-decimal renderer. The cell states what
 * the records hold: it invents no sentence and types no figure (rule P-6).
 */
function renderSideEffects(sideEffects: readonly SideEffect[]): string {
  return sideEffects
    .map((sideEffect) =>
      [
        `productId: ${sideEffect.productId}`,
        `kitsDelayed: ${renderCount(sideEffect.kitsDelayed)}`,
        `valueDeferredEur: ${TWO_DECIMALS.format(sideEffect.valueDeferredEur)}`,
        `daysDeferred: ${renderCount(sideEffect.daysDeferred)}`,
      ].join(', '),
    )
    .join('; ');
}

/**
 * The `Source label` cell: whether the column's figures were computed here or shipped with the data.
 *
 * `seeded` is the origin marking a scenario carried in `src/seed/exception-scenarios.ts`, so its column
 * is labelled as dataset content; `solver` and `sandbox` options were both measured in this session, so
 * they take the computed label (AAP §0.10, rule P-1).
 */
function sourceLabelOf(scenario: Scenario): SimLabel {
  return scenario.origin === 'seeded' ? SEEDED_SOURCE_LABEL : COMPUTED_SOURCE_LABEL;
}

/* ---------------------------------------------------------------------------------------------
 * The export
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the comparison of one exception's options as CSV text.
 *
 * The payload opens with the marker record, `simulated,true`, declaring the whole comparison
 * simulated before the measures begin — the same flag the two sibling exports carry at their top
 * level. One column per scenario follows, in the order the set holds them — the order is never sorted,
 * since a re-sort would rename the columns between two exports of the same set — and one row per
 * measure, in the order the comparison matrix reads: units late, maximum days late, orders on time,
 * added cost, line idle days, confidence, constraint check and side effects. Two label rows then
 * follow the measures, stating each column's source label and marking the recommended option, which
 * is the column whose identifier the set names.
 *
 * @param set - The options, recommendation and trade-off the service returned for the exception.
 * @returns The payload: the file name, the media type and the CSV text, the marker record leading it.
 */
export function buildScenarioComparisonCsv(set: ScenarioSet): ExportPayload {
  const { scenarios } = set;

  /** The `Recommended` cell: the label on the option the set recommends, empty on every other. */
  const recommendedCell = (scenario: Scenario): string =>
    scenario.id === set.recommendedId ? RECOMMENDED_LABEL : '';

  const lines: string[] = [
    csvRow([SIMULATED_MARKER_KEY, SIMULATED_MARKER_VALUE]),
    csvRow(['Measure', ...scenarios.map((scenario) => scenario.name)]),
    csvRow(['Units late', ...scenarios.map((scenario) => renderCount(scenario.unitsLate))]),
    csvRow([
      'Maximum days late',
      ...scenarios.map((scenario) => renderCount(scenario.maxDaysLate)),
    ]),
    csvRow([
      'Orders on time',
      ...scenarios.map(
        (scenario) =>
          `${renderCount(scenario.ordersOnTime)} of ${renderCount(scenario.ordersTotal)}`,
      ),
    ]),
    csvRow([
      'Added cost',
      ...scenarios.map((scenario) => TWO_DECIMALS.format(scenario.addedCostEur)),
    ]),
    csvRow([
      'Line idle days',
      ...scenarios.map((scenario) => TWO_DECIMALS.format(scenario.lineIdleDays)),
    ]),
    csvRow(['Confidence', ...scenarios.map(renderConfidence)]),
    csvRow(['Constraint check', ...scenarios.map(renderConstraintCheck)]),
    csvRow([
      'Side effects',
      ...scenarios.map((scenario) => renderSideEffects(scenario.sideEffects)),
    ]),
    csvRow(['Source label', ...scenarios.map(sourceLabelOf)]),
    csvRow([
      'Recommended',
      ...scenarios.map((scenario) => recommendedCell(scenario)),
    ]),
  ];

  return {
    filename: `${FILE_NAME_STEM}-${set.exceptionId}.csv`,
    mediaType: CSV_MEDIA_TYPE,
    content: `${lines.join('\n')}\n`,
  };
}
