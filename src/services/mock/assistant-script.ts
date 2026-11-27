/**
 * The evidence assistant's answer builders: the six scripted answers SCR-06 offers and the fixed
 * notice the panel returns for anything else.
 *
 * Implements the "Assistant builders" row of AAP 0.12.1 and the placeholder resolutions AAP 0.8
 * fixes, at the path AAP 0.13.1 gives the module. `src/seed/assistant-questions.ts` owns every word a
 * reader sees — the six suggested questions, the outline of each answer, the sentence each answer is
 * built from and the records each answer cites — and this module owns the arithmetic that fills those
 * sentences: a template arrives with `{placeholder}` tokens, and every token is resolved here from a
 * computation taken at call time. That split is what makes rule P-6 structural rather than a habit.
 * The words live where a record is authored; the figures are computed where the arithmetic is
 * testable; neither module can slide into the other's job, and nothing here holds a sentence, a
 * currency amount or a record identifier of its own.
 *
 * WHAT A PLACEHOLDER RESOLVES TO, AND FROM WHERE. Each token names the value it needs, and each is
 * computed from the records the seeded question itself cites:
 * - the units late on one of the cited customer orders: that order's row in the solver's measurement
 *   of the cited case with neither lever deployed, which is the do-nothing baseline AAP 0.8 fixes;
 * - the terms a cited document states: that document record's own body text, quoted as it stands;
 * - a cited package's readiness: its passing elements over its full element set, through
 *   `wholePercent`, which is the one readiness rule the codebase applies (contracts §5);
 * - the kits a transfer defers and the value that deferral carries: the cited case measured with the
 *   transfer lever at the largest quantity the case admits, whose side effect reports the kits, then
 *   valued at the unit price the deferred order carries (see the OPEN ITEM on the euro amount below);
 * - what a cited exception records of the change, and the inputs its impact assessment could not
 *   read: that exception record's own text and its own list, joined as the records write lists;
 * - the catalogue entry the model selector offers, and the label that marks the workspace's
 *   simulated figures: the catalogue's default entry and the demonstration-wide label.
 *
 * CITATIONS, AND WHY AN ANSWER THAT CANNOT BE CITED IS WITHHELD. Each cited record becomes a
 * `Citation` carrying the reference, the source it came from and that source's current freshness,
 * read through `freshnessFor` so the freshness reflects any simulation trigger in effect rather than
 * a state written into a record (rule P-1: no answer without its evidence). A question whose cited
 * record is missing from the record set, or whose source reports no freshness, therefore returns the
 * unscripted notice instead of an answer with a phantom citation behind it.
 *
 * WHAT THIS MODULE DOES NOT DO. It evaluates no policy: the model-boundary rule runs in the
 * assistant's handler before any answer is built, over the context a question carries, so a blocked
 * model never reaches these builders (AAP 0.12.3). It checks no permission, renders nothing, appends
 * no audit event, holds no state between calls and performs no I/O. No model is connected and none is
 * called: the panel's honesty rests on these builders returning seeded sentences with computed
 * values and on the notice for everything else, which is why nothing here reaches a network location
 * (rule B-1), reads configuration or a credential (rule B-2), or carries a label string of its own
 * (rule P-1).
 *
 * DETERMINISTIC BY CONSTRUCTION. Every value is a function of the records the session holds and the
 * constant demonstration clock they were authored against. No system clock, no random source, no
 * module-level mutable value and no platform global is read here, so the same session state yields the
 * same answer words for words (AAP 0.18.2). The only mutable values in the module are the two local
 * solver measurements one fill memoises and the query list it fills.
 *
 * OPEN ITEM — the euro amount the deferral carries. The solver reports the kits a transfer defers
 * but no value for them, because a solver case carries no price and rule P-6 forbids one being typed
 * into the solver (its own header records the same gap). The value is therefore composed here, in the
 * adapter layer that AAP 0.8 assigns it to: the deferred kits are valued at the unit price of the one
 * customer order that carries exactly that many kits at the plant the cited exception names, which is
 * the order the deferral holds up. Where that order is not uniquely identifiable the answer is
 * withheld rather than valued twice.
 *
 * OPEN ITEM — the currency marker of a composed amount. The sentence states the amount with its
 * grouping and at most two decimals but without a currency marker, because the marker is presentation
 * that `src/components/mono-value.tsx` owns (the note on `Money` in `src/types/primitives.ts` says so
 * explicitly) and rule P-6 admits no currency literal in a service module. A component renders an
 * amount with its code; a sentence composed before rendering carries the grouped figure. A record's own
 * body that states an amount together with its code is quoted as it stands, because that text is the
 * record's content rather than a figure composed here.
 *
 * OPEN ITEM — the wording of the unscripted answer's `missing` entry. Contracts §10 requires the
 * field to name what the answer lacked, and no seed record supplies that diagnostic, because the
 * notice itself is the record. The entry is therefore authored here and states the one thing the
 * demonstration is missing: a seeded question covering the one asked.
 *
 * Rules this module is built to satisfy:
 * - P-6: no figure, currency amount, identifier or expected result is typed below. Every number comes
 *   from `src/domain/solver` or from a record's own members at call time, and the expected results of
 *   the seed document are test fixtures this module neither holds nor reads.
 * - P-1: every scripted answer carries the citations behind it and paraphrases no label; the label a
 *   rendered figure carries belongs to the component that renders it.
 * - P-2: it imports the sibling `seed-loader.ts` rather than `src/seed/`, and reaches records only
 *   through the `HandlerContext` the adapter passes, so it cannot become a second data boundary.
 * - P-4: no sentence here claims a deployment property; the sentences are the seed's own and state
 *   only what the records show.
 * - P-5: every record consulted is a first-party one, so no market-intelligence value is summed with
 *   a first-party value anywhere in an answer.
 * - P-7: it names no company, site, product or person of its own; every identifier in an answer
 *   arrives from a record.
 * - B-1, B-2: no address, no request, no credential, no environment read.
 * - No test hook: nothing here reads a query parameter, a global flag or `window`, and the simulation
 *   triggers reach an answer only as the freshness a citation reports.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the solver, the rounding, the world's types, and the one door to the seed (rule P-2)
 * ------------------------------------------------------------------------------------------- */

