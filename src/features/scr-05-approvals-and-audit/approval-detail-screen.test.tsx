/**
 * Component suite for `approval-detail-screen.tsx`, the approval detail of SCR-05.
 *
 * WHAT IT PROVES. The decision gate (acceptance test `T-07`): all three decisions stay disabled
 * without a comment, each with a reason a reader can reach by keyboard and read as text rather than
 * a `title` attribute; an activation the gate refuses answers rather than swallowing the attempt,
 * painting the reason past the pointer and announcing it from a live region; a comment releases
 * reject and request changes while approve waits for every
 * side effect to be acknowledged; each decision then reaches the port once, with its own `Decision`
 * member and the trimmed comment, and the screen re-reads the record instead of writing it locally.
 * The acting persona is part of that gate, resolved through the demonstration capability's
 * `getActiveUser` exactly as the screen reads it: a persona the record refuses — the plan's requester,
 * or a role the record does not name as able to decide it — meets three disabled controls carrying
 * POL-003 or the record's own roles, and the port is never asked (AAP §0.2.2, rule P-8), while an
 * identity the adapter has not reported blocks nothing. The stale gate (`T-13`): with the gating
 * source not current, the boundary's banner names the source and its instant and all three decisions
 * are disabled with a reason naming the same two values —
 * both halves of one rule, in one test — and a disabled decision never reaches the service. The
 * detail's content: the plan summary, both euro members through the one money formatter, the missing
 * inputs and the write-back preview with the fixed tag. The two failure explanations the port can
 * return: a permission refusal through the forbidden card, and a policy refusal that names the rule
 * and leaves the decisions disabled. The decided approval: the tracker's steps in the record's own
 * order and the outcome card's measures and closing-stock tables, each reading asserted through the
 * evidence trigger that carries it, the drawer that trigger opens, and the caption that stands in
 * when no resulting record arrives. The outcome review (AAP §0.6.2): the control the approved card
 * offers beside that comparison, which records the review through the port once and follows the
 * re-read, refuses a second review and an ineligible persona with the record's own sentence, reports a
 * rejection in the service's own words or through the forbidden card, and asks nothing of the port
 * where it cannot act. The seven screen states (`T-17`) and the accessibility contract
 * (`T-16`): one level-one heading, every decision reachable by `Tab` and operable by `Enter` and
 * `Space`, a programmatically labelled comment field, an `aria-pressed` acknowledgement, and the same
 * structure in both themes.
 *
 * WHERE THE DATA COMES FROM — rule P-2. The service is mocked at `service-provider.tsx`, the one
 * boundary the screen and the shared components are allowed to read through, so no seed module, no
 * adapter and no HTTP client is involved and the suite observes exactly the calls the screen makes.
 * Everything else is the real component — `StateBoundary`, `ActionButton`, `DataTable`, `MonoValue`,
 * `EvidenceRef`, `StatusIndicator`, `Card`, `Panel`, the tracker and the outcome card — because what
 * a reader receives is the thing under test.
 *
 * THE FIXTURE CONSTRAINT — rule P-6. `tests/source-checks/no-typed-figures.test.ts` scans
 * `src/features/**`, this file included, for currency literals and for literals shaped like a domain
 * record identifier, so every reference here is an opaque placeholder (`approval-under-test`,
 * `plant-alpha`, `scenario-planned`, `record-alpha`) and no amount is written with a currency marker.
 * The euro members are the plain integers a record holds; they are the fixtures' own values, never a
 * figure a screen computes, and no displayed figure is compared against a literal typed here — the
 * amounts are asserted through {@link formatMoney} and the outcome columns through the values the
 * `SolverResult` fixtures carry. Plain integers a component test cannot avoid — a step's `sequence`,
 * a count of units — are not figures a reader could mistake for a computed measure, and the check
 * does not flag them, so there is no collision to report there.
 *
 * WHY {@link formatMoney} IS REBUILT HERE RATHER THAN IMPORTED. `mono-value.tsx` exports the
 * interface's one money formatter, and importing it would make every amount assertion agree with the
 * component's formatter by construction — the test would pass even if that formatter had drifted to
 * another locale, another currency or another fraction range. This suite therefore recomputes the
 * presentation from the options `platform-contracts.md` §1 and AAP §0.8 document, so a change to the
 * component's formatter fails here instead of being silently accepted, and the presentation is never
 * embedded as a formatted literal.
 *
 * WHAT THE PORT DOES NOT CARRY, AND WHERE EACH ABSENCE IS FELT. `Approval` carries no plant member, so
 * the screen reads the plant the plan lands on from `getExceptionDetail().exception.plantId`, and this
 * suite proves the acknowledgement's accessible name comes from that record — not from this file — by
 * rendering a second plant and asserting the name follows it. The port's `decideApproval` carries no
 * side-effect acknowledgement member, so the acknowledgement is a screen-side gate on approve, and the
 * suite asserts what the screen owes: approve stays disabled until every acknowledgement is given, and
 * nothing else about the decision changes. Neither `Approval` nor `SolverResult` carries a "resulting"
 * measure, so "the service supplies no resulting record" is expressed the only way the port can
 * express it, a rejected `getApprovalOutcome`, and the suite asserts the caption that stands in and
 * that no zero-valued row appears in its place.
 *
 * THREE SYMBOLS FROM MODULES OUTSIDE THIS FILE'S OWN LIST. `STATE_BOUNDARY_TEXT` from
 * `../../components/state-boundary`, `EVIDENCE_DRAWER_TEXT` from `../../components/evidence-drawer` and
 * `OUTCOME_CARD_TEXT` from `./outcome-card` own strings this suite has to assert — the stale banner's
 * headline, the reading trigger's hidden completion and the outcome card's column headings — so all
 * three are imported rather than re-spelled here: a second copy of fixed text could drift from the
 * component that renders it, the real components are rendered rather than mocked, and nothing is
 * written to either module.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EVIDENCE_DRAWER_TEXT, writeBackStepRef } from '../../components/evidence-drawer';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import {
  APPROVAL_GATE_SOURCE,
  DEMO_CLOCK,
  SEGREGATION_OF_DUTIES_POLICY_ID,
  SIM_LABELS,
  SOURCE_IDS,
  SOURCE_LABELS,
} from '../../types';
import type {
  ActiveUser,
  Approval,
  ApprovalOutcome,
  DailyClosingStockPoint,
  Evidence,
  ExceptionDetail,
  Freshness,
  FreshnessState,
  IsoDate,
  Permission,
  PlantId,
  PolicyId,
  Problem,
  Result,
  Role,
  Scenario,
  ScenarioSet,
  Scope,
  SideEffect,
  SolverResult,
  Timestamp,
  WriteBack,
} from '../../types';
import {
  APPROVAL_DETAIL_TEXT,
  ApprovalDetailScreen,
  decisionEligibilityReason,
  sideEffectAcknowledgement,
} from './approval-detail-screen';
import { OUTCOME_CARD_TEXT } from './outcome-card';
import { WRITE_BACK_TAG } from './write-back-tracker';

/* ---------------------------------------------------------------------------------------------
 * The fixtures — every value a record's own, and none of them a typed figure
 * ------------------------------------------------------------------------------------------- */

/** The approvals route the shell declares, so the harness opens the detail through it. */
const APPROVALS_ROUTE = '/approvals';

/** The correlation identifier every successful read of these fixtures carries. */
const TRACE_ID = 'trace-approval-detail';

/** The instant the sources last answered: the demonstration clock's own, never typed here. */
const AS_OF: Timestamp = DEMO_CLOCK;

/** The identifier the harness puts in the route, and the approval every fixture reads. */
const APPROVAL_ID = 'approval-under-test';

/** The exception the plan answers, as the approval record names it. */
const EXCEPTION_ID = 'exception-under-test';

/** The option under approval. */
const SCENARIO_ID = 'scenario-planned';

/** The option's name, which the plan summary prints beside its identifier. */
const SCENARIO_NAME = 'Planned option';

/** The persona who requested the plan. */
const REQUESTER_ID = 'persona-requester';

/** The persona who decided it, in the approved fixture. */
const DECIDER_ID = 'persona-decider';

/** The plant the plan lands on, which is the record's own and not this file's. */
const PLANT_ID: PlantId = 'plant-alpha';

/** A second plant, used to prove the acknowledgement's name follows the record. */
const OTHER_PLANT_ID: PlantId = 'plant-beta';

/** A write-back step's own record references: opaque placeholders, not record identifiers. */
const WRITE_BACK_REFS = ['record-alpha', 'record-beta', 'record-gamma'] as const;

/** The kit counts and value the side effects defer: plain integers a record holds. */
const SIDE_EFFECT_KITS = 900;
const SIDE_EFFECT_VALUE = 108000;
const SIDE_EFFECT_DAYS = 10;

/** The plan's added cost and the revenue it protects: plain integers, asserted through the formatter. */
const ADDED_COST = 5000;
const PROTECTED_REVENUE = 12000;

/** The units the plan leaves late, and the units the records left late afterwards. */
const PLANNED_UNITS_LATE = 5;
const RESULTING_UNITS_LATE = 2;

/** The inputs the impact assessment could not read, as the exception's record states them. */
const MISSING_INPUTS = ['missing input alpha', 'missing input beta'] as const;

/**
 * The clock's own date and offset with a given hour.
 *
 * Instants are derived from `DEMO_CLOCK` rather than written out, so the suite holds no typed date
 * and a change of the demonstration clock reaches every instant here at once.
 */
function instantAt(hour: number): Timestamp {
  return `${DEMO_CLOCK.slice(0, 11)}${String(hour).padStart(2, '0')}${DEMO_CLOCK.slice(13)}`;
}

/** The instant the stale fixture's gating source last answered: the clock's own, an hour earlier. */
const STALE_AS_OF = instantAt(Number(DEMO_CLOCK.slice(11, 13)) - 2);

/** The display name the gating source carries, read from the one map that fixes it. */
const GATE_LABEL = SOURCE_LABELS[APPROVAL_GATE_SOURCE];

/** The scope the shell hands the screen: the unfiltered "all plants, all products" selection. */
const SCOPE: Scope = { plants: [], products: [] };

/** The roles the record names as able to decide the plan. */
const APPROVER_ROLES: readonly Role[] = ['plant-manager', 'head-of-supply-chain'];

/** The persona the session acts as by default: a role the record names, and not its requester. */
const ACTING_APPROVER_ID = 'persona-approver';

