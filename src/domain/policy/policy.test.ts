// @vitest-environment node

/**
 * Unit suite for `permissions.ts` and `evaluate.ts`: who may act on a record, and which rule refuses
 * an action.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §7.1 fixes the permission matrix, its plant scoping and the role list a
 *   permission failure reports; §7.2 fixes the five policies, which of them is evaluated, and which
 *   one is declared configuration only.
 * - AAP 0.12.1 fixes both modules' public interfaces and the treatment of each rule: POL-001,
 *   POL-003, POL-005 and POL-007 are evaluated, POL-009 reaches `notApplicable` by design.
 * - AAP 0.2.1 fixes the two named absences — a platform administrator never opens a
 *   customer-confidential body and an external supplier engineer never reaches another vendor's
 *   material — of which the first is a matrix cell asserted below. AAP 0.12.3 fixes the atlas as
 *   forbidden for the external supplier engineer, and AAP 0.12.4 fixes `exception.read` for the four
 *   personas whose home route is the canvas.
 * - AAP 0.7 and AAP 0.13.1 place the suite beside its subject; AAP 0.15.1 lists it as a
 *   High-priority row.
 *
 * What it proves: the matrix for every role and every permission, the plant scope in both
 * directions, the holder list `rolesWith` returns for every permission, the allow and the deny path
 * of every evaluated rule, POL-009's `notApplicable`, and the invariants every decision keeps — a
 * defined outcome, a rule and a non-empty reason on each denial, no denial attributed to the declared
 * policy, and determinism.
 *
 * What it does not assert: no presentation, no rounding, no formatting and no business figure. Every
 * record below is built here from typed local values (rule P-6), never read from a record module and
 * never from the mock adapter (rule P-2), so this suite depends on nothing but the two modules it
 * proves.
 * The two euro members `Approval` requires are read by no rule here, so they carry a neutral zero
 * rather than a figure the inputs do not fix.
 *
 * Node environment: both modules are pure functions of their arguments, with no DOM, no clock, no
 * random source, no I/O and no mutable module state (AAP 0.3.1, AAP 0.18.2). This suite reads no
 * ambient state, so a hidden cache or a module-level mutable value surfaces as a determinism failure.
 */

import { describe, expect, it } from 'vitest';

import type {
  ActiveUser,
  Approval,
  ApprovalId,
  ConstraintCheck,
  ModelCatalogue,
  ModelEntry,
  Permission,
  PlantId,
  PolicyDecision,
  PolicyId,
  Role,
  ScenarioId,
  UserId,
} from '../../types';
import { PERMISSIONS } from '../../types';

import {
  evaluate,
  type AssistantQueryContext,
  type PolicyAction,
  type PolicyRecords,
} from './evaluate';
import { hasPermission, plantScopeFor, rolesWith, type ScopedSubject } from './permissions';

/* ---------------------------------------------------------------------------------------------
 * The personas, the plants and the permissions — AAP 0.2.3, AAP 0.12.2, contracts §7.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The eight personas of AAP 0.2.3, in `USR-01` to `USR-08` order.
 *
 * Written out rather than derived from a table, so a role added to the domain without a line here is
 * a compile error at `PERSONA_IDS` below rather than a persona this suite silently stops covering.
 */
const ROLES: readonly Role[] = [
  'material-planner',
  'plant-manager',
  'head-of-supply-chain',
  'platform-administrator',
  'production-planner',
  'auditor',
  'supplier-quality-engineer',
  'external-supplier-engineer',
];

/** The identifier of each persona, from the same table, in the same order. */
const PERSONA_IDS: Readonly<Record<Role, UserId>> = {
  'material-planner': 'USR-01',
  'plant-manager': 'USR-02',
  'head-of-supply-chain': 'USR-03',
  'platform-administrator': 'USR-04',
  'production-planner': 'USR-05',
  auditor: 'USR-06',
  'supplier-quality-engineer': 'USR-07',
  'external-supplier-engineer': 'USR-08',
};

/** The four plants of the demonstration, in the order the `Scope` row of AAP 0.12.2 lists them. */
const PLANTS: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'];

/** Every permission of the contracts §7.1 matrix, taken from the shared table rather than retyped. */
const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

/**
 * The four rules the engine evaluates. A denial in this suite must name one of them, and POL-009 —
 * declared configuration the engine never evaluates (rule P-4) — is deliberately absent.
 */
const EVALUATED_RULES: readonly PolicyId[] = ['POL-001', 'POL-003', 'POL-005', 'POL-007'];

/**
 * The product name rule P-7 bars, assembled from two fragments.
 *
 * Kept assembled so this file never carries the barred string itself: the source scans that enforce
 * rule P-7 reject it in the sources they read, and this file is inside one of those trees. The
 * assertion that uses it still checks what rule P-7 requires — that no reason the engine writes
 * names that product.
 */
