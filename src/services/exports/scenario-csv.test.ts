// @vitest-environment node

/**
 * What the comparison CSV says, record by record, for the cases no other suite reaches.
 *
 * WHY THIS SUITE EXISTS. `src/services/mock/mock-backend.test.ts` asserts that the adapter's payload
 * equals `buildScenarioComparisonCsv`'s payload for the same set — the composer compared against
 * itself — and no suite read the text it writes. Two defects survived every gate that way: the
 * marker record was two fields wide in a file whose other records carry `1 + n`, and a column whose
 * constraint check failed reported the neutral zeros of an unmeasured option as measured figures.
 * The cases below read the file's own text, so both are asserted where a reader meets them.
 *
 * WHAT IT ASSERTS, AND WHAT IT LEAVES ALONE. The field count of every record for a two-option and a
 * zero-option set, the marker record among them; the seven measure cells of a refused column and the
 * absence of any zero, `0.00` or `0 of 0` there; the refusal's own message in that column's
 * constraint-check record; and RFC 4180 quoting of a field carrying a comma and a double quote. It
 * does not restate the measure labels, the row wording, the file name or the money formatter: those
 * belong to the builder, and the cases locate a record by its fixed position so a wording change
 * cannot quietly move an assertion onto another row.
 *
 * THE FIXTURES ARE TYPED, NOT SEEDED. Every member of `Scenario` is filled here, because the builder
 * is a pure function of the set it is handed and needs a set rather than the dataset. Nothing is
 * imported from `src/seed` (rule P-2): the identifiers and the messages below are the fixtures' own,
 * and the one label the suite asserts is read from `SIM_LABELS` rather than retyped, so the exact
 * §5.3 string has one owner.
 *
 * WHY THE NODE ENVIRONMENT, ON THE FIRST LINE ABOVE. Nothing here renders. The builder is a pure
 * function returning a string, so the suite needs no DOM, no service and no network (rule B-1).
 */

import { describe, expect, it } from 'vitest';

import { buildScenarioComparisonCsv } from './scenario-csv';
import { CANNOT_COMPUTE_LABEL, SIM_LABELS } from '../../types';
import type { Scenario, ScenarioSet } from '../../types';

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
 * @returns The scenario, typed so a member added to `Scenario` later fails this file to compile.
 */
