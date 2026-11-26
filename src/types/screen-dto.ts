/**
 * The screen data-transfer objects: the shapes the stage S1 to S3 screens receive from the service
 * and the shapes the mock adapter's handlers return for them.
 *
 * Fixing input: AAP 0.12.2's derived-types table. `platform-contracts.md` §2 and §3 name these nine
 * types without defining them — `Overview`, `ExceptionRow`, `ExceptionDetail`, `Answer`,
 * `SovereigntyStatus`, `PolicyDetail`, `PolicyException`, `DocumentBody` and `SearchHit` — so every
 * member below is traced to the input that consumes it: the specification screen that shows it, the
 * seed section that stores it, or the contract clause that produces it. The note on each type names
 * that input, and no member is added beyond what it states. The types that the contracts do fix
 * verbatim live in `./entities`, `./solver` and `./service`; this module composes them and never
 * restates one.
 *
 * Shapes only (rule P-6). Every numeric member is a slot that `src/domain/aggregation` or
 * `src/domain/solver` fills, so no amount, count, duration, date or identifier value is written here
 * and no member may be given a literal in a screen. Collections are plain mutable arrays and no
 * member is read-only, because the mock adapter holds the demonstration's records in memory and
 * fills these objects from that state (AAP 0.2.1). A member that may be absent is written `?:` and
 * never `| undefined`, so `exactOptionalPropertyTypes` reads it the same way in every consumer.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `./primitives`, `./entities` and `./solver` and nothing else — no seed record,
 *   no adapter, no service module, no domain module, no React — so it cannot become a second data
 *   boundary.
 * - P-5: no type here carries a market-intelligence value beside a first-party one. The atlas
 *   shapes, which do carry competitor series, live in `./atlas`; these screen shapes carry no
 *   competitor member at all, so no overview, exception or sovereignty figure can be blended.
 * - P-4: `SovereigntyRow.status` is the literal `'declared'` and `DeploymentSummary.outboundBlocked`
 *   stays a `boolean`, so a screen renders declared configuration under the fixed
 *   `Declared, not verified` label and has no member with which to claim a verified state.
 * - P-1: no label string is typed here. The seven exact labels of specification §5.3 are the
 *   `SimLabel` union in `./primitives`, and the components carry them.
 *
 * OPEN ITEM: `ChangedSinceLastVisitItem.ref`, `Citation.ref`, `ImpactChainNode.ref` and
 * `SearchHit.ref` are `string`. AAP 0.12.2 fixes each of them as `ref: string` because a reference
 * in the evidence drawer and in the search results spans every record kind — an exception, an order,
 * a document, a pin — and `./primitives` types that vocabulary one entity at a time. A closed union
 * would have to enumerate the record set and would reject a legitimate reference.
 * OPEN ITEM: `SearchHit.entityType` is an open `string` on the same reasoning: the search groups its
 * hits by the seed's own record kinds (specification §5.1), and those kinds are record content
 * rather than a vocabulary the inputs enumerate.
 * OPEN ITEM: `PolicyDetail.statement` is a `string` slot. Contracts §7.2 is the display text's
 * source and the seed record holds it; that wording is not quoted in the inputs available in this
 * run, so none of it is written here, and a screen that needs it reads the record (rule P-6).
 * OPEN ITEM: `Answer.modelId` is a `string` because `./primitives` declares no model identifier and
 * `./models` owns the model catalogue. This module's import whitelist is `./primitives`,
 * `./entities` and `./solver`, so the answer carries the catalogue's identifier as a plain string
 * rather than importing a second vocabulary for it.
 * OPEN ITEM: `SovereigntyRow.id` and `LedgerRow.endpoint` are `string`. The row keys are the seed
 * record's own (`SD-1` upwards) and the endpoint strings are the outbound ledger's record content
 * (AAP 0.6.3, 0.12.2); neither is a vocabulary the contracts enumerate, and writing a set of keys
 * here would type a record value into a type module (rule P-6).
 * OPEN ITEM: `ExceptionDetail.missingInputs` and `ExceptionDetail.confidence` repeat the pair that
 * `OperationalException` already carries. They are kept because AAP 0.12.2's `ExceptionDetail` row
 * lists "missing inputs and confidence" among the detail's own panels beside the impact chain and
 * the stock series, and a screen that renders that panel reads it from the detail rather than
 * reaching into the record. Nothing else on the detail repeats a member of `exception`: the header
 * fields and `whatChanged` are read from the record alone.
 */

