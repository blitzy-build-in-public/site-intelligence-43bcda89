/**
 * The evidence family of the in-browser mock adapter: the drawer's payload for any figure, chart mark,
 * node, arc or pin, the document body released to the caller who may read it, the evidence pins a
 * persona may see, and the part approval package with the readiness its own elements produce.
 *
 * Scope authority. This module is the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1
 * fixes, and it serves the two evidence reads AAP 0.12.3 lists — `GET /evidence?ref=` and
 * `GET /documents/{id}` — together with the pin list and the package reads that complete the family.
 * `platform-contracts.md` §3 fixes the records it reads (`Evidence`, `EvidencePin`, `PinState`,
 * `Provenance`, `Classification`, `Residency`, `Freshness`, `PpapElement`, `PpapPackage`), §7.1 fixes
 * who may read them, and §8 fixes the evidence rules a package element's state comes from.
 *
 * WHY THIS MODULE EXISTS IN THE SERVICE AND NOT IN A SCREEN — AAP 0.2.1, rule P-2. "Message-level
 * redaction inside the mock backend: USR-04 cannot open the body of a customer-confidential document,
 * and USR-08 sees only its own-vendor pins. A UI-only restriction would fail the services' own
 * enforcement requirement." AAP 0.12.3 states the same duty from the endpoint's side: "Redaction is
 * applied before serialisation, so a customer-confidential body never crosses the boundary for
 * USR-04." Both refusals are therefore made here, before a record leaves this function: a withheld
 * body reaches a screen as a `Problem` and never as a payload, an empty string or a log line, and the
 * pin filter runs over the records the session holds rather than over what a canvas chose to draw. A
 * disabled control is then an explanation of the refusal the reader would have met anyway (rule P-8),
 * not the defence against it.
 *
 * WHAT IT COMPUTES AND WHAT IT ONLY REPORTS — rule P-6. It computes no business figure. Every number
 * an evidence payload states is a field of the record that carries it, quoted as the record states it,
 * and the `formula` member names the contracts §4 rule or §5 aggregate that owns the figure instead of
 * re-deriving it. The one exception is the package readiness figure entities §3 defines as a computed
 * value: it is produced by `wholePercent`, the single whole-percent rule the codebase holds, from the
 * package's own element count, and this module never divides by a constant of its own. No currency
 * amount, no record identifier and no expected result is typed here, and nothing imports
 * `tests/fixtures/`.
 *
 * THE RESOLUTION ORDER, STATED ONCE — `getEvidence`. A reference selects its family by identifier
 * prefix, and each family then looks its own records up by exact identifier. The order below is the
 * order the lookup walks, and it is deterministic: longer prefixes first, so `PPAP-` is tested before
 * `PO-`, and a reference matching no prefix, or matching one whose records hold no such identifier, is
 * refused as `'not-found'` naming the reference. There is no fuzzy match, no prefix search over the
 * records and no fall-back to "the first record" — a drawer that silently showed a neighbouring figure
 * would be worse than one that reports the reference it could not resolve. The families, in order:
 * package, exception, scenario, approval, audit event, evidence pin, document, customer order,
 * purchase order.
 *
 * THE RECORD SET ATTRIBUTES A VENDOR TO THE EXTERNAL PERSONA — AAP 0.2.1, read rather than invented.
 * Rule P-6 forbids typing a record and rule P-7 confines the product's parties to the seeded set, so
 * this module does not decide for itself which supplier the external supplier engineer works for. It
 * reads the attribution the records state, in the two places they can state it: the `vendorIds` a
 * persona record declares for itself — `src/seed/users.ts` gives the external engineer the one seal
 * supplier whose records it is there to inspect — and the suppliers of the exceptions a persona owns.
 * `vendorsFor` unions the two, so the external engineer's pin read releases exactly its own vendor's
 * pins and no other party's: the release AAP 0.2.1 requires beside the withholding it requires in the
 * same sentence. A persona the records attribute no vendor to still releases nothing, which is the
 * fail-closed direction, because withholding another party's evidence is recoverable and releasing it
 * is not. The read stays conformance-only in this run (the pin screens belong to stage S4, AAP
 * 0.12.3), so no S1-S3 screen depends on it either way.
 *
 * THE PACKAGE READS ARE CONFORMANCE-ONLY — AAP 0.12.3, AAP 0.14.2. No S1-S3 screen calls `getPackage`
 * or `reviewPackageElement`, and the package routes render the stage notice, because the package map is
 * stage S4's surface. They live here because AAP 0.6.2 lists `extraction review` among the audited
 * writes the adapter must implement, and the packages are the only S4 record set with seeded content,
 * so they sit beside the documents and pins they reference. No other S4 or S5 surface is invented here.
 *
 * RULES IT DOES NOT CLAIM — rule P-4. An evidence payload reports a record and the rule behind it. It
 * states no security property of the workspace and establishes nothing about a store: the audit family
 * carries the chain's `Simulated control` wording, and the labels below are the fixed specification
 * §5.3 strings of rule P-1, quoted verbatim rather than paraphrased.
 *
 * Rules this module is built to satisfy:
 * - P-1: every label it returns is one of the seven fixed `SIM_LABELS` members, typed `SimLabel` so a
 *   paraphrase is a compile error.
 * - P-2, P-3: the verdicts come from `ctx.actor` and the contracts §7.1 matrix through `hasPermission`,
 *   never from `actor.permissions` and never from a caller's claim, so bypassing the role switcher
 *   changes no outcome; the two redactions are applied here, in the service.
 * - P-5: it returns no market-intelligence provenance at all — competitor readings belong to the atlas
 *   family, so nothing here can blend a market figure with a first-party one.
 * - P-6, P-7: it types no figure, amount or record identifier, reads no fixture, and names no company,
 *   person or vendor of its own; every name it returns is a field of a seeded record.
 * - B-1, B-2: it reads memory and nothing else — no address, no fetch, no environment read, no
 *   credential — and it holds no configuration.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the permission matrix, the one rounding rule, the shared vocabulary and the siblings
 * ------------------------------------------------------------------------------------------- */

import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import type { ScopedSubject } from '../../../domain/policy/permissions';
import { wholePercent } from '../../../domain/solver/rounding';
import type {
  ActiveUser,
  Approval,
  AuditEvent,
  Classification,
  Confidence,
  DocumentBody,
  DocumentId,
  ElementReview,
  ElementReviewDecision,
  Evidence,
  EvidencePin,
  EvidenceRuleId,
  OperationalException,
  PackageId,
  Permission,
  PinState,
  PlantId,
  PpapElement,
  PpapPackage,
  Problem,
  Role,
  Scenario,
  SimLabel,
  SupplierId,
} from '../../../types';
import type { HandlerContext } from '../mock-state';
import type { CustomerOrder, PurchaseOrder, SeedRecordSet } from '../seed-loader';
import { isSimulationOn } from '../simulation';
import { appendAuditEvent, traceIdFor } from './audit';

/* ---------------------------------------------------------------------------------------------
 * The fixed vocabulary this family answers to — contracts §3, §7.1 and §8; specification §5.3
 * ------------------------------------------------------------------------------------------- */

/** The permission every read of this family requires (contracts §7.1). */
const EVIDENCE_READ: Permission = 'evidence.read';

/** The permission an extraction review requires, held by the supplier quality engineer alone. */
const EVIDENCE_REVIEW: Permission = 'evidence.review';

/** The permission that gates a customer-confidential body, the second redaction (contracts §7.1). */
const DOCUMENT_CONFIDENTIAL_READ: Permission = 'document.confidential.read';

/** The classification whose body is withheld from a role without the permission above. */
const CUSTOMER_CONFIDENTIAL: Classification = 'customer-confidential';

/** The one role whose pin read is narrowed to its own vendor rather than to a plant scope. */
const EXTERNAL_SUPPLIER_ROLE: Role = 'external-supplier-engineer';

/** `Simulated data` — a seeded record, quoted exactly as specification §5.3 fixes it (rule P-1). */
const SIMULATED_DATA: SimLabel = 'Simulated data';

