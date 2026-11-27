/**
 * The assistant family of the in-browser mock adapter: the suggested questions SCR-06 offers, the
 * model catalogue its selector lists, and the one path a question takes — the policy evaluation that
 * runs before an answer exists, and the scripted builder that runs only when it allowed one.
 *
 * Fixing inputs:
 * - AAP 0.12.1's "Handlers" row — one module per read/write family, so the adapter stays a thin
 *   dispatcher and the permission and policy checks appear once per family — at the path AAP 0.13.1
 *   gives it in the `handlers/` tree. The same row fixes this module's duty: it "answers one question:
 *   evaluates POL-007 **before** any answer, and on a block returns `policyId`, the plain reason,
 *   `permittedAlternative` and the appended policy-actor `auditEventId`; otherwise delegates to
 *   `../assistant-script.ts`. The model catalogue select and the in-boundary alternative come from the
 *   records."
 * - AAP 0.8, "The assistant's numbers are computed the same way, and the fixed text has one owner":
 *   the six questions, their sentences and every figure a sentence carries belong to
 *   `src/seed/assistant-questions.ts` and to the builders in `../assistant-script.ts`, so this module
 *   writes no question, no sentence and no number of its own.
 * - AAP 0.6.3: the catalogue's entries are placeholders and no model is connected, so a question the
 *   policy forbids is refused before an answer is composed, and the in-boundary entry is the
 *   alternative that refusal offers.
 * - AAP 0.12.3, `POST /assistant/queries`: "POL-007 is evaluated before any answer; a block returns
 *   `policyId`, `permittedAlternative` and `auditEventId` and appends a policy-actor event".
 * - AAP 0.2.1: message-level redaction inside the mock backend — USR-04 cannot open the body of a
 *   customer-confidential document — which reaches this path too, because a seeded question's
 *   template quotes a document's own terms. The verdict is the evidence family's
 *   (`mayReadDocumentBody`), not a second statement of the rule.
 * - `platform-contracts.md` §10 (the assistant's answer: text, citations, queries run, model,
 *   `partial`, `missing`), §7.2 (the policies that govern a question), §7.1 (who may read the
 *   assistant) and §6 (the audited actions).
 *
 * WHAT IT DOES, IN THE ORDER IT DOES IT. Every entry point refuses first: the simulation popover's
 * forbidden trigger and the contracts §7.1 matrix are both evaluated before a record is read, so a
 * control a reader bypassed in the interface gains nothing here. `askAssistant` then resolves the
 * question and the model entry, derives the material the question carries, asks
 * `src/domain/policy/evaluate.ts` for a decision, and only an allowed question reaches a builder. A
 * denial appends one policy-actor event and throws the `Problem` the block card renders; an allowed
 * question then has the documents it cites checked against the body redaction of the evidence family,
 * and only a question whose cited bodies the acting persona may read appends one `assistant question`
 * event and returns the builder's answer.
 *
 * THE ANSWER PATH APPLIES THE SAME MESSAGE-LEVEL REDACTION THE DOCUMENT READ DOES — AAP 0.2.1,
 * AAP 0.12.3. `getDocument` withholds a customer-confidential body from a persona without
 * `document.confidential.read`, and one seeded question's template quotes a cited document's terms, so
 * an answer is the second path that could carry a body over the boundary. It is gated on the same rule
 * through `mayReadDocumentBody`, imported from the evidence family rather than restated: every
 * document the matched question cites is resolved in the session's records, and where the predicate
 * refuses one, the question is refused with a `'permission'` failure naming the document, its
 * classification, the acting role and the permission that would release it. The refusal quotes no body
 * text, the withheld body is never read into an answer, and no answer is composed for a question
 * refused this way. A question outside the six cites no document, so the notice still answers it.
 *
 * WHY THAT GATE SITS AFTER THE POLICY DECISION, AND WHY THE BUILDER CONSULTS NO PERMISSION. A question
 * the model-boundary rule blocks must still return the block card — the rule, the plain reason, the
 * permitted alternative and the event the refusal appended — because that card is the demonstration's
 * own account of POL-007 and the one-click switch to the in-boundary model hangs on it; a redaction
 * refusal reaching the screen first would replace that explanation with a different one. So the policy
 * decides first, and only a question the policy allowed reaches the redaction gate. The builders stay
 * permission-free by design (AAP 0.12.1's assistant-builder row: they fill a template and evaluate
 * nothing), which is why the check lives here, once, beside the other refusal this family makes.
 *
 * WHY THE APPEND COMES BEFORE THE THROW. The `Problem` carries the identifier of the event the refusal
 * itself recorded, and the block card opens that record (AAP 0.8, AAP 0.12.4). Throwing first would
 * hand the screen an identifier for an event that does not exist yet, so the event is appended and
 * then reported. Exactly one event is appended per policy refusal: the refusal is recorded by the
 * mechanism that made it, and a second copy beside it would say the same thing twice. A permission
 * refusal appends nothing here, as every other permission refusal of this adapter appends nothing.
 *
 * WHAT A QUESTION'S CONTEXT IS, AND WHERE IT COMES FROM. The engine reads one classification and one
 * residency for a question, so the documents the question runs over are gathered from three record
 * sources in a fixed order — the documents a suggested question cites, the references the caller
 * passed with the question, and the document identifiers the question text itself names — and each is
 * looked up in the record set. The pair handed to the engine is then read from that first document.
 * Everything here is a record value: this module names no classification, no residency, no model and no
 * endpoint of its own.
 *
 * THE CONTEXT PAIR IS THE FIRST DOCUMENT'S. "The highest classification among the documents the
 * question carries", which `AssistantQueryContext` documents as the member's meaning, is not computable
 * here: `Classification` and `Residency` are open `string` aliases in `src/types/entities.ts` with no
 * ranking, and no record fixes one, so the pair the engine reads is the first document in the order
 * above rather than an ordering this module invents. Every seeded question that names a document names
 * exactly one, so the demonstration's own questions are unambiguous.
 *
 * WHY A BLOCK'S OBJECT REFERENCE IS THE ENTRY'S DECLARED ENDPOINT. The outbound ledger counts a
 * policy's blocked events over the endpoints the sovereignty record declares, grouping them by
 * `objectRef` (AAP 0.6.3, AAP 0.8), and the seeded POL-007 block is recorded that way: its object is
 * the endpoint an attempt would have reached, with the model identifier in its payload. So a refusal
 * here records the refused entry's declared `endpoint` as its object reference and is therefore
 * counted on that endpoint's ledger row, while `blockEventPayload` keeps the model identifier and the
 * boundary in the event's payload, which is what the block card's event needs to name the model. The
 * value is the record's, read from the catalogue entry and never typed here (rule P-6); an entry that
 * declares no endpoint cannot be counted anywhere, so `policyBlockRefusal` throws instead of falling
 * back to the model identifier, which no ledger row matches. The `assistant question` events keep the
 * model identifier as their object, because a question that was answered was put to a model and
 * reaches no destination.
 *
 * THE ONE MEMBER THIS MODULE SETS ON THE BUILDER'S ANSWER — `modelId`. The builders stamp the
 * catalogue's default entry on every answer they compose, while the question was put to the entry the
 * caller selected. The port documents the member as the model that composed the answer, the selector
 * shows the chosen entry, and the event appended below records that same identifier, so the answer is
 * returned with `modelId` replaced by the resolved entry and every other member — the text, the
 * citations, the queries run, the `partial` flag and the `missing` inputs — exactly as the builder
 * returned it. A message that named the default entry while the event named the chosen one would have
 * the two records of one call disagree.
 *
 * WHAT IT DELIBERATELY DOES NOT DO. It composes no answer: the sentences and the figures are the
 * seeded templates and the script's arithmetic, so a question the script cannot fill returns the
 * seeded notice instead of a number invented here (rule P-6). It evaluates no permission rule of its
 * own — the matrix is `src/domain/policy/permissions.ts`, called rather than restated — and no policy
 * of its own, because the engine decides and this module only reports the decision. It renders
 * nothing, holds no state between calls, and reaches records only through the `HandlerContext` the
 * adapter builds.
 *
 * DETERMINISTIC BY CONSTRUCTION. The answer is a function of the session's records and the question
 * asked: no clock, no random source, no module-level mutable value and no platform global is read, and
 * the one identifier a call carries is minted once by the adapter, from the ticket it took at the
 * call's entry (AAP 0.18.2). A repeated question therefore yields the same answer words for words, and
 * only the appended events advance the chain.
 *
 * Rules this module is built to satisfy:
 * - P-6: no figure, currency amount, scenario measure, record identifier, model identifier or sentence
 *   is typed below. Every value an answer reports comes from a record or from the script's arithmetic,
 *   and `tests/fixtures/` is neither held nor read here.
 * - P-1: no label is typed. No model is connected, no sentence claims one is, and the unscripted notice
 *   is the seeded record's own text, returned by the builder rather than reproduced here.
 * - P-2: records arrive through `ctx.state` and the sibling `../seed-loader.ts`; `src/seed/`, React,
 *   `src/app`, `src/features` and the API client are never imported, and only `mock-backend.ts` imports
 *   this module.
 * - P-3, P-8: the permission refusal names the permission the role lacks and the roles that hold it,
 *   and the policy refusal carries the rule, its reason, the alternative it permits and the event it
 *   recorded — which is what the block card and the disabled control explain instead of merely
 *   refusing. Both checks run in the browser of a build with no backend, so they are a demonstration
 *   control and not production authorisation.
 * - P-4: nothing below claims that a policy establishes anything beyond the verdict it returned, and
 *   the failing controls are described as the records describe them.
 * - P-5: every record consulted is a first-party one, so no answer blends a market-intelligence figure
 *   with a first-party one.
 * - P-7: the only names reachable from here are the seed's synthetic records; no company, site, product
 *   or person is named in this file.
 * - B-1, B-2: no address is opened (no model endpoint exists to open) and nothing here reads
 *   configuration or carries a credential.
 * - B-3: no markup is produced here; the block card and the panel own the accessible rendering.
 * - No test hook: nothing here reads a query parameter, a global flag or `window`.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the engine, the matrix, the shared types, the one door to the seed (rule P-2)
 * ------------------------------------------------------------------------------------------- */

