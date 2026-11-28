// @vitest-environment node

/**
 * What the comparison CSV says, record by record: the screen it exports, restated in the file's own text.
 *
 * WHY THIS SUITE EXISTS. `src/services/mock/mock-backend.test.ts` asserts that the adapter's payload
 * equals `buildScenarioComparisonCsv`'s payload for the same set — the composer compared against itself —
 * so nothing there reads the text the file holds. Two defects survived every gate that way: the marker
 * record was two fields wide in a file whose other records carry `1 + n`, and a column whose constraint
 * check failed reported the neutral zeros of an unmeasured option as measured figures. A later review
 * found the larger defect this suite now exists for: the file lost the presentation and the coverage the
 * matrix has — bare machine decimals where the table printed a currency, `0 of 2` where it printed `0`,
 * the lowercase member `pass` where it printed `Pass`, member names where it printed field labels, no
 * Run-out row, no set-aside information, no option identifiers in the header, and an unlabelled first row.
 *
 * WHAT IT ASSERTS, AND WHAT IT LEAVES ALONE. The record count and the constant width for a two-option set,
 * a zero-option set and a zero-option set that still holds an option back; the marker record of each; the
 * header record's column label, names, identifiers, origin labels and recommendation label; every measure
 * cell against the module that owns its rendering, so the file's cell and the matrix's cell are asserted
 * to be one text rather than two that merely look alike; the nine row labels in their owner's order; the
 * set-aside record beneath the measures; the eight `Cannot compute` cells of a refused column and the
 * absence of any zero, `0.00` or `0 of 0` there; and RFC 4180 quoting of a field carrying a comma and a
 * double quote.
 *
 * IT RESTATES NO WORD AND NO FORMATTER. The measure labels, the column and set-aside labels, the constraint
 * words, the side-effect field names, the money formatter, the run-out reading and the simulation labels
 * are all imported from their owners — the two modules of `src/types` that the matrix and this composer
 * share — so a reworded label or a reformatted amount reaches this suite and both surfaces at once, and
 * this suite cannot pass while they disagree. The file name and the media type are the builder's, and no
 * case asserts them.
 *
 * THE FIXTURES ARE TYPED, NOT SEEDED. Every member of `Scenario` is filled here, because the builder is a
 * pure function of the set it is handed and needs a set rather than the dataset. Nothing is imported from
 * `src/seed` (rule P-2): the identifiers and the messages below are the fixtures' own.
 *
 * WHY THE NODE ENVIRONMENT, ON THE FIRST LINE ABOVE. Nothing here renders. The builder is a pure function
 * returning a string, so the suite needs no DOM, no service and no network (rule B-1).
 */

import { describe, expect, it } from 'vitest';

import { buildScenarioComparisonCsv } from './scenario-csv';
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
import type { Rejected, Scenario, ScenarioOrigin, ScenarioSet, SideEffect } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The fixtures
 * ------------------------------------------------------------------------------------------- */

/** The exception the fixtures belong to: a value of the fixtures' own, imported from nothing. */
const EXCEPTION_ID = 'EXC-2026-9001';

/** The sentence the fixtures' confidence carries, so the cell states a reason as a record does. */
const CONFIDENCE_REASON = 'the fixture states the confidence its options carry';

/** The two bounds the refused fixture breached, one message per breach as the solver records them. */
const REFUSAL_MESSAGES = [
  'The fixture air lever exceeds the bound it is held to.',
  'The fixture transfer lever is not on its step.',
] as const;

/**
 * The side effect the measured fixture carries, so a case can assert each of its fields by name rather
 * than reading it back out of an array.
 */
const SIDE_EFFECT: SideEffect = {
  productId: 'PRD-FIXTURE',
  kitsDelayed: 90,
  valueDeferredEur: 1080.5,
  daysDeferred: 2,
};

/** The constraint the held-back fixture breached, as the `Rejected` record states it. */
const BLOCKING_CONSTRAINT = 'The fixture option cannot be measured inside its bound';

/**
 * One response option, every member of `Scenario` filled.
 *
 * A refused option carries the neutral values a `SolverResult` is built with — zeros in every
 * measure, no side effect, no write-back and no lever moved — because that is what the solver
 * returns for an option it would not measure, and it is exactly what must not reach the file as a
 * figure. A measured option carries figures of its own.
 *
 * @param id - The option's identifier.
 * @param name - The name the file states over its column.
 * @param refusal - One message per bound the option breached; omitted, the option measures cleanly.
 * @param origin - How the option came to exist, which decides the label its column carries.
 * @returns The scenario, typed so a member added to `Scenario` later fails this file to compile.
 */