/** A role the record does not name as able to decide this plan, though the matrix grants it the permission. */
const INELIGIBLE_ROLE: Role = 'auditor';

/**
 * The persona the mocked provider reports as acting, with the given role and identifier.
 *
 * The screen reads the acting persona through the demonstration capability's `getActiveUser`, which is
 * the one boundary an acting identity reaches it through (rule P-3), so the suite resolves the persona
 * on the same provider mock the service is handed over. Both members the screen compares are
 * parameters, because they are the two facts the record is read against: the persona's identifier
 * against `requestedBy`, its role against `eligibleApproverRoles`.
 *
 * @param role - The acting role, which decides whether the record opens to it.
 * @param id - The acting persona's identifier, which decides whether it is the plan's requester.
 * @returns The persona the screen acts as.
 */
function actingUser(role: Role, id: string = ACTING_APPROVER_ID): ActiveUser {
  return {
    id,
    name: 'Acting approver',
    role,
    plantIds: [PLANT_ID],
    permissions: [DECISION_PERMISSION],
    homeRoute: APPROVALS_ROUTE,
  };
}

/** The permission a decision requires, typed so a wrong name fails compilation. */
const DECISION_PERMISSION: Permission = 'approval.decide';

/** The policy the fixture's refusal names, an opaque placeholder rather than a rule identifier. */
const POLICY_ID: PolicyId = 'policy-blocking';

/** The sentence the fixture's policy refusal states, in the service's own words. */
const POLICY_REASON = 'A rule refuses a decision while the deferred supply stands unacknowledged.';

/** The alternative that rule permits, which the block panel prints beside the reason. */
const POLICY_ALTERNATIVE = 'Acknowledge the deferred supply and raise the decision again.';

/** The audit event the fixture's policy refusal appended. */
const REFUSAL_EVENT_ID = 'event-refusal';

/** The correlation identifier of the fixture's refusals. */
const REFUSAL_TRACE_ID = 'trace-refusal';

/** The sentence the port reports when no resulting measurement follows the plan. */
const OUTCOME_UNAVAILABLE_MESSAGE = 'The write-back has not run, so no measurement follows it.';

/**
 * The six sources' state at the moment of one call, with the gating source set as given.
 *
 * The other five stay `fresh` in every variant, so only the gating source's state can change what
 * the screen derives: `stale` raises the banner, `unavailable` is the offline rendering and `partial`
 * is the partial notice.
 */
function freshnessOf(state: FreshnessState, asOf: Timestamp): readonly Freshness[] {
  return SOURCE_IDS.map((source): Freshness => ({
    source,
    asOf: source === APPROVAL_GATE_SOURCE ? asOf : AS_OF,
    state: source === APPROVAL_GATE_SOURCE ? state : 'fresh',
  }));
}

/** Every source fresh: the state the happy-path cases run in. */
const FRESH = freshnessOf('fresh', AS_OF);

/**
 * The dates the two daily closing-stock series report, and the units each record leaves at them.
 *
 * The planned record reaches the first two dates and the resulting record the second and a third of
 * its own, so one date is shared while each record also carries a date the other does not. The joined
 * order is not alphabetical, so a card that sorted the dates would fail below rather than pass
 * unnoticed.
 */
const STOCK_DATES = {
  plannedFirst: 'closes-first',
  shared: 'closes-shared',
  resultingOnly: 'closes-resulting',
} as const satisfies Record<string, IsoDate>;

/** The closes the plan projects, in the order its own solve states them. */
const PLANNED_STOCK: readonly DailyClosingStockPoint[] = [
  { date: STOCK_DATES.plannedFirst, units: 40 },
  { date: STOCK_DATES.shared, units: 25 },
];

/** The closes the records reached, sharing one date with the plan and carrying one it omits. */
const RESULTING_STOCK: readonly DailyClosingStockPoint[] = [
  { date: STOCK_DATES.shared, units: 30 },
  { date: STOCK_DATES.resultingOnly, units: 12 },
];

/**
 * One measurement a `SolverResult` carries, built once and spread by the fixtures below.
 *
 * The closing stock is a parameter because the outcome card prints it as its own table, and the two
 * records it sets side by side carry different series so a swapped column is visible.
 */
function solverResult(
  unitsLate: number,
  addedCostEur: number,
  dailyClosingStock: readonly DailyClosingStockPoint[] = [],
): SolverResult {
  return {
    unitsLate,
    maxDaysLate: 3,
    ordersOnTime: 2,
    ordersTotal: 4,
    addedCostEur,
    lineIdleDays: 1.5,
    revenueDelayedEur: 9000,
    runOut: { day: 4, fractionOfDay: 0.5 },
    dailyClosingStock: [...dailyClosingStock],
    orders: [],
    constraintCheck: 'pass',
    constraintMessages: [],
    sideEffects: [],
    writeBacks: [],
    levers: { airSets: 0, transferSets: 0 },
    confidence: { level: 'high', reason: 'The assessment read every order it measures.' },
  };
}

/** The side effects the plan defers another product's supply for: two, so "every" can be asserted. */
const SIDE_EFFECTS = [
  {
    productId: 'product-alpha',
    kitsDelayed: SIDE_EFFECT_KITS,
    valueDeferredEur: SIDE_EFFECT_VALUE,
    daysDeferred: SIDE_EFFECT_DAYS,
  },
  {
    productId: 'product-beta',
    kitsDelayed: SIDE_EFFECT_KITS + 1,
    valueDeferredEur: SIDE_EFFECT_VALUE + 1,
    daysDeferred: SIDE_EFFECT_DAYS + 1,
  },
] as const satisfies readonly SideEffect[];

/**
 * The write-back steps the approval carries, in the order the record states them.
 *
 * Three steps, each with its own description and reference, so the preview and the tracker can be
 * asserted item by item in that order rather than merely counted.
 */
const WRITE_BACKS = [
  {
    sequence: 1,
    system: 'erp',
    recordRef: WRITE_BACK_REFS[0],
    description: 'Release the delayed supply order',
    state: 'pending',
  },
  {
    sequence: 2,
    system: 'mes',
    recordRef: WRITE_BACK_REFS[1],
    description: 'Re-sequence the consuming line',
    state: 'pending',
  },
  {
    sequence: 3,
    system: 'scheduling',
    recordRef: WRITE_BACK_REFS[2],
    description: 'Move the transfer window',
    state: 'pending',
  },
] as const satisfies readonly WriteBack[];

/** A copy of the steps, so a screen that mutated its record could not reach the fixtures. */
function writeBackCopies(): WriteBack[] {
  return WRITE_BACKS.map((step) => ({ ...step }));
}

/**
 * The approval under test, pending.
 *
 * A fresh object per call, because `Approval.writeBacks` is a mutable array the adapter replaces in
 * place: handing the same instance to two renders would let one case see the other's record.
 */
function pendingApproval(): Approval {
  return {
    id: APPROVAL_ID,
    exceptionId: EXCEPTION_ID,
    scenarioId: SCENARIO_ID,
    requestedBy: REQUESTER_ID,
    eligibleApproverRoles: [...APPROVER_ROLES],
    status: 'pending',
    addedCostEur: ADDED_COST,
    protectedRevenueEur: PROTECTED_REVENUE,
    writeBacks: writeBackCopies(),
    outcomeReviewed: false,
  };
}

/** The same approval after it was approved, with the decision the record keeps. */
function approvedApproval(): Approval {
  return {
    ...pendingApproval(),
    status: 'approved',
    decision: { action: 'approve', comment: 'plan accepted' },
    decidedBy: DECIDER_ID,
    decidedAt: AS_OF,
    writeBacks: writeBackCopies().map((step) => ({ ...step, state: 'succeeded' as const })),
  };
}

/**
 * The same approval once the comparison has been reviewed: the record the review write answers with,
 * and the state the re-read settles into.
 *
 * The approved fixture with its own review member set and nothing else changed, built by spreading it
 * rather than restating it, so a case that renders this one differs from the approved case in exactly
 * the member the review write moves.
 */
function reviewedApproval(): Approval {
  return { ...approvedApproval(), outcomeReviewed: true };
}

/**
 * The state a write-back step reports when its simulated write stopped the run, as the record spells it.
 *
 * A record value rather than a label this suite invents: the tracker prints `WriteBack.state` itself
 * (rule P-6), so the token is what tells the failed step from the ones the failure left untouched.
 */
const FAILED_STATE = 'failed';

/**
 * The record a failed write-back leaves behind: approved with its decision recorded, the run stopped at
 * the step that failed, and every later step still `pending` because nothing after it ran (AAP §0.2.2).
 *
 * This is the record the adapter holds after `decideApproval` throws its `'simulated-write-back'`
 * `Problem`, which is why the screen has to re-read it rather than keep the pending one it was showing.
 */
function interruptedApproval(): Approval {
  return {
    ...approvedApproval(),
    writeBacks: writeBackCopies().map((step, index) => ({
      ...step,
      state: index === 0 ? ('failed' as const) : ('pending' as const),
    })),
  };
}

/** The sentence the port reports when a step of the approved change did not complete. */
const WRITE_BACK_FAILURE_MESSAGE =
  'Write-back step 1 of the plan did not complete: the simulated write of its record was refused, so no part of the approved change was applied and no later step ran.';

/** The plan's own option: its name, its identity, and the side effects an approver must acknowledge. */
const SCENARIO: Scenario = {
  ...solverResult(PLANNED_UNITS_LATE, ADDED_COST),
  id: SCENARIO_ID,
  exceptionId: EXCEPTION_ID,
  name: SCENARIO_NAME,
  origin: 'solver',
  sideEffects: SIDE_EFFECTS.map((sideEffect) => ({ ...sideEffect })),
};

/** The option set the service returns for the exception the approval names. */
const SCENARIO_SET: ScenarioSet = {
  exceptionId: EXCEPTION_ID,
  scenarios: [SCENARIO],
  recommendedId: SCENARIO_ID,
  recommendationRule: 'The option with the fewest units late, then the lowest added cost.',
  tradeOff: 'The plan spends the added cost to hold the revenue it protects.',
  rejected: [],
};

/**
 * The exception behind the plan, with the given plant.
 *
 * The plant is a parameter because it is the record the acknowledgement's accessible name is built
 * from, and one case renders a second plant to prove the name follows it.
 */