import { halfUp2, wholePercent } from '../../domain/solver/rounding';
import { solveSupplyDelay } from '../../domain/solver/solve-supply-delay';
import { SIM_LABELS } from '../../types';
import type {
  Answer,
  Citation,
  DocumentBody,
  Freshness,
  Levers,
  OperationalException,
  PpapPackage,
  SimLabel,
  SolverCase,
  SolverResult,
  SourceId,
} from '../../types';
import { UNSCRIPTED_NOTICE } from './seed-loader';
import type {
  AssistantQuestion,
  AssistantQuestionRecord,
  AssistantQuestionRecordKind,
  CustomerOrder,
  SeedRecordSet,
} from './seed-loader';
import type { HandlerContext } from './mock-state';
import { freshnessFor } from './simulation';

/* ---------------------------------------------------------------------------------------------
 * A. Structural constants — AAP 0.8, AAP 0.10, rule P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * The sets an option recovers from a lever it leaves undeployed.
 *
 * The baseline the first scripted question asks about is the cited case with both levers at zero
 * (AAP 0.8), and a lever at zero moves no sets. The value is structural — it says that nothing
 * arrives by that route — rather than a business figure, which is why it may be a literal here while
 * every measure an answer reports is computed.
 */
const NO_RECOVERY_SETS = 0;

/**
 * How a record's own list of entries is joined when an answer quotes it.
 *
 * The records write a list as a semicolon-separated run of sentences and the export builders render
 * one the same way, so an answer that quotes a list matches the record it came from instead of
 * offering a second convention for the same text.
 */
const LIST_SEPARATOR = '; ';

/**
 * The label that marks the workspace's simulated figures, named by the sixth scripted question.
 *
 * `SIM_LABELS[0]` reads "Simulated data", the demonstration-wide badge label, which is the string the
 * question's sentence names as the marker on the figures the workspace reports. It is taken from the
 * fixed vocabulary rather than spelled here, so no second copy of a specification §5.3 string exists
 * in this module (rule P-1).
 */
const SIMULATED_DATA_LABEL: SimLabel = SIM_LABELS[0];

/**
 * Which of the six sources an answer cites a record from, one entry per record family a question may
 * reference.
 *
 * The mapping follows what each source is the record of: the exceptions, customer orders and
 * documents an answer quotes are the plan-of-record reads of ERP (orders, stock, goods receipts and
 * the commercial documents behind them), a package's elements are the quality evidence PLM and QMS
 * hold, and a solver case is the production sequence Scheduling supplies — the sequence the solver
 * projects a supply position forward from. The market pack is deliberately absent: no scripted answer
 * reads a competitor record, so no answer can blend one with a first-party figure (rule P-5).
 */
