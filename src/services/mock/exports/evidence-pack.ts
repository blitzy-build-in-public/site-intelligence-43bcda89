/**
 * The evidence-pack download: the JSON document behind SCR-07's "Export evidence pack".
 *
 * SCR-07 (`/admin/sovereignty`) offers that action, and this module builds the file's contents for it,
 * implementing the exports of `platform-contracts.md` §11 (AAP 0.12.1 "Exports"). It sits beside the
 * two sibling builders in `src/services/mock/exports/` and returns the same three members, so the mock
 * adapter hands back whichever export a screen asked for through one shape.
 *
 * The pack is the governance screen's payload together with the mechanism behind it: the deployment
 * summary and the declared configuration rows, the outbound ledger, every policy decision the trail
 * recorded, and the audit chain's verification. Nothing is computed here. `computeLedger` counts the
 * ledger's two columns from the audit events and `verifyChain` recomputes the chain's hashes, and this
 * module copies their results into one document (rule P-6). It states no figure, no amount and no
 * identifier of its own.
 *
 * Deterministic by construction (AAP 0.18.2). The only clock the document carries is `DEMO_CLOCK`, the
 * fixed demonstration instant of contracts §1; no random value, no counter and no system time is read.
 * `verifyChain` measures how long its walk took, and that reading is deliberately left out of the
 * document: an elapsed time would differ between two exports of one untouched state, so the chain
 * section carries the events checked and the breaks found and nothing else. Two calls on the same state
 * therefore produce byte-identical content.
 *
 * Labelling (rules P-1 and P-4). Each section states what it holds, with the fixed strings of
 * specification §5.3 read from `SIM_LABELS` rather than retyped: the declared configuration carries
 * the "Declared, not verified" label, the ledger's counts carry the "Simulated calculation" label, and
 * the policy decisions and the chain carry the "Simulated control" label. The document declares
 * `simulated: true` at its top level, and the chain section carries the fixed note stating what the
 * mechanism is and is not.
 *
 * No I/O (rule B-1). The module opens no request, no document API and no download of its own: it
 * returns a string, and the caller's browser code turns that string into a file. The `.example`
 * endpoint names the pack carries are record content copied from the seeded outbound ledger, never an
 * address anything reaches. It reads no configuration and carries no credential (rule B-2), it reaches
 * data only through the state it is handed (rule P-2), and it names no company, product or person
 * beyond the product and workspace the specification fixes (rule P-7).
 */

import { computeLedger } from '../../../domain/aggregation/ledger';
import { verifyChain } from '../../../domain/audit/verify';
import { DEMO_CLOCK, SIM_LABELS } from '../../../types';
import type {
  AuditActorType,
  AuditEvent,
  AuditEventId,
  AuditResult,
  ChainBreak,
  DeploymentSummary,
  LedgerRow,
  PolicyId,
  SimLabel,
  SovereigntyRow,
  Timestamp,
} from '../../../types';
import type { MockState } from '../mock-state';

/* ---------------------------------------------------------------------------------------------
 * The payload
 * ------------------------------------------------------------------------------------------- */

/**
 * What an evidence-pack export hands to the caller: the suggested file name, the media type and the
 * document's text.
 *
 * The member set matches the two sibling builders in this folder, so the mock adapter can return one
 * shape for every export the screens offer.
 */
export interface EvidencePackExport {
  /** The suggested file name, fixed so two exports of one session cannot be confused. */
  readonly filename: string;

  /** The media type of `content`. */
  readonly mediaType: string;

  /** The pack as indented JSON text. */
  readonly content: string;
}

/**
 * One policy decision, as the pack records it.
 *
 * The members are the event's own fields under the event's own names, copied and never renamed,
 * retyped or added to: the identifier, the chain position, the instant, the policy that decided,
 * the record decided about, the outcome and the correlation identifier a reader can quote.
 *
 * `policyId` is `null` rather than absent for an event that carries none, so every row of the section
 * has the same keys and a reader parsing the pack never has to test for a missing member: the
 * document's shape stays a property of the format rather than of the data.
 */
export interface PolicyDecisionRow {
  /** The event's identifier, `AUD-nnnnnn`. */
  readonly id: AuditEventId;

  /** The event's position in the chain. */
  readonly sequence: number;

  /** When the decision was recorded. */
  readonly timestamp: Timestamp;

  /** The policy that decided, or `null` for an event that names none. */
  readonly policyId: PolicyId | null;

