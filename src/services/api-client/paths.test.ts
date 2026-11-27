/**
 * Provenance suite for the API adapter's path vocabulary: the executable half of the header carried
 * by `src/services/api-client/paths.ts`.
 *
 * WHY THIS FILE EXISTS. Contracts §9 fixes the vocabulary, and that document is absent from this
 * checkout and from the whole run, so twenty-six of the module's thirty-five entries are derived
 * from their member's family and name rather than transcribed. The module's header states that
 * split, names the nine entries AAP 0.12.3 quotes character for character, records that the
 * plan's thirty-four and this file's thirty-five cannot be reconciled while §9 is unreadable, and
 * gives the condition that would settle both. Everything the absent document would otherwise have
 * to be trusted for, and that can be checked without it, is checked here: the nine quoted paths
 * are spelled as AAP 0.12.3 spells them, every entry is built from the one base path, none carries
 * a query separator or a fragment, and no caller-supplied value can turn the segment it occupies
 * into a second segment, a query or a fragment.
 *
 * WHAT THIS SUITE DOES NOT DO. It does not compare the twenty-six derived entries with §9, because
 * no copy of that document is readable in this run; that gap stays recorded in the module's header
 * rather than closed by a passing test. It imports no seed record, no mock adapter and no API
 * client (rule P-2), reads no file and opens no socket (rule B-1), needs no configuration and
 * holds no credential (rule B-2), and types no record identifier and no business figure (rule
 * P-6): the only quantity it names is the entry count the module's own header states.
 */

import { describe, expect, it } from 'vitest';
import {
  API_BASE_PATH,
  approvalDecisionPath,
  approvalOutcomeReviewPath,
  approvalPath,
  approvalsPath,
  assistantQueriesPath,
  atlasPath,
  auditEventsPath,
  auditEventsVerifyPath,
  documentPath,
  evidencePath,
  evidencePinReviewPath,
  evidencePinsPath,
  exceptionAffectedLinesPath,
  exceptionAssigneePath,
  exceptionDismissalPath,
  exceptionNotesPath,
  exceptionPath,
  exceptionScenariosPath,
  exceptionScenarioSolvePath,
  exceptionsPath,
  exitPackagePath,
  modelsPath,
  overviewPath,
  packageElementReviewPath,
  packagePath,
  packagesPath,
  plantPlanGridPath,
  policiesPath,
  policyExceptionsPath,
  policyPath,
  searchPath,
  sovereigntyOutboundLedgerPath,
  sovereigntyPath,
  sourcesPath,
  topologyPath,
} from './paths';

/* ---------------------------------------------------------------------------------------------
 * The values the cases build with
 * ------------------------------------------------------------------------------------------- */

/**
 * A value that would change the shape of a path if it were concatenated as it stands: it carries a
 * segment separator, a query separator and a fragment marker. A builder that failed to encode it
 * would name a different resource, add a query or drop everything after a fragment.
 */
const HOSTILE_SEGMENT = 'value/with?all#three';

/** The value the whole-vocabulary case builds every parameterised entry with. */
const PLAIN_SEGMENT = 'plain-value';

/**
 * The sixteen entries that take part of their path from a caller, paired with the name the failing
 * case reports. The nineteen constant entries are listed in `ALL_ENTRIES` below; between them the
 * two lists cover the module's whole exported vocabulary.
 */
const PARAMETERISED_BUILDERS: [name: string, build: (value: string) => string][] = [
  ['exceptionPath', exceptionPath],
  ['exceptionAffectedLinesPath', exceptionAffectedLinesPath],
  ['exceptionAssigneePath', exceptionAssigneePath],
  ['exceptionNotesPath', exceptionNotesPath],
  ['exceptionDismissalPath', exceptionDismissalPath],
  ['exceptionScenariosPath', exceptionScenariosPath],
  ['exceptionScenarioSolvePath', exceptionScenarioSolvePath],
  ['approvalPath', approvalPath],
  ['approvalDecisionPath', approvalDecisionPath],
  ['approvalOutcomeReviewPath', approvalOutcomeReviewPath],
  ['policyPath', policyPath],
  ['policyExceptionsPath', policyExceptionsPath],
  ['documentPath', documentPath],
  ['evidencePinReviewPath', evidencePinReviewPath],
  ['packagePath', packagePath],
  ['plantPlanGridPath', plantPlanGridPath],
];

/**
 * Every entry the module exports: the nineteen constants as they stand and the sixteen builders
 * answered with `PLAIN_SEGMENT`. The module's header states that the vocabulary holds thirty-five
 * distinct entries built from `/api/v1`, and the cases below hold it to that figure, that base and
 * the shape of each entry.
 */
