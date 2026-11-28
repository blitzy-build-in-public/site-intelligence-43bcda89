/**
 * The assistant family of the in-browser mock adapter: the suggested questions SCR-06 offers, the
 * model catalogue its selector lists, and the one path a question takes — the policy evaluation that
 * runs before an answer exists, and the scripted builder that runs only when it allowed one.
 *
 * Fixing inputs: the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1 gives it, whose
 * duty is that POL-007 is evaluated before any answer and that a block returns `policyId`, the plain
 * reason, `permittedAlternative` and the appended policy-actor `auditEventId`, otherwise delegating to
 * `../assistant-script.ts`; AAP 0.12.3's `POST /assistant/queries` row; AAP 0.6.3 (the catalogue's
 * entries are placeholders and no model is connected); AAP 0.8 (the six questions, their sentences and
 * every figure belong to `src/seed/assistant-questions.ts` and the builders, so this module writes
 * none of its own); AAP 0.2.1 (message-level redaction, whose verdict is the evidence family's
 * `mayReadDocumentBody`); and `platform-contracts.md` §10 (the answer's members), §7.2 (the policies),
 * §7.1 (who may read the assistant) and §6 (the audited actions).
 *
 * DETERMINISTIC BY CONSTRUCTION. The answer is a function of the session's records and the question
 * asked: no clock, no random source, no module-level mutable value and no platform global is read, and
 * the one identifier a call carries is minted once by the adapter from the ticket it took at the call's
 * entry (AAP 0.18.2).
 *
 * Rules this module is built to satisfy:
 * - P-1: no label is typed and no sentence claims a model is connected; the unscripted notice is the
 *   seeded record's own text, returned by the builder rather than reproduced here.
 * - P-2: records arrive through `ctx.state` and the sibling `../seed-loader.ts`; nothing else of the
 *   application is imported, and only `mock-backend.ts` imports this module.
 * - P-3, P-8: the permission refusal names the permission the role lacks and the roles that hold it, and
 *   the policy refusal carries the rule, its reason, the permitted alternative and the event it
 *   recorded. Both run in a browser page: they are a demonstration control, not production
 *   authorisation.
 * - P-4: nothing below claims that a policy establishes anything beyond the verdict it returned.
 * - P-5: every record consulted is a first-party one, so no answer blends a market-intelligence figure
 *   with a first-party one.
 * - P-6: no figure, currency amount, scenario measure, record identifier, model identifier or sentence
 *   is typed below.
 * - P-7: the only names reachable from here are the seed's synthetic records.
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
  AuditResult,
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
import { appendAuditEvent, assertFreeTextLength } from './audit';
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
 * The action a question records, spelled as contracts §6 and the seeded trail spell it: an
 * `assistant question` names the model entry the question was put to, and carries the rule that
 * refused it where a rule did.
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
 * The documents a question runs over, in the order the three sources state them.
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
 * The material context one document states: its own classification and its own residency.
 *
 * `null` states that a context carries nothing of that kind, which the engine's own contract
 * distinguishes from an absent member, and a document states both members rather than nothing — so a
 * document's projection is a record value and not a judgement of this module's. The engine reads one
 * pair per evaluation, which is why every document is projected here and put to it separately instead
 * of the documents being collapsed into one pair that would have to be ranked.
 *
 * @param document - One of the documents the question carries.
 * @returns The classification and residency that document states.
 */
function contextOf(document: DocumentBody): AssistantQueryContext {
  return {
    classification: document.classification,
    residency: document.residency,
  };
}

/**
 * The material contexts a question carries, one per document, in the order the documents were gathered.
 *
 * A question carrying no document still has one context to evaluate: the pair stating nothing, which
 * the engine reads as "carries nothing of that kind" and which carries neither blocking condition, so
 * such a question is permitted once rather than evaluated against no context at all.
 *
 * EVERY DOCUMENT IS JUDGED, SO NO ORDERING CAN EVADE THE RULE. "The highest classification among the
 * documents the question carries", which `AssistantQueryContext` documents as the member's meaning, is
 * not computable here — `Classification` and `Residency` are open `string` aliases in
 * `src/types/entities.ts` with no ranking — and it does not need to be: the rule blocks a context when
 * that context carries `customer-confidential` material or `eu-only` residency (AAP 0.6.3, AAP
 * 0.12.3), which is a condition on the documents a question carries rather than on the order it states
 * them in, so a denial in any one of them is the question's denial and the block event names the pair
 * of the document that caused it. No ordering over the open aliases is invented here.
 *
 * @param documents - The documents the question carries.
 * @returns One context per document, or the context stating nothing when the question carries none.
 */