import type {
  DocumentId,
  ExceptionId,
  IsoDate,
  Money,
  PlantId,
  PolicyId,
  ProductId,
  SourceId,
  Timestamp,
  UserId,
} from './primitives';
import type {
  AuditEvent,
  Classification,
  Confidence,
  ExceptionStatus,
  ExceptionType,
  Freshness,
  OperationalException,
  OrderResult,
  Residency,
  Severity,
} from './entities';
import type { DailyClosingStockPoint } from './solver';

/* ---------------------------------------------------------------------------------------------
 * A. Overview — specification SCR-01, AAP 0.12.2, contracts §5
 * ------------------------------------------------------------------------------------------- */

/**
 * One entry of the overview's "Changed since your last visit" list.
 *
 * Fixing input: AAP 0.12.2's `Overview` row, which fixes the list beside the four tiles. The entry
 * names the record it is about, so the component that renders the list opens that record from `ref`
 * and needs no route of its own; `label` and `detail` are record text rather than a computed figure
 * (rule P-6).
 */
export interface ChangedSinceLastVisitItem {
  /** The record the entry opens, in the service's own reference form. */
  ref: string;

  /** The one-line label that identifies the record in the list. */
  label: string;

  /** The record's own account of what changed, as that record states it. */
  detail: string;
}

/**
 * One row of the overview's risk-by-plant table.
 *
 * Fixing input: AAP 0.12.2's `Overview` row, which fixes the by-plant rows as part of the overview
 * aggregate. Both counts are computed by `src/domain/aggregation/overview.ts` over the records the
 * caller's scope admits, so a plant outside the active user's scope contributes no row.
 */
export interface PlantRiskRow {
  /** The plant the row reports on. */
  plantId: PlantId;

  /** The plant's display name, from the plant record. */
  plantName: string;

  /** How many exceptions at that plant are still open. */
  openExceptions: number;

  /** The revenue those exceptions place at risk, in euro. */
  revenueAtRiskEur: Money;
}

/**
 * One day of the overview's "opened and resolved" series.
 *
 * Fixing input: AAP 0.12.2's `Overview` row, which fixes the fourteen-day series whose dates filter
 * the exception queue. The date is a calendar date rather than an instant, because it is the queue
 * filter's own key, and both counts are whole exceptions rather than a rate.
 */
export interface DailyCountPoint {
  /** The calendar date the counts are taken over. */
  date: IsoDate;

  /** How many exceptions were opened on that date. */
  open: number;

  /** How many exceptions were resolved on that date. */
  resolved: number;
}

/**
 * The overview: four tiles, the changed-since list, the by-plant table and the fourteen-day series.
 *
 * Fixing input: AAP 0.12.2's `Overview` row — the four tiles are open exceptions, revenue at risk,
 * customer orders at risk and median hours to approved plan, and every value is computed per
 * contracts §5 by `src/domain/aggregation/overview.ts` over the records the caller's scope admits.
 * The screen labels each tile `Simulated calculation`, since a tile is a computed figure (rule P-1).
 *
 * `medianHoursToApprovedPlan` is the middle value of the qualifying history records and stays
 * unrounded (AAP 0.8's aggregation table); the two counts are whole exceptions and orders. No member
 * here combines a first-party value with a market-intelligence one (rule P-5).
 */
export interface Overview {
  /** The exceptions still open in scope, the first tile. */
  openExceptions: number;

  /** The revenue those exceptions place at risk, in euro, the second tile. */
  revenueAtRiskEur: Money;