const BARRED_PRODUCT_NAME = ['Plumb', 'line'].join('');

/* ---------------------------------------------------------------------------------------------
 * The typed values the cases hand to the two modules
 * ------------------------------------------------------------------------------------------- */

/**
 * The acting persona for a role, in the state the mock adapter holds one.
 *
 * `plantIds` and `permissions` are derived from the module under test on purpose: the adapter fills
 * both from the same matrix, so a persona built another way would be a second opinion about the
 * same fact. `permissions` is filled in a second step because the derivation is itself the query
 * under test, and `hasPermission` never reads the member back — a persona whose list disagreed with
 * the matrix could therefore not change an answer.
 *
 * Passing `plantIds` overrides the role's own scope, which is how the narrowing case below gives a
 * cross-plant role a persona confined to one plant.
 *
 * @param role The persona's role.
 * @param plantIds The persona's plant scope; the role's own scope by default.
 * @returns The persona record.
 */
function actorFor(role: Role, plantIds: readonly PlantId[] = plantScopeFor(role)): ActiveUser {
  const persona: ActiveUser = {
    id: PERSONA_IDS[role],
    name: `Synthetic ${role} persona`,
    role,
    plantIds: [...plantIds],
    permissions: [],
    homeRoute: '/canvas',
  };

  return {
    ...persona,
    permissions: ALL_PERMISSIONS.filter((permission) =>
      hasPermission(role, permission, null, persona),
    ),
  };
}

/**
 * A record the matrix can scope by plant — the only member it reads.
 *
 * @param plantId The plant the record belongs to.
 * @returns The scoped subject.
 */
function subjectAt(plantId: PlantId): ScopedSubject {
  return { plantId };
}

/**
 * An approval raised by one persona, in the pending state POL-003 reads.
 *
 * @param requestedBy The persona who requested it.
 * @param id The approval's identifier.
 * @returns The approval record.
 */
