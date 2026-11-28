
/**
 * The six scripted assistant questions: what a planner may ask the evidence assistant, the outline
 * each answer follows, the sentence scaffolding every figure is filled into, and the records each
 * answer cites.
 *
 * Fixing inputs:
 * - AAP 0.8: "`src/seed/assistant-questions.ts` owns the six questions, their answer outlines and
 *   their sentence templates with brace placeholders". This module owns that content and nothing
 *   else. The builders that fill the placeholders live in `src/services/mock/assistant-script.ts`
 *   and hold no question text, no sentence and no figure of their own, so a sentence's wording and
 *   the arithmetic behind its numbers stay in separate modules.
 * - AAP 0.12.1's assistant-builder row and AAP 0.12.4's SCR-06 line: six suggested questions, each
 *   with a scripted and cited answer, and one fixed notice for anything outside the six.
 * - AAP 0.8 again for what the placeholders resolve to: Q1's units late are the customer orders at
 *   stake under the baseline solve of `CASE-1184` with both levers at zero; Q3's readiness is
 *   `PPAP-0219`'s passing elements over its element set; Q4's deferred kits and their value are the
 *   side effect of the transfer lever; Q6 carries no figure at all.
 *
 * Shapes rather than values (rule P-6). No figure is written in this module: a template carries
 * brace placeholders, and every number arrives when the builder fills them from a solver result
 * or from a record. The figures that belong to a document or an exception — the per-day charge and
 * the notice in `DOC-0031`, the units on hold in `EXC-2026-1190` — live in those records' own text
 * fields, so this module names those records by identifier only and never restates a figure they
 * hold. An outline describes the shape of an answer and is not an answer, so it carries no figure
 * either.
 *
 * DERIVATION — the seed document is not on disk. The six questions, their outlines, their templates
 * and the records they cite belong to `platform-seed-data.md`, which is not part of this repository,
 * so that wording is authored here rather than transcribed. What the inputs fix is the set and the
 * arithmetic behind it: AAP 0.12.4's SCR-06 line and AAP 0.2.3's scale fix six questions and one
 * unscripted notice, and AAP 0.8 fixes what each placeholder resolves to — Q1's 580 and 640 units
 * late, Q3's 78 for `PPAP-0219`, Q4's 900 kits and EUR 108,000. If the seed document is supplied
 * later, its table transcribes over these records and supersedes them with no change to any
 * consumer, because every consumer reads a question through the service.
 *
 * Rules this module is built to satisfy:
 * - P-1: nothing here states or implies that a model composed an answer. `UNSCRIPTED_NOTICE` says
 *   the opposite for anything outside the six, and Q6's own sentence says it for the six. The label
 *   that marks the computed figures an answer reports is the assistant panel's to render, so no
 *   template carries one.
 * - P-2: it imports types from `../types` and nothing else, and the folder it lives in may be
 *   imported only by `src/services/mock/seed-loader.ts`.
 * - P-4: no wording here makes a claim about the deployment's posture that the demonstration cannot
 *   support. The POL-007 block card draws its wording from the policy record, which is not this
 *   module.
 * - P-7: every record named here is synthetic seed content. No real vendor, customer, carmaker or
 *   cloud product appears, the barred legacy workspace name appears nowhere, and there is no filler
 *   text.
 * - B-1 and B-2: no URL, no external asset, no credential and no environment read.
 */

import type { CustomerOrderId, DocumentId, ExceptionId, PackageId } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Questions — the six scripted suggestions, AAP 0.8 and AAP 0.12.4 SCR-06
 * ------------------------------------------------------------------------------------------- */

/**
 * The record family one of a question's references points at.
 *
 * The kind is what tells the builder which family to read a reference from, so two identifiers that
 * happen to share a shape are never looked up in the wrong place.
 */
export type AssistantQuestionRecordKind =
  | 'exception'
  | 'document'
  | 'package'
  | 'customer-order'
  | 'solver-case';

/**
 * One record a question's template resolves against and its answer cites.
 *
 * The identifier types are `src/types/primitives.ts`'s own, and each member repeats its family once
 * in `kind` for the builder's dispatch and once in the identifier's name for a reader. The
 * `solver-case` member carries a plain `string` because `src/types/solver.ts` gives `SolverCase.id`
 * that shape: a case's reference is seed record content and the contracts declare no identifier type
 * for it.
 */