const SOURCE_BY_RECORD_KIND: Readonly<Record<AssistantQuestionRecordKind, SourceId>> = {
  exception: 'erp',
  document: 'erp',
  package: 'plm-qms',
  'customer-order': 'erp',
  'solver-case': 'scheduling',
};

/**
 * The prose formatter for one amount an answer states.
 *
 * An answer is a sentence, so the amount is rendered with thousands grouping and at most the two
 * decimals `Money` carries, in the convention the plan's own sentences and the seed records' bodies
 * write amounts in: a comma between thousands and a full stop before the decimals, which is the second
 * of the two renderings `src/components/mono-value.tsx` records as legitimately coexisting in this
 * build. This formatter renders a value and never rounds one: the domain's `halfUp2` has already fixed
 * the scale, and rounding belongs to `src/domain/solver/rounding.ts` alone (AAP 0.8).
 *
 * The currency marker is deliberately not part of the rendered text — see the OPEN ITEM on the marker
 * in the module header. `src/components/mono-value.tsx` owns the one money formatter that prints a
 * code, and a sentence composed before rendering carries the grouped figure alone.
 */
const AMOUNT_PROSE = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * The prefix the first question's per-order tokens carry.
 *
 * A template names one token per customer order it reports on, each ending in that order's identifier,
 * so the resolver recognises the family by its prefix and takes the identifier from the rest of the
 * token. Comparing in lower case lets a token spell an identifier in the sentence's own casing while
 * the record keeps the identifier's own, which is what stops a casing difference from withholding an
 * answer.
 */
const UNITS_LATE_TOKEN_PREFIX = 'unitslate';

/**
 * The placeholder tokens the seeded templates use, lower-cased for a case-folded lookup.
 *
 * These are the seed's names, not this module's: each one is declared by the question that carries it
 * and is the contract between a template and the value that fills it. Lower-casing them here means a
 * template's casing can never leave a token unresolved.
 */
const PLACEHOLDER_TOKENS = {
  whatChanged: 'whatchanged',
  missingInputs: 'missinginputs',
  documentTerms: 'documentterms',
  packageReadiness: 'packagereadiness',
  kitsDelayed: 'kitsdelayed',
  valueDeferredEur: 'valuedeferredeur',
  modelLabel: 'modellabel',
  simulationLabel: 'simulationlabel',
} as const;

/**
 * What the unscripted answer's `missing` list names.
 *
 * Contracts §10 requires that list to state which inputs the answer lacked, and the fixed notice
 * itself is a seed record, so the diagnostic cannot be a record's text. It states the one input the
 * demonstration is missing for a question outside its script: a seeded question that covers it. The
 * string is a diagnostic line the assistant's expander lists, never a second answer sentence.
 */
const UNSCRIPTED_MISSING_INPUT =
  'A seeded question covering the one asked, which the demonstration does not hold.';

/* ---------------------------------------------------------------------------------------------
 * B. Looking a cited reference up in the record set — rule P-2
 * ------------------------------------------------------------------------------------------- */

/**
 * Finds one exception record, or nothing when the record set holds no such identifier.
 *
 * `noUncheckedIndexedAccess` makes the miss of an array lookup explicit at every site, so each lookup
 * below states the miss as a return value and the caller decides what an unresolved reference means.
 * For an answer that meaning is uniform: withhold it and return the notice, rather than cite a record
 * that is not there.
 *
 * @param records - The session's record set.
 * @param identifier - The exception identifier the question cites.
 * @returns The record, or `undefined` when the set holds none with that identifier.
 */
function findException(records: SeedRecordSet, identifier: string): OperationalException | undefined {
  return records.exceptions.find((record) => record.id === identifier);
}

/**
 * Finds one document record, or nothing when the record set holds no such identifier.
 *
 * @param records - The session's record set.
 * @param identifier - The document identifier the question cites.
 * @returns The record, or `undefined` when the set holds none with that identifier.
 */
function findDocument(records: SeedRecordSet, identifier: string): DocumentBody | undefined {
  return records.documents.find((record) => record.id === identifier);
}