import { evaluate } from '../../../domain/policy/evaluate';
import type { AssistantQueryContext, PolicyRecords } from '../../../domain/policy/evaluate';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import type {
  Answer,
  AuditAction,
  AuditPayload,
  DocumentBody,
  ModelCatalogue,
  ModelEntry,
  Permission,
  PolicyDecision,
  PolicyId,
  Problem,
  SuggestedQuestion,
} from '../../../types';
import { answerQuestion, unscriptedAnswer } from '../assistant-script';
import type { AssistantQuestion, SeedRecordSet } from '../seed-loader';
import type { HandlerContext } from '../mock-state';
import { demonstrationForbiddenReason, isSimulationOn } from '../simulation';
import { appendAuditEvent } from './audit';
import { DOCUMENT_CONFIDENTIAL_READ, mayReadDocumentBody } from './evidence';

/* ---------------------------------------------------------------------------------------------
 * The permission and the two audited actions — contracts §7.1 and §6
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission every entry point requires: the evidence read of contracts §7.1.
 *
 * Named once so the check, the `Problem` field and the sentence describing the refusal all quote one
 * value. `src/domain/policy/permissions.ts` grants it to all eight seeded roles, because every figure a
 * screen shows opens its evidence; the check is stated anyway, because the matrix is the authority on
 * who may read and this module is not (AAP 0.6.2, rule P-3).
 */