/** `Simulated calculation` — a figure the solver or an aggregate computes (rule P-1). */
const SIMULATED_CALCULATION: SimLabel = 'Simulated calculation';

/** `Simulated control` — the audit chain, whose wording AAP 0.10 places on it wherever it surfaces. */
const SIMULATED_CONTROL: SimLabel = 'Simulated control';

/**
 * The evidence rule whose condition the records themselves state as a relation among their members:
 * RULE-18-PSW, the part submission warrant, which stands only once every element above it is complete.
 *
 * It is the one rule contracts §8 leaves this module able to re-run from record content, because every
 * other rule compares a reading the record holds as prose against a limit it also holds as prose, and
 * re-deciding those here would be inventing a comparison the inputs never fix.
 */
const WARRANT_RULE: EvidenceRuleId = 'RULE-18-PSW';

/** The state a completed element carries, spelled once so the comparisons below read alike. */
const PASS_STATE: PinState = 'pass';

/** The state an element awaiting a reviewer's decision carries. */
const REVIEW_STATE: PinState = 'review';

/** The state the warrant carries while the elements above it are open. */
const EMPTY_STATE: PinState = 'empty';

/* ---------------------------------------------------------------------------------------------
 * The reference prefixes — contracts §1 identifier patterns, used to select a family
 * ------------------------------------------------------------------------------------------- */

/** `PPAP-nnnn`, the part approval package. Tested first: `PO-` is a prefix of nothing else but is shorter. */
const PACKAGE_PREFIX = 'PPAP-';

/** `EXC-2026-nnnn`, the operational exception. */
const EXCEPTION_PREFIX = 'EXC-';

/** `SCN-nnnn-x`, one response option. */
const SCENARIO_PREFIX = 'SCN-';

/** `APR-2026-nnn`, one approval. */
const APPROVAL_PREFIX = 'APR-';

/** `AUD-nnnnnn`, one audit event. */
const AUDIT_PREFIX = 'AUD-';

/** `PIN-…`, one evidence pin. */
const PIN_PREFIX = 'PIN-';

/** `DOC-nnnn`, one document. */
const DOCUMENT_PREFIX = 'DOC-';

/** `CO-nnnnnn`, one customer order. */
const CUSTOMER_ORDER_PREFIX = 'CO-';

/** `PO-nnnnnnnn`, one purchase order. */
const PURCHASE_ORDER_PREFIX = 'PO-';

/* ---------------------------------------------------------------------------------------------
 * The failures this family refuses with — contracts §2, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission failure every refusal of this family shares.
 *
 * Composed as a plain `Problem` so a caller narrows on `type` and reads the cause without unwrapping an
 * `Error`, and it carries the two members the forbidden card and a disabled control render: the
 * permission the role lacks and the roles that hold it (rule P-8). The role list comes from
 * `rolesWith`, so the sentence names who may act and cannot drift from the matrix that decided the
 * refusal. The correlation identifier is `traceIdFor`, the same value the adapter reports in
 * `Meta.traceId` and the event an audited write appends, so a reader can quote one identifier for the
 * whole request.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param permission - The permission the call required.
 * @param message - The reason, in plain words.
 * @returns The `Problem` to throw.
 */
function permissionProblem(
  ctx: HandlerContext,
  permission: Permission,
  message: string,
): Problem {
  const rolesWithPermission: Role[] = rolesWith(permission);

  return {
    type: 'permission',
    message,
    traceId: traceIdFor(ctx.state),
    requiredPermission: permission,
    rolesWithPermission,
  };
}

/**
 * The failure a reference no record answers is refused with.
 *
 * `'not-found'` is the contracts §2 cause for an identifier the records do not hold, and the message
 * quotes the reference the caller sent rather than substituting one, so an unresolvable drawer reports
 * what it could not resolve instead of opening on nothing.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param message - The reason, naming the reference.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: traceIdFor(ctx.state) };
}

/**
 * The failure a request the records cannot honour is refused with.
 *
 * Used where the request contradicts the record set rather than a permission — a package identifier
 * that disagrees with the review it arrives with, a correction with no value, or a package that carries
 * no element to divide by.
 *
 * @param ctx - The call's context, whose state supplies the correlation identifier.
 * @param message - The reason, in plain words.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: traceIdFor(ctx.state) };
}

/* ---------------------------------------------------------------------------------------------
 * The permission checks — contracts §7.1, rules P-3 and P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Refuses the call unless the acting persona may read evidence, and refuses it whenever the
 * demonstration's forbidden trigger is in effect.
 *
 * Both refusals produce the same `Problem`, so the state the simulation popover demonstrates is the
 * state a real refusal produces rather than a second shape a screen has to learn. The trigger is
 * checked first because it stands for a session-wide refusal rather than for a fact about the role.
 *
 * The permission is evaluated with no subject, because whether a particular record is inside the
 * persona's plant scope is a question about that record; `assertPlantReach` asks it once the record is
 * known. Evaluating the permission before resolving the reference also keeps an unresolvable
 * identifier from telling a persona without the permission that the record exists.
 *
 * The checks run in a browser page of a build with no backend and no session, so they are a
 * demonstration control rather than production authorisation (rule P-3); the adapter evaluates them
 * itself regardless of what a screen offered, which is what makes a bypassed control grant nothing.
 *
 * @param ctx - The call's context: the persona the check is made for and the state its triggers are read from.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertEvidenceRead(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      EVIDENCE_READ,
      `Evidence is not readable in this state; opening a record behind a figure requires the ${EVIDENCE_READ} permission.`,
    );
  }

  if (!hasPermission(ctx.actor.role, EVIDENCE_READ, null, ctx.actor)) {
    throw permissionProblem(
      ctx,
      EVIDENCE_READ,
      `The acting role (${ctx.actor.role}) does not hold the ${EVIDENCE_READ} permission, so the evidence behind a figure is not readable here.`,
    );
  }
}

/**
 * Refuses the call when a plant-scoped record lies outside the persona's effective plant scope.
 *
 * The matrix is evaluated with the record's own plant, so the answer is the intersection of the role's
 * plant scope, the persona's seeded scope and the plant the record belongs to — the same authority
 * every scoped list and aggregate is narrowed by, rather than a second scope table (AAP 0.2.1).
 *
 * @param ctx - The call's context: the persona the check is made for.
 * @param subject - The record the call is about, carrying the plant it belongs to.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertPlantReach(ctx: HandlerContext, subject: ScopedSubject): void {
  if (hasPermission(ctx.actor.role, EVIDENCE_READ, subject, ctx.actor)) {
    return;
  }

  throw permissionProblem(
    ctx,
    EVIDENCE_READ,
    `The record belongs to plant ${subject.plantId}, which lies outside the plant scope of the acting persona (${ctx.actor.id}), so its evidence is not readable here.`,
  );
}

/**
 * Refuses the call unless the acting persona may review extracted evidence.
 *
 * `evidence.review` is the contracts §7.1 permission the extraction-review write requires, held by the
 * supplier quality engineer. The forbidden trigger refuses it as it refuses every read of this family.
 *
 * @param ctx - The call's context: the persona the check is made for.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertEvidenceReview(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      EVIDENCE_REVIEW,
      `Extracted values are not reviewable in this state; recording a review requires the ${EVIDENCE_REVIEW} permission.`,
    );
  }

  if (!hasPermission(ctx.actor.role, EVIDENCE_REVIEW, null, ctx.actor)) {
    throw permissionProblem(
      ctx,
      EVIDENCE_REVIEW,
      `The acting role (${ctx.actor.role}) does not hold the ${EVIDENCE_REVIEW} permission, so an extracted value is not reviewable here.`,
    );
  }
}

/**
 * Withholds a customer-confidential body from a persona that may not read it — the service's half of
 * the redaction AAP 0.2.1 and AAP 0.12.3 require.
 *
 * The refusal names the classification it withheld and the permission that would release it, and it
 * carries the roles that hold that permission so a forbidden card can say who may act (rule P-8). The
 * body itself is never placed in the message, the payload or a log: the caller of this function has the
 * record in hand only to decide whether it may leave, and every return path below builds the released
 * body from the record after this check has passed.
 *
 * @param ctx - The call's context: the persona the body would be released to.
 * @param document - The document whose body is under consideration.
 * @throws Problem - A `'permission'` failure naming the classification and the permission.
 */
