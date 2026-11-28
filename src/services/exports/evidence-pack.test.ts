// @vitest-environment node

/**
 * What the evidence pack's policy-decision section selects, for the case no other suite reaches.
 *
 * WHY THIS SUITE EXISTS. `src/services/mock/mock-backend.test.ts` asserts that the adapter's payload
 * equals `buildEvidencePack`'s payload for the same four reads — the composer compared against itself
 * — so a decision the builder never selected from the trail passed every gate. One did: the section
 * was filtered by the actor that recorded an event, and a question the assistant refused is recorded
 * against POL-007 with the persona who asked it as its actor, so the governance screen listed it as a
 * decision while the file a reader downloaded omitted it (AAP 0.12.4). The cases below read the file's
 * own text and assert the selection that screen makes: every event the trail records against a policy,
 * whatever actor recorded it, in chain order.
 *
 * WHAT IT ASSERTS, AND WHAT IT LEAVES ALONE. Which events become rows and in which order; that an
 * event naming no policy never does; that every row carries its own event's policy identifier and
 * never a null; that the section states the "Simulated control" label inside a document that declares
 * itself simulated, with its sections in their fixed order; and that two builds over one set of reads
 * produce identical bytes. It does not restate the file name, the media type, the ledger's columns or
 * the chain note: those belong to the builder and to the suites that read the sections this one does
 * not.
 *
 * THE FIXTURES ARE TYPED, NOT SEEDED. Every member of `AuditEvent` and of the four reads is filled
 * here, because the builder is a pure function of the reads it is handed. Nothing is imported from
 * `src/seed` (rule P-2), and the identifiers and instants below are the fixtures' own — none of them
 * spells a seeded record, so no case asserts a value or a count the dataset owns (rule P-6). The two
 * constants the suite asserts are read from the types module rather than retyped, so each has one
 * owner: `SIM_LABELS[4]` for the section's label (rules P-1, P-4) and `DEMO_CLOCK` for the instant
 * the document is stamped with (contracts §1).
 *
 * WHY THE NODE ENVIRONMENT, ON THE FIRST LINE ABOVE. Nothing here renders. The builder is a pure
 * function returning a string, so the suite needs no DOM, no service and no network (rule B-1).
 */

import { describe, expect, it } from 'vitest';

