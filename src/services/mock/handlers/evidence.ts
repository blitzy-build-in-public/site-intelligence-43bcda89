/**
 * The evidence family of the in-browser mock adapter: the drawer's payload for any figure, chart mark,
 * node, arc or pin, the document body released to the caller who may read it, the evidence pins a
 * persona may see, and the part approval package with the readiness its own elements produce.
 *
 * Scope authority. This module is the "Handlers" row of AAP 0.12.1 at the `handlers/` path AAP 0.13.1
 * fixes, and it serves the two evidence reads AAP 0.12.3 lists — `GET /evidence?ref=` and
 * `GET /documents/{id}` — together with the pin list and the package reads that complete the family.
 * `platform-contracts.md` §3 fixes the records it reads, §7.1 fixes who may read them, and §8 fixes the
 * evidence rules a package element's state comes from.
 *
 * WHAT IT COMPUTES AND WHAT IT ONLY REPORTS — rule P-6. It computes no business figure: every number a
 * payload states is a field of the record that carries it or a read's own output, quoted as that read
 * reports it, and the `formula` member names the contracts §4 rule or §5 aggregate that owns the figure
 * instead of re-deriving it. The two exceptions are the package readiness `wholePercent` produces from
 * the package's own element count and the text of a figure, which `amountText` states in the
 * interface's money shape. No currency amount, no record identifier and no expected result is typed
 * here, and nothing imports `tests/fixtures/`.
 *
 * THE GRAMMARS, THE ORDER AND THE REDACTION RULE ARE STATED WHERE THEY APPLY — `resolveRef` walks the
 * families, `composedReferenceOf`, `writeBackPartsOf` and `approvalFigureOf` state the three grammars,
 * and `mayReadDocumentBody` states the one redaction this family applies.
 *
 * Rules this module is built to satisfy:
 * - P-1: every label it returns is one of the seven fixed `SIM_LABELS` members, typed `SimLabel` so a
 *   paraphrase is a compile error, and specification §5.3's strings are quoted verbatim.
 * - P-2, P-3: the verdicts come from `ctx.actor` and the contracts §7.1 matrix through `hasPermission`,
 *   never from `actor.permissions` and never from a caller's claim.
 * - P-4: it states no security property of the workspace and establishes nothing about a store; the
 *   audit family carries the chain's `Simulated control` wording.
 * - P-5: every payload states the provenance of the one record it reports and carries no member from
 *   the other family, so nothing here blends a market figure with a first-party one.
 * - P-6, P-7: it types no figure, amount or record identifier, reads no fixture, and names no company,
 *   person or vendor of its own; every name it returns is a field of a seeded record.
 * - B-1, B-2: it reads memory and nothing else — no address, no fetch, no environment read, no
 *   credential — and it holds no configuration.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the permission matrix, the one rounding rule, the shared vocabulary and the siblings
 * ------------------------------------------------------------------------------------------- */

import { plantsTouchedBy } from '../../../domain/aggregation/exceptions';
import { computeLedger } from '../../../domain/aggregation/ledger';
import { resolveScope } from '../../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../../domain/aggregation/scope';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import type { ScopedSubject } from '../../../domain/policy/permissions';
import { wholePercent } from '../../../domain/solver/rounding';
import {
  CLIENT_SELF_ASSESSMENT_LABEL,
  DEMO_CLOCK,
  LEDGER_WINDOW_DAYS,
  SIM_LABELS,
  SOURCE_LABELS,
  formatMoney,
  formatQuantity,
} from '../../../types';
import type {
  ActiveUser,
  Approval,
  AtlasSeries,
  AtlasSite,
  AuditEvent,
  Classification,
  CompetitorNetwork,
  Confidence,
  CustomerId,
  DailyCountPoint,
  DocumentBody,
  DocumentId,
  ElementReview,
  ElementReviewDecision,
  Evidence,
  EvidencePin,
  EvidenceRuleId,
  IsoDate,
  Levers,
  LineId,
  ListQuery,
  MaterialId,
  OperationalException,
  OriginId,
  Overview,
  PackageId,
  Permission,
  PinState,
  PlantId,
  PlantRiskRow,
  PpapElement,
  PpapPackage,
  Problem,
  ProductId,
  Provenance,
  RadarAxis,
  Role,
  Scenario,
  SimLabel,
  SupplierId,
  WriteBack,
} from '../../../types';
import type { HandlerContext } from '../mock-state';
import type {
  ChokepointRecord,
  Customer,
  CustomerOrder,
  Line,
  Material,
  Origin,
  Plant,
  Product,
  PurchaseOrder,
  SeedRecordSet,
  SeededPolicy,
  Supplier,
} from '../seed-loader';
import { demonstrationForbiddenReason, isSimulationOn } from '../simulation';
import { getApprovalOutcome } from './approvals';
import { getAtlas } from './atlas';
import { appendAuditEvent, assertFreeTextLength, listLimitOf } from './audit';
import { getOverview } from './exceptions';
import { scenarioForReference } from './scenarios';
import { getCanvasRibbon } from './topology';

/* ---------------------------------------------------------------------------------------------
 * The fixed vocabulary this family answers to — contracts §3, §7.1 and §8; specification §5.3
 * ------------------------------------------------------------------------------------------- */

/** The permission every read of this family requires (contracts §7.1). */
const EVIDENCE_READ: Permission = 'evidence.read';

/** The permission an extraction review requires, held by the supplier quality engineer alone. */
const EVIDENCE_REVIEW: Permission = 'evidence.review';

/**
 * The permission that gates a customer-confidential body, the second redaction (contracts §7.1).
 *
 * Exported, with the predicate that evaluates it, so the rule has one owner: `getDocument` refuses a
 * body through it, and the assistant family calls the same pair to refuse a question whose cited
 * document the acting persona may not read (see `mayReadDocumentBody`).
 */
export const DOCUMENT_CONFIDENTIAL_READ: Permission = 'document.confidential.read';

/**
 * The permission the audit trail's own read requires, and therefore the one a reference to one event of
 * it must answer to (contracts §7.1).
 *
 * `./audit.ts` gates every read of the trail on this permission, so the evidence behind a recorded
 * event is exactly as readable as the trail that holds it: a role the matrix leaves out of the trail is
 * not handed one of its links through a reference (AAP 0.6.2's authority property). Named once here so
 * the check and the failure's `requiredPermission` cannot disagree.
 */
const AUDIT_READ: Permission = 'audit.read';

/**
 * The permission the policy set's own read requires, and therefore the one a reference to one policy
 * must answer to (contracts §7.1).
 *
 * `./governance.ts` gates `listPolicies` and `getPolicy` on this permission, so a policy record's rule
 * text, its evaluation status and the decisions citing it stay with the roles the matrix admits to the
 * policy screen.
 */
const POLICY_READ: Permission = 'policy.read';

/**
 * The permission the declared configuration's own read requires, and therefore the one a reference to
 * one outbound endpoint must answer to (contracts §7.1).
 *
 * `./governance.ts` gates `getSovereignty` and `getOutboundLedger` on this permission, so the ledger row
 * behind the reference — its purpose, its state and the counts the trail supports for it — is released
 * to the roles the matrix admits to the deployment record, exactly as the ledger read is.
 */
const SOVEREIGNTY_READ: Permission = 'sovereignty.read';

/**
 * The permission the competitive atlas requires, and therefore every market-intelligence record its
 * marks stand on (contracts §7.1, AAP 0.12.3 `GET /market-intelligence/atlas`).
 *
 * Evaluated here for the four atlas families so that a reference cannot reach a record the atlas read
 * would withhold from the acting persona: the evidence behind a competitor's mark is exactly as
 * readable as the mark itself.
 */
const COMPETITIVE_READ: Permission = 'competitive.read';

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
 * `Simulated write-back` — one step of a plan's simulated write-back, quoted exactly as specification
 * §5.3 fixes it (rule P-1, AAP 0.10). Read from the owning tuple, so the label the tracker and the
 * preview print on every step and the label this payload returns are one string.
 */
const SIMULATED_WRITE_BACK: SimLabel = SIM_LABELS[3];

/**
 * `Simulated control` — the audit chain, whose wording AAP 0.10 places on it wherever it surfaces;
 * read from the owning tuple.
 */
const SIMULATED_CONTROL: SimLabel = SIM_LABELS[4];

/**
 * `Simulated market intelligence` — every competitor series, quoted exactly as specification §5.3
 * fixes it (rule P-1, rule P-5). The one label here that a first-party payload never carries.
 */
const SIMULATED_MARKET_INTELLIGENCE: SimLabel = SIM_LABELS[5];

/**
 * `Declared, not verified` — configuration a record declares and nothing in this workspace checks:
 * the label every SCR-07 row carries and the one a policy the engine never evaluates carries with it
 * (rule P-4, AAP 0.10).
 *
 * Read from the tuple that holds the seven fixed specification §5.3 strings once, rather than spelled
 * here, so a reworded label reaches this family with the rest (rule P-1).
 */
const DECLARED_LABEL: SimLabel = SIM_LABELS[6];

/**
 * The `evaluationStatus` a policy the engine runs carries, which is the member that separates the two
 * kinds of policy record: a rule raised by `src/domain/policy/evaluate.ts` and a rule the deployment
 * only declares (`src/seed/policies.ts`, AAP 0.8).
 */
const EVALUATED_STATUS: SeededPolicy['evaluationStatus'] = 'evaluated';

/**
 * The label every market-intelligence element carries: the market-intelligence member of the seven
 * fixed labels, taken by position so that label text is written once, in `src/types/primitives.ts`
 * (rule P-1).
 */
const MARKET_INTELLIGENCE_LABEL: SimLabel = SIM_LABELS[5];

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

/** `POL-nnn`, one policy of the contracts §7.2 set. */
const POLICY_PREFIX = 'POL-';

/** `PO-nnnnnnnn`, one purchase order. */
const PURCHASE_ORDER_PREFIX = 'PO-';

/** `CHK-nn`, one shared chokepoint of the simulated market-intelligence pack. */
const CHOKEPOINT_PREFIX = 'CHK-';

/** `CMP-nn-Sn`, a competitor's site, and `CMP-nn`, the network that owns it. */
const COMPETITOR_PREFIX = 'CMP-';

/** `SER-…`, one radar series, optionally followed by `#<axis id>` for the one score a vertex draws. */
const SERIES_PREFIX = 'SER-';

/**
 * The `#` that separates a record identifier from the fragment naming one figure inside it.
 *
 * Two families carry a fragment: a radar series names the axis a single vertex sits on, and an
 * approval names one of the figures SCR-05 prints off it, in the grammar `approvalFigureOf` states.
 * Neither family's plain identifier stopped answering when the fragment was added.
 */
const AXIS_SEPARATOR = '#';

/* ---------------------------------------------------------------------------------------------
 * The vocabulary of an approval figure — the figures SCR-05 prints off one approval (contracts §3)
 * ------------------------------------------------------------------------------------------- */

/** The two euro members the approval record states itself, and the fragments it answers directly. */
const APPROVAL_MONEY_MEMBERS = ['addedCostEur', 'protectedRevenueEur'] as const;

/**
 * The seven `SolverResult` scalars the outcome card compares, which are the members a `planned` or
 * `resulting` fragment may name (contracts §3, AAP 0.12.4's SCR-05 row).
 */
const OUTCOME_MEASURE_MEMBERS = [
  'unitsLate',
  'maxDaysLate',
  'ordersOnTime',
  'ordersTotal',
  'addedCostEur',
  'lineIdleDays',
  'revenueDelayedEur',
] as const;

/** The column of the plan as approved: the solve at the option's own levers. */
const PLANNED_COLUMN = 'planned';

/** The column of the state the write-backs left: the solve at the levers the change reached. */
const RESULTING_COLUMN = 'resulting';

/** The `.` between a comparison's column and the measure read in it. */
const MEASURE_SEPARATOR = '.';

/** One euro member the approval record states itself. */
type ApprovalMoneyMember = (typeof APPROVAL_MONEY_MEMBERS)[number];

/** One measure of the post-approval comparison: a scalar member of `SolverResult`. */
type OutcomeMeasureKey = (typeof OUTCOME_MEASURE_MEMBERS)[number];

/** The column a compared figure was read in. */
type OutcomeColumn = typeof PLANNED_COLUMN | typeof RESULTING_COLUMN;

/**
 * The name each figure is stated by in a payload's value, so the drawer names the row the outcome
 * card prints rather than the member the record happens to hold it under.
 *
 * The words are the card's own row labels. They are stated here rather than imported because a
 * service module may not reach into a feature module (rule P-2): the drawer's value is the service's
 * own sentence, and the card's labels are the names a reader sees beside the figures it opens.
 */
const FIGURE_TEXT: Readonly<Record<ApprovalMoneyMember | OutcomeMeasureKey, string>> = {
  addedCostEur: 'Added cost',
  protectedRevenueEur: 'Protected revenue',
  unitsLate: 'Units late',
  maxDaysLate: 'Maximum days late',
  ordersOnTime: 'Orders on time',
  ordersTotal: 'Orders measured',
  lineIdleDays: 'Line idle days',
  revenueDelayedEur: 'Revenue delayed',
};

/**
 * The member of a comparison's column that states the daily closing-stock series, and the separator
 * before the date a single reading belongs to.
 *
 * The card prints one row per date for that series, so a reading is addressed by the member, the
 * `/`, and the date whose close it states: `<column>.dailyClosingStock/<IsoDate>`.
 */
const OUTCOME_SERIES_MEMBER = 'dailyClosingStock';

/** The separator between the series member and the date a single reading belongs to. */
const SERIES_DATE_SEPARATOR = '/';

/** The name the closing-stock readings are stated by, matching the card's own block title. */
const OUTCOME_SERIES_TEXT = 'Daily closing stock';

/**
 * `PLT-…`, one plant — a node of the FileMap canvas, the record itself, and the client site the
 * competitive atlas's network view places beside the competitor networks.
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

/**
 * The three record families the impact chain draws but the canvas does not.
 *
 * `ImpactChainNode.ref` carries these records' own identifiers — a material, a production line and a
 * product — so a chain node's evidence is the record it was drawn from, with no second identifier
 * scheme and no node-to-record table (AAP 0.12.2's entity table names all three). None of them is a
 * prefix of another family and none shadows one, so their position after the four canvas families
 * costs no lookup.
 */
const MATERIAL_PREFIX = 'MAT-';
const LINE_PREFIX = 'LN-';
const PRODUCT_PREFIX = 'PRD-';

/**
 * `atlas:<seriesId>` — one series of the competitive atlas's resilience radar.
 *
 * A radar series is a market-intelligence record rather than a first-party one, so its payload carries
 * the pack's own provenance and label and never a first-party figure beside it (rule P-5). The atlas
 * screen's own marks reference it this way, while the identifiers the radar's vertices and the
 * network's marks carry are the `SER-` and `CMP-` families above.
 */
const ATLAS_SERIES_PREFIX = 'atlas:';

/* ---------------------------------------------------------------------------------------------
 * The composed aggregate reference — the grammar the two composing surfaces share
 * ------------------------------------------------------------------------------------------- */

/** The root SCR-01 composes: its tiles, plant rows and series points carry `overview:<key>`. */
const OVERVIEW_REF_ROOT = 'overview';

/** The root SCR-12 composes: its six ribbon tiles carry `canvas:<key>`. */
const CANVAS_REF_ROOT = 'canvas';

/**
 * The two roots a composed reference may carry, and the whole of the family's root vocabulary.
 *
 * A root only records which surface composed the reference: both accept every key, because the two
 * surfaces draw the same aggregates, and the payload states which one composed it.
 */
const AGGREGATE_REF_ROOTS = [OVERVIEW_REF_ROOT, CANVAS_REF_ROOT] as const;

/** One of the two roots a composed aggregate reference may carry. */
type AggregateRoot = (typeof AGGREGATE_REF_ROOTS)[number];

/** What each root says about itself in the payload's `inputs`, so a reader sees the composing surface. */
const AGGREGATE_ROOT_PROSE: Readonly<Record<AggregateRoot, string>> = {
  overview: 'the overview screen (SCR-01)',
  canvas: 'the FileMap canvas ribbon (SCR-12)',
};

/** The query parameter a composed reference carries the shell's plant selection in. */
const PLANTS_PARAM = 'plants';

/** The query parameter a composed reference carries the shell's product selection in. */
const PRODUCTS_PARAM = 'products';

/** The separator the selection's two lists are stated with. */
const LIST_SEPARATOR = ',';

/** The separator between a reference's root and its key. */
const ROOT_SEPARATOR = ':';

/** The separator between the parts of a key that names a subject: `plant/<id>/…`, `day/<date>/…`. */
const KEY_SEPARATOR = '/';

/** The six aggregates the canvas ribbon draws, and the keys both roots answer for them. */
const OPEN_EXCEPTIONS_KEY = 'open-exceptions';
const CRITICAL_EXCEPTIONS_KEY = 'critical-exceptions';
const REVENUE_AT_RISK_KEY = 'revenue-at-risk';
const CUSTOMER_ORDERS_AT_RISK_KEY = 'customer-orders-at-risk';
const MEDIAN_HOURS_KEY = 'median-hours-to-approved-plan';
const PLANTS_IN_SCOPE_KEY = 'plants-in-scope';

/** The key naming one plant's reading. */
const PLANT_KEY = 'plant';

/** The key naming one day of the opened-and-resolved series, and its two readings. */
const DAY_KEY = 'day';
const DAY_OPEN_READING = 'open';
const DAY_RESOLVED_READING = 'resolved';

/**
 * The two figures one plant's risk-by-plant row carries: how many of its exceptions are open and the
 * revenue those exceptions place at risk.
 *
 * Both are members of the row the aggregate delivers, and a reader can activate either, so each needs a
 * key of its own: a reference naming one figure and opening the other would report a number the reader
 * did not ask for (principle PR-6).
 */
type PlantReading = typeof OPEN_EXCEPTIONS_KEY | typeof REVENUE_AT_RISK_KEY;

/**
 * The five ribbons keys a composed `overview:` reference and a composed `canvas:` reference both draw,
 * in the order the aggregate states them.
 *
 * `critical-exceptions` is deliberately absent: only the ribbon read counts it, so it is answered from
 * that read whichever root composed the reference (see `aggregateOf`).
 */
const SHARED_AGGREGATE_KEYS = [
  OPEN_EXCEPTIONS_KEY,
  REVENUE_AT_RISK_KEY,
  CUSTOMER_ORDERS_AT_RISK_KEY,
  MEDIAN_HOURS_KEY,
  PLANTS_IN_SCOPE_KEY,
] as const;

/** An aggregate key both surfaces draw: one of the five the ribbon copies from the overview. */
type SharedAggregateKey = (typeof SHARED_AGGREGATE_KEYS)[number];

/** Every aggregate key either surface draws. */
type OverviewAggregateKey = SharedAggregateKey | typeof CRITICAL_EXCEPTIONS_KEY;

/* ---------------------------------------------------------------------------------------------
 * The write-back step reference — one step of a plan's simulated write-back
 * ------------------------------------------------------------------------------------------- */

/**
 * The root the write-back family is composed from: a step carries `write-back:<ownerId>/<sequence>`.
 *
 * A step has no identifier of its own. Contracts §3 gives `WriteBack` a position, a system, the
 * reference it writes, its description and its state, and nothing a reference could address it by, so
 * the reference names the record the steps belong to and the step's own position within it.
 */
const WRITE_BACK_REF_ROOT = 'write-back';

/**
 * The prefix every write-back step reference opens with, `write-back:`, built from the root above so
 * the two cannot drift apart.
 */
const WRITE_BACK_REF_PREFIX = `${WRITE_BACK_REF_ROOT}${ROOT_SEPARATOR}`;

/**
 * The grammar, in the form a refusal quotes it, written once from the constants above rather than
 * spelled a second time in the sentence that reports a malformed reference.
 */
const WRITE_BACK_REF_GRAMMAR = `${WRITE_BACK_REF_PREFIX}<ownerId>${KEY_SEPARATOR}<sequence>`;

/**
 * The shape a step's position takes in a reference: a whole number from one upwards, with no sign, no
 * fraction, no padding and no surrounding space.
 *
 * Anchored, so `3x` and `3.5` are refused rather than read as the third step, and stated as a pattern
 * rather than left to `Number` because `Number('')` is zero and `Number(' 3 ')` is three: a reference
 * the grammar does not state is refused, not repaired.
 */
const STEP_POSITION_PATTERN = /^[1-9][0-9]*$/;

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
 * refusal. The correlation identifier is the call's own, minted once by the adapter from the ticket it
 * took at the call's entry: the same value the result's `Meta.traceId` carries and the event an audited
 * write appends, so a reader can quote one identifier for the whole request.
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
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
    traceId: ctx.traceId,
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
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param message - The reason, naming the reference.
 * @returns The `Problem` to throw.
 */
function notFoundProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'not-found', message, traceId: ctx.traceId };
}

/**
 * The failure a request the records cannot honour is refused with.
 *
 * Used where the request contradicts the record set rather than a permission — a package identifier
 * that disagrees with the review it arrives with, a correction with no value, or a package that carries
 * no element to divide by.
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param message - The reason, in plain words.
 * @returns The `Problem` to throw.
 */