function assertDocumentBodyReadable(ctx: HandlerContext, document: DocumentBody): void {
  if (document.classification !== CUSTOMER_CONFIDENTIAL) {
    return;
  }

  if (hasPermission(ctx.actor.role, DOCUMENT_CONFIDENTIAL_READ, null, ctx.actor)) {
    return;
  }

  throw permissionProblem(
    ctx,
    DOCUMENT_CONFIDENTIAL_READ,
    `The body of document ${document.id} is classified ${document.classification}, and the acting role (${ctx.actor.role}) does not hold the ${DOCUMENT_CONFIDENTIAL_READ} permission that releases it. The body was withheld before it left the service.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * Small record-reading helpers — no arithmetic, no formatting (rule P-6)
 * ------------------------------------------------------------------------------------------- */

/**
 * The values of a list with blank entries and repeats removed, in the order they were given.
 *
 * Used to build the `upstream` and `downstream` lists of an evidence payload, where one record may
 * reach another along two relations and should still appear once — a compound reference that repeated
 * an identifier would read as two records.
 *
 * @param values - The references, in the order the record states them.
 * @returns Each distinct non-blank reference, once, in first-seen order.
 */
function uniqueRefs(values: Iterable<string>): string[] {
  const seen = new Set<string>();
  const refs: string[] = [];

  for (const value of values) {
    if (value.trim() === '' || seen.has(value)) {
      continue;
    }

    seen.add(value);
    refs.push(value);
  }

  return refs;
}

/**
 * The documents that cite a reference, which is the `documents` member of an evidence payload.
 *
 * A document cites a record by naming its identifier in its title or its body — that is how the seeded
 * documents refer to the exception, package and plant they are about — so the citation is read from the
 * records rather than from a table this module would have to keep in step with them. Only the
 * identifier of a citing document is reported here, never its body: a document this persona may not
 * open still appears as a citation, and opening it is refused with the explanation rule P-8 requires.
 *
 * @param records - The session's record set.
 * @param ref - The reference to look for.
 * @returns The identifiers of the documents naming it, in the order the records hold them.
 */
function documentsCiting(records: SeedRecordSet, ref: string): DocumentId[] {
  return records.documents
    .filter((document) => document.title.includes(ref) || document.body.includes(ref))
    .map((document) => document.id);
}

/**
 * The confidence a record carries when it states none of its own.
 *
 * `Evidence.confidence` is a required member, and a record that carries no confidence member — an
 * order, a pin, a document, an audit link — still has to state one. The level this returns is `high`
 * for the reason it states: every value the payload reports is a field of the record read at the
 * instant the record holds, so the evidence adds no reading of its own that could be uncertain. No
 * figure and no business judgement is written here.
 *
 * @returns The confidence of a payload built entirely from a record's own fields.
 */
function recordConfidence(): Confidence {
  return {
    level: 'high',
    reason:
      'Every value this evidence reports is a field of the record itself, stated at the instant the record carries; nothing in the payload is derived or estimated.',
  };
}

/**
 * The confidence a review state implies, for the records whose evidence is their review state.
 *
 * A pin and a package element state their state rather than a confidence member, and the drawer has to
 * report one: a passed record is settled, a record in review or pending is not, and a record that
 * failed, is stale or is empty carries a reading the reader should not rely on. The reason names the
 * state the record holds, so the sentence and the state cannot disagree.
 *
 * @param state - The review state the record carries.
 * @returns The confidence that state implies, with its reason.
 */
function confidenceOfPinState(state: PinState): Confidence {
  switch (state) {
    case 'pass':
      return {
        level: 'high',
        reason: 'The record stands in the pass state, so the review that decides it is complete.',
      };
    case 'review':
      return {
        level: 'medium',
        reason: 'The record is in review: a reviewer has not yet decided the value it carries.',
      };
    case 'pending':
      return {
        level: 'medium',
        reason: 'The record is pending: the review that would decide it has not begun.',
      };
    case 'stale':
      return {
        level: 'medium',
        reason: 'The record is stale: the reading it carries is older than the rule that governs it.',
      };
    case 'fail':
      return {
        level: 'low',
        reason: 'The record is in the fail state, so the reading it carries did not meet its rule.',
      };
    case 'empty':
      return {
        level: 'low',
        reason: 'The record is empty: no reading is recorded behind it.',
      };
  }
}

/* ---------------------------------------------------------------------------------------------
 * One reference, resolved to the record that answers it — AAP 0.12.3, contracts §1
 * ------------------------------------------------------------------------------------------- */

/**
 * The record an evidence reference resolved to.
 *
 * A discriminated union over the nine families the resolution order names, so the payload builder
 * below can switch over the family and the compiler proves every family is handled: a family added to
 * the union without a builder case does not compile. The record is the session's own record by
 * reference, read and never modified here.
 */
type ResolvedRef =
  | { readonly family: 'package'; readonly record: PpapPackage }
  | { readonly family: 'exception'; readonly record: OperationalException }
  | { readonly family: 'scenario'; readonly record: Scenario }
  | { readonly family: 'approval'; readonly record: Approval }
  | { readonly family: 'audit-event'; readonly record: AuditEvent }
  | { readonly family: 'pin'; readonly record: EvidencePin }
  | { readonly family: 'document'; readonly record: DocumentBody }
  | { readonly family: 'customer-order'; readonly record: CustomerOrder }
  | { readonly family: 'purchase-order'; readonly record: PurchaseOrder };

/**
 * Resolves one reference to the record that answers it, in the module's documented order.
 *
 * The prefix selects the family and that family's own records are then searched for the exact
 * identifier, so a reference either names a record the session holds or is refused. The order is the
 * one this module's header states — package, exception, scenario, approval, audit event, pin, document,
 * customer order, purchase order — and it is written out here rather than derived from a table so a
 * reader can see it. `PPAP-` is tested first because a package identifier begins with the two letters a
 * purchase order's begins with, and a shorter prefix tested first would shadow it.
 *
 * The messages of the refusals quote the reference the caller sent, never a neighbour's identifier:
 * an unresolvable drawer reports what it could not resolve.
 *
 * @param ctx - The call's context, whose records are searched and whose state supplies the trace.
 * @param ref - The reference the displayed element carries.
 * @returns The family and the record it names.
 * @throws Problem - A `'not-found'` failure naming the reference when no record answers it.
 */
function resolveRef(ctx: HandlerContext, ref: string): ResolvedRef {
  const records = ctx.state.records;

  if (ref.startsWith(PACKAGE_PREFIX)) {
    const found = records.ppapPackages.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'package', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no part approval package with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(EXCEPTION_PREFIX)) {
    const found = records.exceptions.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'exception', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no exception with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(SCENARIO_PREFIX)) {
    for (const seeded of records.exceptionScenarios) {
      const found = seeded.scenarioSet.scenarios.find((candidate) => candidate.id === ref);

      if (found !== undefined) {
        return { family: 'scenario', record: found };
      }
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no scenario with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(APPROVAL_PREFIX)) {
    const found = records.approvals.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'approval', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no approval with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(AUDIT_PREFIX)) {
    const found = ctx.state.auditEvents.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'audit-event', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The audit chain holds no event with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(PIN_PREFIX)) {
    const found = records.evidencePins.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'pin', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no evidence pin with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(DOCUMENT_PREFIX)) {
    const found = records.documents.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'document', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no document with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(CUSTOMER_ORDER_PREFIX)) {
    const found = records.customerOrders.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'customer-order', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The order book holds no customer order with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(PURCHASE_ORDER_PREFIX)) {
    const found = records.purchaseOrders.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'purchase-order', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The order book holds no purchase order with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  throw notFoundProblem(
    ctx,
    `No record family answers the reference ${ref}. A reference names a package, an exception, a scenario, an approval, an audit event, an evidence pin, a document, a customer order or a purchase order.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The plant a resolved record belongs to — contracts §7.1, AAP 0.2.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The plant-scoped subject a resolved record presents to the permission matrix, or `null` when the
 * record is not plant-scoped.
 *
 * A record that names a plant is narrowed by it, so a persona cannot read the evidence of a plant
 * outside its scope. The records that reach a plant indirectly are resolved to the plant the records
 * give them: a scenario and an approval to the plant of the exception they answer, and a pin to its own
 * node when that node is a plant. A package, an audit event and a document name no plant, so they are
 * not plant-scoped and the permission alone decides whether they are readable — which is the reading
 * `hasPermission` documents for a `null` subject.
 *
 * @param ctx - The call's context, whose records resolve the indirect plants.
 * @param resolved - The record the reference named.
 * @returns The plant-scoped subject, or `null` when the record names no plant.
 */
function subjectOf(ctx: HandlerContext, resolved: ResolvedRef): ScopedSubject | null {
  const records = ctx.state.records;

  switch (resolved.family) {
    case 'exception':
      return { plantId: resolved.record.plantId };
    case 'customer-order':
      return { plantId: resolved.record.plantId };
    case 'purchase-order':
      return { plantId: resolved.record.plantId };
    case 'pin':
      return records.plants.some((plant) => plant.id === resolved.record.nodeRef)
        ? { plantId: resolved.record.nodeRef }
        : null;
    case 'scenario':
      return plantOfException(records, resolved.record.exceptionId);
    case 'approval':
      return plantOfException(records, resolved.record.exceptionId);
    case 'package':
    case 'audit-event':
    case 'document':
      return null;
  }
}

/**
 * The plant of the exception a scenario or an approval answers.
 *
 * @param records - The session's record set.
 * @param exceptionId - The exception the record names.
 * @returns The plant-scoped subject of that exception, or `null` when the records hold it nowhere.
 */
function plantOfException(
  records: SeedRecordSet,
  exceptionId: OperationalException['id'],
): ScopedSubject | null {
  const exception = records.exceptions.find((candidate) => candidate.id === exceptionId);

  return exception === undefined ? null : { plantId: exception.plantId };
}

/* ---------------------------------------------------------------------------------------------
 * The payload of one record — contracts §3 `Evidence`, AAP 0.12.2, principle PR-6
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the drawer's payload for one resolved record.
 *
 * The payload states the record's own value, where the value came from, the fixed label the element
 * must carry, the contracts §4 or §5 rule that owns the figure, the record values that fed it, the
 * records upstream and downstream of it, its confidence, the inputs it is missing and the documents
 * behind it — the four sections of the evidence drawer in typed form.
 *
 * @param ctx - The call's context, whose records resolve the neighbouring records the payload lists.
 * @param resolved - The record the reference named.
 * @returns The evidence payload.
 */
function evidenceFor(ctx: HandlerContext, resolved: ResolvedRef): Evidence {
  switch (resolved.family) {
    case 'package':
      return packageEvidence(ctx.state.records, resolved.record);
    case 'exception':
      return exceptionEvidence(ctx, resolved.record);
    case 'scenario':
      return scenarioEvidence(ctx, resolved.record);
    case 'approval':
      return approvalEvidence(ctx, resolved.record);
    case 'audit-event':
      return auditEventEvidence(ctx, resolved.record);
    case 'pin':
      return pinEvidence(ctx.state.records, resolved.record);
    case 'document':
      return documentEvidence(ctx.state.records, resolved.record);
    case 'customer-order':
      return customerOrderEvidence(ctx, resolved.record);
    case 'purchase-order':
      return purchaseOrderEvidence(ctx, resolved.record);
  }
}

/**
 * The evidence behind a part approval package: the readiness its elements add up to.
 *
 * The figure is the record's own `readinessPercent`, produced by `wholePercent` over the package's own
 * element count as contracts §5 fixes it, and the formula names that rule and the seven evidence rules
 * of contracts §8 that decided the element states it divides by. No percentage is computed here.
 *
 * @param records - The session's record set.
 * @param packageRecord - The package the reference named.
 * @returns The package's evidence payload.
 */
function packageEvidence(records: SeedRecordSet, packageRecord: PpapPackage): Evidence {
  const documents = uniqueRefs(packageRecord.elements.map((element) => element.documentId));

  return {
    value: `${packageRecord.readinessPercent} per cent of the package elements pass`,
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula:
      'Package readiness is the elements whose state passed divided by the element count of the package, ' +
      'rounded half up to a whole percent (contracts §5). Each element state is the one the contracts ' +
      '§8 evidence rule named on that element produced.',
    inputs: [
      `readinessPercent = ${packageRecord.readinessPercent}`,
      `elements = ${packageRecord.elements.length}`,
      `supplierId = ${packageRecord.supplierId}`,
      `materialId = ${packageRecord.materialId}`,
    ],
    upstream: uniqueRefs([packageRecord.materialId, packageRecord.supplierId, ...documents]),
    downstream: packageRecord.elements.map(
      (element) => `${packageRecord.id} element ${element.number} (${element.name})`,
    ),
    confidence: recordConfidence(),
    missingInputs: [],
    documents,
  };
}

/**
 * The evidence behind one operational exception: what the record states and the rule that values it.
 *
 * The affected lines are listed as the record holds them, because they are the only input to revenue at
 * risk (AAP 0.12.2), and the formula names the contracts §5 rule that multiplies them by the product
 * price. The downstream list is read from the records that answer this exception — the seeded scenario
 * sets, the approvals and the audit events — so a reader can see what the value reaches.
 *
 * @param ctx - The call's context: the records that answer the exception and the chain behind it.
 * @param exception - The exception the reference named.
 * @returns The exception's evidence payload.
 */
function exceptionEvidence(ctx: HandlerContext, exception: OperationalException): Evidence {
  const records = ctx.state.records;
  const scenarios = records.exceptionScenarios
    .filter((seeded) => seeded.exceptionId === exception.id)
    .flatMap((seeded) => seeded.scenarioSet.scenarios.map((scenario) => scenario.id));
  const approvals = records.approvals
    .filter((approval) => approval.exceptionId === exception.id)
    .map((approval) => approval.id);
  const events = ctx.state.auditEvents
    .filter((event) => event.objectRef === exception.id)
    .map((event) => event.id);

  return {
    value: `${exception.severity} severity, ${exception.status}, ${exception.daysToImpact} working days to impact`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'Revenue at risk is the sum, over the affected lines, of the units at risk multiplied by the ' +
      'product price (contracts §5); the days to impact are the reading the record itself states of the ' +
      'working days until the impact reaches a customer order. This payload states those rules and ' +
      'recomputes neither.',
    inputs: [
      `severity = ${exception.severity}`,
      `status = ${exception.status}`,
      `daysToImpact = ${exception.daysToImpact}`,
      `detectedAt = ${exception.detectedAt}`,
      ...exception.affectedLines.map(
        (line) =>
          `affected line ${line.orderId}: ${line.unitsAtRisk} units of ${line.productId} at risk at ${line.plantId}, due ${line.dueDate}`,
      ),
    ],
    upstream: uniqueRefs([
      exception.purchaseOrderId,
      exception.materialId,
      exception.supplierId,
      exception.lineId,
      exception.plantId,
      ...exception.alsoAffectsPlantIds,
      ...exception.affectedLines.map((line) => line.orderId),
      ...exception.affectedLines.map((line) => line.productId),
    ]),
    downstream: uniqueRefs([
      ...(exception.solverCaseId === undefined ? [] : [exception.solverCaseId]),
      ...scenarios,
      ...approvals,
      ...events,
    ]),
    confidence: exception.confidence,
    missingInputs: [...exception.missingInputs],
    documents: documentsCiting(records, exception.id),
  };
}

/**
 * The evidence behind one response option: the solver's measures and the rule that produced them.
 *
 * A seeded option is a record of the dataset and carries `Simulated data`; an option the solver
 * computed in this session carries `Simulated calculation` (AAP 0.10, rule P-1). Nothing is
 * recomputed: every measure in the payload is the record's own, and the formula names the contracts §4
 * rules the solver applied. The missing inputs an option inherits are its exception's, because the
 * case's unread inputs are the exception's (AAP 0.8).
 *
 * @param ctx - The call's context, whose records supply the exception an option answers.
 * @param scenario - The option the reference named.
 * @returns The option's evidence payload.
 */
function scenarioEvidence(ctx: HandlerContext, scenario: Scenario): Evidence {
  const records = ctx.state.records;
  const seeded = scenario.origin === 'seeded';
  const exception = records.exceptions.find((candidate) => candidate.id === scenario.exceptionId);
  const approvals = records.approvals
    .filter((approval) => approval.scenarioId === scenario.id)
    .map((approval) => approval.id);

  return {
    value: `${scenario.name}: ${scenario.unitsLate} units late, at most ${scenario.maxDaysLate} days`,
    provenance: seeded ? 'first_party' : 'computed',
    label: seeded ? SIMULATED_DATA : SIMULATED_CALCULATION,
    formula:
      'Units late, maximum days late, orders on time, added cost, line idle days, revenue delayed, the ' +
      'run-out and the closing-stock series are the measures the solver computes under contracts §4 rules ' +
      '1 to 11, taken from the opening stock of the case, its line rate, its delayed order and the ' +
      'levers of the option; the constraint check names every lever outside its bound.',
    inputs: [
      `levers = airSets ${scenario.levers.airSets}, transferSets ${scenario.levers.transferSets}`,
      `ordersOnTime = ${scenario.ordersOnTime}`,
      `ordersTotal = ${scenario.ordersTotal}`,
      `addedCostEur = ${scenario.addedCostEur}`,
      `lineIdleDays = ${scenario.lineIdleDays}`,
      `revenueDelayedEur = ${scenario.revenueDelayedEur}`,
      `runOut = day ${scenario.runOut.day}, fraction of that day ${scenario.runOut.fractionOfDay}`,
      `constraintCheck = ${scenario.constraintCheck}`,
      ...scenario.constraintMessages,
    ],
    upstream: uniqueRefs([
      scenario.exceptionId,
      ...scenario.orders.map((order) => order.orderId),
    ]),
    downstream: uniqueRefs(approvals),
    confidence: scenario.confidence,
    missingInputs: exception === undefined ? [] : [...exception.missingInputs],
    documents: documentsCiting(records, scenario.exceptionId),
  };
}

/**
 * The evidence behind one approval: where the plan stands and the write-backs it sets in motion.
 *
 * The two euro members are the record's own, so the plan's cost against the revenue it protects reads
 * as the comparison measured them. Every write-back is simulated, and the payload says so in the
 * formula and lists each step's recorded state; the fixed `Simulated write-back` label is applied by
 * the component that renders a step (AAP 0.10).
 *
 * @param ctx - The call's context: the records the approval references and the chain behind it.
 * @param approval - The approval the reference named.
 * @returns The approval's evidence payload.
 */
function approvalEvidence(ctx: HandlerContext, approval: Approval): Evidence {
  const records = ctx.state.records;
  const events = ctx.state.auditEvents
    .filter((event) => event.objectRef === approval.id)
    .map((event) => event.id);

  return {
    value: `${approval.status} on option ${approval.scenarioId}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The approval carries the added cost of the plan and the revenue it protects as the comparison ' +
      'measured them, and the write-backs it sets in motion in their recorded order. Each write-back ' +
      'is simulated: no system behind it is contacted, and the tracker labels every step.',
    inputs: [
      `status = ${approval.status}`,
      `addedCostEur = ${approval.addedCostEur}`,
      `protectedRevenueEur = ${approval.protectedRevenueEur}`,
      `requestedBy = ${approval.requestedBy}`,
      `outcomeReviewed = ${approval.outcomeReviewed}`,
      ...(approval.decidedBy === undefined ? [] : [`decidedBy = ${approval.decidedBy}`]),
      ...(approval.decidedAt === undefined ? [] : [`decidedAt = ${approval.decidedAt}`]),
      ...approval.writeBacks.map(
        (step) =>
          `write-back ${step.sequence}: ${step.system} record ${step.recordRef} stands ${step.state}`,
      ),
    ],
    upstream: uniqueRefs([approval.exceptionId, approval.scenarioId, approval.requestedBy]),
    downstream: uniqueRefs(events),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, approval.exceptionId),
  };
}

/**
 * The evidence behind one audit link: the fields the chain hashes and the neighbour each link names.
 *
 * The payload states the contracts §6 definition rather than re-deriving a hash, and it carries the
 * chain's own `Simulated control` label, because a browser page demonstrates the mechanism and
 * establishes nothing about a store behind it (rule P-4).
 *
 * @param ctx - The call's context, whose chain supplies the neighbouring links.
 * @param event - The event the reference named.
 * @returns The event's evidence payload.
 */
function auditEventEvidence(ctx: HandlerContext, event: AuditEvent): Evidence {
  const chain = ctx.state.auditEvents;
  const position = chain.findIndex((candidate) => candidate.id === event.id);
  const previous = position > 0 ? chain[position - 1] : undefined;
  const next = position >= 0 ? chain[position + 1] : undefined;

  return {
    value: `${event.action}, ${event.result}, at chain position ${event.sequence}`,
    provenance: 'computed',
    label: SIMULATED_CONTROL,
    formula:
      'Each link carries the event hash of the link before it as its previous hash, and its own event ' +
      'hash is the SHA-256 of the concatenated sequence, identifier, instant, actor type, actor id, ' +
      'action, object reference, result, policy identifier, payload hash and previous hash (contracts ' +
      '§6). The first link carries the genesis value as its previous hash.',
    inputs: [
      `timestamp = ${event.timestamp}`,
      `actorType = ${event.actorType}`,
      `actorId = ${event.actorId}`,
      `result = ${event.result}`,
      `payloadHash = ${event.payloadHash}`,
      `previousHash = ${event.previousHash}`,
      `eventHash = ${event.eventHash}`,
      `traceId = ${event.traceId}`,
    ],
    upstream: uniqueRefs([
      event.objectRef,
      ...(previous === undefined ? [] : [previous.id]),
    ]),
    downstream: uniqueRefs(next === undefined ? [] : [next.id]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(ctx.state.records, event.objectRef),
  };
}

/**
 * The evidence behind one evidence pin: the review state the canvas badges its node with.
 *
 * A pin carries no confidence member and no figure, so its payload states its state, the node it is
 * attached to and the vendor it concerns where one is recorded, and it derives its confidence from the
 * state. It carries `Simulated data` because the state is a seeded review rather than the outcome of a
 * live check (rule P-1).
 *
 * @param records - The session's record set.
 * @param pin - The pin the reference named.
 * @returns The pin's evidence payload.
 */
function pinEvidence(records: SeedRecordSet, pin: EvidencePin): Evidence {
  const elements = records.ppapPackages.flatMap((packageRecord) =>
    packageRecord.elements
      .filter((element) => element.pinId === pin.id)
      .map((element) => `${packageRecord.id} element ${element.number} (${element.name})`),
  );

  return {
    value: `${pin.state} on node ${pin.nodeRef}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'A pin records the review state of the evidence attached to one node of the FileMap canvas: the ' +
      'canvas badge counts the pins of a node by state, and the reviewer that decides a pin sets the ' +
      'state the record carries (contracts §8).',
    inputs: [
      `state = ${pin.state}`,
      `nodeRef = ${pin.nodeRef}`,
      ...(pin.vendorId === undefined ? [] : [`vendorId = ${pin.vendorId}`]),
    ],
    upstream: uniqueRefs([pin.nodeRef]),
    downstream: uniqueRefs(elements),
    confidence: confidenceOfPinState(pin.state),
    missingInputs: [],
    documents: documentsCiting(records, pin.nodeRef),
  };
}

/**
 * The evidence behind one document: what the record says about itself, never its body.
 *
 * The payload states the classification, the residency and the attachments the record carries, and it
 * lists the records the document is about as its downstream. The body is deliberately absent: it is
 * what `getDocument` releases to a permitted caller, and the evidence a drawer shows must not become a
 * second path to it.
 *
 * @param records - The session's record set.
 * @param document - The document the reference named.
 * @returns The document's evidence payload.
 */
function documentEvidence(records: SeedRecordSet, document: DocumentBody): Evidence {
  const namesRef = (text: string, ref: string): boolean => text.includes(ref);
  const namedExceptions = records.exceptions
    .filter((exception) => namesRef(document.title, exception.id) || namesRef(document.body, exception.id))
    .map((exception) => exception.id);
  const namedPackages = records.ppapPackages
    .filter(
      (packageRecord) =>
        namesRef(document.title, packageRecord.id) || namesRef(document.body, packageRecord.id),
    )
    .map((packageRecord) => packageRecord.id);

  return {
    value: document.title,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The document record states its own classification, its residency and the attachments it carries. ' +
      'A body classified customer-confidential is released only to a role that holds the permission ' +
      'gating it, and the service withholds it before serialising (contracts §7.1).',
    inputs: [
      `classification = ${document.classification}`,
      `residency = ${document.residency}`,
      ...document.attachments.map((attachment) => `attachment ${attachment.id}: ${attachment.name}`),
    ],
    upstream: [],
    downstream: uniqueRefs([...namedExceptions, ...namedPackages]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [document.id],
  };
}

/**
 * The evidence behind one customer order: the units, the price and the promise the record states.
 *
 * The downstream list is read from the records that answer this order — the exceptions whose affected
 * lines name it and the measured options whose per-order results name it — so the reader sees which
 * figures the order feeds. The revenue-at-risk rule of contracts §5 is named rather than applied.
 *
 * @param ctx - The call's context, whose records supply the exceptions and options that answer the order.
 * @param order - The order the reference named.
 * @returns The order's evidence payload.
 */
function customerOrderEvidence(ctx: HandlerContext, order: CustomerOrder): Evidence {
  const records = ctx.state.records;
  const exceptions = records.exceptions
    .filter((exception) => exception.affectedLines.some((line) => line.orderId === order.id))
    .map((exception) => exception.id);
  const scenarios = records.exceptionScenarios.flatMap((seeded) =>
    seeded.scenarioSet.scenarios
      .filter((scenario) => scenario.orders.some((result) => result.orderId === order.id))
      .map((scenario) => scenario.id),
  );

  return {
    value: `${order.status}, ${order.quantity} units due ${order.dueDate}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The order states its quantity, its agreed unit price and its promise date. Revenue at risk ' +
      'multiplies the units an exception places at risk by the product price (contracts §5), and the ' +
      'revenue a delayed option holds up is the measure the solver computes (contracts §4). Neither is ' +
      'recomputed here.',
    inputs: [
      `customerId = ${order.customerId}`,
      `productId = ${order.productId}`,
      `plantId = ${order.plantId}`,
      `quantity = ${order.quantity}`,
      `unitPriceEur = ${order.unitPriceEur}`,
      `dueDate = ${order.dueDate}`,
      `originalDueDate = ${order.originalDueDate}`,
      `status = ${order.status}`,
    ],
    upstream: uniqueRefs([order.customerId, order.productId, order.plantId]),
    downstream: uniqueRefs([...exceptions, ...scenarios]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, order.id),
  };
}

/**
 * The evidence behind one purchase order: the inbound commitment the projection measures.
 *
 * The order is what the case's supply schedule rests on, so its downstream list names the exceptions
 * that carry it as their delayed order and the solver cases whose measurement depends on it. Every
 * value in the payload is a field of the record.
 *
 * @param ctx - The call's context, whose records supply the exceptions and cases that answer the order.
 * @param order - The purchase order the reference named.
 * @returns The order's evidence payload.
 */
function purchaseOrderEvidence(ctx: HandlerContext, order: PurchaseOrder): Evidence {
  const records = ctx.state.records;
  const exceptions = records.exceptions
    .filter((exception) => exception.purchaseOrderId === order.id)
    .map((exception) => exception.id);
  const cases = records.solverCases
    .filter((solverCase) => solverCase.delayedPurchaseOrderId === order.id)
    .map((solverCase) => solverCase.id);

  return {
    value: `${order.status}, ${order.quantity} units due ${order.currentDueDate}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The delayed order is the supply input of the case it belongs to: the receipt date it states, ' +
      'with the opening stock and the line rate, fixes the run-out day under contracts §4 rules 1 to 4. ' +
      'This payload states the record and the rule and recomputes neither.',
    inputs: [
      `supplierId = ${order.supplierId}`,
      `materialId = ${order.materialId}`,
      `plantId = ${order.plantId}`,
      `quantity = ${order.quantity}`,
      `unitCostEur = ${order.unitCostEur}`,
      `orderedDate = ${order.orderedDate}`,
      `originalDueDate = ${order.originalDueDate}`,
      `currentDueDate = ${order.currentDueDate}`,
      `status = ${order.status}`,
    ],
    upstream: uniqueRefs([order.supplierId, order.materialId, order.plantId]),
    downstream: uniqueRefs([...exceptions, ...cases]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, order.id),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The two evidence reads — AAP 0.12.3, principle PR-6
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the evidence behind one displayed element: its value, where that came from, the rule behind it,
 * the records and documents around it, and what it is missing.
 *
 * The permission is evaluated before the reference is resolved, so an identifier without
 * `evidence.read` learns nothing about whether the record exists; the plant scope is evaluated once the
 * record is known; a pin is refused when `listVisiblePins` would not have released it, so a reference
 * cannot reach a pin the read filter withholds; and a customer-confidential document is withheld from a
 * persona that may not read its body, exactly as `getDocument` withholds it.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param ref - The reference the displayed element carries.
 * @returns The evidence payload the drawer renders.
 * @throws Problem - `'permission'` when the persona may not read evidence, when the record lies outside
 *   its plant scope, when a pin is outside what the persona may see, or when a customer-confidential
 *   document's body is withheld from it; `'not-found'` when no record answers the reference.
 */
export async function getEvidence(ctx: HandlerContext, ref: string): Promise<Evidence> {
  assertEvidenceRead(ctx);

  const resolved = resolveRef(ctx, ref.trim());
  const subject = subjectOf(ctx, resolved);

  if (subject !== null) {
    assertPlantReach(ctx, subject);
  }

  if (resolved.family === 'pin' && !pinVisibleTo(ctx, resolved.record)) {
    throw permissionProblem(
      ctx,
      EVIDENCE_READ,
      `Evidence pin ${resolved.record.id} is not one the acting persona (${ctx.actor.id}) may see: a pin is released to the plant scope of the acting role, or to the vendor the persona's own records attribute to it.`,
    );
  }

  if (resolved.family === 'document') {
    assertDocumentBodyReadable(ctx, resolved.record);
  }

  return evidenceFor(ctx, resolved);
}

/**
 * Reads one document's body as the acting persona may receive it, or withholds it.
 *
 * The redaction AAP 0.2.1 and AAP 0.12.3 require happens here, before the record leaves the service: a
 * body classified customer-confidential is refused with a `Problem` naming the classification and the
 * permission that would release it, and it is placed in no payload, no message and no log for that
 * caller. A permitted caller receives the record's own title, classification, residency, attachments
 * and body, copied so a screen cannot write into the session.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param id - The `DOC-nnnn` identifier of the document to read.
 * @returns The document body as released to this caller.
 * @throws Problem - `'permission'` when the persona may not read evidence or may not open this body;
 *   `'not-found'` when the record set holds no document with that identifier.
 */
export async function getDocument(ctx: HandlerContext, id: DocumentId): Promise<DocumentBody> {
  assertEvidenceRead(ctx);

  const document = ctx.state.records.documents.find((candidate) => candidate.id === id);

  if (document === undefined) {
    throw notFoundProblem(
      ctx,
      `The record set holds no document with the identifier ${id}, so no body can be released.`,
    );
  }

  assertDocumentBodyReadable(ctx, document);

  return {
    ...document,
    attachments: document.attachments.map((attachment) => ({ ...attachment })),
  };
}



/* ---------------------------------------------------------------------------------------------
 * Which pins a persona may see — AAP 0.2.1, contracts §7.1 `EvidencePin`
 * ------------------------------------------------------------------------------------------- */

/**
 * The plants one supplier's records reach.
 *
 * Two relations place a supplier in a plant, and both are read rather than assumed: the products its
 * materials go into are built on lines, and a line belongs to one plant; and a purchase order names the
 * plant it delivers to. The union is the set the pin filter narrows by, so a supplier whose material
 * reaches only one site is not admitted to the pins of another.
 *
 * @param records - The session's record set.
 * @param supplierId - The supplier whose plants are resolved.
 * @returns The plants its records reach, in record order.
 */
function plantsServedBy(records: SeedRecordSet, supplierId: SupplierId): PlantId[] {
  const viaMaterials = records.materials
    .filter((material) => material.primarySupplierId === supplierId)
    .flatMap((material) => material.productIds)
    .flatMap((productId) => records.products.find((product) => product.id === productId)?.lineIds ?? [])
    .map((lineId) => records.lines.find((line) => line.id === lineId)?.plantId)
    .filter((plantId): plantId is PlantId => plantId !== undefined);
  const viaOrders = records.purchaseOrders
    .filter((order) => order.supplierId === supplierId)
    .map((order) => order.plantId);

  return uniqueRefs([...viaMaterials, ...viaOrders]);
}

/**
 * The plants a node of the FileMap canvas is placed in by the records, or none when the records place
 * it nowhere.
 *
 * A plant node is its own plant. A supplier reaches the plants of the products its materials go into
 * and of the plants its orders deliver to. A tier-2 origin reaches the plants of the suppliers it feeds,
 * which is the lane the origin's own record declares. A customer reaches the plants its orders ship
 * from. A node no record places returns nothing, which the filter treats as "no plant to narrow by"
 * rather than as "out of scope": a record the workspace has not placed is not another plant's record,
 * and hiding it would lose evidence the canvas badges.
 *
 * @param records - The session's record set.
 * @param nodeRef - The node a pin is attached to.
 * @returns The plants the records place that node in, in record order.
 */
function plantsOfNode(records: SeedRecordSet, nodeRef: string): PlantId[] {
  if (records.plants.some((plant) => plant.id === nodeRef)) {
    return [nodeRef];
  }

  const supplierPlants = plantsServedBy(records, nodeRef);

  if (supplierPlants.length > 0) {
    return supplierPlants;
  }

  const origin = records.origins.find((candidate) => candidate.id === nodeRef);

  if (origin !== undefined) {
    return uniqueRefs(
      origin.supplierIds.flatMap((supplierId) => plantsServedBy(records, supplierId)),
    );
  }

  return uniqueRefs(
    records.customerOrders
      .filter((order) => order.customerId === nodeRef)
      .map((order) => order.plantId),
  );
}

/**
 * The suppliers the session's records attribute to the acting persona.
 *
 * Two relations place a persona beside a supplier, and the records state both. A persona that stands
 * outside the company declares the suppliers it represents in its own record's `vendorIds`, which is
 * where AAP 0.2.1's "USR-08 sees only its own-vendor pins" finds the attribution it needs: the
 * external engineer's record names the one seal supplier whose records that persona comes to inspect.
 * Any persona also reaches the suppliers of the exceptions it owns, whose records name both, and the
 * seven internal personas reach their vendors that way alone.
 *
 * The union is the set the pin filter narrows by, with the declared vendors first and the
 * owned-exception suppliers after them, so the order is fixed by the records and not by the read. A
 * persona the records attribute no vendor to resolves to no supplier, and its vendor-scoped read then
 * releases nothing: withholding another party's evidence is recoverable and releasing it is not, so the
 * empty set fails closed.
 *
 * @param records - The session's record set.
 * @param actor - The persona the call acts as.
 * @returns The distinct suppliers the records attribute to it, declared vendors first.
 */
function vendorsFor(records: SeedRecordSet, actor: ActiveUser): SupplierId[] {
  const persona = records.users.find((candidate) => candidate.id === actor.id);
  const declared = persona?.vendorIds ?? [];
  const owned = records.exceptions
    .filter((exception) => exception.ownerId === actor.id)
    .map((exception) => exception.supplierId);

  return uniqueRefs([...declared, ...owned]);
}

/**
 * Whether one pin is inside what the acting persona may see.
 *
 * Two different narrowings, one per role family. An external supplier engineer sees only the pins its
 * own vendor's evidence carries, which is the vendor-scoped read AAP 0.2.1 names and the reason a pin on
 * a supplier node records that supplier. Every other role sees the pins of the plants its scope admits,
 * decided by the same matrix and the same persona scope every scoped read uses, so a pin on a node the
 * records place in no plant is admitted rather than hidden.
 *
 * @param ctx - The call's context: the persona and the records its reach is resolved from.
 * @param pin - The pin under consideration.
 * @returns `true` when the pin may be released to this persona.
 */
function pinVisibleTo(ctx: HandlerContext, pin: EvidencePin): boolean {
  if (ctx.actor.role === EXTERNAL_SUPPLIER_ROLE) {
    const vendors = vendorsFor(ctx.state.records, ctx.actor);

    return pin.vendorId !== undefined && vendors.includes(pin.vendorId);
  }

  const plants = plantsOfNode(ctx.state.records, pin.nodeRef);

  if (plants.length === 0) {
    return true;
  }

  return plants.some((plantId) =>
    hasPermission(ctx.actor.role, EVIDENCE_READ, { plantId }, ctx.actor),
  );
}

/**
 * Reads the evidence pins the acting persona may see, optionally narrowed to one node.
 *
 * The filter runs here, over the records the session holds, before any pin crosses the service
 * boundary: an external supplier engineer receives its own vendor's pins and no other, which is the
 * vendor-scoped read AAP 0.2.1 requires, and every other role receives the pins its plant scope admits.
 * The per-node counts travel with the topology, so the canvas badges a node without this call; the pin
 * records themselves belong to the stage that opens them, and this read exists for interface
 * conformance (AAP 0.12.2, AAP 0.12.3).
 *
 * Each returned pin is a copy, so a caller that edited one could not reach the session's record.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param nodeId - The node to narrow the read to, when the caller names one.
 * @returns The pins this persona may see, in the order the records hold them.
 * @throws Problem - A `'permission'` failure when the persona may not read evidence or the forbidden
 *   trigger is in effect.
 */
export async function listVisiblePins(
  ctx: HandlerContext,
  nodeId?: string,
): Promise<EvidencePin[]> {
  assertEvidenceRead(ctx);

  return ctx.state.records.evidencePins
    .filter((pin) => nodeId === undefined || pin.nodeRef === nodeId)
    .filter((pin) => pinVisibleTo(ctx, pin))
    .map((pin) => ({ ...pin }));
}

/* ---------------------------------------------------------------------------------------------
 * The package records — contracts §8, AAP 0.12.2. Conformance-only: stage S4 owns their screens
 * ------------------------------------------------------------------------------------------- */

/**
 * The package a reference names, or a refusal.
 *
 * @param ctx - The call's context, whose records are searched and whose state supplies the trace.
 * @param packageId - The `PPAP-nnnn` identifier of the package.
 * @returns The session's package record, by reference.
 * @throws Problem - A `'not-found'` failure naming the identifier.
 */
function findPackage(ctx: HandlerContext, packageId: PackageId): PpapPackage {
  const found = ctx.state.records.ppapPackages.find((candidate) => candidate.id === packageId);

  if (found === undefined) {
    throw notFoundProblem(
      ctx,
      `The record set holds no part approval package with the identifier ${packageId}, so no element of it can be read or reviewed.`,
    );
  }

  return found;
}

/**
 * A package's readiness, recomputed from the states its elements now carry.
 *
 * The figure is the passing elements over the package's own element count, handed to `wholePercent` —
 * the one whole-percent rule the codebase holds (contracts §5) — and it is recomputed only where a
 * review has changed an element state. Nothing else about the package is derived here.
 *
 * @param packageRecord - The package to measure.
 * @returns Readiness as a whole percent.
 * @throws Error - The package carries no element, so there is no count to divide by; a seeded package
 *   with no elements is a broken record rather than a caller's mistake.
 */
function readinessOf(packageRecord: PpapPackage): number {
  if (packageRecord.elements.length === 0) {
    throw new Error(
      `The record set holds part approval package ${packageRecord.id} with no element, so its readiness ` +
        'cannot be stated: readiness divides the passing elements by the element count of the package.',
    );
  }

  const passed = packageRecord.elements.filter((element) => element.state === PASS_STATE).length;

  return wholePercent(passed / packageRecord.elements.length);
}

/**
 * Whether every element above a warrant is complete, which is the condition RULE-18-PSW states.
 *
 * @param packageRecord - The package the warrant belongs to.
 * @param element - The warrant element.
 * @returns `true` when every element numbered below it stands in the pass state.
 */
function elementsAboveAreComplete(packageRecord: PpapPackage, element: PpapElement): boolean {
  return packageRecord.elements
    .filter((candidate) => candidate.number < element.number)
    .every((candidate) => candidate.state === PASS_STATE);
}

/**
 * The state the evidence rules produce for one element once a reviewer has acted on it.
 *
 * Six of the seven contracts §8 rules compare a reading the record holds as prose with a limit it also
 * holds as prose, so the record alone cannot re-decide them: their state stands as the extraction left
 * it. Two dispositions follow instead, and both are relations the record set does state:
 *
 * 1. RULE-18-PSW, the part submission warrant, stands only once every element above it is complete, so
 *    the warrant's state is read from those elements rather than from the review — a reviewer cannot
 *    sign a warrant the package is not ready for, and the seed records the warrant as the element that
 *    waits on the rest.
 * 2. Any other element is completed by the reviewer who settles it: an acceptance resolves a reading
 *    that stood in review, and a correction replaces the reading with the reviewer's own, so either one
 *    leaves the element in the pass state. An acceptance of an element in another state confirms the
 *    extraction without overriding the rule that decided it, so that state stands.
 *
 * @param packageRecord - The package the element belongs to.
 * @param element - The element under review.
 * @param decision - Whether the extracted value was accepted or corrected.
 * @returns The state the element holds after the review.
 */
function stateAfterReview(
  packageRecord: PpapPackage,
  element: PpapElement,
  decision: ElementReviewDecision,
): PinState {
  if (element.ruleId === WARRANT_RULE) {
    return elementsAboveAreComplete(packageRecord, element) ? PASS_STATE : EMPTY_STATE;
  }

  if (decision === 'correct') {
    return PASS_STATE;
  }

  return element.state === REVIEW_STATE ? PASS_STATE : element.state;
}

/**
 * A package copied so a caller cannot write into the session's record.
 *
 * The session's state is restored by a reset rather than by a caller's restraint (contracts §1), so
 * every record leaving this handler is copied — the package and each of its elements.
 *
 * @param packageRecord - The package to copy.
 * @returns A fresh package with fresh element records.
 */
function copyPackage(packageRecord: PpapPackage): PpapPackage {
  return {
    ...packageRecord,
    elements: packageRecord.elements.map((element) => ({ ...element })),
  };
}

/**
 * Reads one part approval package with its elements and the readiness they produce.
 *
 * Each element carries the contracts §8 rule that decided its state and that rule's own wording, so a
 * reader sees the rule the record applied rather than a label the interface composed (rule P-6). The
 * readiness figure is the record's own, computed by the seed through `wholePercent` and recomputed here
 * only after a review changes an element.
 *
 * Conformance-only: no S1-S3 screen calls this, and the package route renders the stage notice, because
 * the package map belongs to stage S4 (AAP 0.12.3, AAP 0.14.2).
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param id - The `PPAP-nnnn` identifier of the package to read.
 * @returns The package, copied.
 * @throws Problem - A `'permission'` failure when the persona may not read evidence or the forbidden
 *   trigger is in effect; a `'not-found'` failure when no package answers the identifier.
 */
export async function getPackage(ctx: HandlerContext, id: PackageId): Promise<PpapPackage> {
  assertEvidenceRead(ctx);

  return copyPackage(findPackage(ctx, id));
}

/**
 * Records a review of one extracted element value, re-runs the evidence rules and appends the audit
 * event the review leaves behind.
 *
 * What the review does is fixed by contracts §8 and AAP 0.6.2: the extracted value is accepted as the
 * extraction produced it or corrected to the value the reviewer supplies, the evidence rules are re-run
 * so the element's state is the one they now produce (`stateAfterReview`), the package's readiness is
 * recomputed from the states the elements carry, and one `extraction review` event joins the chain
 * through `appendAuditEvent`, which owns the instant, the sequence, the identifier and every hash.
 * The reviewer is the acting persona, and the permission the write requires is `evidence.review`.
 *
 * The reading the reviewer replaced is not lost: the element's `actual` member carries the value the
 * review leaves in place, and the extraction's own reading travels in the audit event's `before` half,
 * which is where the chain keeps what the record no longer states. The event is appended before the
 * record is edited, so a refused append leaves the element exactly as it stood.
 *
 * Conformance-only: no S1-S3 screen calls this, and its route renders the stage notice (AAP 0.12.3,
 * AAP 0.14.2). It is implemented because `extraction review` is one of the audited writes AAP 0.6.2
 * lists and the packages are the only S4 record set with seeded content.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param packageId - The package whose element is under review.
 * @param elementNumber - The element's number within that package.
 * @param review - The decision and the value the review leaves in place.
 * @returns The package as it stands after the rules were re-run, copied.
 * @throws Problem - `'permission'` when the persona may not review extracted values or the forbidden
 *   trigger is in effect; `'not-found'` when no package or element answers the request; `'validation'`
 *   when the review contradicts the arguments it arrived with or carries no corrected value.
 */
export async function reviewPackageElement(
  ctx: HandlerContext,
  packageId: PackageId,
  elementNumber: number,
  review: ElementReview,
): Promise<PpapPackage> {
  assertEvidenceReview(ctx);

  if (review.packageId !== packageId) {
    throw validationProblem(
      ctx,
      `The review names package ${review.packageId} while the call addresses package ${packageId}; one review describes one element of one package.`,
    );
  }

  if (review.elementNumber !== elementNumber) {
    throw validationProblem(
      ctx,
      `The review names element ${review.elementNumber} while the call addresses element ${elementNumber} of that package; one review describes one element.`,
    );
  }

  const packageRecord = findPackage(ctx, packageId);
  const element = packageRecord.elements.find((candidate) => candidate.number === elementNumber);

  if (element === undefined) {
    throw notFoundProblem(
      ctx,
      `Part approval package ${packageId} holds no element numbered ${elementNumber}, so no value of it can be reviewed.`,
    );
  }

  const correctedValue = review.correctedValue.trim();

  if (review.decision === 'correct' && correctedValue === '') {
    throw validationProblem(
      ctx,
      `A correction of element ${elementNumber} of package ${packageId} has to carry the value the reviewer supplies; this review supplies none.`,
    );
  }

  const previousState = element.state;
  const nextState = stateAfterReview(packageRecord, element, review.decision);
  const nextActual = review.decision === 'correct' ? correctedValue : element.actual;

  await appendAuditEvent(ctx, {
    action: 'extraction review',
    objectRef: packageRecord.id,
    result: 'succeeded',
    before: { element: element.number, state: previousState, actual: element.actual },
    after: { element: element.number, state: nextState, actual: nextActual, decision: review.decision },
  });

  element.actual = nextActual;
  element.humanReviewed = true;
  element.state = nextState;
  packageRecord.readinessPercent = readinessOf(packageRecord);

  return copyPackage(packageRecord);
}