function exceptionDetail(plantId: PlantId = PLANT_ID): ExceptionDetail {
  return {
    exception: {
      id: EXCEPTION_ID,
      title: 'Supply delay on a material',
      type: 'supply-delay',
      severity: 'critical',
      status: 'open',
      plantId,
      alsoAffectsPlantIds: [],
      materialId: 'material-alpha',
      supplierId: 'supplier-alpha',
      purchaseOrderId: 'purchase-order-alpha',
      lineId: 'line-alpha',
      ownerId: 'persona-owner',
      daysToImpact: 5,
      affectedLines: [],
      missingInputs: [...MISSING_INPUTS],
      confidence: { level: 'medium', reason: 'One input could not be read.' },
      whatChanged: 'The supply order did not arrive as planned.',
      detectedAt: AS_OF,
    },
    impactChain: [],
    stockSeries: [],
    affectedOrders: [],
    missingInputs: [...MISSING_INPUTS],
    confidence: { level: 'medium', reason: 'One input could not be read.' },
    activity: [],
  };
}

/**
 * The records' measurement after the change landed, unlike the plan's in every measure the card
 * prints.
 *
 * The two records are deliberately unlike each other, so a column reporting the other record's
 * reading — or a row reporting the wrong measure — is visible in the cases below rather than passing
 * as a plausible figure. Which levers a resulting measurement is taken at is AAP §0.2.2's decision
 * and the service's to make; the card prints whichever two measurements it is handed.
 */
const RESULTING_RESULT: SolverResult = {
  ...solverResult(RESULTING_UNITS_LATE, 0, RESULTING_STOCK),
  maxDaysLate: 8,
  ordersOnTime: 1,
  ordersTotal: 3,
  lineIdleDays: 2.5,
  revenueDelayedEur: 4500,
};

/**
 * The two measurements the outcome card sets side by side, each carrying its own closing-stock series.
 *
 * The reference every reading on the card opens is the approval's own record — the route the
 * evidence read resolves — and not a reference the card composes.
 */
const APPROVAL_OUTCOME: ApprovalOutcome = {
  planned: solverResult(PLANNED_UNITS_LATE, ADDED_COST, PLANNED_STOCK),
  resulting: RESULTING_RESULT,
  evidenceRef: APPROVAL_ID,
};

/**
 * The evidence the drawer resolves for that reference: a record that fills all four of its sections.
 *
 * Its value and formula are the fixture's own, so the suite reads back what the service returned
 * rather than matching a sentence the drawer invents, and its label is the fixed §5.3 one a computed
 * figure carries (rule P-1).
 */
const OUTCOME_EVIDENCE: Evidence = {
  value: 'The approval the comparison was measured from.',
  provenance: 'computed',
  label: SIM_LABELS[1],
  formula: 'The plan’s own levers applied to the case the approval names.',
  inputs: ['the approval’s recorded decision'],
  upstream: [EXCEPTION_ID, SCENARIO_ID],
  downstream: [],
  confidence: { level: 'high', reason: 'The assessment read every order it measures.' },
  missingInputs: [],
  documents: [],
};

/**
 * The seven measurements the card prints, in the order it prints them, each read from a record and
 * presented the way the card presents it: the two amounts through the interface's one money
 * presentation, the five counts as the records' own numbers.
 *
 * The card follows AAP §0.12.4's SCR-04 row — units late, maximum days late, orders on time, added
 * cost, line idle days — and adds the two measures that make those readable: the number of orders
 * measured beside the orders on time, and the revenue delayed as the exposure it reports last. A row
 * that moves, or a column that reports one measure's reading under another measure's row, fails the
 * case below rather than passing as a plausible figure.
 */
const MEASURE_READINGS: readonly ((result: SolverResult) => string)[] = [
  (result) => String(result.unitsLate),
  (result) => String(result.maxDaysLate),
  (result) => String(result.ordersOnTime),
  (result) => String(result.ordersTotal),
  (result) => amountText(result.addedCostEur),
  (result) => String(result.lineIdleDays),
  (result) => amountText(result.revenueDelayedEur),
];

/** The permission refusal the port throws when the acting role may not decide the plan. */
function permissionProblem(): Problem {
  return {
    type: 'permission',
    message: 'This role may not decide this plan.',
    traceId: REFUSAL_TRACE_ID,
    requiredPermission: DECISION_PERMISSION,
    rolesWithPermission: [...APPROVER_ROLES],
  };
}

/** The policy refusal the port throws when a rule denies the decision. */
function policyProblem(): Problem {
  return {
    type: 'policy',
    message: POLICY_REASON,
    traceId: REFUSAL_TRACE_ID,
    policyId: POLICY_ID,
    permittedAlternative: POLICY_ALTERNATIVE,
    auditEventId: REFUSAL_EVENT_ID,
  };
}

/** The failure the port reports when no resulting measurement follows the plan. */
function outcomeProblem(): Problem {
  return {
    type: 'simulated-write-back',
    message: OUTCOME_UNAVAILABLE_MESSAGE,
    traceId: REFUSAL_TRACE_ID,
  };
}

/** The failure the port throws when a step of the approved change did not complete. */
function writeBackProblem(): Problem {
  return {
    type: 'simulated-write-back',
    message: WRITE_BACK_FAILURE_MESSAGE,
    traceId: REFUSAL_TRACE_ID,
  };
}

/** The sentence the port reports when it refuses the review the reader asked it to record. */
const REVIEW_REFUSAL_MESSAGE = 'This approval changed while its outcome was being reviewed.';

/**
 * The refusal the port throws when the record moved under the reader as the review was recorded: a
 * `'validation'` `Problem`, which is the cause the handler refuses a write it can no longer accept with.
 */
function reviewProblem(): Problem {
  return { type: 'validation', message: REVIEW_REFUSAL_MESSAGE, traceId: REFUSAL_TRACE_ID };
}

/**
 * The two rejections the review block has to answer: the port's own typed refusal, whose sentence it
 * prints, and a rejection that is not a `Problem` at all, which carries no sentence to print and so
 * falls back to the block's own.
 */
const REVIEW_FAILURES = [
  {
    name: 'the service’s own sentence',
    rejection: reviewProblem(),
    expected: REVIEW_REFUSAL_MESSAGE,
  },
  {
    name: 'the block’s own sentence when the rejection names no cause',
    rejection: new Error('the call ended without an answer'),
    expected: APPROVAL_DETAIL_TEXT.reviewUnexpectedFailure,
  },
] as const;

/** The one success envelope the port resolves with, carrying the six sources' report. */
function ok<T>(data: T, freshness: readonly Freshness[] = FRESH): Result<T> {
  return { data, meta: { freshness: [...freshness], simulated: true, traceId: TRACE_ID } };
}

/**
 * The interface's money presentation, rebuilt from the documented options.
 *
 * `platform-contracts.md` §1 fixes a EUR amount with at most two decimals and a thousands separator,
 * read in Europe/Berlin, and `mono-value.tsx` renders it with the code rather than a symbol. This
 * helper deliberately repeats those options instead of importing the component's formatter, so a
 * drift in that formatter fails the assertions below rather than travelling into them — see the file
 * header for the full reason. No amount is embedded as a formatted literal anywhere in this suite.
 */