import { buildEvidencePack } from './evidence-pack';
import type { EvidencePackInput } from './evidence-pack';
import { DEMO_CLOCK, SIM_LABELS } from '../../types';
import type {
  AuditActorType,
  AuditEvent,
  AuditResult,
  DeploymentSummary,
  LedgerRow,
  PolicyId,
  SovereigntyRow,
  Timestamp,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The fixtures
 * ------------------------------------------------------------------------------------------- */

/**
 * The policy the fixtures' refused question is recorded against.
 *
 * The fixtures' own value, imported from nothing: a pack that omitted the event this identifier names
 * is exactly the defect these cases guard, and naming it here says so without borrowing a seeded
 * policy (rule P-6).
 */
const POLICY_OF_QUESTION: PolicyId = 'fixture-policy-question';

/** The policy the fixtures' blocked call is recorded against, distinct so no row can borrow the other. */
const POLICY_OF_BLOCK: PolicyId = 'fixture-policy-block';

/** The genesis `previousHash` the chain fixes: 64 zeros, written once rather than retyped per event. */
const GENESIS_PREVIOUS_HASH = '0'.repeat(64);

/** A fixture payload's hash, of the shape the chain writes. No case here verifies the chain. */
const FIXTURE_HASH = 'f'.repeat(64);

/**
 * One event of the fixture trail, every member `AuditEvent` declares filled.
 *
 * The hashes are the suite's own values rather than a recomputed chain, because the pack copies none
 * of them and a verification of a trail belongs to the chain's own suite. The payloads are present
 * rather than `null` so the record is a complete event of the shape the trail holds.
 *
 * @param sequence - The event's position in the chain, which the section orders its rows by.
 * @param timestamp - The instant the event records.
 * @param actorType - Which kind of actor appended the event.
 * @param actorId - The actor itself, which is a persona for the question and a policy for the block.
 * @param result - The outcome the event records.
 * @param policyId - The policy the event is recorded against; omitted when it names none, because an
 *   absent member is a different record from one set to `undefined` (contracts §6).
 * @returns The complete event.
 */
function eventAt(
  sequence: number,
  timestamp: Timestamp,
  actorType: AuditActorType,
  actorId: string,
  result: AuditResult,
  policyId?: PolicyId,
): AuditEvent {
  const event: AuditEvent = {
    sequence,
    id: `fixture-event-${sequence}`,
    timestamp,
    actorType,
    actorId,
    action: 'fixture action',
    objectRef: `fixture-record-${sequence}`,
    result,
    before: null,
    after: { fixture: `payload-${sequence}` },
    payloadHash: FIXTURE_HASH,
    traceId: `fixture-trace-${sequence}`,
    previousHash: GENESIS_PREVIOUS_HASH,
    eventHash: FIXTURE_HASH,
  };

  return policyId === undefined ? event : { ...event, policyId };
}

/**
 * The question a persona asked and the policy refused.
 *
 * Its actor is the persona rather than the engine, so selecting the section by actor would drop it —
 * which is the omission this suite exists to fail on.
 */
const QUESTION_BY_PERSONA = eventAt(
  1,
  '2026-11-02T09:00:00+01:00',
  'user',
  'fixture-user-questioning',
  'blocked',
  POLICY_OF_QUESTION,
);

/** The block the engine appended for the call the same policy refused. */
const BLOCK_BY_ENGINE = eventAt(
  2,
  '2026-11-02T09:00:01+01:00',
  'policy',
  POLICY_OF_BLOCK,
  'blocked',
  POLICY_OF_BLOCK,
);

/** The download a persona recorded, which no policy decided and which therefore names none. */
const EXPORT_BY_PERSONA = eventAt(
  3,
  '2026-11-02T09:00:02+01:00',
  'user',
  'fixture-user-exporting',
  'succeeded',
);

/**
 * The trail the builder is handed, in an order that is deliberately not the chain's.
 *
 * The newest event comes first, so a section that kept the read's order rather than the chain's would
 * fail the ordering case.
 */
const TRAIL: readonly AuditEvent[] = [BLOCK_BY_ENGINE, EXPORT_BY_PERSONA, QUESTION_BY_PERSONA];

/** The deployment summary the sovereignty read returns: declared configuration with fixture values. */
const SUMMARY: DeploymentSummary = {
  tier: 'S3',
  outboundBlocked: true,
  residency: 'fixture jurisdiction',
  lastDeclaredOn: '2026-11-01',
};

/** One declared configuration row, in the record's own shape. */
const DECLARED_ROW: SovereigntyRow = {
  id: 'fixture-config-1',
  label: 'the fixture states what the row declares',
  status: 'declared',
  record: 'fixture-record-of-declaration',
  lastDeclaredOn: '2026-11-01',
};

/** One outbound ledger row, with the two counted columns the fixtures' trail would produce. */
const LEDGER_ROW: LedgerRow = {
  endpoint: 'fixture-endpoint.example',
  purpose: 'the fixture states what the endpoint would be used for',
  state: 'blocked',
  lastAttempt: '2026-11-02T09:00:02+01:00',
  allowed: 0,
  blocked: 1,
};

/**
 * The four reads, composed once.
 *
 * `eventsChecked` is the trail's own length rather than a figure of its own: the report covers the
 * trail the section is selected from, which is what keeps the two chain-bearing sections agreeing.
 */
const READS: EvidencePackInput = {
  sovereignty: { summary: SUMMARY, rows: [DECLARED_ROW] },
  ledgerRows: [LEDGER_ROW],
  events: TRAIL,
  report: { eventsChecked: TRAIL.length, breaks: [], durationMs: 0 },
};

/** The payload the cases read, built once because the builder reads no clock and no state. */
const PAYLOAD = buildEvidencePack(READS);

/* ---------------------------------------------------------------------------------------------
 * Reading the file's text back
 * ------------------------------------------------------------------------------------------- */

/**
 * The payload's text, parsed back into the members the cases read.
 *
 * Read as `unknown` and narrowed rather than cast, so a document whose members moved fails the case
 * that reads them instead of being trusted because a type says a member is there.
 *
 * @param content - The export's text, as the builder returned it.
 * @returns The document's own members, keyed as the file spells them.
 */
function parseDocument(content: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(content);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The evidence pack is not a JSON object, so none of its sections can be read.');
  }

  return { ...parsed };
}