function scenarioOf(id: string, name: string, refusal: readonly string[] = []): Scenario {
  const refused = refusal.length > 0;

  return {
    id,
    exceptionId: EXCEPTION_ID,
    name,
    origin: 'solver',
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
    sideEffects: refused
      ? []
      : [{ productId: 'PRD-FIXTURE', kitsDelayed: 90, valueDeferredEur: 1080.5, daysDeferred: 2 }],
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

/**
 * One set the width and marker cases run over: what it holds, and the marker record its file must
 * lead with.
 *
 * Two options cover the ordinary file, and no options cover the set an exception with no response
 * option produces — the case the builder has to keep the flag inside a single column for.
 */
const SET_CASES: readonly {
  readonly label: string;
  readonly scenarios: readonly Scenario[];
  readonly marker: readonly string[];
}[] = [
  { label: 'two options', scenarios: [MEASURED, REFUSED], marker: ['simulated', 'true', 'true'] },
  { label: 'no options', scenarios: [], marker: ['simulated=true'] },
];

/**
 * Builds the set the builder is asked for, with the recommendation the case needs.
 *
 * @param scenarios - The options the set holds, one column each.
 * @param recommendedId - The option the set recommends; omitted, the set recommends none.
 * @returns The set, carrying the rule and the trade-off a record states.
 */
function setOf(scenarios: readonly Scenario[], recommendedId?: string): ScenarioSet {
  return {
    exceptionId: EXCEPTION_ID,
    scenarios: [...scenarios],
    ...(recommendedId === undefined ? {} : { recommendedId }),
    recommendationRule: 'the fixture states the rule its recommendation applied',
    tradeOff: 'the fixture states the trade-off its recommendation makes',
    rejected: [],
  };
}

/* ---------------------------------------------------------------------------------------------
 * Reading the file
 * ------------------------------------------------------------------------------------------- */

/**
 * What each record of the file is, by its position.
 *
 * The builder writes the marker, then the column names, then the eight measure rows in the order
 * AAP §0.12.4's SCR-04 row fixes, then the two label rows — twelve records for every set the builder
 * receives, because a zero-option file still states every row. The seventh of the eight measure rows
 * is the constraint check, which states the refusal rather than a measure, and the last two records
 * are the source label and the recommendation.
 */
const MARKER_RECORD = 0;
const CONSTRAINT_CHECK_RECORD = 8;
const SOURCE_LABEL_RECORD = 10;
const RECOMMENDED_RECORD = 11;
const RECORD_COUNT = 12;

/** The seven records that carry a measure: the eight measure rows without the constraint check's own. */
const MEASURE_RECORDS = [2, 3, 4, 5, 6, 7, 9] as const;

/** The column the measured fixture occupies in every set that holds both fixtures. */
const MEASURED_COLUMN = 1;

/** The column the refused fixture occupies in every set that holds both fixtures. */
const REFUSED_COLUMN = 2;

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
    ({ scenarios }) => {
      const records = recordsOf(buildScenarioComparisonCsv(setOf(scenarios)).content);

      expect(records).toHaveLength(RECORD_COUNT);

      const widths = new Set(records.map((fields) => fields.length));

      expect([...widths]).toStrictEqual([scenarios.length + 1]);
    },
  );

  it.each(SET_CASES)(
    'states the simulated flag in the record leading a file of $label',
    ({ scenarios, marker }) => {
      const records = recordsOf(buildScenarioComparisonCsv(setOf(scenarios)).content);

      expect(records[MARKER_RECORD]).toStrictEqual([...marker]);
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * A column the solver refused to measure
 * ------------------------------------------------------------------------------------------- */

describe('a column whose constraint check failed', () => {
  /** The file the two fixtures produce, parsed once for the three cases below. */
  const records = recordsOf(
    buildScenarioComparisonCsv(setOf([MEASURED, REFUSED], MEASURED.id)).content,
  );

  it('states Cannot compute in each of its seven measure cells, and no figure there', () => {
    expect(records).toHaveLength(RECORD_COUNT);

    const cells = MEASURE_RECORDS.map((recordIndex) =>
      cellOf(records, recordIndex, REFUSED_COLUMN),
    );

    expect(cells).toHaveLength(7);
    expect(new Set(cells)).toStrictEqual(new Set([CANNOT_COMPUTE_LABEL]));

    for (const cell of records.map((fields) => fields[REFUSED_COLUMN] ?? '')) {
      expect(cell).not.toBe('0');
      expect(cell).not.toBe('0.00');
      expect(cell).not.toContain('0 of 0');
    }
  });

  it('keeps the reason in its constraint-check record, one message per breach', () => {
    expect(cellOf(records, CONSTRAINT_CHECK_RECORD, REFUSED_COLUMN)).toBe(
      REFUSAL_MESSAGES.join('; '),
    );
  });

  it('leaves the measured column and the label rows as the record states them', () => {
    const measuredCells = MEASURE_RECORDS.map((recordIndex) =>
      cellOf(records, recordIndex, MEASURED_COLUMN),
    );

    expect(measuredCells).not.toContain(CANNOT_COMPUTE_LABEL);
    expect(cellOf(records, CONSTRAINT_CHECK_RECORD, MEASURED_COLUMN)).toBe('pass');
    expect(cellOf(records, SOURCE_LABEL_RECORD, REFUSED_COLUMN)).toBe(SIM_LABELS[1]);
    expect(cellOf(records, RECOMMENDED_RECORD, MEASURED_COLUMN)).toBe(SIM_LABELS[2]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * RFC 4180 quoting
 * ------------------------------------------------------------------------------------------- */

describe('a field that carries a separator and a quote', () => {
  it('wraps it in double quotes and doubles the embedded quote, leaving the width unchanged', () => {
    const name = 'Air freight, "beyond the maximum"';
    const content = buildScenarioComparisonCsv(setOf([scenarioOf('SCN-9001-c', name)])).content;

    expect(content).toContain('"Air freight, ""beyond the maximum"""');

    const records = recordsOf(content);

    expect(records[1]?.[1]).toBe(name);
    expect(records.every((fields) => fields.length === 2)).toBe(true);
  });
});