  /** The record the decision was about. */
  readonly objectRef: string;

  /** The outcome the decision recorded. */
  readonly result: AuditResult;

  /** The correlation identifier the request carried. */
  readonly traceId: string;
}

/** The declared configuration section: the deployment summary and the rows, labelled as declared. */
export interface EvidencePackDeploymentSection {
  /** The label the section carries, which is the declaration label of specification §5.3. */
  readonly label: SimLabel;

  /** The deployment summary, copied from the seeded record. */
  readonly summary: DeploymentSummary;

  /** The declared configuration rows, in the record's own order. */
  readonly rows: readonly SovereigntyRow[];
}

/** The outbound ledger section: one row per declared endpoint, with its counted columns. */
export interface EvidencePackLedgerSection {
  /** The label the section carries, because its counts are simulated calculations. */
  readonly label: SimLabel;

  /** The ledger rows `computeLedger` returned for this state. */
  readonly rows: readonly LedgerRow[];
}

/** The policy-decision section: every event the policy engine appended, in chain order. */
export interface EvidencePackPolicySection {
  /** The label the section carries, because the decisions are a simulated control's. */
  readonly label: SimLabel;

  /** Every policy-actor event the trail holds. */
  readonly rows: readonly PolicyDecisionRow[];
}

/** The audit-chain section: what a verification found, and the note stating what it shows. */
export interface EvidencePackChainSection {
  /** The label the section carries, because the chain is a simulated control. */
  readonly label: SimLabel;

  /** How many events the verification recomputed. */
  readonly eventsChecked: number;

  /** Every position at which the chain does not verify, in the order encountered. */
  readonly breaks: readonly ChainBreak[];

  /** The fixed note stating what the mechanism shows and what it does not. */
  readonly note: string;
}

/**
 * The document the download contains.
 *
 * Its members are fixed in a deliberate order — the simulation marker and the identity of what
 * produced the pack first, then the four sections in the order the governance screen reads them — so
 * two exports of one state serialise to the same text and a reader opening the file meets the
 * provenance before the first figure.
 */
export interface EvidencePackDocument {
  /** The marker every export carries, typed as the literal so it cannot be set to anything else. */
  readonly simulated: true;

  /** The demonstration clock the pack was built against. */
  readonly generatedAt: Timestamp;

  /** The product the pack was produced by, as the specification names it. */
  readonly product: string;

  /** The workspace the pack was produced in, as the specification names it. */
  readonly workspace: string;

  /** The declared deployment configuration. */
  readonly deployment: EvidencePackDeploymentSection;

  /** The outbound ledger with its counted columns. */
  readonly outboundLedger: EvidencePackLedgerSection;

  /** The policy decisions the trail recorded. */
  readonly policyDecisions: EvidencePackPolicySection;

  /** The audit chain's verification. */
  readonly auditChain: EvidencePackChainSection;
}

/* ---------------------------------------------------------------------------------------------
 * Fixed strings
 * ------------------------------------------------------------------------------------------- */

/**
 * The label the declared-configuration section and its rows carry: `SIM_LABELS[6]`, which reads
 * "Declared, not verified" (AAP §0.10 lists the seven labels in this order).
 *
 * Rule P-4 requires the governance panel to present declared configuration as declared, so the label
 * travels inside the pack as well as on the screen: a reader who opens the file without the screen
 * still sees that nothing in it was measured.
 */
const DECLARED_NOT_VERIFIED: SimLabel = SIM_LABELS[6];

/**
 * The label the outbound ledger's section carries: `SIM_LABELS[1]`, which reads
 * "Simulated calculation", because its two columns are counted from audit events rather than declared.
 */
const SIMULATED_CALCULATION: SimLabel = SIM_LABELS[1];

/**
 * The label the policy-decision and audit-chain sections carry: `SIM_LABELS[4]`, which reads
 * "Simulated control" (rule P-4).
 */
const SIMULATED_CONTROL: SimLabel = SIM_LABELS[4];

/**
 * The note the chain section carries, fixed verbatim by AAP §0.10 and built from the label the chain
 * itself carries, so the sentence and the label cannot drift apart.
 *
 * It states what the section shows and what it does not: a recomputation exposes an edited record, and
 * the browser page behind it establishes nothing about the store the record came from. No stronger
 * claim is made anywhere in the pack (rule P-4).
 */
const CHAIN_NOTE = `${SIMULATED_CONTROL}: this shows the mechanism, not production tamper resistance.`;

