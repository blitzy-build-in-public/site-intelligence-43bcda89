/**
 * Declared deployment configuration: the summary, the ten config rows and the outbound endpoints
 * of the SCR-07 governance panel.
 *
 * Records only (rule P-6). The module holds what the deployment *declares* — its processing tier,
 * its data residency, its ten configuration rows and the four outbound endpoints its declared
 * configuration blocks — and nothing it could be read as having established. Every row's status is
 * the literal `'declared'`, so the panel renders each one under the fixed `Declared, not verified`
 * label and has no member with which to claim a verified state (rule P-4).
 *
 * Fixing input: `platform-contracts.md` §3 names these records without fixing their values, AAP
 * 0.10 fixes the panel's shape — the summary, ten rows `SD-1` Data control through `SD-10`
 * Auditability, each with the record behind it and the last-declared date 2026-12-01, plus the
 * outbound ledger whose allowed list is empty — and AAP 0.6.3 fixes the four `.example` endpoints.
 *
 * DERIVATION — seed §8 is not on disk. `platform-seed-data.md` §8, which holds the rows' own
 * labels, their record identifiers and each endpoint's purpose, is not part of this repository, so
 * the two row labels, the three record identifiers and the four endpoint names AAP 0.10 and 0.6.3
 * quote are kept exactly as those sections give them, and the remaining eight labels and their
 * record identifiers are derived inside the same vocabulary: one row per configuration area the
 * panel declares, in the order the panel reads, closing on Auditability. If §8 is supplied later,
 * its labels and records transcribe over this derivation and supersede it; no consumer changes,
 * because the panel and the ledger aggregate read the payload from here rather than restating a
 * row.
 *
 * Counts are absent by design. `LedgerRow` carries the thirty-day allowed and blocked totals, and
 * `src/domain/aggregation/ledger.ts` computes them from the audit trail (AAP 0.12.1, rule P-6), so
 * the endpoints below are typed without those two members and no figure is stored that neither the
 * solver nor the aggregation rules produced. `lastAttempt` is `null` throughout rather than an
 * invented instant: the declared configuration blocks all four endpoints, so the record has no
 * attempt to state and the ledger aggregate fills the reading from the audit trail if one exists.
 *
 * Rules served:
 * - P-4: declared configuration, never asserted control. Every row names a configuration area and
 *   records where it was declared; no row, purpose or comment states a posture the deployment would
 *   establish, and the payload carries no member through which a consumer could read one. The words
 *   `SOVEREIGNTY` and `SovereigntySeed` are the project's own names for this record set — they name
 *   the panel, not a claim it makes.
 * - P-6: no count, percentage, amount or aggregate appears below, and no date is computed here.
 * - P-7: identifiers and purposes are synthetic, and the four endpoints are opaque `.example`
 *   placeholders with no real vendor, customer or cloud product named.
 * - B-1: no reachable address. A `.example` host is reserved for documentation and resolves
 *   nowhere, and nothing below is ever contacted.
 * - B-2: no credential, no configuration read, no environment value.
 * - P-2: `../types` is the only import, so this module cannot become a second data boundary; only
 *   `src/services/mock/seed-loader.ts` imports the seed folder.
 */
import type { DeploymentSummary, LedgerRow, SovereigntyRow } from '../types';

/**
 * One endpoint of the outbound ledger as the record states it.
 *
 * The thirty-day allowed and blocked totals are the two members left out of `LedgerRow`, because
 * they are computed from the audit trail by `src/domain/aggregation/ledger.ts` rather than stored
 * (AAP 0.12.1, rule P-6).
 */
export type LedgerEndpoint = Omit<LedgerRow, 'allowed' | 'blocked'>;

/**
 * The record set the governance panel reads.
 *
 * Same members as the panel's payload type in `src/types/screen-dto.ts`, with the ledger typed as
 * endpoints rather than counted rows. The collections are mutable, matching that payload, so a
 * handler can spread this record and replace the ledger with the counted rows the aggregation
 * returns.
 */
export interface SovereigntySeed {
  /** The deployment summary shown above the ten rows. */
  summary: DeploymentSummary;

  /** The ten declared configuration rows, in the panel's own order. */
  rows: SovereigntyRow[];

  /** The outbound endpoints, one row each, without the computed call totals. */
  ledger: LedgerEndpoint[];
}

/**
 * The declared deployment configuration of the demonstration.
 *
 * Every value is a declaration the deployment makes about itself, dated when it was last declared;
 * none of it is a measurement. The processing tier is `S3` and outbound traffic is declared
 * blocked, which is what the shell's pill renders beside its `Simulated control` tag, and the
 * declared residency is the EU processing boundary the assistant's policy blocks the external
 * reasoning model for.
 */
export const SOVEREIGNTY: SovereigntySeed = {
  summary: {
    tier: 'S3',
    outboundBlocked: true,
    residency: 'eu-only',
    lastDeclaredOn: '2026-12-01',
  },
  rows: [
    {
      id: 'SD-1',
      label: 'Data control',
      status: 'declared',
      record: 'CFG-DATA-CTRL-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-2',
      label: 'Data residency',
      status: 'declared',
      record: 'CFG-DATA-LOC-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-3',
      label: 'Key management and rotation',
      status: 'declared',
      record: 'KMS-KEY-ROT-2026-11',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-4',
      label: 'Access control',
      status: 'declared',
      record: 'CFG-ACCESS-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-5',
      label: 'Outbound traffic',
      status: 'declared',
      record: 'CFG-EGRESS-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-6',
      label: 'Model boundary',
      status: 'declared',
      record: 'CFG-MODEL-BOUNDARY-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-7',
      label: 'Data retention',
      status: 'declared',
      record: 'CFG-RETENTION-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-8',
      label: 'Backup and recovery',
      status: 'declared',
      record: 'CFG-BACKUP-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-9',
      label: 'Incident process',
      status: 'declared',
      record: 'CFG-INCIDENT-01',
      lastDeclaredOn: '2026-12-01',
    },
    {
      id: 'SD-10',
      label: 'Auditability',
      status: 'declared',
      record: 'AUDIT-CHAIN-01',
      lastDeclaredOn: '2026-12-01',
    },
  ],
  ledger: [
    {
      endpoint: 'api.external-llm.example',
      purpose: 'External reasoning model inference requested from the assistant panel',
      state: 'blocked',
      lastAttempt: null,
    },
    {
      endpoint: 'public-risk-feed.example',
      purpose: 'Public supply-risk feed subscription refresh',
      state: 'blocked',
      lastAttempt: null,
    },
    {
      endpoint: 'telemetry.vendor.example',
      purpose: 'Product telemetry upload from the demonstration build',
      state: 'blocked',
      lastAttempt: null,
    },
    {
      endpoint: 'license-check.vendor.example',
      purpose: 'Vendor licence validation for the modelling toolchain',
      state: 'blocked',
      lastAttempt: null,
    },
  ],
};