/**
 * Finds one part approval package record, or nothing when the record set holds no such identifier.
 *
 * @param records - The session's record set.
 * @param identifier - The package identifier the question cites.
 * @returns The record, or `undefined` when the set holds none with that identifier.
 */
function findPackage(records: SeedRecordSet, identifier: string): PpapPackage | undefined {
  return records.ppapPackages.find((record) => record.id === identifier);
}

/**
 * Finds one customer order record, or nothing when the record set holds no such identifier.
 *
 * @param records - The session's record set.
 * @param identifier - The order identifier the question cites.
 * @returns The record, or `undefined` when the set holds none with that identifier.
 */
function findCustomerOrder(records: SeedRecordSet, identifier: string): CustomerOrder | undefined {
  return records.customerOrders.find((record) => record.id === identifier);
}

/**
 * Finds one solver case record, or nothing when the record set holds no such reference.
 *
 * A case's reference is seed record content rather than a contracts §1 identifier, so it is matched
 * as the plain string `SolverCase.id` declares.
 *
 * @param records - The session's record set.
 * @param identifier - The case reference the question cites.
 * @returns The record, or `undefined` when the set holds none with that reference.
 */
function findSolverCase(records: SeedRecordSet, identifier: string): SolverCase | undefined {
  return records.solverCases.find((record) => record.id === identifier);
}

/**
 * Reports whether the record set holds the record one question reference names.
 *
 * The lookup each family needs is dispatched on the reference's own `kind`, so two identifiers that
 * happen to share a shape are never looked up in the wrong family: a reference is unresolved unless a
 * record of its own family carries its identifier.
 *
 * @param records - The session's record set.
 * @param record - One reference a question cites.
 * @returns `true` when the record behind the reference exists, `false` otherwise.
 */
function recordExists(records: SeedRecordSet, record: AssistantQuestionRecord): boolean {
  switch (record.kind) {
    case 'exception':
      return findException(records, record.id) !== undefined;
    case 'document':
      return findDocument(records, record.id) !== undefined;
    case 'package':
      return findPackage(records, record.id) !== undefined;
    case 'customer-order':
      return findCustomerOrder(records, record.id) !== undefined;
    case 'solver-case':
      return findSolverCase(records, record.id) !== undefined;
  }
}

/**
 * The identifiers one question cites of one record family, in the order the question lists them.
 *
 * The order matters twice: an answer's citations appear in the order its question declares, and the
 * first member of a family is the one a sentence that names a single record refers to.
 *
 * @param question - The seeded question whose references are read.
 * @param kind - The record family to collect.
 * @returns The identifiers of that family, in the question's own order.
 */
function citedIdentifiers(question: AssistantQuestion, kind: AssistantQuestionRecordKind): string[] {
  const identifiers: string[] = [];

  for (const record of question.records) {
    if (record.kind === kind) {
      identifiers.push(record.id);
    }
  }

  return identifiers;
}


/* ---------------------------------------------------------------------------------------------
 * C. Citations — contracts §10, rule P-1
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the citations behind one answer: one per record the seeded question declares, in the order
 * it declares them.
 *
 * Each citation carries the reference the question gives, the source that family of record comes from
 * and that source's freshness as the session reports it now, so a stale or unavailable source shows as
 * stale in the answer rather than as the state a record was authored with (rule P-1: every figure the
 * answer states stays openable, with the currency of its source beside it).
 *
 * A reference the record set does not hold, or a source the freshness report does not carry, makes the
 * whole citation list unresolvable. The caller then withholds the answer: an answer citing a record
 * that is not there would be worse than the notice that says nothing stands behind it.
 *
 * @param records - The session's record set.
 * @param question - The seeded question whose answer is being built.
 * @param freshness - The freshness of every source, as the session reports it.
 * @returns The citations, or `undefined` when one of them cannot be resolved.
 */
function citationsFor(
  records: SeedRecordSet,
  question: AssistantQuestion,
  freshness: readonly Freshness[],
): Citation[] | undefined {
  const citations: Citation[] = [];

  for (const record of question.records) {
    if (!recordExists(records, record)) {
      return undefined;
    }

    const source = SOURCE_BY_RECORD_KIND[record.kind];
    const current = freshness.find((entry) => entry.source === source);

    if (current === undefined) {
      return undefined;
    }

    citations.push({ ref: record.id, source, freshness: current });
  }

  return citations;
}

