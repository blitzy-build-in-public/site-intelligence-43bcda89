/**
 * Who may act, and where: the permission matrix and the plant scope of `platform-contracts.md` §7.1.
 *
 * `hasPermission`, `plantScopeFor` and `rolesWith` are the single authority on that question in this
 * build. The mock adapter calls them before every read and every write, and the unconnected API
 * client evaluates the same three functions, so the two adapters cannot diverge on who is allowed to
 * do what (AAP 0.6.2, AAP 0.12.3). `src/domain/aggregation/scope.ts` reads `plantScopeFor` to
 * intersect the shell's plant and product filters with the acting role's scope, and a permission
 * failure carries the role list `rolesWith` returns, which is what lets a disabled control or a
 * forbidden card say who may act instead of only that the reader may not (rule P-8).
 *
 * A demonstration control, not production authorisation (rule P-3). These checks run in the browser
 * of a build that has no backend, no sign-in and no session, so they decide nothing about a live
 * system: the role switcher changes which persona the page claims to be, and nothing else. The mock
 * adapter nevertheless evaluates this matrix itself, on every call, before it touches a record, so
 * bypassing the role switcher grants no access a screen was hiding. A deployment authorises each
 * call in the service that holds the data.
 *
 * Pure, total and deterministic (AAP 0.2.1, AAP 0.18.2). A table lookup is the whole computation: no
 * clock, no random source, no I/O, no mutable module state and no throw. Identical arguments always
 * yield the identical answer, and a permission the table does not grant is denied.
 *
 * This module imports types and nothing else (rule P-2): no seed record, no adapter, no React and no
 * sibling `src/domain` folder. `src/domain/policy/evaluate.ts` may import this module; the reverse
 * would be a cycle.
 *
 * OPEN ITEM: contracts §7.1 is the authority for the exact cells and is not readable in this run, so
 * every cell below is settled from the AAP fact that names it and stays open to correction:
 * - `approval.decide` to `plant-manager` alone — the persona table (AAP 0.2.3), the plant manager's
 *   home route `/approvals` (AAP 0.12.4) and the journey in which a planner requests a plan and the
 *   plant manager decides it (AAP 0.2.2, T-07, T-08). `Approval.eligibleApproverRoles` is a list, so
 *   §7.1 may admit a second approver, such as the head of supply chain as an escalation.
 * - `approval.request` to the roles that send a plan for approval and not to `plant-manager`, so a
 *   request always has a distinct persona able to decide it.
 * - `audit.read` to `auditor` alone — the auditor's home route is `/audit` (AAP 0.12.4).
 * - `sovereignty.read` and `policy.read` to `platform-administrator` and `auditor`; `admin.read` and
 *   `policy.exception.request` to `platform-administrator` alone, from its home route
 *   `/admin/sovereignty` and the time-boxed exception it grants (AAP 0.12.4, SCR-07).
 * - `document.confidential.read` to the planning roles, and to neither the platform administrator
 *   nor the external supplier engineer: USR-04 cannot open the body of a customer-confidential
 *   document, which the mock adapter redacts inside the service (AAP 0.2.1).
 * - `competitive.read` to every role except the external supplier engineer, for whom
 *   `GET /market-intelligence/atlas` is forbidden (AAP 0.12.3).
 * - `evidence.read` to all eight roles: every figure a screen shows opens its evidence (principle
 *   PR-6), so a role that may see a figure must be able to open the evidence behind it.
 * - `evidence.review` to `supplier-quality-engineer` alone, the role that reviews extraction
 *   (AAP 0.12.1).
 * - `exception.work` and `scenario.create` to the roles that assign, note, dismiss or compare
 *   options (AAP 0.12.4, SCR-02 row actions and SCR-04).
 * OPEN ITEM: specification §3 fixes each persona's own plant assignment and is not readable in this
 * run, so the plant scope below is the demonstration's declared default. The mock adapter builds each
 * seeded persona's `plantIds` from `plantScopeFor`, so the declared scope and the enforced scope
 * cannot disagree.
 * OPEN ITEM: own-vendor message redaction is deliberately not a cell of this matrix. USR-08 sees only
 * its own vendor's pins and USR-04 never receives a customer-confidential document body, and the mock
 * adapter applies both before a record crosses the service boundary (AAP 0.2.1). Filtering here
 * would create a second enforcement point for a rule the adapter already owns.
 */