const EVIDENCE_READ: Permission = 'evidence.read';

/**
 * The action a question that was answered records, spelled as contracts §6 and the seeded trail spell
 * it: an `assistant question` names the model entry the question was put to.
 */
const ASSISTANT_QUESTION_ACTION: AuditAction = 'assistant question';

/**
 * The action a refusal records, spelled as contracts §6 and the seeded trail spell it: a
 * `policy block` is appended by the mechanism that made the decision, with the rule as its actor.
 */
const POLICY_BLOCK_ACTION: AuditAction = 'policy block';

/* ---------------------------------------------------------------------------------------------
 * The input this handler publishes, and the suggestion it hands over — AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * One question as a caller may put it to `askAssistant`.
 *
 * Declared here rather than in `src/types` because the shared vocabulary holds no assistant-request
 * shape and inventing one there would put a handler's calling convention in the folder every screen
 * imports; `AuditWriteDraft` in `./audit.ts` uses the same arrangement. The members mirror what the
 * port's `askAssistant` request carries, so the adapter can hand its arguments straight through. The
 * suggestion the panel lists is a different matter and travels as `SuggestedQuestion` from
 * `src/types/screen-dto.ts`, because the port resolves that read (rule P-2).
 */
export interface AssistantQueryInput {
  /**
   * The identifier of the suggested question that was submitted, such as the identifier
   * `listSuggestedQuestions` published for it.
   *
   * Omitted when the reader typed a question of their own, in which case `text` carries it.
   */
  questionId?: string | undefined;

  /**
   * The question as it was asked: the text of a suggested question the panel submitted, or the reader's
   * own words.
   *
   * It is read for three things and no more: matching a suggested question by its own prompt when no
   * identifier was supplied, naming a document record the text mentions so the policy sees the
   * material the question carries, and refusing a request that carries no question at all. No word of
   * it reaches an answer, because every answer's wording belongs to the seeded template.
   */
  text?: string | undefined;

  /**
   * The model the selector has chosen, as the catalogue identifies it.
   *
   * The entry's own `boundary` is what the policy reads, so an identifier the catalogue does not hold
   * is refused as a not-found rather than evaluated (contracts §7.2).
   */
  modelId: string;