function formatMoney(value: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * The amount as a text query compares it.
 *
 * `Intl.NumberFormat` separates an amount from its currency code with a no-break space, and the
 * queries normalise every run of whitespace — that character included — to one plain space. Applying
 * the same rule to the expectation keeps the assertion about the amount rather than about the
 * character ICU happened to choose, and it still fails when the locale, the currency or the fraction
 * range changes.
 */
function amountText(value: number): string {
  return formatMoney(value).replace(/\s+/g, ' ').trim();
}

/* ---------------------------------------------------------------------------------------------
 * The service boundary — mocked at the provider, never at the network
 * ------------------------------------------------------------------------------------------- */

/**
 * The port members this suite observes.
 *
 * Eight: the screen's own reads and writes — four reads keyed by the record they answer for, the
 * decision, the write-back retry and the outcome review — plus `getEvidence`, which the outcome card's
 * readings reach only when a case activates one. `restoreMocks` in `vite.config.ts` clears each one
 * between cases, and {@link installHappyPath} gives every case its own resolved values.
 */
const mockService = vi.hoisted(() => ({
  getApproval: vi.fn(),
  getScenarioSet: vi.fn(),
  getExceptionDetail: vi.fn(),
  getApprovalOutcome: vi.fn(),
  getEvidence: vi.fn(),
  decideApproval: vi.fn(),
  retryWriteBack: vi.fn(),
  reviewApprovalOutcome: vi.fn(),
}));

/**
 * The demonstration capability the mocked provider reports.
 *
 * `getActiveUser` is the member the screen reads the acting persona through; it sits on the capability
 * beside the port rather than on the port itself because the contracts' interface declares no identity
 * (rule P-3). The factory below is hoisted above every import and cannot close over a fixture directly,
 * so the capability is hoisted too and its member is resolved by {@link beforeEach}: an approver the
 * fixture record names, so a case that does not care about identity keeps the expectations it was
 * written with, and a case about eligibility resolves the persona the record refuses instead.
 * `restoreMocks` in `vite.config.ts` clears each mock's resolution between cases, so every case states
 * its own.
 */
const mockDemonstration = vi.hoisted(() => ({
  getActiveUser: vi.fn(),
  switchRole: vi.fn(),
}));

vi.mock('../../services/service-provider', () => ({
  useService: () => mockService,
  useDemonstration: () => mockDemonstration,
  /*
   * The cache key the screen reads the acting persona under. The real module owns the tuple; this
   * double has to carry it because the screen imports the binding, and a suite that left it out would
   * fail on the import rather than on the behaviour it means to assert.
   */
  ACTIVE_USER_QUERY_KEY: ['getActiveUser'],
}));

/** One user-event session, as the suite's helpers take it. */
type UserSession = ReturnType<typeof userEvent.setup>;

/* ---------------------------------------------------------------------------------------------
 * The harness
 * ------------------------------------------------------------------------------------------- */

/**
 * The number of focus moves a tab walk may make before the walk is abandoned.
 *
 * The detail screen holds fewer than a dozen focus stops, so a walk that has not returned to the
 * control it was looking for within this bound is a control the keyboard cannot reach, which is what
 * the walk exists to report.
 */
const FOCUS_LIMIT = 40;

/**
 * Resolves every read and every write with the fixtures above, before a case changes any of them.
 *
 * The screen makes four reads on mount and a fifth only once a plan is approved, so a case that does
 * not care about one of them must still answer it: an unanswered `vi.fn()` returns `undefined`, which
 * React Query reads as a settled read with no envelope and turns into a screen state the case would
 * not be testing. Each write answers with the record it left, which is what the port returns.
 */
function installHappyPath(): void {
  mockService.getApproval.mockResolvedValue(ok(pendingApproval()));
  mockService.getScenarioSet.mockResolvedValue(ok(SCENARIO_SET));
  mockService.getExceptionDetail.mockResolvedValue(ok(exceptionDetail()));
  mockService.getApprovalOutcome.mockResolvedValue(ok(APPROVAL_OUTCOME));
  mockService.getEvidence.mockResolvedValue(ok(OUTCOME_EVIDENCE));
  mockService.decideApproval.mockResolvedValue(ok(approvedApproval()));
  mockService.retryWriteBack.mockResolvedValue(ok(WRITE_BACKS[0]));
  mockService.reviewApprovalOutcome.mockResolvedValue(ok(reviewedApproval()));
}

beforeEach(() => {
  installHappyPath();
  /* The default persona is one the record opens to: a role it names, and an identifier that is not
     the plan's requester, so the eligibility explanation is silent unless a case asks for it. */
  mockDemonstration.getActiveUser.mockResolvedValue(ok(actingUser(nth(APPROVER_ROLES, 0))));
});

afterEach(() => {
  /* A theme case sets the attribute the theme provider owns; leaving it behind would theme every
     later case in this worker, and jsdom shares one document per file. */
  delete document.documentElement.dataset['theme'];
});

/**
 * Renders the detail as the shell mounts it: behind an in-memory router so `useParams` resolves and
 * `Link` has a target, inside a cache of its own so no case inherits another's records, with retries
 * off so a refusal fails the same way however often it is repeated.
 *
 * A `null` route renders the base approvals path, which is the route that named no approval — the
 * not-found panel the screen reaches from the address rather than from a record it could not read.
 */
function renderDetail(routeId: string | null = APPROVAL_ID): void {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const entry = routeId === null ? APPROVALS_ROUTE : `${APPROVALS_ROUTE}/${routeId}`;

  render(
    <MemoryRouter initialEntries={[entry]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route
            path={`${APPROVALS_ROUTE}/:approvalId`}
            element={<ApprovalDetailScreen scope={SCOPE} />}
          />
          <Route path={APPROVALS_ROUTE} element={<ApprovalDetailScreen scope={SCOPE} />} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/* ---------------------------------------------------------------------------------------------
 * Reading the screen
 * ------------------------------------------------------------------------------------------- */

/** The entry at a position of a list, or a failure naming the position the case expected. */
function nth<T>(items: readonly T[], index: number): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`expected an entry at position ${String(index)}`);
  }

  return item;
}

/** One control by its accessible name, which is the text a reader sees on it. */
function controlNamed(name: string): HTMLElement {
  return screen.getByRole('button', { name });
}

/** The text of the description a control carries, resolved through its `aria-describedby`. */
function describedByText(control: HTMLElement): string {
  const describedBy = control.getAttribute('aria-describedby');

  if (describedBy === null) {
    return '';
  }

  return describedBy
    .split(/\s+/)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

/**
 * The sentence a field's `aria-errormessage` names, resolved from the document.
 *
 * Read as an element rather than as an id, because a field-level message is something a reader can see
 * beside the field: an id that resolves to nothing describes nothing, and asserting only the attribute
 * would accept exactly that.
 */
function errorMessageOf(field: HTMLElement): HTMLElement | null {
  const messageId = field.getAttribute('aria-errormessage');

  return messageId === null ? null : document.getElementById(messageId);
}

/**
 * The control a reading cell shows, found by the reading it states.
 *
 * Every reading renders through `EvidenceRef`, whose accessible name is the visible reading followed
 * by the hidden completion that says what activating it opens (WCAG 2.2 SC 2.5.3). A reading is
 * therefore asserted through that name — the cell's own text also carries the completion — and a cell
 * that holds the other record's reading, or no trigger at all, fails here.
 */
function readingTriggerIn(cell: HTMLElement, reading: string): HTMLElement {
  return within(cell).getByRole('button', {
    name: (name: string) => {
      const normalized = name.replace(/\s+/g, ' ').trim();

      return (
        normalized.startsWith(reading) &&
        normalized.endsWith(EVIDENCE_DRAWER_TEXT.openSuffix)
      );
    },
  });
}

/** One series' closes, keyed by the date each belongs to, so two series can be compared by date. */
function closesOf(series: readonly DailyClosingStockPoint[]): ReadonlyMap<string, number> {
  return new Map(series.map((point) => [point.date, point.units]));
}

/**
 * The dates the two closing-stock series report, in the order the card joins them: the dates the
 * planned series states, then every date only the resulting series reaches.
 *
 * Derived from the two fixtures rather than typed, so the case compares the table against the records
 * the service returned (rule P-6).
 */
function joinedStockDates(): readonly string[] {
  const planned = closesOf(PLANNED_STOCK);
  const resulting = closesOf(RESULTING_STOCK);

  return [
    ...planned.keys(),
    ...[...resulting.keys()].filter((date) => !planned.has(date)),
  ];
}

/** The named region a card or a panel renders, found by the heading it carries. */
function regionNamed(name: string): HTMLElement {
  return screen.getByRole('region', { name });
}

/** The decision's comment field, found by its visible label rather than by a test identifier. */
function commentField(): HTMLTextAreaElement {
  return screen.getByLabelText<HTMLTextAreaElement>(APPROVAL_DETAIL_TEXT.commentLabel);
}

/**
 * Every side-effect acknowledgement named from the given plant, in the record's own order.
 *
 * The accessible name is built from the plant alone — it is the plant the plan lands on, not the
 * product each side effect defers — so a plan with two side effects renders two toggles under one
 * name. They are told apart by their position, which is the order the record states them in.
 */
function acknowledgementsFor(plantId: PlantId): readonly HTMLElement[] {
  return screen.getAllByRole('button', { name: sideEffectAcknowledgement(plantId) });
}

/* ---------------------------------------------------------------------------------------------
 * Driving the screen
 * ------------------------------------------------------------------------------------------- */

/** Types a comment, which is the one thing only the reader can supply to a decision. */
async function giveComment(user: UserSession, comment: string): Promise<void> {
  await user.type(commentField(), comment);
}

/** Acknowledges every side effect the plan carries, which is what approve waits for. */
async function acknowledgeEverySideEffect(
  user: UserSession,
  plantId: PlantId = PLANT_ID,
): Promise<void> {
  /* One toggle per side effect, every one named from the same plant — the name carries the plant,
     not the product — so the toggles are told apart by their position in the record's own list. */
  const toggles = acknowledgementsFor(plantId);

  expect(toggles).toHaveLength(SIDE_EFFECTS.length);

  for (const toggle of toggles) {
    await user.click(toggle);
  }
}

/**
 * Moves focus with `Tab` until the given control holds it, and reports whether it got there.
 *
 * Used wherever a case has to prove a control is reachable by keyboard rather than by a pointer
 * call: the walk visits exactly the controls the document exposes, so a control outside the tab
 * order is reported as unreachable instead of being focused programmatically.
 */
async function tabTo(user: UserSession, control: HTMLElement): Promise<boolean> {
  for (let step = 0; step < FOCUS_LIMIT; step += 1) {
    if (document.activeElement === control) {
      return true;
    }

    await user.tab();
  }

  return document.activeElement === control;
}

/* ---------------------------------------------------------------------------------------------
 * The decision gate — AAP 0.12.2, T-07
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the detail and waits for the plan's reads to settle into the screen's own content.
 *
 * Both mounts are awaited: the approval is the first read to answer, and the option set and the
 * exception behind it settle a tick later — the side-effect panel is the one place that proves all
 * three arrived, so a case that asserted before it would be reading a half-read screen.
 */
async function renderPendingDetail(): Promise<void> {
  renderDetail();
  await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });
  await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.sideEffectSection });
}

