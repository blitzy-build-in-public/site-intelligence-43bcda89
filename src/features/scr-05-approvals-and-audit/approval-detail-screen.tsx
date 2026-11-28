/**
 * The approval detail of SCR-05: the plan put to an approver, the cost it adds set against the
 * revenue it protects, the inputs behind it, the write-back it would perform, the decision taken on
 * it, and — once it is approved — the tracker that steps through the simulated write-back and the
 * outcome card that sets the plan's figures against the figures the records reached.
 *
 * WHAT THIS FILE IMPLEMENTS. The SCR-05 detail half of AAP §0.12.4's screen row — "Inbox and detail
 * with plan summary, cost against protected revenue, missing inputs, write-back preview; approve,
 * reject and request changes each needing a comment; after approval a tracker steps through the
 * write-backs and then an outcome card sets planned against resulting figures" — at the
 * `/approvals/:approvalId` route AAP §0.7 and §0.13.1 assign to stage S1. It serves functional
 * requirement F9 and success criterion 7, and it is the surface acceptance tests T-07 (a decision
 * recorded once with its comment), T-13 (the visible half of the freshness rule) and T-17 (the seven
 * states) assert.
 *
 * WHERE THE DATA COMES FROM — rules P-2 and P-6. Four reads, each one `useQuery` keyed
 * `[method, ...args]` and each through `useService()`:
 * - `getApproval(approvalId)` is the record: the plan reference, the requester and the roles that may
 *   decide it, the two euro members, the decision where one exists and the write-backs in their
 *   recorded order. Its `meta.freshness` is what the freshness gate below reads.
 * - `getScenarioSet(exceptionId)` is the plan's own option, because `Approval` carries no member for
 *   the side effects an approver has to acknowledge: the option's `sideEffects` are the record's.
 * - `getExceptionDetail(exceptionId)` is the plant the plan lands on (see what `Approval` does not
 *   carry, below) and the missing inputs the record states.
 * - `getApprovalOutcome(approvalId)` is the outcome card's two measurements, read only once the plan
 *   is approved, because only an approved plan has a change whose effect can be set beside it.
 *
 * A fifth read, `getActiveUser`, goes through the demonstration capability that sits beside the port
 * rather than through the port itself, and answers who the decision gate below is about. It is taken
 * on mount rather than read from the persona the provider seeded at start-up, because a reader may
 * have switched role since: the adapter is enforcing whichever persona the switch selected, and the
 * gate has to describe the role a decision would actually be evaluated against. The capability is
 * absent on an adapter without identity, and `skipToken` then reads nothing.
 *
 * Nothing is computed here. The two euro members are the record's, the side-effect figures are the
 * option's, the missing inputs are the exception's, the write-back steps are the approval's, and the
 * outcome's two sides are the service's own `solveSupplyDelay` output. This module adds, subtracts,
 * rounds and derives nothing, so `tests/source-checks/no-typed-figures.test.ts` — which scans this
 * folder for currency literals and identifier literals — has nothing to find: every value on screen
 * arrives through a record.
 *
 * THE FRESHNESS GATE — T-13's visible half, AAP §0.2.1. The service refuses `requestApproval` and
 * `decideApproval` while ERP reports `stale` or `unavailable`, naming the source and its as-of time.
 * This screen is the explanation beside that refusal: it locates the ERP entry in `meta.freshness` by
 * `APPROVAL_GATE_SOURCE`, and when that entry is stale or unavailable it raises `StateBoundary`'s
 * stale banner — which names the same source label and prints the same instant — and disables all
 * three decision controls with one shared sentence built from the record's own label and as-of value.
 * A source reported `partial` keeps the controls enabled, because the service's gate accepts it: a
 * control disabled where the service would act is the usability defect rule P-8 exists to prevent.
 * An absent entry raises no gate at all, because a notice naming a source nobody reported would assert
 * a record that does not exist.
 *
 * THE DECISION GATE. Approve, reject and request changes each require a comment (AAP §0.12.2), and
 * approve additionally requires every side effect the plan carries to be acknowledged, one control per
 * side effect whose accessible name is {@link sideEffectAcknowledgement} of the plan's plant. Who may
 * decide the plan is read from the record as well: POL-003 keeps its requester from deciding it, and
 * the record names the roles that may, so a persona the record does not open to meets a disabled
 * control carrying {@link decisionEligibilityReason} rather than the refusal the service would return
 * (AAP §0.2.2, rule P-8). The persona that sentence is about is the adapter's own current answer, read
 * through the demonstration capability's `getActiveUser` on mount rather than taken from the persona
 * the provider seeded at start-up, so a reader who switched role is judged, and explained to, on the
 * role the adapter is actually enforcing. That gate blocks only when the persona is known: while the
 * read is pending or has failed, or the bound adapter carries no identity, the screen falls back to the
 * comment and acknowledgement gate and to the service's own refusal, because a control disabled on a
 * fact nobody knows yet is the control rule P-8 forbids. The comment and the acknowledgements are held
 * in this component, sent to the port, and never written to a record locally: a refused decision
 * changes nothing on screen except the message the service returned, which is what keeps the service
 * the only author of what happened.
 *
 * THE SEVEN STATES — `platform-specification.md` §8, AAP §0.12.4. `src/components/screen-state.ts` is
 * the one place any screen decides which state its records are in, from facts the queries settled to: a
 * permission refusal (of any read, or of a decision) is `forbidden`, a non-`Problem` rejection is
 * `offline`, a validation refusal of the read is `conflict`, a `'not-found'` one is `empty`, a stale
 * gating source is `stale`, an unavailable one is `offline`, an incomplete one is `partial`, a pending
 * read is `loading`, and a route that named no approval is `empty`. A record missing a member this
 * screen shows, or a plan whose option could not be read, is `partial`. `StateBoundary` owns what each
 * state looks like.
 *
 * PERMISSION AND POLICY FAILURES. A decision refused for permission renders `ForbiddenCard` through
 * the boundary's forbidden state, naming `requiredPermission`, `rolesWithPermission` and `traceId`. A
 * decision refused by a policy renders {@link PolicyBlockPanel} with the rule identifier, the service's
 * sentence and the alternative the rule permits, and disables the controls with that same sentence.
 * Neither path creates an approval, a write-back or an audit record locally, and nothing here states
 * that the refusal establishes anything about the deployment (rule P-4).
 *
 * THE COMPONENTS THIS FILE OWNS. `TextAreaField` and `Button` in `src/components` own the `<textarea>`
 * and the `<button>` this screen needs (AAP §0.5.2), so {@link CommentField} and
 * {@link AcknowledgementToggle} compose those primitives and render no native control themselves. Both
 * stay non-exported components of this file because each joins the primitive to this screen's own copy
 * rather than owning an element: the comment field is a labelled `TextAreaField` with its hint, and the
 * acknowledgement is a `Button` carrying `aria-pressed` and composing the shared
 * `CONTROL_STRUCTURE_CLASSES` and `SECONDARY_CONTROL_CLASSES`, so it keeps the same target size, focus
 * ring and surface as every other control. Both render inside the decision card, above the three
 * controls they gate, so the gate and the reason for it sit together.
 *
 * WHAT `Approval` DOES NOT CARRY. It declares no `sideEffects` member and `SideEffect` carries no plant,
 * while AAP §0.12.4 fixes the acknowledgement as "I have read the side effect on <plant>" for "that
 * plan's plant": the side effects are read from the approved option's own record and the plant named is
 * the exception's `plantId`, never a value invented here. It carries no missing-input member either, so
 * the missing inputs shown are the exception's own `missingInputs`, the record that assessed them; and
 * it carries no evidence reference, so the two euro members open the drawer through the approval's own
 * identifier as the inbox's figure columns do (`APR-` reference to `GET /evidence?ref=`).
 *
 * THE INVALIDATION, AND THE ONE ACTION THE CARD DOES NOT OFFER. The cache is invalidated after a
 * decision through `queryClient.invalidateQueries` with the port member's own name as the key prefix
 * rather than through a helper owned by the shell: this module may not import `src/app`, and a write's
 * invalidation is one call per read, so the grant-exception dialog declares the same helper beside its
 * own write. The reads a decision moves are named once, below, and both writes invalidate them whichever
 * way the call settled, because a decision can move the record even when it throws. No control reviews
 * the outcome (`reviewApprovalOutcome`): AAP §0.12.4's SCR-05 row asks the card to set planned against
 * resulting figures and names no review action, so none is offered.
 *
 * Rules this module is built to satisfy:
 * - P-1: the two euro members carry `Simulated calculation` from `SIM_LABELS`, every write-back step
 *   carries `WRITE_BACK_TAG` from its own module, and the outcome card carries its own label.
 * - P-2: every read and both writes go through `useService()`; no seed, adapter, domain or HTTP module
 *   is reachable, and no record is mutated locally.
 * - P-3: nothing here presents a browser-side check as the authorisation a deployment would make.
 * - P-4: no sentence claims that the flow establishes a configuration, prevents a copy or resists an
 *   edit; the write-backs are labelled simulated wherever they appear.
 * - P-6: no figure, amount, date, identifier or missing input is typed — each is a record's own.
 * - P-7: every name on screen is a seeded persona, plant or record reference; no real company or
 *   product is named and no placeholder prose stands in for a record.
 * - P-8: all three decisions and every retry either act or are disabled with the sentence explaining
 *   why, reachable by keyboard through the shared control.
 * - B-1, B-2: nothing here fetches, reads configuration or carries a credential.
 * - B-3: WCAG 2.2 AA — the comment field has a programmatic label, every control keeps the 24x24 px
 *   target and the 2 px focus ring, the acknowledgement's state is carried by `aria-pressed` and by a
 *   status label rather than by colour, the headings descend from the single `<h1>`, and every colour
 *   is a role token of `src/theme/tokens.css`, so both themes keep the contrast the specification
 *   measured.
 */
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import { useId, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { Link, useParams } from 'react-router';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { PageHeader } from '../../components/page-header';
import { Panel } from '../../components/panel';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import { PENDING_CLOCK_ICON, StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { TextAreaField } from '../../components/text-area-field';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
} from '../../components/tooltip';
import { useDemonstration, useService } from '../../services/service-provider';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import {
  APPROVAL_GATE_SOURCE,
  SEGREGATION_OF_DUTIES_POLICY_ID,
  SIM_LABELS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ActiveUser,
  Approval,
  ApprovalId,
  ApprovalOutcome,
  ApprovalStatus,
  AuditEventId,
  DecisionAction,
  ExceptionDetail,
  Freshness,
  PlantId,
  PolicyId,
  Result,
  Scenario,
  ScenarioSet,
  Scope,
  SideEffect,
  SimLabel,
  WriteBack,
  WriteBackState,
} from '../../types';
import { OutcomeCard } from './outcome-card';
import { WRITE_BACK_TAG, WriteBackTracker } from './write-back-tracker';

/* ---------------------------------------------------------------------------------------------
 * The fixed label and the wording, in the one place each is written
 * ------------------------------------------------------------------------------------------- */

/**
 * The `Simulated calculation` label of specification §5.3, read from `SIM_LABELS` at the index §5.3
 * gives it. Typed `SimLabel`, so a reworded list fails this file's compilation rather than letting a
 * second spelling of the label reach the screen (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * Everything this screen states in its own voice, held here so the wording has one owner: the
 * component renders these strings and the colocated suite names them through this object instead of
 * retyping them.
 *
 * None of them is a specification string — the seven §5.3 labels and `WRITE_BACK_TAG` belong to the
 * modules that carry them and are not repeated here — and none carries a figure, an amount, a date or
 * a record identifier (rule P-6). No sentence states a property of the deployment (rule P-4).
 */
export const APPROVAL_DETAIL_TEXT = {
  /** The screen's title, in the one `<h1>` it renders through `PageHeader`. */
  title: 'Approval',

  /** What the detail holds, under the title. */
  description:
    'The plan put to an approver, the cost it adds against the revenue it protects, and the decision taken on it.',

  /** The way back to the inbox, which is the route this screen is opened from. */
  backToInbox: 'Back to approvals',

  /** The plan summary's heading. */
  planSection: 'Plan summary',

  /** Caption of the option under approval. */
  optionLabel: 'Option under approval',

  /** Caption of the exception the plan answers. */
  exceptionLabel: 'Exception',

  /** Caption of the persona who requested the plan. */
  requestedByLabel: 'Requested by',

  /** Caption of the roles that may decide the plan. */
  approverRolesLabel: 'Roles that may decide it',

  /** What the role list reads as when the record names none. */
  noApproverRoles: 'No role is named as able to decide this plan.',

  /** The cost-against-protected-revenue heading. */
  costSection: 'Cost against protected revenue',

  /** Caption of the plan's added cost. */
  costLabel: 'Added cost',

  /** Caption of the revenue the plan protects. */
  protectedRevenueLabel: 'Protected revenue',

  /** The missing-inputs heading. */
  missingInputsSection: 'Missing inputs',

  /** What the missing-inputs block reads as when the record names none. */
  noMissingInputs: 'No missing inputs.',

  /** What the block reads as when the exception behind the plan could not be read. */
  missingInputsUnavailable: 'The inputs behind this plan could not be read.',

  /** The write-back preview's heading. */
  writeBackPreviewSection: 'Write-back preview',

  /** What the preview reads as when the record carries no step. */
  noWriteBackPreview: 'No simulated write-back steps are recorded for this plan.',

  /** Caption of the system a write-back step writes to. */
  writeBackSystemLabel: 'Target system',

  /** Caption of the reference of the record a write-back step writes. */
  writeBackRecordLabel: 'Record',

  /** The decision block's heading. */
  decisionSection: 'Decision',

  /** The comment field's visible label, which is also its accessible name. */
  commentLabel: 'Comment',

  /** The comment field's supporting sentence, which is also its description. */
  commentHint: 'A comment is required. It is recorded on the audit trail with the decision.',

  /** The heading above the acknowledgements the plan's side effects require. */
  sideEffectSection: 'Side effects to acknowledge',

  /** Caption of the product a side effect defers. */
  sideEffectProductLabel: 'Product',

  /** Caption of the kits a side effect defers. */
  sideEffectKitsLabel: 'Kits deferred',

  /** Caption of the value a side effect defers. */
  sideEffectValueLabel: 'Value deferred',

  /** Caption of the days a side effect defers them by. */
  sideEffectDaysLabel: 'Days deferred',

  /** The status label beside an acknowledged side effect. */
  acknowledged: 'Acknowledged',

  /** The status label beside a side effect the reader has not acknowledged. */
  notAcknowledged: 'Not acknowledged',

  /** Caption of the decision the record carries, once one has been taken. */
  decisionActionLabel: 'Decision taken',

  /** Caption of the comment the record keeps, once a decision has been taken. */
  decisionCommentLabel: 'Comment recorded',

  /** Caption of the persona who decided the plan. */
  decidedByLabel: 'Decided by',

  /** Caption of the instant the decision was recorded. */
  decidedAtLabel: 'Decided at',

  /** The three decisions, labelled as SCR-05's actions name them. */
  approve: 'Approve',
  reject: 'Reject',
  requestChanges: 'Request changes',

  /** Why no decision can be taken while the gating source is not current. Built from the record. */
  staleSourcePrefix: 'Approvals need a current',

  /** The stale sentence's second half, into which the source's label and as-of instant are filled. */
  staleSourceSuffix: 'source.',

  /** Why no decision can be taken on a plan that is no longer pending. Filled with the record's status. */
  decidedPrefix: 'This approval is',

  /** The decided sentence's second half. */
  decidedSuffix: 'and a decision is taken on a pending plan alone.',

  /**
   * The rule that keeps a plan's requester from deciding it, followed by the roles the record names
   * as able to decide it (rule P-8, AAP §0.12.2). The rule identifier itself is prefixed from the
   * shared constant, so the sentence opens by naming POL-003 before any attempt is made.
   */
  requesterRuleSuffix:
    'keeps the requester of a plan from deciding it, and the roles that may decide it are',

  /** The same rule, for a record that names no eligible role at all. */
  requesterNoRoleSuffix:
    'keeps the requester of a plan from deciding it, and the record names no role as able to decide this one.',

  /** The sentence for an acting role the record does not name, followed by the roles it does name. */
  actingRolePrefix: 'This plan may be decided by the roles',

  /** The acting-role sentence's second half, which names what went wrong rather than only what is right. */
  actingRoleSuffix: ', and the acting role is not among them.',

  /** The same refusal for a record that names no eligible role at all. */
  actingRoleNoRoles:
    'The record names no role as able to decide this plan, so the acting role cannot decide it.',

  /** Why no decision can be taken while one is being recorded. */
  inFlightReason: 'A decision is being recorded.',

  /** Why no decision can be recorded without a comment. */
  commentRequiredReason: 'A comment is required before a decision is recorded.',

  /** Why the plan cannot be approved while a side effect is unacknowledged. */
  acknowledgementRequiredReason: 'Acknowledge every side effect of this plan before approving it.',

  /** Why the plan cannot be approved when its option could not be read. */
  sideEffectsUnavailableReason:
    'The side effects of this plan could not be read, so nothing can be acknowledged before approving it.',

  /** Why the plan cannot be approved when the plant the side effect lands on could not be read. */
  plantUnavailableReason:
    'The plant this plan lands on could not be read, so its side effect cannot be acknowledged.',

  /** The policy block's caption, above the rule that refused the decision. */
  policySection: 'Policy block',

  /** Caption of the rule that refused the decision. */
  policyIdLabel: 'Rule',

  /** Caption of the alternative the refusing rule permits. */
  policyAlternativeLabel: 'Permitted alternative',

  /** Caption of the audit event the refusal appended. */
  policyEventLabel: 'Audit event',

  /** The heading of the tracker, once the plan is approved. */
  trackerSection: 'Write-back progress',

  /** The heading of the outcome card when no measurement has arrived yet. */
  outcomeSection: 'Planned against resulting',

  /** What the outcome block reads as until the service supplies the two measurements. */
  outcomePending:
    'The planned-against-resulting comparison follows the simulated write-back, so it is not shown yet.',

  /**
   * What a failed write reads as when the service reported no cause of its own, so a status region is
   * never left empty by a rejection the port's `Problem` shape did not describe.
   */
  unexpectedFailure: 'The decision could not be recorded, and the service reported no cause.',

  /** What the outcome block reads as when its measurement could not be read at all. */
  outcomeUnavailable: 'The planned-against-resulting comparison could not be read.',

  /** What a decided plan reads as when the decision was not an approval. */
  noWriteBackAfterDecision:
    'No simulated write-back follows a plan that was not approved, so this plan wrote nothing.',

  /** The inbox's sentence for a route that named no approval at all. */
  empty: 'No approval was named, so there is nothing to show.',

  /** What the boundary says above a read that did not report every member this screen shows. */
  partial:
    'The read did not report every member this screen shows, so the values are shown as the records hold them.',

  /** What a validation refusal of the read means here, and the one action that re-reads it. */
  conflict: 'This approval changed while you were reading it. Reload to read it as it now stands.',

  /** The label of the region announcing a decision that is being recorded. */
  decisionInFlight: 'Recording the decision',
} as const;

/**
 * The base of the approvals route, as `src/app/router.tsx` declares it.
 *
 * The read route is `/approvals/:approvalId` and the inbox is `/approvals`; holding the base once
 * keeps the way back from drifting away from the route the inbox opens.
 */
const APPROVALS_ROUTE = '/approvals';

/* ---------------------------------------------------------------------------------------------
 * Class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The page column: the header, then one card per block, separated by the 4 px grid. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/** The card column, one step tighter than the page's own gap. */
const STACK_CLASSES = 'flex min-w-0 flex-col gap-3';

/** A caption above the value it names. */
const CAPTION_CLASSES = 'text-12 text-text-caption';

/** Body text carrying a record's own sentence or name. */
const BODY_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/** A record value set beside its caption, wrapping rather than overflowing (UI8). */
const DETAIL_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2 text-13 text-text-secondary';

/** The label row above a computed figure, at the 13 px step the label inherits. */
const LABEL_CLASSES = 'text-13';

/** One amount, at the 20 px step so the pair reads as the block's subject. */
const AMOUNT_CLASSES = 'text-20 text-text-primary';

/** The two amounts side by side, wrapping below the breakpoint rather than shrinking a figure. */
const AMOUNT_PAIR_CLASSES = 'grid min-w-0 gap-4 sm:grid-cols-2';

/** A field: its label, its control and its supporting sentence. */
const FIELD_CLASSES = 'flex min-w-0 flex-col gap-1';

/** A list of record values. */
const VALUE_LIST_CLASSES = 'flex min-w-0 flex-col gap-1';

/** An unordered list of roles, laid out inline so a short list does not become a column. */
const ROLE_LIST_CLASSES = 'flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-13 text-text-primary';

/** The write-back steps: a column with the 4 px grid's 12 px between them. */
const STEP_LIST_CLASSES = 'flex min-w-0 flex-col gap-3';

/** One step of a list: its rows stacked on the same grid step. */
const STEP_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The three decision controls, wrapping rather than overflowing on a narrow viewport. */
const ACTIONS_CLASSES = 'flex flex-wrap items-center gap-2 text-text-primary';

/** The acknowledgement row: the toggle, then the status label that says what it is. */
const ACKNOWLEDGEMENT_ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/**
 * The acknowledgement toggle's pressed treatment, expressed as the `aria-pressed` variant so the
 * attribute itself carries the visual state: the accent boundary and the first raised surface on a
 * pressed control, exactly as the canvas's view presets mark their own selection. The state is not
 * left to colour alone — the status label beside it says which state it is in (rule B-3).
 */
const ACKNOWLEDGEMENT_PRESSED_CLASSES =
  'aria-pressed:border-accent aria-pressed:bg-surface-1 aria-pressed:font-semibold';

/**
 * The comment control: the control boundary on the page ground, at least 24 by 24 px (rule B-3),
 * with the 2 px focus ring of the theme on keyboard focus only and a colour transition the
 * reduced-motion media query suppresses, exactly as the other field controls in the application.
 */
const COMMENT_CONTROL_CLASSES = [
  'w-full min-h-6 min-w-0 resize-y rounded-control border border-control-boundary bg-ground',
  'px-2 py-1 text-13 text-text-primary hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/** A refusal or a failure, in the `fail` status role: the sentence itself says what went wrong. */
const PROBLEM_TEXT_CLASSES = 'min-w-0 break-words text-12 text-status-fail';

/** The way back to the inbox, wearing the shared control's structure and secondary appearance. */
const LINK_CLASSES = `${CONTROL_STRUCTURE_CLASSES} ${SECONDARY_CONTROL_CLASSES}`;

/* ---------------------------------------------------------------------------------------------
 * The sentence a failure states — platform-contracts.md §2, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * The sentence a failure states, in the service's own words, or `undefined` when the rejection was not
 * the port's typed failure.
 *
 * The `Problem`'s message already names the source and its as-of time for a stale refusal and the
 * record that moved for a conflict, so a screen that printed a sentence of its own would be replacing
 * the only account of what happened with a paraphrase of it.
 */
function problemMessageOf(error: unknown): string | undefined {
  return isProblem(error) ? error.message : undefined;
}

/**
 * The refusal a policy made, member for member the evidence a `'policy'` `Problem` carries, or `null`
 * when the failure was not a policy block.
 *
 * The members are declared as `X | undefined` rather than optional so `exactOptionalPropertyTypes`
 * reads them uniformly: a problem that carried no rule identifier still produces a record, which the
 * panel renders without that row rather than dropping the block that explains the refusal.
 */
interface PolicyBlockRecord {
  /** The rule that refused the decision, when the service named one. */
  readonly policyId: PolicyId | undefined;

  /** The refusal in the service's own words, which is also the reason the controls carry. */
  readonly reason: string;

  /** The alternative the rule permits, when it names one. */
  readonly permittedAlternative: string | undefined;

  /** The policy-actor event the refusal appended, when the service reported one. */
  readonly auditEventId: AuditEventId | undefined;

  /** The correlation identifier of the refused call, so a reader can quote it. */
  readonly traceId: string;
}

/** Reads a policy refusal, or returns `null` when the failure was something else. */
function policyBlockOf(error: unknown): PolicyBlockRecord | null {
  if (!isProblem(error) || error.type !== 'policy') {
    return null;
  }

  return {
    policyId: error.policyId,
    reason: error.message,
    permittedAlternative: error.permittedAlternative,
    auditEventId: error.auditEventId,
    traceId: error.traceId,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The approval states, and the members this screen needs
 * ------------------------------------------------------------------------------------------- */

/**
 * The four approval states, quoted as `ApprovalStatus` spells them.
 *
 * Typed against that union so a status the union gains fails this file's compilation instead of
 * reaching the screen unrendered.
 */
const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'changes-requested',
] as const satisfies readonly ApprovalStatus[];

/** The one status a decision may be taken on (`handlers/approvals.ts` refuses every other one). */
const PENDING_STATUS: ApprovalStatus = 'pending';

/** The one status a simulated write-back runs under, and the one an outcome card exists for. */
const APPROVED_STATUS: ApprovalStatus = 'approved';

/** Whether a value is one of the four approval states. */
function isApprovalStatus(value: string): value is ApprovalStatus {
  return APPROVAL_STATUSES.some((status) => status === value);
}

/**
 * Whether one approval holds every member this screen shows.
 *
 * The check is the resolved payload's own: the identifier the header renders, the two references the
 * plan summary names, a status the status vocabulary can map, and the write-back list the preview and
 * the tracker walk. A record that arrived without one of them is `partial` rather than silently blank,
 * and the boundary says so above the content.
 */
function isRenderable(approval: Approval): boolean {
  return (
    typeof approval.id === 'string' &&
    approval.id !== '' &&
    typeof approval.exceptionId === 'string' &&
    approval.exceptionId !== '' &&
    typeof approval.scenarioId === 'string' &&
    approval.scenarioId !== '' &&
    isApprovalStatus(approval.status) &&
    Array.isArray(approval.writeBacks)
  );
}

/**
 * The meaning each approval status is rendered as, exhaustive by type.
 *
 * The label beside the icon is always the record's own status token, so the meaning never replaces what
 * the record says and the status never rests on colour alone (rule B-3). No input fixes this mapping;
 * it is this screen's decision, made once, and it matches the inbox's own so one approval reads the
 * same wherever it appears.
 */
const STATUS_MEANINGS = {
  pending: 'review',
  approved: 'pass',
  rejected: 'fail',
  'changes-requested': 'warning',
} as const satisfies Record<ApprovalStatus, StatusMeaning>;

/** What one write-back state amounts to in the shared status vocabulary. */
interface WriteBackStatus {
  /** The meaning the state is rendered as. */
  readonly meaning: StatusMeaning;

  /** The icon to show instead of the meaning's own. Present only for the state that waits. */
  readonly icon?: ReactNode;
}

/**
 * The write-back states mapped onto the shared meanings by what each one means, with no `default` arm:
 * a fourth state added to `WriteBackState` fails this function's compilation rather than rendering as
 * whichever branch happened to be last. `pending` takes the warning meaning with the status component's
 * clock, so awaiting a write reads differently from a degraded one.
 */
function writeBackStatusOf(state: WriteBackState): WriteBackStatus {
  switch (state) {
    case 'succeeded':
      return { meaning: 'pass' };
    case 'failed':
      return { meaning: 'fail' };
    case 'pending':
      return { meaning: 'warning', icon: PENDING_CLOCK_ICON };
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * The freshness gate — AAP 0.2.1, T-13
 * ------------------------------------------------------------------------------------------- */

/**
 * The read's report on the one source whose currency decides whether a decision can be taken.
 *
 * `Result.meta.freshness` carries the six sources' state at the moment of the call. The entry returned
 * here is `APPROVAL_GATE_SOURCE` — the source `decideApproval` refuses on — so the banner, the disabled
 * controls and the service's own refusal describe one source rather than three literals that agree only
 * until the gate moves. `undefined` means the read reported nothing for it.
 */
function gateFreshnessOf(freshness: readonly Freshness[]): Freshness | undefined {
  return freshness.find((entry) => entry.source === APPROVAL_GATE_SOURCE);
}

/**
 * Why the three decision controls cannot act while the gating source is not current, or `null` when it
 * is.
 *
 * The sentence names the source's display name and its as-of instant, both taken from the record, so
 * the reason a reader is given and the reason the service would refuse with describe one state. It is
 * built for the two states the service refuses on — `stale` and `unavailable` — and for no other: a
 * source reported `partial` is one the service accepts, and a control disabled where the service would
 * act would be a control that lies about what it can do.
 */
function gateRefusalReason(gate: Freshness | undefined): string | null {
  if (gate === undefined || (gate.state !== 'stale' && gate.state !== 'unavailable')) {
    return null;
  }

  const label = SOURCE_LABELS[gate.source];

  return `${APPROVAL_DETAIL_TEXT.staleSourcePrefix} ${label} ${APPROVAL_DETAIL_TEXT.staleSourceSuffix} ${label} as of ${gate.asOf}.`;
}

/* ---------------------------------------------------------------------------------------------
 * The port members a write moves, and the plan behind the approval
 * ------------------------------------------------------------------------------------------- */

/** A port member that can hold a cached read, named from the interface rather than typed as a string. */
type CachedRead = keyof SiteIntelligenceService;

/**
 * The reads a decision moves: the approval itself, the outcome measured from it, the inbox that shows
 * its status, the exception whose activity records it, and the audit trail that gained its event.
 */
const DECISION_INVALIDATES: readonly CachedRead[] = [
  'getApproval',
  'getApprovalOutcome',
  'listApprovals',
  'getExceptionDetail',
  'listAuditEvents',
];

/** The reads a write-back retry moves: the steps it left behind, the outcome, and the trail. */
const RETRY_INVALIDATES: readonly CachedRead[] = ['getApproval', 'getApprovalOutcome', 'listAuditEvents'];

/**
 * Invalidates every cached entry of each read a write touched.
 *
 * Every entry is keyed `[method, ...args]` (AAP §0.6.2), so naming a member invalidates every entry of
 * that read under every argument list — TanStack Query's default match is by key prefix. The adapter's
 * records are shared, so that granularity is what the write needs: a decision against one approval moves
 * the inbox, the exception's activity and the trail as well.
 */
function invalidateReads(queryClient: QueryClient, reads: readonly CachedRead[]): void {
  for (const read of reads) {
    void queryClient.invalidateQueries({ queryKey: [read] });
  }
}

/**
 * The option under approval, found in the set the service returned for the exception.
 *
 * `Approval` names its option by identifier and carries no measure of it, so the option's own record —
 * its name and the side effects an approver has to acknowledge — is the set's member with that
 * identifier. Nothing is derived: an identifier the set does not hold yields `undefined`, and the screen
 * then shows the reference alone.
 */
function scenarioOf(set: ScenarioSet | undefined, scenarioId: string): Scenario | undefined {
  if (set === undefined) {
    return undefined;
  }

  return set.scenarios.find((scenario) => scenario.id === scenarioId);
}

/**
 * The accessible name of one side-effect acknowledgement, fixed by AAP §0.12.4's SCR-05 row as
 * "I have read the side effect on <plant>".
 *
 * Exported so the colocated suite calls this function instead of re-spelling the sentence, and built from
 * the plant the record names rather than from a literal (rule P-6): the plant arrives as the exception's
 * own `plantId`, which is the plant the plan lands on.
 */
export function sideEffectAcknowledgement(plantId: PlantId): string {
  return `I have read the side effect on ${plantId}`;
}

/**
 * The key one acknowledgement is remembered under.
 *
 * The approval, the plant and the option's product together, so switching to another approval — or to
 * another option of the same product — never inherits an acknowledgement given for this one.
 */
function acknowledgementKeyOf(
  approvalId: ApprovalId,
  plantId: PlantId,
  sideEffect: SideEffect,
  index: number,
): string {
  return `${approvalId}:${plantId}:${String(index)}:${sideEffect.productId}`;
}

/** Why a decision cannot be taken on a plan that is no longer pending, or `null` while it is. */
function decidedReasonOf(status: ApprovalStatus): string | null {
  if (status === PENDING_STATUS) {
    return null;
  }

  return `${APPROVAL_DETAIL_TEXT.decidedPrefix} ${status}, ${APPROVAL_DETAIL_TEXT.decidedSuffix}`;
}

/**
 * Why the acting persona cannot decide this approval, or `null` when it can.
 *
 * Two facts of the record keep a persona from deciding it, and both are the service's own refusals
 * stated before the attempt rather than after it (AAP §0.2.2): POL-003 keeps the plan's requester
 * from deciding it (AAP §0.12.2), and an approval names the roles that may decide it, so a role the
 * record does not name may not decide *this* plan even where the matrix lets that role decide
 * others. The sentence names the rule or the roles the record holds, so a reader learns who may act
 * and not only that they may not (rule P-8).
 *
 * An unknown persona blocks nothing: the screen reads the acting persona from the demonstration
 * capability's fresh `getActiveUser`, which yields `null` while that read is pending or has failed and
 * on an adapter that carries no identity, and a control disabled on a fact nobody knows yet would be a
 * control that lies about what it can do. Both halves of the rule stay enforced in the service, which
 * refuses the decision whether or not a control was reachable (rule P-3).
 *
 * Built from the record's own members and from the shared policy constant, so no rule identifier,
 * role, amount or date is typed here (rule P-6). Exported so the colocated suite calls this function
 * instead of re-spelling its sentences.
 *
 * @param approval - The approval the decision would be taken on.
 * @param activeUser - The acting persona the adapter reported, or `null` while it is unknown.
 * @returns The sentence explaining why the acting persona cannot decide, or `null` when it can.
 */
export function decisionEligibilityReason(
  approval: Approval,
  activeUser: ActiveUser | null,
): string | null {
  if (activeUser === null) {
    return null;
  }

  const eligibleRoles = approval.eligibleApproverRoles;
  const namedRoles = eligibleRoles.join(', ');

  if (approval.requestedBy === activeUser.id) {
    return eligibleRoles.length === 0
      ? `${SEGREGATION_OF_DUTIES_POLICY_ID} ${APPROVAL_DETAIL_TEXT.requesterNoRoleSuffix}`
      : `${SEGREGATION_OF_DUTIES_POLICY_ID} ${APPROVAL_DETAIL_TEXT.requesterRuleSuffix} ${namedRoles}.`;
  }

  if (eligibleRoles.includes(activeUser.role)) {
    return null;
  }

  return eligibleRoles.length === 0
    ? APPROVAL_DETAIL_TEXT.actingRoleNoRoles
    : `${APPROVAL_DETAIL_TEXT.actingRolePrefix} ${namedRoles}${APPROVAL_DETAIL_TEXT.actingRoleSuffix}`;
}

/* ---------------------------------------------------------------------------------------------
 * The comment field — this screen's label and hint over the `TextAreaField` primitive
 * ------------------------------------------------------------------------------------------- */

/**
 * The comment as the screen holds it and the single callback that moves it: this field owns only the
 * copy a shared textarea primitive must not — the visible caption and the hint that states the
 * requirement — so a keystroke has to reach the screen that will send the text to the port rather
 * than be kept here (AAP §0.5.2).
 */
interface CommentFieldProps {
  /** The comment as it stands, held by the screen. */
  readonly value: string;

  /** Called with the whole textarea value on every keystroke. */
  readonly onChange: (value: string) => void;
}

/**
 * The decision's comment: a labelled `TextAreaField` and the sentence that says why it is required.
 *
 * `TextAreaField` in `src/components` owns the `<textarea>` (AAP §0.5.2), so what this component owns
 * is the copy a shared primitive must not: the visible caption and the hint. The `<label>` is
 * programmatically associated with the field's `id`, so the control's accessible name is the visible
 * caption; the hint is its description, so the requirement is announced when the field is reached
 * rather than only once a control refuses. `aria-required` states the requirement the
 * `disabledReason` on the buttons enforces, and the control keeps the 24x24 px minimum target and the
 * theme's focus ring.
 */
function CommentField({ value, onChange }: CommentFieldProps): ReactElement {
  const fieldId = useId();
  const hintId = useId();

  return (
    <div className={FIELD_CLASSES}>
      <label htmlFor={fieldId} className={CAPTION_CLASSES}>
        {APPROVAL_DETAIL_TEXT.commentLabel}
      </label>
      <TextAreaField
        id={fieldId}
        className={COMMENT_CONTROL_CLASSES}
        value={value}
        rows={3}
        aria-required="true"
        aria-describedby={hintId}
        onChange={onChange}
      />
      <p id={hintId} className={CAPTION_CLASSES}>
        {APPROVAL_DETAIL_TEXT.commentHint}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The three decisions, and the acknowledgement that gates the first of them
 * ------------------------------------------------------------------------------------------- */

/**
 * One decision's wording, its rank and the sentence that stops it: the blocked reason is `null`
 * exactly when the control may act, and the component picks `ActionButton`'s enabled or disabled
 * shape from it, so the explanation reaches the reader in the same control that refuses (rule P-8).
 */
interface DecisionButtonProps {
  /** The control's visible label, which is also its accessible name. */
  readonly label: string;

  /** `'primary'` for the one action the screen exists to take, `'secondary'` for the other two. */
  readonly variant: 'primary' | 'secondary';

  /** Why the control cannot act, or `null` when it can. */
  readonly blockedReason: string | null;

  /** What activating the control does. Never called while it is blocked. */
  readonly onActivate: () => void;
}

/**
 * One decision control.
 *
 * The pair of branches exists so the reason is part of the rendered control exactly when it is disabled:
 * `ActionButton`'s discriminated props require `disabledReason` on a disabled control and forbid it on an
 * enabled one, and a single call site that passed both through conditionally would be the one place the
 * union could be defeated by a spread. Rule P-8 therefore holds by construction.
 */
function DecisionButton({
  label,
  variant,
  blockedReason,
  onActivate,
}: DecisionButtonProps): ReactElement {
  if (blockedReason === null) {
    return (
      <ActionButton variant={variant} onClick={onActivate}>
        {label}
      </ActionButton>
    );
  }

  return (
    <ActionButton variant={variant} disabled={true} disabledReason={blockedReason}>
      {label}
    </ActionButton>
  );
}

/**
 * One side effect's acknowledgement, carried as the plant whose record names it together with the
 * reader's answer: the control's accessible name is composed from that plant, so a caller supplies
 * the plan's own plant rather than a sentence, and the answer itself stays with the screen that will
 * send it with the decision.
 */
interface AcknowledgementToggleProps {
  /** The plant the side effect lands on, as the record names it. */
  readonly plantId: PlantId;

  /** Whether the reader has acknowledged this side effect. */
  readonly acknowledged: boolean;

  /** Flips the acknowledgement. */
  readonly onToggle: () => void;
}

/**
 * One side-effect acknowledgement, as a real toggle.
 *
 * `Button` in `src/components` owns the `<button>` and takes `aria-pressed` (AAP §0.5.2), so this
 * component composes it rather than the element. The control is a pressed toggle rather than a native
 * checkbox because the acknowledgement is an action the reader takes on the plan at the moment of
 * deciding it, not a form value submitted with the plan, and because `src/components` declares no
 * checkbox primitive. The class list composes the same lists `ActionButton` owns
 * (`CONTROL_STRUCTURE_CLASSES` for the target size, boundary and focus ring, `SECONDARY_CONTROL_CLASSES`
 * for the surface and its pointer states) and adds the pressed treatment as an `aria-pressed` variant.
 * Its visible text is the whole accessible name, character for character
 * {@link sideEffectAcknowledgement}, so a reader naming the control states the acknowledgement they are
 * giving. The state itself is carried by the attribute and by the status label beside it, never by
 * colour alone (rule B-3).
 */
function AcknowledgementToggle({
  plantId,
  acknowledged,
  onToggle,
}: AcknowledgementToggleProps): ReactElement {
  return (
    <span className={ACKNOWLEDGEMENT_ROW_CLASSES}>
      <Button
        aria-pressed={acknowledged}
        onClick={onToggle}
        className={`${CONTROL_STRUCTURE_CLASSES} ${SECONDARY_CONTROL_CLASSES} ${ACKNOWLEDGEMENT_PRESSED_CLASSES}`}
      >
        {sideEffectAcknowledgement(plantId)}
      </Button>
      <StatusIndicator
        meaning={acknowledged ? 'pass' : 'empty'}
        label={
          acknowledged ? APPROVAL_DETAIL_TEXT.acknowledged : APPROVAL_DETAIL_TEXT.notAcknowledged
        }
      />
    </span>
  );
}

/**
 * One side effect as the plan's option records it, with the plant the plan lands on when the exception
 * behind it could be read. The plant is optional because its absence is what withholds the
 * acknowledgement and blocks the approval, so a caller passes the read's own answer and never a
 * substitute name for a record it does not hold.
 */
interface SideEffectItemProps {
  /** The side effect, unmodified. */
  readonly sideEffect: SideEffect;

  /** The plant the plan lands on, when the exception could be read. */
  readonly plantId: PlantId | undefined;

  /** Whether this side effect has been acknowledged. */
  readonly acknowledged: boolean;

  /** Flips this side effect's acknowledgement. */
  readonly onToggle: () => void;
}

/**
 * One side effect: the product, the kits and value it defers, the days it defers them by, and the
 * acknowledgement that has to be given before the plan may be approved.
 *
 * Every figure is the record's own, rendered through the component that owns that kind of value — an
 * identifier and an amount through `MonoValue`, a count as the number the record holds. When the plant
 * could not be read, the acknowledgement cannot be named, so the row states that in words instead of
 * rendering a control whose accessible name would be missing the plant it is about, and the approve
 * control is blocked with the same reason.
 */
function SideEffectItem({
  sideEffect,
  plantId,
  acknowledged,
  onToggle,
}: SideEffectItemProps): ReactElement {
  return (
    <li className={STEP_CLASSES}>
      <span className={DETAIL_ROW_CLASSES}>
        <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.sideEffectProductLabel}</span>
        <MonoValue value={sideEffect.productId} kind="id" />
        <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.sideEffectKitsLabel}</span>
        <span>{sideEffect.kitsDelayed}</span>
        <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.sideEffectValueLabel}</span>
        <MonoValue value={sideEffect.valueDeferredEur} kind="money" />
        <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.sideEffectDaysLabel}</span>
        <span>{sideEffect.daysDeferred}</span>
      </span>
      {plantId === undefined ? (
        <p className={PROBLEM_TEXT_CLASSES}>{APPROVAL_DETAIL_TEXT.plantUnavailableReason}</p>
      ) : (
        <AcknowledgementToggle
          plantId={plantId}
          acknowledged={acknowledged}
          onToggle={onToggle}
        />
      )}
    </li>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The policy refusal — a `'policy'` `Problem`, AAP 0.12.3
 * ------------------------------------------------------------------------------------------- */

/**
 * A `'policy'` refusal as the service reported it — the rule that refused, the service's own sentence,
 * the alternative the rule permits and the event the refusal appended — so the panel reports what was
 * refused and creates nothing, and a caller hands over the record rather than a rewording of it
 * (AAP 0.12.3).
 */
interface PolicyBlockPanelProps {
  /** The refusal the service reported. */
  readonly block: PolicyBlockRecord;
}

/**
 * The policy block: the rule that refused the decision, the service's own sentence, the alternative the
 * rule permits and the event the refusal appended.
 *
 * The rule and the event are identifiers, so they render through `MonoValue` in the tabular mono face
 * where a reader can select and quote them; the reason is the `Problem`'s message rather than a second
 * wording of it. The panel states what was refused and creates nothing: no approval, no write-back and
 * no audit record — the record the service appended is the one named here. Nothing about the refusal is
 * presented as a property of the deployment (rule P-4).
 */
function PolicyBlockPanel({ block }: PolicyBlockPanelProps): ReactElement {
  return (
    <div className={STACK_CLASSES}>
      <Panel label={APPROVAL_DETAIL_TEXT.policySection}>
        <div className={STACK_CLASSES}>
          {block.policyId === undefined ? null : (
            <span className={DETAIL_ROW_CLASSES}>
              <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.policyIdLabel}</span>
              <MonoValue value={block.policyId} kind="id" />
            </span>
          )}
          <p className={BODY_CLASSES}>{block.reason}</p>
          {block.permittedAlternative === undefined ? null : (
            <span className={DETAIL_ROW_CLASSES}>
              <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.policyAlternativeLabel}</span>
              <span className={BODY_CLASSES}>{block.permittedAlternative}</span>
            </span>
          )}
          {block.auditEventId === undefined ? null : (
            <span className={DETAIL_ROW_CLASSES}>
              <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.policyEventLabel}</span>
              <MonoValue value={block.auditEventId} kind="id" />
            </span>
          )}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The write-back preview — the steps in the record's own order, AAP 0.12.4, T-08
 * ------------------------------------------------------------------------------------------- */

/**
 * The approval's write-back steps as the record states them, in its own order: the preview prints the
 * array untouched, so what T-08 checks — the steps in the seed's order — is the record's sequence
 * rather than this component's, and a caller that sorted or filtered before passing would break that
 * (AAP 0.12.4).
 */
interface WriteBackPreviewProps {
  /** The approval's write-back steps, exactly as the service returned them. */
  readonly writeBacks: readonly WriteBack[];
}

/**
 * The write-back the plan would perform, one list item per step in the record's own order.
 *
 * Nothing is sorted, filtered or counted: the preview shows what the record states, in the order it
 * states it, which is what T-08 asserts of the tracker and of this list alike. Each step carries the
 * fixed {@link WRITE_BACK_TAG} in its own item, because a page-level badge does not label an individual
 * write-back (rule P-1), and its state through `StatusIndicator` so the meaning, the record's own state
 * token and a colour are always present together (rule B-3). An approval with no step states the
 * absence in words rather than rendering an empty list.
 */
function WriteBackPreview({ writeBacks }: WriteBackPreviewProps): ReactElement {
  if (writeBacks.length === 0) {
    return <p className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.noWriteBackPreview}</p>;
  }

  return (
    <ol className={STEP_LIST_CLASSES}>
      {writeBacks.map((step) => {
        const status = writeBackStatusOf(step.state);

        return (
          <li key={step.sequence} className={STEP_CLASSES}>
            <span className={BODY_CLASSES}>{step.description}</span>
            <span className={DETAIL_ROW_CLASSES}>
              <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.writeBackSystemLabel}</span>
              <span>{SOURCE_LABELS[step.system]}</span>
              <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.writeBackRecordLabel}</span>
              <MonoValue value={step.recordRef} kind="id" />
            </span>
            <StatusIndicator meaning={status.meaning} label={step.state} icon={status.icon} />
            <span className={CAPTION_CLASSES}>{WRITE_BACK_TAG}</span>
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/** The option set before it is read, so an absent set is a stable reference rather than a new array. */
const NO_SIDE_EFFECTS: readonly SideEffect[] = [];

/**
 * The first failure among the calls a screen made, or `null` when none of them failed.
 *
 * The details screen reads one record and the two records behind it, and a refusal of either plan read
 * is a member this screen needs and does not have. Taking the first present failure rather than a
 * fixed one keeps the state derived from what actually happened instead of from which call the code
 * happened to check first.
 */
function failureOf(...errors: readonly unknown[]): unknown {
  for (const error of errors) {
    if (error !== null && error !== undefined) {
      return error;
    }
  }

  return null;
}

/**
 * What the shell hands the approval detail: its plant and product selection, which rides in the reads'
 * cache keys and nowhere else. The approval itself arrives from the route parameter, and the service
 * intersects the selection with the acting role's plant scope, so a selection change is a new read
 * rather than a detail left over from the previous one.
 */
export interface ApprovalDetailScreenProps {
  /**
   * The shell's plant and product selection.
   *
   * Passed into the reads' cache keys and nothing else: this screen narrows nothing itself, because the
   * service intersects the selection with the acting role's plant scope before it selects a record, so a
   * filtered inbox and this detail cannot disagree about which approval exists. Carrying it in the key
   * means a selection change is a new read rather than a detail left over from the previous one.
   */
  readonly scope: Scope;
}

/**
 * The approval detail.
 *
 * Four reads through `useService()` (rule P-2), a fifth — the acting persona — through the
 * demonstration capability beside it, the state its records are in decided in one place, and two
 * writes — a decision and a write-back retry — that go to the port and invalidate the reads they
 * moved. Nothing on this screen writes a record itself, holds a figure of its own, or decides whether
 * an action is permitted: the service is the authority and this screen is the explanation beside it.
 *
 * @param props - The shell's plant and product selection.
 * @returns The page header, and the detail inside the state boundary.
 */
export function ApprovalDetailScreen({ scope }: ApprovalDetailScreenProps): ReactElement {
  const service = useService();
  const demonstration = useDemonstration();
  const queryClient = useQueryClient();
  const { approvalId } = useParams<{ approvalId: string }>();

  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [writeError, setWriteError] = useState<unknown>(null);
  const [policyBlock, setPolicyBlock] = useState<PolicyBlockRecord | null>(null);
  const [retryingWriteBackId, setRetryingWriteBackId] = useState<string | null>(null);
  const [acknowledgedKeys, setAcknowledgedKeys] = useState<readonly string[]>([]);

  /*
   * The approval read. Retries are off on purpose, matching the cache the shell creates: the records are
   * deterministic, so a silent second attempt would only delay the state the boundary reports, and the
   * boundary offers the reader an explicit retry for the case where repeating the call can succeed.
   * `skipToken` disables the call when the route named no approval at all, so a misaddressed route reads
   * nothing rather than asking the service for an empty identifier.
   */
  const approvalQuery = useQuery<Result<Approval>, unknown>({
    queryKey: ['getApproval', approvalId, scope.plants, scope.products],
    queryFn: approvalId === undefined ? skipToken : () => service.getApproval(approvalId),
    retry: false,
  });

  const result = approvalQuery.data;
  const approval = result?.data;
  const exceptionId = approval === undefined ? undefined : approval.exceptionId;
  const scenarioId = approval === undefined ? undefined : approval.scenarioId;

  /*
   * The plan's own option, read for the side effects an approver has to acknowledge: `Approval` carries no
   * member for them, and the option the record names is the one whose side effects they are.
   */
  const scenarioQuery = useQuery<Result<ScenarioSet>, unknown>({
    queryKey: ['getScenarioSet', exceptionId],
    queryFn: exceptionId === undefined ? skipToken : () => service.getScenarioSet(exceptionId),
    retry: false,
  });

  /* The exception behind the plan: the plant it lands on, and the inputs the assessment could not read. */
  const detailQuery = useQuery<Result<ExceptionDetail>, unknown>({
    queryKey: ['getExceptionDetail', exceptionId],
    queryFn: exceptionId === undefined ? skipToken : () => service.getExceptionDetail(exceptionId),
    retry: false,
  });

  /*
   * The outcome card's two measurements, read only once the plan is approved: only an approved plan sets a
   * change in motion, so only then is there a resulting side to set beside the planned one.
   */
  const outcomeQuery = useQuery<Result<ApprovalOutcome>, unknown>({
    queryKey: ['getApprovalOutcome', approvalId],
    queryFn: approvalId === undefined ? skipToken : () => service.getApprovalOutcome(approvalId),
    enabled: approvalId !== undefined && approval?.status === APPROVED_STATUS,
    retry: false,
  });

  /*
   * The acting persona. Read fresh on every mount rather than taken from the persona the shell seeded
   * at start-up, because a reader may have switched role since: the adapter is enforcing whichever
   * persona the switch selected, and the gate below has to describe the role a decision would actually
   * be evaluated against. The capability is absent on an adapter without identity, and `skipToken`
   * then reads nothing.
   */
  const actingUserQuery = useQuery<Result<ActiveUser>, unknown>({
    queryKey: ['getActiveUser'],
    queryFn: demonstration === null ? skipToken : () => demonstration.getActiveUser(),
    retry: false,
  });

  const actingUser = actingUserQuery.data?.data ?? null;

  const gate = result === undefined ? undefined : gateFreshnessOf(result.meta.freshness);
  const scenario = useMemo(
    () => (scenarioId === undefined ? undefined : scenarioOf(scenarioQuery.data?.data, scenarioId)),
    [scenarioQuery.data, scenarioId],
  );

  const sideEffects = scenario === undefined ? NO_SIDE_EFFECTS : scenario.sideEffects;
  const plantId = detailQuery.data?.data.exception.plantId;
  const missingInputs = detailQuery.data?.data.missingInputs;
  const planError = failureOf(scenarioQuery.error, detailQuery.error);

  /*
   * The read's own facts, plus this screen's facts about itself. A route that named no approval has
   * nothing to read. A permission refusal from the last write or from a plan read means the acting role
   * may not decide this plan, so the forbidden card that names the role which may act replaces the
   * content rather than sitting beside controls that cannot work; any other write failure is
   * deliberately *not* a screen state, because a refusal that changed nothing is reported in the
   * decision block in the service's own sentence, so a reader who has typed a comment does not lose the
   * screen they were working in. The approval-gate source is the one `decideApproval` refuses on, so the
   * stale notice names it first (AAP 0.2.1, T-13). A record missing a member this screen shows, or a
   * plan whose option could not be read, reports itself incomplete.
   */
  const state = deriveScreenState({
    namedNoRecord: approvalId === undefined,
    isPending: approvalQuery.isPending,
    error: approvalQuery.error,
    freshness: result?.meta.freshness,
    refusals: [writeError, planError],
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial:
      result !== undefined &&
      (!isRenderable(result.data) || (planError !== null && planError !== undefined)),
  });
  const staleRecord =
    result === undefined ? undefined : staleSourceOf(result.meta.freshness, APPROVAL_GATE_SOURCE);
  const forbiddenRecord =
    forbiddenOf(writeError) ?? forbiddenOf(approvalQuery.error) ?? forbiddenOf(planError);
  const conflictMessage = problemMessageOf(approvalQuery.error) ?? APPROVAL_DETAIL_TEXT.conflict;

  /*
   * The three decisions' shared blocker, in the order that matters to a reader: a source that is not
   * current is the condition the service refuses on and outranks everything a reader could change; the
   * acting persona's eligibility is a fact of the record the service refuses on, so it follows the
   * source and outranks a policy block received from an earlier attempt — an attempt the record itself
   * would refuse again before any rule was consulted; a policy block is the service's own verdict until
   * something else is tried; a plan that is no longer pending is a fact of the record; a decision
   * already being recorded is transient; and a comment is the one thing only the reader can supply.
   */
  const gateReason = gateRefusalReason(gate);
  const eligibilityReason =
    approval === undefined ? null : decisionEligibilityReason(approval, actingUser);
  const policyReason = policyBlock === null ? null : policyBlock.reason;
  const decidedReason = approval === undefined ? null : decidedReasonOf(approval.status);
  const inFlightReason = submitting ? APPROVAL_DETAIL_TEXT.inFlightReason : null;
  const commentReason =
    comment.trim() === '' ? APPROVAL_DETAIL_TEXT.commentRequiredReason : null;
  const sharedBlockReason =
    gateReason ??
    eligibilityReason ??
    policyReason ??
    decidedReason ??
    inFlightReason ??
    commentReason;

  /*
   * Approve carries one further condition: every side effect the plan defers another product's supply for
   * has to be acknowledged first. An option whose side effects could not be read blocks the decision
   * rather than letting it proceed unacknowledged, because the reader cannot acknowledge what the screen
   * could not show them.
   */
  const sideEffectKeys = sideEffects.map((sideEffect, index) =>
    approval === undefined || plantId === undefined
      ? ''
      : acknowledgementKeyOf(approval.id, plantId, sideEffect, index),
  );
  const unacknowledged = sideEffectKeys.some((key) => !acknowledgedKeys.includes(key));
  const acknowledgementReason =
    scenario === undefined
      ? APPROVAL_DETAIL_TEXT.sideEffectsUnavailableReason
      : sideEffects.length === 0
        ? null
        : plantId === undefined
          ? APPROVAL_DETAIL_TEXT.plantUnavailableReason
          : unacknowledged
            ? APPROVAL_DETAIL_TEXT.acknowledgementRequiredReason
            : null;
  const approveReason = sharedBlockReason ?? acknowledgementReason;

  const retryRead = (): void => {
    void approvalQuery.refetch();
  };

  const toggleAcknowledgement = (key: string): void => {
    setAcknowledgedKeys((current) =>
      current.includes(key) ? current.filter((entry) => entry !== key) : [...current, key],
    );
  };

  /**
   * Records one decision through the port.
   *
   * The service is the only author of what happened: a success clears the comment, and a refusal sets
   * nothing but the message the service returned — plus the policy block when a rule refused it — so
   * the screen never reports a decision the record does not hold. The reads a decision moves are
   * invalidated whichever way the call settled, because a decision can move the record even when it
   * fails at a write-back.
   */
  const submitDecision = async (action: DecisionAction): Promise<void> => {
    if (approvalId === undefined || submitting) {
      return;
    }

    setSubmitting(true);
    setWriteError(null);
    setPolicyBlock(null);

    try {
      await service.decideApproval(approvalId, { action, comment: comment.trim() });
      setComment('');
    } catch (error) {
      setWriteError(error);
      setPolicyBlock(policyBlockOf(error));
    } finally {
      setSubmitting(false);
      /* `decideApproval` sets the record's status, records the decision and marks the step that failed
         before it throws a `'simulated-write-back'` `Problem`, so the record moved even though the call
         did not answer. Re-reading it is what mounts the tracker, the failed step and the retry that
         completes the change, instead of leaving the reader on a record the service no longer holds as
         pending (AAP §0.2.2, rule P-8). */
      invalidateReads(queryClient, DECISION_INVALIDATES);
    }
  };

  /**
   * Re-attempts one failed step of the approved change's simulated write-back.
   *
   * The step is addressed by the reference it writes, which is the only identifier the record carries, and
   * the service decides whether it may run: a step that already succeeded is refused rather than written
   * twice, so a retry never leaves a second success record behind (AAP §0.2.2). The reads a retry moves —
   * the steps it advanced and the outcome measured from them — are invalidated whichever way the call
   * settled, because a retry re-attempts its step and then runs the steps the failure left untouched, so
   * it too can move the record and throw.
   */
  const retryWriteBackStep = async (writeBackId: string): Promise<void> => {
    if (approvalId === undefined || retryingWriteBackId !== null) {
      return;
    }

    setRetryingWriteBackId(writeBackId);
    setWriteError(null);

    try {
      await service.retryWriteBack(approvalId, writeBackId);
    } catch (error) {
      setWriteError(error);
      setPolicyBlock(policyBlockOf(error));
    } finally {
      setRetryingWriteBackId(null);
      invalidateReads(queryClient, RETRY_INVALIDATES);
    }
  };

  const handleApprove = (): void => {
    void submitDecision('approve');
  };

  const handleReject = (): void => {
    void submitDecision('reject');
  };

  const handleRequestChanges = (): void => {
    void submitDecision('request-changes');
  };

  const handleRetry = (writeBackId: string): void => {
    void retryWriteBackStep(writeBackId);
  };

  const isDecided = approval !== undefined && approval.status !== PENDING_STATUS;
  const outcome = outcomeQuery.data;

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader
        title={APPROVAL_DETAIL_TEXT.title}
        description={APPROVAL_DETAIL_TEXT.description}
        eyebrow={
          approval === undefined ? undefined : (
            <>
              <MonoValue value={approval.id} kind="id" />
              <StatusIndicator
                meaning={STATUS_MEANINGS[approval.status]}
                label={approval.status}
              />
            </>
          )
        }
        actions={
          <Link to={APPROVALS_ROUTE} className={LINK_CLASSES}>
            {APPROVAL_DETAIL_TEXT.backToInbox}
          </Link>
        }
      />

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={APPROVAL_DETAIL_TEXT.empty}
        partialMessage={APPROVAL_DETAIL_TEXT.partial}
        conflictMessage={conflictMessage}
        forbidden={forbiddenRecord}
      >
        {approval === undefined ? null : (
          <>
            <Card title={APPROVAL_DETAIL_TEXT.planSection}>
              <div className={STACK_CLASSES}>
                <div className={FIELD_CLASSES}>
                  <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.optionLabel}</span>
                  {scenario === undefined ? (
                    <MonoValue value={approval.scenarioId} kind="id" />
                  ) : (
                    <span className={DETAIL_ROW_CLASSES}>
                      <span className={BODY_CLASSES}>{scenario.name}</span>
                      <MonoValue value={approval.scenarioId} kind="id" />
                    </span>
                  )}
                </div>

                <div className={FIELD_CLASSES}>
                  <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.exceptionLabel}</span>
                  <span className={BODY_CLASSES}>
                    <MonoValue value={approval.exceptionId} kind="id" />
                  </span>
                </div>

                <div className={FIELD_CLASSES}>
                  <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.requestedByLabel}</span>
                  <span className={BODY_CLASSES}>
                    <MonoValue value={approval.requestedBy} kind="id" />
                  </span>
                </div>

                <div className={FIELD_CLASSES}>
                  <span className={CAPTION_CLASSES}>
                    {APPROVAL_DETAIL_TEXT.approverRolesLabel}
                  </span>
                  {approval.eligibleApproverRoles.length === 0 ? (
                    <p className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.noApproverRoles}</p>
                  ) : (
                    <ul role="list" className={ROLE_LIST_CLASSES}>
                      {approval.eligibleApproverRoles.map((role) => (
                        <li key={role}>{role}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>

            <Card title={APPROVAL_DETAIL_TEXT.costSection}>
              <div className={STACK_CLASSES}>
                <StatusIndicator meaning="simulated" label={CALCULATION_LABEL} className={LABEL_CLASSES} />
                <div className={AMOUNT_PAIR_CLASSES}>
                  <div className={FIELD_CLASSES}>
                    <span className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.costLabel}</span>
                    <span className={AMOUNT_CLASSES}>
                      <EvidenceRef ref={approval.id}>
                        <MonoValue value={approval.addedCostEur} kind="money" />
                      </EvidenceRef>
                    </span>
                  </div>
                  <div className={FIELD_CLASSES}>
                    <span className={CAPTION_CLASSES}>
                      {APPROVAL_DETAIL_TEXT.protectedRevenueLabel}
                    </span>
                    <span className={AMOUNT_CLASSES}>
                      <EvidenceRef ref={approval.id}>
                        <MonoValue value={approval.protectedRevenueEur} kind="money" />
                      </EvidenceRef>
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <Card title={APPROVAL_DETAIL_TEXT.missingInputsSection}>
              {missingInputs === undefined ? (
                <p className={CAPTION_CLASSES}>
                  {APPROVAL_DETAIL_TEXT.missingInputsUnavailable}
                </p>
              ) : missingInputs.length === 0 ? (
                <p className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.noMissingInputs}</p>
              ) : (
                <ul role="list" className={VALUE_LIST_CLASSES}>
                  {missingInputs.map((input) => (
                    <li key={input} className={BODY_CLASSES}>
                      {input}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title={APPROVAL_DETAIL_TEXT.writeBackPreviewSection}>
              <WriteBackPreview writeBacks={approval.writeBacks} />
            </Card>

            <Card title={APPROVAL_DETAIL_TEXT.decisionSection}>
              <div className={STACK_CLASSES}>
                {policyBlock === null ? null : <PolicyBlockPanel block={policyBlock} />}

                {approval.decision === undefined ? null : (
                  <Panel label={APPROVAL_DETAIL_TEXT.decisionActionLabel}>
                    <div className={STACK_CLASSES}>
                      <p className={BODY_CLASSES}>{approval.decision.action}</p>
                      <span className={DETAIL_ROW_CLASSES}>
                        <span className={CAPTION_CLASSES}>
                          {APPROVAL_DETAIL_TEXT.decisionCommentLabel}
                        </span>
                        <span className={BODY_CLASSES}>{approval.decision.comment}</span>
                      </span>
                      {approval.decidedBy === undefined ? null : (
                        <span className={DETAIL_ROW_CLASSES}>
                          <span className={CAPTION_CLASSES}>
                            {APPROVAL_DETAIL_TEXT.decidedByLabel}
                          </span>
                          <MonoValue value={approval.decidedBy} kind="id" />
                        </span>
                      )}
                      {approval.decidedAt === undefined ? null : (
                        <span className={DETAIL_ROW_CLASSES}>
                          <span className={CAPTION_CLASSES}>
                            {APPROVAL_DETAIL_TEXT.decidedAtLabel}
                          </span>
                          <MonoValue value={approval.decidedAt} kind="timestamp" />
                        </span>
                      )}
                    </div>
                  </Panel>
                )}

                <CommentField value={comment} onChange={setComment} />

                {sideEffects.length === 0 ? null : (
                  <Panel label={APPROVAL_DETAIL_TEXT.sideEffectSection}>
                    <ul role="list" className={STEP_LIST_CLASSES}>
                      {sideEffects.map((sideEffect, index) => {
                        const key = sideEffectKeys[index] ?? '';

                        return (
                          <SideEffectItem
                            key={key === '' ? sideEffect.productId : key}
                            sideEffect={sideEffect}
                            plantId={plantId}
                            acknowledged={acknowledgedKeys.includes(key)}
                            onToggle={() => {
                              toggleAcknowledgement(key);
                            }}
                          />
                        );
                      })}
                    </ul>
                  </Panel>
                )}

                <div className={ACTIONS_CLASSES}>
                  <DecisionButton
                    label={APPROVAL_DETAIL_TEXT.approve}
                    variant="primary"
                    blockedReason={approveReason}
                    onActivate={handleApprove}
                  />
                  <DecisionButton
                    label={APPROVAL_DETAIL_TEXT.reject}
                    variant="secondary"
                    blockedReason={sharedBlockReason}
                    onActivate={handleReject}
                  />
                  <DecisionButton
                    label={APPROVAL_DETAIL_TEXT.requestChanges}
                    variant="secondary"
                    blockedReason={sharedBlockReason}
                    onActivate={handleRequestChanges}
                  />
                </div>

                {submitting ? (
                  <p role="status">
                    <StatusIndicator
                      meaning="warning"
                      label={APPROVAL_DETAIL_TEXT.decisionInFlight}
                      icon={PENDING_CLOCK_ICON}
                    />
                  </p>
                ) : null}

                {writeError === null || policyBlock !== null ? null : (
                  <p role="status" className={PROBLEM_TEXT_CLASSES}>
                    {problemMessageOf(writeError) ?? APPROVAL_DETAIL_TEXT.unexpectedFailure}
                  </p>
                )}
              </div>
            </Card>

            {isDecided && approval.status === APPROVED_STATUS ? (
              <Card title={APPROVAL_DETAIL_TEXT.trackerSection}>
                <WriteBackTracker
                  writeBacks={approval.writeBacks}
                  onRetry={handleRetry}
                  retryingWriteBackId={retryingWriteBackId}
                />
              </Card>
            ) : null}

            {isDecided && approval.status !== APPROVED_STATUS ? (
              <Card title={APPROVAL_DETAIL_TEXT.trackerSection}>
                <p className={CAPTION_CLASSES}>{APPROVAL_DETAIL_TEXT.noWriteBackAfterDecision}</p>
              </Card>
            ) : null}

            {isDecided && approval.status === APPROVED_STATUS ? (
              outcome === undefined ? (
                <Card title={APPROVAL_DETAIL_TEXT.outcomeSection}>
                  <p className={CAPTION_CLASSES}>
                    {outcomeQuery.error === null || outcomeQuery.error === undefined
                      ? APPROVAL_DETAIL_TEXT.outcomePending
                      : (problemMessageOf(outcomeQuery.error) ??
                        APPROVAL_DETAIL_TEXT.outcomeUnavailable)}
                  </p>
                </Card>
              ) : (
                <OutcomeCard
                  planned={outcome.data.planned}
                  resulting={outcome.data.resulting}
                  evidenceRef={outcome.data.evidenceRef}
                />
              )
            ) : null}
          </>
        )}
      </StateBoundary>
    </div>
  );
}