const ALL_ENTRIES: readonly string[] = [
  overviewPath,
  exceptionsPath,
  exceptionPath(PLAIN_SEGMENT),
  exceptionAffectedLinesPath(PLAIN_SEGMENT),
  exceptionAssigneePath(PLAIN_SEGMENT),
  exceptionNotesPath(PLAIN_SEGMENT),
  exceptionDismissalPath(PLAIN_SEGMENT),
  exceptionScenariosPath(PLAIN_SEGMENT),
  exceptionScenarioSolvePath(PLAIN_SEGMENT),
  approvalsPath,
  approvalPath(PLAIN_SEGMENT),
  approvalDecisionPath(PLAIN_SEGMENT),
  approvalOutcomeReviewPath(PLAIN_SEGMENT),
  auditEventsPath,
  auditEventsVerifyPath,
  modelsPath,
  assistantQueriesPath,
  sovereigntyPath,
  sovereigntyOutboundLedgerPath,
  policiesPath,
  policyPath(PLAIN_SEGMENT),
  policyExceptionsPath(PLAIN_SEGMENT),
  evidencePath,
  documentPath(PLAIN_SEGMENT),
  evidencePinsPath,
  evidencePinReviewPath(PLAIN_SEGMENT),
  packagesPath,
  packagePath(PLAIN_SEGMENT),
  packageElementReviewPath,
  searchPath,
  topologyPath,
  atlasPath,
  sourcesPath,
  plantPlanGridPath(PLAIN_SEGMENT),
  exitPackagePath,
];

/**
 * The nine entries transcribed from AAP 0.12.3, each paired with the path that document quotes and
 * the module's own entry reproduces. The approvals row covers both methods the plan tabulates,
 * `GET` and `POST`, because a collection with two methods is one path. The plan writes a record
 * segment as `{id}`, and where it does, `PLAIN_SEGMENT` stands in that segment so the module's own
 * builder can answer it.
 */
const AAP_QUOTED_PATHS: [quoted: string, built: string][] = [
  ['/api/v1/approvals', approvalsPath],
  [`/api/v1/approvals/${PLAIN_SEGMENT}/decision`, approvalDecisionPath(PLAIN_SEGMENT)],
  ['/api/v1/assistant/queries', assistantQueriesPath],
  ['/api/v1/evidence', evidencePath],
  [`/api/v1/documents/${PLAIN_SEGMENT}`, documentPath(PLAIN_SEGMENT)],
  ['/api/v1/audit-events/verify', auditEventsVerifyPath],
  ['/api/v1/market-intelligence/atlas', atlasPath],
  [
    `/api/v1/exceptions/${PLAIN_SEGMENT}/scenarios/solve`,
    exceptionScenarioSolvePath(PLAIN_SEGMENT),
  ],
  ['/api/v1/topology', topologyPath],
];

/* ---------------------------------------------------------------------------------------------
 * Cases
 * ------------------------------------------------------------------------------------------- */

describe('the path vocabulary as a whole', () => {
  it('holds the thirty-five distinct entries the module header states', () => {
    expect(ALL_ENTRIES).toHaveLength(35);
    expect(new Set(ALL_ENTRIES).size).toBe(ALL_ENTRIES.length);
  });

  it.each(ALL_ENTRIES)('%s is built from the one base path', (entry) => {
    expect(entry.startsWith(`${API_BASE_PATH}/`)).toBe(true);
  });

  it.each(ALL_ENTRIES)('%s carries no query separator and no fragment', (entry) => {
    expect(entry).not.toContain('?');
    expect(entry).not.toContain('#');
  });

  it('names no scheme, host or port in the base path or in any entry', () => {
    expect(API_BASE_PATH).toBe('/api/v1');
    expect(API_BASE_PATH.startsWith('/')).toBe(true);
    expect(API_BASE_PATH).not.toContain('://');
    for (const entry of ALL_ENTRIES) {
      expect(entry).not.toContain('://');
    }
  });
});

describe('the nine paths AAP 0.12.3 quotes', () => {
  it.each(AAP_QUOTED_PATHS)('%s is spelled as the plan quotes it', (quoted, built) => {
    expect(built).toBe(quoted);
  });
});

describe('the sixteen parameterised entries', () => {
  it.each(PARAMETERISED_BUILDERS)('%s keeps a hostile value inside one segment', (_name, build) => {
    const plain = build(PLAIN_SEGMENT);
    const hostile = build(HOSTILE_SEGMENT);

    expect(hostile).toBe(plain.replace(PLAIN_SEGMENT, encodeURIComponent(HOSTILE_SEGMENT)));
    expect(hostile).not.toContain('?');
    expect(hostile).not.toContain('#');
    expect(hostile.split('/')).toHaveLength(plain.split('/').length);
    expect(hostile.startsWith(`${API_BASE_PATH}/`)).toBe(true);
  });
});