describe('T-07 the decision gate', () => {
  it('T-07 keeps every decision disabled without a comment, each with a reason a reader can reach', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const approve = controlNamed(APPROVAL_DETAIL_TEXT.approve);
    const reject = controlNamed(APPROVAL_DETAIL_TEXT.reject);
    const requestChanges = controlNamed(APPROVAL_DETAIL_TEXT.requestChanges);

    for (const decision of [approve, reject, requestChanges]) {
      expect(decision).toHaveAttribute('aria-disabled', 'true');
      /* The reason is the control's description, so it is announced when focus arrives and is not a
         `title` attribute a keyboard reader never sees (rule P-8). */
      expect(describedByText(decision)).toContain(APPROVAL_DETAIL_TEXT.commentRequiredReason);
      expect(decision).not.toHaveAttribute('title');
    }

    /* And it is painted on keyboard focus, which is the reading a sighted keyboard user gets. */
    expect(await tabTo(user, approve)).toBe(true);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.commentRequiredReason,
    );
  });

  it('qa-w013-I22 answers a refused decision with a visible reason and an announcement', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const decisionCard = regionNamed(APPROVAL_DETAIL_TEXT.decisionSection);
    const approve = controlNamed(APPROVAL_DETAIL_TEXT.approve);

    /* Nothing is said before the attempt: the reason exists only as the control's description, in the
       `sr-only` element that mounted with it, so no hint is painted and no live region is mounted —
       the silent state the finding records for a click that follows. */
    expect(screen.queryByRole('tooltip')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(describedByText(approve)).toContain(APPROVAL_DETAIL_TEXT.commentRequiredReason);

    await user.click(approve);

    /* The refused click is answered twice over. The sentence is painted in a hint the pointer does not
       own — the hint is portalled onto the document body, so it is read where it paints rather than
       inside the card — and it is announced from a live region in the card, while the record itself is
       untouched and the status stays pending. */
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.commentRequiredReason,
    );
    expect(within(decisionCard).getByRole('alert')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.commentRequiredReason,
    );
    expect(approve).toHaveAttribute('aria-disabled', 'true');
    expect(mockService.decideApproval).not.toHaveBeenCalled();

    /* The reader moves the pointer off the control it just clicked and keeps the reason. */
    await user.unhover(approve);
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.commentRequiredReason,
    );

    /* The second gate the finding names: with the comment supplied, approve is blocked by the
       acknowledgement instead, and its refusal carries that sentence both ways. */
    await giveComment(user, 'plan accepted');
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    expect(screen.getByRole('tooltip')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.acknowledgementRequiredReason,
    );
    expect(within(decisionCard).getByRole('alert')).toHaveTextContent(
      APPROVAL_DETAIL_TEXT.acknowledgementRequiredReason,
    );
    expect(mockService.decideApproval).not.toHaveBeenCalled();
  });

  it('qa-w013-I22 marks the comment field and shows the sentence when a decision is refused without one', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    /* Before the attempt the field states its requirement as a hint and nothing more: no invalid
       state, and no message element for an error message to name. */
    const before = commentField();

    expect(before).not.toHaveAttribute('aria-invalid');
    expect(errorMessageOf(before)).toBeNull();

    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    /* The refusal itself is unchanged: all three decisions stay disabled and the record is untouched. */
    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      expect(controlNamed(label)).toHaveAttribute('aria-disabled', 'true');
    }
    expect(mockService.decideApproval).not.toHaveBeenCalled();

    /* And the field-level half answers the same attempt: the field says its value is what is wrong,
       the sentence the control refused with is its accessible error message, and that sentence is
       visible beside the field rather than only in the card's announcement. */
    const field = commentField();
    const message = errorMessageOf(field);

    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleErrorMessage(APPROVAL_DETAIL_TEXT.commentRequiredReason);
    expect(message).not.toBeNull();
    expect(message).toHaveTextContent(APPROVAL_DETAIL_TEXT.commentRequiredReason);
    expect(message).toBeVisible();
    expect(message?.parentElement).toBe(field.parentElement);
    expect(message).not.toHaveClass('sr-only');

    /* And the sentence reaches a reader through the field's description as well, which is the technique
       an `aria-errormessage` reference is honoured by: `aria-describedby` names the hint and then the
       message — the hint first, so the standing requirement reads before the refusal — so the id the
       error-message attribute names is one the field also describes itself with, and the description it
       carries is both sentences together. */
    const descriptionIds = (field.getAttribute('aria-describedby') ?? '').split(/\s+/);

    expect(descriptionIds).toContain(field.getAttribute('aria-errormessage'));
    expect(descriptionIds.map((id) => document.getElementById(id)?.textContent ?? '')).toEqual([
      APPROVAL_DETAIL_TEXT.commentHint,
      APPROVAL_DETAIL_TEXT.commentRequiredReason,
    ]);
    expect(field).toHaveAccessibleDescription(
      `${APPROVAL_DETAIL_TEXT.commentHint} ${APPROVAL_DETAIL_TEXT.commentRequiredReason}`,
    );
  });

  it('qa-w013-I22 takes the message off the comment field as soon as the comment is supplied', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.requestChanges));
    expect(commentField()).toHaveAttribute('aria-invalid', 'true');

    await giveComment(user, 'plan accepted');

    /* The reader has supplied what the gate asked for, so the message goes with the first keystroke:
       no invalid state, no error message for the field to name, and the hint is its whole description
       again — the message has left `aria-describedby` with the reference that pointed at it. */
    const field = commentField();

    expect(field).toHaveValue('plan accepted');
    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).not.toHaveAttribute('aria-errormessage');
    expect(errorMessageOf(field)).toBeNull();
    expect(field).toHaveAccessibleDescription(APPROVAL_DETAIL_TEXT.commentHint);
    expect(
      (field.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent ?? ''),
    ).toEqual([APPROVAL_DETAIL_TEXT.commentHint]);
    expect(screen.queryByText(APPROVAL_DETAIL_TEXT.commentRequiredReason)).toBeNull();
  });

  it('qa-w013-I22 leaves the comment field valid when another gate is what refused the decision', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    const user = userEvent.setup();
    await renderPendingDetail();

    const approve = controlNamed(APPROVAL_DETAIL_TEXT.approve);

    /* The comment is as empty here as it was in the case above, and the gate that refuses is the stale
       source, not the field: the refusal names that source and the field stays unmarked, because no
       typing can clear a source that is not current. */
    expect(describedByText(approve)).toContain(GATE_LABEL);

    await user.click(approve);

    const field = commentField();

    expect(field).not.toHaveAttribute('aria-invalid');
    expect(field).not.toHaveAttribute('aria-errormessage');
    expect(errorMessageOf(field)).toBeNull();
    expect(screen.queryByText(APPROVAL_DETAIL_TEXT.commentRequiredReason)).toBeNull();
    expect(mockService.decideApproval).not.toHaveBeenCalled();
  });

  it('T-07 releases the shared decisions on a comment and keeps approve behind the acknowledgements', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'plan accepted');

    expect(controlNamed(APPROVAL_DETAIL_TEXT.reject)).not.toHaveAttribute('aria-disabled');
    expect(controlNamed(APPROVAL_DETAIL_TEXT.requestChanges)).not.toHaveAttribute('aria-disabled');

    const blockedApprove = controlNamed(APPROVAL_DETAIL_TEXT.approve);

    expect(blockedApprove).toHaveAttribute('aria-disabled', 'true');
    expect(describedByText(blockedApprove)).toContain(
      APPROVAL_DETAIL_TEXT.acknowledgementRequiredReason,
    );

    const toggles = acknowledgementsFor(PLANT_ID);

    expect(toggles).toHaveLength(SIDE_EFFECTS.length);

    /* One of two acknowledged is not every one of them: approve stays blocked until the last. */
    await user.click(nth(toggles, 0));
    expect(controlNamed(APPROVAL_DETAIL_TEXT.approve)).toHaveAttribute('aria-disabled', 'true');

    await user.click(nth(toggles, 1));
    expect(controlNamed(APPROVAL_DETAIL_TEXT.approve)).not.toHaveAttribute('aria-disabled');
  });

  it('T-07 names each acknowledgement from the plant the record states', async () => {
    mockService.getExceptionDetail.mockResolvedValue(ok(exceptionDetail(OTHER_PLANT_ID)));

    await renderPendingDetail();

    const toggles = acknowledgementsFor(OTHER_PLANT_ID);

    expect(toggles).toHaveLength(SIDE_EFFECTS.length);

    for (const toggle of toggles) {
      expect(toggle.textContent).toBe(sideEffectAcknowledgement(OTHER_PLANT_ID));
      expect(toggle.textContent).toContain(OTHER_PLANT_ID);
    }
    /* The other plant's name is not on a control at all, so the name came from the record rather
       than from a value written into the screen. */
    expect(screen.queryByRole('button', { name: sideEffectAcknowledgement(PLANT_ID) })).toBeNull();
  });

  it('T-07 records one approval with its decision and trimmed comment, then shows what the re-read returned', async () => {
    const user = userEvent.setup();

    /* The record moves only in the service: the first read is pending, and every read after the
       decision returns the approved record. Anything the screen shows of the approval therefore came
       from the second read, which is the assertion that the screen wrote nothing locally. */
    mockService.getApproval
      .mockResolvedValueOnce(ok(pendingApproval()))
      .mockResolvedValue(ok(approvedApproval()));

    await renderPendingDetail();

    expect(
      screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.trackerSection }),
    ).toBeNull();

    const readsBefore = mockService.getApproval.mock.calls.length;

    await giveComment(user, '  plan accepted  ');
    await acknowledgeEverySideEffect(user);
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'approve',
      comment: 'plan accepted',
    });

    await waitFor(() => {
      expect(mockService.getApproval.mock.calls.length).toBeGreaterThan(readsBefore);
    });

    expect(
      await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.trackerSection }),
    ).toBeInTheDocument();
    expect(commentField()).toHaveValue('');
  });

  it('T-07 records a rejection with its own decision member and the comment', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'not this plan');
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.reject));

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'reject',
      comment: 'not this plan',
    });
  });

  it('T-07 records a request for changes with its own decision member and the comment', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'tighten the transfer window');
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.requestChanges));

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'request-changes',
      comment: 'tighten the transfer window',
    });
  });

  it('T-07 keeps every decision disabled for a comment of nothing but spaces', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, '   ');

    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      expect(controlNamed(label)).toHaveAttribute('aria-disabled', 'true');
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The stale gate — AAP 0.2.1, T-13's visible half
 * ------------------------------------------------------------------------------------------- */

/* ---------------------------------------------------------------------------------------------
 * The acting persona the record refuses — AAP §0.2.2, AAP §0.12.2, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The two personas an approval refuses, and the sentence each one meets.
 *
 * POL-003 keeps the plan's requester from deciding it, and the record names the roles that may decide
 * it, so a persona inside neither condition is the one the controls have to explain (AAP §0.2.2). The
 * sentence is named from the screen's own text object rather than retyped, and each case also asserts
 * the roles the fixture record holds, so the explanation is proved to come from the record instead of
 * from this suite.
 */
const REFUSED_PERSONAS = [
  {
    name: 'the persona who requested the plan',
    user: actingUser(nth(APPROVER_ROLES, 0), REQUESTER_ID),
    reason: APPROVAL_DETAIL_TEXT.requesterRuleSuffix,
    namesRule: true,
  },
  {
    name: 'a role the record does not name as able to decide it',
    user: actingUser(INELIGIBLE_ROLE),
    reason: APPROVAL_DETAIL_TEXT.actingRolePrefix,
    namesRule: false,
  },
];

