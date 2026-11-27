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
 * not the defence against it. The verdict itself is stated once, by `mayReadDocumentBody`, because the
 * service has two paths that could carry a body — a document read and an answer — and the assistant
 * family calls the same predicate so the two cannot answer differently.
 *
 * WHAT IT COMPUTES AND WHAT IT ONLY REPORTS — rule P-6. It computes no business figure. Every number
 * an evidence payload states is a field of the record that carries it or an aggregate read's own
 * output, quoted as that read reports it, and the `formula` member names the contracts §4 rule or §5
 * aggregate that owns the figure instead of re-deriving it. The one exception is the package readiness
 * figure entities §3 defines as a computed value: it is produced by `wholePercent`, the single
 * whole-percent rule the codebase holds, from the package's own element count, and this module never
 * divides by a constant of its own. No currency amount, no record identifier and no expected result is
 * typed here, nothing imports `tests/fixtures/`, and no figure is formatted here beyond stating an
 * amount with its currency and a count as it arrived.
 *
 * THE RESOLUTION ORDER, STATED ONCE — `getEvidence`. A reference selects its family by its own shape:
 * a composed figure by its root, an atlas series by `atlas:`, a record by its identifier prefix. Each
 * family then looks its own records up by exact identifier. The order below is the order the lookup
 * walks, and it is deterministic: the two composed roots first, because they are the screens' own
 * references and match no identifier prefix; then `atlas:`; then the record families with the longer
 * prefixes first, so `PPAP-` is tested before `PO-` and `POL-` before the shorter `PO-`; then the four
 * families the atlas's own marks carry, so the evidence behind a crossing, a competitor site or network
 * and a radar reading is exactly as readable as the mark itself; then the seven node families the
 * topology and the impact chain carry; and last the one family with no prefix, the declared outbound
 * endpoint, which is selected by the endpoint string its ledger row states. A reference matching no family, or matching one whose records hold no such identifier, is
 * refused as `'not-found'` naming the reference. There is no fuzzy match, no prefix search over the
 * records and no fall-back to "the first record" — a drawer that silently showed a neighbouring figure
 * would be worse than one that reports the reference it could not resolve. The families, in order:
 * composed aggregate (`overview:`, `canvas:`), atlas series (`atlas:`), package, exception, scenario,
 * approval, audit event, evidence pin, document, customer order, policy, purchase order, shared
 * chokepoint, competitor site and network, radar series reading, plant, supplier, origin, customer,
 * material, production line, product, outbound endpoint.
 *
 * THE COMPOSED AGGREGATE REFERENCE — AAP 0.2.1 F12, principle PR-6. A computed figure has no record
 * identifier of its own, so the two surfaces that draw one compose a reference naming the aggregate and
 * the shell selection it was read under: `<root>:<key>` when nothing is selected, and
 * `<root>:<key>?plants=<ids>&products=<ids>` when the top bar's filters name plants or a product, each
 * list present only when it is non-empty, comma-separated and trimmed. The root, `overview` or
 * `canvas`, records which surface composed the reference, and both roots accept every key because the
 * two surfaces draw the same aggregates. The keys are the six ribbon aggregates (`open-exceptions`,
 * `critical-exceptions`, `revenue-at-risk`, `customer-orders-at-risk`,
 * `median-hours-to-approved-plan`, `plants-in-scope`), one plant's two readings
 * (`plant/<plantId>/open-exceptions`, `plant/<plantId>/revenue-at-risk`) and one day of the
 * opened-and-resolved series
 * (`day/<IsoDate>/open`, `day/<IsoDate>/resolved`). The payload is the aggregate read's own output:
 * the selection is read the way the adapter reads a `Scope`, so the one `resolveScope` narrows the
 * drawer's figure exactly as it narrowed the screen's (AAP 0.2.1), and the figure is re-read through
 * `getOverview` — or `getCanvasRibbon` for the ribbon's critical count, which only that read computes —
 * rather than re-derived here. An unknown key, a query parameter this grammar does not carry, and a
 * key whose subject the read does not carry are each refused with a typed `Problem`, and so is a
 * selection that cannot be read: an empty value, a blank entry, a parameter stated twice, a plant or a
 * product the records do not hold, and a second product list are refused rather than trimmed or
 * widened, because a drawer computed over a population the reference did not name would state a figure
 * the screen never drew.
 *
 * THE ATLAS FAMILIES ANSWER THE MARKS SCR-13 DRAWS — AAP 0.2.1 F12, AAP 0.12.4. The competitive atlas
 * draws one mark per radar reading, per site and per shared crossing, and every one of them opens the
 * record behind it, so this read resolves four further families beside the composed `atlas:` series:
 * `CHK-nn`, one crossing of the simulated market-intelligence pack; `CMP-nn-Sn`, a competitor's site,
 * and `CMP-nn`, the network that owns it; `SER-…`, one radar reading, written `<series id>` for the
 * whole series or `<series id>#<axis id>` for the single score a vertex draws; and `PLT-…`, one of the
 * client's own plants, which is the client site the network view places. A `#` naming no axis of the
 * pack, a series the pack does not hold, and a series carrying no score at the axis it was asked for
 * are all refused as `'not-found'` naming the reference, like every other unresolvable identifier.
 * The pack is not plant-scoped and it is not reachable without its own permission (rule P-5, AAP 0.8):
 * a crossing, a competitor's site or network and a radar reading carry no plant subject, so `subjectOf`
 * narrows none of them, and they are refused to a persona that may not read the pack at all, because
 * `getAtlas` withholds the whole read from that persona and a reference must not reach a record the
 * corresponding list read would have withheld. A client plant is a plant-scoped first-party record and
 * is narrowed to the acting persona's plant scope exactly as every other record that names a plant is.
 *
 * THE TWO FAMILIES SCR-07 OPENS ITS FIGURES FROM — principle PR-6, rule P-6. A ledger count and a
 * policy identifier are figures the governance screen prints, so each of them has to open its evidence
 * the way any other figure does (AAP 0.2.1 F12). Neither underlying record carries a reference to
 * hold, and `LedgerRow`, `PolicyDetail` and `Evidence` are not widened from a handler — contracts §3
 * fixes their members — so the reference is one the record already states: a policy is named by its
 * own identifier, and an outbound endpoint by the endpoint string the declared configuration gives it,
 * which is that ledger row's own key. The endpoint family is therefore the one family selected by an
 * exact declared value rather than by a prefix, and it is tested after every prefix branch so that no
 * prefix can shadow it.
 *
 * THE FOUR TOPOLOGY NODE FAMILIES ARE RECORDS — AAP 0.2.1 F12. The FileMap canvas draws nodes that are
 * the seed records themselves: `src/services/mock/handlers/topology.ts` copies each plant, supplier,
 * tier-2 origin and customer into its node, so the node identifier IS the record identifier and the
 * evidence read resolves it like any other reference. A node is placed in no single plant — a supplier
 * reaches every plant its materials and orders serve, an origin every plant of the suppliers it feeds,
 * a customer every plant its orders ship from — so a node's plant scope is decided over the plants the
 * records place it in rather than by one subject, which is what `assertNodeReach` does.
 *
 * THE SCENARIO FAMILY ANSWERS TWO KINDS OF OPTION — AAP 0.12.4, rule PR-6. An option a screen shows is
 * either a record the dataset ships or one the adapter measures from an exception's own solver case, and
 * both are figures with a record behind them: the shipped sets are read here and the measured set is
 * read through the sibling `handlers/scenarios.ts`, which is the module that produces it for a screen.
 * Without the second answer every comparison column of the measured exception — the case AAP 0.7 and
 * AAP 0.8 fix, and the option the sandbox duplicates — would open the drawer's failure region instead of
 * its four sections.
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
 * - P-5: every payload states the provenance of the one record it reports — `market_intelligence` for a
 *   crossing, a competitor's site or network and a competitor's radar reading, `first_party` for a node,
 *   a client plant and the client's own self-assessment series, `computed` for a composed aggregate —
 *   and no payload carries a member from the other family, so nothing here can blend a market figure
 *   with a first-party one in a single number.
 * - P-6, P-7: it types no figure, amount or record identifier, reads no fixture, and names no company,
 *   person or vendor of its own; every name it returns is a field of a seeded record.
 * - B-1, B-2: it reads memory and nothing else — no address, no fetch, no environment read, no
 *   credential — and it holds no configuration.
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the permission matrix, the one rounding rule, the shared vocabulary and the siblings
 * ------------------------------------------------------------------------------------------- */