function contextsOf(documents: readonly DocumentBody[]): AssistantQueryContext[] {
  if (documents.length === 0) {
    return [{ classification: null, residency: null }];
  }

  return documents.map((document) => contextOf(document));
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
 * event and see why the rule fired rather than only that it did. The pair recorded is the denied
 * context's own: the document whose classification or residency the rule fired on, which is not
 * necessarily the document the question happens to state first.
 *
 * The model is named here rather than in the event's object reference, which names the endpoint the
 * blocked entry declares so the outbound ledger counts the block (AAP 0.6.3, AAP 0.8): `modelId` and
 * `boundary` travel unchanged from `questionEventPayload`, beside the classification and residency
 * that made the rule fire.
 *
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 * @param context - The context the rule denied, whose pair the payload records.
 * @returns The `after` half of the event's payload.
 */
function blockEventPayload(
  entry: ModelEntry,
  documents: readonly DocumentBody[],
  context: AssistantQueryContext,
): AuditPayload {
  const payload = questionEventPayload(entry, documents);

  if (context.classification !== null) {
    payload.classification = context.classification;
  }

  if (context.residency !== null) {
    payload.residency = context.residency;
  }

  return payload;
}

/**
 * Appends the one event a question records, whatever the policy made of it.
 *
 * AAP 0.6.2 lists the assistant question among the audited writes, so every question that reaches the
 * policy decision — scripted or not — leaves a record of the entry it was put to. The seeded trail
 * holds the answered questions and the blocked ones alike, which is what keeps a reader who filters
 * the trail by this action from under-reporting what was asked.
 *
 * The outcome is the caller's to state, because it is the caller that knows what the decision was:
 * `succeeded` for a question the script answered — the notice counts, because the call was answered —
 * and `blocked`, with the rule that refused it as the event's policy, for one a policy declined to
 * answer. Exactly one event is appended per question, so a blocked one leaves this row beside the
 * policy event and no second copy of the question itself.
 *
 * @param ctx - The call's context, whose chain is extended in place.
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 * @param result - The outcome the question records: `succeeded`, or `blocked` where a rule refused it.
 * @param policyId - The rule that blocked the question; absent, because no rule decided an answered one.
 */
async function appendQuestionEvent(
  ctx: HandlerContext,
  entry: ModelEntry,
  documents: readonly DocumentBody[],
  result: AuditResult,
  policyId?: PolicyId,
): Promise<void> {
  await appendAuditEvent(ctx, {
    action: ASSISTANT_QUESTION_ACTION,
    objectRef: entry.id,
    result,
    ...(policyId === undefined ? {} : { policyId }),
    before: null,
    after: questionEventPayload(entry, documents),
  });
}

/**
 * Records a policy's refusal — the question that was asked, then the block it met — and builds the
 * failure the block card renders.
 *
 * The order is the whole point of the function, and it is the order the seeded trail holds for every
 * block it carries: the `assistant question` the persona put is appended first, recorded as `blocked`
 * with the rule that refused it, and the policy-actor event beside it is appended second. A reader of
 * the chain therefore sees the question and then the verdict that refused it, and the two filters —
 * by question and by block — report the same request. Both events are appended before the throw and
 * both carry the call's `traceId`, because both are appended within one call, so a quoted trace leads
 * to the pair rather than to one half of it.
 *
 * The block event is the one the `Problem` carries: it is appended through the one append path of
 * `./audit.ts`, so the `auditEventId` names a record that already exists when the screen opens it, and
 * it stays the block rather than the question because the block card is what opens it. The event is a
 * policy-actor event — the refusal is recorded by the mechanism that made it — and it names the rule
 * as its actor, as the seeded trail's own blocks do. The rule, the reason and the permitted
 * alternative are read from the engine's decision and reported unchanged, so the card cannot disagree
 * with the verdict that was taken and no reason is composed here.
 *
 * The block event's object reference is the endpoint the refused entry declares, not the entry's
 * identifier, because that is what the outbound ledger counts a block by (AAP 0.6.3, AAP 0.8): a block
 * recorded against a model identifier lands on no ledger row. The payload keeps the model identifier
 * and the boundary, so the event still says which model was refused for which destination. The
 * question's own event names the model entry instead, because the question reaches no destination, so
 * the ledger counts the block once — on the endpoint's row — and the trail still records what was
 * asked.
 *
 * @param ctx - The call's context, whose chain is extended in place.
 * @param decision - The engine's denial.
 * @param entry - The catalogue entry the question was put to.
 * @param documents - The documents the question carried.
 * @param context - The context the rule denied: the projection of the document that caused it, whose
 *   classification and residency the block event records.
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
  context: AssistantQueryContext,
): Promise<Problem> {
  const rule: PolicyId | undefined = decision.policyId;

  if (rule === undefined) {
    throw new Error(
      'The policy engine returned a denial without naming the rule that caused it, so the refusal ' +
        'cannot be reported. Every denial the policy engine returns names its rule.',
    );
  }

  const endpoint: string | undefined = entry.endpoint;

  if (endpoint === undefined) {
    throw new Error(
      `The model catalogue entry ${entry.id} declares no outbound endpoint, so the policy block ` +
        'that refused the question put to it cannot be recorded against one, and the outbound ledger ' +
        'counts a block by the endpoint it names (AAP 0.6.3, AAP 0.8). The external entry of the ' +
        'model catalogue declares the endpoint an inference through it would reach.',
    );
  }

  // The question is recorded before the verdict that refused it, matching the seeded trail's own
  // blocked pair: what was asked, then the rule that declined to answer it.
  await appendQuestionEvent(ctx, entry, documents, 'blocked', rule);

  const event = await appendAuditEvent(ctx, {
    action: POLICY_BLOCK_ACTION,
    objectRef: endpoint,
    result: 'blocked',
    policyId: rule,
    actorType: 'policy',
    actorId: rule,
    before: null,
    after: blockEventPayload(entry, documents, context),
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
 * 1. The permission refusal, then the request's own shape. A question with neither an identifier nor
 *    text cannot be answered, and reporting it as the notice would describe a question nobody asked;
 *    a question longer than the audited writes' free-text ceiling (`FREE_TEXT_MAX_LENGTH` in
 *    `./audit.ts`) is refused here too, before a model is resolved and before anything is answered or
 *    recorded, so one request cannot put unbounded prose through the matcher and the answer path.
 * 2. The model entry, resolved from the catalogue so the boundary the policy reads is the record's and
 *    not a caller's claim; an identifier the catalogue does not hold is a not-found.
 * 3. The question and the documents it carries, both resolved from records.
 * 4. The policy decision of `src/domain/policy/evaluate.ts`, evaluated once per document the question
 *    carries — each document put to it as its own classification and residency, so a denial in any of
 *    them is the question's denial rather than only the first document's being read. Only a denial is a
 *    refusal: the engine's `notApplicable` means no evaluated rule governs the action, and POL-009 is
 *    declared configuration that is never evaluated (rule P-4), so it must not be read as a block.
 * 5. The documents the matched question cites, whose bodies the acting persona must be able to read: a
 *    customer-confidential body is refused here, before an answer is composed, on the evidence
 *    family's own verdict (AAP 0.2.1, AAP 0.12.3). It runs after the decision above, so a blocked
 *    question still returns the block card and the alternative it permits.
 * 6. The answer, from the scripted builder that matches the question or from the fixed notice for
 *    anything else, followed by the one event the question records.
 *
 * A denial never reaches step 5 or 6: the question's own event and the policy-actor event that refused
 * it are appended, and the refusal is thrown with no answer, no citation and no figure composed for it.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @param input - The question, the model it is put to and the records it runs over.
 * @returns The builder's answer, with the model the question was put to named on it.
 * @throws Problem - A `'permission'` refusal — the evidence read, or a cited body the acting role may
 *   not open — a `'validation'` failure when no question was carried or when the question is longer
 *   than the free-text ceiling, a `'not-found'` failure naming an unknown model, or the `'policy'`
 *   block the engine decided.
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

  // The audited writes' one ceiling, with this family's own consequence: no record keeps a question's
  // text, so what the refusal spares is the answer and the event rather than a stored paragraph.
  assertFreeTextLength(ctx, 'a question to the evidence assistant', text, 'answered and recorded');

  const records = ctx.state.records;
  const entry = modelEntryFor(records.modelCatalogue, input.modelId);

  if (entry === undefined) {
    throw modelNotFoundProblem(ctx, records.modelCatalogue, input.modelId);
  }

  const question = seededQuestionFor(records.assistantQuestions, questionId, text);
  const documents = contextDocumentsFor(records, question, input.contextRefs ?? [], text);

  // One evaluation per document the question carries, and the first denial is the question's denial:
  // the rule fires on a document's own classification or residency, so a denial in any of them denies
  // the question however the documents are ordered (AAP 0.6.3, AAP 0.12.3).
  const policyRecords = policyRecordsFor(records);

  for (const context of contextsOf(documents)) {
    const decision = evaluate(
      { action: 'assistant.query', modelId: entry.id, context },
      ctx.actor,
      policyRecords,
    );

    if (decision.outcome === 'deny') {
      throw await policyBlockRefusal(ctx, decision, entry, documents, context);
    }
  }

  // The decision is read first, so a question POL-007 blocks still meets the block card and the
  // in-boundary alternative it offers; only a question the policy allowed meets the body redaction the
  // document read applies, before any answer is composed from the records it cites.
  requireCitedDocumentBodies(ctx, question);

  /*
   * Nothing below this line decides anything: the sentences and the figures are the seeded templates
   * and the script's arithmetic, so a question the script cannot fill returns the seeded notice instead
   * of a number invented here (rule P-6). The builders stay permission-free by design — AAP 0.12.1's
   * assistant-builder row has them fill a template and evaluate nothing — which is why every check a
   * question needs is made above, once, beside the other refusals this family makes.
   */
  const answer = question === undefined ? unscriptedAnswer(ctx) : answerQuestion(ctx, question.id);

  await appendQuestionEvent(ctx, entry, documents, 'succeeded');

  // `modelId` is the one member replaced on the builder's answer: the builders stamp the catalogue's
  // default entry, while the question was put to the entry the caller selected, the selector shows that
  // entry, and the event above records the same identifier. A message naming the default entry while
  // the event named the chosen one would have the two records of one call disagree.
  return { ...answer, modelId: entry.id };
}