describe('the acting persona the record refuses', () => {
  it.each(REFUSED_PERSONAS)(
    'disables all three decisions with the record’s own reason for $name, and sends nothing',
    async ({ user, reason, namesRule }) => {
      mockDemonstration.getActiveUser.mockResolvedValue(ok(user));

      const session = userEvent.setup();
      await renderPendingDetail();

      /* The two duties only the reader can discharge are discharged first, so the reason the controls
         carry is the record's own eligibility fact rather than a duty not yet met. */
      await giveComment(session, 'plan accepted');
      await acknowledgeEverySideEffect(session);

      for (const label of [
        APPROVAL_DETAIL_TEXT.approve,
        APPROVAL_DETAIL_TEXT.reject,
        APPROVAL_DETAIL_TEXT.requestChanges,
      ]) {
        const decision = controlNamed(label);

        expect(decision).toHaveAttribute('aria-disabled', 'true');

        const described = describedByText(decision);
        expect(described).toContain(reason);
        /* The roles that may act, read from the record the screen holds rather than from this file. */
        expect(described).toContain(APPROVER_ROLES.join(', '));

        if (namesRule) {
          /* POL-003 is named before the attempt is made, not only by the refusal that follows it. */
          expect(described).toContain(SEGREGATION_OF_DUTIES_POLICY_ID);
        }
      }

      /* And the refusal the service would return is never asked for: nothing reaches the port. */
      fireEvent.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));
      expect(mockService.decideApproval).not.toHaveBeenCalled();
    },
  );

  it('releases the shared decisions for an approver the record names and holds no unknown persona against it', async () => {
    const session = userEvent.setup();
    await renderPendingDetail();

    await giveComment(session, 'plan accepted');

    /* The default persona is a role the record names and not its requester, so neither fact blocks
       it: the shared decisions are released and approve waits on its acknowledgement alone. */
    expect(controlNamed(APPROVAL_DETAIL_TEXT.reject)).not.toHaveAttribute('aria-disabled');
    expect(controlNamed(APPROVAL_DETAIL_TEXT.requestChanges)).not.toHaveAttribute('aria-disabled');

    const approve = controlNamed(APPROVAL_DETAIL_TEXT.approve);
    expect(approve).toHaveAttribute('aria-disabled', 'true');
    expect(describedByText(approve)).toBe(APPROVAL_DETAIL_TEXT.acknowledgementRequiredReason);

    /* An identity the adapter has not reported yet — the read still pending, failed, or an adapter
       that carries none — is not a persona who may not act: the explanation stays silent rather than
       blocking on a fact nobody knows (rule P-8). */
    expect(decisionEligibilityReason(pendingApproval(), null)).toBeNull();
    expect(decisionEligibilityReason(pendingApproval(), actingUser(nth(APPROVER_ROLES, 0)))).toBeNull();

    /* And a record that names no eligible role is stated in words rather than read out as an empty
       list, for the requester and for any other role the record does not open to (rule P-8). */
    const noEligibleRoles: Approval = { ...pendingApproval(), eligibleApproverRoles: [] };

    expect(decisionEligibilityReason(noEligibleRoles, actingUser(nth(APPROVER_ROLES, 0), REQUESTER_ID)))
      .toBe(`${SEGREGATION_OF_DUTIES_POLICY_ID} ${APPROVAL_DETAIL_TEXT.requesterNoRoleSuffix}`);
    expect(decisionEligibilityReason(noEligibleRoles, actingUser(INELIGIBLE_ROLE))).toBe(
      APPROVAL_DETAIL_TEXT.actingRoleNoRoles,
    );
  });
});

describe('T-13 the stale gate', () => {
  it('T-13 names the gating source and its instant in the banner and in every disabled decision’s reason', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    await renderPendingDetail();

    /* The banner's half: the record's own source label and the record's own instant, unchanged. */
    expect(
      screen.getByText(`${GATE_LABEL}${STATE_BOUNDARY_TEXT.staleSuffix}`),
    ).toBeInTheDocument();
    expect(screen.getByText(STALE_AS_OF)).toBeInTheDocument();

    /* The controls' half: one shared sentence, naming the same source and the same instant. */
    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      const decision = controlNamed(label);
      const reason = describedByText(decision);

      expect(decision).toHaveAttribute('aria-disabled', 'true');
      expect(reason).toContain(GATE_LABEL);
      expect(reason).toContain(STALE_AS_OF);
      /* The gate outranks the comment, so the reason states the staleness rather than asking for a
         comment the reader cannot use. */
      expect(reason).not.toContain(APPROVAL_DETAIL_TEXT.commentRequiredReason);
    }
  });

  it('T-13 never sends a decision while the gating source is not current', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    await renderPendingDetail();

    /* `aria-disabled` keeps the control focusable and clickable on purpose (rule B-3), so the
       activation attempt is the raw pointer event a reader's click delivers: the screen refuses it,
       and the service-side refusal is asserted in the adapter's own suite. */
    fireEvent.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    await waitFor(() => {
      expect(mockService.decideApproval).not.toHaveBeenCalled();
    });
  });
});

/* ---------------------------------------------------------------------------------------------
 * The detail's own records
 * ------------------------------------------------------------------------------------------- */

describe('the records the detail renders', () => {
  it('renders the plan summary, both amounts, the missing inputs and the simulated write-back preview', async () => {
    await renderPendingDetail();

    const plan = regionNamed(APPROVAL_DETAIL_TEXT.planSection);

    expect(within(plan).getByText(SCENARIO_NAME)).toBeInTheDocument();
    expect(plan).toHaveTextContent(SCENARIO_ID);
    expect(plan).toHaveTextContent(EXCEPTION_ID);
    expect(plan).toHaveTextContent(REQUESTER_ID);

    for (const role of APPROVER_ROLES) {
      expect(within(plan).getByText(role)).toBeInTheDocument();
    }

    const cost = regionNamed(APPROVAL_DETAIL_TEXT.costSection);

    /* Both amounts reach the screen through the interface's money presentation, recomputed here
       from the documented options rather than embedded as a formatted literal. */
    expect(within(cost).getByText(amountText(ADDED_COST))).toBeInTheDocument();
    expect(within(cost).getByText(amountText(PROTECTED_REVENUE))).toBeInTheDocument();
    /* A computed figure carries its own exact §5.3 label, taken from the fixed list (rule P-1). */
    expect(within(cost).getByText(SIM_LABELS[1])).toBeInTheDocument();

    const missing = regionNamed(APPROVAL_DETAIL_TEXT.missingInputsSection);

    for (const input of MISSING_INPUTS) {
      expect(within(missing).getByText(input)).toBeInTheDocument();
    }

    const preview = regionNamed(APPROVAL_DETAIL_TEXT.writeBackPreviewSection);
    const steps = within(preview).getAllByRole('listitem');

    expect(steps).toHaveLength(WRITE_BACKS.length);

    WRITE_BACKS.forEach((step, index) => {
      const item = nth(steps, index);

      /* The record's own order, item by item, and the fixed tag inside every step: a page-level
         badge does not label an individual write-back (rule P-1). */
      expect(item).toHaveTextContent(step.description);
      expect(item).toHaveTextContent(WRITE_BACK_TAG);
    });
  });
});

describe('the failures the port can report', () => {
  it('explains a permission refusal with the permission, the roles that hold it and the trace id', async () => {
    mockService.getApproval.mockRejectedValue(permissionProblem());

    renderDetail();

    /* The card names the required permission in its own heading, the roles that hold it and the
       correlation identifier of the refused call, so the denial is explained rather than reported. */
    expect(
      await screen.findByRole('heading', { name: new RegExp(DECISION_PERMISSION) }),
    ).toBeInTheDocument();

    for (const role of APPROVER_ROLES) {
      expect(screen.getByText(role)).toBeInTheDocument();
    }

    expect(screen.getByText(REFUSAL_TRACE_ID)).toBeInTheDocument();
    /* The content is replaced rather than shown beside controls that could not act. */
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    expect(screen.queryByRole('button', { name: APPROVAL_DETAIL_TEXT.approve })).toBeNull();
  });

  it('explains a policy refusal and keeps the decisions disabled with the same reason', async () => {
    const user = userEvent.setup();
    mockService.decideApproval.mockRejectedValue(policyProblem());

    await renderPendingDetail();

    await giveComment(user, 'plan accepted');
    await acknowledgeEverySideEffect(user);
    await user.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    const block = await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.policySection });

    expect(block).toHaveTextContent(POLICY_ID);
    expect(block).toHaveTextContent(POLICY_REASON);
    expect(block).toHaveTextContent(POLICY_ALTERNATIVE);
    expect(block).toHaveTextContent(REFUSAL_EVENT_ID);

    for (const label of [
      APPROVAL_DETAIL_TEXT.approve,
      APPROVAL_DETAIL_TEXT.reject,
      APPROVAL_DETAIL_TEXT.requestChanges,
    ]) {
      const decision = controlNamed(label);

      expect(decision).toHaveAttribute('aria-disabled', 'true');
      expect(describedByText(decision)).toContain(POLICY_REASON);
    }

    /* One attempt, and nothing written: the refusal created no decision the screen could show. */
    expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(APPROVAL_DETAIL_TEXT.decisionActionLabel)).toBeNull();
  });
});

/**
 * Renders an approved plan's detail and waits for the review block beside the comparison.
 *
 * The review is offered only once the outcome card has its measurement, so the block is the last thing
 * an approved screen mounts: a case that asserted before it arrived would be reading a screen still
 * waiting on the outcome read.
 *
 * @returns The review block, found by its heading.
 */
async function renderOutcomeReview(): Promise<HTMLElement> {
  renderDetail();
  await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

  return screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.reviewSection });
}