function scenarioOf(
  id: string,
  name: string,
  refusal: readonly string[] = [],
  origin: ScenarioOrigin = 'solver',
): Scenario {
  const refused = refusal.length > 0;

  return {
    id,
    exceptionId: EXCEPTION_ID,
    name,
    origin,
    unitsLate: refused ? 0 : 12,
    maxDaysLate: refused ? 0 : 3,
    ordersOnTime: refused ? 0 : 1,
    ordersTotal: refused ? 0 : 2,
    addedCostEur: refused ? 0 : 4500.5,
    lineIdleDays: refused ? 0 : 2.5,
    revenueDelayedEur: refused ? 0 : 9300,
    runOut: { day: 4, fractionOfDay: 0.5 },
    dailyClosingStock: [{ date: '2026-12-04', units: 120 }],
    orders: [{ orderId: 'CO-900001', unitsLate: refused ? 0 : 12, daysLate: refused ? 0 : 3 }],
    constraintCheck: refused ? 'fail' : 'pass',
    constraintMessages: [...refusal],
    sideEffects: refused ? [] : [SIDE_EFFECT],
    writeBacks: refused
      ? []
      : [
          {
            sequence: 1,
            system: 'erp',
            recordRef: 'PO-90000001',
            description: 'the fixture states the step its option would write',
            state: 'pending',
          },
        ],
    levers: refused ? { airSets: 0, transferSets: 0 } : { airSets: 40, transferSets: 90 },
    confidence: { level: 'medium', reason: CONFIDENCE_REASON },
  };
}

/** The option that measures cleanly, and the recommendation of every set the cases recommend one in. */
const MEASURED = scenarioOf('SCN-9001-a', 'Fixture baseline');

/** The option the solver refused to measure, with the reason it recorded for the refusal. */
const REFUSED = scenarioOf('SCN-9001-b', 'Fixture breach', REFUSAL_MESSAGES);

/** The option shipped with the dataset, whose column is the one an origin label distinguishes. */
const SEEDED = scenarioOf('SCN-9001-d', 'Fixture seeded option', [], 'seeded');

/** An option the set held back, with the constraint that blocked it. */
const REJECTED: Rejected = { scenarioId: 'SCN-9001-c', blockingConstraint: BLOCKING_CONSTRAINT };

/**
 * One set the width and marker cases run over: what it holds, and the marker record its file must
 * lead with.
 *
 * Two options cover the ordinary file; no options cover the set an exception with no response option
 * produces — the case the builder has to keep the declaration inside a single column for; and no
 * options with one option held back covers the file whose only record past the measures is a single
 * set-aside record one field wide.
 */
const SET_CASES: readonly {
  readonly label: string;
  readonly scenarios: readonly Scenario[];
  readonly rejected: readonly Rejected[];
  readonly marker: readonly string[];
}[] = [
  {
    label: 'two options',
    scenarios: [MEASURED, REFUSED],
    rejected: [],
    marker: [SIM_LABELS[0], 'true', 'true'],
  },
  {
    label: 'no options',
    scenarios: [],
    rejected: [],
    marker: [`${SIM_LABELS[0]}=true`],
  },
  {
    label: 'no options and one held back',
    scenarios: [],
    rejected: [REJECTED],
    marker: [`${SIM_LABELS[0]}=true`],
  },
];

/**
 * Builds the set the builder is asked for, with the recommendation and the held-back options the case
 * needs.
 *
 * @param scenarios - The options the set holds, one column each.
 * @param recommendedId - The option the set recommends; omitted, the set recommends none.
 * @param rejected - The options the set held back; omitted, it held none back.
 * @returns The set, carrying the rule and the trade-off a record states.
 */
function setOf(
  scenarios: readonly Scenario[],
  recommendedId?: string,
  rejected: readonly Rejected[] = [],
): ScenarioSet {
  return {
    exceptionId: EXCEPTION_ID,
    scenarios: [...scenarios],
    ...(recommendedId === undefined ? {} : { recommendedId }),
    recommendationRule: 'the fixture states the rule its recommendation applied',
    tradeOff: 'the fixture states the trade-off its recommendation makes',
    rejected: [...rejected],
  };
}

/* ---------------------------------------------------------------------------------------------
 * Reading the file
 * ------------------------------------------------------------------------------------------- */