/* ---------------------------------------------------------------------------------------------
 * D. The values a template's tokens are filled with — AAP 0.8, rule P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * One identifier reduced to its letters and digits, in lower case, for comparing an identifier inside
 * a token with the identifier a record carries.
 *
 * A template spells an order's identifier in the sentence's own casing and without the hyphens the
 * record writes, so the comparison has to fold both differences. Nothing else about the identifier is
 * changed: two identifiers that differ in a letter or a digit stay distinct.
 *
 * @param identifier - The identifier to fold, or the identifier part of a token.
 * @returns The identifier as lower-case letters and digits only.
 */
function compactIdentifier(identifier: string): string {
  return identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * The first record of one family a question cites, resolved against the record set.
 *
 * A sentence that names one record of a family refers to the family's first citation, which is the
 * order the question declares its references in. A family the question does not cite resolves to
 * nothing, and so does a citation whose record is missing — either way the token that needed it stays
 * unresolved and the answer is withheld rather than filled from another record.
 *
 * @param records - The session's record set.
 * @param question - The seeded question whose answer is being built.
 * @param kind - The record family to read.
 * @returns The record, or `undefined` when the question cites none of that family or it is missing.
 */
function firstCited(
  records: SeedRecordSet,
  question: AssistantQuestion,
  kind: 'exception',
): OperationalException | undefined;
function firstCited(
  records: SeedRecordSet,
  question: AssistantQuestion,
  kind: 'document',
): DocumentBody | undefined;
function firstCited(
  records: SeedRecordSet,
  question: AssistantQuestion,
  kind: 'package',
): PpapPackage | undefined;
function firstCited(
  records: SeedRecordSet,
  question: AssistantQuestion,
  kind: AssistantQuestionRecordKind,
): OperationalException | DocumentBody | PpapPackage | undefined {
  const [identifier] = citedIdentifiers(question, kind);

  if (identifier === undefined) {
    return undefined;
  }

  switch (kind) {
    case 'exception':
      return findException(records, identifier);
    case 'document':
      return findDocument(records, identifier);
    case 'package':
      return findPackage(records, identifier);
    default:
      return undefined;
  }
}

/**
 * The case a question's measurements are taken against: the one it cites, or the seeded baseline.
 *
 * AAP 0.8 fixes the baseline as the named case with both levers at zero, and the seeded constants name
 * that case instead of a case reference being typed anywhere (rule P-6). A question that cites a case
 * is measured against the case it cites, so an answer can never report one option's figures under
 * another case's name; a question that cites none falls back to the seeded baseline.
 *
 * @param records - The session's record set.
 * @param question - The seeded question whose answer is being built.
 * @returns The case record, or `undefined` when the record set holds neither the cited nor the baseline
 *   case.
 */
function caseFor(records: SeedRecordSet, question: AssistantQuestion): SolverCase | undefined {
  const [citedCase] = citedIdentifiers(question, 'solver-case');

  return findSolverCase(records, citedCase ?? records.baselineCaseId);
}

/**
 * The log line for one solver measurement, as the assistant's expander lists it.
 *
 * It names the function the module called, the case it was measured against and the two lever values
 * it was measured with, so a reader can see which measurement a figure came from without reading this
 * module's code. The lever values are the ones the solver echoed back, so the line reports what was
 * measured rather than what was requested.
 *
 * @param caseRecord - The case that was measured.
 * @param levers - The levers the measurement was taken under, as the result echoed them.
 * @returns One entry for the answer's `queriesRun` list.
 */
function solverQuery(caseRecord: SolverCase, levers: Levers): string {
  const air = renderCount(levers.airSets);
  const transfer = renderCount(levers.transferSets);

  return `solveSupplyDelay ${caseRecord.id} airSets=${air} transferSets=${transfer}`;
}

/**
 * Renders one count for a sentence: a whole number of units, kits or orders, as the record holds it.
 *
 * @param value - The count to render.
 * @returns The count in digits, with no grouping and no unit of its own.
 */
function renderCount(value: number): string {
  return String(value);
}

/**
 * Renders one amount for a sentence, with the grouping and at most two decimals the prose convention
 * uses and without a currency marker (see the OPEN ITEM on the marker in the module header).
 *
 * @param value - The amount to render. It arrives already rounded to the scale `Money` carries.
 * @returns The grouped amount.
 */
function renderAmount(value: number): string {
  return AMOUNT_PROSE.format(value);
}

/**
 * The units one cited customer order is left late by the measurement a question asks about.
 *
 * The order is found by folding the token's identifier part and each cited order's identifier to the
 * same form, so a token spelled in the sentence's casing resolves to the record it names. The measure
 * itself comes from the order's own row in the solver's result: no aggregate is read and no unit count
 * is derived here, because the solver owns every per-order measure (contracts §4 rules 6 to 8).
 *
 * @param question - The seeded question whose answer is being built.
 * @param identifierPart - The identifier the token carries, without the family prefix.
 * @param measure - The measurement to read the order's row from, resolved on first use.
 * @returns The units late, rendered, or `undefined` when the token names no cited order or the
 *   measurement cannot be taken.
 */
function unitsLateOf(
  question: AssistantQuestion,
  identifierPart: string,
  measure: () => SolverResult | undefined,
): string | undefined {
  const folded = compactIdentifier(identifierPart);
  const identifier = citedIdentifiers(question, 'customer-order').find(
    (candidate) => compactIdentifier(candidate) === folded,
  );

  if (identifier === undefined) {
    return undefined;
  }

  const result = measure();

  if (result === undefined) {
    return undefined;
  }

  const row = result.orders.find((entry) => entry.orderId === identifier);

  return row === undefined ? undefined : renderCount(row.unitsLate);
}

/**
 * The readiness of one part approval package: its passing elements over its full element set, rounded
 * half up to a whole percent, which is the one readiness rule the codebase applies (contracts §5).
 *
 * A package with no elements has no readiness to report rather than a readiness of zero, so the token
 * stays unresolved and the answer is withheld instead of stating a figure nothing supports.
 *
 * @param packageRecord - The package the question cites.
 * @returns The readiness with its percent mark, or `undefined` when the package carries no element.
 */
function packageReadinessOf(packageRecord: PpapPackage): string | undefined {
  if (packageRecord.elements.length === 0) {
    return undefined;
  }

  const passing = packageRecord.elements.filter((element) => element.state === 'pass').length;

  return `${wholePercent(passing / packageRecord.elements.length)}%`;
}

/**
 * The value the deferred kits carry, composed from the records the question cites.
 *
 * The solver reports how many kits a transfer pushes past their own dates but no value for them,
 * because a case carries no price; the value is composed in the adapter layer AAP 0.8 assigns it to,
 * by valuing those kits at the unit price of the customer order the deferral holds up — the one order
 * carrying exactly that many kits at the plant the cited exception names. `halfUp2` closes the product
 * at the scale `Money` carries, so a price with decimals cannot leave a trailing artifact in the
 * sentence.
 *
 * A record set in which that order is not uniquely identifiable leaves the token unresolved, and the
 * answer is withheld rather than valued against the wrong order.
 *
 * @param records - The session's record set.
 * @param question - The seeded question whose answer is being built.
 * @param kitsDelayed - The kits the transfer defers, as the solver measured them.
 * @returns The composed amount, rendered, or `undefined` when the deferred order cannot be identified.
 */
function deferredValueOf(
  records: SeedRecordSet,
  question: AssistantQuestion,
  kitsDelayed: number,
): string | undefined {
  const exception = firstCited(records, question, 'exception');

  if (exception === undefined) {
    return undefined;
  }

  const candidates = records.customerOrders.filter(
    (order) => order.quantity === kitsDelayed && order.plantId === exception.plantId,
  );
  const [deferredOrder] = candidates;

  if (deferredOrder === undefined || candidates.length > 1) {
    return undefined;
  }

  return renderAmount(halfUp2(kitsDelayed * deferredOrder.unitPriceEur));
}

/**
 * The label of the catalogue entry the model selector offers before the user chooses.
 *
 * The entry is the catalogue's own default, matched by identifier, so the sentence names a record the
 * selector actually lists. No model is connected and none is called: the label identifies the entry a
 * deployment would compose an answer behind, and the sentence states that no model stands behind these
 * answers (rule P-1).
 *
 * @param records - The session's record set.
 * @returns The entry's label, or `undefined` when the catalogue's default names no entry it lists.
 */
function defaultModelLabelOf(records: SeedRecordSet): string | undefined {
  const { models, defaultModelId } = records.modelCatalogue;

  return models.find((entry) => entry.id === defaultModelId)?.label;
}

/**
 * The resolver one template is filled with: a function from a token to the value it states, or to
 * nothing when the value cannot be computed in this session.
 *
 * The two solver measurements a question may need are taken at most once per fill and remembered, so a
 * sentence that reports two orders' lateness takes one measurement rather than one per order, and the
 * query log records one entry per measurement actually taken. The measurements are local to the fill:
 * nothing survives a call, so one answer can never report a figure measured for another.
 *
 * @param ctx - The handler context the answer is built for: the session's records, and nothing else.
 * @param question - The seeded question whose answer is being built.
 * @param queries - The query log the fill appends each measurement to, in the order it takes them.
 * @returns The resolver to hand to the template filler.
 */
function placeholderResolver(
  ctx: HandlerContext,
  question: AssistantQuestion,
  queries: string[],
): (placeholder: string) => string | undefined {
  const { records } = ctx.state;

  let baseline: SolverResult | undefined;
  let transferred: SolverResult | undefined;

  const measureBaseline = (): SolverResult | undefined => {
    if (baseline !== undefined) {
      return baseline;
    }

    const caseRecord = caseFor(records, question);

    if (caseRecord === undefined) {
      return undefined;
    }

    baseline = solveSupplyDelay(caseRecord, {
      airSets: NO_RECOVERY_SETS,
      transferSets: NO_RECOVERY_SETS,
    });
    queries.push(solverQuery(caseRecord, baseline.levers));

    return baseline;
  };

  const measureTransfer = (): SolverResult | undefined => {
    if (transferred !== undefined) {
      return transferred;
    }

    const caseRecord = caseFor(records, question);

    if (caseRecord === undefined) {
      return undefined;
    }

    // The largest transfer the case admits is the quantity its own bound fixes, so the seeded sentence
    // describes the option the comparison screen shows rather than a quantity chosen here (rule P-6).
    transferred = solveSupplyDelay(caseRecord, {
      airSets: NO_RECOVERY_SETS,
      transferSets: caseRecord.transferSets.max,
    });
    queries.push(solverQuery(caseRecord, transferred.levers));

    return transferred;
  };

  const transferredKits = (): number | undefined => {
    const result = measureTransfer();

    if (result === undefined) {
      return undefined;
    }

    const [effect] = result.sideEffects;

    return effect === undefined ? undefined : effect.kitsDelayed;
  };

  return (placeholder: string): string | undefined => {
    const foldedName = placeholder.toLowerCase();

    if (foldedName.startsWith(UNITS_LATE_TOKEN_PREFIX)) {
      return unitsLateOf(question, placeholder.slice(UNITS_LATE_TOKEN_PREFIX.length), measureBaseline);
    }

    switch (foldedName) {
      case PLACEHOLDER_TOKENS.whatChanged:
        return firstCited(records, question, 'exception')?.whatChanged;

      case PLACEHOLDER_TOKENS.missingInputs: {
        const missing = firstCited(records, question, 'exception')?.missingInputs ?? [];

        return missing.length === 0 ? undefined : missing.join(LIST_SEPARATOR);
      }

      case PLACEHOLDER_TOKENS.documentTerms:
        return firstCited(records, question, 'document')?.body;

      case PLACEHOLDER_TOKENS.packageReadiness: {
        const packageRecord = firstCited(records, question, 'package');

        return packageRecord === undefined ? undefined : packageReadinessOf(packageRecord);
      }

      case PLACEHOLDER_TOKENS.kitsDelayed: {
        const kits = transferredKits();

        return kits === undefined ? undefined : renderCount(kits);
      }

      case PLACEHOLDER_TOKENS.valueDeferredEur: {
        const kits = transferredKits();

        return kits === undefined ? undefined : deferredValueOf(records, question, kits);
      }

      case PLACEHOLDER_TOKENS.modelLabel:
        return defaultModelLabelOf(records);

      case PLACEHOLDER_TOKENS.simulationLabel:
        return SIMULATED_DATA_LABEL;

      default:
        return undefined;
    }
  };
}

/* ---------------------------------------------------------------------------------------------
 * E. The two exports — the ask, and the notice outside the script
 * ------------------------------------------------------------------------------------------- */

/**
 * Fills one seeded sentence, replacing each `{token}` with the value its resolver returns.
 *
 * The pattern is built per call rather than once at module level, because a shared global pattern
 * carries the position of its last match between calls and a second fill would then start part-way
 * through a template. When any token has no value the whole fill fails: the caller returns the notice
 * instead of a sentence holding a raw brace token or a blank where a figure belongs (rule P-6).
 *
 * @param template - The seeded sentence, with its values left as `{token}`.
 * @param resolve - The resolver for one token's name.
 * @returns The filled sentence, or `undefined` when any token could not be resolved.
 */
function fillTemplate(
  template: string,
  resolve: (placeholder: string) => string | undefined,
): string | undefined {
  const pattern = /\{([A-Za-z0-9_]+)\}/g;
  let resolved = true;

  const text = template.replace(pattern, (_match: string, placeholder: string) => {
    const value = resolve(placeholder);

    if (value === undefined) {
      resolved = false;

      return '';
    }

    return value;
  });

  return resolved ? text : undefined;
}

/**
 * Builds one scripted answer for a question the record set holds.
 *
 * The answer is the seeded sentence filled from computed values, cited from the question's own record
 * references, and logged with the records it read and the measurements it took. It reports the
 * catalogue's default model as the entry the panel offers and states no missing input: a scripted
 * answer either resolves every value its sentence needs or is withheld entirely, so a partial answer
 * never reaches the screen.
 *
 * @param ctx - The handler context the answer is built for.
 * @param question - The seeded question to answer.
 * @returns The answer, or `undefined` when a citation or a value could not be resolved.
 */
function scriptedAnswer(ctx: HandlerContext, question: AssistantQuestion): Answer | undefined {
  const citations = citationsFor(ctx.state.records, question, freshnessFor(ctx.state));

  if (citations === undefined) {
    return undefined;
  }

  const queries = question.records.map((record) => `${record.kind} ${record.id}`);
  const text = fillTemplate(question.template, placeholderResolver(ctx, question, queries));

  if (text === undefined) {
    return undefined;
  }

  return {
    text,
    citations,
    queriesRun: queries,
    modelId: ctx.state.records.modelCatalogue.defaultModelId,
    partial: false,
    missing: [],
  };
}

/**
 * Answers one of the six scripted questions, or returns the fixed notice for anything else.
 *
 * A question whose identifier the record set does not hold gets the notice; so does a scripted
 * question whose sentence cannot be filled from the records this session carries, because a value the
 * records cannot settle is a gap to state rather than a figure to approximate (rule P-6).
 *
 * Policy is not evaluated here: the model-boundary rule runs over a question's context in the
 * assistant's handler before an answer is built (AAP 0.12.3), so this function is only ever reached
 * by a question the policy engine allowed.
 *
 * @param ctx - The handler context the answer is built for: the session's records and the persona the
 *   call acts as.
 * @param questionId - The identifier of the suggested question the panel submitted.
 * @returns The scripted answer, or the notice when the question lies outside the script.
 */
export function answerQuestion(ctx: HandlerContext, questionId: string): Answer {
  const question = ctx.state.records.assistantQuestions.find((entry) => entry.id === questionId);

  if (question === undefined) {
    return unscriptedAnswer(ctx);
  }

  return scriptedAnswer(ctx, question) ?? unscriptedAnswer(ctx);
}

/**
 * The one answer the demonstration gives to a question outside its script.
 *
 * The text is the seeded notice, character for character and with nothing around it: no prefix, no
 * suffix and no paraphrase, because it is the interface's own statement that no model stands behind the
 * panel (rule P-1). It cites no record, because it answers nothing from the records; it runs no query,
 * because it read none; and its `missing` list names the one input the demonstration would need to
 * answer at all, which is what makes `partial` true — the type's own invariant, since that member is
 * true exactly when the list is not empty.
 *
 * The model it names is the catalogue's default entry, the one the selector offers: no model composed
 * this text, and the identifier is the record's own rather than one typed here.
 *
 * @param ctx - The handler context the answer is built for.
 * @returns The fixed notice with the diagnostic naming what a real answer would need.
 */
export function unscriptedAnswer(ctx: HandlerContext): Answer {
  return {
    text: UNSCRIPTED_NOTICE,
    citations: [],
    queriesRun: [],
    modelId: ctx.state.records.modelCatalogue.defaultModelId,
    partial: true,
    missing: [UNSCRIPTED_MISSING_INPUT],
  };
}