  /**
   * The records the question runs over, as the port's own `askAssistant` request carries them.
   *
   * Optional, because a question from the panel's list already names its records. A reference that
   * names a document record adds that document to the context the policy reads, which is how a caller
   * stating "this question is about that document" reaches the model-boundary rule.
   */
  contextRefs?: readonly string[] | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The refusal every entry point shares — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission failure a read of the assistant family is refused with.
 *
 * Composed as a plain `Problem` object so a caller narrows on `type` and reads the cause without
 * unwrapping an `Error`, and it carries the two members the forbidden card renders: the permission the
 * acting role lacks and the roles that hold it, taken from `rolesWith` so the explanation cannot drift
 * from the matrix that decided the refusal (rule P-8).
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param message - The reason, in the plain words the cause warrants.
 * @returns The `Problem` to throw.
 */
function evidenceReadProblem(ctx: HandlerContext, message: string): Problem {
  return {
    type: 'permission',
    message,
    traceId: ctx.traceId,
    requiredPermission: EVIDENCE_READ,
    rolesWithPermission: rolesWith(EVIDENCE_READ),
  };
}

/**
 * Refuses the call unless the acting persona may read the assistant.
 *
 * Two ways to be refused, each reported with the reason that is true of it, so a screen's forbidden
 * card explains the state it is in rather than one sentence stretched over two causes: the simulation
 * popover's forbidden trigger refuses every entry point while it is set, and the persona's role
 * otherwise has to hold the permission. The trigger is checked first because it stands for a
 * session-wide refusal rather than for a fact about the role (AAP 0.12.1's simulation row).
 *
 * The assistant is not plant-scoped — a question is about records rather than about one plant — so the
 * permission is evaluated with no subject.
 *
 * @param ctx - The call's context: the persona the check is made for and the state its triggers are read from.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function requireEvidenceRead(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw evidenceReadProblem(
      ctx,
      demonstrationForbiddenReason(ctx.actor.role, EVIDENCE_READ),
    );
  }

  if (!hasPermission(ctx.actor.role, EVIDENCE_READ, null, ctx.actor)) {
    throw evidenceReadProblem(
      ctx,
      `The acting role (${ctx.actor.role}) does not hold the ${EVIDENCE_READ} permission, so the ` +
        'evidence assistant is not readable here.',
    );
  }
}

/**
 * The refusal a question carrying a body the acting persona may not read is answered with.
 *
 * Composed as `evidenceReadProblem` beside it is, so a forbidden card renders either cause the same
 * way, and it carries the members that card and a disabled control need: the permission the role lacks
 * and the roles that hold it, read from `rolesWith` rather than from a list written here (rule P-8).
 * The message names the document by the identifier the record states, the classification the record
 * states and the acting role, and it says plainly that the body was withheld before an answer was
 * composed. It quotes no part of the body, so the refusal cannot become the leak it reports.
 *
 * @param ctx - The call's context, whose trace the refusal carries.
 * @param document - The document the question cites whose body must be withheld.
 * @returns The `Problem` to throw.
 */
function withheldDocumentProblem(ctx: HandlerContext, document: DocumentBody): Problem {
  return {
    type: 'permission',
    message:
      `The question cites document ${document.id}, whose body is classified ` +
      `${document.classification}, and the acting role (${ctx.actor.role}) does not hold the ` +
      `${DOCUMENT_CONFIDENTIAL_READ} permission that releases it: the body was withheld before an ` +
      'answer was composed.',
    traceId: ctx.traceId,
    requiredPermission: DOCUMENT_CONFIDENTIAL_READ,
    rolesWithPermission: rolesWith(DOCUMENT_CONFIDENTIAL_READ),
  };
}

/**
 * Refuses a question whose cited documents the acting persona may not read — the answer path's half of
 * the redaction AAP 0.2.1 and AAP 0.12.3 require.
 *
 * Only the documents the matched question cites are judged: they are the records an answer is built
 * from, so they are the only ones that can carry a body into a template. A cited identifier the record
 * set does not hold is left to the builder, which withholds an answer it cannot cite rather than
 * composing one from a record that is not there.
 *
 * The verdict is `mayReadDocumentBody`'s, the evidence family's own rule, so this path and
 * `getDocument` cannot disagree about who may open a body.
 *
 * @param ctx - The call's context: the persona the answer would be composed for.
 * @param question - The suggested question the request matched, when it matched one.
 * @throws Problem - A `'permission'` failure naming the withheld document and the roles that hold the
 *   permission releasing it.
 */
function requireCitedDocumentBodies(
  ctx: HandlerContext,
  question: AssistantQuestion | undefined,
): void {
  if (question === undefined) {
    return;
  }

  for (const cited of question.records) {
    if (cited.kind !== 'document') {
      continue;
    }

    const document = ctx.state.records.documents.find((candidate) => candidate.id === cited.id);

    if (document !== undefined && !mayReadDocumentBody(ctx, document)) {
      throw withheldDocumentProblem(ctx, document);
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * The facts the policy engine reads — AAP 0.12.1, contracts §7.2
 * ------------------------------------------------------------------------------------------- */

/**
 * Assembles the record facts `evaluate` declares, from the session's own records.
 *
 * The engine is pure and reaches for no record it was not handed, so the caller supplies all three
 * members even though one question reads only the catalogue. Two of them are derived rather than
 * asserted: the outbound allowed list is every ledger endpoint the records declare as allowed, which
 * is how the seeded empty list comes to refuse every endpoint without a constant in the codebase, and the
 * approvals are the session's own, so a decision evaluated later reads the record the session holds
 * (contracts §7.2, AAP 0.10). Nothing is copied and nothing is written to.
 *
 * @param records - The session's record set.
 * @returns The facts the four evaluated rules read.
 */
function policyRecordsFor(records: SeedRecordSet): PolicyRecords {
  return {
    outboundAllowedList: records.sovereignty.ledger
      .filter((endpoint) => endpoint.state === 'allowed')
      .map((endpoint) => endpoint.endpoint),
    approvals: records.approvals,
    modelCatalogue: records.modelCatalogue,
  };
}

/**
 * Enforces the one invariant the catalogue's type cannot express.
 *
 * `src/types/models.ts` requires `defaultModelId` to name a member of `models`, and the module records
 * that "the mock adapter's handler enforces" it. A catalogue that broke it would let the selector stand
 * on an entry nothing describes, so this is a broken record set rather than a refused call: it throws
 * an `Error` that names the identifier and the entries the record set holds, both interpolated, exactly
 * as `src/services/mock/mock-state.ts` fails loudly when the record set holds no persona.
 *
 * @param catalogue - The catalogue about to be served.
 * @throws Error - The default entry names no member of the catalogue.
 */
function assertCatalogueResolves(catalogue: ModelCatalogue): void {
  const defaultEntry = catalogue.models.find((entry) => entry.id === catalogue.defaultModelId);

  if (defaultEntry === undefined) {
    throw new Error(
      `The model catalogue selects ${catalogue.defaultModelId} as its default entry and holds no ` +
        'such entry. The default must name one member of the model list the catalogue carries.',
    );
  }
}

/* ---------------------------------------------------------------------------------------------
 * The question and the material it carries — AAP 0.8, contracts §7.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The suggested question a request names, if it names one.
 *
 * An identifier is matched against the seeded questions first, which is the panel's own path. With no
 * identifier, the text is matched against the seeded prompts, because the panel submits a suggested
 * question as its own words: the port's request carries the question as text and no identifier, so
 * matching the record's own prompt is what keeps a suggested question on the scripted path rather than
 * falling through to the notice. Anything else — a question of the reader's own — resolves to nothing
 * and is answered with the notice.
 *
 * @param questions - The seeded questions, in the order the panel offers them.
 * @param questionId - The identifier the request carried, trimmed; empty when it carried none.
 * @param text - The question's text, trimmed; empty when it carried none.
 * @returns The matching question, or `undefined` when the request asked something outside the script.
 */
function seededQuestionFor(
  questions: readonly AssistantQuestion[],
  questionId: string,
  text: string,
): AssistantQuestion | undefined {
  if (questionId !== '') {
    return questions.find((question) => question.id === questionId);
  }

  if (text === '') {
    return undefined;
  }

  return questions.find((question) => question.prompt.trim() === text);
}

/**
 * The documents a question runs over, in the order the policy's single context pair is read from.
 *
 * Three record sources are gathered and each identifier is resolved against the record set: the
 * documents a suggested question cites, the references the caller supplied with the question, and the
 * document identifiers the question text itself names. Resolving rather than trusting the inputs is what
 * keeps a reference to a document the records do not hold out of the context — an absent record cannot
 * state a classification, and inventing one would put a fact in front of the policy that no record
 * supports. Duplicates collapse, so a document named by both its question and the caller's references
 * is judged once.
 *
 * @param records - The session's record set, which holds the document bodies.
 * @param question - The suggested question the request matched, when it matched one.
 * @param references - The references the caller supplied with the question.
 * @param text - The question's text, trimmed.
 * @returns The documents the question carries, in the order above.
 */
function contextDocumentsFor(
  records: SeedRecordSet,
  question: AssistantQuestion | undefined,
  references: readonly string[],
  text: string,
): DocumentBody[] {
  const identifiers: string[] = [];

  for (const cited of question?.records ?? []) {
    if (cited.kind === 'document') {
      identifiers.push(cited.id);
    }
  }

  for (const reference of references) {
    identifiers.push(reference.trim());
  }

  for (const document of records.documents) {
    if (text.includes(document.id)) {
      identifiers.push(document.id);
    }
  }

  const documents: DocumentBody[] = [];

  for (const identifier of identifiers) {
    const document = records.documents.find((candidate) => candidate.id === identifier);

    if (document !== undefined && !documents.includes(document)) {
      documents.push(document);
    }
  }

  return documents;
}

/**
 * The material context the policy engine reads for a question.
 *
 * A `null` member states that the question carries nothing of that kind, which the engine's own
 * contract distinguishes from an absent member: it is a fact the caller reports rather than one the
 * engine infers. Where the context carries more than one document, the pair comes from the first in
 * the order `contextDocumentsFor` gathers them: no ranking over `Classification` or `Residency` exists
 * to apply, and every seeded question that names a document names one, so the demonstration's own
 * questions are unambiguous without it.
 *
 * @param documents - The documents the question carries.
 * @returns The classification and residency the engine evaluates.
 */
function contextOf(documents: readonly DocumentBody[]): AssistantQueryContext {
  const [document] = documents;

  return {
    classification: document?.classification ?? null,
    residency: document?.residency ?? null,
  };
}

/**
 * The catalogue entry a request names, if the catalogue holds it.
 *
 * @param catalogue - The catalogue the selector was offered.
 * @param modelId - The identifier the request carried.
 * @returns The entry, or `undefined` when the catalogue holds no such model.
 */
function modelEntryFor(catalogue: ModelCatalogue, modelId: string): ModelEntry | undefined {
  return catalogue.models.find((entry) => entry.id === modelId);
}

/* ---------------------------------------------------------------------------------------------
 * The failures other than a refusal — contracts §2 `Problem`, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The failure a request that named no model is refused with.
 *
 * An identifier the catalogue does not hold is a not-found rather than a policy verdict: the engine
 * returns `notApplicable` for a model it cannot read a boundary from, and the service reports the
 * missing record (contracts §7.2). The message names the identifier asked for and the entries the
 * catalogue does hold, both interpolated, so a reader can correct the next attempt.
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param catalogue - The catalogue that was searched.
 * @param modelId - The identifier the request carried.
 * @returns The `Problem` to throw.
 */
function modelNotFoundProblem(
  ctx: HandlerContext,
  catalogue: ModelCatalogue,
  modelId: string,
): Problem {
  const offered = catalogue.models.map((entry) => entry.id).join(', ');

  return {
    type: 'not-found',
    message: `The model catalogue holds no entry ${modelId}. The entries it offers are ${offered}.`,
    traceId: ctx.traceId,
  };
}

/**
 * The failure a request carrying no question at all is refused with.
 *
 * A question arrives either as the identifier of a suggested question or as its text; with neither
 * there is nothing to answer, and returning the notice would report a question that was never asked.
 * The refusal is a validation failure, because it is the request and not the records that cannot be
 * honoured.
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @returns The `Problem` to throw.
 */
function questionRequiredProblem(ctx: HandlerContext): Problem {
  return {
    type: 'validation',
    message:
      'A question to the evidence assistant carries the identifier of a suggested question or the ' +
      'text that was asked; this request carried neither.',
    traceId: ctx.traceId,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The events a question records — contracts §6, AAP 0.6.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The payload a question's event carries: the entry it was put to and the documents it ran over.
 *
 * The shape follows the seeded trail's own `assistant question` events, which record the model and its
 * boundary, and adds the document identifiers only when the question carried documents — so an event and the
 * answer beside it describe one request, and neither states a value the records do not hold.
 *
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 * @returns The `after` half of the event's payload.
 */
function questionEventPayload(
  entry: ModelEntry,
  documents: readonly DocumentBody[],
): AuditPayload {
  const payload: AuditPayload = { modelId: entry.id, boundary: entry.boundary };

  if (documents.length > 0) {
    payload.context = documents.map((document) => document.id).join(', ');
  }

  return payload;
}

/**
 * The payload a policy block's event carries: the question's payload and the material that was refused.
 *
 * The seeded `policy block` events record the classification that kept a question from an external
 * model, so the refusal here records the same facts — which is what lets a reader open the block card's
 * event and see why the rule fired rather than only that it did.
 *
 * The model is named here rather than in the event's object reference, which names the endpoint the
 * blocked entry declares so the outbound ledger counts the block (AAP 0.6.3, AAP 0.8): `modelId` and
 * `boundary` travel unchanged from `questionEventPayload`, beside the classification and residency
 * that made the rule fire.
 *
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 * @returns The `after` half of the event's payload.
 */
function blockEventPayload(
  entry: ModelEntry,
  documents: readonly DocumentBody[],
): AuditPayload {
  const payload = questionEventPayload(entry, documents);
  const [document] = documents;

  if (document !== undefined) {
    payload.classification = document.classification;
    payload.residency = document.residency;
  }

  return payload;
}

/**
 * Appends the one event a question that was answered records.
 *
 * AAP 0.6.2 lists the assistant question among the audited writes, so every question that reaches an
 * answer — scripted or not — leaves a record of the entry it was put to. The outcome is `succeeded`
 * because the call was answered; a question the script could not answer still was.
 *
 * @param ctx - The call's context, whose chain is extended in place.
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 */
async function appendQuestionEvent(
  ctx: HandlerContext,
  entry: ModelEntry,
  documents: readonly DocumentBody[],
): Promise<void> {
  await appendAuditEvent(ctx, {
    action: ASSISTANT_QUESTION_ACTION,
    objectRef: entry.id,
    result: 'succeeded',
    before: null,
    after: questionEventPayload(entry, documents),
  });
}

/**
 * Records a policy's refusal and builds the failure the block card renders.
 *
 * The order is the whole point of the function: the event is appended first, through the one append
 * path of `./audit.ts`, so the `auditEventId` the `Problem` carries names a record that already exists
 * when the screen opens it. The event is a policy-actor event — the refusal is recorded by the
 * mechanism that made it — and it names the rule as its actor, as the seeded trail's own blocks do. The
 * rule, the reason and the permitted alternative are read from the engine's decision and reported
 * unchanged, so the card cannot disagree with the verdict that was taken and no reason is composed
 * here.
 *
 * The event's object reference is the endpoint the refused entry declares, not the entry's identifier,
 * because that is what the outbound ledger counts a block by (AAP 0.6.3, AAP 0.8): a block recorded
 * against a model identifier lands on no ledger row. The payload keeps the model identifier and the
 * boundary, so the event still says which model was refused for which destination.
 *
 * @param ctx - The call's context, whose chain is extended in place.
 * @param decision - The engine's denial.
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 * @returns The `'policy'` failure to throw.
 * @throws Error - The denial named no rule, which the engine never does; the refusal could not be
 *   reported without inventing the rule that caused it.
 * @throws Error - The entry declares no outbound endpoint, so the refusal has no ledger endpoint to be
 *   counted against; the model identifier is never used in its place.
 */
async function policyBlockRefusal(
  ctx: HandlerContext,
  decision: PolicyDecision,
  entry: ModelEntry,
  documents: readonly DocumentBody[],
): Promise<Problem> {
  const rule: PolicyId | undefined = decision.policyId;

  if (rule === undefined) {
    throw new Error(
      'The policy engine returned a denial without naming the rule that caused it, so the refusal ' +
        'cannot be reported. Every denial from src/domain/policy/evaluate.ts names its rule.',
    );
  }

  const endpoint: string | undefined = entry.endpoint;

  if (endpoint === undefined) {
    throw new Error(
      `The model catalogue entry ${entry.id} declares no outbound endpoint, so the policy block ` +
        'that refused the question put to it cannot be recorded against one, and the outbound ledger ' +
        'counts a block by the endpoint it names (AAP 0.6.3, AAP 0.8). The external entry in ' +
        'src/seed/models.ts declares the endpoint an inference through it would reach.',
    );
  }

  const event = await appendAuditEvent(ctx, {
    action: POLICY_BLOCK_ACTION,
    objectRef: endpoint,
    result: 'blocked',
    policyId: rule,
    actorType: 'policy',
    actorId: rule,
    before: null,
    after: blockEventPayload(entry, documents),
  });

  return {
    type: 'policy',
    message: decision.reason ?? `${rule} blocked this question without stating a further reason.`,
    traceId: ctx.traceId,
    policyId: rule,
    ...(decision.permittedAlternative === undefined
      ? {}
      : { permittedAlternative: decision.permittedAlternative }),
    auditEventId: event.id,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The public surface — AAP 0.12.1 handlers row, AAP 0.12.4 SCR-06
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the questions the assistant panel offers, in the order the records list them.
 *
 * Only the identifier and the prompt are published, so the answer an outline describes, the sentence a
 * template scaffolds and the records a question cites stay behind the seed loader until an answer is
 * asked for (rule P-6). The reading is refused exactly as every other read of the family is, so the
 * panel can render its forbidden state from the same failure that would meet a question.
 *
 * Declared asynchronous to match the port's promise-returning reads, so the adapter awaits one shape
 * for every call; the body awaits nothing and performs no I/O.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @returns The suggested questions, in record order.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
export async function listSuggestedQuestions(
  ctx: HandlerContext,
): Promise<SuggestedQuestion[]> {
  requireEvidenceRead(ctx);

  return ctx.state.records.assistantQuestions.map((question) => ({
    id: question.id,
    prompt: question.prompt,
  }));
}

/**
 * Reads the model catalogue the selector offers.
 *
 * The catalogue comes from the records unchanged in content — its entries in their recorded order and
 * its default entry as the records select it — and is copied member by member, so a screen that edited
 * what it was handed would edit its own copy rather than the session's. Every identifier, label and
 * version the selector shows is the record's own; this module types none of them (rule P-6).
 *
 * The catalogue is the only source of the alternative a policy block offers, which is why it is served
 * rather than summarised: the block card switches to an entry the reader can see in the selector.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @returns The catalogue, as a fresh copy.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 * @throws Error - The record set's default entry names no member of the catalogue.
 */
export async function listModels(ctx: HandlerContext): Promise<ModelCatalogue> {
  requireEvidenceRead(ctx);

  const catalogue = ctx.state.records.modelCatalogue;
  assertCatalogueResolves(catalogue);

  return {
    models: catalogue.models.map((entry) => ({ ...entry })),
    defaultModelId: catalogue.defaultModelId,
  };
}

/**
 * Puts one question to the assistant: policy first, an answer only if the policy allows it.
 *
 * The order is fixed and is the whole of this module's duty (AAP 0.12.1, AAP 0.12.3):
 *
 * 1. The permission refusal, then the request's own shape — a question with neither an identifier nor
 *    text cannot be answered, and reporting it as the notice would describe a question nobody asked.
 * 2. The model entry, resolved from the catalogue so the boundary the policy reads is the record's and
 *    not a caller's claim; an identifier the catalogue does not hold is a not-found.
 * 3. The question and the documents it carries, both resolved from records.
 * 4. The policy decision of `src/domain/policy/evaluate.ts`. Only a denial is a refusal: the engine's
 *    `notApplicable` means no evaluated rule governs the action, and POL-009 is declared configuration
 *    that is never evaluated (rule P-4), so it must not be read as a block.
 * 5. The documents the matched question cites, whose bodies the acting persona must be able to read: a
 *    customer-confidential body is refused here, before an answer is composed, on the evidence
 *    family's own verdict (AAP 0.2.1, AAP 0.12.3). It runs after the decision above, so a blocked
 *    question still returns the block card and the alternative it permits.
 * 6. The answer, from the scripted builder that matches the question or from the fixed notice for
 *    anything else, followed by the one event the question records.
 *
 * A denial never reaches step 5 or 6: the refusal is appended and thrown, and no answer, no citation
 * and no figure is composed for it.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @param input - The question, the model it is put to and the records it runs over.
 * @returns The builder's answer, with the model the question was put to named on it.
 * @throws Problem - A `'permission'` refusal — the evidence read, or a cited body the acting role may
 *   not open — a `'validation'` failure when no question was carried, a `'not-found'` failure naming an
 *   unknown model, or the `'policy'` block the engine decided.
 */
export async function askAssistant(
  ctx: HandlerContext,
  input: AssistantQueryInput,
): Promise<Answer> {
  requireEvidenceRead(ctx);

  const questionId = input.questionId?.trim() ?? '';
  const text = input.text?.trim() ?? '';

  if (questionId === '' && text === '') {
    throw questionRequiredProblem(ctx);
  }

  const records = ctx.state.records;
  const entry = modelEntryFor(records.modelCatalogue, input.modelId);

  if (entry === undefined) {
    throw modelNotFoundProblem(ctx, records.modelCatalogue, input.modelId);
  }

  const question = seededQuestionFor(records.assistantQuestions, questionId, text);
  const documents = contextDocumentsFor(records, question, input.contextRefs ?? [], text);

  const decision = evaluate(
    { action: 'assistant.query', modelId: entry.id, context: contextOf(documents) },
    ctx.actor,
    policyRecordsFor(records),
  );

  if (decision.outcome === 'deny') {
    throw await policyBlockRefusal(ctx, decision, entry, documents);
  }

  // The decision is read first, so a question POL-007 blocks still meets the block card and the
  // in-boundary alternative it offers; only a question the policy allowed meets the body redaction the
  // document read applies, before any answer is composed from the records it cites.
  requireCitedDocumentBodies(ctx, question);

  const answer = question === undefined ? unscriptedAnswer(ctx) : answerQuestion(ctx, question.id);

  await appendQuestionEvent(ctx, entry, documents);

  // `modelId` is the one member replaced on the builder's answer: the question was put to this entry,
  // and the event above records the same identifier (see the module header).
  return { ...answer, modelId: entry.id };
}
