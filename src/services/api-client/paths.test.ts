/**
 * Provenance suite for the API adapter's path vocabulary: the executable half of the header carried
 * by `src/services/api-client/paths.ts`.
 *
 * WHY THIS FILE EXISTS. Contracts §9 fixes the vocabulary, and that document is absent from this
 * checkout and from the whole run, so thirty-one of the module's forty entries are derived from
 * their member's family and name rather than transcribed. The module's header states that split,
 * names the nine entries AAP 0.12.3 quotes character for character, records that the plan's
 * thirty-four and this file's forty cannot be reconciled while §9 is unreadable, and gives the
 * condition that would settle both. Everything the absent document would otherwise have to be
 * trusted for, and that can be checked without it, is checked here: the nine quoted paths are
 * spelled as AAP 0.12.3 spells them, every entry is built from the one base path, none carries a
 * query separator or a fragment, no caller-supplied value can turn the segment it occupies into a
 * second segment, a query or a fragment, and the two lists below cover every value the module
 * exports, so an entry cannot land here untested. Against a source outside this module, every member
 * the service port declares is also tied to the entry that serves it in a table the compiler holds
 * to the port, so each derived spelling is anchored to the member it answers for and not only to
 * the module that spells it.
 *
 * WHAT THIS SUITE DOES NOT DO. It does not compare the thirty-one derived entries with §9, because
 * no copy of that document is readable in this run, and the forty is the module's own figure rather
 * than one §9 states: the table below anchors each derived spelling to the port member it serves,
 * but leaves the spelling itself unverified. A supplied contracts §9 — or its §2, which types those
 * members — is what would settle the count and every derived spelling, and is the document a
 * reviewer diffs the table against when it arrives; until then that gap stays recorded in the
 * module's header rather than closed by a passing test. It imports no seed record, no mock adapter
 * and no API client (rule P-2), reads no file and opens no socket (rule B-1), needs no configuration
 * and holds no credential (rule B-2), and types no record identifier and no business figure (rule
 * P-6): the only quantity it names is the entry count the module's own header states.
 */

import { describe, expect, it } from 'vitest';

