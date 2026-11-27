/**
 * The five policies of the workspace: the four the policy engine evaluates and the one it only
 * declares.
 *
 * Fixing inputs: contracts §7.2 fixes the policy set and the display text each rule carries,
 * `platform-specification.md` SCR-07 renders it, and AAP 0.8 with AAP 0.12.1 fixes which of the
 * five the engine evaluates. AAP 0.6.3 fixes the empty allowed list behind POL-001 as the reason
 * every outbound endpoint is blocked and the outbound ledger counts blocked events, and AAP 0.6.3,
 * 0.8 and 0.12.4 (SCR-06) fix the block POL-007 places on an external model, with the in-boundary
 * model as the permitted alternative.
 *
 * Records only (rule P-6). No decision, deny reason, count of blocked events or other outcome is
 * stored here: `src/domain/policy/evaluate.ts` composes the decision and its reason in plain words
 * from these records when it runs, and `src/domain/aggregation/ledger.ts` counts blocked events
 * from the audit trail. Each record states a rule the inputs fix and nothing they do not.
 *
 * `evaluationStatus` is what separates the two kinds, and it is the only member a screen needs in
 * order to tell them apart: `'evaluated'` for a rule the engine runs (POL-001, POL-003, POL-005
 * and POL-007), and `'declared'` for POL-009, which is declared configuration the engine never
 * evaluates and which the interface shows under the fixed `Declared, not verified` label (rule
 * P-4). No record describes itself as establishing sovereignty, withstanding an edit or stopping a
 * copy, and none claims a state this workspace does not check (rule P-4).
 *
 * Imported only by `src/services/mock/seed-loader.ts`, which hands the records to the mock adapter;
 * nothing outside `src/services/mock/` reads them (rule P-2).
 *
 * DERIVATION — the seed document is not on disk. The policy records belong to
 * `platform-seed-data.md`, which is not part of this repository, so the particulars below are
 * derived rather than transcribed. What the inputs fix is the set and its treatment: contracts §7.2
 * fixes the five identifiers and the display text each rule carries, AAP 0.8 and 0.10 fix that
 * POL-001, POL-003, POL-005 and POL-007 are evaluated and POL-009 only declared, and AAP 0.6.3
 * fixes the empty allowed list behind POL-001 and the block POL-007 places on the external model.
 * If the seed document is supplied later, its table transcribes over these records and supersedes
 * them with no change to any consumer, because every consumer reads a policy through the service.
 *
 * `SeededPolicy` is declared here because `src/types` owns no rule-set shape: `PolicyDetail` in
 * `src/types/screen-dto.ts` is the screen's view of one policy — its display statement beside the
 * decisions the engine recorded — and not the record this module holds (AAP 0.12.2).
 *
 * No input fixes POL-005's subject: AAP 0.8, 0.12.1 and 0.16 fix that it exists and that the engine
 * evaluates it, and none states what it governs. The rule recorded below is the one approval gate
 * the inputs do state — a response option whose constraint check reports a breach cannot be sent
 * for approval (AAP 0.12.2 validation rules; AAP 0.12.4 SCR-04) — carried as POL-005, the evaluated
 * rule with no stated subject that this set does not otherwise cover. The wording is the record's
 * own and the engine cites the identifier.
 */

import type { PolicyId } from '../types';

/**
 * One seeded policy.
 *
 * Not a screen shape and not an engine result: `PolicyDetail` (`src/types/screen-dto.ts`) is what
 * SCR-07 receives, with its `statement` filled from `displayText` and its `evaluated` from
 * `evaluationStatus`, and `PolicyDecision` (`src/types/service.ts`) is what the engine returns.
 * This interface holds the rule itself, in the words the inputs give it.
 *
 * `ruleText` and `displayText` are kept apart because one addresses the engine and the other the
 * reader: `ruleText` is the rule as it applies, and `displayText` is the statement the policy list
 * and the policy detail screen show.
 */
export interface SeededPolicy {
  /** The policy's identifier, `POL-nnn`. */
  id: PolicyId;

  /** The policy's title, as the policy list and the detail screen show it. */
  title: string;

  /** The rule itself, as the engine applies it and as a denial cites it. */
  ruleText: string;

  /** The statement a reader sees on the policy list and on the policy detail screen. */
  displayText: string;

  /** Whether the engine evaluates this policy, or the record only declares it. */
  evaluationStatus: 'evaluated' | 'declared';
}

/**
 * The five policies, in identifier order, which is the order the policy list shows them in.
 *
 * Four are evaluated by `src/domain/policy/evaluate.ts`; POL-009 on customer-held keys is declared
 * configuration, shown as `Declared, not verified` and never evaluated (rule P-4). The array is
 * read-only, so a consumer reads the set and cannot extend or reorder it.
 */
export const POLICIES: readonly SeededPolicy[] = [
  {
    id: 'POL-001',
    title: 'Outbound endpoints',
    ruleText:
      'A request to an endpoint outside this deployment is checked against the allowed list before it is made. The allowed list is empty, so every outbound endpoint is blocked: the request is refused, the refusal is recorded as a blocked event, and the endpoint is never contacted.',
    displayText:
      'Calls to endpoints outside the workspace are blocked. The allowed list is empty, so every outbound endpoint is refused and recorded as blocked — the external model, the public risk feed, the vendor telemetry collector and the licence check among them — and none of them is contacted.',
    evaluationStatus: 'evaluated',
  },
  {
    id: 'POL-003',
    title: 'Approval decision duty',
    ruleText:
      'An approval is decided by a persona other than the one who requested it. The requester is never eligible to decide, and a decision taken by a persona the approval does not name as eligible is refused with this rule and the reason in plain words.',
    displayText:
      'The persona who requested an approval cannot decide it. The decision is taken by one of the personas the approval names as eligible, and the audit trail records which persona decided and when.',
    evaluationStatus: 'evaluated',
  },
  {
    id: 'POL-005',
    title: 'Response option validation before approval',
    ruleText:
      'A response option may be sent for approval only once its constraint check passes. An option whose constraint check reports a breach — a lever below its minimum, above its maximum or off its step — is not sent: the request naming it is refused with this rule and the breach stated in plain words, and the option stays available for correction.',
    displayText:
      'Only a response option that satisfies its own constraints can be sent for approval. An option that breaches one is refused here, with the breach named, rather than approved.',
    evaluationStatus: 'evaluated',
  },
  {
    id: 'POL-007',
    title: 'Model boundary',
    ruleText:
      'A question whose context carries material classified customer-confidential, or material whose residency is eu-only, is not sent to an external model. The answer is blocked with this rule and the reason in plain words, and the in-boundary model is offered as the permitted alternative, so the reader can switch to it and ask again in one action.',
    displayText:
      'Material classified customer-confidential, and material with eu-only residency, never reaches an external model. A blocked question names this rule, the permitted alternative is the in-boundary model, and the block card offers the switch to it.',
    evaluationStatus: 'evaluated',
  },
  {
    id: 'POL-009',
    title: 'Customer-held keys',
    ruleText:
      'The deployment declares that encryption key custody sits with the customer. This is declared configuration: the policy engine never evaluates it, no workspace behaviour depends on it, and the configuration record behind the declaration is shown beside it under the label Declared, not verified.',
    displayText:
      'Key custody is declared to sit with the customer rather than with the platform. The workspace reports this as declared configuration under the label Declared, not verified: nothing in this demonstration reads, checks or proves key custody.',
    evaluationStatus: 'declared',
  },
];