/**
 * The record the marker occupies: the first of every file this module builds, whatever the set holds.
 */
const MARKER_RECORD = 0;

/** The record the column headers occupy: the second of every file, after the marker. */
const HEADER_RECORD = 1;

/** The record the first measure occupies: after the marker and the header. */
const MEASURE_RECORD_START = 2;

/**
 * How many records the measures take: one per label the owner declares, so the count follows
 * `COMPARISON_MEASURE_LABELS` rather than a number written here.
 */
const MEASURE_RECORD_COUNT = Object.keys(COMPARISON_MEASURE_LABELS).length;

/**
 * The record the first held-back option occupies: the measures end where the set-aside list begins, and a
 * set that held nothing back ends its file there.
 */
const SET_ASIDE_RECORD_START = MEASURE_RECORD_START + MEASURE_RECORD_COUNT;

/**
 * The record one measure occupies, located by its key in the owner's own order.
 *
 * Derived rather than listed, so a case names the row it means without restating where that row sits: the
 * order belongs to `COMPARISON_MEASURE_LABELS`, the case about the order asserts the file against it, and
 * every other case reads the row its key names.
 *
 * @param key - The measure, as `COMPARISON_MEASURE_LABELS` keys it.
 * @returns The zero-based index of that measure's record in the file.
 */
function measureRecordIndexOf(key: keyof typeof COMPARISON_MEASURE_LABELS): number {
  return MEASURE_RECORD_START + Object.keys(COMPARISON_MEASURE_LABELS).indexOf(key);
}

/** The first option column of every set the cases build with two options. */
const FIRST_OPTION_COLUMN = 1;

/** The second option column of every set the cases build with two options. */
const SECOND_OPTION_COLUMN = 2;

/**
 * The records of one payload, each already split into its fields.
 *
 * The walk is RFC 4180's: a field wrapped in double quotes may carry the separator and a line break,
 * and a doubled quote inside one is a single quote. The payload ends with its last record's
 * terminator, which closes that record rather than opening an empty one.
 *
 * @param content - The CSV text a build returned.
 * @returns One field list per record, in the order the file states them.
 */