function validationProblem(ctx: HandlerContext, message: string): Problem {
  return { type: 'validation', message, traceId: ctx.traceId };
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
      demonstrationForbiddenReason(ctx.actor.role, EVIDENCE_READ),
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
 * Whether a resolved reference is one of four of the canvas's five node families.
 *
 * The fifth family, a material, is not answered here: a material record names no plant — it is bought
 * from a supplier and produced at a tier-2 origin, and the products it goes into are its own
 * `productIds`, the reach a supplier's node is derived from (`src/seed/materials.ts`) — so
 * `getEvidence` answers for it through `subjectOf`, which returns `null` for it, with the permission
 * alone deciding whether its evidence is readable.
 *
 * Written as a type guard over the union's own discriminant, so `assertNodeReach` and the four
 * evidence builders behind this guard can take a node and nothing else: the compiler then proves no
 * plant-scoped record is narrowed by the node rule, and no node by a single plant.
 *
 * @param resolved - The record the reference named.
 * @returns Whether it is a plant, supplier, origin or customer.
 */
function isNodeRef(resolved: ResolvedRef): resolved is NodeRef {
  switch (resolved.family) {
    case 'plant':
    case 'supplier':
    case 'origin':
    case 'customer':
      return true;
    default:
      return false;
  }
}

/**
 * Whether a resolved reference is one of the five families whose plants are the plants of one exception.
 *
 * The exception itself, a scenario that answers it, an approval of it, one figure inside that approval and
 * a step of a plan's write-back all belong to one disruption, so all five are admitted over the plants
 * that exception touches rather than over one plant of their own. Written as a type guard over the
 * union's own discriminant, so `assertExceptionReach` can take that five-family member and nothing else:
 * the compiler then proves no record of another family is admitted by an exception's reach, and no
 * exception by another family's rule.
 *
 * @param resolved - The record the reference named.
 * @returns Whether it is an exception, a scenario, an approval, an approval's figure or a write-back step.
 */
function isExceptionRef(resolved: ResolvedRef): resolved is ExceptionRef {
  switch (resolved.family) {
    case 'exception':
    case 'scenario':
    case 'approval':
    case 'approval-figure':
    case 'write-back':
      return true;
    default:
      return false;
  }
}

/**
 * Whether a resolved reference is one of the three families whose own read requires a permission of its
 * own.
 *
 * An audit event, a policy and an outbound endpoint name no plant of their own, so no scope check
 * narrows them; what admits them is the permission the read that publishes the record class requires —
 * the trail's in `./audit.ts`, the policy set's and the ledger's in `./governance.ts`. Written as a type
 * guard over the union's own discriminant, so `assertFamilyReadable` can take that three-family member
 * and nothing else: the compiler then proves no family `evidence.read` alone admits is gated by a rule
 * about another read's permission.
 *
 * @param resolved - The record the reference named.
 * @returns Whether it is an audit event, a policy or an outbound endpoint.
 */
function isFamilyWithOwnRead(resolved: ResolvedRef): resolved is FamilyWithOwnRead {
  switch (resolved.family) {
    case 'audit-event':
    case 'policy':
    case 'outbound-endpoint':
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
 * the plants of the suppliers it feeds, and a customer the plants its orders ship from. `plantsOfNode`
 * is the records' own answer to that question — the same function the pin filter is narrowed by, so a
 * node's evidence and its pins cannot disagree about which plants it touches — and the node is readable
 * when the persona's effective scope covers at least one of them.
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
 * Refuses the call when every plant an exception-derived record touches lies outside the persona's
 * effective plant scope.
 *
 * An exception is not confined to the plant its own record is laid on: `alsoAffectsPlantIds` names the
 * plants the disruption reaches, and `plantsTouchedBy` is the records' own answer to which plants an
 * exception therefore concerns. That list is the one the exception queue admits a row by
 * (`src/domain/aggregation/exceptions.ts`), and the evidence family admits the same record over the same
 * list, so a row the queue showed opens its drawer for the persona the row was shown to instead of being
 * refused by the one plant the record is laid on (AAP 0.2.1's one-scope rule; principle PR-6, "every
 * figure opens its evidence").
 *
 * A scenario and an approval belong to one exception, so both are admitted over that exception's plants:
 * the option a screen printed and the plan a screen approved stand where the disruption they answer
 * stands. The intersection is decided by the contracts §7.1 matrix through `hasPermission`, evaluated
 * with each plant in turn, so the answer is the role's plant scope, the persona's seeded scope and the
 * plants the exception touches — the authority every scoped list and aggregate is narrowed by, rather
 * than a second scope table.
 *
 * An exception the records hold nowhere leaves its scenario or approval with no plant to narrow it by, so
 * the permission's own decision stands, which is the reading `hasPermission` documents for a `null`
 * subject. The refusal names the exception, every plant it touches and the persona it acts as, so a
 * reader is told which records stand outside their scope instead of being told that something was
 * refused (rule P-8) — the wording `assertNodeReach` uses for a node that reaches several plants.
 *
 * @param ctx - The call's context: the persona the check is made for and the records the exception is read from.
 * @param resolved - The exception, scenario or approval the reference named.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertExceptionReach(ctx: HandlerContext, resolved: ExceptionRef): void {
  const exception = exceptionBehind(ctx.state.records, resolved);

  if (exception === undefined) {
    return;
  }

  const plants = plantsTouchedBy(exception);

  if (
    plants.some((plantId) => hasPermission(ctx.actor.role, EVIDENCE_READ, { plantId }, ctx.actor))
  ) {
    return;
  }

  throw permissionProblem(
    ctx,
    EVIDENCE_READ,
    `Exception ${exception.id} touches ${plants.join(', ')}, and none of those plants lies inside the plant scope of the acting persona (${ctx.actor.id}), so its evidence is not readable here.`,
  );
}

/**
 * The exception an exception-derived record answers, or `undefined` when the records hold it nowhere.
 *
 * An exception names itself; a scenario and an approval name the exception they answer, which is the
 * relation contracts §3 fixes for both (`Scenario.exceptionId`, `Approval.exceptionId`); and a step of a
 * write-back belongs to the plan it writes back, so it answers the exception of the approval or the
 * option that holds it. Resolved through the record each one carries rather than through a second list,
 * so the plants a scenario, an approval or a write-back step is admitted over cannot describe a
 * different disruption from the one it answers.
 *
 * @param records - The session's record set.
 * @param resolved - The exception, scenario, approval or write-back step the reference named.
 * @returns The exception behind it, or `undefined` when the record set holds no such exception.
 */
function exceptionBehind(
  records: SeedRecordSet,
  resolved: ExceptionRef,
): OperationalException | undefined {
  if (resolved.family === 'exception') {
    return resolved.record;
  }

  const exceptionId =
    resolved.family === 'write-back' ? resolved.owner.exceptionId : resolved.record.exceptionId;

  return records.exceptions.find((candidate) => candidate.id === exceptionId);
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
      demonstrationForbiddenReason(ctx.actor.role, EVIDENCE_REVIEW),
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
 * Whether the acting persona may read this document's body — the single owner of the redaction rule
 * AAP 0.2.1 and AAP 0.12.3 require, and the block that states it.
 *
 * THE ONE WITHHELD CLASSIFICATION IS `customer-confidential`. AAP 0.2.1 states the duty in one
 * sentence — "USR-04 cannot open the body of a customer-confidential document, and USR-08 sees only its
 * own-vendor pins" — and AAP 0.12.3 states it again from the endpoint's side: "Redaction is applied
 * before serialisation, so a customer-confidential body never crosses the boundary for USR-04". No
 * input gives a `supplier-confidential` body a confidentiality duty, and none could be scoped here if
 * it did: the record set attributes no owning supplier to a document, and `DocumentBody` (AAP 0.12.2,
 * seed §7) carries title, classification, residency, attachments and body text and no member naming a
 * supplier. Every other value, `supplier-confidential` included, is therefore released to any persona
 * holding `evidence.read` — the permission both callers check first — and this block says so rather
 * than leaving a reader to take a tier for protected that is not. Withholding it would need a member
 * AAP 0.12.2 does not define, which AAP 0.1 forbids this module from inventing.
 *
 * The verdict comes from the contracts §7.1 matrix through `hasPermission` with no subject, because a
 * document carries no plant of its own and the permission is not plant-scoped.
 *
 * WHY THE RULE IS APPLIED IN THE SERVICE AND NOT IN A SCREEN — rule P-2, AAP 0.2.1. "A UI-only
 * restriction would fail the services' own enforcement requirement", so both refusals are made here,
 * before a record leaves this family: a withheld body reaches a screen as a `Problem` and never as a
 * payload, an empty string or a log line, and `pinVisibleTo` runs over the records the session holds
 * rather than over what a canvas chose to draw. A disabled control is then an explanation of the
 * refusal the reader would have met anyway (rule P-8), not the defence against it.
 *
 * Exported so the two paths that could carry a body answer alike: `getDocument` refuses the document
 * outright, and the assistant family refuses a question whose cited document this predicate answers
 * `false` for, before it composes an answer from it. One predicate rather than two copies is what
 * keeps those two paths from drifting apart (AAP 0.12.1's "permission and policy checks appear once
 * per handler family", read here as one rule with one owner).
 *
 * @param ctx - The call's context: the persona the body would be released to.
 * @param document - The document whose body is under consideration.
 * @returns `true` when the acting persona may read the body, `false` when it must be withheld.
 */
export function mayReadDocumentBody(ctx: HandlerContext, document: DocumentBody): boolean {
  if (document.classification !== CUSTOMER_CONFIDENTIAL) {
    return true;
  }

  return hasPermission(ctx.actor.role, DOCUMENT_CONFIDENTIAL_READ, null, ctx.actor);
}

/**
 * Withholds a customer-confidential body from a persona that may not read it — the service's half of
 * the redaction AAP 0.2.1 and AAP 0.12.3 require.
 *
 * The verdict is `mayReadDocumentBody`'s, so this function and the assistant family cannot disagree
 * about who may read a body. The refusal names the classification it withheld and the permission that
 * would release it, and it carries the roles that hold that permission so a forbidden card can say who
 * may act (rule P-8). The body itself is never placed in the message, the payload or a log: the caller
 * of this function has the record in hand only to decide whether it may leave, and every return path
 * below builds the released body from the record after this check has passed.
 *
 * @param ctx - The call's context: the persona the body would be released to.
 * @param document - The document whose body is under consideration.
 * @throws Problem - A `'permission'` failure naming the classification and the permission.
 */
function assertDocumentBodyReadable(ctx: HandlerContext, document: DocumentBody): void {
  if (mayReadDocumentBody(ctx, document)) {
    return;
  }

  throw permissionProblem(
    ctx,
    DOCUMENT_CONFIDENTIAL_READ,
    `The body of document ${document.id} is classified ${document.classification}, and the acting role (${ctx.actor.role}) does not hold the ${DOCUMENT_CONFIDENTIAL_READ} permission that releases it. The body was withheld before it left the service.`,
  );
}

/**
 * Whether the acting persona may read the simulated market-intelligence pack — the single owner of the
 * check {@link assertPackReach} states.
 *
 * Two refusals answer `false`. The forbidden trigger withholds the pack as it withholds every read of
 * this family, and a role without `competitive.read` does not reach it at all (AAP 0.12.3). The
 * permission is evaluated with no subject because the pack is not plant-scoped, so the role's matrix
 * alone decides it.
 *
 * Exported for the identifier search, which indexes the pack's crossing and competitor families only
 * where this predicate answers `true`: the hit a reader is offered for a mark and the record behind
 * that mark are then released by one rule rather than by two that could drift apart (the reasoning
 * {@link mayReadDocumentBody} states for its own two callers).
 *
 * @param ctx - The call's context: the persona the pack would be released to.
 * @returns `true` when the pack is readable for this call, `false` when it is withheld.
 */
export function mayReachPack(ctx: HandlerContext): boolean {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    return false;
  }

  return hasPermission(ctx.actor.role, COMPETITIVE_READ, null, ctx.actor);
}

/**
 * Refuses the call when the acting persona may not read the simulated market-intelligence pack.
 *
 * A crossing, a competitor's site or network and a radar reading are records of the atlas read, and
 * `getAtlas` withholds that whole read from a role without `competitive.read` (AAP 0.12.3). Asking the
 * same question here is what keeps a reference from reaching a record the corresponding list read would
 * have withheld: the evidence behind a competitor's mark is exactly as readable as the mark itself. The
 * verdict is {@link mayReachPack}'s, so this refusal and the identifier search's family gate cannot
 * disagree about who may reach the pack; the two refusals are stated here because each names the
 * condition that produced it — the forbidden state the popover demonstrates, or a role the matrix
 * leaves without the permission (rule P-8).
 *
 * @param ctx - The call's context: the persona the check is made for.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertPackReach(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw permissionProblem(
      ctx,
      COMPETITIVE_READ,
      `The simulated market-intelligence pack is not readable in this state; opening the record behind a competitor mark requires the ${COMPETITIVE_READ} permission.`,
    );
  }

  if (!mayReachPack(ctx)) {
    throw permissionProblem(
      ctx,
      COMPETITIVE_READ,
      `The acting role (${ctx.actor.role}) does not hold the ${COMPETITIVE_READ} permission, so the simulated market-intelligence record behind an atlas mark is not readable here.`,
    );
  }
}

/**
 * Whether the acting persona may read the audit trail — the single owner of the check
 * {@link assertFamilyReadable} applies to an audit event.
 *
 * The trail's own read is `./audit.ts`, whose every read requires `audit.read` (contracts §7.1), and the
 * matrix is the one authority on who holds it, so the permission is evaluated with no subject: the chain
 * is not plant-scoped and no plant could narrow it. The demonstration's forbidden trigger is deliberately
 * not asked here — `assertEvidenceRead` has already refused the whole call while it is in effect, so this
 * predicate answers a question about the role alone, and the identifier search keeps exactly the family
 * gate it has today rather than losing the audit family to a state that says nothing about the role.
 *
 * Exported for the identifier search, which indexes the trail only where this predicate answers `true`:
 * the hit a reader is offered for an event and the record behind that hit are then released by one rule
 * rather than by two that could drift apart (the reasoning {@link mayReadDocumentBody} states for its own
 * two callers).
 *
 * @param ctx - The call's context: the persona the trail would be released to.
 * @returns `true` when an event of the trail is readable for this call, `false` when it is not.
 */
export function mayReadAuditEvents(ctx: HandlerContext): boolean {
  return hasPermission(ctx.actor.role, AUDIT_READ, null, ctx.actor);
}

/**
 * Whether the acting persona may read the policy set — the single owner of the check
 * {@link assertFamilyReadable} applies to a policy.
 *
 * The policy set's own read is `./governance.ts`, whose `listPolicies` and `getPolicy` both require
 * `policy.read` (contracts §7.1). As for the trail, the permission is evaluated with no subject, because
 * the policy set is group-wide rather than plant-scoped, the forbidden trigger is left to
 * `assertEvidenceRead`, and the predicate is exported so the identifier search releases a policy hit and
 * the record behind it by one rule.
 *
 * @param ctx - The call's context: the persona the policy set would be released to.
 * @returns `true` when a policy is readable for this call, `false` when it is not.
 */
export function mayReadPolicies(ctx: HandlerContext): boolean {
  return hasPermission(ctx.actor.role, POLICY_READ, null, ctx.actor);
}

/**
 * Whether the acting persona may read the declared configuration — the single owner of the check
 * {@link assertFamilyReadable} applies to an outbound endpoint.
 *
 * The deployment record and the outbound ledger are `./governance.ts`'s reads, and both require
 * `sovereignty.read` (contracts §7.1). The permission is evaluated with no subject for the reason
 * {@link mayReadPolicies} gives, the forbidden trigger is left to `assertEvidenceRead`, and the predicate
 * is exported so a reader of this module can ask the same question the ledger read asks.
 *
 * @param ctx - The call's context: the persona the declared configuration would be released to.
 * @returns `true` when a row of the ledger is readable for this call, `false` when it is not.
 */
export function mayReadOutboundEndpoints(ctx: HandlerContext): boolean {
  return hasPermission(ctx.actor.role, SOVEREIGNTY_READ, null, ctx.actor);
}

/**
 * The permission each of the three families whose own read is a different read requires (contracts
 * §7.1).
 *
 * Keyed by the resolved family rather than by the record, because the permission belongs to the record
 * class: an event needs the trail's permission, a policy the policy set's, and an outbound endpoint the
 * declared configuration's. Exhaustive over the family type, so a fourth family added to
 * `FamilyWithOwnRead` without a permission here does not compile.
 */
const FAMILY_READ_PERMISSION: Readonly<Record<FamilyWithOwnRead['family'], Permission>> = {
  'audit-event': AUDIT_READ,
  policy: POLICY_READ,
  'outbound-endpoint': SOVEREIGNTY_READ,
};

/**
 * Refuses the call when the acting persona may not read the record class the reference resolved into.
 *
 * Three record classes this family answers are records of another read: one event of the audit trail,
 * one policy of the policy set and one row of the declared outbound ledger. Each of those reads requires
 * a permission of its own (contracts §7.1), so the evidence behind a record is released to exactly the
 * roles its own read releases the record to — the rule {@link assertPackReach} states for the atlas and
 * {@link assertDocumentBodyReadable} states for a withheld body. The verdicts are
 * {@link mayReadAuditEvents}'s, {@link mayReadPolicies}'s and {@link mayReadOutboundEndpoints}'s, so this
 * refusal and the identifier search's family gates cannot disagree about who may read them.
 *
 * A refusal is stated per family because each names the record the reference resolved to, the acting role
 * and the read whose permission stands in the way, so a reader learns which record class stood outside
 * their role rather than only that something was refused (rule P-8). The forbidden trigger is not asked
 * here: `assertEvidenceRead` has already refused the whole call in that state.
 *
 * @param ctx - The call's context: the persona the check is made for.
 * @param resolved - The audit event, policy or outbound endpoint the reference named.
 * @throws Problem - A `'permission'` failure naming the permission and the roles that hold it.
 */
function assertFamilyReadable(ctx: HandlerContext, resolved: FamilyWithOwnRead): void {
  const permission = FAMILY_READ_PERMISSION[resolved.family];
  const role = ctx.actor.role;

  switch (resolved.family) {
    case 'audit-event':
      if (mayReadAuditEvents(ctx)) {
        return;
      }

      throw permissionProblem(
        ctx,
        permission,
        `The acting role (${role}) does not hold the ${permission} permission that the audit trail's own read requires, so the evidence behind audit event ${resolved.record.id} is not readable here.`,
      );

    case 'policy':
      if (mayReadPolicies(ctx)) {
        return;
      }

      throw permissionProblem(
        ctx,
        permission,
        `The acting role (${role}) does not hold the ${permission} permission that the policy set's own read requires, so the evidence behind policy ${resolved.record.id} is not readable here.`,
      );

    case 'outbound-endpoint':
      if (mayReadOutboundEndpoints(ctx)) {
        return;
      }

      throw permissionProblem(
        ctx,
        permission,
        `The acting role (${role}) does not hold the ${permission} permission that the declared configuration's own read requires, so the evidence behind outbound endpoint ${resolved.record.endpoint} is not readable here.`,
      );
  }
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
 * The composed aggregate reference: its grammar, its selection and its figure — AAP 0.2.1 F12
 * ------------------------------------------------------------------------------------------- */

/**
 * The two parts of a reference one of the composed roots names: the root, and the key with its query.
 *
 * The remainder is kept as text because the key's own grammar — an aggregate key, or a key naming a
 * plant or a day — is decided after the root is known, and a root with no key is a reference the read
 * refuses rather than a reference it ignores.
 */
interface ComposedReference {
  /** Which surface composed the reference. */
  readonly root: AggregateRoot;

  /** The key and its query, exactly as the reference states them after the root's separator. */
  readonly rest: string;
}

/**
 * Whether a string is one of the two roots a composed reference carries.
 *
 * @param value - The text before the reference's first separator.
 * @returns `true` when the text names one of the two composing surfaces.
 */
function isAggregateRoot(value: string): value is AggregateRoot {
  return (AGGREGATE_REF_ROOTS as readonly string[]).includes(value);
}

/**
 * The root and remainder of a composed reference, or `null` when the reference is not one.
 *
 * The reference a composing surface emits reads `<root>:<key>`, and reads
 * `<root>:<key>?plants=<ids>&products=<ids>` when the top bar's filters name plants or a product, each
 * list present only when it is non-empty, comma-separated and trimmed. Both roots accept every key,
 * because the two surfaces draw the same aggregates.
 *
 * The test is the root alone: the two roots are the only words this read treats as more than an
 * identifier prefix, so a reference that opens with something else keeps travelling down the record
 * families unchanged.
 *
 * @param ref - The reference the displayed element carries.
 * @returns Its two parts, or `null` when no composed root opens it.
 */
function composedReferenceOf(ref: string): ComposedReference | null {
  const separator = ref.indexOf(ROOT_SEPARATOR);

  if (separator < 0) {
    return null;
  }

  const root = ref.slice(0, separator);

  return isAggregateRoot(root) ? { root, rest: ref.slice(separator + 1) } : null;
}

/**
 * Which aggregate figure a composed reference names, together with the subject it names it for.
 *
 * A key naming no subject is one of the six ribbon aggregates; a plant or a day key names the subject
 * the read must carry a reading for, which is why the subject travels with the key rather than being
 * re-parsed from the reference later.
 */
type AggregateKey =
  | { readonly kind: 'aggregate'; readonly key: OverviewAggregateKey }
  | { readonly kind: 'plant'; readonly plantId: PlantId; readonly reading: PlantReading }
  | { readonly kind: 'day'; readonly date: IsoDate; readonly series: 'open' | 'resolved' };

/**
 * Every key a composed reference may name, stated once for the refusals that report the grammar.
 *
 * Kept as one sentence rather than composed at each refusal, so the message a reader meets and the
 * keys this read answers cannot drift apart.
 */
const AGGREGATE_KEY_GRAMMAR =
  `${OPEN_EXCEPTIONS_KEY}, ${CRITICAL_EXCEPTIONS_KEY}, ${REVENUE_AT_RISK_KEY}, ` +
  `${CUSTOMER_ORDERS_AT_RISK_KEY}, ${MEDIAN_HOURS_KEY}, ${PLANTS_IN_SCOPE_KEY}, ` +
  `${PLANT_KEY}/<plantId>/${OPEN_EXCEPTIONS_KEY}, ${PLANT_KEY}/<plantId>/${REVENUE_AT_RISK_KEY}, ` +
  `${DAY_KEY}/<date>/${DAY_OPEN_READING} and ${DAY_KEY}/<date>/${DAY_RESOLVED_READING}`;

/**
 * The six aggregates' formulas: the contracts §5 rule that owns each figure.
 *
 * Every sentence states the rule and then says where the number came from, because the payload quotes
 * an aggregate read's output and must not read as though it had computed one (rule P-6).
 */
const AGGREGATE_FORMULAS: Readonly<Record<OverviewAggregateKey, string>> = {
  [OPEN_EXCEPTIONS_KEY]:
    "The open-exceptions aggregate counts the exceptions whose record still stands open within the " +
    "resolved scope (contracts §5). The figure is the overview aggregate read's own output: this " +
    'payload quotes it and recomputes nothing.',
  [CRITICAL_EXCEPTIONS_KEY]:
    'The ribbon counts the in-scope exception rows whose severity their records state as critical ' +
    "(contracts §5's exception aggregate, read by the urgency module). The figure is the canvas " +
    "ribbon read's own output: this payload quotes it and recomputes nothing.",
  [REVENUE_AT_RISK_KEY]:
    'Revenue at risk is the sum, over the affected lines of the in-scope open exceptions, of the units ' +
    'at risk multiplied by the product price, rounded half up to two decimals (contracts §5). The ' +
    "figure is the overview aggregate read's own output: this payload quotes it and recomputes nothing.",
  [CUSTOMER_ORDERS_AT_RISK_KEY]:
    'The customer-orders-at-risk aggregate counts the distinct customer orders carrying an affected ' +
    "line of an in-scope open exception (contracts §5). The figure is the overview aggregate read's " +
    'own output: this payload quotes it and recomputes nothing.',
  [MEDIAN_HOURS_KEY]:
    'The median hours to an approved plan is the middle value of the hours between an exception\'s ' +
    'detection and the approval of its plan, over the qualifying activity records and unrounded ' +
    "(contracts §5). The figure is the overview aggregate read's own output: this payload quotes it " +
    'and recomputes nothing.',
  [PLANTS_IN_SCOPE_KEY]:
    'The plants in scope are the plants the resolved scope names — the top bar\'s plant selection ' +
    'intersected with the acting role\'s plant scope — which is the population every list read and ' +
    'every aggregate is computed over. The figure is the resolved scope\'s own plant list, not the ' +
    'number of risk-by-plant rows: those rows also carry a plant an admitted exception is recorded ' +
    'at, which the selection need not name.',
};

/**
 * The text of one amount, as an evidence payload states it: the figure in the interface's one money
 * shape.
 *
 * The shape has one owner in `src/types/figure-text.ts`, which this module imports: a handler may not
 * import `src/components` (AAP §0.18.1, rule P-2), so the rule the drawer's text is written with lives
 * where both tiers reach it rather than in either of them. `src/services/mock/mock-backend.test.ts`
 * compares an amount this module states with `formatMoney`'s output for the same figure, so the two
 * renderings cannot drift apart.
 *
 * `Evidence.value` and `Evidence.inputs` are display strings the record already carries (contracts §3,
 * AAP §0.12.2), so a drawer prints what this function composed and a figure that reached it as a bare
 * number could not be formatted afterwards. The figure a reader compares is still the one the record
 * or the aggregate read reported, stated the way every surface states it: the Overview's revenue tile
 * prints `3.916.800 EUR` and its drawer reads `3.916.800 EUR at risk` (contracts §1, AAP §0.8).
 *
 * Only a finite amount is formatted, as `formatMoney` states: an amount with no formatted form keeps
 * its own text rather than becoming a formatted `NaN` or a substituted zero, so a defect shows on
 * screen as a value a reader can trace (rule P-6). Nothing is rounded here — two decimals is the
 * contract's own precision rather than a width this module chooses.
 *
 * @param amount - The amount the record or the aggregate reported.
 * @returns The amount with the currency code and at most two decimals, or the input as text.
 */
function amountText(amount: number): string {
  return formatMoney(amount);
}

/**
 * One `inputs` entry for a money member: the member's own name and its amount in the interface's money
 * shape, so no `*Eur` member reaches a payload as a bare machine number (contracts §1).
 *
 * The entry keeps the `name = value` grammar every other input uses, in the position the payload states
 * it, so a reader scanning the list meets one form and the drawer's list renders it unchanged.
 *
 * @param name - The member's name, as the record spells it.
 * @param amount - The member's exact amount.
 * @returns The entry, in the payload's input form.
 */
function moneyInput(name: string, amount: number): string {
  return `${name} = ${amountText(amount)}`;
}

/**
 * The text of one grouped number that carries no unit, for a value a payload echoes rather than an
 * amount — a lever a reader typed, stated in decimal notation and grouped to at most two decimals.
 *
 * The contract is {@link amountText}'s otherwise: only a finite number is formatted, and a value with
 * no formatted form keeps its own text (rule P-6).
 *
 * @param value - The number the record states.
 * @returns The grouped number to at most two decimals, or the input as text.
 */
function quantityText(value: number): string {
  return formatQuantity(value);
}

/**
 * The two levers one option was measured at, in the payload's input form.
 *
 * These are the values a reader typed into the sandbox, and one of them written raw reaches the drawer
 * in the exponent form a large number prints as (`1e+30`), which no surface of the interface shows.
 * Each is stated in the grouped, unitless shape `formatQuantity` gives every number the interface
 * prints, so the echo of a value the constraint check refuses stays legible beside the message that
 * refuses it (rule P-6, AAP §0.12.2).
 *
 * @param levers - The option's levers.
 * @returns The entry, in the payload's input form.
 */
function leversText(levers: Levers): string {
  return (
    `levers = airSets ${quantityText(levers.airSets)}, ` +
    `transferSets ${quantityText(levers.transferSets)}`
  );
}

/**
 * The shell selection a composed reference carries, in the payload's own words.
 *
 * Reported as the reference stated it, so a reader can compare the drawer's figure with the screen
 * beside it: an unnarrowed reference reads `plants all; products all`, and a narrowed one names every
 * entry the selection carried.
 *
 * @param selection - The selection the reference stated.
 * @returns One sentence naming both halves of it.
 */
function selectionText(selection: ScopeFilterInput): string {
  const plants = selection.plantIds ?? (selection.plantId === undefined ? [] : [selection.plantId]);
  const products = selection.productId === undefined ? [] : [selection.productId];

  return (
    `plants ${plants.length === 0 ? 'all' : plants.join(`${LIST_SEPARATOR} `)}; ` +
    `products ${products.length === 0 ? 'all' : products.join(`${LIST_SEPARATOR} `)}`
  );
}

/**
 * The two `inputs` entries every aggregate payload opens with: the surface and the selection.
 *
 * The root is reported rather than dropped because it is the only member that says which screen
 * composed the reference, and a reader comparing two drawers for one figure then sees the surface
 * each came from (AAP 0.2.1 F12).
 *
 * @param root - The root the reference carried.
 * @param selection - The selection the reference stated.
 * @returns The two entries, in the order the payload states them.
 */
function aggregateInputs(root: AggregateRoot, selection: ScopeFilterInput): string[] {
  return [
    `composed by = ${AGGREGATE_ROOT_PROSE[root]} under the ${root}${ROOT_SEPARATOR} root`,
    `selection = ${selectionText(selection)}`,
  ];
}

/**
 * One risk-by-plant row, as the revenue aggregate's component and as the plant reading's own value.
 *
 * The row is the aggregate's own output, so the sentence quotes its two figures rather than
 * re-deriving either: this is what a reader sees when a total is opened and the drawer names the rows
 * it was summed from.
 *
 * @param row - One row of the overview's by-plant grouping.
 * @returns The row's two figures, in the payload's input form.
 */
function plantRowInput(row: PlantRiskRow): string {
  return (
    `plant ${row.plantId} (${row.plantName}): ${row.openExceptions} open exceptions, ` +
    `${amountText(row.revenueAtRiskEur)} at risk`
  );
}

/**
 * Whether a key is one of the five both surfaces draw, which is what makes one drawer name the other.
 *
 * @param key - The aggregate key the reference named.
 * @returns `true` when the ribbon's tile and the overview's figure are the same number.
 */
function isSharedAggregateKey(key: OverviewAggregateKey): key is SharedAggregateKey {
  return (SHARED_AGGREGATE_KEYS as readonly string[]).includes(key);
}

/**
 * The reference the other surface composes for the same figure, for the payload's `downstream`.
 *
 * A ribbon tile copies the overview's figure and the overview's tile is the figure the ribbon copies,
 * so each is downstream of the other: naming it is what tells a reader which other control shows the
 * same number. A key only one surface draws names nothing.
 *
 * @param root - The root the opened reference carried.
 * @param key - The aggregate key it named.
 * @returns The other surface's reference, or an empty list for a key it does not draw.
 */
function copiedByOtherSurface(root: AggregateRoot, key: OverviewAggregateKey): string[] {
  if (!isSharedAggregateKey(key)) {
    return [];
  }

  const other = root === OVERVIEW_REF_ROOT ? CANVAS_REF_ROOT : OVERVIEW_REF_ROOT;

  return [`${other}${ROOT_SEPARATOR}${key}`];
}

/**
 * Parses one composed reference's key, or refuses it as a reference naming no aggregate.
 *
 * A single-part key names one of the six ribbon aggregates; a three-part key names a plant's reading
 * or one day of the opened-and-resolved series. Anything else — an unknown word, the right key with
 * the wrong arity, a subject left blank — is refused as `'not-found'` naming the reference, because
 * the read holds no figure under it (contracts §2's cause for an identifier the records do not hold).
 *
 * @param ctx - The call's context, whose state supplies the trace identifier.
 * @param ref - The reference, for the refusal's message.
 * @param keyText - The key as the reference states it, before its query.
 * @returns The key the reference names.
 * @throws Problem - A `'not-found'` failure naming the reference and the keys the read answers.
 */
function aggregateKeyOf(ctx: HandlerContext, ref: string, keyText: string): AggregateKey {
  const key = keyText.trim();
  const parts = key.split(KEY_SEPARATOR);
  const [head, subject, tail] = parts;

  if (parts.length === 1) {
    if (key === CRITICAL_EXCEPTIONS_KEY) {
      return { kind: 'aggregate', key: CRITICAL_EXCEPTIONS_KEY };
    }

    const shared = SHARED_AGGREGATE_KEYS.find((candidate) => candidate === key);

    if (shared !== undefined) {
      return { kind: 'aggregate', key: shared };
    }
  }

  if (parts.length === 3 && subject !== undefined && subject.trim() !== '') {
    if (head === PLANT_KEY && tail === REVENUE_AT_RISK_KEY) {
      return { kind: 'plant', plantId: subject, reading: REVENUE_AT_RISK_KEY };
    }

    if (head === PLANT_KEY && tail === OPEN_EXCEPTIONS_KEY) {
      return { kind: 'plant', plantId: subject, reading: OPEN_EXCEPTIONS_KEY };
    }

    if (head === DAY_KEY && (tail === DAY_OPEN_READING || tail === DAY_RESOLVED_READING)) {
      return { kind: 'day', date: subject, series: tail };
    }
  }

  throw notFoundProblem(
    ctx,
    `The reference ${ref} names no aggregate this read answers. A composed key is one of ${AGGREGATE_KEY_GRAMMAR}.`,
  );
}

/**
 * The shell selection a composed reference states, or a refusal naming what it cannot read.
 *
 * The query is parsed rather than pattern-matched, so a parameter the grammar does not carry is refused
 * as `'validation'` naming it rather than silently ignored. Everything else about a selection that
 * cannot be read is refused as `'not-found'` naming the reference: an empty value, a blank entry in a
 * list, a parameter stated twice, a plant or a product the record set does not hold, and a product list
 * naming more than the one product the top bar offers. Each of those would otherwise compute the figure
 * over a population the reference did not name — the acting persona's whole scope, or a narrower one —
 * and hand the drawer a number the tile never showed, which is the one thing a composed selection may
 * never do (AAP §0.2.1 F12, PR-6, and the one scope resolver this read shares with the screens). The
 * resolved selection is then handed to the aggregate read itself, so the drawer's population is the
 * screen's population by construction.
 *
 * @param ctx - The call's context, whose records decide whether a named plant and product exist.
 * @param ref - The reference, for the refusals' messages.
 * @param query - The text after the reference's `?`, or an empty string when it carries none.
 * @returns The selection the one scope resolver is handed.
 * @throws Problem - A `'validation'` failure naming a query parameter the grammar does not carry, or a
 *   `'not-found'` failure naming the reference whose selection cannot be read.
 */
function selectionOfReference(
  ctx: HandlerContext,
  ref: string,
  query: string,
): ScopeFilterInput {
  const params = new URLSearchParams(query);
  const plants: string[] = [];
  const products: string[] = [];
  const stated = new Set<string>();

  for (const [name, value] of params) {
    if (stated.has(name)) {
      throw notFoundProblem(
        ctx,
        `The evidence reference ${ref} states the query parameter ${name} more than once, so the population the figure was computed over cannot be read. A composed reference states ${PLANTS_PARAM} and ${PRODUCTS_PARAM} at most once each.`,
      );
    }

    if (name !== PLANTS_PARAM && name !== PRODUCTS_PARAM) {
      throw validationProblem(
        ctx,
        `The evidence reference ${ref} carries the query parameter ${name}, which a composed aggregate reference does not answer. It carries ${PLANTS_PARAM} and ${PRODUCTS_PARAM}, each a comma-separated list present only when the shell's selection names one.`,
      );
    }

    stated.add(name);
    const entries = listOf(ctx, ref, name, value);

    if (name === PLANTS_PARAM) {
      plants.push(...entries);
    } else {
      products.push(...entries);
    }
  }

  const { records } = ctx.state;
  const unknownPlant = plants.find(
    (plantId) => !records.plants.some((plant) => plant.id === plantId),
  );

  if (unknownPlant !== undefined) {
    throw notFoundProblem(
      ctx,
      `The evidence reference ${ref} selects the plant ${unknownPlant}, which the record set does not hold, so the figure it names cannot be computed over the population it states.`,
    );
  }

  const [onlyProduct, ...otherProducts] = products;
  const unknownProduct =
    onlyProduct === undefined || records.products.some((product) => product.id === onlyProduct)
      ? undefined
      : onlyProduct;

  if (unknownProduct !== undefined) {
    throw notFoundProblem(
      ctx,
      `The evidence reference ${ref} selects the product ${unknownProduct}, which the record set does not hold, so the figure it names cannot be computed over the population it states.`,
    );
  }

  if (otherProducts.length > 0) {
    throw notFoundProblem(
      ctx,
      `The evidence reference ${ref} selects more than one product, so the population the figure was computed over cannot be read. The top bar narrows to one product at a time, so a composed reference names at most one ${PRODUCTS_PARAM} entry.`,
    );
  }

  return {
    ...(plants.length === 0 ? {} : { plantIds: plants }),
    ...(onlyProduct === undefined ? {} : { productId: onlyProduct }),
  };
}

/**
 * One list of a reference's selection: comma-separated, each entry trimmed and none of them blank.
 *
 * A trailing separator, a doubled one or a parameter with no value states a list the drawer cannot
 * read. It is refused rather than trimmed: dropping the blank would compute the figure over a
 * population the reference did not name (AAP §0.2.1 F12, PR-6).
 *
 * @param ctx - The call's context, whose state supplies the trace identifier.
 * @param ref - The reference, for the refusal's message.
 * @param name - The parameter the list belongs to.
 * @param value - The parameter's value as the reference stated it.
 * @returns The entries the value names, in the order it names them.
 * @throws Problem - A `'not-found'` failure naming the reference when an entry is blank.
 */
function listOf(ctx: HandlerContext, ref: string, name: string, value: string): string[] {
  const entries = value.split(LIST_SEPARATOR).map((entry) => entry.trim());

  if (entries.some((entry) => entry === '')) {
    throw notFoundProblem(
      ctx,
      `The evidence reference ${ref} states ${name}=${value}, which names no complete list, so the population the figure was computed over cannot be read. A composed selection names an identifier for every entry and states no parameter for a half it does not narrow.`,
    );
  }

  return entries;
}

/**
 * One composed aggregate reference, resolved to the drawer's payload.
 *
 * The payload is the whole answer, because a composed figure's admission is decided where the figure is
 * read rather than by a plant carried back beside it: `aggregateOf` refuses a `plant/<plantId>/…` key the
 * resolved selection carries no row for, and every aggregate read enforces the family's read permission
 * itself, so no single-plant subject survives to narrow a figure the reader's own screen drew (AAP 0.2.1's
 * one-scope rule; see `subjectOf`).
 */
interface AggregateFigure {
  /** The payload the drawer renders. */
  readonly evidence: Evidence;
}

/**
 * The evidence behind one of the overview's own aggregates, quoted from the read's payload.
 *
 * The figure is the member the aggregate read reported; the components are the by-plant rows that read
 * delivered, so a reader sees the rows a total was summed from without this module summing anything.
 * The median is the one member whose components the read does not carry, so its payload states the
 * read's own figure and names no component rather than inventing one. No document is listed: a total
 * is a computation over records rather than a record, and the aggregate read names no document of its
 * own, so the payload reports none rather than a citation borrowed from one of its components.
 *
 * @param overview - The aggregate read's payload.
 * @param root - The root the opened reference carried.
 * @param selection - The selection the reference stated.
 * @param key - The aggregate the reference named.
 * @returns The aggregate's evidence payload.
 */
function overviewAggregateEvidence(
  overview: Overview,
  root: AggregateRoot,
  selection: ScopeFilterInput,
  key: SharedAggregateKey,
  scopePlants: readonly PlantId[],
): Evidence {
  return {
    value: overviewAggregateValue(overview, key, scopePlants),
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula: AGGREGATE_FORMULAS[key],
    inputs: [
      ...aggregateInputs(root, selection),
      ...(key === MEDIAN_HOURS_KEY
        ? [`${MEDIAN_HOURS_KEY} = ${overview.medianHoursToApprovedPlan}`]
        : key === PLANTS_IN_SCOPE_KEY
          ? [`${PLANTS_IN_SCOPE_KEY} = ${scopePlants.join(', ')}`]
          : overview.byPlant.map(plantRowInput)),
    ],
    upstream:
      key === MEDIAN_HOURS_KEY
        ? []
        : key === PLANTS_IN_SCOPE_KEY
          ? [...scopePlants]
          : overview.byPlant.map((row) => row.plantId),
    downstream: copiedByOtherSurface(root, key),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The value one of the overview's aggregates states, with its unit, as the read reports it.
 *
 * A money figure is stated in the interface's one money shape — grouped, with the currency code and at
 * most two decimals, exactly as the tile beside the drawer prints it (contracts §1, AAP §0.8) — the
 * median carries its hours, the plant count its plants and the two exception counts their exceptions,
 * so a drawer's `value` reads as the figure the screen showed rather than as a number without a unit
 * (AAP §0.12.2's `Evidence.value`).
 *
 * The plant count is the resolved scope's own, not the number of by-plant rows: those rows also cover
 * the plants an admitted exception is recorded at, which the selection need not name
 * (`src/domain/aggregation/overview.ts`), and a sentence that counted them would state a number the
 * tile labelled "plants in scope" does not carry.
 *
 * @param overview - The aggregate read's payload.
 * @param key - The aggregate the reference named.
 * @param scopePlants - The plants the resolved scope names.
 * @returns The value sentence.
 */
function overviewAggregateValue(
  overview: Overview,
  key: SharedAggregateKey,
  scopePlants: readonly PlantId[],
): string {
  switch (key) {
    case OPEN_EXCEPTIONS_KEY:
      return `${overview.openExceptions} open exceptions`;
    case REVENUE_AT_RISK_KEY:
      return `${amountText(overview.revenueAtRiskEur)} at risk`;
    case CUSTOMER_ORDERS_AT_RISK_KEY:
      return `${overview.customerOrdersAtRisk} customer orders at risk`;
    case MEDIAN_HOURS_KEY:
      return (
        `${overview.medianHoursToApprovedPlan} hours from detection to an approved plan, ` +
        'unrounded'
      );
    case PLANTS_IN_SCOPE_KEY:
      return `${scopePlants.length} plants in scope`;
  }
}

/**
 * The evidence behind one plant's reading: the count of its open exceptions or the revenue they place
 * at risk, whichever figure the reference names.
 *
 * Both figures are fields of the row the risk-by-plant grouping delivered, so the payload quotes the row
 * and names the contracts §5 rule that produced the figure the reader activated. The row's other figure
 * travels in the inputs beside it, because the two readings of one plant are read together and a drawer
 * that hid one of them would make the pair harder to reconcile than the table the figure came from
 * (principle PR-6).
 *
 * A plant outside the resolved scope has no row, and `aggregateOf` refuses that reference before this
 * payload is built, so the row here is always one the read carried (AAP 0.2.1's one scope resolver).
 *
 * @param records - The session's record set, for the documents citing the plant.
 * @param row - The by-plant row the read delivered.
 * @param reading - Which of the row's two figures the reference names.
 * @param root - The root the opened reference carried.
 * @param selection - The selection the reference stated.
 * @returns The plant reading's evidence payload.
 */
function plantRowEvidence(
  records: SeedRecordSet,
  row: PlantRiskRow,
  reading: PlantReading,
  root: AggregateRoot,
  selection: ScopeFilterInput,
): Evidence {
  const revenue = reading === REVENUE_AT_RISK_KEY;

  return {
    value: revenue
      ? `${amountText(row.revenueAtRiskEur)} at risk at ${row.plantName}`
      : `${row.openExceptions} open exceptions at ${row.plantName}`,
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula: revenue
      ? "One plant's revenue at risk is the sum, over the open exceptions the grouping places at that " +
        'plant, of the revenue each exception puts on its affected lines — the units at risk multiplied ' +
        "by the product price, rounded half up to two decimals (contracts §5). The figure is the " +
        "overview aggregate read's own output: this payload quotes it and recomputes nothing."
      : "One plant's open-exceptions count is the number of in-scope exceptions that are still open and " +
        "that the risk-by-plant grouping places at that plant (contracts §5's by-plant aggregate). The " +
        "figure is the overview aggregate read's own output: this payload quotes it and recomputes " +
        'nothing.',
    inputs: [...aggregateInputs(root, selection), plantRowInput(row)],
    upstream: [row.plantId],
    downstream: [],
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, row.plantId),
  };
}

/**
 * The noun a count of exceptions is stated with, so a sentence the service composes agrees with its
 * own figure.
 *
 * A count of one reads `1 exception` and every other count reads `2 exceptions`: a drawer that said
 * "1 exceptions" would misreport a figure the reader is about to reconcile with the chart it came
 * from. The inflection is one word, so it is decided here rather than through a formatting library.
 *
 * @param count - The count the sentence states.
 * @returns `'exception'` for exactly one, and `'exceptions'` for every other count.
 */
function exceptionNoun(count: number): string {
  return count === 1 ? 'exception' : 'exceptions';
}

/**
 * The evidence behind one day of the opened-and-resolved series: the two counts the point carries.
 *
 * The point is the read's own, so both counts are stated even when the reference names one of them:
 * a reader comparing an opened count with the resolved count of the same day is reading one record of
 * the series, and the payload would otherwise hide half of it (contracts §5's open-and-resolved
 * series).
 *
 * @param point - The series point the read delivered.
 * @param series - Which of the point's two readings the reference names.
 * @param root - The root the opened reference carried.
 * @param selection - The selection the reference stated.
 * @returns The day's evidence payload.
 */
function dayPointEvidence(
  point: DailyCountPoint,
  series: 'open' | 'resolved',
  root: AggregateRoot,
  selection: ScopeFilterInput,
): Evidence {
  const figure = series === DAY_OPEN_READING ? point.open : point.resolved;
  const noun = exceptionNoun(figure);

  return {
    value:
      series === DAY_OPEN_READING
        ? `${figure} ${noun} opened on ${point.date}`
        : `${figure} ${noun} resolved on ${point.date}`,
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula:
      'The opened count of a day is the number of in-scope exceptions whose record dates its ' +
      "detection to that calendar day, and the resolved count is the number of the activity trail's " +
      "resolved records dated to it (contracts §5's open-and-resolved series). The figure is the " +
      "overview aggregate read's own output: this payload quotes it and recomputes nothing.",
    inputs: [
      ...aggregateInputs(root, selection),
      `date = ${point.date}`,
      `open = ${point.open}`,
      `resolved = ${point.resolved}`,
    ],
    upstream: [],
    downstream: [],
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The evidence behind the ribbon's critical-exceptions tile, quoted from the ribbon read.
 *
 * Only `getCanvasRibbon` counts critical rows, so this one key is answered from that read whichever
 * root composed the reference: the other five the ribbon draws are the overview's own figures copied
 * across, and reading them twice would be a second derivation of one number.
 *
 * @param ctx - The call's context: the records, the persona and the trace identifier.
 * @param ref - The reference, for the refusal's message.
 * @param root - The root the opened reference carried.
 * @param selection - The selection the reference stated.
 * @returns The tile's evidence payload.
 * @throws Problem - `'not-found'` when the ribbon carries no critical tile, which the aggregate
 *   never omits; `` `'permission'` `` when the persona may not read the exception family.
 */
async function criticalExceptionsEvidence(
  ctx: HandlerContext,
  ref: string,
  root: AggregateRoot,
  selection: ScopeFilterInput,
): Promise<Evidence> {
  const tiles = await getCanvasRibbon(ctx, selection);
  const tile = tiles.find((candidate) => candidate.id === CRITICAL_EXCEPTIONS_KEY);

  if (tile === undefined) {
    throw notFoundProblem(
      ctx,
      `The canvas ribbon carries no ${CRITICAL_EXCEPTIONS_KEY} tile, so the figure behind ${ref} cannot be resolved.`,
    );
  }

  return {
    value: `${tile.value} critical exceptions`,
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula: AGGREGATE_FORMULAS[CRITICAL_EXCEPTIONS_KEY],
    inputs: [...aggregateInputs(root, selection), `tile ${tile.id} = ${tile.value}`],
    upstream: [],
    downstream: [],
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The figure one composed reference names, read from the aggregate that computes it.
 *
 * The selection travels to the aggregate read itself, so `resolveScope` narrows the drawer's figure
 * exactly as it narrowed the screen's, and the figure is the read's own output rather than a second
 * computation of it (contracts §5, rule P-6). A plant key the read's grouping does not carry and a
 * date its series does not hold are refused as `'not-found'` naming the reference: the subject asked
 * for is outside the scope or outside the series, and neither a neighbouring row nor a zero would be
 * the figure the reference names.
 *
 * @param ctx - The call's context: the records, the persona and the trace identifier.
 * @param composed - The root the reference carried, and its remainder.
 * @param key - The key the reference named.
 * @param selection - The selection the reference stated.
 * @param ref - The reference, for the refusals' messages.
 * @returns The payload the figure the reference names resolves to.
 * @throws Problem - `'not-found'` when the key names a subject the read does not carry;
 *   `'permission'` when the persona may not read the family the aggregate belongs to.
 */
async function aggregateOf(
  ctx: HandlerContext,
  composed: ComposedReference,
  key: AggregateKey,
  selection: ScopeFilterInput,
  ref: string,
): Promise<AggregateFigure> {
  switch (key.kind) {
    case 'aggregate': {
      if (key.key === CRITICAL_EXCEPTIONS_KEY) {
        return {
          evidence: await criticalExceptionsEvidence(ctx, ref, composed.root, selection),
        };
      }

      const overview = await getOverview(ctx, selection);

      return {
        evidence: overviewAggregateEvidence(
          overview,
          composed.root,
          selection,
          key.key,
          resolveScope(selection, ctx.actor.role).plants,
        ),
      };
    }

    case 'plant': {
      const overview = await getOverview(ctx, selection);
      const row = overview.byPlant.find((candidate) => candidate.plantId === key.plantId);

      if (row === undefined) {
        throw notFoundProblem(
          ctx,
          `The overview carries no risk-by-plant row for ${key.plantId} under the selection the reference ${ref} states, so the figure behind it cannot be resolved.`,
        );
      }

      return {
        evidence: plantRowEvidence(ctx.state.records, row, key.reading, composed.root, selection),
      };
    }

    case 'day': {
      const overview = await getOverview(ctx, selection);
      const point = overview.openResolvedSeries.find((candidate) => candidate.date === key.date);

      if (point === undefined) {
        throw notFoundProblem(
          ctx,
          `The overview's opened-and-resolved series holds no day ${key.date} under the selection the reference ${ref} states, so the figure behind it cannot be resolved.`,
        );
      }

      return {
        evidence: dayPointEvidence(point, key.series, composed.root, selection),
      };
    }
  }
}

/**
 * Resolves one composed aggregate reference to the payload the drawer renders.
 *
 * The reference is split at its first `?` so a key never carries its query, the selection is parsed
 * before the figure is read — an unknown parameter is refused before any aggregate runs — and the
 * figure is then read from the aggregate that computes it (see `aggregateOf`).
 *
 * @param ctx - The call's context: the records, the persona and the trace identifier.
 * @param ref - The reference the displayed element carries.
 * @param composed - The root the reference carried, and its remainder.
 * @returns The resolved family member.
 * @throws Problem - `'validation'` for a query parameter the grammar does not carry, `'not-found'`
 *   for a key or a subject the read does not answer, `'permission'` when the persona may not read the
 *   family the aggregate belongs to.
 */
async function resolveComposed(
  ctx: HandlerContext,
  ref: string,
  composed: ComposedReference,
): Promise<ResolvedRef> {
  const queryAt = composed.rest.indexOf('?');
  const keyText = queryAt < 0 ? composed.rest : composed.rest.slice(0, queryAt);
  const query = queryAt < 0 ? '' : composed.rest.slice(queryAt + 1);
  const selection = selectionOfReference(ctx, ref, query);
  const key = aggregateKeyOf(ctx, ref, keyText);

  return { family: 'aggregate', figure: await aggregateOf(ctx, composed, key, selection, ref) };
}

/* ---------------------------------------------------------------------------------------------
 * One reference, resolved to the record that answers it — AAP 0.12.3, contracts §1
 * ------------------------------------------------------------------------------------------- */

/**
 * One radar reading: the axis a vertex sits on and the score the series records there.
 *
 * Resolved with the series rather than derived by the payload builder, because the axis the reference
 * names must be one of the pack's own and the score must be the record's own: a reference asking for a
 * reading the pack does not hold is refused as `'not-found'`, so a payload never states a figure the
 * record never carried.
 */
interface RadarReading {
  /** The axis the reading sits on, one of the pack's five. */
  readonly axis: RadarAxis;

  /** The score the series records on that axis, as the record states it. */
  readonly score: number;
}

/**
 * The one figure a fragment names inside an approval record.
 *
 * Two kinds, because SCR-05 prints two kinds of figure off that one record: the euro members the
 * approval states itself, and one measure of the comparison `getApprovalOutcome` measures for it. A
 * compared figure carries the levers of the solve it was read from, so the payload states which
 * measurement it reports — the plan's own levers for the `planned` column, the levers the change
 * reached for `resulting` — without a second read of the comparison.
 */
type ApprovalFigure =
  | {
      readonly kind: 'record-member';
      readonly member: ApprovalMoneyMember;
      readonly amount: number;
    }
  | {
      readonly kind: 'outcome-measure';
      readonly column: OutcomeColumn;
      readonly member: OutcomeMeasureKey;
      readonly value: number;
      readonly levers: Levers;
    }
  | {
      readonly kind: 'outcome-series';
      readonly column: OutcomeColumn;
      readonly date: IsoDate;
      readonly units: number;
      readonly levers: Levers;
    };

/**
 * The record an evidence reference resolved to.
 *
 * A discriminated union over the families the resolution order names, so the payload builder below can
 * switch over the family and the compiler proves every family is handled: a family added to the union
 * without a builder case does not compile. The record is the session's own record by reference, read
 * and never modified here; the composed aggregate family carries the payload its own read produced,
 * because the figure it names is an aggregate's output rather than a record's field; the approval
 * family's fragment carries the figure the reference named, which the record's members do not state
 * on their own; and the atlas families carry what the record alone cannot answer — the network a
 * competitor's site belongs to, and the one axis a radar reference named — both resolved here so the
 * builders below stay total.
 */
type ResolvedRef =
  | { readonly family: 'aggregate'; readonly figure: AggregateFigure }
  | {
      readonly family: 'write-back';
      readonly owner: Approval | Scenario;
      readonly ownerId: string;
      readonly step: WriteBack;
    }
  | {
      readonly family: 'atlas-series';
      readonly series: AtlasSeries;
      readonly axes: readonly RadarAxis[];
    }
  | { readonly family: 'package'; readonly record: PpapPackage }
  | { readonly family: 'exception'; readonly record: OperationalException }
  | { readonly family: 'scenario'; readonly record: Scenario }
  | { readonly family: 'approval'; readonly record: Approval }
  | {
      readonly family: 'approval-figure';
      readonly record: Approval;
      readonly figure: ApprovalFigure;
    }
  | { readonly family: 'audit-event'; readonly record: AuditEvent }
  | { readonly family: 'pin'; readonly record: EvidencePin }
  | { readonly family: 'document'; readonly record: DocumentBody }
  | { readonly family: 'customer-order'; readonly record: CustomerOrder }
  | { readonly family: 'purchase-order'; readonly record: PurchaseOrder }
  | { readonly family: 'chokepoint'; readonly record: ChokepointRecord }
  | {
      readonly family: 'competitor-site';
      readonly record: AtlasSite;
      readonly network: CompetitorNetwork;
    }
  | { readonly family: 'competitor-network'; readonly record: CompetitorNetwork }
  | {
      readonly family: 'radar-series';
      readonly record: AtlasSeries;
      readonly reading: RadarReading | null;
    }
  | { readonly family: 'policy'; readonly record: SeededPolicy }
  | { readonly family: 'plant'; readonly record: Plant }
  | { readonly family: 'supplier'; readonly record: Supplier }
  | { readonly family: 'origin'; readonly record: Origin }
  | { readonly family: 'customer'; readonly record: Customer }
  | { readonly family: 'material'; readonly record: Material }
  | { readonly family: 'line'; readonly record: Line }
  | { readonly family: 'product'; readonly record: Product }
  | {
      readonly family: 'outbound-endpoint';
      readonly record: SeedRecordSet['sovereignty']['ledger'][number];
    };

/**
 * Whether a resolved record belongs to the simulated market-intelligence pack.
 *
 * The four families the atlas read publishes are the ones the `competitive.read` check narrows; the
 * client's own plant is a first-party record and is narrowed by its plant scope instead.
 *
 * @param resolved - The record the reference named.
 * @returns `true` for a crossing, a competitor's site or network, or a radar reading.
 */
function isPackFamily(resolved: ResolvedRef): boolean {
  return (
    resolved.family === 'chokepoint' ||
    resolved.family === 'competitor-site' ||
    resolved.family === 'competitor-network' ||
    resolved.family === 'radar-series'
  );
}

/**
 * The four of the canvas's five node families whose plant scope the records decide rather than a
 * single plant on the record: a plant, a supplier, a tier-2 origin and a customer.
 *
 * The fifth family, a material, names no plant at all, so `subjectOf` returns `null` for it and the
 * permission alone decides whether its evidence is readable.
 *
 * Separated from the union so the reach check and the payload builder can take a node and nothing
 * else: a node's plant scope is decided over every plant the records place it in, which no other
 * family needs, and the compiler then proves the two node-only helpers are never handed a record that
 * is plant-scoped by a single plant.
 */
type NodeRef = Extract<
  ResolvedRef,
  { readonly family: 'plant' | 'supplier' | 'origin' | 'customer' }
>;

/**
 * The four arms of {@link ResolvedRef} whose plants are the plants of one exception.
 *
 * Separated from the union for the reason {@link NodeRef} is: an exception, a scenario that answers one,
 * an approval of one and a step of a plan's write-back are admitted over every plant that exception
 * touches through `alsoAffectsPlantIds`, which no other family needs, and the compiler then proves
 * `assertExceptionReach` is never handed a record of another family and no other family is narrowed by
 * an exception's reach.
 */
type ExceptionRef = Extract<
  ResolvedRef,
  { readonly family: 'exception' | 'scenario' | 'approval' | 'approval-figure' | 'write-back' }
>;

/**
 * The three arms of {@link ResolvedRef} whose own read is a different read of this adapter.
 *
 * An audit event, a policy and an outbound endpoint name no plant of their own — the trail is the
 * session's whole chain, and the policy set and the declared configuration are group-wide by
 * construction (see `subjectOf`) — but each record class belongs to a read this module does not own: the
 * trail is `./audit.ts`'s, and the policies and the ledger are `./governance.ts`'s. Separated from the
 * union for the reason {@link NodeRef} is: the permission these three are gated on is not the family's
 * own read permission, which no other family needs, and the compiler then proves that gate is never
 * applied to a record of another family.
 */
type FamilyWithOwnRead = Extract<
  ResolvedRef,
  { readonly family: 'audit-event' | 'policy' | 'outbound-endpoint' }
>;

/**
 * The one arm of {@link ResolvedRef} that stands for a step of a plan's simulated write-back.
 *
 * Separated from the union so the payload builder takes a step and nothing else: a step's evidence is
 * read from the record that holds the plan and from the step's own members, which no other family
 * needs, and the compiler then proves the builder is never handed a record that carries no step.
 */
type WriteBackStepRef = Extract<ResolvedRef, { readonly family: 'write-back' }>;

/**
 * The option a `SCN-` identifier names, read from the two places the records state one.
 *
 * The sets the dataset ships are scanned first, so a shipped option answers with the record the dataset
 * holds rather than with a measurement of the same position. The sets the adapter measures at call time
 * — the comparison screen's columns, the options the sandbox duplicates, and the option the
 * recommended plan of the case belongs to, none of which a shipped record holds — are answered second,
 * by `scenarioForReference` in the sibling `handlers/scenarios.ts`, the module that produces them for a
 * screen. Both are exact-identifier lookups: neither searches for a prefix or a neighbour.
 *
 * The scan and the measured lookup are one function because two references name an option — a bare
 * `SCN-` identifier and the owner of a `write-back:` reference — and the option one path answers has to
 * be the option the other answers, or the drawer behind an option and the drawer behind its own steps
 * would describe two different records.
 *
 * The second lookup is what makes an option a screen shows answerable at all: an option a screen shows
 * is either a record the dataset ships or one the adapter measures from an exception's own solver case,
 * and without the measured answer every comparison column of the measured exception — the case AAP 0.7
 * and AAP 0.8 fix, and the option the sandbox duplicates — would open the drawer's failure region
 * instead of its four sections (AAP 0.12.4, principle PR-6).
 *
 * @param ctx - The call's context, whose records state the option sets. The state is not modified.
 * @param scenarioId - The identifier the reference names.
 * @returns The option that identifier names, or `undefined` when no set states one.
 */
function scenarioForIdentifier(ctx: HandlerContext, scenarioId: string): Scenario | undefined {
  for (const seeded of ctx.state.records.exceptionScenarios) {
    const found = seeded.scenarioSet.scenarios.find((candidate) => candidate.id === scenarioId);

    if (found !== undefined) {
      return found;
    }
  }

  return scenarioForReference(ctx, scenarioId);
}

/**
 * Whether a write-back's owner is an approval rather than a response option.
 *
 * The two records share the members this family reads — the identifier, the exception the plan answers
 * and the steps themselves — so the member only one of them carries is what tells them apart: an
 * approval states where the plan stands, an option states the measures it was chosen on, and the two
 * reach different neighbouring records (see `writeBackStepEvidence`).
 *
 * @param owner - The record the steps belong to.
 * @returns `true` when the owner is an approval.
 */
function isApprovalOwner(owner: Approval | Scenario): owner is Approval {
  return 'status' in owner;
}

/**
 * The record a `write-back:` reference's owner names — an approval or an option — or nothing.
 *
 * The owner is resolved the way its own family resolves it: an `APR-` identifier is an exact lookup
 * among the approvals the session holds, and an `SCN-` identifier is answered by
 * `scenarioForIdentifier`, so a shipped option and one measured at call time both resolve. An
 * identifier under neither prefix is no owner at all and answers `undefined`, which the caller refuses.
 *
 * @param ctx - The call's context, whose records are searched. The state is not modified.
 * @param ownerId - The owner the reference names.
 * @returns The approval or option that identifier names, or `undefined` when none does.
 */
function writeBackOwner(ctx: HandlerContext, ownerId: string): Approval | Scenario | undefined {
  if (ownerId.startsWith(APPROVAL_PREFIX)) {
    return ctx.state.records.approvals.find((candidate) => candidate.id === ownerId);
  }

  if (ownerId.startsWith(SCENARIO_PREFIX)) {
    return scenarioForIdentifier(ctx, ownerId);
  }

  return undefined;
}

/**
 * The owner identifier and the step position a `write-back:` reference states.
 *
 * SCR-05's post-approval tracker and SCR-04's write-back preview draw the steps a plan would write, and
 * each step is a figure of its own — a record in a named system of record, in a state the run reached —
 * so each opens the evidence behind itself rather than the plan's (principle PR-6, AAP 0.2.2).
 * Contracts §3 gives `WriteBack` no identifier, which is why the reference names the record the steps
 * belong to and the step's position within that record: `write-back:<ownerId>/<sequence>`.
 *
 * The reference is read against the grammar a refusal quotes rather than repaired: an owner has to be
 * named, the reference has to carry exactly one position after it, and that position has to have the
 * shape {@link STEP_POSITION_PATTERN} fixes. A reference failing any of those is refused as
 * `'validation'`, because the caller composed a reference this family does not have — as distinct from
 * a well-formed reference whose owner or step the records do not hold, which is the `'not-found'`
 * refusal {@link resolveWriteBackRef} states.
 *
 * @param ctx - The call's context, whose correlation identifier the failure carries.
 * @param ref - The reference the displayed step carries.
 * @returns The owner identifier the reference names and the step position it states.
 * @throws Problem - A `'validation'` failure naming the `write-back:<ownerId>/<sequence>` grammar.
 */
function writeBackPartsOf(
  ctx: HandlerContext,
  ref: string,
): { readonly ownerId: string; readonly sequence: number } {
  const parts = ref.slice(WRITE_BACK_REF_PREFIX.length).split(KEY_SEPARATOR);
  const ownerId = parts[0] ?? '';
  const positionText = parts[1] ?? '';

  if (ownerId.trim() === '' || !STEP_POSITION_PATTERN.test(positionText) || parts.length !== 2) {
    throw validationProblem(
      ctx,
      `The reference "${ref}" is not a write-back step reference. A write-back step is named ` +
        `${WRITE_BACK_REF_GRAMMAR}, where the owner is an approval or a response option and the ` +
        "sequence is the step's own position in that write-back, counted from one.",
    );
  }

  return { ownerId, sequence: Number(positionText) };
}

/**
 * Resolves a `write-back:` reference to the step it names and the record that holds it.
 *
 * The reference is parsed first, so one the family does not state is refused as `'validation'` before
 * any record is looked at; the owner is resolved second, so an identifier neither an approval nor an
 * option answers is refused as `'not-found'` naming that owner; and the position is read last, against
 * the steps the record itself holds, so a position the plan does not hold is refused as `'not-found'`
 * naming the position and listing the sequences the record does state. That list is what a reader needs
 * to address a step correctly instead of guessing at one.
 *
 * The steps are the record's own array and the one found is returned by reference, so the payload built
 * from it reports the state the record stands in at the instant of the read: a step a retry has since
 * moved reads in its new state rather than in the state a screen drew it in.
 *
 * @param ctx - The call's context, whose records hold the plan and the option.
 * @param ref - The reference the displayed step carries.
 * @returns The family, the record the steps belong to and the step the reference names.
 * @throws Problem - A `'validation'` failure naming the grammar, or a `'not-found'` failure naming the
 *   owner or the position that the records do not hold.
 */
function resolveWriteBackRef(ctx: HandlerContext, ref: string): WriteBackStepRef {
  const { ownerId, sequence } = writeBackPartsOf(ctx, ref);
  const owner = writeBackOwner(ctx, ownerId);

  if (owner === undefined) {
    throw notFoundProblem(
      ctx,
      `The record set holds no approval and no response option with the identifier ${ownerId}, so no ` +
        `write-back step of it can be resolved. The reference ${ref} names the steps of a record as ` +
        `${WRITE_BACK_REF_GRAMMAR}.`,
    );
  }

  const step = owner.writeBacks.find((candidate) => candidate.sequence === sequence);

  if (step === undefined) {
    const held = owner.writeBacks.map((candidate) => candidate.sequence).join(', ');

    throw notFoundProblem(
      ctx,
      `The write-back of ${ownerId} holds no step at position ${sequence}: the steps it holds are ` +
        `${held === '' ? 'none at all, so the plan writes nothing back' : held}.`,
    );
  }

  return { family: 'write-back', owner, ownerId, step };
}

/**
 * Resolves one reference to the record that answers it, in the order the walk below states.
 *
 * The root or the prefix selects the family and that family's own records are then searched for the
 * exact identifier, so a reference either names a record the session holds or is refused. There is no
 * fuzzy match, no prefix search over the records and no fall-back to "the first record": a drawer that
 * silently showed a neighbouring figure would be worse than one that reports the reference it could
 * not resolve. The order is — composed aggregate, write-back step, atlas series, package, exception,
 * scenario, approval, audit event, pin, document, customer order, policy, purchase order, shared
 * chokepoint, competitor site and network, radar series reading, then the seven node families and the
 * declared outbound endpoint — and it is written out here rather than derived from a table so a
 * reader can see it. `PPAP-` is tested first among the record families because a package identifier
 * begins with the two letters a purchase order's begins with, and a shorter prefix tested first would
 * shadow it; `POL-` is tested before the shorter `PO-` for the same longer-prefix-first reason, and the
 * two cannot actually collide, because a policy identifier's third character is a letter where a
 * purchase order's is the separator. The composed roots and the write-back root are tested before every
 * prefix because `overview:`, `canvas:` and `write-back:` match none of them, and the endpoint family is
 * tested once every prefix branch has declined the reference, so no prefix can shadow an endpoint and no
 * endpoint can be read as an identifier.
 *
 * THE TWO FAMILIES SCR-07 OPENS ITS FIGURES FROM NAME THEMSELVES. A policy is named by its own `POL-`
 * identifier, and an outbound endpoint by the exact endpoint string the declared configuration gives
 * it, which is that ledger row's own key. Neither `LedgerRow` nor `Evidence` is widened from a handler
 * to carry a reference, because contracts §3 fixes their members, so these are the two families
 * selected by a value the record already states — and the endpoint family is the one of them with no
 * prefix at all.
 *
 * Two families resolve more than one record. A `CMP-` reference is looked up as a site across the
 * pack's networks first and as a network second, so a site identifier answers with the network that
 * owns it as well. A radar reference is split at its `#`: the series is looked up either way, and the
 * axis is then looked up among the pack's own axes and read at the position that list gives it, because
 * `AtlasSeries.values` is aligned to the axis order and carries no axis name of its own.
 *
 * The scenario family is the one family whose records are not all in one list. `scenarioForIdentifier`
 * holds that pair of lookups: it scans the options the dataset ships in place, then answers the options
 * measured from an exception's own solver case through `scenarioForReference` in the sibling
 * `handlers/scenarios.ts` — the module that produces that set for the comparison screen — and it is
 * called from here and from the write-back family's owner resolution alike, so a shipped option and a
 * measured one answer the same way whichever reference reaches them. Both are exact-identifier lookups,
 * and neither searches for a prefix or a neighbour.
 *
 * THE WRITE-BACK FAMILY NAMES A STEP, NOT A RECORD. `WriteBack` declares no identifier, so
 * `write-back:<ownerId>/<sequence>` names the record the steps belong to — an approval or a response
 * option — and the step's own position within it, and `resolveWriteBackRef` states the parse, the owner
 * lookup and the position refusal it needs. Its refusals are the two this family already has: a
 * reference the grammar does not state is `'validation'`, and an owner or position the records do not
 * hold is `'not-found'`.
 *
 * The messages of the refusals quote the reference the caller sent, never a neighbour's identifier:
 * an unresolvable drawer reports what it could not resolve.
 *
 * The approval family is the one family whose reference may carry a fragment. `<approval id>` alone is
 * the record's own payload, and `<approval id>#<fragment>` names one figure inside it, which
 * `approvalFigureOf` parses and documents the grammar of. The approval is resolved either way, so the
 * plant scope and the permission check `getEvidence` applies to a figure are the ones its record gets.
 *
 * The function is asynchronous because a composed aggregate reference and an approval's compared
 * figure are answered by re-reading the read that computes them; every other family resolves from the
 * records already in hand.
 *
 * @param ctx - The call's context, whose records are searched and whose trace the failure carries.
 * @param ref - The reference the displayed element carries.
 * @returns The family and the record it names, or the composed figure's own payload.
 * @throws Problem - A `'not-found'` failure naming the reference when no record answers it, a
 *   `'validation'` failure naming a query parameter a composed reference cannot carry or a write-back
 *   form the grammar does not state, or the failure the aggregate read itself raises for a figure it
 *   may not serve.
 */
async function resolveRef(ctx: HandlerContext, ref: string): Promise<ResolvedRef> {
  const records = ctx.state.records;
  const composed = composedReferenceOf(ref);

  if (composed !== null) {
    return resolveComposed(ctx, ref, composed);
  }

  /* The write-back family's root carries the same `:` separator the composed roots do and matches no
     identifier prefix, so it is read here — before `atlas:` and before every prefix branch — rather
     than left to the prefix walk to decline. */
  if (ref.startsWith(WRITE_BACK_REF_PREFIX)) {
    return resolveWriteBackRef(ctx, ref);
  }

  if (ref.startsWith(ATLAS_SERIES_PREFIX)) {
    return resolveAtlasSeries(ctx, ref);
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
    // The sets the dataset ships first, and then the sets the adapter measures at call time, which
    // are the comparison screen's columns and the options the sandbox duplicates: no shipped record
    // holds those, so the scan alone would leave the figure behind such a reference reaching no record
    // at all (AAP 0.12.4, F12). `scenarioForIdentifier` is that pair of lookups, in that order, so the
    // owner of a write-back resolves the way the option itself does.
    const found = scenarioForIdentifier(ctx, ref);

    if (found !== undefined) {
      return { family: 'scenario', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no scenario with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(APPROVAL_PREFIX)) {
    const separatorAt = ref.indexOf(AXIS_SEPARATOR);
    const approvalId = separatorAt < 0 ? ref : ref.slice(0, separatorAt);
    const fragment = separatorAt < 0 ? null : ref.slice(separatorAt + AXIS_SEPARATOR.length);
    const found = records.approvals.find((candidate) => candidate.id === approvalId);

    if (found === undefined) {
      throw notFoundProblem(
        ctx,
        `The record set holds no approval with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
      );
    }

    // No fragment means no figure inside the record is named, so the reference resolves over the
    // role's whole scope and answers the record's own payload.
    if (fragment === null) {
      return { family: 'approval', record: found };
    }

    // A fragment names one figure inside the record, in the grammar `approvalFigureOf` states, and
    // the record stays the resolved record so the plant scope and the permission check are unchanged.
    return {
      family: 'approval-figure',
      record: found,
      figure: await approvalFigureOf(ctx, found, ref, fragment),
    };
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

  if (ref.startsWith(POLICY_PREFIX)) {
    const found = records.policies.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'policy', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The policy set holds no policy with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
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

  /*
   * The atlas families the SCR-13 marks carry — AAP 0.2.1 F12, AAP 0.12.4. The competitive atlas
   * draws one mark per radar reading, per site and per shared crossing, and every one of them opens the
   * record behind it, so this walk resolves four further families beside the composed `atlas:` series:
   * `CHK-nn`, one crossing of the simulated market-intelligence pack; `CMP-nn-Sn`, a competitor's
   * site, and `CMP-nn`, the network that owns it; `SER-…`, one radar reading, written `<series id>` for
   * the whole series or `<series id>#<axis id>` for the single score a vertex draws; and `PLT-…`, one
   * of the client's own plants, which the plant family below resolves because it is an ordinary plant
   * record. The pack is not plant-scoped and is not reachable without its own permission (rule P-5,
   * AAP 0.8): a crossing, a competitor's site or network and a radar reading carry no plant subject,
   * so `subjectOf` narrows none of them and `assertPackReach` decides them, because a reference must
   * not reach a record the corresponding list read would have withheld. A `#` naming no axis of the
   * pack, a series the pack does not hold and a series carrying no score at the axis it was asked for
   * are all refused as `'not-found'` naming the reference.
   */

  if (ref.startsWith(CHOKEPOINT_PREFIX)) {
    const found = records.marketIntelligence.chokepoints.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'chokepoint', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The simulated market-intelligence pack holds no shared chokepoint with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(COMPETITOR_PREFIX)) {
    const pack = records.marketIntelligence;

    for (const network of pack.competitors) {
      const site = network.sites.find((candidate) => candidate.id === ref);

      if (site !== undefined) {
        return { family: 'competitor-site', record: site, network };
      }
    }

    const network = pack.competitors.find((candidate) => candidate.competitorId === ref);

    if (network !== undefined) {
      return { family: 'competitor-network', record: network };
    }

    throw notFoundProblem(
      ctx,
      `The simulated market-intelligence pack holds no competitor site and no competitor network with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(SERIES_PREFIX)) {
    const pack = records.marketIntelligence;
    const [seriesId, axisId] = ref.split(AXIS_SEPARATOR);
    const series = pack.radarSeries.find((candidate) => candidate.id === seriesId);

    if (series === undefined) {
      throw notFoundProblem(
        ctx,
        `The simulated market-intelligence pack holds no radar series in the reference ${ref}, so the reading behind it cannot be resolved.`,
      );
    }

    if (axisId === undefined) {
      return { family: 'radar-series', record: series, reading: null };
    }

    const position = pack.radarAxes.findIndex((candidate) => candidate.id === axisId);
    const axis = pack.radarAxes[position];

    if (axis === undefined) {
      throw notFoundProblem(
        ctx,
        `The simulated market-intelligence pack records no radar axis in the reference ${ref}, so the reading behind it cannot be resolved. The axes it records are ${pack.radarAxes.map((candidate) => candidate.id).join(', ')}.`,
      );
    }

    const score = series.values[position];

    if (score === undefined) {
      throw notFoundProblem(
        ctx,
        `The radar series of the reference ${ref} records no score on axis ${axis.id}, so the reading behind it cannot be resolved.`,
      );
    }

    return { family: 'radar-series', record: series, reading: { axis, score } };
  }

  /*
   * The node families. These identifiers are the records' own — `TopologyNode.id` and
   * `ImpactChainNode.ref` carry them unchanged — so each family is looked up exactly as the nine above
   * are, with no second identifier scheme and no node-to-record table.
   */

  if (ref.startsWith(PLANT_PREFIX)) {
    const found = records.plants.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'plant', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no plant with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(SUPPLIER_PREFIX)) {
    const found = records.suppliers.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'supplier', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no supplier with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(ORIGIN_PREFIX)) {
    const found = records.origins.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'origin', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no origin with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(CUSTOMER_PREFIX)) {
    const found = records.customers.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'customer', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no customer with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(MATERIAL_PREFIX)) {
    const found = records.materials.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'material', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no material with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(LINE_PREFIX)) {
    const found = records.lines.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'line', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no production line with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  if (ref.startsWith(PRODUCT_PREFIX)) {
    const found = records.products.find((candidate) => candidate.id === ref);

    if (found !== undefined) {
      return { family: 'product', record: found };
    }

    throw notFoundProblem(
      ctx,
      `The record set holds no product with the identifier ${ref}, so the evidence behind it cannot be resolved.`,
    );
  }

  const endpoint = records.sovereignty.ledger.find((candidate) => candidate.endpoint === ref);

  if (endpoint !== undefined) {
    return { family: 'outbound-endpoint', record: endpoint };
  }

  throw notFoundProblem(
    ctx,
    `The deployment record declares no outbound endpoint named ${ref}, so the evidence behind it cannot be resolved. No record family answers the reference ${ref}. A reference names a package, an exception, a scenario, an approval, an audit event, an evidence pin, a document, a customer order, a purchase order, a policy, an outbound endpoint, a shared chokepoint, a competitor site or network, a radar series reading, a plant, a supplier, a tier-2 origin, a customer, a material, a production line or a product; or it names a computed figure as ${OVERVIEW_REF_ROOT}:<key> or ${CANVAS_REF_ROOT}:<key>, one radar series as ${ATLAS_SERIES_PREFIX}<seriesId>, one figure inside an approval as ${APPROVAL_PREFIX}<approval id>${AXIS_SEPARATOR}<member>, or one step of a plan's write-back as ${WRITE_BACK_REF_GRAMMAR}.`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The figure a fragment names inside a record — AAP 0.12.2 `Evidence.value`, rule P-6
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether a fragment names one of the approval record's own euro members.
 *
 * @param value - The fragment the reference carried.
 * @returns `true` for `addedCostEur` or `protectedRevenueEur`.
 */
function isApprovalMoneyMember(value: string): value is ApprovalMoneyMember {
  return APPROVAL_MONEY_MEMBERS.some((member) => member === value);
}

/**
 * Whether a fragment names the plan's column of the post-approval comparison.
 *
 * @param value - The fragment's column.
 * @returns `true` for `planned` or `resulting`.
 */
function isOutcomeColumn(value: string): value is OutcomeColumn {
  return value === PLANNED_COLUMN || value === RESULTING_COLUMN;
}

/**
 * Whether a fragment names one of the measures the outcome card compares.
 *
 * @param value - The fragment's member.
 * @returns `true` for one of the seven `SolverResult` scalars.
 */
function isOutcomeMeasureKey(value: string): value is OutcomeMeasureKey {
  return OUTCOME_MEASURE_MEMBERS.some((member) => member === value);
}

/**
 * Whether a compared measure is stated in euro.
 *
 * The two `*Eur` members of `SolverResult` are quoted through `amountText` with their currency; the
 * other five are counts and are stated as the number the solver rounded (contracts §3).
 *
 * @param member - The measure the figure names.
 * @returns `true` for `addedCostEur` and `revenueDelayedEur`.
 */
function isMoneyMeasure(member: OutcomeMeasureKey): boolean {
  return member === 'addedCostEur' || member === 'revenueDelayedEur';
}

/**
 * Reads the one figure an approval reference's fragment names, and states the fragment grammar.
 *
 * SCR-05 prints two amounts off the approval record, seven measures of the comparison the approval was
 * measured from and one reading per date of that comparison's closing-stock series, and every one of
 * those figures opens its own evidence, so the family reads a fragment after the record's identifier:
 * `<approval id>#<member>` names one of the record's own euro members (`addedCostEur`,
 * `protectedRevenueEur`); `<approval id>#<column>.<member>` names one measure of the post-approval
 * comparison, where the column is `planned` or `resulting` and the member is one of the seven
 * `SolverResult` scalars the outcome card compares; and
 * `<approval id>#<column>.dailyClosingStock/<date>` names the units that column's series leaves at the
 * close of one date. A reference with no fragment resolves over the role's whole scope: it names the
 * approval record and nothing inside it, so no fragment narrows what the role receives.
 *
 * A record member is quoted from the approval's own field, and a compared measure is re-read through
 * `getApprovalOutcome` — the read the outcome card is built from — rather than re-derived here, so the
 * drawer states the figure the card printed rather than a second computation of it (AAP 0.12.2's
 * `Evidence.value`, rule P-6). The measure is taken by its member name from the column's own
 * `SolverResult`, and the levers that solve ran at travel with it so the payload can say which
 * measurement it reports. A fragment, member or date the read does not answer is refused as
 * `'not-found'` naming the reference and the values the read accepts, so a drawer never states a
 * figure the card did not print.
 *
 * @param ctx - The call's context, whose persona and records the comparison read is made for.
 * @param approval - The approval the reference named.
 * @param ref - The whole reference, quoted by a refusal.
 * @param fragment - What followed the record's identifier and its `#`.
 * @returns The figure the fragment names.
 * @throws Problem - `'not-found'` naming the reference and the members the read accepts when the
 *   fragment names no figure, when the column is not one of the comparison's two, or when the
 *   comparison reports no finite reading for the member; and the failure the comparison read itself
 *   raises for an approval it cannot measure.
 */
async function approvalFigureOf(
  ctx: HandlerContext,
  approval: Approval,
  ref: string,
  fragment: string,
): Promise<ApprovalFigure> {
  if (isApprovalMoneyMember(fragment)) {
    return { kind: 'record-member', member: fragment, amount: approval[fragment] };
  }

  const separatorAt = fragment.indexOf(MEASURE_SEPARATOR);
  const column = separatorAt < 0 ? fragment : fragment.slice(0, separatorAt);
  const member = separatorAt < 0 ? '' : fragment.slice(separatorAt + MEASURE_SEPARATOR.length);

  if (!isOutcomeColumn(column)) {
    throw notFoundProblem(ctx, figureGrammarRefusal(approval, ref));
  }

  const seriesDate = seriesDateOf(member);

  if (seriesDate !== null) {
    return closingStockFigureOf(ctx, approval, ref, column, seriesDate);
  }

  if (!isOutcomeMeasureKey(member)) {
    throw notFoundProblem(ctx, figureGrammarRefusal(approval, ref));
  }

  const outcome = await getApprovalOutcome(ctx, approval.id);
  const reading = column === PLANNED_COLUMN ? outcome.planned : outcome.resulting;
  const value = reading[member];

  if (!Number.isFinite(value)) {
    throw notFoundProblem(
      ctx,
      `The comparison of the approval reference ${ref} reports no finite ${member}, so the figure behind it cannot be resolved. The members it reports are ${OUTCOME_MEASURE_MEMBERS.join(', ')}.`,
    );
  }

  return { kind: 'outcome-measure', column, member, value, levers: reading.levers };
}

/**
 * The date a fragment names when it addresses one reading of the closing-stock series, or `null` when
 * it names something else.
 *
 * @param member - The part of the fragment after the comparison's column and its `.`.
 * @returns The date the fragment states, or `null` for a fragment that names no series reading.
 */
function seriesDateOf(member: string): IsoDate | null {
  const prefix = `${OUTCOME_SERIES_MEMBER}${SERIES_DATE_SEPARATOR}`;

  return member.startsWith(prefix) && member.length > prefix.length
    ? member.slice(prefix.length)
    : null;
}

/**
 * The refusal every fragment the read does not answer states, so one sentence names the whole grammar.
 *
 * @param approval - The approval the reference named.
 * @param ref - The whole reference the caller sent.
 * @returns The refusal message.
 */
function figureGrammarRefusal(approval: Approval, ref: string): string {
  return (
    `The approval reference ${ref} names no figure of that approval, so the evidence behind it cannot ` +
    `be resolved. A reference names one of the record's own amounts as ${approval.id}${AXIS_SEPARATOR}` +
    `<member>, with member one of ${APPROVAL_MONEY_MEMBERS.join(', ')}; one measure of the comparison ` +
    `the approval was measured from as ${approval.id}${AXIS_SEPARATOR}<column>.<member>, with column ` +
    `one of ${PLANNED_COLUMN}, ${RESULTING_COLUMN} and member one of ` +
    `${OUTCOME_MEASURE_MEMBERS.join(', ')}; or one closing-stock reading as ` +
    `${approval.id}${AXIS_SEPARATOR}<column>.${OUTCOME_SERIES_MEMBER}${SERIES_DATE_SEPARATOR}<date>, ` +
    `with the date the one whose close the reading states.`
  );
}

/**
 * Reads one closing-stock reading of the approval's comparison at the date the fragment names.
 *
 * The series is `getApprovalOutcome`'s own output for the column, so the drawer states the units the
 * solver projected rather than a second computation of them (AAP 0.12.2's `Evidence.value`, rule P-6).
 * A date either solve does not reach is refused with the dates it does reach, because a reading the
 * card never printed must not be answerable.
 *
 * @param ctx - The call's context, whose persona and records the comparison read is made for.
 * @param approval - The approval the reference named.
 * @param ref - The whole reference, quoted by a refusal.
 * @param column - The comparison's column the reading stands in.
 * @param date - The date whose close the fragment names.
 * @returns The closing-stock figure.
 * @throws Problem - `'not-found'` when the column's series states no reading for the date, and the
 *   failure the comparison read itself raises for an approval it cannot measure.
 */
async function closingStockFigureOf(
  ctx: HandlerContext,
  approval: Approval,
  ref: string,
  column: OutcomeColumn,
  date: IsoDate,
): Promise<ApprovalFigure> {
  const outcome = await getApprovalOutcome(ctx, approval.id);
  const reading = column === PLANNED_COLUMN ? outcome.planned : outcome.resulting;
  const series = reading.dailyClosingStock;
  const point = series.find((candidate) => candidate.date === date);

  if (point === undefined || !Number.isFinite(point.units)) {
    throw notFoundProblem(
      ctx,
      `The ${column} column of the comparison in the approval reference ${ref} states no closing stock for ${date}, so the reading behind it cannot be resolved. The dates that column states are ${series.map((candidate) => candidate.date).join(', ')}.`,
    );
  }

  return { kind: 'outcome-series', column, date, units: point.units, levers: reading.levers };
}

/* ---------------------------------------------------------------------------------------------
 * The plant a resolved record belongs to — contracts §7.1, AAP 0.2.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The plant-scoped subject a resolved record presents to the permission matrix, or `null` when the
 * record names no plant of its own.
 *
 * A record that names one plant is narrowed by it, so a persona cannot read the evidence of a plant
 * outside its scope: a customer order, a purchase order and a production line each belong to one plant
 * (AAP 0.12.2), and a pin is narrowed by its own node when that node is a plant. A package, an audit
 * event, a document, a material and a product name no plant, and neither does a radar series, which
 * reports a market reading rather than a record placed at a plant, so none of them is plant-scoped and
 * the permission alone decides whether it is readable — which is the reading `hasPermission` documents
 * for a `null` subject. A composed aggregate names a plant only when its key is a plant's reading. The
 * four market-intelligence families name no plant either: the pack describes competitors rather than a
 * record of the client's own, which is the reading `./atlas.ts` documents for the atlas read itself, so
 * they are never narrowed by a plant scope and are refused by `assertPackReach` instead. The declared
 * configuration is group-wide by construction — the ledger's endpoints and the policy set are the same
 * records for every plant — so a policy and an outbound endpoint name no plant either.
 *
 * The families whose plants one subject cannot state are answered with `null` here and narrowed by their
 * own rule in `getEvidence`: the four canvas nodes by `assertNodeReach`, which reads every plant the
 * records place a node in; the exception, the scenario that answers one, the approval of one, a figure
 * inside an approval and a step of a write-back of one by `assertExceptionReach`, which reads every plant
 * the exception they belong to touches — the set the exception queue admits the row by (AAP 0.2.1,
 * principle PR-6); and a composed aggregate where its figure is resolved, which the `'aggregate'` case
 * below states.
 *
 * @param ctx - The call's context, whose records place a pin's node.
 * @param resolved - The record the reference named.
 * @returns The plant-scoped subject, or `null` when the record names no plant of its own.
 */
function subjectOf(ctx: HandlerContext, resolved: ResolvedRef): ScopedSubject | null {
  const records = ctx.state.records;

  switch (resolved.family) {
    case 'aggregate':
      /*
       * A composed figure is admitted where it is resolved rather than here. `aggregateOf` answers a
       * `plant/<plantId>/…` key only when the resolved selection carries a risk-by-plant row for that
       * plant, refusing it as `'not-found'` otherwise, and every aggregate read goes through
       * `getOverview`, which enforces the family's read permission itself. A second, single-plant check
       * on top of that would refuse a figure the reader's own screen drew — the by-plant row of a plant
       * whose exceptions reach the reader's scope from a plant outside it (AAP 0.2.1's one-scope rule).
       */
      return null;
    case 'write-back':
      /*
       * A step belongs to the plan it writes back — an approval, or the option an approval was requested
       * for — so it stands where the disruption that plan answers stands, and `assertExceptionReach`
       * admits it over every plant that exception touches (see the family guard above).
       */
      return null;
    case 'exception':
    case 'scenario':
    case 'approval':
      /*
       * All three belong to one exception, whose reach is every plant it touches rather than the one it
       * is laid on, so `assertExceptionReach` decides them over that whole set. Narrowing a scenario or
       * an approval to the exception's own plant here would refuse the option a screen printed, and the
       * plan a screen approved, wherever the row was admitted through a plant the exception also reaches.
       */
      return null;
    case 'customer-order':
      return { plantId: resolved.record.plantId };
    case 'purchase-order':
      return { plantId: resolved.record.plantId };
    case 'pin':
      return records.plants.some((plant) => plant.id === resolved.record.nodeRef)
        ? { plantId: resolved.record.nodeRef }
        : null;
    case 'approval-figure':
      /*
       * A figure inside an approval answers the same exception the approval does, so `assertExceptionReach`
       * admits it over every plant that exception touches, exactly as the approval itself is admitted.
       */
      return null;
    case 'plant':
    case 'supplier':
    case 'origin':
    case 'customer':
      /*
       * A node of the canvas can be placed in several plants — a supplier serves every plant its
       * materials and orders reach, an origin the plants of the suppliers it feeds, a customer the
       * plants its orders ship from — so its reach is decided over all of them by `assertNodeReach`
       * rather than by one subject here.
       */
      return null;
    case 'line':
      return { plantId: resolved.record.plantId };
    case 'chokepoint':
    case 'competitor-site':
    case 'competitor-network':
    case 'radar-series':
    case 'package':
    case 'audit-event':
    case 'document':
    case 'material':
    case 'product':
    case 'atlas-series':
    case 'policy':
    case 'outbound-endpoint':
      return null;
  }
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
    case 'aggregate':
      return resolved.figure.evidence;
    case 'write-back':
      return writeBackStepEvidence(ctx, resolved);
    case 'package':
      return packageEvidence(ctx.state.records, resolved.record);
    case 'exception':
      return exceptionEvidence(ctx, resolved.record);
    case 'scenario':
      return scenarioEvidence(ctx, resolved.record);
    case 'approval':
      return approvalEvidence(ctx, resolved.record);
    case 'approval-figure':
      return approvalFigureEvidence(ctx, resolved.record, resolved.figure);
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
    case 'policy':
      return policyEvidence(ctx, resolved.record);
    case 'outbound-endpoint':
      return outboundEndpointEvidence(ctx, resolved.record);
    case 'chokepoint':
      return chokepointEvidence(ctx, resolved.record);
    case 'competitor-site':
      return competitorSiteEvidence(resolved.record, resolved.network);
    case 'competitor-network':
      return competitorNetworkEvidence(ctx, resolved.record);
    case 'radar-series':
      return radarSeriesEvidence(
        resolved.record,
        resolved.reading,
        ctx.state.records.marketIntelligence.radarAxes,
      );
    case 'plant':
      return plantEvidence(ctx.state.records, resolved.record);
    case 'supplier':
      return supplierEvidence(ctx.state.records, resolved.record);
    case 'origin':
      return originEvidence(ctx.state.records, resolved.record);
    case 'customer':
      return customerEvidence(ctx.state.records, resolved.record);
    case 'material':
      return materialEvidence(ctx.state.records, resolved.record);
    case 'line':
      return lineEvidence(ctx.state.records, resolved.record);
    case 'product':
      return productEvidence(ctx.state.records, resolved.record);
    case 'atlas-series':
      return atlasSeriesEvidence(ctx.state.records, resolved.series, resolved.axes);
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
 * case's unread inputs are the exception's (AAP 0.8). The lever echo and the two money measures are
 * stated in the interface's own quantity and money shapes, so the drawer reads a column the way the
 * column beside it prints the same figure (contracts §1).
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
      leversText(scenario.levers),
      `ordersOnTime = ${scenario.ordersOnTime}`,
      `ordersTotal = ${scenario.ordersTotal}`,
      moneyInput('addedCostEur', scenario.addedCostEur),
      `lineIdleDays = ${scenario.lineIdleDays}`,
      moneyInput('revenueDelayedEur', scenario.revenueDelayedEur),
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
 * as the comparison measured them, in the interface's one money shape (contracts §1). Every write-back
 * is simulated, and the payload says so in the formula and lists each step's recorded state; the fixed
 * `Simulated write-back` label is applied by the component that renders a step (AAP 0.10). The approval
 * states no missing input of its own: the inputs the plan is missing are its exception's, which is the
 * record the detail screen reads them from, so the drawer and the panel beside it state one list
 * (AAP 0.12.2's `Evidence.missingInputs`).
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
      moneyInput('addedCostEur', approval.addedCostEur),
      moneyInput('protectedRevenueEur', approval.protectedRevenueEur),
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
    missingInputs: missingInputsOf(records, [approval.exceptionId]),
    documents: documentsCiting(records, approval.exceptionId),
  };
}

/**
 * The evidence behind one figure SCR-05 prints off an approval: the measure, the column it was read
 * in and the solve behind it.
 *
 * The payload states what was clicked rather than the record as a whole, so two figures of one
 * approval open two different drawers (AAP 0.12.2's `Evidence.value`). It carries `computed` and the
 * fixed `Simulated calculation` label the screens print over the same figures (rule P-1), names the
 * contracts §4 rule that owns the measure and which solve it came from, and lists the inputs the
 * figure rests on — the measure, its value and the approval's own references — with the approval, its
 * option and its exception as the records upstream of it, so the drawer's third section renders for a
 * figure as it does for every other computed one. The confidence is the exception's own where the
 * figure is a measure of the comparison, because that record states how far the case can be trusted,
 * and the record's own reading otherwise; the missing inputs are the exception's, which is the list
 * the approval's own payload and its detail screen state (AAP 0.12.2).
 *
 * @param ctx - The call's context, whose records supply the exception behind the approval.
 * @param approval - The approval the reference named.
 * @param figure - The figure its fragment named.
 * @returns The figure's evidence payload.
 */
function approvalFigureEvidence(
  ctx: HandlerContext,
  approval: Approval,
  figure: ApprovalFigure,
): Evidence {
  const records = ctx.state.records;
  const exception = records.exceptions.find((candidate) => candidate.id === approval.exceptionId);

  return {
    value: figureValueText(figure),
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula: figureFormula(figure),
    inputs: figureInputs(approval, figure),
    upstream: uniqueRefs([approval.id, approval.scenarioId, approval.exceptionId]),
    downstream: [],
    confidence:
      figure.kind === 'outcome-measure' && exception !== undefined
        ? exception.confidence
        : recordConfidence(),
    missingInputs: missingInputsOf(records, [approval.exceptionId]),
    documents: documentsCiting(records, approval.exceptionId),
  };
}

/**
 * The evidence behind one step of a plan's simulated write-back: the record it writes, the system it
 * writes into and the state the run left it in.
 *
 * The value is the step's own row — its position, the record that holds it, the system's display name,
 * the reference it writes and the state it stands in — and every part of it is a field of a record, so
 * nothing is computed here (rule P-6). The label is the fixed `Simulated write-back` string of
 * specification §5.3, because a step is a write-back element and rule P-1 labels each element rather
 * than the list it sits in; the provenance is `first_party`, because a step is a record of this
 * workspace rather than a market reading or a computed figure.
 *
 * The formula states in the product's own words what a write-back step is: the record a plan writes
 * into a system of record, the steps running in the order the plan records, no system behind them
 * contacted, and the change all-or-nothing — a step that does not complete stops the run and leaves
 * every later step pending until the failed step is retried, and a retry never writes a step that
 * already succeeded.
 *
 * The neighbours follow the record the steps belong to. For an approval the upstream records are the
 * exception it answers and the option it was requested for, and the downstream records are the audit
 * events the chain holds against it, which is the trail a reader follows from a step back to the
 * decision. For an option the upstream record is the exception whose case the option was measured from,
 * and the downstream records are the approvals naming it. The missing inputs are the owner's
 * exception's, because an input the case could not read is the exception's (AAP 0.8), and the documents
 * are those citing that exception.
 *
 * @param ctx - The call's context: the records the plan and its neighbours are read from, and the chain
 *   behind an approval.
 * @param resolved - The step the reference named, with the record that holds it.
 * @returns The step's evidence payload.
 */
function writeBackStepEvidence(ctx: HandlerContext, resolved: WriteBackStepRef): Evidence {
  const records = ctx.state.records;
  const { owner, ownerId, step } = resolved;
  const exception = records.exceptions.find((candidate) => candidate.id === owner.exceptionId);
  const neighbours = isApprovalOwner(owner)
    ? {
        upstream: uniqueRefs([owner.exceptionId, owner.scenarioId]),
        downstream: uniqueRefs(
          ctx.state.auditEvents
            .filter((event) => event.objectRef === owner.id)
            .map((event) => event.id),
        ),
      }
    : {
        upstream: uniqueRefs([owner.exceptionId]),
        downstream: uniqueRefs(
          records.approvals
            .filter((approval) => approval.scenarioId === owner.id)
            .map((approval) => approval.id),
        ),
      };

  return {
    value:
      `write-back step ${step.sequence} of ${ownerId} to ${SOURCE_LABELS[step.system]} record ` +
      `${step.recordRef} stands ${step.state}`,
    provenance: 'first_party',
    label: SIMULATED_WRITE_BACK,
    formula:
      'A write-back step is the record a plan writes into one system of record, and the steps of a ' +
      'plan run in the order the plan records. Every step is simulated: no system behind it is ' +
      'contacted and no live record is written. The change is all-or-nothing — a step that does not ' +
      'complete stops the run and leaves every later step pending until the failed step is retried, ' +
      'and a retry never writes a step that already succeeded.',
    inputs: [
      `sequence = ${step.sequence}`,
      `system = ${step.system}`,
      `recordRef = ${step.recordRef}`,
      `state = ${step.state}`,
      `description = ${step.description}`,
      `owner = ${ownerId}`,
    ],
    upstream: neighbours.upstream,
    downstream: neighbours.downstream,
    confidence: recordConfidence(),
    missingInputs: exception === undefined ? [] : [...exception.missingInputs],
    documents: documentsCiting(records, owner.exceptionId),
  };
}

/**
 * One figure as the payload's value states it: the measure, the column it was read in and the figure
 * itself.
 *
 * The measure is named by the label the outcome card prints on its row, so a reader comparing the
 * drawer with the card reads the same words; an amount goes through `amountText` and a count is stated
 * as the number the solver rounded (rule P-6). A record member states its own name alone, because it
 * is a value of the record rather than a column of the comparison, and a closing-stock reading states
 * the date whose close it belongs to as well as the number, because the series prints one row per date
 * and the number alone would name no row.
 *
 * @param figure - The figure the reference named.
 * @returns The sentence the drawer's value row prints.
 */
function figureValueText(figure: ApprovalFigure): string {
  switch (figure.kind) {
    case 'record-member':
      return `${FIGURE_TEXT[figure.member]}: ${amountText(figure.amount)}`;
    case 'outcome-measure':
      return `${FIGURE_TEXT[figure.member]}, ${figure.column}: ${measureText(figure.member, figure.value)}`;
    case 'outcome-series':
      return `${OUTCOME_SERIES_TEXT}, ${figure.column}, ${figure.date}: ${figure.units} units at close`;
  }
}

/**
 * One compared measure as a payload states it: money through `amountText`, a count as the number the
 * solver rounded.
 *
 * @param member - The measure the figure names.
 * @param value - The reading the comparison reported for it.
 * @returns The figure with its currency where the measure is an amount.
 */
function measureText(member: OutcomeMeasureKey, value: number): string {
  return isMoneyMeasure(member) ? amountText(value) : `${value}`;
}

/**
 * The rule behind one figure and the solve it was read from.
 *
 * A record member is a measure the solver computed for the option and the record carries; a compared
 * measure is read from the comparison's own column, so the formula names which solve that column is —
 * the plan's own levers, or the levers the simulated write-backs reached, as the comparison itself
 * states them (AAP 0.2.2, rule P-6).
 *
 * @param figure - The figure the reference named.
 * @returns The formula sentence the drawer prints.
 */
function figureFormula(figure: ApprovalFigure): string {
  if (figure.kind === 'record-member') {
    return (
      `${FIGURE_TEXT[figure.member]} is one of the measures the solver computes for the option under ` +
      'contracts §4 rules 1 to 11, and the approval record carries the figure the comparison measured ' +
      "for it. This payload quotes the record's own member rather than computing it again."
    );
  }

  const solve =
    figure.column === PLANNED_COLUMN
      ? "the plan's own levers"
      : 'the levers the simulated write-backs reached';
  const measurement =
    `the ${figure.column} column is the solve at ${solve}, taken from the case the approval's ` +
    `exception names, with air sets ${figure.levers.airSets} and transferred sets ` +
    `${figure.levers.transferSets}`;

  if (figure.kind === 'outcome-series') {
    return (
      `${OUTCOME_SERIES_TEXT} is the series the solver projects under contracts §4 rules 1 to 11, ` +
      `re-read from the approval's own comparison: ${measurement}. The reading stated is the units ` +
      `that solve leaves at the close of ${figure.date}, and this payload recomputes none of them.`
    );
  }

  return (
    `${FIGURE_TEXT[figure.member]} is one of the measures the solver computes under contracts §4 rules ` +
    `1 to 11, re-read from the approval's own comparison: ${measurement}. This payload states that ` +
    'measurement and recomputes it nowhere.'
  );
}

/**
 * The record values one figure rests on, which the drawer's third section lists.
 *
 * Non-empty by construction: the measure and its value are stated with the approval's own references
 * beside them, because the drawer omits that section when every list is empty and a figure without its
 * inputs would read as one with nothing behind it (AAP 0.12.2).
 *
 * @param approval - The approval the figure belongs to.
 * @param figure - The figure the reference named.
 * @returns The input lines the payload carries.
 */
function figureInputs(approval: Approval, figure: ApprovalFigure): string[] {
  const stated = [
    `approvalId = ${approval.id}`,
    `scenarioId = ${approval.scenarioId}`,
    `exceptionId = ${approval.exceptionId}`,
    figure.kind === 'outcome-series'
      ? `measure = ${OUTCOME_SERIES_MEMBER}`
      : `measure = ${figure.member}`,
  ];

  if (figure.kind === 'record-member') {
    return [...stated, `value = ${amountText(figure.amount)}`];
  }

  const reading =
    figure.kind === 'outcome-series'
      ? [`date = ${figure.date}`, `value = ${figure.units} units at close`]
      : [`value = ${measureText(figure.member, figure.value)}`];

  return [
    ...stated,
    `column = ${figure.column}`,
    ...reading,
    `levers = airSets ${figure.levers.airSets}, transferSets ${figure.levers.transferSets}`,
  ];
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
 * figures the order feeds. The revenue-at-risk rule of contracts §5 is named rather than applied, and
 * the missing inputs are the ones those exceptions could not read, because the units at risk are only
 * as complete as the records that place them (AAP 0.12.2's `Evidence.missingInputs`).
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
      moneyInput('unitPriceEur', order.unitPriceEur),
      `dueDate = ${order.dueDate}`,
      `originalDueDate = ${order.originalDueDate}`,
      `status = ${order.status}`,
    ],
    upstream: uniqueRefs([order.customerId, order.productId, order.plantId]),
    downstream: uniqueRefs([...exceptions, ...scenarios]),
    confidence: recordConfidence(),
    missingInputs: missingInputsOf(records, exceptions),
    documents: documentsCiting(records, order.id),
  };
}

/**
 * The evidence behind one purchase order: the inbound commitment the projection measures.
 *
 * The order is what the case's supply schedule rests on, so its downstream list names the exceptions
 * that carry it as their delayed order and the solver cases whose measurement depends on it. Every
 * value in the payload is a field of the record. The inputs it reports as missing are those the
 * exceptions carrying it could not read — an order states no gap of its own, and the exception's own
 * banner names the same gap, so a drawer that answered with none would contradict the screen beside it
 * (AAP 0.12.2's `Evidence.missingInputs`).
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
      moneyInput('unitCostEur', order.unitCostEur),
      `orderedDate = ${order.orderedDate}`,
      `originalDueDate = ${order.originalDueDate}`,
      `currentDueDate = ${order.currentDueDate}`,
      `status = ${order.status}`,
    ],
    upstream: uniqueRefs([order.supplierId, order.materialId, order.plantId]),
    downstream: uniqueRefs([...exceptions, ...cases]),
    confidence: recordConfidence(),
    missingInputs: missingInputsOf(records, exceptions),
    documents: documentsCiting(records, order.id),
  };
}

/**
 * The evidence behind one shared chokepoint: the share of the pack's networks that route through it,
 * and the buffer each of those competitors holds there.
 *
 * Every figure is the crossing record's own field — its overlap and its per-competitor buffer days —
 * and the formula states the pack's own rule rather than re-deriving it: the overlap is the share of
 * the pack's competitor networks that route through the crossing, as a whole percent, and the buffer
 * days are the days each competitor using the crossing holds there. The payload carries no first-party
 * member and cites no document, because the crossing is a market-intelligence record read from the pack
 * alone (rule P-5, AAP 0.8) and every document in the record set is a record of the client's own.
 *
 * @param ctx - The call's context, whose pack supplies the networks and lanes that traverse the crossing.
 * @param crossing - The crossing the reference named.
 * @returns The crossing's evidence payload.
 */
function chokepointEvidence(ctx: HandlerContext, crossing: ChokepointRecord): Evidence {
  const traversing = ctx.state.records.marketIntelligence.competitors.filter((network) =>
    network.lanes.some((lane) => lane.chokepointId === crossing.id),
  );
  const buffers = Object.entries(crossing.competitorBufferDays);

  return {
    value: `${crossing.label}: ${crossing.overlap} per cent of the pack's competitor networks route through it`,
    provenance: 'market_intelligence',
    label: MARKET_INTELLIGENCE_LABEL,
    formula:
      'The pack states a crossing\'s overlap as the share of its competitor networks that route through ' +
      'it, as a whole percent, and records the buffer days each of those competitors holds there. Both ' +
      'are fields of the crossing record, the lanes carrying the crossing\'s identifier are what place ' +
      'it on the network view, and this payload recomputes neither figure.',
    inputs: [
      `overlap = ${crossing.overlap}`,
      ...buffers.map(
        ([competitorId, bufferDays]) => `buffer days for ${competitorId} = ${bufferDays}`,
      ),
    ],
    upstream: uniqueRefs(buffers.map(([competitorId]) => competitorId)),
    downstream: uniqueRefs([
      ...traversing.map((network) => network.competitorId),
      ...traversing.flatMap((network) =>
        network.lanes
          .filter((lane) => lane.chokepointId === crossing.id)
          .map((lane) => `lane from ${lane.fromId} to ${lane.toId}`),
      ),
    ]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The evidence behind one competitor's site: where the pack places it and the lanes that reach it.
 *
 * The value states the record's own name and its recorded coordinates, and the inputs are the members
 * the site record states. The upstream list names the competitor the site belongs to, and the
 * downstream list names the lanes that start or end at it together with the crossing each of those
 * lanes traverses, so a reader can see what the position feeds. Every member is market-intelligence
 * record content and no first-party record appears (rule P-5).
 *
 * @param site - The site the reference named.
 * @param network - The competitor network the site was found in.
 * @returns The site's evidence payload.
 */
function competitorSiteEvidence(site: AtlasSite, network: CompetitorNetwork): Evidence {
  const touching = network.lanes.filter((lane) => lane.fromId === site.id || lane.toId === site.id);

  return {
    value: `${site.label} at latitude ${site.latitude}, longitude ${site.longitude}`,
    provenance: 'market_intelligence',
    label: MARKET_INTELLIGENCE_LABEL,
    formula:
      'A competitor site is a position the simulated market pack records for one of its networks: the ' +
      'coordinate pair is the record, and the network view, the canvas overlay and the map lens place ' +
      'the mark there without deriving anything. The lanes listed below are the network\'s own lanes ' +
      'that start or end at the site, and a crossing a lane names is the crossing that traffic passes ' +
      'through.',
    inputs: [
      `id = ${site.id}`,
      `competitorId = ${network.competitorId}`,
      `label = ${site.label}`,
      `latitude = ${site.latitude}`,
      `longitude = ${site.longitude}`,
    ],
    upstream: uniqueRefs([network.competitorId]),
    downstream: uniqueRefs([
      ...touching.map((lane) => `lane from ${lane.fromId} to ${lane.toId}`),
      ...touching.flatMap((lane) => (lane.chokepointId === undefined ? [] : [lane.chokepointId])),
    ]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The evidence behind one competitor network: the sites and lanes the pack records for it.
 *
 * The counts in the value and the members in the inputs are the network record's own, and the
 * downstream list names the crossings its lanes traverse and the radar series that report on it, so a
 * reader can follow the network from the payload to every surface it feeds. Nothing here aggregates a
 * competitor figure with a first-party one: the network is market intelligence from end to end
 * (rule P-5).
 *
 * @param ctx - The call's context, whose pack supplies the series that report on the network.
 * @param network - The network the reference named.
 * @returns The network's evidence payload.
 */
function competitorNetworkEvidence(ctx: HandlerContext, network: CompetitorNetwork): Evidence {
  const scoring = ctx.state.records.marketIntelligence.radarSeries.filter(
    (candidate) => candidate.competitorId === network.competitorId,
  );

  return {
    value: `${network.label}: ${network.sites.length} sites and ${network.lanes.length} lanes in the simulated pack`,
    provenance: 'market_intelligence',
    label: MARKET_INTELLIGENCE_LABEL,
    formula:
      'A competitor network is the set of sites and lanes the simulated market pack records for one ' +
      'competitor. The network view draws those records as they stand, the shared crossings are the ' +
      'ones its lanes name, and the radar scores it through the series that names it as the network it ' +
      'reports on. No member of this payload is a first-party reading.',
    inputs: [
      `competitorId = ${network.competitorId}`,
      `label = ${network.label}`,
      `productClasses = ${network.productClasses.join(', ')}`,
      ...network.sites.map((site) => `site ${site.id}: ${site.label}`),
      ...network.lanes.map((lane) => `lane from ${lane.fromId} to ${lane.toId}`),
    ],
    upstream: uniqueRefs([network.competitorId]),
    downstream: uniqueRefs([
      ...network.lanes.flatMap((lane) => (lane.chokepointId === undefined ? [] : [lane.chokepointId])),
      ...scoring.map((series) => series.id),
    ]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The evidence behind one radar reading: one score of one series on one axis, or the whole series.
 *
 * `reading` is the axis and score the reference named — the single reading a vertex draws — or `null`
 * for the whole series. With a reading the value is the series' own score on that axis, labelled with
 * the axis' own name; without one the value states the series and every axis reading is listed in the
 * inputs. A score is read at the position the pack's axis list gives its axis, because
 * `AtlasSeries.values` is aligned to that order and carries no axis name of its own, and nothing here
 * averages, rescales or combines one series' reading with another's.
 *
 * The provenance and the label are the record's own (rule P-5, rule P-1). A competitor series is market
 * intelligence and carries the market-intelligence member of the fixed labels; the client's own series
 * is a first-party self-assessment, and `Evidence.label` is typed `SimLabel`, which the client's
 * companion string is deliberately not a member of. The client's series therefore carries `Simulated
 * data` here: the self-assessment is a seeded record rather than a computed figure, and the longer,
 * series-specific companion string belongs to the drawing that shows one series beside another, not to
 * a drawer that reports a single record.
 *
 * @param series - The series the reference named.
 * @param reading - The one axis and score the reference named, or `null` for the whole series.
 * @param axes - The pack's axis list, in the order the series' scores align to.
 * @returns The reading's evidence payload.
 */
function radarSeriesEvidence(
  series: AtlasSeries,
  reading: RadarReading | null,
  axes: readonly RadarAxis[],
): Evidence {
  const recorded = axes.flatMap((axis, position) => {
    const score = series.values[position];

    return score === undefined ? [] : [`${axis.label} = ${score}`];
  });

  return {
    value:
      reading === null
        ? `${series.label}: ${recorded.length} axis readings recorded`
        : `${reading.axis.label}, ${series.label}: ${reading.score}`,
    provenance: series.provenance,
    label: series.provenance === 'market_intelligence' ? MARKET_INTELLIGENCE_LABEL : SIMULATED_DATA,
    formula:
      'A radar score is one reading of one series on one axis. The pack publishes the axis list, every ' +
      'series states one score per axis in that order, and the radar draws the score at the position ' +
      'its axis holds. The series name, the axis name and the score are the record\'s own, so no ' +
      'reading is averaged, rescaled or combined with another series.',
    inputs: [
      `id = ${series.id}`,
      `provenance = ${series.provenance}`,
      `simLabel = ${series.simLabel}`,
      ...(series.competitorId === null ? [] : [`competitorId = ${series.competitorId}`]),
      ...recorded,
    ],
    upstream: uniqueRefs(series.competitorId === null ? [] : [series.competitorId]),
    downstream: [],
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The evidence behind one plant: the site the record states, the lines it runs and the records that
 * name it.
 *
 * A plant is reached two ways and drawn from the one record both times: a node of the FileMap canvas,
 * because `topology.ts` copies the record into its node, and the client site the competitive atlas's
 * network view places beside the competitor networks. The value and the inputs are the record's own
 * members — its name, place, coordinates and the lines it runs — and the records that name the plant
 * are what the payload lists around it: the lines it runs come first, and the exceptions raised at it,
 * the customer orders it serves and the purchase orders it receives follow. The exceptions include the
 * ones whose disruption lands at the plant and the ones whose also-affected plants name it, which is
 * the same rule `src/domain/aggregation/exceptions.ts` narrows a plant scope by. The plant is a seeded
 * first-party record rather than a computed figure, so it carries `Simulated data` and cites the
 * documents that name it, exactly as the other first-party families do; the figures that name a plant —
 * revenue at risk by plant, the queue the plant filter narrows and the pins the canvas badges the node
 * with — are the contracts §5 aggregates and the contracts §8 pin rule over these same records, and
 * this payload states those rules and derives nothing from them.
 *
 * @param records - The session's record set.
 * @param plant - The plant the reference named.
 * @returns The plant's evidence payload.
 */
function plantEvidence(records: SeedRecordSet, plant: Plant): Evidence {
  const lines = records.lines
    .filter((line) => line.plantId === plant.id)
    .map((line) => line.id);
  const exceptions = records.exceptions
    .filter(
      (exception) =>
        exception.plantId === plant.id || exception.alsoAffectsPlantIds.includes(plant.id),
    )
    .map((exception) => exception.id);
  const customerOrders = records.customerOrders
    .filter((order) => order.plantId === plant.id)
    .map((order) => order.id);
  const purchaseOrders = records.purchaseOrders
    .filter((order) => order.plantId === plant.id)
    .map((order) => order.id);

  return {
    value: `${plant.name}, ${plant.location}: ${lines.length} production lines recorded`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'A plant is the place a disruption lands on — one of the values the shell\'s plant filter and the ' +
      'acting role\'s plant scope select between, the node the canvas draws and the client site the ' +
      'atlas\'s network view places. Its coordinate pair is the record\'s own, which the map lens ' +
      'projects and the canvas draws as a node without deriving anything from it. The figures that name ' +
      'a plant — revenue at risk by plant, the queue the plant filter narrows and the pins the canvas ' +
      'badges the node with — are the contracts §5 aggregates and the contracts §8 pin rule over the ' +
      'lines it runs, the exceptions raised at it and the orders it serves, which are the records this ' +
      'payload lists around it.',
    inputs: [
      `id = ${plant.id}`,
      `name = ${plant.name}`,
      `location = ${plant.location}`,
      `latitude = ${plant.latitude}`,
      `longitude = ${plant.longitude}`,
      ...plant.lineIds.map((lineId) => `line = ${lineId}`),
    ],
    upstream: uniqueRefs(lines),
    downstream: uniqueRefs([...exceptions, ...customerOrders, ...purchaseOrders]),
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
      'the ones those materials and the orders naming it resolve to, which is the reach the graph lens ' +
      'bands its node by. This payload states the record and that rule and computes neither.',
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
      'origin-to-supplier lane exists for is the one the supplier buys through it. This payload states ' +
      'the record and the relation and computes neither.',
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

/* ---------------------------------------------------------------------------------------------
 * The node families — the records the topology and the impact chain draw — AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The exceptions a node's read reaches, by identifier, in record order.
 *
 * A node's payload lists the exceptions its record is named by, so a reader can see which figures
 * depend on it without this module computing one. The predicate states the relation the caller is
 * reading; nothing here decides which relation a node carries.
 *
 * @param records - The session's record set.
 * @param predicate - The relation the node's record states, applied to each exception.
 * @returns The identifiers of the exceptions it selects, in the order the records hold them.
 */
function exceptionsMatching(
  records: SeedRecordSet,
  predicate: (exception: OperationalException) => boolean,
): string[] {
  return records.exceptions.filter(predicate).map((exception) => exception.id);
}

/**
 * The inputs the exceptions behind a node could not read, distinct and in record order.
 *
 * A figure computed over a node's records inherits their gaps, so the node's payload reports them
 * rather than stating none: an exception that could not read an input is a fact about the evidence
 * behind the node, not about the node's own record (AAP 0.12.2's `Evidence.missingInputs`).
 *
 * @param records - The session's record set.
 * @param exceptionIds - The exceptions the node's record is named by.
 * @returns Each distinct missing input, once, in the order the records state them.
 */
function missingInputsOf(records: SeedRecordSet, exceptionIds: readonly string[]): string[] {
  return uniqueRefs(
    records.exceptions
      .filter((exception) => exceptionIds.includes(exception.id))
      .flatMap((exception) => exception.missingInputs),
  );
}

/**
 * The evidence behind one production line: the unit a plan is stated per and the chain's third node.
 *
 * The per-day rate is the record's own figure, which the solver measures a disrupted day against
 * (contracts §4) rather than something this payload derives. The plant the line belongs to is the
 * record's `plantId`, and the products built on it are the ones whose own records name it (AAP 0.12.2).
 *
 * @param records - The session's record set.
 * @param line - The line the reference named.
 * @returns The line's evidence payload.
 */
function lineEvidence(records: SeedRecordSet, line: Line): Evidence {
  const plant = records.plants.find((candidate) => candidate.id === line.plantId);
  const exceptions = exceptionsMatching(records, (exception) => exception.lineId === line.id);
  const products = records.products
    .filter((product) => product.lineIds.includes(line.id))
    .map((product) => product.id);

  return {
    value: `${line.name} at ${plant === undefined ? line.plantId : plant.name}, ${line.unitsPerDay} units per working day`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'A line belongs to one plant and its nominal output per working day is the rate the solver ' +
      'measures a disturbed day against (contracts §4); the products it builds are the ones whose ' +
      'records name it. This payload states the record and the relations it carries and recomputes ' +
      'neither.',
    inputs: [
      `id = ${line.id}`,
      `plantId = ${line.plantId}`,
      `name = ${line.name}`,
      `unitsPerDay = ${line.unitsPerDay}`,
    ],
    upstream: uniqueRefs([line.plantId, ...exceptions]),
    downstream: uniqueRefs(products),
    confidence: recordConfidence(),
    missingInputs: missingInputsOf(records, exceptions),
    documents: documentsCiting(records, line.id),
  };
}

/**
 * The evidence behind one material: what a product is built from and which supplier buys it in.
 *
 * A material has one primary supplier and may have an alternate, names the products it goes into and
 * the tier-2 origin behind its supplier, and carries the quantity one finished unit consumes (AAP
 * 0.12.2). The material is not itself a topology node, which is why the canvas reaches its products
 * through the supplier — but it is the record the impact chain's second node names, so its own
 * evidence is the record (AAP 0.12.4's SCR-03 row).
 *
 * @param records - The session's record set.
 * @param material - The material the reference named.
 * @returns The material's evidence payload.
 */
function materialEvidence(records: SeedRecordSet, material: Material): Evidence {
  const supplier = records.suppliers.find(
    (candidate) => candidate.id === material.primarySupplierId,
  );
  const alternate =
    material.alternateSupplierId === undefined
      ? undefined
      : records.suppliers.find((candidate) => candidate.id === material.alternateSupplierId);
  const alternateProse =
    alternate === undefined
      ? 'a single source'
      : `a second qualified supplier (${alternate.name})`;
  const orders = records.purchaseOrders
    .filter((order) => order.materialId === material.id)
    .map((order) => order.id);
  const exceptions = exceptionsMatching(records, (exception) => exception.materialId === material.id);

  return {
    value:
      `${material.name}, ${material.quantityPerUnit} per finished unit at ` +
      `${amountText(material.unitCostEur)}, bought from ` +
      `${supplier === undefined ? material.primarySupplierId : supplier.name} with ` +
      `${material.leadTimeDays} working days of lead time and ${alternateProse}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'A material has one primary supplier and may have an alternate, names the products it goes into ' +
      'and the tier-2 origin behind its primary supplier, and states the quantity one finished unit ' +
      'consumes. This payload states the record and the relations it carries and recomputes neither.',
    inputs: [
      `id = ${material.id}`,
      `name = ${material.name}`,
      `primarySupplierId = ${material.primarySupplierId}`,
      ...(material.alternateSupplierId === undefined
        ? []
        : [`alternateSupplierId = ${material.alternateSupplierId}`]),
      `originId = ${material.originId}`,
      `quantityPerUnit = ${material.quantityPerUnit}`,
      moneyInput('unitCostEur', material.unitCostEur),
      `leadTimeDays = ${material.leadTimeDays}`,
      ...material.productIds.map((productId) => `product ${productId}`),
    ],
    upstream: uniqueRefs([
      material.primarySupplierId,
      ...(material.alternateSupplierId === undefined ? [] : [material.alternateSupplierId]),
      material.originId,
    ]),
    downstream: uniqueRefs([...material.productIds, ...orders, ...exceptions]),
    confidence: recordConfidence(),
    missingInputs: missingInputsOf(records, exceptions),
    documents: documentsCiting(records, material.id),
  };
}

/**
 * The evidence behind one product: the record the portfolio, the queue and the atlas all name.
 *
 * A product is built at one or two production lines (AAP 0.12.2), and its unit price is the factor the
 * revenue-at-risk rule applies — a rule this payload names rather than applies (contracts §5). The
 * orders that name the product and the exceptions that put their lines at risk are the records that
 * draw a figure from it.
 *
 * @param records - The session's record set.
 * @param product - The product the reference named.
 * @returns The product's evidence payload.
 */
function productEvidence(records: SeedRecordSet, product: Product): Evidence {
  const materials = records.materials
    .filter((material) => material.productIds.includes(product.id))
    .map((material) => material.id);
  const orders = records.customerOrders
    .filter((order) => order.productId === product.id)
    .map((order) => order.id);
  const exceptions = exceptionsMatching(records, (exception) =>
    exception.affectedLines.some((line) => line.productId === product.id),
  );

  return {
    value: `${product.name}, a ${product.productClass} at ${amountText(product.priceEur)}: ${product.description}`,
    provenance: 'first_party',
    label: SIMULATED_DATA,
    formula:
      'A product is built at one or two production lines, and the units at risk an exception prices ' +
      'are the units of the customer orders that name it, multiplied by its unit price (contracts §5). ' +
      'This payload states the record and the relations it carries and recomputes neither.',
    inputs: [
      `id = ${product.id}`,
      `name = ${product.name}`,
      `productClass = ${product.productClass}`,
      moneyInput('priceEur', product.priceEur),
      ...product.lineIds.map((lineId) => `line ${lineId}`),
    ],
    upstream: uniqueRefs([...product.lineIds, ...materials]),
    downstream: uniqueRefs([...orders, ...exceptions]),
    confidence: recordConfidence(),
    missingInputs: missingInputsOf(records, exceptions),
    documents: documentsCiting(records, product.id),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The atlas series family — the radar's arcs and vertices, rule P-5 and AAP 0.12.4 SCR-13
 * ------------------------------------------------------------------------------------------- */

/**
 * Resolves one `atlas:<seriesId>` reference to the radar series the market pack holds.
 *
 * The series is read through `getAtlas`, so the scores, the provenance and the label a drawer reports
 * are the pack's own rather than a copy this module keeps: the atlas is the surface that owns the
 * reading, and the drawer must not be able to state a different one (rule P-5). The read also supplies
 * the axis list the series' `values` are aligned to, which is why the axes travel beside the series.
 *
 * @param ctx - The call's context: the pack, the persona and the trace identifier.
 * @param ref - The reference the radar vertex carries.
 * @returns The resolved family member.
 * @throws Problem - `'not-found'` when the pack holds no series with that identifier; `'permission'`
 *   when the persona may not read the market pack (rule P-5 keeps it from the external engineer).
 */
async function resolveAtlasSeries(ctx: HandlerContext, ref: string): Promise<ResolvedRef> {
  const seriesId = ref.slice(ATLAS_SERIES_PREFIX.length).trim();
  const atlas = await getAtlas(ctx);
  const series = atlas.radarSeries.find((candidate) => candidate.id === seriesId);

  if (series === undefined) {
    throw notFoundProblem(
      ctx,
      `The market pack holds no radar series with the identifier ${seriesId}, so the evidence behind ${ref} cannot be resolved.`,
    );
  }

  return { family: 'atlas-series', series, axes: atlas.radarAxes };
}

/**
 * The competitor network a market-intelligence series belongs to, or `null` for a first-party series.
 *
 * The pack states the relation by name: a competitor network carries the label the series carries, and
 * a client series carries none. The match is therefore read from the records rather than derived from
 * the series' identifier, so a re-keyed record cannot silently attach a competitor's chokepoints to the
 * client's own reading (rule P-5).
 *
 * @param records - The session's record set.
 * @param series - The series the reference named.
 * @returns The competitor network the series reports on, or `null`.
 */
function competitorOf(records: SeedRecordSet, series: AtlasSeries): CompetitorNetwork | null {
  if (series.provenance !== 'market_intelligence') {
    return null;
  }

  return (
    records.marketIntelligence.competitors.find((network) => network.label === series.label) ?? null
  );
}

/**
 * One series' scores as the pairs the payload states, in the axis order the pack fixed.
 *
 * An axis the series carries no score for is named rather than filled with a zero: a zero would read as
 * a measured low score, and the pack's own silence is the honest reading (rule P-6). A score with no
 * axis is not reported, because the axis list is what names a score on screen.
 *
 * @param series - The series the reference named.
 * @param axes - The radar's axes, in the order the series' values align to.
 * @returns One `<axis label> <score>` entry per axis.
 */
function seriesScorePairs(series: AtlasSeries, axes: readonly RadarAxis[]): string[] {
  const pairs: string[] = [];

  for (const [index, axis] of axes.entries()) {
    const score = series.values[index];

    pairs.push(score === undefined ? `${axis.label}: no score recorded` : `${axis.label} ${score}`);
  }

  return pairs;
}

/**
 * The label a radar series' figures carry, taken from the provenance the pack states.
 *
 * A competitor reading is market intelligence and carries specification §5.3's own string for it; the
 * client's self-assessment is a first-party record and carries `Simulated data`, with the longer
 * companion label the pack fixes for that one series stated in the payload's value (AAP 0.10, rule P-1).
 *
 * @param provenance - The provenance the series states.
 * @returns The exact label the figures carry.
 */
function seriesLabelOf(provenance: Provenance): SimLabel {
  switch (provenance) {
    case 'market_intelligence':
      return SIMULATED_MARKET_INTELLIGENCE;
    case 'first_party':
      return SIMULATED_DATA;
    case 'computed':
      return SIMULATED_CALCULATION;
  }
}

/**
 * The evidence behind one radar series: the five-axis scores the market pack states for it.
 *
 * One payload carries one series and never a total across series, because a market-intelligence figure
 * must never be blended with a first-party one in a single number (rule P-5). The client series carries
 * the companion label the radar prints beside it verbatim, so the string a reader sees on the drawing
 * is still carried by the drawer; a competitor series names the network it reports on and the crossings
 * that network's lanes traverse, which are the identifiers the pack relates to it.
 *
 * @param records - The session's record set.
 * @param series - The series the reference named.
 * @param axes - The radar's axes, in the order the series' values align to.
 * @returns The series' evidence payload.
 */
function atlasSeriesEvidence(
  records: SeedRecordSet,
  series: AtlasSeries,
  axes: readonly RadarAxis[],
): Evidence {
  const pairs = seriesScorePairs(series, axes);
  const competitor = competitorOf(records, series);
  const chokepoints =
    competitor === null
      ? []
      : uniqueRefs(
          competitor.lanes.flatMap((lane) =>
            lane.chokepointId === undefined ? [] : [lane.chokepointId],
          ),
        );

  return {
    value:
      series.provenance === 'first_party'
        ? `${CLIENT_SELF_ASSESSMENT_LABEL} — ${series.label}: ${pairs.join(', ')}`
        : `${series.label}: ${pairs.join(', ')}`,
    provenance: series.provenance,
    label: seriesLabelOf(series.provenance),
    formula:
      "A resilience score is the market pack's own reading of one series against one axis: the axes " +
      "and the scores are the pack's records, aligned by position, and nothing here recomputes, " +
      'normalises or totals them (contracts §3). One payload carries one series and no figure ' +
      'combines a market-intelligence reading with a first-party one (rule P-5).',
    inputs: [
      `seriesId = ${series.id}`,
      `provenance = ${series.provenance}`,
      ...pairs,
    ],
    upstream: competitor === null ? [] : [competitor.competitorId],
    downstream: chokepoints,
    confidence: recordConfidence(),
    missingInputs: [],
    documents: documentsCiting(records, series.id),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The two families SCR-07 opens its figures from — principle PR-6, AAP 0.12.4's SCR-07 row
 * ------------------------------------------------------------------------------------------- */

/**
 * The evidence behind one policy: the rule the record states, whether the engine evaluates it, and
 * what the session holds against it.
 *
 * Every word of the payload is the record's own — its identifier, its title, the `evaluationStatus`
 * that says whether the engine runs it, and the `ruleText` the engine applies — and the formula names
 * contracts §7.2 rather than re-deriving a verdict here, because the engine that composes a decision
 * runs in this browser and records each decision as a trail event citing the rule it applied (rule
 * P-6). The label follows the record's own status: a rule the engine runs is the `Simulated control`
 * mechanism, and a rule the deployment only declares carries the fixed `Declared, not verified` label
 * every declared control on SCR-07 carries (rules P-1 and P-4).
 *
 * @param ctx - The call's context: the trail and the pending requests the payload lists beside the record.
 * @param policy - The policy the reference named.
 * @returns The policy's evidence payload.
 */
function policyEvidence(ctx: HandlerContext, policy: SeededPolicy): Evidence {
  const decisions = ctx.state.auditEvents
    .filter((event) => event.policyId === policy.id)
    .map((event) => event.id);
  const requests = ctx.state.policyExceptions
    .filter((request) => request.policyId === policy.id)
    .map((request) => `${request.policyId} request by ${request.requestedBy} (${request.status})`);
  const evaluated = policy.evaluationStatus === EVALUATED_STATUS;

  return {
    value: evaluated
      ? `Policy ${policy.id} (${policy.title}) is a rule the policy engine evaluates`
      : `Policy ${policy.id} (${policy.title}) is declared configuration the policy engine does not evaluate`,
    provenance: 'first_party',
    label: evaluated ? SIMULATED_CONTROL : DECLARED_LABEL,
    formula:
      'The policy set, the rule each member states and the plain reason a denial carries are fixed by ' +
      'contracts §7.2, and a decision the engine makes is recorded as a trail event citing the policy it ' +
      'applied (contracts §6). ' +
      (decisions.length === 0
        ? 'No decision recorded in this session cites this policy.'
        : 'Decisions recorded in this session cite this policy.'),
    inputs: [
      `id = ${policy.id}`,
      `title = ${policy.title}`,
      `evaluationStatus = ${policy.evaluationStatus}`,
      `ruleText = ${policy.ruleText}`,
    ],
    upstream: uniqueRefs([policy.id]),
    downstream: uniqueRefs([...decisions, ...requests]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The evidence behind one row of the outbound ledger: the two counts the audit trail supports, beside
 * the declared configuration the row states them under.
 *
 * The counts are the ledger aggregate's own — `computeLedger` over the session's trail and the declared
 * record, which is the same computation the screen renders — so the payload recounts nothing and the
 * number a reader opens cannot disagree with the number the row prints (rule P-6, AAP 0.8). The window
 * is the `LEDGER_WINDOW_DAYS` constant, which is also the constant that aggregate measures against, so
 * the sentence cannot name a window the counts were not taken over.
 *
 * The trail is read once. The events whose `objectRef` is the endpoint are selected in a single pass,
 * and that one selection answers both halves of the payload: the counts and the last attempt come from
 * handing it to `computeLedger`, and the attempt identifiers come from the same slice, so the counts and
 * the attempt list cannot be drawn from two different readings of the trail (AAP 0.2.1). The row is the
 * one the whole trail yields, because the aggregate counts only the events whose object reference is
 * that endpoint and derives `lastAttempt` from those same events, so narrowing its input removes work
 * and no figure. `upstream` stays the trail's own order, de-duplicated as every reference list here is.
 *
 * @param ctx - The call's context: the trail the counts come from and the declared configuration.
 * @param endpoint - The declared ledger row the reference named, whose counted members are the aggregate's.
 * @returns The endpoint's evidence payload.
 * @throws Problem - A `'not-found'` failure when the aggregate returns no row for the declared endpoint,
 *   which can only happen when the record set no longer declares it.
 */
function outboundEndpointEvidence(
  ctx: HandlerContext,
  endpoint: SeedRecordSet['sovereignty']['ledger'][number],
): Evidence {
  /*
   * One selection of the trail, read by both halves of the payload. The aggregate counts only the
   * events whose object reference is the endpoint, so handing it these events gives the row the whole
   * trail would give, and the attempt ids below come from the same slice rather than from a second
   * filter of everything (AAP 0.2.1).
   */
  const namingEndpoint = ctx.state.auditEvents.filter(
    (event) => event.objectRef === endpoint.endpoint,
  );
  const row = computeLedger(
    namingEndpoint,
    ctx.state.records.sovereignty,
    DEMO_CLOCK,
  ).find((candidate) => candidate.endpoint === endpoint.endpoint);

  if (row === undefined) {
    throw notFoundProblem(
      ctx,
      `The deployment record no longer declares the outbound endpoint ${endpoint.endpoint}, so the counts the ledger supports for it cannot be reported.`,
    );
  }

  const attempts = namingEndpoint.map((event) => event.id);

  return {
    value: `${row.allowed} allowed and ${row.blocked} blocked over the last ${LEDGER_WINDOW_DAYS} days`,
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula:
      'The ledger aggregate of contracts §5 counts, for one declared outbound endpoint, the audit events ' +
      'whose object reference is that endpoint, split by result: the allowed column counts the events ' +
      `recorded as allowed and the blocked column those recorded as blocked, over the ${LEDGER_WINDOW_DAYS} ` +
      "calendar days ending on the demonstration clock's own day, both ends included. This payload reads " +
      'that aggregate and recounts nothing.',
    inputs: [
      `endpoint = ${row.endpoint}`,
      `purpose = ${row.purpose}`,
      `state = ${row.state}`,
      `allowed = ${row.allowed}`,
      `blocked = ${row.blocked}`,
      `lastAttempt = ${row.lastAttempt ?? 'no attempt recorded'}`,
    ],
    upstream: uniqueRefs(attempts),
    downstream: uniqueRefs([
      `SCR-07 outbound ledger row ${row.endpoint}`,
      'evidence pack outboundLedger section',
    ]),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
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
 * record is known; a market-intelligence reference is refused to a persona that may not read the atlas
 * pack, so a reference cannot reach a record `getAtlas` would have withheld; a canvas node — which
 * reaches several plants rather than belonging to one — is narrowed over every plant the records place
 * it in, by `assertNodeReach`; an exception, a scenario or an approval is narrowed over every plant the
 * exception it belongs to touches, by `assertExceptionReach`, which is the set the exception queue admits
 * the record by; a pin is refused when `listVisiblePins` would not have released it, so a reference
 * cannot reach a pin the read filter withholds; a customer-confidential document is withheld from a
 * persona that may not read its body, exactly as `getDocument` withholds it; and a record of another
 * read — one event of the audit trail, one policy, one row of the declared outbound ledger — is refused
 * to a persona that read would refuse, by `assertFamilyReadable`, so the evidence behind a record is
 * exactly as readable as the record itself.
 *
 * A composed aggregate reference is answered from the aggregate read's own output (AAP 0.2.1 F12), so
 * the drawer states the figure the composing screen showed rather than a second computation of it, and
 * its admission is decided where that figure is resolved: `aggregateOf` refuses a `plant/<plantId>/…` key
 * as `'not-found'` when the resolved selection carries no such row, and every aggregate read enforces the
 * family's read permission itself, so no second plant check narrows the figure below the one a reader's
 * own screen drew.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param ref - The reference the displayed element carries.
 * @returns The evidence payload the drawer renders.
 * @throws Problem - `'permission'` when the persona may not read evidence, when the record lies outside
 *   every plant of the scope its family is admitted by, when a pin is outside what the persona may see,
 *   when a customer-confidential document's body is withheld from it, when it may not read the audit
 *   trail, the policy set or the declared configuration the record is one of, or when it may not read
 *   the family an aggregate belongs to; `'not-found'` when no record or aggregate answers the reference;
 *   `'validation'` when a composed reference carries a query parameter the grammar does not answer.
 */
export async function getEvidence(ctx: HandlerContext, ref: string): Promise<Evidence> {
  assertEvidenceRead(ctx);

  const resolved = await resolveRef(ctx, ref.trim());

  if (isPackFamily(resolved)) {
    assertPackReach(ctx);
  }

  if (isNodeRef(resolved)) {
    assertNodeReach(ctx, resolved);
  } else if (isExceptionRef(resolved)) {
    assertExceptionReach(ctx, resolved);
  } else {
    const subject = subjectOf(ctx, resolved);

    if (subject !== null) {
      assertPlantReach(ctx, subject);
    }
  }

  if (
    resolved.family === 'pin' &&
    !pinVisibleTo(ctx, resolved.record, pinAudienceOf(ctx))
  ) {
    throw permissionProblem(
      ctx,
      EVIDENCE_READ,
      `Evidence pin ${resolved.record.id} is not one the acting persona (${ctx.actor.id}) may see: a pin is released to the plant scope of the acting role, or to the vendor the persona's own records attribute to it.`,
    );
  }

  if (resolved.family === 'document') {
    assertDocumentBodyReadable(ctx, resolved.record);
  }

  if (isFamilyWithOwnRead(resolved)) {
    assertFamilyReadable(ctx, resolved);
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
 * @param ctx - The call's context, whose trace a refusal carries.
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
 * from. A node no record places returns nothing, and the pin filter treats that as "no plant to narrow
 * this pin by" rather than as "in scope": a pin the records place nowhere is released only to a persona
 * whose own records attribute its vendor to it, because withholding another party's evidence is
 * recoverable and releasing it is not.
 *
 * Exported for the identifier search, which narrows the node families it indexes by the same reach: a
 * supplier, a tier-2 origin or a customer is offered to exactly the plant scopes whose pins the reads
 * release, so the search and the reads cannot disagree about where a node lies.
 *
 * @param records - The session's record set.
 * @param nodeRef - The node a pin is attached to.
 * @returns The plants the records place that node in, in record order.
 */
export function plantsOfNode(records: SeedRecordSet, nodeRef: string): PlantId[] {
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
 * Nothing here decides for itself which supplier a persona works for: rule P-6 forbids typing a record
 * and rule P-7 confines the product's parties to the seeded set, so the attribution is read rather than
 * invented.
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
 * The audience one evidence read is narrowed by: the suppliers the session's records attribute to the
 * acting persona, and the plants the records place the nodes that read looks at in.
 *
 * It is built once per call and kept nowhere. A role switch must be served the new persona's own
 * audience and never the one resolved for the persona before it, so nothing here may outlive the
 * request that derived it: the pin filter asks who is reading, and what the records place each node in,
 * on every read, which is how the adapter's own enforcement stays true to the persona the call acts as
 * rather than to the last one (rule P-3, AAP 0.18.2).
 *
 * `plantsByNode` fills as the read walks its pins, so a node several pins hang on is resolved from the
 * records once and that answer serves the rest of the same read only.
 *
 * Exported with {@link pinAudienceOf} for the identifier search, which resolves one audience per index
 * it builds and hands it to {@link pinVisibleTo} for every pin it places: the index then narrows pins by
 * the same rule, and at the same cost per read, as the pin list the pins come from.
 */
export interface PinAudience {
  /** The suppliers the records attribute to the acting persona, declared vendors first. */
  readonly vendors: readonly SupplierId[];

  /** The plants the records place each node of this read in, keyed by node reference. */
  readonly plantsByNode: Map<string, PlantId[]>;
}

/**
 * The audience the acting persona's pin filter is narrowed by, resolved once for one read.
 *
 * `vendorsFor` runs here and nowhere else in a read, so a page of pins costs one scan of the persona
 * records and one of the exception set rather than one of each per pin. The plant half is resolved
 * lazily, by `plantsOfNodeOnce`, because the external supplier engineer's narrowing never needs it.
 *
 * Nothing about the audience is retained between calls: a role switch must never be served another
 * persona's audience, so the reach is re-derived for the persona the call acts as, which is what keeps
 * the adapter's enforcement (rule P-3) a decision about this caller rather than about the previous one.
 *
 * The pin reads are conformance-only in this run: the pin screens belong to stage S4 (AAP 0.12.3), so
 * no S1-S3 screen depends on the filter either way.
 *
 * @param ctx - The call's context: the persona the audience is resolved for and the records it is read from.
 * @returns The audience for this call, with no node resolved yet.
 */
export function pinAudienceOf(ctx: HandlerContext): PinAudience {
  return { vendors: vendorsFor(ctx.state.records, ctx.actor), plantsByNode: new Map() };
}

/**
 * The plants the records place one node in, resolved from the records at most once per read.
 *
 * `plantsOfNode` is several scans of the node families, and a node carries several pins, so the read
 * keeps the first answer it derives and hands it back for every later pin on the same node. The map
 * this fills belongs to the call's own `PinAudience` and is discarded with it, so no node is ever
 * answered from another read or from another persona.
 *
 * @param records - The session's record set.
 * @param audience - The audience this read is narrowed by, whose node half this fills.
 * @param nodeRef - The node a pin is attached to.
 * @returns The plants the records place that node in, in record order.
 */
function plantsOfNodeOnce(
  records: SeedRecordSet,
  audience: PinAudience,
  nodeRef: string,
): PlantId[] {
  const resolved = audience.plantsByNode.get(nodeRef);

  if (resolved !== undefined) {
    return resolved;
  }

  const plants = plantsOfNode(records, nodeRef);
  audience.plantsByNode.set(nodeRef, plants);

  return plants;
}

/**
 * Whether one pin is inside what the acting persona may see.
 *
 * Two narrowings, decided against one persona. The suppliers the records attribute to the acting
 * persona arrive resolved, once for the whole read (`pinAudienceOf`), and both halves read that one set
 * rather than deriving it again per pin. An external supplier engineer sees only the pins its own
 * vendor's evidence carries, which is the vendor-scoped read AAP 0.2.1 names and the reason a pin on a
 * supplier node records that supplier. Every other role sees the pins of the plants its scope admits,
 * decided by the same matrix and the same persona scope every scoped read uses; a pin on a node the
 * records place in no plant has no plant to narrow it by, so it is released only when it names a vendor
 * that set holds, and withheld otherwise. Both halves therefore close on the same empty set, because
 * withholding another party's evidence is recoverable and releasing it is not.
 *
 * Exported for the identifier search, which offers a pin's identifier only where this predicate releases
 * the pin itself: the vendor-scoped read AAP 0.2.1 names then decides the index and the list from one
 * rule, so a persona is never offered an identifier that the read behind it refuses.
 *
 * @param ctx - The call's context: the persona and the records its reach is resolved from.
 * @param pin - The pin under consideration.
 * @param audience - The persona's audience for this call, resolved once by `pinAudienceOf`.
 * @returns `true` when the pin may be released to this persona.
 */
export function pinVisibleTo(ctx: HandlerContext, pin: EvidencePin, audience: PinAudience): boolean {
  const namesOwnVendor = pin.vendorId !== undefined && audience.vendors.includes(pin.vendorId);

  if (ctx.actor.role === EXTERNAL_SUPPLIER_ROLE) {
    return namesOwnVendor;
  }

  const plants = plantsOfNodeOnce(ctx.state.records, audience, pin.nodeRef);

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
 * attribute to it. That audience is resolved once for the whole read — the vendors `vendorsFor` unions,
 * and each node's plants the first time a pin on that node is judged — so the records are asked about a
 * node once for the page rather than once for every pin hanging on it.
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
 *   trigger is in effect; a `'validation'` failure when the cursor names no record of the ordered page
 *   or the limit bounds no page.
 */
export async function listVisiblePins(
  ctx: HandlerContext,
  query: ListQuery,
  nodeId?: string,
): Promise<EvidencePin[]> {
  assertEvidenceRead(ctx);

  const audience = pinAudienceOf(ctx);
  const visible = ctx.state.records.evidencePins
    .filter((pin) => nodeId === undefined || pin.nodeRef === nodeId)
    .filter((pin) => pinVisibleTo(ctx, pin, audience));
  const order = sortOrderOf(isPinSortField, query.sort);
  const ordered =
    order === null ? visible : [...visible].sort((left, right) => comparePins(left, right, order));
  const start = startIndexFor(ordered, query.cursor, (pin) => pin.id, ctx, 'pin');

  return ordered
    .slice(start, start + listLimitOf(ctx, query.limit, 'pin'))
    .map((pin) => ({ ...pin }));
}

/* ---------------------------------------------------------------------------------------------
 * The package records — contracts §8, AAP 0.12.2. Conformance-only: stage S4 owns their screens
 * ------------------------------------------------------------------------------------------- */

/**
 * The package a reference names, or a refusal.
 *
 * @param ctx - The call's context, whose records are searched and whose trace the failure carries.
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
 * The two decisions an element review answers, spelled from the contracts §8 act they describe.
 *
 * `ElementReviewDecision` is a compile-time union, which the build erases: a caller that reaches this
 * family without the type — a browser console can — sends any other string, and nothing in the runtime
 * would refuse it. This tuple is the membership the write tests against, so the two members are stated
 * once and {@link reviewedDecision} and the refusal it throws cannot disagree about them.
 */
const ELEMENT_REVIEW_DECISIONS = ['accept', 'correct'] as const satisfies readonly ElementReviewDecision[];

/**
 * The decision the review stated, once it is known to be one an element review answers.
 *
 * The extracted value is either accepted as the extraction produced it or corrected to the value the
 * reviewer supplies (contracts §8), and both dispositions are decided from this member: `stateAfterReview`
 * reads it as an acceptance whenever it is not a correction, and the audit event's payload records it
 * verbatim. A value outside the two members is therefore refused here, before either happens, so an
 * out-of-union decision cannot set an element's state, mark it reviewed, or be written into the trail —
 * the refusal `./approvals.ts`'s `statusForDecision` states for an approval decision, for the same reason.
 *
 * @param ctx - The call's context, whose trace the failure carries.
 * @param decision - The decision the review stated.
 * @returns The same member, known to be one of the two an element review answers.
 * @throws Problem - A `'validation'` failure naming the value the review stated and the two members,
 *   which a typed caller cannot produce and a browser console can.
 */
function reviewedDecision(
  ctx: HandlerContext,
  decision: ElementReviewDecision,
): ElementReviewDecision {
  const stated = String(decision);

  if (ELEMENT_REVIEW_DECISIONS.some((member) => member === stated)) {
    return decision;
  }

  throw validationProblem(
    ctx,
    `The review states the decision "${stated}", which is not one an element review answers: an extracted value is accepted ("accept") as the extraction produced it, or corrected ("correct") to the value the reviewer supplies.`,
  );
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
 * @param decision - The decision the review stated, which `reviewedDecision` narrowed to one of the two
 *   members an element review answers.
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
 * The list gates on `evidence.read` before it reads any record, the order every other collection read
 * in this family takes: an empty record set then refuses exactly as a populated one does, rather than
 * answering a page of nothing to a role the matrix does not admit. Its rows are then copied through
 * `copyPackage`, the same copy rule the detail read applies (AAP 0.12.3), so one rule serves the list
 * and the detail and a read of the whole collection does not re-ask the permission or re-search the
 * records once per row. Readiness travels on the record — it is the package's own whole-percent figure
 * and no percentage is computed here (rule P-6).
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
 *   trigger is in effect; a `'validation'` failure when the cursor names no record of the ordered page
 *   or the limit bounds no page.
 */
export async function listPackages(
  ctx: HandlerContext,
  query: ListQuery,
): Promise<PpapPackage[]> {
  assertEvidenceRead(ctx);

  const packages = ctx.state.records.ppapPackages.map((record) => copyPackage(record));

  const order = sortOrderOf(isPackageSortField, query.sort);
  const ordered =
    order === null
      ? packages
      : [...packages].sort((left, right) => comparePackages(left, right, order));
  const start = startIndexFor(ordered, query.cursor, (partPackage) => partPackage.id, ctx, 'package');

  return ordered.slice(start, start + listLimitOf(ctx, query.limit, 'package'));
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
 * The reviewer is the acting persona, and the permission the write requires is `evidence.review`. The
 * decision the review states is read through `reviewedDecision` first, so a value that is neither of
 * the two members is refused before the record is read and before the event is appended.
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
 *   when the review states a decision outside the two an element review answers — `accept` and
 *   `correct` — when it contradicts the arguments it arrived with, when it carries no corrected value,
 *   or when it carries one longer than `FREE_TEXT_MAX_LENGTH`.
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

  const decision = reviewedDecision(ctx, review.decision);
  const packageRecord = findPackage(ctx, packageId);
  const element = packageRecord.elements.find((candidate) => candidate.number === elementNumber);

  if (element === undefined) {
    throw notFoundProblem(
      ctx,
      `Part approval package ${packageId} holds no element numbered ${elementNumber}, so no value of it can be reviewed.`,
    );
  }

  const correctedValue = review.correctedValue.trim();

  if (decision === 'correct' && correctedValue === '') {
    throw validationProblem(
      ctx,
      `A correction of element ${elementNumber} of package ${packageId} has to carry the value the reviewer supplies; this review supplies none.`,
    );
  }

  if (decision === 'correct') {
    /*
     * The corrected value is the one free-text member this family stores: it becomes the element's own
     * reading and travels in the audit event's payload, so the same ceiling the exceptions, approvals
     * and governance writes apply to their prose applies here.
     */
    assertFreeTextLength(
      ctx,
      `a corrected value for element ${elementNumber} of package ${packageId}`,
      correctedValue,
    );
  }

  const previousState = element.state;
  const nextState = stateAfterReview(packageRecord, element, decision);
  const nextActual = decision === 'correct' ? correctedValue : element.actual;

  await appendAuditEvent(ctx, {
    action: 'extraction review',
    objectRef: packageRecord.id,
    result: 'succeeded',
    before: { element: element.number, state: previousState, actual: element.actual },
    after: { element: element.number, state: nextState, actual: nextActual, decision },
  });

  element.actual = nextActual;
  element.humanReviewed = true;
  element.state = nextState;
  packageRecord.readinessPercent = readinessOf(packageRecord);

  return copyPackage(packageRecord);
}