  /** The customer orders carrying an affected line, the third tile. */
  customerOrdersAtRisk: number;

  /** The median hours from an exception's detection to its approved plan, the fourth tile. */
  medianHoursToApprovedPlan: number;

  /** What changed since the user's previous visit, as the records state it. */
  changedSinceLastVisit: ChangedSinceLastVisitItem[];

  /** The open exceptions and their revenue at risk, grouped by plant. */
  byPlant: PlantRiskRow[];

  /** The exceptions opened and resolved on each of the series' dates. */
  openResolvedSeries: DailyCountPoint[];
}

/* ---------------------------------------------------------------------------------------------
 * B. Exception queue row — specification SCR-02, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the exception queue.
 *
 * Fixing input: AAP 0.12.2's `ExceptionRow` row, which fixes one member per SCR-02 table column, in
 * the column order: identifier, type, title, products, plant, severity, revenue at risk, days to
 * impact, status, owner, age, freshness.
 *
 * The row is a projection and not the record: `revenueAtRiskEur` is computed from the exception's
 * affected lines by `src/domain/aggregation/exceptions.ts` (rule P-6), `ageHours` is measured from
 * the exception's detection against the demonstration clock, and `freshness` is the source state the
 * adapter attaches to the read rather than a field stored on the exception.
 */
export interface ExceptionRow {
  /** The exception's identifier, `EXC-2026-nnnn`. */
  id: ExceptionId;

  /** The kind of exception, which the queue filters and groups by. */
  type: ExceptionType;

  /** The one-line title the row shows. */
  title: string;

  /** The products the exception touches, which the product filter matches. */
  productIds: ProductId[];

  /** The plant the disruption lands on. */
  plantId: PlantId;

  /** How urgently the exception needs a response, the queue's default first sort key. */
  severity: Severity;

  /** The revenue the exception places at risk, in euro, computed from its affected lines. */
  revenueAtRiskEur: Money;

  /** Working days until the impact reaches a customer order, the default second sort key. */
  daysToImpact: number;

  /** Where the exception stands, which the status filter matches. */
  status: ExceptionStatus;

  /** The persona accountable for the exception. */
  ownerId: UserId;

  /** How long the exception has been open, in hours from its detection. */
  ageHours: number;

  /** The freshness of the sources the row's values were read from. */
  freshness: Freshness;
}

/* ---------------------------------------------------------------------------------------------
 * C. Exception detail — specification SCR-03, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The kind of record a link of the impact chain names.
 *
 * Fixing input: SCR-03's chain, which runs "from purchase order to material to line to customer
 * orders", with each node opening the evidence drawer (AAP 0.12.4). The four members are the whole
 * of the chain, so the union is closed: a node of another kind would be a chain the screen has no
 * position for.
 */
export type ImpactChainNodeKind = 'purchase-order' | 'material' | 'line' | 'customer-order';

/**
 * One node of the investigation's impact chain.
 *
 * Fixing input: AAP 0.12.2's `ExceptionDetail` row, which fixes the impact chain as a list of nodes
 * the drawer opens. `ref` is the record behind the node, so the drawer resolves its evidence from it,
 * and `detail` is the record's own wording rather than a computed figure (rule P-6).
 */
export interface ImpactChainNode {
  /** The record the node stands for, in the service's own reference form. */
  ref: string;

  /** Which link of the chain the node is. */
  kind: ImpactChainNodeKind;

  /** The label the chain shows on the node. */
  label: string;

  /** The record's own account of the node, as it states it. */
  detail: string;
}

/**
 * The investigation's whole payload: the exception, what it touches, and how the projection moves.
 *
 * Fixing input: AAP 0.12.2's `ExceptionDetail` row — the header fields and `whatChanged` travel on
 * `exception`, and the impact chain, the stock series, the affected orders, the missing inputs and
 * confidence, and the activity history travel here beside it.
 *
 * `stockSeries` is the baseline projection plotted for the case's window, never below zero, and the
 * selected option is plotted over the same series (T-03). `activity` is the audit trail
 * for this exception's records, which is the same append-only chain the audit screen reads.
 */
