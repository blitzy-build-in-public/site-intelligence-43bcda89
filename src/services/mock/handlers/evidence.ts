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
 * WHAT IT COMPUTES AND WHAT IT ONLY REPORTS — rule P-6. A record's payload computes no business
 * figure: every number it states is a field of the record that carries it, quoted as the record states
 * it, and the `formula` member names the contracts §4 rule or §5 aggregate that owns the figure
 * instead of re-deriving it. Two figures are the exception, and each is taken from the module that
 * owns it rather than computed here: the package readiness entities §3 defines as a computed value is
 * produced by `wholePercent`, the single whole-percent rule the codebase holds, from the package's own
 * element count; and an aggregate reference is answered from the aggregation modules the screens
 * themselves read (see below). No currency amount, no record identifier and no expected result is
 * typed here, and nothing imports `tests/fixtures/`.
 *
 * THE RESOLUTION ORDER, STATED ONCE — `getEvidence`. The two aggregate roots are tested first,
 * because a figure the screens compose names an aggregate rather than a record and the colon keeps
 * such a reference clear of every identifier pattern contracts §1 fixes. A record reference then
 * selects its family by identifier prefix, and each family looks its own records up by exact
 * identifier. The order below is the order the lookup walks, and it is deterministic: longer prefixes
 * first, so `PPAP-` is tested before `PO-`, and a reference matching no family, or matching one whose
 * records hold no such identifier, is refused as `'not-found'` naming the reference. There is no fuzzy
 * match, no prefix search over the records and no fall-back to "the first record" — a drawer that
 * silently showed a neighbouring figure would be worse than one that reports the reference it could
 * not resolve. The families, in order: overview aggregate, canvas aggregate, package, exception,
 * scenario, approval, audit event, evidence pin, document, customer order, purchase order, material,
 * production line, plant, supplier, origin, customer.
 *
 * THE TWO AGGREGATE ROOTS ARE COMPUTED FIGURES — AAP 0.2.1 F12, PR-6, rule P-6. SCR-01 composes
 * `overview:<key>` for its four tiles, `overview:plant/<plantId>/revenue-at-risk` for its by-plant rows
 * and bars and `overview:day/<date>/<kind>` for its fourteen-day series; SCR-12 composes `canvas:<key>`
 * for the six ribbon tiles. Neither root names a record, so no record could answer it and the drawer
 * opened on its failure region instead of on the four sections PR-6 requires. Both are answered here
 * from the aggregation modules the screens read — `computeOverview`, `computeExceptionRows` and
 * `computeRibbonTiles` in `src/domain/aggregation/` — over the session's own records, so a tile's
 * evidence and the tile are one figure from one function rather than two that could disagree.
 *
 * THE SELECTION TRAVELS IN THE REFERENCE — AAP 0.2.1 F12, PR-6, AAP 0.12.1 "Scope resolution". The
 * port's `getEvidence(ref)` carries the reference and no scope, and it is fixed that way, so a
 * reference a screen composes states the selection it was read with: the aggregate's own path, a `?`,
 * and the plants and products of the `Scope` the screen handed the aggregate read, in that scope's own
 * order (`overview:revenue-at-risk?plants=PLT-RGB&products=PRD-R75`). A reference naming no selection —
 * the bare `overview:revenue-at-risk` a scope of "all plants and all products" still composes — states
 * the empty selection. The selection is read back here as the `ScopeFilterInput` the adapter's own
 * reads pass and resolved through the same `resolveScope(filters, ctx.actor.role)`, so the drawer's
 * population is exactly the population the screen read: a plant chosen in the top bar narrows the
 * figure's evidence as it narrows the figure (AAP 0.2.1, the one scope resolver). Each
 * payload lists the resolved scope's plants and products under its inputs, so a filtered figure says
 * which population it covers. A key no aggregate produces, a plant no by-plant row carries, a date
 * outside the series, a selection that cannot be parsed and a selection naming a plant or product the
 * record set does not hold are all refused as `'not-found'` naming the reference, exactly as an
 * unknown record identifier is: an unreadable selection is reported, never dropped and never widened
 * to the persona's whole scope, because a drawer that showed a neighbouring figure would be worse than
 * one that reports the reference it could not resolve.
 *
 * THE FOUR TOPOLOGY NODE FAMILIES ARE RECORDS — AAP 0.2.1 F12. The FileMap canvas draws nodes that are
 * the seed records themselves: `src/services/mock/handlers/topology.ts` copies each plant, supplier,
 * tier-2 origin and customer into its node, so the node identifier IS the record identifier and the
 * evidence read resolves it like any other reference. A node is placed in no single plant — a supplier
 * reaches every plant its materials and orders serve, an origin every plant of the suppliers it feeds,
 * a customer every plant its orders ship from — so a node's plant scope is decided over the plants the
 * records place it in rather than by one subject, which is what `assertNodeReach` does.
 *
 * THE IMPACT CHAIN'S TWO OTHER NODE KINDS ARE RECORDS TOO — AAP 0.2.1 F12. SCR-03 draws a material and
 * a production line as nodes of the same chain, each carrying the identifier of the record behind it
 * (`src/services/mock/handlers/exceptions.ts` builds them that way), so `MAT-…` and `LN-…` resolve here
 * like any other reference rather than being refused. A line belongs to exactly one plant, so it is
 * plant-scoped by its own record; a material is reached by the products it is built into — through the
 * lines those products are built on — and by the purchase orders that deliver it to a plant, so its
 * reach is decided over every plant the records place it in, by the same `plantsOfNode` the canvas
 * nodes use. Both payloads quote the record's own fields and name the rule that reads them, so a chain
 * node opens the record it stands for and not a copy of it (rules P-6, P-7).
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
import { computeExceptionRows } from '../../../domain/aggregation/exceptions';
import type { BaselineSolve } from '../../../domain/aggregation/exceptions';
import { computeOverview } from '../../../domain/aggregation/overview';
import type { OverviewInput } from '../../../domain/aggregation/overview';
import { resolveScope } from '../../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../../domain/aggregation/scope';
import { computeRibbonTiles } from '../../../domain/aggregation/urgency';
import { solveSupplyDelay } from '../../../domain/solver/solve-supply-delay';
import { DEMO_CLOCK, SIM_LABELS } from '../../../types';
import type {
  ActiveUser,
  Approval,
  AuditEvent,
  Classification,
  Confidence,
  DailyCountPoint,
  DocumentBody,
  DocumentId,
  ElementReview,
  ElementReviewDecision,
  Evidence,
  EvidencePin,
  EvidenceRuleId,
  ExceptionRow,
  Freshness,
  IsoDate,
  Levers,
  ListQuery,
  MaterialId,
  OperationalException,
  Overview,
  PackageId,
  Permission,
  PinState,
  PlantId,
  PlantRiskRow,
  PpapElement,
  PpapPackage,
  Problem,
  RibbonTile,
  Role,
  Scenario,
  Scope,
  SimLabel,
  SolverCase,
  SourceId,
  SupplierId,
} from '../../../types';
import type { HandlerContext, MockState } from '../mock-state';
import type {
  Customer,
  CustomerOrder,
  Line,
  Material,
  Origin,
  Plant,
  PurchaseOrder,
  SeedRecordSet,
  Supplier,
} from '../seed-loader';
import { freshnessFor, isSimulationOn } from '../simulation';
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

/**
 * `Simulated data` — a seeded record, labelled exactly as specification §5.3 fixes it, read from the
 * tuple that owns the string (rule P-1).
 */
const SIMULATED_DATA: SimLabel = SIM_LABELS[0];

/**
 * `Simulated calculation` — a figure the solver or an aggregate computes, read from the owning tuple
 * (rule P-1).
 */
const SIMULATED_CALCULATION: SimLabel = SIM_LABELS[1];

/**
 * `Simulated control` — the audit chain, whose wording AAP 0.10 places on it wherever it surfaces;
 * read from the owning tuple.
 */
const SIMULATED_CONTROL: SimLabel = SIM_LABELS[4];

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
 * The two aggregate roots a screen's computed figures compose — AAP 0.2.1 F12, PR-6
 * ------------------------------------------------------------------------------------------- */

/**
 * The root SCR-01 composes for its own figures: `${OVERVIEW_AGGREGATE_ROOT}<aggregate key>`, followed
 * by the selection the figure was read with when that selection names one.
 *
 * The screen owns the reference it puts on a tile, a by-plant row or a series point, and this module
 * answers that same string rather than a second spelling of it — one owner per shape, so the producer
 * and the resolver cannot drift apart. The four tiles carry the aggregate's own key
 * (`overview:revenue-at-risk`), a plant's reading names the plant it groups by
 * (`overview:plant/PLT-RGB/revenue-at-risk`) and a day's names the date and the series it counts
 * (`overview:day/2026-11-20/open`). Each of the three shapes carries the same selection suffix after a
 * `?` when the scope it was read with names plants or products
 * (`overview:plant/PLT-RGB/revenue-at-risk?plants=PLT-RGB&products=PRD-R75`), which is what keeps a
 * filtered by-plant row's drawer on the row's own figure; `parseAggregateReference` reads it back.
 */
const OVERVIEW_AGGREGATE_ROOT = 'overview:';

/**
 * The root SCR-12 composes for its six ribbon figures: `${CANVAS_AGGREGATE_ROOT}<aggregate key>`,
 * followed by the selection the figure was read with when that selection names one.
 *
 * The keys are the aggregate keys `src/domain/aggregation/urgency.ts` emits as `RibbonTile.id`, so the
 * screen composes a tile's reference from the tile's own identifier and this module resolves it by the
 * same identifier. The selection suffix is the overview root's, spelled the same way
 * (`canvas:revenue-at-risk?plants=PLT-RGB`), so the two roots read one grammar.
 */
const CANVAS_AGGREGATE_ROOT = 'canvas:';

/** The segment that opens a by-plant reference after the root: `plant/<plantId>/revenue-at-risk`. */
const PLANT_SEGMENT = 'plant/';

/** The member a by-plant reference ends in, which is the reading the row reports. */
const REVENUE_AT_RISK_MEMBER = 'revenue-at-risk';

/** The segment that opens a series-point reference after the root: `day/<date>/<kind>`. */
const DAY_SEGMENT = 'day/';

/** The series member a day reference names for the exceptions the day opened. */
const OPEN_KIND = 'open';

/** The series member a day reference names for the exceptions the day resolved. */
const RESOLVED_KIND = 'resolved';

/* ---------------------------------------------------------------------------------------------
 * The selection an aggregate reference carries — AAP 0.2.1 F12, PR-6, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The question mark that opens the selection an aggregate reference carries.
 *
 * It keeps the selection clear of every path shape the two roots answer, because a plant identifier,
 * a date and an aggregate key spell none of it, and the aggregate roots are tested before every record
 * family, so a reference carrying one can match no identifier pattern contracts §1 fixes.
 */
const SELECTION_SEPARATOR = '?';

/** The parameter naming the plants the figure was computed over, spelled as `Scope.plants` names it. */
const PLANTS_PARAMETER = 'plants';

/** The parameter naming the products, spelled as `Scope.products` names it. */
const PRODUCTS_PARAMETER = 'products';