function approvalRequestedBy(requestedBy: UserId, id: ApprovalId): Approval {
  return {
    id,
    exceptionId: 'EXC-2026-1184',
    scenarioId: 'SCN-1184-C',
    requestedBy,
    eligibleApproverRoles: rolesWith('approval.decide'),
    status: 'pending',
    // Neither euro member is read by POL-003, so both carry a neutral zero rather than a figure no
    // input fixes for this case (rule P-6).
    addedCostEur: 0,
    protectedRevenueEur: 0,
    writeBacks: [],
    outcomeReviewed: false,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The model catalogue POL-007 reads — contracts §3, AAP 0.6.3
 * ------------------------------------------------------------------------------------------- */

/** The in-boundary model: the entry the catalogue selects first and the alternative a denial names. */
const IN_BOUNDARY_ENTRY: ModelEntry = {
  id: 'MDL-LOCAL-L v3',
  label: 'MDL-LOCAL-L v3',
  version: 'v3',
  boundary: 'in-boundary',
};

/** The external reasoning model, the one the two model rules can block. */
const EXTERNAL_ENTRY: ModelEntry = {
  id: 'EXT-REASONING-01',
  label: 'EXT-REASONING-01',
  version: '01',
  boundary: 'external',
};

/** A second external entry, so a catalogue can be built that declares no in-boundary model at all. */
const SECOND_EXTERNAL_ENTRY: ModelEntry = {
  id: 'MDL-EXTRACT v2',
  label: 'MDL-EXTRACT v2',
  version: 'v2',
  boundary: 'external',
};

/**
 * A catalogue over the entries a case supplies.
 *
 * @param models The entries the catalogue holds.
 * @param defaultModelId The entry selected before the user chooses.
 * @returns The catalogue.
 */
function catalogueOf(models: readonly ModelEntry[], defaultModelId: string): ModelCatalogue {
  return { models: [...models], defaultModelId };
}

/** The catalogue the cases share: the in-boundary model selected by default, the external one beside it. */
const DEFAULT_CATALOGUE: ModelCatalogue = catalogueOf(
  [IN_BOUNDARY_ENTRY, EXTERNAL_ENTRY],
  IN_BOUNDARY_ENTRY.id,
);

/**
 * The records a case starts from: the empty outbound allowed list the demonstration declares, no
 * approval and the shared catalogue.
 *
 * A case that needs another record spreads this value, so no case restates a record it does not read.
 */
const BASE_RECORDS: PolicyRecords = {
  outboundAllowedList: [],
  approvals: [],
  modelCatalogue: DEFAULT_CATALOGUE,
};

/* ---------------------------------------------------------------------------------------------
 * The material context a question carries — contracts §3, AAP 0.12.4
 * ------------------------------------------------------------------------------------------- */

/** A context carrying nothing that either model rule blocks. */
const NEUTRAL_CONTEXT: AssistantQueryContext = { classification: null, residency: null };

/** A context carrying material classified customer-confidential, one of the conditions POL-007 reads. */
const CONFIDENTIAL_CONTEXT: AssistantQueryContext = {
  classification: 'customer-confidential',
  residency: null,
};

/** A context carrying material whose residency is eu-only, the other condition POL-007 reads. */
const EU_ONLY_CONTEXT: AssistantQueryContext = { classification: null, residency: 'eu-only' };

/** A context carrying both conditions, which POL-007 denies once, as the one context it is. */
const CONFIDENTIAL_AND_EU_ONLY_CONTEXT: AssistantQueryContext = {
  classification: 'customer-confidential',
  residency: 'eu-only',
};

/** The blocking contexts the in-boundary case iterates, each named for the failure it would produce. */
const BLOCKING_CONTEXTS: Array<[label: string, context: AssistantQueryContext]> = [
  ['customer-confidential material', CONFIDENTIAL_CONTEXT],
  ['eu-only material', EU_ONLY_CONTEXT],
  ['both conditions at once', CONFIDENTIAL_AND_EU_ONLY_CONTEXT],
];

/* ---------------------------------------------------------------------------------------------
 * The endpoints and the approval the rule cases use — AAP 0.6.3, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/** An endpoint the empty outbound allowed list refuses. */
const UNDECLARED_ENDPOINT = 'api.external-llm.example';

/** A different endpoint, used where a case has to show that a non-empty list still refuses it. */
const DECLARED_ENDPOINT = 'public-risk-feed.example';

/** The approval the POL-003 cases decide. */
const APPROVAL_ID = 'APR-2026-101';

/** The persona who requested `APPROVAL_ID`, and therefore may not decide it. */
const APPROVAL_REQUESTER = PERSONA_IDS['material-planner'];

/**
 * The response option the approval-request cases put forward — the seeded option the plans recommend.
 *
 * Only its identifier and its own check matter to POL-005, so no measure of the option is restated
 * here and no figure of it is compared (rule P-6).
 */
const REQUESTED_OPTION_ID: ScenarioId = 'SCN-1184-C';

/**
 * The breach a failed constraint check reports, in the plain words the solver returns rather than a
 * quantity this suite invents: POL-005 quotes the message it is handed and computes nothing.
 */
const CONSTRAINT_BREACH = 'The transfer quantity is above the maximum the transfer lever allows.';

/* ---------------------------------------------------------------------------------------------
 * Helpers over a decision
 * ------------------------------------------------------------------------------------------- */

/**
 * The trimmed length of a decision's reason, or zero when it carries none.
 *
 * The reason is optional on `PolicyDecision`, so this reads it once instead of widening every
 * assertion that has to prove a denial explains itself (rules B-3, P-8).
 *
 * @param decision The decision to read.
 * @returns The length of the reason, ignoring surrounding whitespace.
 */
function reasonLength(decision: PolicyDecision): number {
  return (decision.reason ?? '').trim().length;
}

/**
 * An assistant question naming a model and the material it carries.
 *
 * @param modelId The model the question would be sent to.
 * @param context The material context the question carries.
 * @returns The action to evaluate.
 */
function assistantQuery(modelId: string, context: AssistantQueryContext): PolicyAction {
  return { action: 'assistant.query', modelId, context };
}

/**
 * A request to send one response option for approval.
 *
 * @param constraintCheck The option's own constraint check, as the solver reported it.
 * @param constraintMessages The breach messages that check reported, empty when it reported none.
 * @returns The action to evaluate.
 */
function approvalRequest(
  constraintCheck: ConstraintCheck,
  constraintMessages: readonly string[],
): PolicyAction {
  return {
    action: 'approval.request',
    scenarioId: REQUESTED_OPTION_ID,
    constraintCheck,
    constraintMessages,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The matrix cells the inputs name, and the samples the invariant sweep evaluates
 * ------------------------------------------------------------------------------------------- */

/**
 * Cells a fixing input grants, so a change to the table that silently withholds one fails here.
 *
 * The input behind each one: the plant manager's `approval.decide` is the persona's home route and
 * the request-then-decide journey (AAP 0.2.3, 0.12.4); the auditor's `audit.read` is its home route
 * `/audit`; the platform administrator's `sovereignty.read` and `admin.read` are its home route
 * `/admin/sovereignty` and the exception it grants (SCR-07); and `exception.read` for the material
 * planner, the head of supply chain, the production planner and the supplier quality engineer is what
 * lets those four personas reach the queue from the canvas (AAP 0.12.4).
 */
const HELD_CELLS: Array<[role: Role, permission: Permission]> = [
  ['plant-manager', 'approval.decide'],
  ['auditor', 'audit.read'],
  ['platform-administrator', 'sovereignty.read'],
  ['platform-administrator', 'admin.read'],
  ['material-planner', 'exception.read'],
  ['head-of-supply-chain', 'exception.read'],
  ['production-planner', 'exception.read'],
  ['supplier-quality-engineer', 'exception.read'],
];

/**
 * Cells the inputs withhold, and the reason each one matters.
 *
 * The platform administrator does not read a customer-confidential document body, which the mock
 * adapter redacts inside the service rather than leaving to a screen (AAP 0.2.1); the external
 * supplier engineer does not reach the atlas (AAP 0.12.3).
 */
const WITHHELD_CELLS: Array<[role: Role, permission: Permission]> = [
  ['platform-administrator', 'document.confidential.read'],
  ['external-supplier-engineer', 'competitive.read'],
];

/** One undecided question put to the engine, with the records and persona it needs. */
interface ActionSample {
  /** What the sample asks, named in every failure message it produces. */
  readonly label: string;

  /** The action to evaluate. */
  readonly action: PolicyAction;

  /** The persona acting. */
  readonly actor: ActiveUser;

  /** The records the governing rules read. */
  readonly records: PolicyRecords;
}

/** The records the approval samples read: one approval, requested by the material planner. */
const APPROVAL_RECORDS: PolicyRecords = {
  ...BASE_RECORDS,
  approvals: [approvalRequestedBy(APPROVAL_REQUESTER, APPROVAL_ID)],
};

/** The records a case reads when the declared allowed list carries one endpoint. */
const ALLOW_LIST_RECORDS: PolicyRecords = {
  ...BASE_RECORDS,
  outboundAllowedList: [DECLARED_ENDPOINT],
};

/**
 * One sample of every family the engine answers — the allow, the deny and the not-applicable
 * variants the rules can reach — evaluated once by the invariant and determinism cases below.
 *
 * Each sample carries its own records and persona because the families read different records and
 * POL-003 turns on who is acting.
 */
const ACTION_SAMPLES: readonly ActionSample[] = [
  {
    label: 'an endpoint the declared allowed list omits',
    action: { action: 'outbound-endpoint', endpoint: UNDECLARED_ENDPOINT },
    actor: actorFor('head-of-supply-chain'),
    records: BASE_RECORDS,
  },
  {
    label: 'an endpoint the declared allowed list carries',
    action: { action: 'outbound-endpoint', endpoint: DECLARED_ENDPOINT },
    actor: actorFor('head-of-supply-chain'),
    records: ALLOW_LIST_RECORDS,
  },
  {
    label: 'an approval decided by the persona who requested it',
    action: { action: 'approval.decide', approvalId: APPROVAL_ID },
    actor: actorFor('material-planner'),
    records: APPROVAL_RECORDS,
  },
  {
    label: 'an approval decided by another persona',
    action: { action: 'approval.decide', approvalId: APPROVAL_ID },
    actor: actorFor('plant-manager'),
    records: APPROVAL_RECORDS,
  },
  {
    label: 'an approval the records do not hold',
    action: { action: 'approval.decide', approvalId: 'APR-2026-999' },
    actor: actorFor('plant-manager'),
    records: APPROVAL_RECORDS,
  },
  {
    label: 'an approval request for an option whose constraint check passes',
    action: approvalRequest('pass', []),
    actor: actorFor('material-planner'),
    records: BASE_RECORDS,
  },
  {
    label: 'an approval request for an option whose constraint check fails',
    action: approvalRequest('fail', [CONSTRAINT_BREACH]),
    actor: actorFor('material-planner'),
    records: BASE_RECORDS,
  },
  {
    label: 'a question carrying customer-confidential material sent to the external model',
    action: assistantQuery(EXTERNAL_ENTRY.id, CONFIDENTIAL_CONTEXT),
    actor: actorFor('plant-manager'),
    records: BASE_RECORDS,
  },
  {
    label: 'a question carrying eu-only material sent to the external model',
    action: assistantQuery(EXTERNAL_ENTRY.id, EU_ONLY_CONTEXT),
    actor: actorFor('plant-manager'),
    records: BASE_RECORDS,
  },
  {
    label: 'a question carrying neither blocking condition sent to the external model',
    action: assistantQuery(EXTERNAL_ENTRY.id, NEUTRAL_CONTEXT),
    actor: actorFor('plant-manager'),
    records: BASE_RECORDS,
  },
  {
    label: 'a question carrying both blocking conditions sent to the in-boundary model',
    action: assistantQuery(IN_BOUNDARY_ENTRY.id, CONFIDENTIAL_AND_EU_ONLY_CONTEXT),
    actor: actorFor('plant-manager'),
    records: BASE_RECORDS,
  },
  {
    label: 'a question sent to a model the catalogue does not hold',
    action: assistantQuery('EXT-REASONING-02', NEUTRAL_CONTEXT),
    actor: actorFor('plant-manager'),
    records: BASE_RECORDS,
  },
  {
    label: 'a lookup of the declared policy',
    action: { action: 'policy-lookup', policyId: 'POL-009' },
    actor: actorFor('platform-administrator'),
    records: BASE_RECORDS,
  },
];

/** One sample's decision, kept beside the label it was evaluated from. */
interface LabelledDecision {
  /** The sample's label, repeated in every failure message. */
  readonly label: string;

  /** What the engine decided for it. */
  readonly decision: PolicyDecision;
}

/**
 * Evaluates every sample once, so a case can assert an invariant over the whole set.
 *
 * @returns One decision per sample, in sample order.
 */
function decisionsOfSamples(): LabelledDecision[] {
  return ACTION_SAMPLES.map((sample) => ({
    label: sample.label,
    decision: evaluate(sample.action, sample.actor, sample.records),
  }));
}

/* ---------------------------------------------------------------------------------------------
 * A. The matrix, B. The plant scope, C. The holder list — contracts §7.1
 * ------------------------------------------------------------------------------------------- */

describe('permissions', () => {
  it('answers all 112 role and permission pairs with a boolean', () => {
    let pairs = 0;

    for (const role of ROLES) {
      const actor = actorFor(role);

      for (const permission of ALL_PERMISSIONS) {
        // A throw here fails the case: the matrix is total over both tables and reaches for no
        // record it was not given.
        expect(typeof hasPermission(role, permission, null, actor)).toBe('boolean');
        pairs += 1;
      }
    }

    // Eight personas x fourteen permissions are the 112 cells of contracts §7.1. A role or a
    // permission added to the shared tables raises this count, so the suite reports the wider matrix
    // rather than quietly evaluating cells no input describes.
    expect(pairs).toBe(112);
  });

  it.each(HELD_CELLS)('grants %s the %s permission', (role, permission) => {
    expect(hasPermission(role, permission, null, actorFor(role))).toBe(true);
  });

  it.each(WITHHELD_CELLS)('%s does not hold %s', (role, permission) => {
    expect(hasPermission(role, permission, null, actorFor(role))).toBe(false);
  });

  it('withholds a permission the role does not hold even where the plant scope covers the subject', () => {
    // PLT-BRN is inside both personas' plant scope, so only the role's own permission list can refuse
    // these two calls: least privilege is applied before scope, not after it.
    expect(
      hasPermission(
        'external-supplier-engineer',
        'competitive.read',
        subjectAt('PLT-BRN'),
        actorFor('external-supplier-engineer'),
      ),
    ).toBe(false);
    expect(
      hasPermission('plant-manager', 'admin.read', subjectAt('PLT-BRN'), actorFor('plant-manager')),
    ).toBe(false);
  });

  it.each([...ROLES])('scopes %s to a non-empty set of the four plants', (role) => {
    const scope = plantScopeFor(role);

    expect(scope.length).toBeGreaterThan(0);

    for (const plantId of scope) {
      expect(PLANTS).toContain(plantId);
    }
  });

  it('denies a single-plant role on another plant and allows it on its own', () => {
    const plantManager = actorFor('plant-manager');

    expect(
      hasPermission('plant-manager', 'exception.read', subjectAt('PLT-RGB'), plantManager),
    ).toBe(false);
    expect(
      hasPermission('plant-manager', 'exception.read', subjectAt('PLT-BRN'), plantManager),
    ).toBe(true);
  });

  it.each([...PLANTS])('allows a cross-plant role on a %s subject', (plantId) => {
    expect(
      hasPermission(
        'head-of-supply-chain',
        'exception.read',
        subjectAt(plantId),
        actorFor('head-of-supply-chain'),
      ),
    ).toBe(true);
  });

  it('returns a fresh array each call, so a caller cannot reach the table behind it', () => {
    const firstCall = plantScopeFor('plant-manager');
    const asDeclared = [...firstCall];

    firstCall.push('PLT-RAK');

    expect(firstCall).not.toEqual(asDeclared);
    expect(plantScopeFor('plant-manager')).toEqual(asDeclared);
  });

  it("narrows a cross-plant role by the acting persona's own plant scope", () => {
    const narrowed = actorFor('head-of-supply-chain', ['PLT-RGB']);

    expect(
      hasPermission('head-of-supply-chain', 'exception.read', subjectAt('PLT-RGB'), narrowed),
    ).toBe(true);
    expect(
      hasPermission('head-of-supply-chain', 'exception.read', subjectAt('PLT-BRN'), narrowed),
    ).toBe(false);
  });

  it('narrows nothing when the acting persona declares no plant scope of its own', () => {
    const unscoped = actorFor('head-of-supply-chain', []);

    for (const plantId of PLANTS) {
      expect(
        hasPermission('head-of-supply-chain', 'exception.read', subjectAt(plantId), unscoped),
      ).toBe(true);
    }
  });

  it.each([...ALL_PERMISSIONS])('names exactly the roles that hold %s', (permission) => {
    const holders = rolesWith(permission);

    // Rule P-8: the list is what a disabled control's explanation names, so it is never empty.
    expect(holders.length).toBeGreaterThan(0);

    // Both directions at once: every holder holds it, and every role left out does not.
    for (const role of ROLES) {
      expect(holders.includes(role)).toBe(hasPermission(role, permission, null, actorFor(role)));
    }
  });

  it('lists the holders of every permission in persona order on every call', () => {
    for (const permission of ALL_PERMISSIONS) {
      const holders = rolesWith(permission);

      expect(rolesWith(permission)).toEqual(holders);
      expect(holders).toEqual(ROLES.filter((role) => holders.includes(role)));
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * POL-001 — outbound egress — contracts §7.2, AAP 0.6.3 and 0.10
 * ------------------------------------------------------------------------------------------- */

describe('POL-001', () => {
  const actor = actorFor('head-of-supply-chain');

  it('denies an endpoint the declared allowed list omits', () => {
    const decision = evaluate(
      { action: 'outbound-endpoint', endpoint: UNDECLARED_ENDPOINT },
      actor,
      BASE_RECORDS,
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-001');
    expect(reasonLength(decision)).toBeGreaterThan(0);
    // The reason names the endpoint, so a ledger row or a tooltip says which request was refused.
    expect(decision.reason).toContain(UNDECLARED_ENDPOINT);
    expect('permittedAlternative' in decision).toBe(false);
  });

  it('allows an endpoint the declared allowed list carries', () => {
    const records: PolicyRecords = {
      ...BASE_RECORDS,
      outboundAllowedList: [UNDECLARED_ENDPOINT],
    };

    const decision = evaluate(
      { action: 'outbound-endpoint', endpoint: UNDECLARED_ENDPOINT },
      actor,
      records,
    );

    expect(decision.outcome).toBe('allow');
    expect(decision.policyId).toBe('POL-001');
  });

  it('denies an endpoint a non-empty allowed list still omits', () => {
    // Membership of the list decides the answer, not whether the list holds anything at all.
    const decision = evaluate(
      { action: 'outbound-endpoint', endpoint: UNDECLARED_ENDPOINT },
      actor,
      ALLOW_LIST_RECORDS,
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-001');
  });
});

/* ---------------------------------------------------------------------------------------------
 * POL-003 — segregation of duties — contracts §7.2, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

describe('POL-003', () => {
  it('denies the requester deciding its own approval', () => {
    const decision = evaluate(
      { action: 'approval.decide', approvalId: APPROVAL_ID },
      actorFor('material-planner'),
      APPROVAL_RECORDS,
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-003');
    expect(reasonLength(decision)).toBeGreaterThan(0);
    // The reason names the approval, so the disabled control explains itself (rules B-3, P-8).
    expect(decision.reason).toContain(APPROVAL_ID);
    // This rule permits no alternative: only another persona may decide, and none is named here.
    expect('permittedAlternative' in decision).toBe(false);
    expect(decision.permittedAlternative).toBeUndefined();
  });

  it('allows another persona to decide the same approval', () => {
    const decision = evaluate(
      { action: 'approval.decide', approvalId: APPROVAL_ID },
      actorFor('plant-manager'),
      APPROVAL_RECORDS,
    );

    expect(decision.outcome).toBe('allow');
  });

  it('reports an approval the records do not hold as not applicable', () => {
    const decision = evaluate(
      { action: 'approval.decide', approvalId: 'APR-2026-999' },
      actorFor('plant-manager'),
      APPROVAL_RECORDS,
    );

    // An absent record is a not-found the service reports, never a policy verdict.
    expect(decision.outcome).toBe('notApplicable');
    expect('policyId' in decision).toBe(false);
    expect('reason' in decision).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------
 * POL-005 — response-option validation before approval — AAP F7, src/seed/policies.ts
 * ------------------------------------------------------------------------------------------- */

describe('POL-005', () => {
  const actor = actorFor('material-planner');

  it('denies a request for an option whose constraint check fails, quoting the breach', () => {
    const decision = evaluate(approvalRequest('fail', [CONSTRAINT_BREACH]), actor, BASE_RECORDS);

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-005');
    // The breach is the solver's own message, carried into the reason rather than restated.
    expect(decision.reason).toContain(CONSTRAINT_BREACH);
    // The rule names no alternative: a breached option is corrected, not replaced, so the denial
    // offers no switch and leaves the member out entirely.
    expect('permittedAlternative' in decision).toBe(false);
  });

  it('denies a failing check that states no breach, without inventing one', () => {
    const decision = evaluate(approvalRequest('fail', []), actor, BASE_RECORDS);

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-005');
    expect(reasonLength(decision)).toBeGreaterThan(0);
    // The premise closes as its own sentence before the verdict follows, so the reason reads as two
    // sentences rather than running the rule's verdict into the sentence that states the breach.
    expect(decision.reason).toContain('no breach of its own.');
    expect('permittedAlternative' in decision).toBe(false);
  });

  it('permits a request for an option whose constraint check passes, citing the rule', () => {
    const decision = evaluate(approvalRequest('pass', []), actor, BASE_RECORDS);

    expect(decision.outcome).toBe('allow');
    // The passing check is this rule's own condition, so the allow names it.
    expect(decision.policyId).toBe('POL-005');
  });
});

/* ---------------------------------------------------------------------------------------------
 * POL-007 — the external model — AAP 0.6.3, AAP 0.12.4 (SCR-06)
 * ------------------------------------------------------------------------------------------- */

describe('POL-007', () => {
  const actor = actorFor('plant-manager');

  it('denies the external model for customer-confidential material under POL-007', () => {
    const decision = evaluate(
      assistantQuery(EXTERNAL_ENTRY.id, CONFIDENTIAL_CONTEXT),
      actor,
      BASE_RECORDS,
    );

    expect(decision.outcome).toBe('deny');
    // AAP 0.6.3 and AAP 0.12.4 put this condition under POL-007, and name the DOC-0031 block card as
    // the POL-007 card, so the rule that reports it is POL-007 rather than a second rule.
    expect(decision.policyId).toBe('POL-007');
    expect(reasonLength(decision)).toBeGreaterThan(0);
    // The alternative is the catalogue's own in-boundary model — the one-click switch the block card
    // offers — so a blocked question has somewhere to go instead of a dead end.
    expect(decision.permittedAlternative).toBe(IN_BOUNDARY_ENTRY.id);
  });

  it('denies the external model for eu-only material under POL-007', () => {
    const decision = evaluate(
      assistantQuery(EXTERNAL_ENTRY.id, EU_ONLY_CONTEXT),
      actor,
      BASE_RECORDS,
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-007');
    expect(reasonLength(decision)).toBeGreaterThan(0);
    expect(decision.permittedAlternative).toBe(IN_BOUNDARY_ENTRY.id);
  });

  it('denies a context carrying both conditions once, under POL-007', () => {
    // One rule owns both blocking conditions, so a context carrying both is reported once, by POL-007,
    // rather than twice or by whichever predicate a caller happened to read first.
    const decision = evaluate(
      assistantQuery(EXTERNAL_ENTRY.id, CONFIDENTIAL_AND_EU_ONLY_CONTEXT),
      actor,
      BASE_RECORDS,
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-007');
    // The reason names the conditions the context actually carries, so a reader is not told of one
    // while the record states both.
    expect(decision.reason).toContain('customer-confidential');
    expect(decision.reason).toContain('eu-only');
  });

  it('allows the external model when the context carries neither condition', () => {
    const decision = evaluate(assistantQuery(EXTERNAL_ENTRY.id, NEUTRAL_CONTEXT), actor, BASE_RECORDS);

    expect(decision.outcome).toBe('allow');
    // No rule permitted this question: it is allowed because no condition fires, so it cites none.
    expect('policyId' in decision).toBe(false);
  });

  it.each([...BLOCKING_CONTEXTS])(
    'allows the in-boundary model for a context carrying %s',
    (_label, context) => {
      // The question never leaves the boundary, so the rule that blocks it has nothing to refuse.
      const decision = evaluate(assistantQuery(IN_BOUNDARY_ENTRY.id, context), actor, BASE_RECORDS);

      expect(decision.outcome).toBe('allow');
    },
  );

  it('reports a model the catalogue does not hold as not applicable', () => {
    const decision = evaluate(
      assistantQuery('EXT-REASONING-02', CONFIDENTIAL_CONTEXT),
      actor,
      BASE_RECORDS,
    );

    expect(decision.outcome).toBe('notApplicable');
    expect('policyId' in decision).toBe(false);
  });

  it('omits the permitted alternative when the catalogue declares no in-boundary model', () => {
    const records: PolicyRecords = {
      ...BASE_RECORDS,
      modelCatalogue: catalogueOf([EXTERNAL_ENTRY, SECOND_EXTERNAL_ENTRY], EXTERNAL_ENTRY.id),
    };

    const decision = evaluate(
      assistantQuery(EXTERNAL_ENTRY.id, CONFIDENTIAL_CONTEXT),
      actor,
      records,
    );

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-007');
    expect(reasonLength(decision)).toBeGreaterThan(0);
    // Omitted rather than set to `undefined`: a denial that offers nothing says so by leaving the
    // member out, and the reason states that the catalogue declares no such model.
    expect('permittedAlternative' in decision).toBe(false);
  });

  it('offers the first in-boundary model when the catalogue default is external', () => {
    const records: PolicyRecords = {
      ...BASE_RECORDS,
      modelCatalogue: catalogueOf([EXTERNAL_ENTRY, IN_BOUNDARY_ENTRY], EXTERNAL_ENTRY.id),
    };

    const decision = evaluate(assistantQuery(EXTERNAL_ENTRY.id, EU_ONLY_CONTEXT), actor, records);

    expect(decision.outcome).toBe('deny');
    expect(decision.policyId).toBe('POL-007');
    expect(decision.permittedAlternative).toBe(IN_BOUNDARY_ENTRY.id);
  });
});

/* ---------------------------------------------------------------------------------------------
 * POL-009 — declared configuration, never evaluated — contracts §7.2, rule P-4
 * ------------------------------------------------------------------------------------------- */

describe('POL-009', () => {
  const actor = actorFor('platform-administrator');

  it('answers a lookup of the declared policy without a verdict', () => {
    const decision = evaluate({ action: 'policy-lookup', policyId: 'POL-009' }, actor, BASE_RECORDS);

    // Declared configuration is shown as declared rather than verified, so the engine neither permits
    // nor refuses anything under this identifier.
    expect(decision.outcome).toBe('notApplicable');
    expect(decision.outcome).not.toBe('deny');
    expect('policyId' in decision).toBe(false);
    expect('reason' in decision).toBe(false);
  });

  it('answers a lookup of an evaluated policy without a verdict as well', () => {
    // A lookup asks what a policy says, never whether it governs an action, so it supplies no action
    // to read an evaluated rule against.
    const decision = evaluate({ action: 'policy-lookup', policyId: 'POL-001' }, actor, BASE_RECORDS);

    expect(decision.outcome).toBe('notApplicable');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The invariants every decision keeps — AAP F7, rules B-3, P-4, P-7, P-8
 * ------------------------------------------------------------------------------------------- */

describe('invariants', () => {
  it('gives every action of the sweep a defined outcome', () => {
    for (const { label, decision } of decisionsOfSamples()) {
      expect(['allow', 'notApplicable', 'deny'], label).toContain(decision.outcome);
    }
  });

  it('reaches an allow, a denial and a not-applicable somewhere in the sweep', () => {
    // Without all three, the invariants below would pass over a set that never exercises a path.
    const outcomes = decisionsOfSamples().map(({ decision }) => decision.outcome);

    expect(outcomes).toContain('allow');
    expect(outcomes).toContain('deny');
    expect(outcomes).toContain('notApplicable');
  });

  it('carries a rule the engine evaluates and a non-empty reason on every denial', () => {
    const denials = decisionsOfSamples().filter(({ decision }) => decision.outcome === 'deny');

    expect(denials.length).toBeGreaterThan(0);

    for (const { label, decision } of denials) {
      expect(EVALUATED_RULES.includes(decision.policyId ?? ''), label).toBe(true);
      expect(reasonLength(decision), label).toBeGreaterThan(0);
    }
  });

  it('never attributes a decision to the declared policy', () => {
    for (const { label, decision } of decisionsOfSamples()) {
      expect(decision.policyId, label).not.toBe('POL-009');
    }
  });

  it('writes no barred product name into a reason', () => {
    const barred = BARRED_PRODUCT_NAME.toLowerCase();

    for (const { label, decision } of decisionsOfSamples()) {
      expect((decision.reason ?? '').toLowerCase().includes(barred), label).toBe(false);
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * Determinism — AAP 0.18.2: no clock, no random source, no mutable module state
 * ------------------------------------------------------------------------------------------- */

describe('determinism', () => {
  it('reaches the same decision twice from equal arguments', () => {
    for (const sample of ACTION_SAMPLES) {
      const first = evaluate(sample.action, sample.actor, sample.records);
      const second = evaluate(sample.action, sample.actor, sample.records);

      expect(second, sample.label).toEqual(first);
    }
  });

  it('reaches the same decision when other evaluations run between the two calls', () => {
    const firstPass = decisionsOfSamples();

    // Every sample evaluated again, in reverse order, so a cache or a module-level accumulator keyed
    // on anything but the arguments would surface as a differing second pass.
    [...ACTION_SAMPLES]
      .reverse()
      .forEach((sample) => evaluate(sample.action, sample.actor, sample.records));

    expect(decisionsOfSamples()).toEqual(firstPass);
  });

  it('leaves the records it reads unchanged', () => {
    const records: PolicyRecords = { ...APPROVAL_RECORDS };
    const asHandedIn = structuredClone(records);

    evaluate(
      { action: 'approval.decide', approvalId: APPROVAL_ID },
      actorFor('material-planner'),
      records,
    );

    expect(records).toEqual(asHandedIn);
  });
});