describe('an approval that has been decided', () => {
  it('lists the write-backs in the order the record states and sets planned against resulting figures', async () => {
    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));

    renderDetail();
    await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

    const tracker = await screen.findByRole('region', {
      name: APPROVAL_DETAIL_TEXT.trackerSection,
    });
    const steps = within(tracker).getAllByRole('listitem');

    expect(steps).toHaveLength(WRITE_BACKS.length);

    WRITE_BACKS.forEach((step, index) => {
      expect(nth(steps, index)).toHaveTextContent(step.description);
    });

    /* The measures: one row per measure, the plan's reading in the second column and the records'
       reading in the third. Both columns are read from the two records the service returned, and
       every reading is asserted through the trigger that carries it, so a swap between the columns, a
       column that reports one record twice or a reading with no evidence route fails here. */
    const measures = await screen.findByRole('table', { name: OUTCOME_CARD_TEXT.caption });
    const outcome = screen.getByRole('region', { name: OUTCOME_CARD_TEXT.title });
    const measureRows = within(measures).getAllByRole('row').slice(1);

    expect(
      within(measures).getByRole('columnheader', { name: OUTCOME_CARD_TEXT.plannedHeader }),
    ).toBeInTheDocument();
    expect(
      within(measures).getByRole('columnheader', { name: OUTCOME_CARD_TEXT.resultingHeader }),
    ).toBeInTheDocument();
    expect(measureRows).toHaveLength(MEASURE_READINGS.length);

    MEASURE_READINGS.forEach((reading, index) => {
      const cells = within(nth(measureRows, index)).getAllByRole('cell');
      const planned = reading(APPROVAL_OUTCOME.planned);
      const resulting = reading(APPROVAL_OUTCOME.resulting);

      expect(cells).toHaveLength(3);
      /* The label column names the measure and carries no figure, so it holds no trigger. */
      expect(within(nth(cells, 0)).queryByRole('button')).toBeNull();
      expect(planned).not.toBe(resulting);
      expect(readingTriggerIn(nth(cells, 1), planned)).toBeInTheDocument();
      expect(readingTriggerIn(nth(cells, 2), resulting)).toBeInTheDocument();
    });

    /* The closing stock: one row per date, in the order the card joins the two series — the planned
       series' own order, then the dates only the resulting series reaches. Each row states both
       records' reading at that close, and a date one of them does not carry keeps its row with the
       absence caption in the column that does not reach it, never a substituted zero. */
    const stock = within(outcome).getByRole('table', { name: OUTCOME_CARD_TEXT.stockCaption });
    const stockRows = within(stock).getAllByRole('row').slice(1);
    const dates = joinedStockDates();
    const plannedCloses = closesOf(PLANNED_STOCK);
    const resultingCloses = closesOf(RESULTING_STOCK);

    /* The series is a block of its own on screen as well as in the accessibility tree: the panel
       around it prints the visible caption that `DataTable`'s own caption cannot, because that one is
       exposed to assistive technology only (rule B-3). */
    expect(within(outcome).getByText(OUTCOME_CARD_TEXT.stockTitle)).toBeVisible();
    expect(screen.getByRole('region', { name: OUTCOME_CARD_TEXT.stockTitle })).toContainElement(
      stock,
    );

    /* Both tables sit in the one card, under the one `Simulated calculation` label. */
    expect(outcome).toContainElement(measures);
    expect(outcome).toContainElement(stock);
    /* `getByText` fails when the card prints the label twice, so this is the card's single label. */
    expect(within(outcome).getByText(SIM_LABELS[1])).toBeInTheDocument();

    expect(
      within(stock).getByRole('columnheader', { name: OUTCOME_CARD_TEXT.dateHeader }),
    ).toBeInTheDocument();
    expect(stockRows).toHaveLength(dates.length);

    dates.forEach((date, index) => {
      const cells = within(nth(stockRows, index)).getAllByRole('cell');
      const planned = plannedCloses.get(date);
      const resulting = resultingCloses.get(date);

      expect(cells).toHaveLength(3);
      /* The date is the record's own value, printed as plain text rather than as a figure. */
      expect(nth(cells, 0).textContent).toBe(date);

      if (planned === undefined) {
        expect(nth(cells, 1).textContent).toBe(OUTCOME_CARD_TEXT.notApplicable);
      } else {
        expect(readingTriggerIn(nth(cells, 1), String(planned))).toBeInTheDocument();
      }

      if (resulting === undefined) {
        expect(nth(cells, 2).textContent).toBe(OUTCOME_CARD_TEXT.notApplicable);
      } else {
        expect(readingTriggerIn(nth(cells, 2), String(resulting))).toBeInTheDocument();
      }
    });
  });

  it('opens the evidence drawer from a reading, on the record the comparison is about', async () => {
    const user = userEvent.setup();
    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));

    renderDetail();
    await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

    const measures = await screen.findByRole('table', { name: OUTCOME_CARD_TEXT.caption });
    const firstRow = nth(within(measures).getAllByRole('row').slice(1), 0);
    const plannedCell = nth(within(firstRow).getAllByRole('cell'), 1);
    const planned = nth(MEASURE_READINGS, 0)(APPROVAL_OUTCOME.planned);

    await user.click(readingTriggerIn(plannedCell, planned));

    /* The drawer opens on the record the card's figures belong to, and the port is asked for the
       reference the payload carried rather than for one the card composed (rule P-6, AAP §0.2.1's
       F12): the approval's own identifier, which the evidence read resolves. */
    const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    expect(mockService.getEvidence).toHaveBeenCalledTimes(1);
    expect(mockService.getEvidence).toHaveBeenCalledWith(APPROVAL_OUTCOME.evidenceRef);
    expect(await within(drawer).findByText(OUTCOME_EVIDENCE.formula)).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it("opens the evidence drawer from a tracker step, on the step's own record", async () => {
    const user = userEvent.setup();
    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));

    renderDetail();
    await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

    const tracker = await screen.findByRole('region', {
      name: APPROVAL_DETAIL_TEXT.trackerSection,
    });
    const step = nth(within(tracker).getAllByRole('listitem'), 0);
    const writeBack = nth(WRITE_BACKS, 0);

    /* The control is the step's record reference, so the drawer a reader reaches from the tracker
       reports the step they were pointing at rather than the plan the steps belong to. */
    await user.click(readingTriggerIn(step, writeBack.recordRef));

    const drawer = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    /* The reference names this approval, which holds the steps, and the position the record states —
       the record the step belongs to and the step within it, which is the whole of what `WriteBack`
       gives a reference to address (principle PR-6). */
    expect(mockService.getEvidence).toHaveBeenCalledTimes(1);
    expect(mockService.getEvidence).toHaveBeenCalledWith(writeBackStepRef(APPROVAL_ID, writeBack));
    expect(await within(drawer).findByText(OUTCOME_EVIDENCE.formula)).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('states that the comparison is not shown yet when no resulting record arrives', async () => {
    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));
    mockService.getApprovalOutcome.mockRejectedValue(outcomeProblem());

    renderDetail();
    await screen.findByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection });

    const outcome = await screen.findByRole('region', {
      name: APPROVAL_DETAIL_TEXT.outcomeSection,
    });

    expect(await within(outcome).findByText(OUTCOME_UNAVAILABLE_MESSAGE)).toBeInTheDocument();
    /* No zero-valued row, no empty grid: the comparison is absent until a record supports it. */
    expect(within(outcome).queryByRole('table')).toBeNull();
    expect(within(outcome).queryByText(OUTCOME_CARD_TEXT.notApplicable)).toBeNull();
  });

  it('records the outcome review once and shows the record’s own reviewed state after the re-read', async () => {
    const user = userEvent.setup();

    /* The record moves only in the service: the first read carries no review, and every read after the
       review returns the record the write marked. Whatever the screen then shows of the review came
       from the second read, which is the assertion that the screen wrote nothing locally. */
    mockService.getApproval
      .mockResolvedValueOnce(ok(approvedApproval()))
      .mockResolvedValue(ok(reviewedApproval()));

    const review = await renderOutcomeReview();

    expect(within(review).getByText(APPROVAL_DETAIL_TEXT.notReviewed)).toBeInTheDocument();

    const control = controlNamed(APPROVAL_DETAIL_TEXT.reviewAction);

    /* The control can act, so it carries no refusal of its own to explain (rule P-8). */
    expect(control).not.toHaveAttribute('aria-disabled');
    expect(describedByText(control)).toBe('');

    await user.click(control);

    await waitFor(() => {
      expect(mockService.reviewApprovalOutcome).toHaveBeenCalledTimes(1);
    });
    expect(mockService.reviewApprovalOutcome).toHaveBeenCalledWith(APPROVAL_ID);

    /* The status row follows the record the re-read returned, and the same control now refuses a
       second review with the record's own sentence. */
    await waitFor(() => {
      expect(within(review).getByText(APPROVAL_DETAIL_TEXT.reviewed)).toBeInTheDocument();
    });
    expect(within(review).queryByText(APPROVAL_DETAIL_TEXT.notReviewed)).toBeNull();
    expect(describedByText(controlNamed(APPROVAL_DETAIL_TEXT.reviewAction))).toContain(
      APPROVAL_DETAIL_TEXT.alreadyReviewedReason,
    );
  });

  it('offers the review disabled with the record’s own sentence once the record carries it', async () => {
    mockService.getApproval.mockResolvedValue(ok(reviewedApproval()));

    const review = await renderOutcomeReview();
    const control = within(review).getByRole('button', { name: APPROVAL_DETAIL_TEXT.reviewAction });

    expect(within(review).getByText(APPROVAL_DETAIL_TEXT.reviewed)).toBeInTheDocument();
    expect(control).toHaveAttribute('aria-disabled', 'true');
    expect(describedByText(control)).toBe(APPROVAL_DETAIL_TEXT.alreadyReviewedReason);

    /* `aria-disabled` keeps the control focusable on purpose (rule B-3), so the refusal is asserted
       through the activation a reader's click delivers: the screen answers it and asks nothing of the
       port, because a review is recorded once. */
    fireEvent.click(control);

    await waitFor(() => {
      expect(mockService.reviewApprovalOutcome).not.toHaveBeenCalled();
    });
  });

  it('holds the review behind the record’s eligibility sentence ahead of the review it already carries', async () => {
    mockDemonstration.getActiveUser.mockResolvedValue(ok(actingUser(INELIGIBLE_ROLE)));
    mockService.getApproval.mockResolvedValue(ok(reviewedApproval()));

    const review = await renderOutcomeReview();
    const control = within(review).getByRole('button', { name: APPROVAL_DETAIL_TEXT.reviewAction });

    expect(control).toHaveAttribute('aria-disabled', 'true');

    const described = describedByText(control);

    /* Eligibility is the fact the handler refuses on first, so it is the sentence the control carries
       even where the record's own review state would block the write as well (rule P-8). */
    expect(described).toContain(APPROVAL_DETAIL_TEXT.actingRolePrefix);
    expect(described).toContain(APPROVER_ROLES.join(', '));
    expect(described).not.toContain(APPROVAL_DETAIL_TEXT.alreadyReviewedReason);

    fireEvent.click(control);

    await waitFor(() => {
      expect(mockService.reviewApprovalOutcome).not.toHaveBeenCalled();
    });
  });

  it.each(REVIEW_FAILURES)(
    'reports a refused review in $name, inside the review block',
    async ({ rejection, expected }) => {
      const user = userEvent.setup();

      mockService.getApproval.mockResolvedValue(ok(approvedApproval()));
      mockService.reviewApprovalOutcome.mockRejectedValue(rejection);

      const review = await renderOutcomeReview();

      await user.click(
        within(review).getByRole('button', { name: APPROVAL_DETAIL_TEXT.reviewAction }),
      );

      /* The refusal is reported where the control is, in the words the service used, so a reader does
         not lose the comparison they were reading to learn why the review was not recorded. */
      expect(await within(review).findByText(expected)).toBeInTheDocument();

      /* And nothing was written: the record the refusal left still carries no review, and the screen
         the reader was working in is still the screen they are on. */
      expect(within(review).getByText(APPROVAL_DETAIL_TEXT.notReviewed)).toBeInTheDocument();
      expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
    },
  );

  it('replaces the records with the forbidden card when the review is refused for permission', async () => {
    const user = userEvent.setup();

    mockService.getApproval.mockResolvedValue(ok(approvedApproval()));
    mockService.reviewApprovalOutcome.mockRejectedValue(permissionProblem());

    const review = await renderOutcomeReview();

    await user.click(
      within(review).getByRole('button', { name: APPROVAL_DETAIL_TEXT.reviewAction }),
    );

    /* A permission refusal means the acting role may not act on this plan, so the card naming the
       permission, the roles that hold it and the call's correlation identifier replaces the content
       rather than sitting beside a control that cannot work — as a refused decision does. */
    expect(
      await screen.findByRole('heading', { name: new RegExp(DECISION_PERMISSION) }),
    ).toBeInTheDocument();
    expect(screen.getByText(REFUSAL_TRACE_ID)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.reviewSection })).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * A decision that fails at its write-back — AAP §0.2.2, rule P-8
 * ------------------------------------------------------------------------------------------- */