export interface ExceptionDetail {
  /** The exception record itself, carrying the header fields and `whatChanged`. */
  exception: OperationalException;

  /** The records the disruption reaches, in the chain's order. */
  impactChain: ImpactChainNode[];

  /** The baseline stock left at each day's close across the projection window. */
  stockSeries: DailyClosingStockPoint[];

  /** The customer order lines the disruption reaches, as the solver measures them. */
  affectedOrders: OrderResult[];

  /** The inputs the impact assessment could not read, named for the reader. */
  missingInputs: string[];

  /** How much confidence the assessment carries, with the reason for it. */
  confidence: Confidence;

  /** The audit events recorded against this exception, in chain order. */
  activity: AuditEvent[];
}

/* ---------------------------------------------------------------------------------------------
 * D. Assistant answer — contracts §10, specification SCR-06
 * ------------------------------------------------------------------------------------------- */

/**
 * One citation behind an answer: the record the answer rested on, its source and that source's
 * freshness.
 *
 * Fixing input: AAP 0.12.2's `Answer` row, whose parenthetical fixes exactly these three members.
 * The citation is what turns the assistant's sentence into a claim a reader can open, so the screen
 * renders each one as a chip that opens the evidence drawer.
 */
export interface Citation {
  /** The record the answer cited, in the service's own reference form. */
  ref: string;

  /** Which of the six sources the cited record came from. */
  source: SourceId;

  /** How current that source was when the answer was composed. */
  freshness: Freshness;
}

/**
 * One answer from the evidence assistant.
 *
 * Fixing input: AAP 0.12.2's `Answer` row and contracts §10, which fix the text, the citations, the
 * queries the answer ran, the model that composed it, whether the answer is partial, and the inputs
 * it is missing.
 *
 * A question outside the six scripted ones returns the fixed notice
 * `This demonstration has no model behind it. Try one of the suggested questions.` as `text` with an
 * empty `citations` list, because the demonstration composes no sentence of its own. A partial answer
 * keeps its citations and names the absent inputs in `missing`, so a reader sees which part of the
 * question the records could not settle; `partial` is true exactly when that list is non-empty.
 */
export interface Answer {
  /** The answer's sentence, with every figure filled in at call time. */
  text: string;

  /** The records the answer rested on, each one openable from the drawer. */
  citations: Citation[];

  /** What the answer consulted, in the terms the expander lists. */
  queriesRun: string[];

  /** The model that composed the answer, as the model catalogue identifies it. */
  modelId: string;

  /** Whether part of the question could not be answered from the records. */
  partial: boolean;

  /** The inputs the answer is missing, empty when the answer is complete. */
  missing: string[];
}

/* ---------------------------------------------------------------------------------------------
 * E. Sovereignty — specification SCR-07, platform-seed-data.md §8
 * ------------------------------------------------------------------------------------------- */

/**
 * The deployment summary SCR-07 shows above its ten rows.
 *
 * Fixing input: AAP 0.12.2's `SovereigntyStatus` row, which fixes the summary's fields against seed
 * §8. The tier is the literal `'S3'` because the top bar's pill states it in that form, and the
 * summary as a whole is rendered under the fixed `Declared, not verified` label (rule P-4).
 *
 * `outboundBlocked` is a `boolean` rather than the literal `true` on purpose: it is declared
 * configuration, so the type states what the record says and the label states that nothing verified
 * it.
 */
export interface DeploymentSummary {
  /** The declared processing tier. */
  tier: 'S3';

  /** Whether the declared configuration blocks outbound traffic. */
  outboundBlocked: boolean;

  /** Where the deployment declares its data is processed. */
  residency: Residency;

  /** The date the configuration was last declared, from the record. */
  lastDeclaredOn: IsoDate;
}