function recordsOf(content: string): string[][] {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content.charAt(index);

    if (quoted) {
      if (character !== '"') {
        field += character;
      } else if (content.charAt(index + 1) === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = false;
      }

      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      fields.push(field);
      field = '';
    } else if (character === '\n') {
      fields.push(field);
      records.push(fields);
      fields = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (field !== '' || fields.length > 0) {
    fields.push(field);
    records.push(fields);
  }

  return records;
}

/**
 * One cell of one record.
 *
 * @param records - The records a case parsed.
 * @param recordIndex - Which record, by the position constants above.
 * @param column - Which column: nought is the row label, one and upwards are the option columns.
 * @returns The cell's text, empty when the record or the column is absent.
 */
function cellOf(records: readonly string[][], recordIndex: number, column: number): string {
  return records[recordIndex]?.[column] ?? '';
}

/* ---------------------------------------------------------------------------------------------
 * The field count of every record
 * ------------------------------------------------------------------------------------------- */

describe('the field count of a comparison file', () => {
  it.each(SET_CASES)(
    'gives every record the table width for a set of $label, the marker included',
    ({ scenarios, rejected }) => {
      const records = recordsOf(
        buildScenarioComparisonCsv(setOf(scenarios, undefined, rejected)).content,
      );

      expect(records).toHaveLength(SET_ASIDE_RECORD_START + rejected.length);

      const widths = new Set(records.map((fields) => fields.length));

      expect([...widths]).toStrictEqual([scenarios.length + 1]);
    },
  );

  it.each(SET_CASES)(
    'states the simulated declaration, labelled, in the record leading a file of $label',
    ({ scenarios, rejected, marker }) => {
      const records = recordsOf(
        buildScenarioComparisonCsv(setOf(scenarios, undefined, rejected)).content,
      );

      expect(records[MARKER_RECORD]).toStrictEqual([...marker]);
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * The record that names the columns
 * ------------------------------------------------------------------------------------------- */

describe('the record that names the option columns', () => {
  /** The file of one computed option and one seeded option, recommending the computed one. */
  const records = recordsOf(
    buildScenarioComparisonCsv(setOf([MEASURED, SEEDED], MEASURED.id)).content,
  );

  it('names the row axis with the label the matrix uses', () => {
    expect(cellOf(records, HEADER_RECORD, 0)).toBe(COMPARISON_MEASURE_COLUMN_LABEL);
  });

  it('carries each option name, its identifier and the label its origin earns', () => {
    expect(cellOf(records, HEADER_RECORD, FIRST_OPTION_COLUMN)).toBe(
      `${MEASURED.name} (${MEASURED.id}) — ${SIM_LABELS[1]} — ${SIM_LABELS[2]}`,
    );
    expect(cellOf(records, HEADER_RECORD, SECOND_OPTION_COLUMN)).toBe(
      `${SEEDED.name} (${SEEDED.id}) — ${SIM_LABELS[0]}`,
    );
  });

  it('carries the recommendation label on the recommended column alone', () => {
    expect(cellOf(records, HEADER_RECORD, FIRST_OPTION_COLUMN)).toContain(SIM_LABELS[2]);
    expect(cellOf(records, HEADER_RECORD, SECOND_OPTION_COLUMN)).not.toContain(SIM_LABELS[2]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The nine measure rows
 * ------------------------------------------------------------------------------------------- */

describe('the nine measure rows', () => {
  /** The file one measured option produces, parsed once for the cases below. */
  const records = recordsOf(buildScenarioComparisonCsv(setOf([MEASURED], MEASURED.id)).content);

  it('states the nine labels in the order their owner declares them', () => {
    const labels = records
      .slice(MEASURE_RECORD_START, SET_ASIDE_RECORD_START)
      .map((fields) => fields[0] ?? '');

    expect(labels).toStrictEqual([...Object.values(COMPARISON_MEASURE_LABELS)]);
  });

  it('prints the counts as the record states them', () => {
    expect(cellOf(records, measureRecordIndexOf('unitsLate'), FIRST_OPTION_COLUMN)).toBe(
      String(MEASURED.unitsLate),
    );
    expect(cellOf(records, measureRecordIndexOf('maxDaysLate'), FIRST_OPTION_COLUMN)).toBe(
      String(MEASURED.maxDaysLate),
    );
    expect(cellOf(records, measureRecordIndexOf('lineIdleDays'), FIRST_OPTION_COLUMN)).toBe(
      String(MEASURED.lineIdleDays),
    );
  });

  it('states orders on time as the count alone, with no total beside it', () => {
    const cell = cellOf(records, measureRecordIndexOf('ordersOnTime'), FIRST_OPTION_COLUMN);

    expect(cell).toBe(String(MEASURED.ordersOnTime));
    expect(cell).not.toContain(' of ');
  });

  it('states the added cost through the one money formatter, as the matrix does', () => {
    expect(cellOf(records, measureRecordIndexOf('addedCost'), FIRST_OPTION_COLUMN)).toBe(
      formatMoney(MEASURED.addedCostEur),
    );
  });

  it('carries the run-out row, rendered by the module that owns the reading', () => {
    expect(cellOf(records, measureRecordIndexOf('runOut'), FIRST_OPTION_COLUMN)).toBe(
      runOutReading(MEASURED.runOut),
    );
  });

  it('states the confidence level and its reason together', () => {
    expect(cellOf(records, measureRecordIndexOf('confidence'), FIRST_OPTION_COLUMN)).toBe(
      `${MEASURED.confidence.level} — ${MEASURED.confidence.reason}`,
    );
  });

  it('states a passing constraint check in the word the matrix shows', () => {
    expect(cellOf(records, measureRecordIndexOf('constraintCheck'), FIRST_OPTION_COLUMN)).toBe(
      CONSTRAINT_CHECK_LABELS.pass,
    );
  });

  it('names every side-effect field, the money among them through the one formatter', () => {
    const cell = cellOf(records, measureRecordIndexOf('sideEffects'), FIRST_OPTION_COLUMN);

    expect(cell).toContain(`${SIDE_EFFECT_FIELD_LABELS.product}: ${SIDE_EFFECT.productId}`);
    expect(cell).toContain(`${SIDE_EFFECT_FIELD_LABELS.kits}: ${String(SIDE_EFFECT.kitsDelayed)}`);
    expect(cell).toContain(
      `${SIDE_EFFECT_FIELD_LABELS.value}: ${formatMoney(SIDE_EFFECT.valueDeferredEur)}`,
    );
    expect(cell).toContain(`${SIDE_EFFECT_FIELD_LABELS.days}: ${String(SIDE_EFFECT.daysDeferred)}`);
    expect(cell).not.toContain('kitsDelayed');
    expect(cell).not.toContain('valueDeferredEur');
  });
});

/* ---------------------------------------------------------------------------------------------
 * A column the solver refused to measure
 * ------------------------------------------------------------------------------------------- */

describe('a column whose constraint check failed', () => {
  /** The file the two fixtures produce, parsed once for the three cases below. */
  const records = recordsOf(
    buildScenarioComparisonCsv(setOf([MEASURED, REFUSED], MEASURED.id)).content,
  );

  it('states Cannot compute in each of its eight measure cells that state a figure', () => {
    const figureRows = (
      Object.keys(COMPARISON_MEASURE_LABELS) as Array<keyof typeof COMPARISON_MEASURE_LABELS>
    ).filter((key) => key !== 'constraintCheck');

    expect(figureRows).toHaveLength(8);

    for (const key of figureRows) {
      expect(cellOf(records, measureRecordIndexOf(key), SECOND_OPTION_COLUMN)).toBe(
        CANNOT_COMPUTE_LABEL,
      );
    }

    for (const cell of records.map((fields) => fields[SECOND_OPTION_COLUMN] ?? '')) {
      expect(cell).not.toBe('0');
      expect(cell).not.toBe('0.00');
      expect(cell).not.toContain('0 of 0');
    }
  });

  it('states the refusal in its constraint-check record, one message per breach', () => {
    expect(cellOf(records, measureRecordIndexOf('constraintCheck'), SECOND_OPTION_COLUMN)).toBe(
      `${CONSTRAINT_CHECK_LABELS.fail} — ${REFUSAL_MESSAGES.join('; ')}`,
    );
  });

  it('leaves the measured column as the record states it', () => {
    expect(cellOf(records, measureRecordIndexOf('addedCost'), FIRST_OPTION_COLUMN)).toBe(
      formatMoney(MEASURED.addedCostEur),
    );
  });
});

/* ---------------------------------------------------------------------------------------------
 * The options the set held back
 * ------------------------------------------------------------------------------------------- */

describe('an option the set held back', () => {
  /** The file of one measured option and one held back. */
  const records = recordsOf(
    buildScenarioComparisonCsv(setOf([MEASURED], MEASURED.id, [REJECTED])).content,
  );

  it('opens the record with the heading, the option and the constraint that blocked it', () => {
    expect(records[SET_ASIDE_RECORD_START]?.[0]).toBe(
      `${COMPARISON_SET_ASIDE_LABEL}: ${REJECTED.scenarioId} — ${REJECTED.blockingConstraint}`,
    );
  });

  it('leaves an empty cell under every option column', () => {
    expect(records[SET_ASIDE_RECORD_START]).toStrictEqual([
      `${COMPARISON_SET_ASIDE_LABEL}: ${REJECTED.scenarioId} — ${REJECTED.blockingConstraint}`,
      '',
    ]);
  });

  it('is the whole record when the set holds no option to fill', () => {
    const empty = recordsOf(buildScenarioComparisonCsv(setOf([], undefined, [REJECTED])).content);

    expect(empty[SET_ASIDE_RECORD_START]).toStrictEqual([
      `${COMPARISON_SET_ASIDE_LABEL}: ${REJECTED.scenarioId} — ${REJECTED.blockingConstraint}`,
    ]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * RFC 4180 quoting
 * ------------------------------------------------------------------------------------------- */

describe('a field that carries a separator and a quote', () => {
  it('wraps it in double quotes and doubles the embedded quote, leaving the width unchanged', () => {
    const name = 'Air freight, "beyond the maximum"';
    const content = buildScenarioComparisonCsv(setOf([scenarioOf('SCN-9001-e', name)])).content;

    expect(content).toContain('Air freight, ""beyond the maximum""');

    const records = recordsOf(content);

    expect(cellOf(records, HEADER_RECORD, FIRST_OPTION_COLUMN)).toBe(
      `${name} (SCN-9001-e) — ${SIM_LABELS[1]}`,
    );
    expect(records.every((fields) => fields.length === 2)).toBe(true);
  });
});

describe('a money cell that carries the decimal comma', () => {
  it('is quoted, and the record keeps the table width', () => {
    const money = formatMoney(MEASURED.addedCostEur);
    const content = buildScenarioComparisonCsv(setOf([MEASURED])).content;

    expect(money).toContain(',');
    expect(content).toContain(`"${money}"`);
    expect(recordsOf(content).every((fields) => fields.length === 2)).toBe(true);
  });
});