export type AssistantQuestionRecord =
  | { kind: 'exception'; id: ExceptionId }
  | { kind: 'document'; id: DocumentId }
  | { kind: 'package'; id: PackageId }
  | { kind: 'customer-order'; id: CustomerOrderId }
  | { kind: 'solver-case'; id: string };

/**
 * One scripted question with everything its answer is built from.
 *
 * Declared here rather than in `src/types` because the shared-type folder owns no question shape:
 * its screen DTOs describe the `Answer` a builder returns, not the suggestion a reader picks. AAP
 * 0.12.1 makes this module the owner of the six questions, so the shape lives beside them, and
 * `src/services/mock/` is the only folder that consumes it (rule P-2).
 *
 * `id` is the key AAP 0.8 uses when it fixes a placeholder's resolution ("Q1's", "Q3's", "Q4's"), so
 * the identifiers `Q1` to `Q6` are the contract between this module and the builder.
 */
export interface AssistantQuestion {
  /** The question's key, `Q1` through `Q6` in the order the assistant lists them. */
  id: string;

  /** The suggested question as the assistant prints it, in a planner's own words. */
  prompt: string;

  /** What the answer covers, in one or two plain sentences with no figure in it. */
  outline: string;

  /**
   * The answer's sentence scaffolding: the words, with every value left as a `{placeholder}` for
   * the builder to fill at call time.
   */
  template: string;

  /** The records the template resolves against, in the order the answer cites them. */
  records: readonly AssistantQuestionRecord[];
}

/**
 * The six scripted questions, in the order SCR-06 lists them.
 *
 * Every `template` holds at least one `{placeholder}`, and no template holds a figure. Each entry
 * below states what its placeholders resolve to, which is the mapping AAP 0.8 fixes.
 */