import type { SiteIntelligenceService } from '../site-intelligence-service';
import * as pathsModule from './paths';
import {
  API_BASE_PATH,
  approvalDecisionPath,
  approvalOutcomePath,
  approvalOutcomeReviewPath,
  approvalPath,
  approvalsPath,
  approvalWriteBackRetryPath,
  assistantQueriesPath,
  assistantQuestionsPath,
  atlasPath,
  auditEventPath,
  auditEventsPath,
  auditEventsVerifyPath,
  canvasRibbonPath,
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
 * A value the module exports: a constant entry as it stands, or a builder answered with
 * `PLAIN_SEGMENT` in every segment it takes. The whole-vocabulary case below holds the module's own
 * namespace to the two lists, so neither can drift behind the module.
 */
type ExportedPath = string | ((...segments: string[]) => string);

/**
 * The nineteen entries that take part of their path from a caller, paired with the name the failing
 * case reports. The twenty-one constant entries are listed in `ALL_ENTRIES` below; between them the
 * two lists cover the module's whole exported vocabulary, which the last case in this file proves.
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
  ['auditEventPath', auditEventPath],
  ['approvalOutcomePath', approvalOutcomePath],
  ['approvalWriteBackRetryPath', (value: string) => approvalWriteBackRetryPath(value, value)],
];

/**
 * Every entry the module exports: the twenty-one constants as they stand and the nineteen builders
 * answered with `PLAIN_SEGMENT`. The module's header states that the vocabulary holds forty distinct
 * entries built from `/api/v1`, nine of them quoted by AAP 0.12.3 and thirty-one derived, and the
 * cases below hold it to that figure, that base and the shape of each entry.
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
  canvasRibbonPath,
  auditEventPath(PLAIN_SEGMENT),
  approvalOutcomePath(PLAIN_SEGMENT),
  approvalWriteBackRetryPath(PLAIN_SEGMENT, PLAIN_SEGMENT),
  assistantQuestionsPath,
];

/**
 * Which of the entries above serve each member the service port declares, in the port's own order.
 *
 * This is the suite's one anchor that does not come from the module under test. `ALL_ENTRIES` is a
 * transcription of `paths.ts` and the cases over it prove the module is internally consistent; the
 * port is a separate input — `src/services/site-intelligence-service.ts`, the interface contracts §2
 * fixes member for member — so typing this table by `keyof SiteIntelligenceService` turns a member
 * that is misspelled, renamed, omitted or invented into a `tsc --noEmit` error instead of a row that
 * silently stops being checked. The device is the type-level one
 * `src/services/service-conformance.test.ts` uses for its adapter conformance.
 *
 * Every row states its entry in the shape `ALL_ENTRIES` holds it: a constant entry as it stands, or
 * a builder answered with `PLAIN_SEGMENT` in each segment it takes. A reviewer can therefore diff a
 * row against the path contracts §9 will fix for that member when the document lands, one member per
 * line and in the order the port declares them.
 *
 * The five empty rows are the members whose capability has no HTTP counterpart (AAP 0.6.2,
 * contracts §11): the two demonstration controls, answered against the adapter's own state, and the
 * three exports, whose payload is assembled in the browser and offered as a download rather than
 * sent as a request. `approvalsPath` is the one entry two members share, because a collection with
 * two methods is one path: `listApprovals` reads it with `GET` and `requestApproval` posts to it.
 */
const MEMBER_ENTRIES: Readonly<Record<keyof SiteIntelligenceService, readonly string[]>> = {
  getOverview: [overviewPath],
  listExceptions: [exceptionsPath],
  getExceptionDetail: [exceptionPath(PLAIN_SEGMENT)],
  getAffectedLines: [exceptionAffectedLinesPath(PLAIN_SEGMENT)],
  assignException: [exceptionAssigneePath(PLAIN_SEGMENT)],
  noteException: [exceptionNotesPath(PLAIN_SEGMENT)],
  dismissException: [exceptionDismissalPath(PLAIN_SEGMENT)],
  getScenarioSet: [exceptionScenariosPath(PLAIN_SEGMENT)],
  solveScenario: [exceptionScenarioSolvePath(PLAIN_SEGMENT)],
  listApprovals: [approvalsPath],
  getApproval: [approvalPath(PLAIN_SEGMENT)],
  getApprovalOutcome: [approvalOutcomePath(PLAIN_SEGMENT)],
  requestApproval: [approvalsPath],
  decideApproval: [approvalDecisionPath(PLAIN_SEGMENT)],
  reviewApprovalOutcome: [approvalOutcomeReviewPath(PLAIN_SEGMENT)],
  retryWriteBack: [approvalWriteBackRetryPath(PLAIN_SEGMENT, PLAIN_SEGMENT)],
  listAuditEvents: [auditEventsPath],
  getAuditEvent: [auditEventPath(PLAIN_SEGMENT)],
  verifyAuditChain: [auditEventsVerifyPath],
  getModelCatalogue: [modelsPath],
  listSuggestedQuestions: [assistantQuestionsPath],
  askAssistant: [assistantQueriesPath],
  getSovereigntyStatus: [sovereigntyPath],
  getOutboundLedger: [sovereigntyOutboundLedgerPath],
  listPolicies: [policiesPath],
  getPolicy: [policyPath(PLAIN_SEGMENT)],
  requestPolicyException: [policyExceptionsPath(PLAIN_SEGMENT)],
  getEvidence: [evidencePath],
  getDocument: [documentPath(PLAIN_SEGMENT)],
  listPins: [evidencePinsPath],
  reviewPin: [evidencePinReviewPath(PLAIN_SEGMENT)],
  listPackages: [packagesPath],
  getPackage: [packagePath(PLAIN_SEGMENT)],
  reviewElement: [packageElementReviewPath],
  searchIdentifiers: [searchPath],
  getTopology: [topologyPath],
  getCanvasRibbon: [canvasRibbonPath],
  getAtlas: [atlasPath],
  getSourceCatalogue: [sourcesPath],
  getPlanGrid: [plantPlanGridPath(PLAIN_SEGMENT)],
  getExitPackage: [exitPackagePath],
  exportEvidencePack: [],
  exportScenarioComparison: [],
  exportChokepointBrief: [],
  setSimulation: [],
  resetDemo: [],
};

/**
 * The five port members that are answered without a request, and so take no entry above.
 *
 * Spelled as port member names rather than as strings a case compares loosely, so a rename in the
 * port is a `tsc --noEmit` error here too. The cases below hold `MEMBER_ENTRIES` to this list in
 * both directions: these five are the only rows left empty, and every other member is served by at
 * least one entry.
 */
const BROWSER_ONLY_MEMBERS = [
  'setSimulation',
  'resetDemo',
  'exportEvidencePack',
  'exportScenarioComparison',
  'exportChokepointBrief',
] as const satisfies readonly (keyof SiteIntelligenceService)[];

/**
 * The nine entries quoted verbatim by AAP 0.12.3, each paired with the path that document quotes and
 * the module's own entry reproduces. That table quotes the approvals collection's `POST`; the
 * module's single entry answers `GET` on the same collection for the list, because a collection with
 * two methods is one path. The plan writes a record segment as `{id}`, and where it does,
 * `PLAIN_SEGMENT` stands in that segment so the module's own builder can answer it.
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
  /*
   * The figure below is the module's own: `paths.ts` labels its entries "Entry 1 of 40" to "Entry 40
   * of 40" and records that contracts §9 is absent from this run, so the file under test is what
   * states the number, not the document that would fix it. A supplied contracts §9 — or its §2,
   * which types the members these entries serve — is what settles it, and `MEMBER_ENTRIES` above is
   * the table a reviewer diffs the derived spellings against when it arrives. Until then this case
   * holds the module to its own figure, stated here so the figure is not mistaken for an external
   * one.
   */
  it('holds the forty distinct entries the module header states', () => {
    expect(ALL_ENTRIES).toHaveLength(40);
    expect(new Set(ALL_ENTRIES).size).toBe(ALL_ENTRIES.length);
  });

  it('covers every value the module exports beside the base path', () => {
    const exported: ExportedPath[] = [];
    for (const value of Object.values(pathsModule) as readonly ExportedPath[]) {
      if (value === API_BASE_PATH) continue;
      exported.push(typeof value === 'string' ? value : value(PLAIN_SEGMENT, PLAIN_SEGMENT));
    }

    expect(exported).toHaveLength(ALL_ENTRIES.length);
    expect(new Set(exported)).toEqual(new Set(ALL_ENTRIES));
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

describe('the port members each entry serves', () => {
  it('reaches every entry the module exports, and reaches no other', () => {
    const reached = new Set(Object.values(MEMBER_ENTRIES).flat());

    expect(reached).toEqual(new Set(ALL_ENTRIES));
  });

  it('reaches the forty entries as a distinct set, and shares exactly the approvals collection', () => {
    const rows = Object.values(MEMBER_ENTRIES);
    const mapped = rows.flat();
    const distinct = new Set(mapped);

    expect(distinct.size).toBe(40);
    // `paths.ts` states that "`approvalsPath` is the one entry two members share — `listApprovals`
    // reads that collection with `GET`, `requestApproval` posts to it — so no entry is dead and no
    // member is left without one". Both halves of that sentence are checked here rather than the
    // weaker "some entry is shared": the entries standing in more than one row are computed from the
    // rows themselves and must be exactly that collection — a second share fails this and names the
    // entry it added — and the rows must hold exactly one item more than the distinct set, which is
    // the one share. Set equality in the case above keeps every entry reached; this case keeps
    // exactly one of them reached twice.
    const shared = Array.from(distinct).filter(
      (entry) => rows.filter((row) => row.includes(entry)).length > 1,
    );

    expect(shared).toEqual([approvalsPath]);
    expect(mapped.length).toBe(distinct.size + 1);
  });

  it('leaves the five members with no HTTP counterpart unserved', () => {
    const unserved = Object.entries(MEMBER_ENTRIES)
      .filter(([, entries]) => entries.length === 0)
      .map(([member]) => member);

    expect(new Set(unserved)).toEqual(new Set(BROWSER_ONLY_MEMBERS));
  });

  it('serves every other member with at least one entry', () => {
    const browserOnly = new Set<string>(BROWSER_ONLY_MEMBERS);
    const servedByNothing = Object.entries(MEMBER_ENTRIES)
      .filter(([member, entries]) => !browserOnly.has(member) && entries.length === 0)
      .map(([member]) => member);

    expect(servedByNothing).toEqual([]);
  });
});

describe('the nine paths AAP 0.12.3 quotes', () => {
  it.each(AAP_QUOTED_PATHS)('%s is spelled as the plan quotes it', (quoted, built) => {
    expect(built).toBe(quoted);
  });
});

describe('the nineteen parameterised entries', () => {
  it.each(PARAMETERISED_BUILDERS)('%s keeps a hostile value inside one segment', (_name, build) => {
    const plain = build(PLAIN_SEGMENT);
    const hostile = build(HOSTILE_SEGMENT);

    // The write-back retry entry takes two segments, so every occurrence of the plain value is
    // replaced rather than only the first.
    expect(hostile).toBe(plain.replaceAll(PLAIN_SEGMENT, encodeURIComponent(HOSTILE_SEGMENT)));
    expect(hostile).not.toContain('?');
    expect(hostile).not.toContain('#');
    expect(hostile.split('/')).toHaveLength(plain.split('/').length);
    expect(hostile.startsWith(`${API_BASE_PATH}/`)).toBe(true);
  });
});