import type { ActiveUser, Permission, PlantId, Role } from '../../types';

/**
 * A record this matrix can scope by plant: the only member it reads is `plantId`.
 *
 * Declared here rather than in `src/types` because it is not a contracts type but the minimal shape
 * of every scoped call: `OperationalException`, `AffectedLine` and any plant-scoped read satisfy it
 * structurally, so a caller passes the record it is checking and needs no cast. A `null` subject
 * means the call is not plant-scoped at all.
 */
export interface ScopedSubject {
  /** The plant the checked record belongs to. */
  readonly plantId: PlantId;
}

/* ---------------------------------------------------------------------------------------------
 * Plant scope — contracts §7.1, AAP 0.2.3
 * ------------------------------------------------------------------------------------------- */

/** The four plants of the demonstration, in the order AAP 0.2.3 lists them. */
const ALL_PLANTS: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'];

/**
 * The plants each role's scope covers — contracts §7.1, with the assignments of AAP 0.2.3.
 *
 * The head of supply chain, the platform administrator and the auditor span all four plants; every
 * other persona is scoped to the plant it works in, the supplier quality engineer included, and the
 * external supplier engineer sees the plant its supplier serves. No role is scoped to none: a role
 * that may act nowhere could not be named by a disabled control's explanation (rule P-8).
 */
const PLANT_SCOPE = {
  'material-planner': ['PLT-RGB'],
  'plant-manager': ['PLT-BRN'],
  'head-of-supply-chain': ALL_PLANTS,
  'platform-administrator': ALL_PLANTS,
  'production-planner': ['PLT-RGB'],
  auditor: ALL_PLANTS,
  'supplier-quality-engineer': ['PLT-QRO'],
  'external-supplier-engineer': ['PLT-RAK'],
} as const satisfies Readonly<Record<Role, readonly PlantId[]>>;

/**
 * The canonical persona order of AAP 0.2.3 — `USR-01` to `USR-08` — which every role list follows.
 *
 * A list built by iterating this tuple is in the same order on every call, so a tooltip naming the
 * roles that may act reads the same way twice, and the order a suite asserts is a fixed property
 * rather than an accident of table layout.
 */
const ROLE_ORDER = [
  'material-planner',
  'plant-manager',
  'head-of-supply-chain',
  'platform-administrator',
  'production-planner',
  'auditor',
  'supplier-quality-engineer',
  'external-supplier-engineer',
] as const satisfies readonly Role[];

/* ---------------------------------------------------------------------------------------------
 * The permission matrix — contracts §7.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission matrix of contracts §7.1: what each role holds, in the order the matrix lists the
 * permissions.
 *
 * The table is exhaustive over `Role` and every member is a `Permission`, so a renamed or added role
 * or permission is a compile error here rather than a silent denial at a call site. A pair absent
 * from a role's list is denied.
 */
const ROLE_PERMISSIONS = {
  'material-planner': [
    'exception.read',
    'exception.work',
    'scenario.create',
    'approval.request',
    'document.confidential.read',
    'evidence.read',
  ],
  'plant-manager': [
    'exception.read',
    'exception.work',
    'scenario.create',
    'approval.decide',
    'document.confidential.read',
    'evidence.read',
    'competitive.read',
  ],
  'head-of-supply-chain': [
    'exception.read',
    'scenario.create',
    'approval.request',
    'document.confidential.read',
    'evidence.read',
    'competitive.read',
  ],
  'platform-administrator': [
    'sovereignty.read',
    'policy.read',
    'policy.exception.request',
    'admin.read',
    'evidence.read',
    'competitive.read',
  ],
  'production-planner': [
    'exception.read',
    'exception.work',
    'scenario.create',
    'approval.request',
    'evidence.read',
  ],
  auditor: ['exception.read', 'audit.read', 'sovereignty.read', 'policy.read', 'evidence.read'],
  'supplier-quality-engineer': ['exception.read', 'exception.work', 'evidence.read', 'evidence.review'],
  'external-supplier-engineer': ['evidence.read'],
} as const satisfies Readonly<Record<Role, readonly Permission[]>>;

/** Every permission at least one role holds, as the table's own literals state it. */
type GrantedPermission = (typeof ROLE_PERMISSIONS)[Role][number];

/** A type that only holds where its argument is `never`; the two proofs below use it. */
type AssertNever<T extends never> = T;