export const ASSISTANT_QUESTIONS: readonly AssistantQuestion[] = [
  /**
   * Q1 — what a no-action response costs the customer orders at stake.
   *
   * `{unitsLateCo770233}` and `{unitsLateCo770251}` are the units-late measures of those two orders
   * under the baseline solve of `CASE-1184` with the air-freight and transfer levers both at zero
   * (AAP 0.8), so the sentence reports what doing nothing would leave late rather than a plan.
   */
  {
    id: 'Q1',
    prompt: 'If nothing is done about the delayed air sets, which customer orders run late and by how much?',
    outline:
      'Names the customer orders a no-action response leaves late and states what each one comes to against its own due date.',
    template:
      'With neither air freight nor a transfer in the plan, the affected customer orders miss their dates: CO-770233 runs {unitsLateCo770233} units late and CO-770251 runs {unitsLateCo770251}, both under the baseline solve of CASE-1184.',
    records: [
      { kind: 'exception', id: 'EXC-2026-1184' },
      { kind: 'solver-case', id: 'CASE-1184' },
      { kind: 'customer-order', id: 'CO-770233' },
      { kind: 'customer-order', id: 'CO-770251' },
    ],
  },

  /**
   * Q2 — the exposure the supply agreement states in its own words.
   *
   * `{documentTerms}` is the agreement's own terms text, copied from the document record. The charge
   * per day and the notice it requires are that record's content, so they reach the answer through
   * the placeholder and are never written here (rule P-6). This is the question whose context
   * carries a customer-confidential document, which is what makes POL-007 block the external model
   * on it (AAP 0.12.4 SCR-06).
   */
  {
    id: 'Q2',
    prompt: 'What does the supply agreement commit us to if the air sets arrive late?',
    outline:
      'Quotes the terms the supply agreement sets for a late delivery, which is where the exposure it commits us to lies.',
    template:
      'DOC-0031, the supply agreement behind the air-set order, states the terms that govern a late delivery: {documentTerms}',
    records: [
      { kind: 'document', id: 'DOC-0031' },
      { kind: 'exception', id: 'EXC-2026-1184' },
    ],
  },

  /**
   * Q3 — the readiness of the part approval package.
   *
   * `{packageReadiness}` is `PPAP-0219`'s readiness as the aggregation computes it: its passing
   * elements over its full element set, rounded to a whole percent (AAP 0.8, contracts §5). The
   * builder formats the percent mark; the figure itself comes from the package record's elements.
   */
  {
    id: 'Q3',
    prompt: 'Is the part approval package for the housings ready to submit?',
    outline:
      'States the readiness of the package as the share of its elements that pass their evidence rules.',
    template:
      'PPAP-0219 stands at {packageReadiness} readiness, counted as its passing elements over its full element set.',
    records: [{ kind: 'package', id: 'PPAP-0219' }],
  },

  /**
   * Q4 — the side effect the transfer option carries.
   *
   * `{kitsDelayed}` and `{valueDeferredEur}` are the side effect of the same case's transfer lever
   * at the seeded quantity: the kits the transfer pushes past their own dates and the value that
   * deferral holds (AAP 0.8). Both are solver output, so neither is written here, and the
   * acknowledgement the sentence mentions is what SCR-05 requires before a plan can be approved.
   *
   * The sentence states the currency marker itself, as the trade-off template beside it does: the one
   * prose formatter groups the amount and adds no currency code, so the marker is the sentence's own
   * text and no amount in an answer is left unitless (AAP 0.8, rule P-6).
   */
  {
    id: 'Q4',
    prompt: 'If we transfer sets to Brno instead of air-freighting them, what do we defer?',
    outline:
      'States the side effect the transfer option carries — the service kits it pushes past their dates and the value that deferral holds — and the acknowledgement it requires.',
    template:
      'Transferring the sets to Brno defers {kitsDelayed} Brno service kits past their own dates, and the value that deferral carries is EUR {valueDeferredEur}. That side effect is the one a planner acknowledges before the plan can be approved.',
    records: [
      { kind: 'exception', id: 'EXC-2026-1184' },
      { kind: 'solver-case', id: 'CASE-1184' },
    ],
  },

  /**
   * Q5 — the open exception's own account of what changed.
   *
   * `{whatChanged}` is the exception record's own text, which is where the units it holds sit, and
   * `{missingInputs}` is the list of inputs its impact assessment could not read (AAP 0.8). Quoting
   * the record is what keeps this answer honest: nothing about the exception is restated here.
   */
  {
    id: 'Q5',
    prompt: 'What is holding up the housings on the open exception, and what can we not see yet?',
    outline:
      'Quotes the account the exception records of what changed and names the inputs its impact assessment could not read.',
    template:
      'EXC-2026-1190 records the change in its own words — {whatChanged} — and names the inputs the impact assessment could not read: {missingInputs}.',
    records: [{ kind: 'exception', id: 'EXC-2026-1190' }],
  },

  /**
   * Q6 — whether a model is behind these answers.
   *
   * `{modelLabel}` is the catalogue entry the selector offers, and `{simulationLabel}` is the
   * workspace's fixed simulation label, both filled at call time. The question carries no record
   * reference because it is about the demonstration rather than about a record, and no figure
   * because honesty about the mechanism needs none (rule P-1).
   */
  {
    id: 'Q6',
    prompt: 'Is there a model behind these answers, and how much of what I read is simulated?',
    outline:
      'States that the answers are a script over the cited records rather than a composition by a model, names the model entry the selector offers, and names the label that marks the simulated figures the workspace reports.',
    template:
      'There is no model behind these answers: each one is a script over the cited records. {modelLabel} is the entry the model selector offers, and {simulationLabel} marks the figures the workspace reports.',
    records: [],
  },
];

/**
 * What the assistant returns for a question outside the six.
 *
 * The wording is fixed by AAP 0.12.4 SCR-06 and is carried character for character, because it is
 * the interface's own statement that no model stands behind the panel (rule P-1). It is quoted
 * verbatim: no paraphrase, no added punctuation, no second sentence.
 */
export const UNSCRIPTED_NOTICE =
  'This demonstration has no model behind it. Try one of the suggested questions.';

/**
 * What the unscripted answer's `missing` list names — contracts §10, AAP 0.8.
 *
 * Contracts §10 requires an answer's `missing` list to state what the answer lacked, and the notice
 * above is the whole of the text a reader sees, so this diagnostic is assistant text and belongs here
 * beside it: `src/services/mock/assistant-script.ts` builds answers and holds no sentence of its own,
 * which leaves this module the author of every line the panel prints (AAP 0.8, AAP 0.12.1's
 * assistant-builder row). It states the one input the demonstration is missing for a question outside
 * the six — a seeded question that covers it — and it is a diagnostic line the assistant's expander
 * lists, never a second answer sentence.
 */
export const UNSCRIPTED_MISSING_INPUT =
  'A seeded question covering the one asked, which the demonstration does not hold.';
