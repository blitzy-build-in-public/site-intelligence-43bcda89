/**
 * PPAP package vocabulary of `platform-contracts.md` §8: the seven evidence-rule identifiers, the
 * rule-and-text pair a package element carries, the readiness slots the aggregation fills, and the
 * draft an extraction review submits.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §8 fixes the evidence rules — RULE-08-AGE, RULE-09-DIM, RULE-10-POR,
 *   RULE-11-CPK, RULE-12-LAB, RULE-18-PSW and RULE-DOC — which are re-run after every accept or
 *   correct of an extracted element value (AAP 0.12.2).
 * - AAP 0.12.2 records the package shape this vocabulary serves: element number and name, state,
 *   rule id and text, threshold and actual, extraction confidence, human review, document id and
 *   pin id, with package readiness as the passing elements over the package's element count to a
 *   whole percent.
 * - AAP 0.6.2 lists `extraction review` among the audited actions, which is why the review draft is
 *   a type here rather than a form's local state.
 *
 * The entity interfaces — `PpapElement`, `PpapPackage` and `EvidencePin` — are contracts §3 records
 * and live in `./entities`, with the element states and confidence values they refer to. This
 * module is the leaf that `./entities` imports from, so it imports nothing but `./primitives` and
 * declares no member that would need an entity back from it.
 *
 * This module declares vocabulary and slots, never values. No rule wording, threshold, reading or
 * computed percentage is written here, because every figure the interface shows is computed from
 * seed records by the rules of `platform-contracts.md` (rule P-6). The arithmetic — passing elements
 * over the package's element count, half up to a whole percent — belongs to
 * `src/domain/aggregation` through `wholePercent` in `src/domain/solver/rounding.ts`.
 *
 * The package screens belong to stage S4 (AAP 0.14.2). These shapes exist so the service port, the
 * seed and the mock adapter's package handlers type-check; no S1-S3 screen reads them.
 *
 * Rule wording, thresholds and readings are seed record content in `src/seed/packages.ts`, never
 * constants here (rule P-6). `PackageReadiness.percent` must equal `wholePercent(passed / total)`,
 * which no type can express, so the aggregation that builds it enforces it, and readiness is
 * defined only for a package with at least one element, because it divides by that count.
 * `ElementReview` names no actor: the reviewer is the active user the service holds (AAP 0.12.1),
 * and its `correctedValue` carries whichever value a decision leaves in place.
 */

import type { PackageId } from './primitives';

/* ---------------------------------------------------------------------------------------------
 * Evidence rules — platform-contracts.md §8
 * ------------------------------------------------------------------------------------------- */

/**
 * The seven evidence-rule identifiers of contracts §8, in the order that file lists them.
 *
 * Held as a tuple so `EvidenceRuleId` is derived from the values and the type cannot drift from
 * them. The rules are re-run after every accept or correct of an extracted element value, and the
 * element states a package reports are what that re-run produces (AAP 0.12.2).
 */
export const EVIDENCE_RULE_IDS = [
  'RULE-08-AGE',
  'RULE-09-DIM',
  'RULE-10-POR',
  'RULE-11-CPK',
  'RULE-12-LAB',
  'RULE-18-PSW',
  'RULE-DOC',
] as const;

/** One of the seven evidence-rule identifiers of contracts §8. */
export type EvidenceRuleId = (typeof EVIDENCE_RULE_IDS)[number];

/**
 * An evidence rule as a package element carries it: the identifier and the plain-language wording
 * the seed record states for that rule.
 *
 * The wording is record content and is never written in a component or a template (rule P-6), which
 * is why it travels beside the identifier rather than being looked up in the presentation layer.
 */
export interface EvidenceRule {
  /** Which of the seven contracts §8 rules this wording belongs to. */
  id: EvidenceRuleId;

  /** The rule's wording, taken from the seed record that declares the rule. */
  text: string;
}

/* ---------------------------------------------------------------------------------------------
 * Package readiness — platform-contracts.md §5
 * ------------------------------------------------------------------------------------------- */

/**
 * A package's readiness, as the aggregation computes it.
 *
 * `total` is the package's own `elements.length` and `passed` counts the elements whose state
 * passed, so readiness is `passed / total` handed to `wholePercent`, which rounds half up to a whole
 * percent (AAP 0.12.1). The seed package's eighteen elements are a fact of that record, never a
 * constant written here or in the arithmetic that reads it.
 *
 * On screen the figure carries the label `Simulated calculation` (rule P-1); rendering that label
 * belongs to the component that shows the value, not to this shape.
 */
export interface PackageReadiness {
  /** Elements whose state passed, counted over the package's own elements. */
  passed: number;

  /** The package's element count, `elements.length`. */
  total: number;

  /** `passed / total` as a whole percent, rounded half up. */
  percent: number;
}

/* ---------------------------------------------------------------------------------------------
 * Extraction review — AAP 0.12.2 evidence rules, AAP 0.6.2 audited actions
 * ------------------------------------------------------------------------------------------- */

/**
 * What a reviewer does with one extracted element value.
 *
 * Either decision causes the seven evidence rules to be re-run for the package. `'accept'` confirms
 * the value the extraction produced; `'correct'` replaces it with the value the reviewer supplies.
 */
export type ElementReviewDecision = 'accept' | 'correct';

/**
 * The draft an extraction review submits for one element of one package.
 *
 * The review is one of the actions the audit chain records (AAP 0.6.2), so the service appends the
 * audit event and takes the reviewer from the active user. Nothing in this shape performs the
 * review, recomputes an element state or names an actor.
 */
export interface ElementReview {
  /** The package whose element is under review, `PPAP-nnnn`. */
  packageId: PackageId;

  /** The element's number within its package, as the package's element record holds it. */
  elementNumber: number;

  /** Whether the extracted value is accepted or corrected. */
  decision: ElementReviewDecision;

  /**
   * The value the element holds after the review: the corrected value on a `'correct'` review, and
   * the extracted value unchanged on an `'accept'`.
   */
  correctedValue: string;
}