/** The character between two parameters of one selection. */
const PARAMETER_SEPARATOR = '&';

/** The character binding a parameter's name to the value it states. */
const PARAMETER_ASSIGNMENT = '=';

/** The character between two identifiers of one parameter's list, which the scope lists in its order. */
const LIST_SEPARATOR = ',';

/**
 * The source whose health an aggregate read is measured under.
 *
 * `OverviewInput.freshness` is the state the adapter attaches to a read rather than a member of a
 * record, and the figures an aggregate states are drawn from the order book and the stock. ERP is that
 * source, and it is also the source `src/services/mock/simulation.ts` marks stale for the stale trigger,
 * so the state an aggregate is computed under and the state the approval controls are disabled on are
 * one answer (AAP 0.2.1, T-13).
 */
const ORDER_BOOK_SOURCE: SourceId = 'erp';

/**
 * The sets a lever recovers in the do-nothing measurement.
 *
 * AAP 0.8 fixes the baseline as `solveSupplyDelay(<case>, { airSets: 0, transferSets: 0 })`, and a lever
 * below zero breaches its own bound (contracts §4), so zero is the lower bound every `LeverConstraint`
 * admits. It is a solver input rather than a business figure, and the solver echoes it on the result it
 * returns.
 */
const NO_SETS_RECOVERED = 0;

/** The baseline levers: neither lever pulled (AAP 0.8). */
const DO_NOTHING_LEVERS: Levers = {
  airSets: NO_SETS_RECOVERED,
  transferSets: NO_SETS_RECOVERED,
};

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

/**
 * `MAT-…`, one material — the record behind a `material` node of the investigation's impact chain.
 *
 * The impact chain draws four kinds of node and two of them are neither a canvas node nor an
 * order-book record: a material and a production line. Their identifiers are the records' own, exactly
 * as a canvas node's is, so each is resolved by the prefix contracts §1 gives its record and neither
 * shadows a family above it.
 */
const MATERIAL_PREFIX = 'MAT-';

/** `LN-…`, one production line — the record behind the impact chain's `line` node. */
const LINE_PREFIX = 'LN-';

/**
 * `PLT-…`, one plant — a node of the FileMap canvas and the record itself.
 *
 * The four node prefixes below select the family the drawing's four lanes carry, and each node's
 * identifier is the record's own, because the topology payload copies the record into its node. None
 * of the four is a prefix of another and none shadows a family above it, so their position after the
 * order-book families costs no lookup.
 */
const PLANT_PREFIX = 'PLT-';

/** `SUP-…`, one supplier — the record behind a supplier node. */
const SUPPLIER_PREFIX = 'SUP-';

/** `ORG-…`, one tier-2 origin — the record behind an origin node. */
const ORIGIN_PREFIX = 'ORG-';

/** `CUS-nnn`, one customer — the record behind a customer node. */
const CUSTOMER_PREFIX = 'CUS-';

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
 * Whether a resolved reference is a node whose plant reach is decided over several plants.
 *
 * Written as a type guard over the union's own discriminant, so `assertNodeReach` and the node builders
 * can take such a node and nothing else: the compiler then proves no plant-scoped record is narrowed by
 * the node rule, and no node by a single plant. A material joins the canvas's four families because the
 * investigation's impact chain draws it as a node and the records place it in every plant its products
 * are built at and its orders deliver to.
 *
 * @param resolved - The record the reference named.
 * @returns Whether it is a plant, a supplier, an origin, a customer or a material.
 */
function isNodeRef(resolved: ResolvedRef): resolved is NodeRef {
  switch (resolved.family) {
    case 'plant':
    case 'supplier':
    case 'origin':
    case 'customer':
    case 'material':
      return true;
    default:
      return false;
  }
}

/**
 * Refuses the call when a canvas node lies outside the persona's effective plant scope everywhere the
 * records place it.
 *
 * A node reaches plants rather than belonging to one: a plant node is its own plant, a supplier the
 * plants of the products its materials go into and of the plants its orders deliver to, a tier-2 origin
 * the plants of the suppliers it feeds, a customer the plants its orders ship from, and a material the
 * plants its products are built at and its purchase orders deliver to. `plantsOfNode` is the records'
 * own answer to that question — the same function the pin filter is narrowed by, so a node's evidence
 * and its pins cannot disagree about which plants it touches — and the node is readable when the
 * persona's effective scope covers at least one of them.
 *
 * A node the records place in no plant is not narrowed at all: there is no plant to intersect the
 * persona's scope with, and `hasPermission` documents a `null` subject as the permission's own decision.
 * The refusal names the node and every plant it reaches, so a reader is told which of the drawing's
 * records stand outside their scope instead of being told that something was refused (rule P-8).
 *
 * @param ctx - The call's context: the persona the check is made for.
 * @param resolved - The node the reference named.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertNodeReach(ctx: HandlerContext, resolved: NodeRef): void {
  const plants = plantsOfNode(ctx.state.records, resolved.record.id);

  if (plants.length === 0) {
    return;
  }

  if (
    plants.some((plantId) => hasPermission(ctx.actor.role, EVIDENCE_READ, { plantId }, ctx.actor))
  ) {
    return;
  }

  throw permissionProblem(
    ctx,
    EVIDENCE_READ,
    `Node ${resolved.record.id} reaches ${plants.join(', ')}, and none of those plants lies inside the plant scope of the acting persona (${ctx.actor.id}), so its evidence is not readable here.`,
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
 * A discriminated union over the families the resolution order names, so the payload builder below can
 * switch over the family and the compiler proves every family is handled: a family added to the union
 * without a builder case does not compile. The record is the session's own record by reference, read
 * and never modified here. The first two arms are the aggregate roots, which name a computed figure
 * rather than a record; the `aggregate` arm therefore carries the figure itself, resolved to the
 * aggregation module's own output (see {@link AggregateFigure}).
 */
type ResolvedRef =
  | { readonly family: 'overview-aggregate'; readonly figure: AggregateFigure }
  | { readonly family: 'canvas-aggregate'; readonly figure: AggregateFigure }
  | { readonly family: 'package'; readonly record: PpapPackage }
  | { readonly family: 'exception'; readonly record: OperationalException }
  | { readonly family: 'scenario'; readonly record: Scenario }
  | { readonly family: 'approval'; readonly record: Approval }
  | { readonly family: 'audit-event'; readonly record: AuditEvent }
  | { readonly family: 'pin'; readonly record: EvidencePin }
  | { readonly family: 'document'; readonly record: DocumentBody }
  | { readonly family: 'customer-order'; readonly record: CustomerOrder }
  | { readonly family: 'purchase-order'; readonly record: PurchaseOrder }
  | { readonly family: 'material'; readonly record: Material }
  | { readonly family: 'line'; readonly record: Line }
  | { readonly family: 'plant'; readonly record: Plant }
  | { readonly family: 'supplier'; readonly record: Supplier }
  | { readonly family: 'origin'; readonly record: Origin }
  | { readonly family: 'customer'; readonly record: Customer };

/**
 * The arms of {@link ResolvedRef} whose plant reach is decided over several plants.
 *
 * Separated from the union so the reach check and the payload builder can take such a node and nothing
 * else: its plant scope is decided over every plant the records place it in, which no other family
 * needs, and the compiler then proves the two helpers below are never handed a record that is
 * plant-scoped by a single plant. The canvas's four node families are here — a supplier, an origin and
 * a customer each reach several plants — and so is a material of the investigation's impact chain,
 * which a product reaches through the lines it is built on and an order delivers to a plant.
 */
type NodeRef = Extract<
  ResolvedRef,
  { readonly family: 'plant' | 'supplier' | 'origin' | 'customer' | 'material' }
>;

/**
 * Resolves one reference to the record that answers it, in the module's documented order.
 *
 * The two aggregate roots are tested first: a figure the screens compose names an aggregate rather than
 * a record, and its colon keeps it clear of every identifier pattern, so the two branches cost the
 * record families below no lookup. A record reference then selects its family by prefix and that
 * family's own records are searched for the exact identifier, so a reference either names a record the
 * session holds or is refused. The order is the one this module's header states — overview aggregate,
 * canvas aggregate, package, exception, scenario, approval, audit event, pin, document, customer order,
 * purchase order, material, production line, plant, supplier, origin, customer — and it is written out
 * here rather than derived from a table so a reader can see it. `PPAP-` is tested first among the
 * records because a package identifier begins with the two letters a purchase order's begins with, and
 * a shorter prefix tested first would shadow it. The node families close the walk because their
 * prefixes collide with no other: a node's identifier is the record's own, so `PLT-RGB` resolves to the
 * plant record exactly as `EXC-…` resolves to its exception and `MAT-…` to its material.
 *
 * The messages of the refusals quote the reference the caller sent, never a neighbour's identifier:
 * an unresolvable drawer reports what it could not resolve.
 *
 * @param ctx - The call's context, whose records are searched and whose state supplies the trace.
 * @param ref - The reference the displayed element carries.
 * @returns The family and the record or computed figure it names.
 * @throws Problem - A `'not-found'` failure naming the reference when no record or aggregate answers it.
 */