/**
 * One of the ten declared configuration rows of SCR-07.
 *
 * Fixing input: AAP 0.12.2's `SovereigntyStatus` row — the row's label, its record, its status and
 * the date it was last declared — together with seed §8, which holds the values. `status` is the
 * literal `'declared'` because every row renders the status "Declared" under the fixed
 * `Declared, not verified` label; a row carrying another status would be claiming a state
 * nothing in the demonstration checks (rule P-4).
 *
 * `record` is the configuration record behind the row, such as `CFG-DATA-LOC-01`, so a reader can
 * follow the declaration to the record that makes it.
 */
export interface SovereigntyRow {
  /** The row's own key, from the seed record. */
  id: string;

  /** What the row declares, in the record's own words. */
  label: string;

  /** The row's status, which is declared configuration throughout. */
  status: 'declared';

  /** The configuration record the declaration rests on. */
  record: string;

  /** The date the row was last declared, from the record. */
  lastDeclaredOn: IsoDate;
}

/**
 * One endpoint of the outbound ledger.
 *
 * Fixing input: AAP 0.12.4's SCR-07 line, which fixes the ledger's columns — endpoint, purpose,
 * state, last attempt and the thirty-day allowed and blocked counts — and contracts §5, which fixes
 * those counts as the audit events naming this endpoint as their object, split by result.
 *
 * `lastAttempt` is nullable because an endpoint the declared configuration blocks is never contacted,
 * so a blocked endpoint has no attempt to show rather than a zeroed timestamp. `allowed` and
 * `blocked` are counts over that window and are spelled as the columns spell them.
 */
export interface LedgerRow {
  /** The endpoint the ledger reports on, as the record states it. */
  endpoint: string;

  /** What the endpoint would be used for, in the record's own words. */
  purpose: string;

  /** Whether the declared configuration allows or blocks traffic to it. */
  state: 'blocked' | 'allowed';

  /** When the endpoint was last attempted, or `null` when it was never contacted. */
  lastAttempt: Timestamp | null;

  /** How many calls to it the audit trail recorded as allowed over the window. */
  allowed: number;

  /** How many the audit trail recorded as blocked over the window. */
  blocked: number;
}

/**
 * The sovereignty screen's whole payload.
 *
 * Fixing input: AAP 0.12.2's `SovereigntyStatus` row — the deployment summary, the ten declared rows
 * and the outbound ledger — with the values held by seed §8. Every part of it describes declared
 * configuration and none of it reports a verified state (rule P-4).
 */
export interface SovereigntyStatus {
  /** The deployment summary shown above the rows. */
  summary: DeploymentSummary;

  /** The declared configuration rows, in the record's own order. */
  rows: SovereigntyRow[];

  /** The outbound ledger, one row per endpoint. */
  ledger: LedgerRow[];
}

/* ---------------------------------------------------------------------------------------------
 * F. Policies — contracts §7.2, specification SCR-07
 * ------------------------------------------------------------------------------------------- */

/**
 * One policy as its detail screen shows it.
 *
 * Fixing input: AAP 0.12.2's `PolicyDetail` row — contracts §7.2's display text and the recent
 * decisions the screen lists — with the values held by the policy record. `statement` is that
 * record's display text and no wording of it is written in this module.
 *
 * `evaluated` is `false` for a policy that is declared configuration rather than a rule the engine
 * runs, which is how the screen distinguishes a policy it can show a decision for from one it can
 * only show as declared (rule P-4).
 */
export interface PolicyDetail {
  /** The policy's identifier, `POL-nnn`. */
  id: PolicyId;

  /** The policy's title, from its record. */
  title: string;

  /** The policy's display statement, as contracts §7.2 words it. */
  statement: string;

  /** Whether the policy engine evaluates this policy, or only declares it. */
  evaluated: boolean;

  /** The audit events recording decisions this policy made, most recent as the screen orders them. */
  recentDecisions: AuditEvent[];
}

