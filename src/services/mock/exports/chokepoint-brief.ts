/**
 * The chokepoint-brief download's assembler for the demonstration adapter.
 *
 * This module is the one AAP 0.12.1's "Exports" row puts in `src/services/mock/exports/`, and it does
 * the two things that belong to the adapter alone: it reads the session's market-intelligence pack and
 * it supplies the pack's release label from `../seed-loader`, which is the module the seeded records'
 * label is published through. The document composition itself lives in
 * `src/services/exports/chokepoint-brief.ts`, which both adapters call, because AAP 0.12.3 requires the
 * two adapters to share the observable behaviour that makes the swap invisible — the same file, byte for
 * byte, for the same pack. The client supplies the same two lists and the same label from its own atlas
 * read, so the release label reaches it over the port rather than through the seed (rule P-2).
 *
 * No I/O (rule B-1). The module opens no request, no document API and no download: it returns the
 * payload, and the browser code that calls the port turns that payload into a file. It reads no
 * configuration and carries no credential (rule B-2), and the pack reaches it only through the state it
 * is handed (rule P-2).
 */

import type { ExportPayload } from '../../../types';
import { buildChokepointBrief as composeChokepointBrief } from '../../exports/chokepoint-brief';
import { MARKET_PACK_VERSION } from '../seed-loader';
import type { MockState } from '../mock-state';

/**
 * Builds the chokepoint-brief payload from the market-intelligence pack the session holds.
 *
 * The pack's own competitors and crossings are handed over as they stand, still carrying the members the
 * brief must not reproduce; the shared builder filters them on provenance and copies them member by
 * member, so no first-party value can enter the document and every element keeps its own label
 * (rules P-5, P-1).
 *
 * @param state - The session's state. Only its market-intelligence pack is read.
 * @returns The payload: the suggested file name, the media type and the brief's JSON text.
 */
export function buildChokepointBrief(state: MockState): ExportPayload {
  const pack = state.records.marketIntelligence;

  return composeChokepointBrief({
    competitors: pack.competitors,
    chokepoints: pack.chokepoints,
    packVersion: MARKET_PACK_VERSION,
  });
}
