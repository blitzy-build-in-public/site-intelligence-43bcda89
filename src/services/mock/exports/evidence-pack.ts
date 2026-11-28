/**
 * The evidence-pack download's assembler for the demonstration adapter.
 *
 * This module is the one AAP 0.12.1's "Exports" row puts in `src/services/mock/exports/`, and it does
 * the two things that belong to the adapter alone: it reads the session's state and it calls the domain
 * functions the document's four sections come from. The document composition itself lives in
 * `src/services/exports/evidence-pack.ts`, which both adapters call, because AAP 0.12.3 requires the two
 * adapters to share the observable behaviour that makes the swap invisible — the same file, byte for
 * byte, for the same reads.
 *
 * The three reads it hands over: the seeded governance record's summary and declared configuration rows,
 * `computeLedger`'s counted columns over the session's audit events, and `verifyChain`'s report of the
 * chain those events form. Nothing is computed here and no document text is composed here (rule P-6);
 * the two domain modules own the arithmetic and the shared builder owns the file.
 *
 * No I/O (rule B-1). The module opens no request, no document API and no download: it returns the
 * payload, and the browser code that calls the port turns that payload into a file. It reads no
 * configuration and carries no credential (rule B-2), and data reaches it only through the state it is
 * handed (rule P-2).
 */

import { computeLedger } from '../../../domain/aggregation/ledger';
import { verifyChain } from '../../../domain/audit/verify';
import { DEMO_CLOCK } from '../../../types';
import type { ExportPayload } from '../../../types';
import { buildEvidencePack as composeEvidencePack } from '../../exports/evidence-pack';
import type { MockState } from '../mock-state';

/**
 * Builds the evidence-pack payload for the current state of the demonstration.
 *
 * The ledger rows and the chain report are the port's own reads: `computeLedger` counts the outbound
 * ledger's two columns from the audit events over its thirty-day window, and `verifyChain` recomputes
 * every hash in sequence and reports each break it finds. Both are handed to the shared builder rather
 * than interpreted here, so the file the demonstration adapter offers and the file a service-backed
 * client composes are produced by one composition (AAP 0.12.3, rule P-6).
 *
 * @param state - The session's mutable state: the seeded governance record and the hashed audit chain.
 *   It is read and not modified.
 * @returns The payload: the suggested file name, the media type and the pack's JSON text.
 */
export async function buildEvidencePack(state: MockState): Promise<ExportPayload> {
  const sovereignty = state.records.sovereignty;
  const ledgerRows = computeLedger(state.auditEvents, sovereignty, DEMO_CLOCK);
  const report = await verifyChain(state.auditEvents);

  return composeEvidencePack({
    sovereignty: { summary: sovereignty.summary, rows: sovereignty.rows },
    ledgerRows,
    events: state.auditEvents,
    report,
  });
}