/**
 * One section of the document.
 *
 * @param document - The parsed document.
 * @param name - The member the section sits under, as the file spells it.
 * @returns The section's own members.
 */
function sectionOf(document: Record<string, unknown>, name: string): Record<string, unknown> {
  const section = document[name];

  if (typeof section !== 'object' || section === null || Array.isArray(section)) {
    throw new Error(`The evidence pack carries no ${name} section, so its label cannot be read.`);
  }

  return { ...section };
}

/**
 * The rows one section carries, each as its own member set.
 *
 * @param section - The parsed section.
 * @returns Its rows, in the order the file writes them.
 */
function rowsOf(section: Record<string, unknown>): readonly Record<string, unknown>[] {
  const rows = section['rows'];

  if (!Array.isArray(rows)) {
    throw new Error('The evidence pack section carries no row list, so its decisions cannot be read.');
  }

  return rows.map((row: unknown): Record<string, unknown> => {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) {
      throw new Error('The evidence pack section holds a row that is not an object.');
    }

    return { ...row };
  });
}

/** The document the cases read, parsed once from the payload the builder returned. */
const DOCUMENT = parseDocument(PAYLOAD.content);

/** The policy-decision section's rows, in the order the file writes them. */
function policyRows(): readonly Record<string, unknown>[] {
  return rowsOf(sectionOf(DOCUMENT, 'policyDecisions'));
}

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('the evidence pack policy decisions', () => {
  it('carries a decision whichever actor recorded it, in chain order', () => {
    // The persona's question is a decision the screen lists, and the engine's block is the other:
    // both are rows, and the read's own order does not reach the file (AAP 0.12.4).
    expect(policyRows().map((row) => row['id'])).toEqual([
      QUESTION_BY_PERSONA.id,
      BLOCK_BY_ENGINE.id,
    ]);
    expect(policyRows().map((row) => row['sequence'])).toEqual([
      QUESTION_BY_PERSONA.sequence,
      BLOCK_BY_ENGINE.sequence,
    ]);
  });

  it('leaves out an event that names no policy', () => {
    expect(policyRows().map((row) => row['id'])).not.toContain(EXPORT_BY_PERSONA.id);
  });

  it('records each row under the policy its own event names, and never under null', () => {
    const named = policyRows().map((row) => row['policyId']);

    expect(named).toEqual([POLICY_OF_QUESTION, POLICY_OF_BLOCK]);
    expect(named).not.toContain(null);
  });

  it('labels its decisions as the simulated control they are, inside a simulated document', () => {
    // The section's label is a computed control's, read from the one owner of the exact §5.3 string
    // rather than retyped, and the marker and the fixed section order are what a reader meets first.
    expect(sectionOf(DOCUMENT, 'policyDecisions')['label']).toBe(SIM_LABELS[4]);
    expect(DOCUMENT['simulated']).toBe(true);
    expect(DOCUMENT['generatedAt']).toBe(DEMO_CLOCK);
    expect(Object.keys(DOCUMENT)).toEqual([
      'simulated',
      'generatedAt',
      'product',
      'workspace',
      'deployment',
      'outboundLedger',
      'policyDecisions',
      'auditChain',
    ]);
  });

  it('produces identical bytes twice over the same reads', () => {
    const rebuilt = buildEvidencePack(READS);

    expect(rebuilt.content).toBe(PAYLOAD.content);
    expect(rebuilt.filename).toBe(PAYLOAD.filename);
    expect(rebuilt.mediaType).toBe(PAYLOAD.mediaType);
  });
});