describe('a decision that fails at its write-back', () => {
  it('leaves the failure, the failed step and its retry on the screen the decision was taken on', async () => {
    mockService.decideApproval.mockRejectedValue(writeBackProblem());
    /* The adapter set the record's status, recorded the decision and marked the step that failed before
       it threw, so the next read returns the approved record rather than the pending one. */
    mockService.getApproval
      .mockResolvedValueOnce(ok(pendingApproval()))
      .mockResolvedValue(ok(interruptedApproval()));

    const session = userEvent.setup();
    await renderPendingDetail();

    await giveComment(session, 'plan accepted');
    await acknowledgeEverySideEffect(session);
    await session.click(controlNamed(APPROVAL_DETAIL_TEXT.approve));

    /* The failure is reported in the service's own words, in the status region the decision block owns. */
    expect(await screen.findByText(WRITE_BACK_FAILURE_MESSAGE)).toBeInTheDocument();

    /* And the record the refusal left behind is on the same screen: nothing here navigates away, which
       is what makes the failed step and the one control that retries it reachable. */
    const tracker = await screen.findByRole('region', {
      name: APPROVAL_DETAIL_TEXT.trackerSection,
    });
    const steps = within(tracker).getAllByRole('listitem');

    expect(steps).toHaveLength(WRITE_BACKS.length);

    const failedSteps = steps.filter((step) => (step.textContent ?? '').includes(FAILED_STATE));

    expect(failedSteps).toHaveLength(1);
    expect(within(nth(failedSteps, 0)).getByText(WRITE_BACK_TAG)).toBeInTheDocument();

    /* One retry, on the one step that failed: a step the run never reached offers none, and a step that
       succeeded is never offered for writing again (AAP §0.2.2). */
    expect(within(tracker).getAllByRole('button', { name: /^Retry write-back / })).toHaveLength(1);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The seven states — platform-specification.md §8, T-17
 * ------------------------------------------------------------------------------------------- */

/** The sentence the fixture's validation refusal states, in the service's own words. */
const CONFLICT_MESSAGE = 'This approval changed while you were reading it.';

/** The failure the port reports when the record moved under the reader. */
function conflictProblem(): Problem {
  return { type: 'validation', message: CONFLICT_MESSAGE, traceId: REFUSAL_TRACE_ID };
}

/**
 * The identifier the fixture's not-found refusal answers no record for: an opaque placeholder, as the
 * file header requires, so no literal shaped like a domain record identifier is typed here.
 */
const UNKNOWN_APPROVAL_ID = 'record-under-test';

/** The sentence the port reports when the records hold no approval the identifier names. */
const NOT_FOUND_MESSAGE = `No approval record answers ${UNKNOWN_APPROVAL_ID}.`;

/** The failure the port reports when no record answers the identifier the route named. */
function notFoundProblem(): Problem {
  return { type: 'not-found', message: NOT_FOUND_MESSAGE, traceId: REFUSAL_TRACE_ID };
}

describe('T-17 the seven states', () => {
  it('T-17 renders the loading state in place of the content', async () => {
    mockService.getApproval.mockReturnValue(new Promise<Result<Approval>>(() => {}));

    renderDetail();

    const loading = await screen.findByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(loading).toHaveAttribute('aria-busy', 'true');
    expect(loading).toHaveTextContent(STATE_BOUNDARY_TEXT.loading);
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
  });

  it('T-17 renders the not-found panel for a route that named no approval', async () => {
    renderDetail(null);

    expect(
      await screen.findByRole('heading', { level: 1, name: APPROVAL_DETAIL_TEXT.notFoundTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(APPROVAL_DETAIL_TEXT.noIdentifier)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    /* A misaddressed route reads nothing rather than asking the service for an empty identifier. */
    expect(mockService.getApproval).not.toHaveBeenCalled();
  });

  it('T-17 names the record a not-found refusal answers nothing for', async () => {
    mockService.getApproval.mockRejectedValue(notFoundProblem());

    renderDetail(UNKNOWN_APPROVAL_ID);

    expect(
      await screen.findByRole('heading', { level: 1, name: APPROVAL_DETAIL_TEXT.notFoundTitle }),
    ).toBeInTheDocument();
    /* The refusal the service wrote is printed as it wrote it, so the identifier the address named is
       on screen rather than replaced by a sentence claiming no approval was named at all. */
    expect(screen.getByText(NOT_FOUND_MESSAGE)).toHaveTextContent(UNKNOWN_APPROVAL_ID);
    expect(screen.getByRole('link', { name: APPROVAL_DETAIL_TEXT.backToInbox })).toHaveAttribute(
      'href',
      APPROVALS_ROUTE,
    );
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    /* Nothing is read for a record no identifier answers: the plan's option and the exception behind
       it are only reached once the approval itself has been read. */
    expect(mockService.getScenarioSet).not.toHaveBeenCalled();
    expect(mockService.getExceptionDetail).not.toHaveBeenCalled();
  });

  it('T-17 keeps the records under the stale banner', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('stale', STALE_AS_OF)),
    );

    await renderPendingDetail();

    expect(
      screen.getByText(`${GATE_LABEL}${STATE_BOUNDARY_TEXT.staleSuffix}`),
    ).toBeInTheDocument();
    /* A figure that is out of date is still the figure a planner came to read. */
    expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
  });

  it('T-17 keeps the records under the partial notice', async () => {
    mockService.getApproval.mockResolvedValue(ok(pendingApproval(), freshnessOf('partial', AS_OF)));

    await renderPendingDetail();

    expect(screen.getByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeInTheDocument();
    expect(screen.getByText(APPROVAL_DETAIL_TEXT.partial)).toBeInTheDocument();
    expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
  });

  it('T-17 replaces the records with the offline notice and its retry', async () => {
    mockService.getApproval.mockResolvedValue(
      ok(pendingApproval(), freshnessOf('unavailable', STALE_AS_OF)),
    );

    renderDetail();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeInTheDocument();
    /* Nothing answered for the content, so the record the call did return is not shown as though
       the sources behind it had reported. */
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    expect(controlNamed(STATE_BOUNDARY_TEXT.retryLabel)).toBeInTheDocument();
  });

  it('T-17 replaces the records with the forbidden card', async () => {
    mockService.getApproval.mockRejectedValue(permissionProblem());

    renderDetail();

    expect(
      await screen.findByRole('heading', { name: new RegExp(DECISION_PERMISSION) }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
    expect(screen.getByText(REFUSAL_TRACE_ID)).toBeInTheDocument();
  });

  it('T-17 replaces the records with the conflict notice and its reload', async () => {
    mockService.getApproval.mockRejectedValue(conflictProblem());

    renderDetail();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.conflictHeadline)).toBeInTheDocument();
    expect(screen.getByText(CONFLICT_MESSAGE)).toBeInTheDocument();
    expect(controlNamed(STATE_BOUNDARY_TEXT.reloadLabel)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: APPROVAL_DETAIL_TEXT.planSection })).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * Accessibility and both themes — rule B-3, T-16
 * ------------------------------------------------------------------------------------------- */

describe('T-16 the accessibility contract', () => {
  it('T-16 renders exactly one level-one heading', async () => {
    await renderPendingDetail();

    const headings = screen.getAllByRole('heading', { level: 1 });

    expect(headings).toHaveLength(1);
    expect(nth(headings, 0)).toHaveTextContent(APPROVAL_DETAIL_TEXT.title);
  });

  it('T-16 reaches all three decisions with Tab alone', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const decisions = [
      controlNamed(APPROVAL_DETAIL_TEXT.approve),
      controlNamed(APPROVAL_DETAIL_TEXT.reject),
      controlNamed(APPROVAL_DETAIL_TEXT.requestChanges),
    ];
    const visited: HTMLElement[] = [];

    for (let step = 0; step < FOCUS_LIMIT; step += 1) {
      await user.tab();

      if (document.activeElement instanceof HTMLElement) {
        visited.push(document.activeElement);
      }
    }

    for (const decision of decisions) {
      expect(visited).toContain(decision);
    }
  });

  it('T-16 operates a decision with Enter and Space alone', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    await giveComment(user, 'plan accepted');

    const reject = controlNamed(APPROVAL_DETAIL_TEXT.reject);

    expect(await tabTo(user, reject)).toBe(true);
    await user.keyboard(' ');

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(1);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(1, APPROVAL_ID, {
      action: 'reject',
      comment: 'plan accepted',
    });

    /* The recorded decision cleared the comment, so the reader supplies it again before the second
       decision can be taken — which is also the proof that the control re-enabled honestly. */
    await giveComment(user, 'plan accepted');
    const requestChanges = controlNamed(APPROVAL_DETAIL_TEXT.requestChanges);

    expect(await tabTo(user, requestChanges)).toBe(true);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockService.decideApproval).toHaveBeenCalledTimes(2);
    });
    expect(mockService.decideApproval).toHaveBeenNthCalledWith(2, APPROVAL_ID, {
      action: 'request-changes',
      comment: 'plan accepted',
    });
  });

  it('T-16 labels the comment field and carries the acknowledgement state on the control', async () => {
    const user = userEvent.setup();
    await renderPendingDetail();

    const field = commentField();

    expect(field.tagName).toBe('TEXTAREA');
    expect(field).toHaveAccessibleName(APPROVAL_DETAIL_TEXT.commentLabel);
    expect(field).toHaveAttribute('aria-required', 'true');

    const toggle = nth(acknowledgementsFor(PLANT_ID), 0);

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('T-16 renders the same structure and labels in both themes', async () => {
    for (const theme of ['command', 'paper'] as const) {
      document.documentElement.dataset['theme'] = theme;

      await renderPendingDetail();

      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
      expect(regionNamed(APPROVAL_DETAIL_TEXT.planSection)).toBeInTheDocument();
      expect(controlNamed(APPROVAL_DETAIL_TEXT.approve)).toHaveAttribute('aria-disabled', 'true');
      expect(
        within(regionNamed(APPROVAL_DETAIL_TEXT.costSection)).getByText(amountText(ADDED_COST)),
      ).toBeInTheDocument();

      cleanup();
    }
  });
});