/** The product the pack was produced by, as `platform-specification.md` §0 names it. */
const PRODUCT_NAME = 'Site Intelligence';

/** The workspace the pack was produced in, as `platform-specification.md` §0 names it. */
const WORKSPACE_NAME = 'FileMap canvas';

/** The suggested file name. Fixed, because a name carrying a clock reading would vary by export. */
const FILE_NAME = 'evidence-pack.json';

/** The media type, fixed so the payload opens as JSON. */
const MEDIA_TYPE = 'application/json';

/** The indentation `JSON.stringify` applies, so the document is readable when a person opens it. */
const JSON_INDENT = 2;

/**
 * The actor type a policy decision carries.
 *
 * The policy engine appends its own event when it denies an action or blocks an assistant answer
 * (AAP §0.8), so the section is the set of events whose actor is the engine rather than a persona or
 * the seeded system actor.
 */
const POLICY_ACTOR_TYPE: AuditActorType = 'policy';

/* ---------------------------------------------------------------------------------------------
 * The section's rows
 * ------------------------------------------------------------------------------------------- */

/**
 * Copies one policy-actor event into a row of the policy-decision section.
 *
 * Every member is the event's own field under the event's own name, and nothing is derived: the row
 * records what the trail recorded (rule P-6). A `policyId` the event does not carry is written as
 * `null`, so the section's keys are the same on every row.
 *
 * @param event - One event whose actor is the policy engine.
 * @returns The row for that event.
 */
function toPolicyDecisionRow(event: AuditEvent): PolicyDecisionRow {
  return {
    id: event.id,
    sequence: event.sequence,
    timestamp: event.timestamp,
    policyId: event.policyId ?? null,
    objectRef: event.objectRef,
    result: event.result,
    traceId: event.traceId,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The export
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the evidence pack for the current state of the demonstration.
 *
 * The document is composed from four reads, none of which this module interprets:
 * - the seeded governance record supplies the deployment summary and the declared configuration rows,
 *   copied by spread so no field of the record is dropped or renamed, and every row keeps the status
 *   literal the type fixes;
 * - `computeLedger` counts the outbound ledger's allowed and blocked columns from the audit events over
 *   its thirty-day window, so no count is restated here;
 * - every policy-actor event in the trail becomes a policy-decision row, in chain order and with no
 *   truncation: a limit would let the file omit a denial, and no display bound is invented;
 * - `verifyChain` reports how many events it recomputed and every break it found. The walk's elapsed
 *   time is left out on purpose, because it would make two exports of one state differ.
 *
 * The result is indented JSON. Building the string here rather than in the caller keeps the document's
 * shape and key order in one place; turning it into a download belongs to the browser code that calls
 * this function, which is why nothing below touches the document API (rule B-1).
 *
 * @param state - The session's mutable state: the seeded governance record and the hashed audit chain.
 *   It is read and not modified.
 * @returns The payload: the file name, the media type and the pack's JSON text.
 */
export async function buildEvidencePack(state: MockState): Promise<EvidencePackExport> {
  const sovereignty = state.records.sovereignty;
  const ledgerRows = computeLedger(state.auditEvents, sovereignty, DEMO_CLOCK);

  const policyDecisions = state.auditEvents
    .filter((event) => event.actorType === POLICY_ACTOR_TYPE)
    .map(toPolicyDecisionRow);

  const report = await verifyChain(state.auditEvents);

  const document: EvidencePackDocument = {
    simulated: true,
    generatedAt: DEMO_CLOCK,
    product: PRODUCT_NAME,
    workspace: WORKSPACE_NAME,
    deployment: {
      label: DECLARED_NOT_VERIFIED,
      summary: { ...sovereignty.summary },
      rows: sovereignty.rows.map((row) => ({ ...row })),
    },
    outboundLedger: {
      label: SIMULATED_CALCULATION,
      rows: ledgerRows,
    },
    policyDecisions: {
      label: SIMULATED_CONTROL,
      rows: policyDecisions,
    },
    auditChain: {
      label: SIMULATED_CONTROL,
      eventsChecked: report.eventsChecked,
      breaks: report.breaks.map((position) => ({ sequence: position.sequence, id: position.id })),
      note: CHAIN_NOTE,
    },
  };

  return {
    filename: FILE_NAME,
    mediaType: MEDIA_TYPE,
    content: JSON.stringify(document, null, JSON_INDENT),
  };
}