/**
 * Where a time-boxed policy exception stands.
 *
 * Fixing input: SCR-07's grant flow, which "records a pending request" (AAP 0.12.4), with the two
 * outcomes such a request can reach once it is decided. Nothing in the demonstration decides one on
 * its own, so `pending` is the state the flow leaves behind.
 */
export type PolicyExceptionStatus = 'pending' | 'granted' | 'denied';

/**
 * One time-boxed exception requested against a policy.
 *
 * Fixing input: AAP 0.12.2's `PolicyException` row and SCR-07's grant flow — a reason, an expiry, a
 * second approver and the pending request the flow records, beside the policy it is requested
 * against and the persona who requested it.
 *
 * `secondApproverId` is a member rather than an optional one because the flow requires a second
 * approver before a request exists, and `expiresAt` is required because the exception is time-boxed.
 */
export interface PolicyException {
  /** The policy the exception is requested against. */
  policyId: PolicyId;

  /** Why the exception is needed, in the requester's own words. */
  reason: string;

  /** When the exception stops applying. */
  expiresAt: Timestamp;

  /** The persona who requested it. */
  requestedBy: UserId;

  /** The second persona whose approval the request needs. */
  secondApproverId: UserId;

  /** Where the request stands. */
  status: PolicyExceptionStatus;
}

/* ---------------------------------------------------------------------------------------------
 * G. Documents — platform-seed-data.md §7, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * One attachment of a document.
 *
 * Fixing input: AAP 0.12.2's `DocumentBody` row, which fixes the attachments the document record
 * carries. The name is the record's own wording and the identifier is the record's key, so a screen
 * shows what the document states without composing a label.
 */
export interface DocumentAttachment {
  /** The attachment's key, from the document record. */
  id: string;

  /** The attachment's name, as the record states it. */
  name: string;
}

/**
 * One document's body, as a permitted caller receives it.
 *
 * Fixing input: AAP 0.12.2's `DocumentBody` row — the title, classification, residency, attachments
 * and body text of the seeded documents — and AAP 0.12.3, which fixes where redaction happens.
 *
 * A body classified `customer-confidential` never crosses the service boundary for the platform
 * administrator persona (USR-04): the mock adapter withholds or redacts it before serialising, so
 * this type describes what a caller permitted to read the body receives, and a withheld body reaches
 * a screen as a `Problem` rather than as an empty string here.
 */
export interface DocumentBody {
  /** The document's identifier, `DOC-nnnn`. */
  id: DocumentId;

  /** The document's title, from its record. */
  title: string;

  /** How sensitive the document is, which decides who may read its body. */
  classification: Classification;

  /** Where the document's content may be processed. */
  residency: Residency;

  /** The attachments the document record carries. */
  attachments: DocumentAttachment[];

  /** The body text, as released to this caller by the adapter. */
  body: string;
}

/* ---------------------------------------------------------------------------------------------
 * H. Identifier search — specification §5.1
 * ------------------------------------------------------------------------------------------- */

/**
 * Where a search hit opens.
 *
 * Fixing input: specification §5.1's identifier search, which opens "the matching screen or the
 * evidence drawer". The two kinds are the whole of what a hit can do, so the union is closed, and
 * `value` is the route the app navigates to or the reference the drawer resolves.
 */
export interface SearchTarget {
  /** Which of the two destinations the hit opens. */
  kind: 'route' | 'drawer';

  /** The route path, or the reference the drawer opens. */
  value: string;
}

/**
 * One hit of the identifier search.
 *
 * Fixing input: AAP 0.12.2's `SearchHit` row — the identifier, the entity type the results are
 * grouped by, and the route or drawer target that opens it — with specification §5.1 fixing the
 * grouping. The search reads the records the caller's scope admits, so a hit for a plant outside
 * that scope is not returned at all.
 */
export interface SearchHit {
  /** The identifier that matched, in the record's own reference form. */
  ref: string;

  /** The record kind the hit is grouped under, as the search's own grouping names it. */
  entityType: string;

  /** Where selecting the hit opens it. */
  target: SearchTarget;
}