import { computeLedger } from '../../../domain/aggregation/ledger';
import { resolveScope } from '../../../domain/aggregation/scope';
import type { ScopeFilterInput } from '../../../domain/aggregation/scope';
import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import type { ScopedSubject } from '../../../domain/policy/permissions';
import { wholePercent } from '../../../domain/solver/rounding';
import { CLIENT_SELF_ASSESSMENT_LABEL, DEMO_CLOCK, LEDGER_WINDOW_DAYS, SIM_LABELS } from '../../../types';
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
import { getAtlas } from './atlas';
import { appendAuditEvent } from './audit';
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

/** The separator between a series identifier and the axis a single radar reading sits on. */
const AXIS_SEPARATOR = '#';

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
 * Whether a resolved reference is one of the four node families of the FileMap canvas.
 *
 * Written as a type guard over the union's own discriminant, so `assertNodeReach` and the four node
 * builders can take a node and nothing else: the compiler then proves no plant-scoped record is
 * narrowed by the node rule, and no node by a single plant.
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
 * AAP 0.2.1 and AAP 0.12.3 require.
 *
 * A body is withheld only when the record classifies it customer-confidential and the acting role does
 * not hold `document.confidential.read`; every other classification is released to every persona that
 * may read evidence at all, which the callers check first. The verdict comes from the contracts §7.1
 * matrix through `hasPermission` with no subject, because a document carries no plant of its own and
 * the permission is not plant-scoped.
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
 * Refuses the call when the acting persona may not read the simulated market-intelligence pack.
 *
 * A crossing, a competitor's site or network and a radar reading are records of the atlas read, and
 * `getAtlas` withholds that whole read from a role without `competitive.read` (AAP 0.12.3). Asking the
 * same question here is what keeps a reference from reaching a record the corresponding list read would
 * have withheld: the evidence behind a competitor's mark is exactly as readable as the mark itself. The
 * permission is evaluated with no subject because the pack is not plant-scoped, so the role's matrix
 * alone decides it. The forbidden trigger refuses it as it refuses every read of this family, so the
 * state the simulation popover demonstrates is the state a real refusal produces.
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

  if (!hasPermission(ctx.actor.role, COMPETITIVE_READ, null, ctx.actor)) {
    throw permissionProblem(
      ctx,
      COMPETITIVE_READ,
      `The acting role (${ctx.actor.role}) does not hold the ${COMPETITIVE_READ} permission, so the simulated market-intelligence record behind an atlas mark is not readable here.`,
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
    'The plants in scope are the plants the resolved scope carries a risk-by-plant row for, which is ' +
    "the grouping contracts §5's by-plant aggregate builds. The figure is the aggregate read's own " +
    'output: this payload quotes it and recomputes nothing.',
};

/**
 * The text of one amount, as an evidence payload states it: the number and the currency.
 *
 * Presentation belongs to `src/components/mono-value.tsx`, the interface's one money formatter, which
 * a service module may not reach (rule P-2). The drawer therefore states the aggregate's own number
 * with `EUR` beside it and groups nothing, so the figure a reader compares is the one the read
 * reported rather than a second rendering of it.
 *
 * @param amount - The amount the aggregate reported.
 * @returns The amount and its currency, ungrouped.
 */
function amountText(amount: number): string {
  return `${amount} EUR`;
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
 * One composed aggregate reference, resolved to the drawer's payload and to the plant it concerns.
 *
 * The plant is carried beside the payload because a `plant/<plantId>/…` reference is a plant-scoped
 * figure, and `getEvidence` narrows every plant-scoped subject through `assertPlantReach` exactly as
 * it narrows a record family (contracts §7.1).
 */
interface AggregateFigure {
  /** The payload the drawer renders. */
  readonly evidence: Evidence;

  /** The plant the figure belongs to, or `null` when it belongs to no single plant. */
  readonly plantId: PlantId | null;
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
): Evidence {
  return {
    value: overviewAggregateValue(overview, key),
    provenance: 'computed',
    label: SIMULATED_CALCULATION,
    formula: AGGREGATE_FORMULAS[key],
    inputs: [
      ...aggregateInputs(root, selection),
      ...(key === MEDIAN_HOURS_KEY
        ? [`${MEDIAN_HOURS_KEY} = ${overview.medianHoursToApprovedPlan}`]
        : overview.byPlant.map(plantRowInput)),
    ],
    upstream: key === MEDIAN_HOURS_KEY ? [] : overview.byPlant.map((row) => row.plantId),
    downstream: copiedByOtherSurface(root, key),
    confidence: recordConfidence(),
    missingInputs: [],
    documents: [],
  };
}

/**
 * The value one of the overview's aggregates states, with its unit, as the read reports it.
 *
 * A money figure carries the currency and no grouping, the median carries its hours, the plant count
 * its plants and the two exception counts their exceptions, so a drawer's `value` reads as the figure
 * the screen showed rather than as a number without a unit (AAP §0.12.2's `Evidence.value`).
 *
 * @param overview - The aggregate read's payload.
 * @param key - The aggregate the reference named.
 * @returns The value sentence.
 */
function overviewAggregateValue(overview: Overview, key: SharedAggregateKey): string {
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
      return `${overview.byPlant.length} plants in scope`;
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

  return {
    value:
      series === DAY_OPEN_READING
        ? `${figure} exceptions opened on ${point.date}`
        : `${figure} exceptions resolved on ${point.date}`,
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
 * @returns The payload and the plant the figure belongs to, if any.
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
          plantId: null,
          evidence: await criticalExceptionsEvidence(ctx, ref, composed.root, selection),
        };
      }

      const overview = await getOverview(ctx, selection);

      return {
        plantId: null,
        evidence: overviewAggregateEvidence(overview, composed.root, selection, key.key),
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
        plantId: row.plantId,
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
        plantId: null,
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
 * The record an evidence reference resolved to.
 *
 * A discriminated union over the families the resolution order names, so the payload builder below can
 * switch over the family and the compiler proves every family is handled: a family added to the union
 * without a builder case does not compile. The record is the session's own record by reference, read
 * and never modified here; the composed aggregate family carries the payload its own read produced,
 * because the figure it names is an aggregate's output rather than a record's field, and the atlas
 * families carry what the record alone cannot answer — the network a competitor's site belongs to, and
 * the one axis a radar reference named — both resolved here so the builders below stay total.
 */
type ResolvedRef =
  | { readonly family: 'aggregate'; readonly figure: AggregateFigure }
  | {
      readonly family: 'atlas-series';
      readonly series: AtlasSeries;
      readonly axes: readonly RadarAxis[];
    }
  | { readonly family: 'package'; readonly record: PpapPackage }
  | { readonly family: 'exception'; readonly record: OperationalException }
  | { readonly family: 'scenario'; readonly record: Scenario }
  | { readonly family: 'approval'; readonly record: Approval }
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
 * The four arms of {@link ResolvedRef} that stand for a node of the FileMap canvas.
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
 * Resolves one reference to the record that answers it, in the module's documented order.
 *
 * The root or the prefix selects the family and that family's own records are then searched for the
 * exact identifier, so a reference either names a record the session holds or is refused. The order is
 * the one this module's header states — composed aggregate, atlas series, package, exception, scenario,
 * approval, audit event, pin, document, customer order, policy, purchase order, shared chokepoint,
 * competitor site and network, radar series reading, then the seven node families and the declared
 * outbound endpoint — and it is written out here rather than derived from a table so a reader can see
 * it. `PPAP-` is tested first among the record families because a package identifier begins with the
 * two letters a purchase order's begins with, and a shorter prefix tested first would shadow it;
 * `POL-` is tested before the shorter `PO-` for the same longer-prefix-first reason, and the two cannot
 * actually collide, because a policy identifier's third character is a letter where a purchase order's
 * is the separator. The composed roots are tested before every prefix because `overview:` and
 * `canvas:` match none of them, and the endpoint family is tested once every prefix branch has declined
 * the reference, so no prefix can shadow an endpoint and no endpoint can be read as an identifier.
 *
 * Two families resolve more than one record. A `CMP-` reference is looked up as a site across the
 * pack's networks first and as a network second, so a site identifier answers with the network that
 * owns it as well. A radar reference is split at its `#`: the series is looked up either way, and the
 * axis is then looked up among the pack's own axes and read at the position that list gives it, because
 * `AtlasSeries.values` is aligned to the axis order and carries no axis name of its own.
 *
 * The scenario family is the one family whose records are not all in one list. The options the dataset
 * ships are scanned in place, and the options measured from an exception's own solver case are answered
 * by `scenarioForReference` in the sibling `handlers/scenarios.ts` — the module that produces that set
 * for the comparison screen — after that scan and before the refusal. Both are exact-identifier
 * lookups: the second reads the set the records state and never searches for a prefix or a neighbour.
 *
 * The messages of the refusals quote the reference the caller sent, never a neighbour's identifier:
 * an unresolvable drawer reports what it could not resolve.
 *
 * The function is asynchronous because a composed aggregate reference is answered by re-reading the
 * aggregate that computes it; every other family resolves from the records already in hand.
 *
 * @param ctx - The call's context, whose records are searched and whose trace the failure carries.
 * @param ref - The reference the displayed element carries.
 * @returns The family and the record it names, or the composed figure's own payload.
 * @throws Problem - A `'not-found'` failure naming the reference when no record answers it, a
 *   `'validation'` failure naming a query parameter a composed reference cannot carry, or the failure
 *   the aggregate read itself raises for a figure it may not serve.
 */
async function resolveRef(ctx: HandlerContext, ref: string): Promise<ResolvedRef> {
  const records = ctx.state.records;
  const composed = composedReferenceOf(ref);

  if (composed !== null) {
    return resolveComposed(ctx, ref, composed);
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
    // The sets the dataset ships first, so a shipped option answers with the record the dataset holds
    // rather than with a measurement of the same position.
    for (const seeded of records.exceptionScenarios) {
      const found = seeded.scenarioSet.scenarios.find((candidate) => candidate.id === ref);

      if (found !== undefined) {
        return { family: 'scenario', record: found };
      }
    }

    // Then the sets the adapter measures at call time, which are the comparison screen's columns and
    // the options the sandbox duplicates: no shipped record holds those, so the scan above cannot find
    // them and the figure behind such a reference would reach no record at all (AAP 0.12.4, F12).
    const measured = scenarioForReference(ctx, ref);

    if (measured !== undefined) {
      return { family: 'scenario', record: measured };
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
    `The deployment record declares no outbound endpoint named ${ref}, so the evidence behind it cannot be resolved. No record family answers the reference ${ref}. A reference names a package, an exception, a scenario, an approval, an audit event, an evidence pin, a document, a customer order, a purchase order, a policy, an outbound endpoint, a shared chokepoint, a competitor site or network, a radar series reading, a plant, a supplier, a tier-2 origin, a customer, a material, a production line or a product; or it names a computed figure as ${OVERVIEW_REF_ROOT}:<key> or ${CANVAS_REF_ROOT}:<key>, or one radar series as ${ATLAS_SERIES_PREFIX}<seriesId>.`,
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
 * give them: a scenario and an approval to the plant of the exception they answer, a pin to its own
 * node when that node is a plant, and a production line to the plant it belongs to (AAP 0.12.2: a line
 * belongs to one plant). A package, an audit event, a document, a material and a product name no plant,
 * and neither does a radar series, which reports a market reading rather than a record placed at a
 * plant, so none of them is plant-scoped and the permission alone decides whether it is readable —
 * which is the reading `hasPermission` documents for a `null` subject. A composed aggregate names a
 * plant only when its key is a plant's reading. The four market-intelligence families name no plant
 * either: the pack describes competitors rather than a record of the client's own, which is the reading
 * `./atlas.ts` documents for the atlas read itself, so they are never narrowed by a plant scope and are
 * refused by `assertPackReach` instead. The declared configuration is group-wide by construction — the
 * ledger's endpoints and the policy set are the same records for every plant — so a policy and an
 * outbound endpoint name no plant either. The four node families are the one case a single subject
 * cannot state, and they are answered below rather than here.
 *
 * @param ctx - The call's context, whose records resolve the indirect plants.
 * @param resolved - The record the reference named.
 * @returns The plant-scoped subject, or `null` when the record names no plant.
 */
function subjectOf(ctx: HandlerContext, resolved: ResolvedRef): ScopedSubject | null {
  const records = ctx.state.records;

  switch (resolved.family) {
    case 'aggregate':
      return resolved.figure.plantId === null ? null : { plantId: resolved.figure.plantId };
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
    case 'plant':
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
    case 'aggregate':
      return resolved.figure.evidence;
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
      'records name it (AAP 0.12.2). This payload states the record and the relations it carries and ' +
      'recomputes neither.',
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
      'consumes (AAP 0.12.2). This payload states the record and the relations it carries and ' +
      'recomputes neither.',
    inputs: [
      `id = ${material.id}`,
      `name = ${material.name}`,
      `primarySupplierId = ${material.primarySupplierId}`,
      ...(material.alternateSupplierId === undefined
        ? []
        : [`alternateSupplierId = ${material.alternateSupplierId}`]),
      `originId = ${material.originId}`,
      `quantityPerUnit = ${material.quantityPerUnit}`,
      `unitCostEur = ${material.unitCostEur}`,
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
      `priceEur = ${product.priceEur}`,
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
      'normalises or totals them (AAP 0.8, contracts §3). One payload carries one series and no ' +
      'figure combines a market-intelligence reading with a first-party one (rule P-5).',
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
  const row = computeLedger(
    ctx.state.auditEvents,
    ctx.state.records.sovereignty,
    DEMO_CLOCK,
  ).find((candidate) => candidate.endpoint === endpoint.endpoint);

  if (row === undefined) {
    throw notFoundProblem(
      ctx,
      `The deployment record no longer declares the outbound endpoint ${endpoint.endpoint}, so the counts the ledger supports for it cannot be reported.`,
    );
  }

  const attempts = ctx.state.auditEvents
    .filter((event) => event.objectRef === row.endpoint)
    .map((event) => event.id);

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
 * it in, by `assertNodeReach`; a pin is refused when `listVisiblePins` would not have released it, so a
 * reference cannot reach a pin the read filter withholds; and a customer-confidential document is
 * withheld from a persona that may not read its body, exactly as `getDocument` withholds it.
 *
 * A composed aggregate reference is answered from the aggregate read's own output (AAP 0.2.1 F12), so
 * the drawer states the figure the composing screen showed rather than a second computation of it, and
 * a `plant/<plantId>/…` key is narrowed by `assertPlantReach` like every other plant-scoped subject.
 *
 * @param ctx - The call's context: the session's records and the persona the call acts as.
 * @param ref - The reference the displayed element carries.
 * @returns The evidence payload the drawer renders.
 * @throws Problem - `'permission'` when the persona may not read evidence, when the record lies outside
 *   its plant scope, when a pin is outside what the persona may see, when a customer-confidential
 *   document's body is withheld from it, or when it may not read the family an aggregate belongs to;
 *   `'not-found'` when no record or aggregate answers the reference; `'validation'` when a composed
 *   reference carries a query parameter the grammar does not answer.
 */
export async function getEvidence(ctx: HandlerContext, ref: string): Promise<Evidence> {
  assertEvidenceRead(ctx);

  const resolved = await resolveRef(ctx, ref.trim());

  if (isPackFamily(resolved)) {
    assertPackReach(ctx);
  }

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
 * The list gates on `evidence.read` before it reads any record, the order every other collection read
 * in this family takes: an empty record set then refuses exactly as a populated one does, rather than
 * answering a page of nothing to a role the matrix does not admit. Each record is still read through
 * `getPackage`, so one copy rule serves the list and the detail rather than two (AAP 0.12.3).
 * Readiness travels on the record — it is the package's own whole-percent figure and no percentage is
 * computed here (rule P-6).
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
  assertEvidenceRead(ctx);

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