/**
 * Compile-time proof that `ROLE_ORDER` names every role, so `rolesWith` cannot silently omit one.
 * Adding a role without adding it to the tuple makes `UnorderedRole` a non-`never` type here.
 */
type UnorderedRole = Exclude<Role, (typeof ROLE_ORDER)[number]>;
type RolesOrderedCompletely = AssertNever<UnorderedRole>;

/**
 * Compile-time proof of the first invariant this file owes rule P-8: every permission of the
 * contracts §7.1 matrix is held by at least one role, so a disabled control can always name who may
 * act. A permission without a holder makes `UngrantedPermission` a non-`never` type here.
 */
type UngrantedPermission = Exclude<Permission, GrantedPermission>;
type EveryPermissionGranted = AssertNever<UngrantedPermission>;

/* ---------------------------------------------------------------------------------------------
 * The three queries the adapters, the scope resolver and the forbidden card call
 * ------------------------------------------------------------------------------------------- */

/**
 * Decides whether a role may perform a permission on a subject — contracts §7.1.
 *
 * The matrix is evaluated in this order, and the first step that refuses decides the answer:
 *
 * 1. The role's own permission list. A permission the role does not hold is denied, whatever the
 *    plant, so least privilege is applied before scope rather than after it.
 * 2. The role's plant scope, when `subject` is non-null. A role limited to one plant may not act on
 *    a record belonging to another, and a role that spans plants may act on any of them. A `null`
 *    subject means the call is not plant-scoped, as with `admin.read` or `audit.read`.
 * 3. The acting user's own plant scope, where it is narrower than the role's. The effective scope is
 *    the intersection of the two, so a persona seeded with one plant cannot reach past it even while
 *    its role spans the group.
 *
 * `role` is evaluated exactly as given, which is what lets a suite probe any role against any user;
 * `actor` supplies the concrete persona for the clause scoped by user. `actor.permissions` is not
 * consulted: `ActiveUser.permissions` is derived from this matrix by the adapter, so reading it back
 * would let the matrix and its copy disagree. Own-vendor redaction of another supplier's pins is the
 * mock adapter's duty and is not a cell here (AAP 0.2.1).
 *
 * @param role The role to evaluate.
 * @param permission The permission the call requires.
 * @param subject The record the call is about, or `null` when the call is not plant-scoped.
 * @param actor The acting persona, whose plant scope narrows the role's where it is narrower.
 * @returns `true` only when the role holds the permission and the subject is inside the effective
 *   plant scope; `false` in every other case, including a role outside the contracts' set.
 */
export function hasPermission(
  role: Role,
  permission: Permission,
  subject: ScopedSubject | null,
  actor: ActiveUser,
): boolean {
  const heldPermissions: readonly Permission[] | undefined = ROLE_PERMISSIONS[role];
  if (heldPermissions === undefined || !heldPermissions.includes(permission)) {
    return false;
  }

  if (subject === null) {
    return true;
  }

  if (!plantScopeFor(role).includes(subject.plantId)) {
    return false;
  }

  return actor.plantIds.length === 0 || actor.plantIds.includes(subject.plantId);
}

/**
 * The plants a role's scope covers — contracts §7.1, with the assignments of AAP 0.2.3.
 *
 * The returned array is freshly allocated, so a caller may sort, filter or mutate it without
 * reaching the table behind it. It is never empty: a role that may act nowhere could not be named by
 * a disabled control's explanation (rule P-8).
 *
 * @param role The role to read the plant scope of.
 * @returns The role's plants, in the order AAP 0.2.3 lists them.
 */
export function plantScopeFor(role: Role): PlantId[] {
  return [...PLANT_SCOPE[role]];
}

/**
 * The roles that hold a permission — contracts §7.1.
 *
 * This is the source of a permission failure's role list, which is what a forbidden card and a
 * disabled control's tooltip show so the reader is told who may act (rule P-8). Every permission of
 * the matrix has at least one holder, which the type proof above keeps true, and the roles come back
 * in the canonical persona order on every call.
 *
 * @param permission The permission to find the holders of.
 * @returns The roles holding it, in persona order.
 */
export function rolesWith(permission: Permission): Role[] {
  return ROLE_ORDER.filter((role) => {
    const heldPermissions: readonly Permission[] = ROLE_PERMISSIONS[role];
    return heldPermissions.includes(permission);
  });
}