function resolveRef(ctx: HandlerContext, ref: string): ResolvedRef {
  const records = ctx.state.records;

  if (ref.startsWith(OVERVIEW_AGGREGATE_ROOT)) {
    return { family: 'overview-aggregate', figure: overviewAggregateFigure(ctx, ref) };
  }

  if (ref.startsWith(CANVAS_AGGREGATE_ROOT)) {
    return { family: 'canvas-aggregate', figure: canvasAggregateFigure(ctx, ref) };
  }

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

  if (ref.startsWith(MATERIAL_PREFIX)) {
    const found = records.materials.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'material', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no material with the identifier ${ref}, so the evidence behind that impact-chain node cannot be resolved.`,
    );
  }

  if (ref.startsWith(LINE_PREFIX)) {
    const found = records.lines.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'line', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no production line with the identifier ${ref}, so the evidence behind that impact-chain node cannot be resolved.`,
    );
  }

  if (ref.startsWith(PLANT_PREFIX)) {
    const found = records.plants.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'plant', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no plant with the identifier ${ref}, so the evidence behind that canvas node cannot be resolved.`,
    );
  }

  if (ref.startsWith(SUPPLIER_PREFIX)) {
    const found = records.suppliers.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'supplier', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no supplier with the identifier ${ref}, so the evidence behind that canvas node cannot be resolved.`,
    );
  }

  if (ref.startsWith(ORIGIN_PREFIX)) {
    const found = records.origins.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'origin', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no tier-2 origin with the identifier ${ref}, so the evidence behind that canvas node cannot be resolved.`,
    );
  }

  if (ref.startsWith(CUSTOMER_PREFIX)) {
    const found = records.customers.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'customer', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The order book holds no customer with the identifier ${ref}, so the evidence behind that canvas node cannot be resolved.`,
    );
  }

  throw notFoundProblem(
    ctx,
    `No record family answers the reference ${ref}. A reference names an aggregate of the overview or of the canvas ribbon, a package, an exception, a scenario, an approval, an audit event, an evidence pin, a document, a customer order, a purchase order, a material, a production line, a plant, a supplier, a tier-2 origin or a customer.`,
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
 * give them: a scenario and an approval to the plant of the exception they answer, a production line to
 * the plant it belongs to, and a pin to its own node when that node is a plant. A package, an audit
 * event and a document name no plant, so they are not plant-scoped and the permission alone decides
 * whether they are readable — which is the reading `hasPermission` documents for a `null` subject. A
 * A node the records place in several plants, and an aggregate, which is computed over the scope its own
 * reference's selection resolves to, are the cases a single subject cannot state: the node is answered
 * by `assertNodeReach` and the aggregate carries no subject at all, and the switch below returns `null`
 * for both.
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
    case 'line':
      return { plantId: resolved.record.plantId };
    case 'pin':
      return records.plants.some((plant) => plant.id === resolved.record.nodeRef)
        ? { plantId: resolved.record.nodeRef }
        : null;
    case 'scenario':
      return plantOfException(records, resolved.record.exceptionId);
    case 'approval':
      return plantOfException(records, resolved.record.exceptionId);
    case 'plant':
    case 'supplier':
    case 'origin':
    case 'customer':
    case 'material':
      /*
       * A node can be placed in several plants — a supplier serves every plant its materials and
       * orders reach, an origin the plants of the suppliers it feeds, a customer the plants its
       * orders ship from, a material the plants its products are built at and its orders deliver to —
       * so its reach is decided over all of them by `assertNodeReach` rather than by one subject here.
       */
      return null;
    case 'overview-aggregate':
    case 'canvas-aggregate':
      /*
       * An aggregate is computed over the plants the acting persona's own role admits (see the module
       * header), so there is no single plant for the matrix to narrow it by: the scope it was computed
       * over is exactly the scope the persona may read.
       */
      return null;
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
 * Builds the drawer's payload for one resolved reference.
 *
 * The payload states the figure's or the record's own value, where the value came from, the fixed label
 * the element must carry, the contracts §4 or §5 rule that owns the figure, the record values that fed
 * it, the records upstream and downstream of it, its confidence, the inputs it is missing and the
 * documents behind it — the four sections of the evidence drawer in typed form. An aggregate root has
 * no record behind it, so it is answered from the figure the resolution already computed by the
 * aggregation module (see {@link aggregateEvidence}).
 *
 * @param ctx - The call's context, whose records resolve the neighbouring records the payload lists.
 * @param resolved - The record or the computed figure the reference named.
 * @returns The evidence payload.
 */
function evidenceFor(ctx: HandlerContext, resolved: ResolvedRef): Evidence {
  switch (resolved.family) {
    case 'overview-aggregate':
    case 'canvas-aggregate':
      return aggregateEvidence(ctx, resolved.figure);
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
    case 'material':
      return materialEvidence(ctx.state.records, resolved.record);
    case 'line':
      return lineEvidence(ctx.state.records, resolved.record);
    case 'plant':
      return plantEvidence(ctx.state.records, resolved.record);
    case 'supplier':
      return supplierEvidence(ctx.state.records, resolved.record);
    case 'origin':
      return originEvidence(ctx.state.records, resolved.record);
    case 'customer':
      return customerEvidence(ctx.state.records, resolved.record);
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

/**
 * The evidence behind one plant node: the site the record states and the lines it runs.
 *
 * A plant node of the FileMap canvas is the plant record itself — `topology.ts` copies the record into
 * the node — so the payload reports the record's own name, place, coordinates and lines and nothing
 * derived from them. Its downstream list is the exceptions the records record at the plant: the ones
 * whose disruption lands there and the ones whose also-affected plants name it, which are the records
 * the selection on this node leads a reader to. The formula names the contracts §5 aggregates and the
 * §8 pin rule that read the same records rather than restating any of their figures.
 *
 * @param records - The session's record set.
 * @param plant - The plant record the reference named.
 * @returns The plant's evidence payload.
 */
function plantEvidence(records: SeedRecordSet, plant: Plant): Evidence {
  const exceptions = records.exceptions
    .filter(
      (exception) =>
        exception.plantId === plant.id || exception.alsoAffectsPlantIds.includes(plant.id),
    )
    .map((exception) => exception.id);

  return {
    value: `${plant.name}, ${plant.location}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The plant record states its own name, place, coordinates and the lines it runs. The figures that ' +
      'name a plant — revenue at risk by plant, the queue the plant filter narrows, and the pins the ' +
      'canvas badges the node with — are the contracts §5 aggregates and the contracts §8 pin rule over ' +
      'the records that name this plant. This payload states those rules and derives nothing from them.',
    inputs: [
      `id = ${plant.id}`,
      `name = ${plant.name}`,
      `location = ${plant.location}`,
      `latitude = ${plant.latitude}`,
      `longitude = ${plant.longitude}`,
      ...plant.lineIds.map((lineId) => `lineId = ${lineId}`),
    ],
    upstream: uniqueRefs(plant.lineIds),
    downstream: uniqueRefs(exceptions),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, plant.id),
  };
}

/**
 * The evidence behind one supplier node: the site, the lead time, the materials and the readings.
 *
 * The reach the graph lens bands the node by is the records' own: the materials this supplier is the
 * primary supplier of, the tier-2 origins whose `supplierIds` name it, and the plants its materials go
 * into or its orders deliver to (`plantsServedBy`, the same helper the node's plant scope is decided
 * by). The on-time delivery series is reported reading by reading, in the record's own order, and no
 * average, trend or rank is computed from it here.
 *
 * @param records - The session's record set.
 * @param supplier - The supplier record the reference named.
 * @returns The supplier's evidence payload.
 */
function supplierEvidence(records: SeedRecordSet, supplier: Supplier): Evidence {
  const origins = records.origins
    .filter((origin) => origin.supplierIds.includes(supplier.id))
    .map((origin) => origin.id);
  const exceptions = records.exceptions
    .filter((exception) => exception.supplierId === supplier.id)
    .map((exception) => exception.id);

  return {
    value: `${supplier.name}, ${supplier.country}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The supplier record states its site, its contracted lead time, the materials it is the primary ' +
      'supplier of and its monthly on-time delivery readings. The products and plants it reaches are ' +
      'the ones those materials and the orders naming it resolve to (AAP §0.12.2), which is the reach ' +
      'the graph lens bands its node by. This payload states the record and that rule and computes ' +
      'neither.',
    inputs: [
      `id = ${supplier.id}`,
      `name = ${supplier.name}`,
      `country = ${supplier.country}`,
      `latitude = ${supplier.latitude}`,
      `longitude = ${supplier.longitude}`,
      `leadTimeDays = ${supplier.leadTimeDays}`,
      ...supplier.materialIds.map((materialId) => `materialId = ${materialId}`),
      ...supplier.onTimeDeliveryPct.map((reading) => `onTimeDeliveryPct = ${reading}`),
    ],
    upstream: uniqueRefs([...supplier.materialIds, ...origins]),
    downstream: uniqueRefs([...plantsServedBy(records, supplier.id), ...exceptions]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, supplier.id),
  };
}

/**
 * The evidence behind one tier-2 origin node: the site and the suppliers it feeds.
 *
 * An origin stands at the top of the chain the graph lens draws, so it has no upstream of its own and
 * its downstream list is the lane the drawing carries out of it — the suppliers its `supplierIds` name.
 * Every member of the payload is a field of the record.
 *
 * @param records - The session's record set.
 * @param origin - The origin record the reference named.
 * @returns The origin's evidence payload.
 */
function originEvidence(records: SeedRecordSet, origin: Origin): Evidence {
  return {
    value: `${origin.name}, ${origin.country}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The origin record states its site, its position and the suppliers it feeds. The lane the drawing ' +
      'carries from this node to a supplier lane is that relation and nothing else: the material each ' +
      'origin-to-supplier lane exists for is the one the supplier buys through it (AAP §0.12.2). This ' +
      'payload states the record and the relation and computes neither.',
    inputs: [
      `id = ${origin.id}`,
      `name = ${origin.name}`,
      `country = ${origin.country}`,
      `latitude = ${origin.latitude}`,
      `longitude = ${origin.longitude}`,
      ...origin.supplierIds.map((supplierId) => `supplierId = ${supplierId}`),
    ],
    upstream: [],
    downstream: uniqueRefs(origin.supplierIds),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, origin.id),
  };
}

/**
 * The evidence behind one customer node: the segment it buys in and the orders it holds.
 *
 * A customer reaches the products it buys through its orders rather than through a member of its own
 * record (AAP §0.12.2), so the payload lists the orders that name it and then the exceptions whose
 * affected lines name one of those orders — the records the disruption reaches from this node. Revenue
 * at risk on those lines is the contracts §5 aggregate, named here and not recomputed.
 *
 * @param records - The session's record set.
 * @param customer - The customer record the reference named.
 * @returns The customer's evidence payload.
 */
function customerEvidence(records: SeedRecordSet, customer: Customer): Evidence {
  const orders = records.customerOrders
    .filter((order) => order.customerId === customer.id)
    .map((order) => order.id);
  const exceptions = records.exceptions
    .filter((exception) =>
      exception.affectedLines.some((line) => orders.includes(line.orderId)),
    )
    .map((exception) => exception.id);

  return {
    value: `${customer.name}, ${customer.segment}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The customer record states its name, the segment it buys in, its country and its position, and ' +
      'reaches the products it buys through the orders that name it rather than through a member of its ' +
      'own. Revenue at risk on those orders is the contracts §5 aggregate over the affected lines the ' +
      'exceptions record. This payload states the record and those rules and computes neither.',
    inputs: [
      `id = ${customer.id}`,
      `name = ${customer.name}`,
      `segment = ${customer.segment}`,
      `country = ${customer.country}`,
      `latitude = ${customer.latitude}`,
      `longitude = ${customer.longitude}`,
    ],
    upstream: [],
    downstream: uniqueRefs([...orders, ...exceptions]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, customer.id),
  };
}

/**
 * The evidence behind one material node of the investigation's impact chain.
 *
 * The chain draws a material between the delayed purchase order and the line that consumes it, and the
 * node's reference is the material record's own identifier (`src/services/mock/handlers/exceptions.ts`
 * builds it that way). Every member of the payload is a field of that record: its name, the suppliers it
 * is bought from, the tier-2 origin behind the primary supplier, how much of it one finished unit
 * consumes, its unit cost and its lead time. The plants it reaches are not a member of the record — a
 * product reaches the material through the lines it is built on, and an order delivers it to a plant —
 * so the payload lists them from the records that place it, the same derivation its plant scope is
 * decided by (AAP §0.12.2). The readiness share a second supplier covers is the contracts §5 aggregate,
 * named here and not recomputed.
 *
 * @param records - The session's record set.
 * @param material - The material record the reference named.
 * @returns The material's evidence payload.
 */
function materialEvidence(records: SeedRecordSet, material: Material): Evidence {
  const orders = records.purchaseOrders
    .filter((order) => order.materialId === material.id)
    .map((order) => order.id);
  const exceptions = records.exceptions
    .filter((exception) => exception.materialId === material.id)
    .map((exception) => exception.id);

  return {
    value: `${material.name}, ${material.leadTimeDays} working days of lead time`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The material record states its name, the suppliers it is bought from, the tier-2 origin behind ' +
      'the primary supplier, the quantity one finished unit consumes, its unit cost and its lead time. ' +
      'The plants it reaches are the plants of the products it is built into and of the orders that ' +
      'deliver it (AAP §0.12.2), and the share of the material master a second supplier can cover is ' +
      'the contracts §5 aggregate. This payload states the record and those rules and computes neither.',
    inputs: [
      `id = ${material.id}`,
      `name = ${material.name}`,
      `quantityPerUnit = ${material.quantityPerUnit}`,
      `unitCostEur = ${material.unitCostEur}`,
      `leadTimeDays = ${material.leadTimeDays}`,
      ...material.productIds.map((productId) => `productId = ${productId}`),
      ...(material.alternateSupplierId === undefined
        ? []
        : [`alternateSupplierId = ${material.alternateSupplierId}`]),
    ],
    upstream: uniqueRefs([
      material.primarySupplierId,
      ...(material.alternateSupplierId === undefined ? [] : [material.alternateSupplierId]),
      material.originId,
      ...orders,
    ]),
    downstream: uniqueRefs([
      ...material.productIds,
      ...exceptions,
      ...plantsOfMaterial(records, material.id),
    ]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, material.id),
  };
}

/**
 * The evidence behind one production-line node of the investigation's impact chain.
 *
 * The line record states the plant it belongs to, its name and its nominal output per working day, and
 * those three are the whole of what the node stands for. The rate is the input the solver measures a
 * disrupted day's idle time against and the unit a plan is stated per (contracts §4 rules 1 to 5), so
 * the figures the chain draws around the line are the solver's own; this payload names that rule and
 * recomputes none of it. A line belongs to exactly one plant, which is why its plant scope is its own
 * record's plant rather than a reach over several.
 *
 * @param records - The session's record set.
 * @param line - The production line record the reference named.
 * @returns The line's evidence payload.
 */
function lineEvidence(records: SeedRecordSet, line: Line): Evidence {
  const plant = records.plants.find((candidate) => candidate.id === line.plantId);
  const atPlant = plant === undefined ? '' : ` at ${plant.name}`;
  const orders = records.productionOrders
    .filter((order) => order.lineId === line.id)
    .map((order) => order.id);
  const exceptions = records.exceptions
    .filter((exception) => exception.lineId === line.id)
    .map((exception) => exception.id);

  return {
    value: `${line.name}${atPlant}, ${line.unitsPerDay} units per working day`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'The line record states the plant it belongs to, its name and its nominal output per working ' +
      'day. That rate is the input the solver measures a disrupted day against: the idle days an ' +
      'option costs are the shortfall from it, summed and rounded half up to two decimals under ' +
      'contracts §4 rules 1 to 5. This payload states the record and the rule and computes neither.',
    inputs: [
      `id = ${line.id}`,
      `name = ${line.name}`,
      `plantId = ${line.plantId}`,
      `unitsPerDay = ${line.unitsPerDay}`,
    ],
    upstream: uniqueRefs([line.plantId, ...orders]),
    downstream: uniqueRefs(exceptions),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, line.id),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The aggregate families — AAP 0.2.1 F12, PR-6, rule P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * The selection an aggregate reference carries: the plants and the products the figure was computed
 * over, as the scope the screen read it with states them.
 *
 * Both members keep the reading `Scope` gives them, because the selection is the scope's own spelling
 * rather than a filter language of this module's: `plants` names the plants the screen selected (empty
 * for the "All plants" selection the top bar holds) and `products` names the products it selected
 * (empty for "All products"). The two are re-resolved through `resolveScope` rather than trusted as a
 * population, so the acting role's plant scope caps the evidence's scope exactly as it caps the
 * screen's read (AAP 0.2.1, AAP 0.12.1, the one scope resolver).
 */
interface ReferenceSelection {
  /** The plants the figure was computed over, in the scope's own order. */
  readonly plants: readonly Scope['plants'][number][];

  /** The products the figure was computed over, in the scope's own order. */
  readonly products: readonly Scope['products'][number][];
}

/**
 * One aggregate reference, split into the aggregate it names and the selection it was read with.
 *
 * `path` is everything between the root and the selection separator — an aggregate key, or the
 * `plant/<plantId>/revenue-at-risk` and `day/<date>/<kind>` shapes — so the resolvers below read the
 * figure's identity from one member and its population from the other.
 */
interface AggregateReference {
  /** The aggregate the reference names, as its producer spelled it. */
  readonly path: string;

  /** The selection the figure was computed over. */
  readonly selection: ReferenceSelection;
}

/**
 * The selection no reference states: the scope one bare reference is answered over.
 *
 * It is empty rather than populated on purpose: an absent filter is the "All plants" and "All
 * products" selection, and `resolveScope` turns it into the plants the acting role reaches, which is
 * the widest population a reference naming no selection can honestly describe. A bare reference — the
 * shape a screen reading an all-plants, all-products scope still composes — therefore resolves to
 * exactly what it resolved to before a selection could travel in the reference at all.
 */
const NO_SELECTION: ReferenceSelection = { plants: [], products: [] };

/**
 * Splits one aggregate reference into the aggregate it names and the selection it carries.
 *
 * The separator is found once and everything after it is the selection, so a path that holds no
 * selection is read exactly as it was composed. A selection that cannot be read refuses the whole
 * reference rather than falling back to no selection: silently dropping it would compute the drawer's
 * figure over the persona's whole scope while the screen's figure was computed over a filter, which is
 * the disagreement PR-6 makes this family answer for (AAP 0.2.1 F12).
 *
 * @param ctx - The call's context, whose records the named selection is checked against.
 * @param ref - The reference the screen composed, exactly as the caller sent it.
 * @param root - The aggregate root the reference begins with, which the selection follows.
 * @returns The aggregate's path and the selection it was computed over.
 * @throws Problem - A `'not-found'` failure naming the reference when its selection cannot be read or
 *   names a plant or a product the record set does not hold.
 */
function parseAggregateReference(
  ctx: HandlerContext,
  ref: string,
  root: string,
): AggregateReference {
  const body = ref.slice(root.length);
  const separator = body.indexOf(SELECTION_SEPARATOR);
  const path = separator < 0 ? body : body.slice(0, separator);
  const query = separator < 0 ? '' : body.slice(separator + 1);

  return { path, selection: parseReferenceSelection(ctx, ref, query) };
}

/**
 * Reads the selection a reference states after its separator.
 *
 * The grammar is the scope's own vocabulary and nothing else: the parameter `plants` and the parameter
 * `products`, each stated at most once, each naming its identifiers comma-separated in the scope's
 * order. Every other shape is refused, because a selection this module guessed at would be a
 * population the screen never read.
 *
 * @param ctx - The call's context, whose records the named plants and products are checked against.
 * @param ref - The reference the selection was read from, quoted in a refusal.
 * @param query - Everything after the reference's separator, or an empty string for none.
 * @returns The selection, or {@link NO_SELECTION} when the reference states none.
 * @throws Problem - A `'not-found'` failure naming the reference when the query is not that grammar or
 *   names a plant or a product the record set does not hold.
 */
function parseReferenceSelection(
  ctx: HandlerContext,
  ref: string,
  query: string,
): ReferenceSelection {
  if (query === '') {
    return NO_SELECTION;
  }

  const named = new Set<string>();
  let selection: ReferenceSelection = NO_SELECTION;

  for (const parameter of query.split(PARAMETER_SEPARATOR)) {
    const assignment = parameter.indexOf(PARAMETER_ASSIGNMENT);
    const name = assignment < 0 ? parameter : parameter.slice(0, assignment);

    if (assignment <= 0 || named.has(name)) {
      throw unreadableSelectionProblem(ctx, ref);
    }

    const identifiers = identifiersOf(ctx, ref, parameter.slice(assignment + 1));

    named.add(name);

    if (name === PLANTS_PARAMETER) {
      selection = { plants: plantIdsOf(ctx, ref, identifiers), products: selection.products };
    } else if (name === PRODUCTS_PARAMETER) {
      selection = { plants: selection.plants, products: productIdsOf(ctx, ref, identifiers) };
    } else {
      throw unreadableSelectionProblem(ctx, ref);
    }
  }

  return selection;
}

/**
 * The identifiers one selection parameter names.
 *
 * @param ctx - The call's context, whose state supplies the trace of a refusal.
 * @param ref - The reference the list was read from, quoted in a refusal.
 * @param value - Everything after the parameter's name and its assignment.
 * @returns The distinct identifiers the list names, in the order it states them.
 * @throws Problem - A `'not-found'` failure naming the reference when the list holds an empty segment
 *   or repeats an identifier, because a selection names a set.
 */
function identifiersOf(ctx: HandlerContext, ref: string, value: string): string[] {
  const identifiers = value.split(LIST_SEPARATOR);

  if (
    new Set(identifiers).size !== identifiers.length ||
    identifiers.some((identifier) => identifier === '')
  ) {
    throw unreadableSelectionProblem(ctx, ref);
  }

  return identifiers;
}

/**
 * The plants a selection names, each checked against the record set.
 *
 * @param ctx - The call's context, whose records are searched.
 * @param ref - The reference the plants were read from, quoted in a refusal.
 * @param identifiers - The plant identifiers the selection names.
 * @returns Those identifiers, as the resolved scope's own plant type.
 * @throws Problem - A `'not-found'` failure naming the reference and the identifier when the record
 *   set holds no plant with it.
 */
function plantIdsOf(
  ctx: HandlerContext,
  ref: string,
  identifiers: readonly string[],
): PlantId[] {
  const { records } = ctx.state;

  return identifiers.map((identifier) => {
    const found = records.plants.find((candidate) => candidate.id === identifier);

    if (found === undefined) {
      throw notFoundProblem(
        ctx,
        `The reference ${ref} names the plant ${identifier} in the selection the figure was computed over, and the record set holds no plant with that identifier, so the aggregate behind it cannot be resolved.`,
      );
    }

    return found.id;
  });
}

/**
 * The products a selection names, each checked against the record set.
 *
 * @param ctx - The call's context, whose records are searched.
 * @param ref - The reference the products were read from, quoted in a refusal.
 * @param identifiers - The product identifiers the selection names.
 * @returns Those identifiers, as the resolved scope's own product type.
 * @throws Problem - A `'not-found'` failure naming the reference and the identifier when the record
 *   set holds no product with it.
 */
function productIdsOf(
  ctx: HandlerContext,
  ref: string,
  identifiers: readonly string[],
): Scope['products'][number][] {
  const { records } = ctx.state;

  return identifiers.map((identifier) => {
    const found = records.products.find((candidate) => candidate.id === identifier);

    if (found === undefined) {
      throw notFoundProblem(
        ctx,
        `The reference ${ref} names the product ${identifier} in the selection the figure was computed over, and the record set holds no product with that identifier, so the aggregate behind it cannot be resolved.`,
      );
    }

    return found.id;
  });
}

/**
 * The failure a selection no algebra reads is refused with.
 *
 * @param ctx - The call's context, whose state supplies the trace.
 * @param ref - The reference whose selection could not be read, quoted in the message.
 * @returns The `'not-found'` problem to throw.
 */
function unreadableSelectionProblem(ctx: HandlerContext, ref: string): Problem {
  return notFoundProblem(
    ctx,
    `The selection carried by the reference ${ref} cannot be read: an aggregate reference states the plants and the products its figure was computed over as the parameters ${PLANTS_PARAMETER} and ${PRODUCTS_PARAMETER}, each naming its identifiers once and comma-separated. Without a selection it states, the figure cannot be computed over the population the screen read.`,
  );
}

/**
 * What one aggregate key reports, and the contracts §5 rule behind it.
 *
 * Held apart from the value so the four figures a screen composes and the six ribbon tiles read their
 * wording from one place: the canvas's `open-exceptions` tile and the overview's open-exceptions tile
 * are the same aggregate, so they are described once here rather than twice.
 */
interface AggregateReading {
  /**
   * What the aggregate reports, stated in the aggregate module's own terms so the drawer can print the
   * figure followed by its subject without either of them being a caption of its own.
   *
   * The shape this produces — the aggregate's own number, ungrouped, with the unit named in words — is
   * rendering 4 of the four the single money-format record in `src/components/mono-value.tsx` states,
   * and that record holds why a computed figure's evidence reads this way instead of through that
   * module's formatter.
   */
  readonly subject: string;

  /** The contracts §5 rule the aggregate applied, stated plainly, or the AAP rule behind a count. */
  readonly formula: string;
}

/**
 * The reading behind each aggregate key the two roots can carry.
 *
 * A `Map` rather than an object literal on purpose: an unknown key then answers nothing at all, where an
 * object's prototype would answer `toString` or `constructor` with a function and hand the drawer a
 * sentence made of `undefined`. The keys are the aggregate keys `src/domain/aggregation/urgency.ts`
 * emits as `RibbonTile.id` and the four member names `src/domain/aggregation/overview.ts` computes, so
 * the drawer, the sources and the aggregate all spell one figure one way.
 */
const AGGREGATE_READINGS = new Map<string, AggregateReading>([
  [
    'open-exceptions',
    {
      subject: 'open exceptions in scope',
      formula:
        'Open exceptions is the count of exceptions in the scope whose status is still open ' +
        '(contracts §5), which `computeOverview` computes over the records the acting persona may read.',
    },
  ],
  [
    'critical-exceptions',
    {
      subject: 'exceptions at the head of the urgency ordering',
      formula:
        'The critical-exceptions tile counts the rows whose severity stands at the head of the urgency ' +
        'ordering (AAP §0.12.1), which `computeRibbonTiles` counts in the rows ' +
        '`computeExceptionRows` returns for the same scope.',
    },
  ],
  [
    'revenue-at-risk',
    {
      subject: 'euro of revenue at risk',
      formula:
        'Revenue at risk is the sum, over the affected lines, of the units at risk multiplied by the ' +
        'product price (contracts §5), which `computeOverview` computes over the exceptions the scope ' +
        'admits.',
    },
  ],
  [
    'customer-orders-at-risk',
    {
      subject: 'customer orders at risk',
      formula:
        'Customer orders at risk counts the distinct customer orders carrying an affected line of the ' +
        'scope’s open exceptions (contracts §5), which `computeOverview` computes from the same ' +
        'affected-lines derivation the revenue figure rests on.',
    },
  ],
  [
    'median-hours-to-approved-plan',
    {
      subject: 'hours from detection to an approved plan, unrounded',
      formula:
        'Median hours to approved plan is the middle value of the hours the qualifying history records ' +
        'state from detection to an approved plan, and it stays unrounded (AAP §0.8), which ' +
        '`computeOverview` computes over the records the scope admits.',
    },
  ],
  [
    'plants-in-scope',
    {
      subject: 'plants in scope',
      formula:
        'Plants in scope is the number of by-plant rows the overview aggregate groups the scope’s open ' +
        'exceptions into (contracts §5), which `computeRibbonTiles` copies from the overview’s own ' +
        'grouping.',
    },
  ],
]);

/**
 * One computed aggregate a screen's reference names, resolved to the aggregate module's own output.
 *
 * The figure carries exactly what the drawer's four sections need and nothing this module computed of
 * its own: the reading is the aggregate's own number stated in its own terms, the inputs quote the
 * members the aggregate module returned together with the resolved scope it was computed over, the
 * upstream list is the records the aggregate was computed over — the exception rows the same functions
 * resolved for the same scope, so those records are an aggregate's answer rather than a second reading
 * of the filters here — and the downstream list is what reads the figure. The one thing the screen
 * supplies is the selection its reference states, and it reaches the aggregate only through the same
 * `resolveScope` the screen's own read went through. Resolution produces the figure once and the payload
 * builder only wraps it, so a reference cannot resolve to one figure and report another.
 */
interface AggregateFigure {
  /** The sentence the drawer prints as the figure's value: the aggregate's number and its subject. */
  readonly reading: string;

  /** The contracts §5 rule that produced the figure. */
  readonly formula: string;

  /** The aggregate's own members that fed the figure, quoted as the module returned them. */
  readonly inputs: string[];

  /** The records the figure was computed over. */
  readonly upstream: string[];

  /** The figures that read this one. */
  readonly downstream: string[];

  /**
   * The exceptions the aggregate was computed over, so the payload can carry their missing inputs and
   * the documents that cite them without either list being guessed at.
   */
  readonly exceptionIds: readonly string[];
}

/**
 * The aggregate payloads one evidence read needs, computed once per resolution.
 *
 * Three members, because the figures the two roots report come from three functions over one scope and
 * one record bundle: `computeOverview` for the overview's tiles, by-plant rows and series,
 * `computeExceptionRows` for the rows the upstream list names, and `computeRibbonTiles` for the six
 * canvas tiles — which is handed the other two rather than computing anything itself (rule P-6).
 */
interface AggregateViews {
  /** The scope the aggregate is computed over. */
  readonly scope: Scope;

  /** `computeOverview`'s own output for that scope. */
  readonly overview: Overview;

  /** `computeExceptionRows`' own output for the same scope. */
  readonly rows: readonly ExceptionRow[];
}

/**
 * The selection a reference carries, as the one scope resolver reads it.
 *
 * The adapter's own reads hand `resolveScope` a `ScopeFilterInput` built from the shell's selection —
 * the whole plant list the caller named, and the one product when exactly one is named — and this
 * builds the same input from the selection a reference carries, so the evidence read resolves the
 * scope through that same function under the same reading of an absent member: no plant named is the
 * "All plants" selection, one product named is that product, and none is "All products". A plant list
 * then resolves to its intersection with the role's scope rather than to itself, which is what keeps
 * the drawer's population from widening past what the role may read (AAP 0.2.1, AAP 0.12.1).
 *
 * @param selection - The selection the reference states.
 * @returns The resolver's input, with each member present only when the selection names one.
 */
function scopeFiltersOf(selection: ReferenceSelection): ScopeFilterInput {
  const [onlyProduct] = selection.products;

  return {
    ...(selection.plants.length === 0 ? {} : { plantIds: selection.plants }),
    ...(selection.products.length === 1 && onlyProduct !== undefined
      ? { productId: onlyProduct }
      : {}),
  };
}

/**
 * The scope an aggregate reference is answered over.
 *
 * The reference's own selection, resolved exactly as the screen's read resolved it: `resolveScope`
 * intersects the plants the reference names with the acting role's plant scope and passes the product
 * selection through, so the aggregate the drawer reports is computed over the population the screen's
 * figure was computed over — one function, one scope, one figure (AAP 0.2.1 F12, PR-6, AAP 0.12.1
 * "Scope resolution"). A reference naming no selection resolves to the plants the persona may read and
 * every product, which is the population a screen holding no filter read. Each payload names the
 * resolved scope's plants and products under its inputs, so a reader always sees the population the
 * figure covers rather than having to assume it.
 *
 * @param ctx - The call's context, whose actor supplies the role the scope is resolved for.
 * @param selection - The selection the reference carries.
 * @returns The resolved scope.
 */
function aggregateScope(ctx: HandlerContext, selection: ReferenceSelection): Scope {
  return resolveScope(scopeFiltersOf(selection), ctx.actor.role);
}

/**
 * The exceptions an aggregate read is computed over.
 *
 * The session's own collection, or an empty one while the emptied-queue trigger is in effect: the canvas
 * ribbon empties it, so an aggregate's evidence and the tile it explains must count the same population
 * (AAP §0.12.4, T-17). The choice is made here, once, and both the rows and the bundle are built from
 * its answer.
 *
 * @param state - The session whose triggers and records are read. Not modified.
 * @returns The exceptions the aggregate is computed over.
 */
function aggregateExceptions(state: MockState): readonly OperationalException[] {
  return isSimulationOn(state, 'empty-queue') ? [] : state.records.exceptions;
}

/**
 * The freshness record an aggregate read is computed under.
 *
 * @param ctx - The call's context, whose triggers and seeded source health are read. Not modified.
 * @returns The order-book source's freshness record, or the first reported source's when the catalogue
 *   does not carry that source.
 * @throws Problem - A `'validation'` failure when the source catalogue reports no health at all, because
 *   the aggregate would then have no state to qualify itself with.
 */
function aggregateFreshness(ctx: HandlerContext): Freshness {
  const report = freshnessFor(ctx.state);
  const orderBook = report.find((entry) => entry.source === ORDER_BOOK_SOURCE);

  if (orderBook !== undefined) {
    return orderBook;
  }

  const [first] = report;

  if (first !== undefined) {
    return first;
  }

  throw validationProblem(
    ctx,
    'The source catalogue reports no health, so an aggregate over the records cannot state the state ' +
      'of the records behind it.',
  );
}

/**
 * The solver case an exception is measured against, when its records carry one.
 *
 * Resolved by the case the exception names, and otherwise by the case that names the exception, so every
 * exception with a measurement is measured against its own. An exception naming a case the record set
 * does not hold is reported rather than measured against something else: a measurement of another
 * disruption's supply position is a figure rule P-6 forbids.
 *
 * @param ctx - The call's context, whose records are read.
 * @param exception - The exception whose case is wanted.
 * @returns That exception's case, or `undefined` when its records name none.
 * @throws Problem - A `'validation'` failure when the exception names a case the records do not hold.
 */
function aggregateSolverCase(
  ctx: HandlerContext,
  exception: OperationalException,
): SolverCase | undefined {
  const caseId = exception.solverCaseId;

  if (caseId !== undefined) {
    const named = ctx.state.records.solverCases.find((candidate) => candidate.id === caseId);

    if (named !== undefined) {
      return named;
    }

    throw validationProblem(
      ctx,
      `Exception ${exception.id} names solver case ${caseId}, which the record set does not hold, so ` +
        'the aggregate over its affected lines cannot be measured.',
    );
  }

  return ctx.state.records.solverCases.find((candidate) => candidate.exceptionId === exception.id);
}

/**
 * The baseline measurement of every exception an aggregate read covers.
 *
 * The affected-lines rule reads the do-nothing solve rather than a stored figure (AAP §0.12.2), so the
 * bundle the aggregates consume carries it and no aggregate calls the solver itself. A case that cannot
 * be measured at its own lower bounds is reported instead of being projected: the aggregate would
 * otherwise carry a figure nobody computed (AAP §0.8).
 *
 * @param ctx - The call's context, whose records are read.
 * @param exceptions - The exceptions the aggregate is computed over.
 * @returns One baseline per exception that carries a case, in the order they were handed in.
 * @throws Problem - A `'validation'` failure when a named case is missing or cannot be measured.
 */
function aggregateBaselines(
  ctx: HandlerContext,
  exceptions: readonly OperationalException[],
): BaselineSolve[] {
  const solves: BaselineSolve[] = [];

  for (const exception of exceptions) {
    const solverCase = aggregateSolverCase(ctx, exception);

    if (solverCase === undefined) {
      continue;
    }

    const baseline = solveSupplyDelay(solverCase, DO_NOTHING_LEVERS);

    if (baseline.constraintCheck === 'fail') {
      throw validationProblem(
        ctx,
        `The baseline measurement of case ${solverCase.id} for ${exception.id} cannot be taken at the ` +
          `do-nothing levers: ${baseline.constraintMessages.join(' ')}`,
      );
    }

    solves.push({ exceptionId: exception.id, result: baseline });
  }

  return solves;
}

/**
 * The record bundle the two aggregate reads are computed over.
 *
 * `OverviewInput` extends `ExceptionAggregateInput`, so one bundle serves the overview and the rows: the
 * two are then computed over the same exceptions, prices, order book, baseline solves and as-of instant,
 * which is what makes the figures this family reports describe the population the screens draw (AAP
 * §0.2.1, §0.12.1). Every member is a record the session holds or the aggregate's own declared shape, so
 * the bundle states no figure. The bundle is built here rather than shared out of a sibling handler
 * because AAP §0.12.1 fixes this folder at one module per family with no shared helper, so each family
 * reads its own inputs.
 *
 * @param ctx - The call's context, whose records and triggers are read. Not modified.
 * @returns The bundle, freshly allocated on every call.
 * @throws Problem - A `'validation'` failure when a case a figure is drawn from cannot be resolved.
 */
function aggregateBundle(ctx: HandlerContext): OverviewInput {
  const { records } = ctx.state;
  const exceptions = aggregateExceptions(ctx.state);

  return {
    exceptions,
    products: records.products,
    customerOrders: records.customerOrders,
    baselines: aggregateBaselines(ctx, exceptions),
    freshness: aggregateFreshness(ctx),
    asOf: DEMO_CLOCK,
    plants: records.plants,
    materials: records.materials,
    history: records.exceptionHistory,
    approvals: records.approvals,
  };
}

/**
 * The aggregate outputs one evidence read is answered from.
 *
 * @param ctx - The call's context, whose records and triggers the aggregates are computed over.
 * @param selection - The selection the reference carries, which the scope is resolved from.
 * @returns The resolved scope, the overview and the rows, each the aggregate module's own output.
 * @throws Problem - A `'validation'` failure when a record a figure is drawn from does not resolve.
 */
function aggregateViews(ctx: HandlerContext, selection: ReferenceSelection): AggregateViews {
  const scope = aggregateScope(ctx, selection);
  const bundle = aggregateBundle(ctx);

  return {
    scope,
    overview: computeOverview(bundle, scope),
    rows: computeExceptionRows(bundle, scope),
  };
}

/**
 * The inputs every aggregate payload states before its own figure.
 *
 * The scope's plants and products are named because they are the population the aggregate was computed
 * over: a figure read under a filtered scope states the plants and the products it actually counted,
 * which is what a reader has to see for the drawer's figure to be the tile's figure (AAP 0.2.1 F12,
 * PR-6). They are the resolved scope's own members rather than this module's reading of a filter, so
 * the list cannot disagree with the aggregate that produced the figure.
 *
 * @param views - The aggregate outputs the figure was taken from.
 * @returns The scope's own members, as input lines.
 */
function aggregateScopeInputs(views: AggregateViews): string[] {
  const plants = views.scope.plants.length === 0 ? 'none' : views.scope.plants.join(', ');
  const products =
    views.scope.products.length === 0 ? 'every product' : views.scope.products.join(', ');

  return [`plants in scope = ${plants}`, `products in scope = ${products}`];
}

/**
 * The records an aggregate was computed over: the exceptions the rows resolved and the plants grouped.
 *
 * Both halves are the aggregate modules' own answers for the same scope, so this list is what the figure
 * depends on rather than a second filter over the records.
 *
 * @param views - The aggregate outputs the figure was taken from.
 * @returns The distinct record references the figure was computed over.
 */
function aggregateUpstream(views: AggregateViews): string[] {
  return uniqueRefs([...views.rows.map((row) => row.id), ...views.scope.plants]);
}

/**
 * The reference one overview aggregate figure carries, resolved to the aggregate's own output.
 *
 * Three shapes are answered, because they are the three the SCR-01 screen composes: a tile
 * (`overview:<key>`), a plant's reading (`overview:plant/<plantId>/revenue-at-risk`) and a day's
 * (`overview:day/<date>/<kind>`). Each may carry the selection its figure was read with after a `?`,
 * and the aggregates below are computed over the scope that selection resolves to, so the figure the
 * drawer states is the figure the screen drew — a filtered tile's evidence is computed over the same
 * filtered population, and a filtered by-plant row's over the same row (AAP 0.2.1 F12, PR-6). A key
 * the overview carries no member for, a plant the by-plant rows do not hold, a date outside the series
 * and a selection that cannot be read are all refused as `'not-found'` naming the reference, so the
 * drawer never opens on a fabricated figure.
 *
 * @param ctx - The call's context, whose records the aggregate is computed over.
 * @param ref - The reference the screen composed, selection included.
 * @returns The figure the reference names.
 * @throws Problem - A `'not-found'` failure naming the reference when the aggregate holds no such figure
 *   or the selection it carries cannot be resolved.
 */
function overviewAggregateFigure(ctx: HandlerContext, ref: string): AggregateFigure {
  const { path, selection } = parseAggregateReference(ctx, ref, OVERVIEW_AGGREGATE_ROOT);
  const views = aggregateViews(ctx, selection);

  if (path.startsWith(PLANT_SEGMENT)) {
    return plantRowFigure(ctx, views, ref, path.slice(PLANT_SEGMENT.length));
  }

  if (path.startsWith(DAY_SEGMENT)) {
    return dayPointFigure(ctx, views, ref, path.slice(DAY_SEGMENT.length));
  }

  const reading = AGGREGATE_READINGS.get(path);
  const figure = overviewTileValue(views.overview, path);

  if (reading === undefined || figure === undefined) {
    throw notFoundProblem(
      ctx,
      `The overview aggregate carries no figure under the reference ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  return {
    reading: `${figure} ${reading.subject}`,
    formula: reading.formula,
    inputs: [`${path} = ${figure}`, ...aggregateScopeInputs(views)],
    upstream: aggregateUpstream(views),
    downstream: [],
    exceptionIds: views.rows.map((row) => row.id),
  };
}

/**
 * The figure one overview tile reports, read from the aggregate's own member.
 *
 * Only the four members specification SCR-01 fixes as tiles are answered here: `plants-in-scope` and
 * `critical-exceptions` are the canvas ribbon's own readings of the same aggregate, and a screen that
 * composed them under the overview root would be naming a figure the overview does not carry.
 *
 * @param overview - The overview aggregate, read and not modified.
 * @param key - The aggregate key the reference names.
 * @returns The tile's figure, or `undefined` when the overview carries no such tile.
 */
function overviewTileValue(overview: Overview, key: string): number | undefined {
  switch (key) {
    case 'open-exceptions':
      return overview.openExceptions;
    case 'revenue-at-risk':
      return overview.revenueAtRiskEur;
    case 'customer-orders-at-risk':
      return overview.customerOrdersAtRisk;
    case 'median-hours-to-approved-plan':
      return overview.medianHoursToApprovedPlan;
    default:
      return undefined;
  }
}

/**
 * The figure one plant's revenue reading reports, read from the by-plant row the aggregate grouped.
 *
 * @param ctx - The call's context, whose state supplies the trace of a refusal.
 * @param views - The aggregate outputs the row is read from.
 * @param ref - The reference the screen composed.
 * @param member - Everything after `plant/`: the plant identifier and the member the row reports.
 * @returns The figure the reference names.
 * @throws Problem - A `'not-found'` failure naming the reference when no row holds that plant.
 */
function plantRowFigure(
  ctx: HandlerContext,
  views: AggregateViews,
  ref: string,
  member: string,
): AggregateFigure {
  const suffix = `/${REVENUE_AT_RISK_MEMBER}`;
  const plantId = member.endsWith(suffix) ? member.slice(0, member.length - suffix.length) : '';
  const row = views.overview.byPlant.find((candidate) => candidate.plantId === plantId);

  if (!member.endsWith(suffix) || row === undefined) {
    throw notFoundProblem(
      ctx,
      `The overview aggregate holds no revenue-at-risk row under the reference ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  const reading = AGGREGATE_READINGS.get(REVENUE_AT_RISK_MEMBER);
  const rows = views.rows.filter((candidate) => candidate.plantId === row.plantId);

  if (reading === undefined) {
    throw notFoundProblem(
      ctx,
      `The overview aggregate carries no revenue-at-risk reading under the reference ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  return {
    reading: `${row.revenueAtRiskEur} ${reading.subject} at ${row.plantName}`,
    formula:
      `${reading.formula} The row is the overview aggregate's own grouping of those exceptions by ` +
      'plant, so a plant outside the acting persona’s scope contributes no row at all.',
    inputs: [
      `plantId = ${row.plantId}`,
      `plantName = ${row.plantName}`,
      `openExceptions = ${row.openExceptions}`,
      `revenueAtRiskEur = ${row.revenueAtRiskEur}`,
      ...aggregateScopeInputs(views),
    ],
    upstream: uniqueRefs([row.plantId, ...rows.map((candidate) => candidate.id)]),
    downstream: [],
    exceptionIds: rows.map((candidate) => candidate.id),
  };
}

/**
 * The figure one day of the opened/resolved series reports.
 *
 * @param ctx - The call's context, whose state supplies the trace of a refusal.
 * @param views - The aggregate outputs the series is read from.
 * @param ref - The reference the screen composed.
 * @param member - Everything after `day/`: the calendar date and the series member it counts.
 * @returns The figure the reference names.
 * @throws Problem - A `'not-found'` failure naming the reference when no point or no member answers it.
 */
function dayPointFigure(
  ctx: HandlerContext,
  views: AggregateViews,
  ref: string,
  member: string,
): AggregateFigure {
  const separator = member.lastIndexOf('/');
  const date = separator < 0 ? '' : member.slice(0, separator);
  const kind = separator < 0 ? '' : member.slice(separator + 1);
  const point = views.overview.openResolvedSeries.find((candidate) => candidate.date === date);
  const figure = point === undefined ? undefined : dayPointValue(point, kind);

  if (point === undefined || figure === undefined) {
    throw notFoundProblem(
      ctx,
      `The overview series holds no ${kind === '' ? 'member' : kind} reading on ${date === '' ? 'that date' : date} under the reference ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  return {
    reading: `${figure} exceptions recorded as ${kind} on ${point.date}`,
    formula:
      `The overview series counts, for each of its ${views.overview.openResolvedSeries.length} days, ` +
      'the exceptions the scope opened and the ones it resolved on that date (contracts §5), which ' +
      '`computeOverview` computes from the records the scope admits. This payload states that day’s ' +
      'own counts and recomputes neither.',
    inputs: [
      `date = ${point.date}`,
      `open = ${point.open}`,
      `resolved = ${point.resolved}`,
      ...aggregateScopeInputs(views),
    ],
    upstream: aggregateUpstream(views),
    downstream: [],
    exceptionIds: views.rows.map((row) => row.id),
  };
}

/**
 * The count one day of the series records for the member a reference names.
 *
 * @param point - The day the aggregate reported.
 * @param kind - The series member the reference names: the exceptions the day opened or resolved.
 * @returns That member's count, or `undefined` when the reference names no member of the series.
 */
function dayPointValue(point: DailyCountPoint, kind: string): number | undefined {
  switch (kind) {
    case OPEN_KIND:
      return point.open;
    case RESOLVED_KIND:
      return point.resolved;
    default:
      return undefined;
  }
}

/**
 * The reference one canvas ribbon figure carries, resolved to the ribbon the aggregate builds.
 *
 * The six tiles come from `computeRibbonTiles` over the same overview and the same rows this family
 * already computed, so a tile's evidence and the tile are one figure: the value reported is the tile's
 * own `value` member, not a second reading of the member it was copied from. The overview and the rows
 * are computed over the scope the reference's selection resolves to, so a ribbon tile read under a
 * filtered canvas states the population it counted (AAP 0.2.1 F12, PR-6). A key no tile carries and a
 * selection that cannot be read are refused as `'not-found'` naming the reference.
 *
 * @param ctx - The call's context, whose records the aggregates are computed over.
 * @param ref - The reference the screen composed, selection included.
 * @returns The figure the reference names.
 * @throws Problem - A `'not-found'` failure naming the reference when no tile carries that key or the
 *   selection it carries cannot be resolved.
 */
function canvasAggregateFigure(ctx: HandlerContext, ref: string): AggregateFigure {
  const { path, selection } = parseAggregateReference(ctx, ref, CANVAS_AGGREGATE_ROOT);
  const views = aggregateViews(ctx, selection);
  const tile = computeRibbonTiles(views.overview, views.rows).find(
    (candidate) => candidate.id === path,
  );
  const reading = AGGREGATE_READINGS.get(path);

  if (tile === undefined || reading === undefined) {
    throw notFoundProblem(
      ctx,
      `The canvas ribbon carries no tile under the reference ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  return {
    reading: `${tile.value} ${reading.subject}`,
    formula: reading.formula,
    inputs: [
      `${tile.id} = ${tile.value}`,
      `provenance = ${tile.provenance}`,
      ...aggregateScopeInputs(views),
    ],
    upstream: aggregateUpstream(views),
    downstream: [],
    exceptionIds: views.rows.map((row) => row.id),
  };
}

/**
 * The confidence an aggregate figure carries.
 *
 * The figure is a deterministic function of the records the scope admits, so the only thing that can
 * limit it is a record that reports an input it could not read: with none the reading is settled, and
 * with any the aggregate covers the inputs that answered and no more. The level is derived from the
 * records' own reports rather than assumed, and the reason names which of the two cases applies.
 *
 * @param missingInputs - The gaps the records the figure was computed over report.
 * @returns The confidence the figure carries, with its reason.
 */
function aggregateConfidence(missingInputs: readonly string[]): Confidence {
  if (missingInputs.length === 0) {
    return {
      level: 'high',
      reason:
        'The figure is the aggregation module’s own output over records every one of which answered, and nothing in this payload re-derives or estimates it.',
    };
  }

  return {
    level: 'medium',
    reason:
      'The records this figure was computed over report inputs they could not read, listed here, so the figure covers the inputs that answered and no more.',
  };
}

/**
 * The drawer's payload for one computed aggregate: the figure, the rule behind it, the records it read
 * and what it is missing.
 *
 * The label is `Simulated calculation`, because every aggregate the two roots name is a figure computed
 * from the records rather than a record itself (rule P-1, AAP §0.10). The missing inputs are the ones
 * the exceptions the figure was computed over report, and the documents are the ones that cite those
 * exceptions, so both lists are read from the records rather than assumed empty. No member is derived
 * here: the reading, the formula, the inputs and the upstream list all arrived resolved (rule P-6).
 *
 * @param ctx - The call's context, whose records supply the gaps and citing documents.
 * @param figure - The figure the reference resolved to.
 * @returns The aggregate's evidence payload.
 */
function aggregateEvidence(ctx: HandlerContext, figure: AggregateFigure): Evidence {
  const { records } = ctx.state;
  const computedOver = [...figure.exceptionIds];
  const missingInputs = uniqueRefs(
    records.exceptions
      .filter((exception) => computedOver.includes(exception.id))
      .flatMap((exception) => exception.missingInputs),
  );

  return {
    value: figure.reading,
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula: figure.formula,
    inputs: figure.inputs,
    upstream: figure.upstream,
    downstream: figure.downstream,
    confidence: aggregateConfidence(missingInputs),
    missingInputs,
    documents: uniqueRefs(
      computedOver.flatMap((exceptionId) => documentsCiting(records, exceptionId)),
    ),
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
 * record is known, and a node the records place in several plants — a supplier, an origin, a customer or
 * a material — is narrowed over every one of them by `assertNodeReach`; a pin is refused when
 * `listVisiblePins` would not have released it, so a reference cannot reach a pin the read filter
 * withholds; and a customer-confidential document is withheld from a persona that may not read its body,
 * exactly as `getDocument` withholds it. An aggregate reference names no record and carries no subject,
 * so the permission alone decides it: the selection the reference carries is resolved through the one
 * scope resolver against the acting role, which is the scope every scoped read of the persona is
 * narrowed by, so the aggregate is computed over the population the screen's own read covered. A
 * selection whose plants or products are not record values, and one whose parameters cannot be read,
 * are refused rather than widened to that scope.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param ref - The reference the displayed element carries.
 * @returns The evidence payload the drawer renders.
 * @throws Problem - `'permission'` when the persona may not read evidence, when the record lies outside
 *   its plant scope, when a pin is outside what the persona may see, or when a customer-confidential
 *   document's body is withheld from it; `'not-found'` when no record and no aggregate answers the
 *   reference.
 */
export async function getEvidence(ctx: HandlerContext, ref: string): Promise<Evidence> {
  assertEvidenceRead(ctx);

  const resolved = resolveRef(ctx, ref.trim());

  if (isNodeRef(resolved)) {
    assertNodeReach(ctx, resolved);
  } else {
    const subject = subjectOf(ctx, resolved);

    if (subject !== null) {
      assertPlantReach(ctx, subject);
    }
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
 * Ordering and paging the collection reads — contracts §9 list parameters, AAP 0.6.3 and AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The pin members a caller may order the list by, spelled as `sort=field:dir` names them.
 *
 * The set is the record's own readable members — its identifier, the node it hangs on, its review
 * state and the vendor it concerns — rather than a display concept, and an unknown member falls back
 * to the default ordering rather than failing a read a screen can recover from.
 */
const PIN_SORT_FIELDS = ['id', 'nodeRef', 'state', 'vendorId'] as const;

/** One member of `PIN_SORT_FIELDS`. */
type PinSortField = (typeof PIN_SORT_FIELDS)[number];

/**
 * The package members a caller may order the list by, spelled as `sort=field:dir` names them: the
 * identifier, the supplier and material the package covers, and the readiness figure its elements add
 * up to. `elements` is not among them, because a list of elements is the package's payload rather than
 * a value a package is ordered by.
 */
const PACKAGE_SORT_FIELDS = ['id', 'supplierId', 'materialId', 'readinessPercent'] as const;

/** One member of `PACKAGE_SORT_FIELDS`. */
type PackageSortField = (typeof PACKAGE_SORT_FIELDS)[number];

/** Whether a string names a pin member the list may be ordered by. */
function isPinSortField(value: string): value is PinSortField {
  return PIN_SORT_FIELDS.some((field) => field === value);
}

/** Whether a string names a package member the list may be ordered by. */
function isPackageSortField(value: string): value is PackageSortField {
  return PACKAGE_SORT_FIELDS.some((field) => field === value);
}

/** One ordering: the member to order by and the direction to read it in. */
interface SortOrder<TField extends string> {
  /** The member ordered by. */
  readonly field: TField;

  /** Whether the order runs from the greatest value to the least. */
  readonly descending: boolean;
}

/**
 * The ordering a `sort=field:dir` parameter asks for, or `null` when it asks for none this read can
 * honour — the default being the order the records the read was given hold.
 *
 * The parameter's form is contracts §9's: the member, a colon, then `asc` or `desc`. A member the
 * family's vocabulary does not name, or a direction spelled in another form, yields that default
 * rather than a failure: a read that can answer is worth more than a refusal over a presentation
 * hint.
 *
 * @param isField - The family's own test for a member it can order by.
 * @param sort - The parameter as the query carried it, or `undefined` when it carried none.
 * @returns The ordering to apply, or `null` for the order the records hold.
 */
function sortOrderOf<TField extends string>(
  isField: (value: string) => value is TField,
  sort: string | undefined,
): SortOrder<TField> | null {
  if (sort === undefined) {
    return null;
  }

  const [field, direction] = sort.split(':');

  if (field === undefined || !isField(field)) {
    return null;
  }

  if (direction === undefined || direction === 'asc') {
    return { field, descending: false };
  }

  return direction === 'desc' ? { field, descending: true } : null;
}

/** Orders two strings by their own lexical order, which is ISO 8601's too for a single offset. */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  return left > right ? 1 : 0;
}

/**
 * Orders two record values in the type they compare in: the readiness figure numerically, and every
 * other member as the text it renders to.
 *
 * @param left - One record's value.
 * @param right - The other's.
 * @returns A negative number when `left` comes first and a positive one when `right` does.
 */
function compareValues(left: string | number, right: string | number): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return compareText(String(left), String(right));
}

/**
 * The value one sortable pin member holds on a record.
 *
 * A pin that concerns no vendor reads as an empty string, so an ordering by `vendorId` puts the
 * pins that belong to no supplier's own evidence first in `asc` rather than dropping them.
 *
 * @param pin - The pin.
 * @param field - The member to read.
 * @returns The pin's value for that member.
 */
function pinValueOf(pin: EvidencePin, field: PinSortField): string {
  return field === 'vendorId' ? (pin.vendorId ?? '') : pin[field];
}

/**
 * The value one sortable package member holds on a record.
 *
 * `readinessPercent` is a figure and compares numerically; the other three members are the record's
 * own strings.
 *
 * @param partPackage - The package.
 * @param field - The member to read.
 * @returns The package's value for that member.
 */
function packageValueOf(partPackage: PpapPackage, field: PackageSortField): string | number {
  return field === 'readinessPercent' ? partPackage.readinessPercent : partPackage[field];
}

/**
 * Orders two pins by one ordering, and by identifier where the ordered members are equal.
 *
 * @param left - One pin.
 * @param right - The other.
 * @param order - The ordering to apply.
 * @returns A negative number when `left` comes first and a positive one when `right` does; the
 *   identifier breaks every tie in the same direction, so no pair is unordered.
 */
function comparePins(left: EvidencePin, right: EvidencePin, order: SortOrder<PinSortField>): number {
  const primary = compareValues(pinValueOf(left, order.field), pinValueOf(right, order.field));

  if (primary !== 0) {
    return order.descending ? -primary : primary;
  }

  return order.descending ? compareText(right.id, left.id) : compareText(left.id, right.id);
}

/**
 * Orders two packages by one ordering, and by identifier where the ordered members are equal.
 *
 * @param left - One package.
 * @param right - The other.
 * @param order - The ordering to apply.
 * @returns A negative number when `left` comes first and a positive one when `right` does; the
 *   identifier breaks every tie in the same direction, so no pair is unordered.
 */
function comparePackages(
  left: PpapPackage,
  right: PpapPackage,
  order: SortOrder<PackageSortField>,
): number {
  const primary = compareValues(
    packageValueOf(left, order.field),
    packageValueOf(right, order.field),
  );

  if (primary !== 0) {
    return order.descending ? -primary : primary;
  }

  return order.descending ? compareText(right.id, left.id) : compareText(left.id, right.id);
}

/**
 * The position in an ordered page from which a cursor continues.
 *
 * The cursor is opaque to a caller and holds the identifier of the last record the previous page
 * returned, so the next page starts at the record that follows it in the requested order and a page
 * boundary can neither repeat nor skip a record however the set has grown in between. A cursor that
 * names no record of this read in the requested order — a malformed one, or one from an ordering the
 * caller has since changed — is refused rather than silently restarted, because a page beginning
 * again at the top would read as a truncated list.
 *
 * @param ordered - The records the read admits, already in the requested order.
 * @param cursor - The position the previous page ended at, or `undefined` for the first page.
 * @param keyOf - The record's own identity, which is what a cursor names.
 * @param ctx - The call's context, whose state supplies the trace a refusal carries.
 * @param family - How the read that refused is named, such as `pin`.
 * @returns The index the page starts at.
 * @throws Problem - A `'validation'` failure when the cursor names no record of the ordered page.
 */
function startIndexFor<TRow>(
  ordered: readonly TRow[],
  cursor: string | undefined,
  keyOf: (row: TRow) => string,
  ctx: HandlerContext,
  family: string,
): number {
  if (cursor === undefined) {
    return 0;
  }

  const found = ordered.findIndex((row) => keyOf(row) === cursor);

  if (found < 0) {
    throw validationProblem(
      ctx,
      `The ${family} cursor ${cursor} names no record of this read in the requested order.`,
    );
  }

  return found + 1;
}

/**
 * The greatest number of records a page may hold, or `null` when the query sets no boundary.
 *
 * A parameter that is absent, not an integer, or not positive asks for no page rather than for an
 * empty one: contracts §9 leaves `limit` optional, and a caller that omits it wants the whole read.
 * The bound is the parameter's alone, so no page size is fixed here (rule P-6).
 *
 * @param limit - The parameter as the query carried it.
 * @returns The page's greatest length, or `null` for every remaining record.
 */
function limitOf(limit: number | undefined): number | null {
  if (limit === undefined || !Number.isInteger(limit) || limit <= 0) {
    return null;
  }

  return limit;
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
 * The plants one material's records reach.
 *
 * Two relations place a material in a plant, and both are read rather than assumed: the products it goes
 * into are built on lines, and a line belongs to one plant; and a purchase order names the plant it
 * delivers to. The union is the set the impact chain's material node is narrowed by, so a material whose
 * product reaches only one site is not admitted to another plant's evidence. A material the record set
 * does not hold reaches nothing, which is the empty answer every caller treats as "no plant to narrow
 * this by" rather than as "in scope".
 *
 * @param records - The session's record set.
 * @param materialId - The material whose plants are resolved.
 * @returns The plants its records reach, in record order.
 */
function plantsOfMaterial(records: SeedRecordSet, materialId: MaterialId): PlantId[] {
  const material = records.materials.find((candidate) => candidate.id === materialId);

  if (material === undefined) {
    return [];
  }

  const viaProducts = material.productIds
    .flatMap(
      (productId) => records.products.find((product) => product.id === productId)?.lineIds ?? [],
    )
    .map((lineId) => records.lines.find((line) => line.id === lineId)?.plantId)
    .filter((plantId): plantId is PlantId => plantId !== undefined);
  const viaOrders = records.purchaseOrders
    .filter((order) => order.materialId === material.id)
    .map((order) => order.plantId);

  return uniqueRefs([...viaProducts, ...viaOrders]);
}

/**
 * The plants a node of the FileMap canvas is placed in by the records, or none when the records place
 * it nowhere.
 *
 * A plant node is its own plant. A supplier reaches the plants of the products its materials go into
 * and of the plants its orders deliver to. A tier-2 origin reaches the plants of the suppliers it feeds,
 * which is the lane the origin's own record declares. A customer reaches the plants its orders ship
 * from. A material of the investigation's impact chain reaches the plants its products are built at and
 * the plants its purchase orders deliver to. A node no record places returns nothing, and the pin filter
 * treats that as "no plant to narrow this pin by" rather than as "in scope": a pin the records place
 * nowhere is released only to a persona whose own records attribute its vendor to it, because withholding
 * another party's evidence is recoverable and releasing it is not.
 *
 * @param records - The session's record set.
 * @param nodeRef - The node a pin is attached to.
 * @returns The plants the records place that node in, in record order.
 */
function plantsOfNode(records: SeedRecordSet, nodeRef: string): PlantId[] {
  if (records.plants.some((plant) => plant.id === nodeRef)) {
    return [nodeRef];
  }

  const material = records.materials.find((candidate) => candidate.id === nodeRef);

  if (material !== undefined) {
    return plantsOfMaterial(records, material.id);
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
 * Two narrowings, decided against one persona. The suppliers the records attribute to the acting
 * persona are resolved once, here, and both halves read that one set. An external supplier engineer
 * sees only the pins its own vendor's evidence carries, which is the vendor-scoped read AAP 0.2.1
 * names and the reason a pin on a supplier node records that supplier. Every other role sees the pins
 * of the plants its scope admits, decided by the same matrix and the same persona scope every scoped
 * read uses; a pin on a node the records place in no plant has no plant to narrow it by, so it is
 * released only when it names a vendor that set holds, and withheld otherwise. Both halves therefore
 * close on the same empty set, because withholding another party's evidence is recoverable and
 * releasing it is not.
 *
 * @param ctx - The call's context: the persona and the records its reach is resolved from.
 * @param pin - The pin under consideration.
 * @returns `true` when the pin may be released to this persona.
 */
function pinVisibleTo(ctx: HandlerContext, pin: EvidencePin): boolean {
  const vendors = vendorsFor(ctx.state.records, ctx.actor);
  const namesOwnVendor = pin.vendorId !== undefined && vendors.includes(pin.vendorId);

  if (ctx.actor.role === EXTERNAL_SUPPLIER_ROLE) {
    return namesOwnVendor;
  }

  const plants = plantsOfNode(ctx.state.records, pin.nodeRef);

  if (plants.length === 0) {
    return namesOwnVendor;
  }

  return plants.some((plantId) =>
    hasPermission(ctx.actor.role, EVIDENCE_READ, { plantId }, ctx.actor),
  );
}

/**
 * Reads the evidence pins the acting persona may see, optionally narrowed to one node, and pages the
 * result.
 *
 * The filter runs here, over the records the session holds, before any pin crosses the service
 * boundary: an external supplier engineer receives its own vendor's pins and no other, which is the
 * vendor-scoped read AAP 0.2.1 requires, and every other role receives the pins its plant scope admits
 * and, for a pin the records place in no plant, only a pin naming a vendor the persona's own records
 * attribute to it.
 *
 * The per-node counts travel with the topology, so the canvas badges a node without this call; the pin
 * records themselves belong to the stage that opens them, and this read exists for interface
 * conformance (AAP 0.12.2, AAP 0.12.3).
 *
 * The list parameters are the ones contracts §9 fixes, applied to the pins the persona may see rather
 * than to the whole set: `sort` as `member:dir` over the pin's own members, `limit` as the page's
 * greatest length, and `cursor` as the identifier of the pin a previous page ended on. Without a
 * `sort` the visible pins keep the order the records hold them in.
 *
 * Each returned pin is a copy, so a caller that edited one could not reach the session's record.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param query - The ordering and page position the read carries.
 * @param nodeId - The node to narrow the read to, when the caller names one.
 * @returns One page of the pins this persona may see, in the requested order.
 * @throws Problem - A `'permission'` failure when the persona may not read evidence or the forbidden
 *   trigger is in effect; a `'validation'` failure when the cursor names no record of the ordered page.
 */
export async function listVisiblePins(
  ctx: HandlerContext,
  query: ListQuery,
  nodeId?: string,
): Promise<EvidencePin[]> {
  assertEvidenceRead(ctx);

  const visible = ctx.state.records.evidencePins
    .filter((pin) => nodeId === undefined || pin.nodeRef === nodeId)
    .filter((pin) => pinVisibleTo(ctx, pin));
  const order = sortOrderOf(isPinSortField, query.sort);
  const ordered =
    order === null ? visible : [...visible].sort((left, right) => comparePins(left, right, order));
  const start = startIndexFor(ordered, query.cursor, (pin) => pin.id, ctx, 'pin');
  const limit = limitOf(query.limit);
  const page = limit === null ? ordered.slice(start) : ordered.slice(start, start + limit);

  return page.map((pin) => ({ ...pin }));
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
 * Reads the part approval packages, one page of them: each package's elements with the evidence rule
 * that decided each state, and the readiness those elements add up to.
 *
 * Each record is read through `getPackage`, so one permission check and one copy rule serve the list
 * and the detail rather than two (AAP 0.12.3). Readiness travels on the record — it is the package's
 * own whole-percent figure and no percentage is computed here (rule P-6).
 *
 * The list parameters are the ones contracts §9 fixes: `sort` as `member:dir` over the package's own
 * members, `limit` as the page's greatest length, and `cursor` as the identifier of the package a
 * previous page ended on. Without a `sort` the packages keep the record set's order.
 *
 * Conformance-only: no S1-S3 screen calls this, and the package route renders the stage notice,
 * because the package map belongs to stage S4 (AAP 0.12.3, AAP 0.14.2).
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param query - The ordering and page position the read carries.
 * @returns One page of the packages, in the requested order.
 * @throws Problem - A `'permission'` failure when the persona may not read evidence or the forbidden
 *   trigger is in effect; a `'validation'` failure when the cursor names no record of the ordered page.
 */
export async function listPackages(
  ctx: HandlerContext,
  query: ListQuery,
): Promise<PpapPackage[]> {
  const packages: PpapPackage[] = [];

  for (const record of ctx.state.records.ppapPackages) {
    packages.push(await getPackage(ctx, record.id));
  }

  const order = sortOrderOf(isPackageSortField, query.sort);
  const ordered =
    order === null
      ? packages
      : [...packages].sort((left, right) => comparePackages(left, right, order));
  const start = startIndexFor(ordered, query.cursor, (partPackage) => partPackage.id, ctx, 'package');
  const limit = limitOf(query.limit);

  return limit === null ? ordered.slice(start) : ordered.slice(start, start + limit);
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
