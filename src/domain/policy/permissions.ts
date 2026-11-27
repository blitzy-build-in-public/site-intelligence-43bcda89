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
 * yield the identical answer, and a permission the table does not grant is denied. "Total" reaches the
 * argument the type system cannot exclude at runtime: a role key the tables do not own —
 * `'__proto__'` or any string outside the contracts' set — holds no permission and reaches no plant,
 * because both lookups are guarded rather than resolved up the prototype chain.
 *
 * This module imports types and nothing else (rule P-2): no seed record, no adapter, no React and no
 * sibling `src/domain` folder. `src/domain/policy/evaluate.ts` may import this module; the reverse
 * would be a cycle.
 *
 * The cells are stated from the specification and the AAP fact that names each one; contracts §7.1 is
 * their authority and supersedes every cell below, with the holder sets derived here. All 8 roles x 14
 * permissions = 112 cells appear, 46 granted and 66 denied, each grant following a fact about the
 * persona: the roles whose home route needs a read hold it, only a role able to decide a plant's plans
 * holds `approval.decide`, `approval.request` is withheld from `plant-manager` so a request always has
 * a distinct decider, and `evidence.read` reaches all eight because every figure opens its evidence.
 * `audit.read` reaches the two governance roles and the four personas the shell lands on the FileMap
 * canvas, because SCR-12's bottom dock carries the five latest audit events beside the selected
 * exception's projected stock with no caveat about the role reading them (AAP 0.12.4), and a supplied
 * §7.1 that withholds the cell from any of the six narrows that dock's events half to the roles left.
 *
 * Each persona's plant assignment. Specification §3 is the authority for it, and the sets below are
 * the demonstration's declared default, which §3 transcribes over without a consumer change. The mock
 * adapter builds each persona's `plantIds` from `plantScopeFor`, and that output equals the record's
 * own `plantScope` because the two tables state one fact.
 *
 * Own-vendor message redaction is deliberately not a cell of this matrix. USR-08 sees only its own
 * vendor's pins and USR-04 never receives a customer-confidential document body, and the mock adapter
 * applies both before a record crosses the service boundary (AAP 0.2.1); filtering here would create a
 * second enforcement point for a rule the adapter already owns.
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
 * Plant scope — contracts §7.1, AAP 0.12.2 (`Scope`)
 * ------------------------------------------------------------------------------------------- */

/** The four plants of the demonstration, in the order the `Scope` row of AAP 0.12.2 lists them. */
const ALL_PLANTS: readonly PlantId[] = ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'];

/**
 * The plants each role's scope covers — contracts §7.1, restating the seeded persona records.
 *
 * Each persona's plant scope is declared once, by its record in `src/seed/users.ts`. This module
 * imports types and nothing else (rule P-2), so it cannot read that seed and restates the eight sets
 * here verbatim: the two tables state one fact and are changed together, and a plant added to a
 * persona's record without its line here would make the declared scope and the enforced scope
 * disagree. Every set contains the plant of each exception the persona owns, so the flagship
 * `EXC-2026-1184` at `PLT-BRN` is inside `USR-01`'s scope and no owner is denied a record it owns.
 *
 * The head of supply chain, the platform administrator and the auditor span all four plants; the
 * supplier quality engineer reaches all four between the plants it inspects and the exceptions it
 * owns; every other persona is scoped to the plants it works in, and the external supplier engineer
 * sees the plant its supplier serves. No role is scoped to none: a role that may act nowhere could
 * not be named by a disabled control's explanation (rule P-8).
 */
const PLANT_SCOPE = {
  'material-planner': ['PLT-RGB', 'PLT-BRN'],
  'plant-manager': ['PLT-BRN'],
  'head-of-supply-chain': ALL_PLANTS,
  'platform-administrator': ALL_PLANTS,
  'production-planner': ['PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
  auditor: ALL_PLANTS,
  'supplier-quality-engineer': ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
  'external-supplier-engineer': ['PLT-BRN'],
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
    'audit.read',
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
    'approval.decide',
    'document.confidential.read',
    'audit.read',
    'evidence.read',
    'competitive.read',
  ],
  'platform-administrator': [
    'sovereignty.read',
    'policy.read',
    'policy.exception.request',
    'admin.read',
    'audit.read',
    'evidence.read',
    'competitive.read',
  ],
  'production-planner': [
    'exception.read',
    'exception.work',
    'scenario.create',
    'approval.request',
    'audit.read',
    'evidence.read',
  ],
  auditor: ['exception.read', 'audit.read', 'sovereignty.read', 'policy.read', 'evidence.read'],
  'supplier-quality-engineer': [
    'exception.read',
    'exception.work',
    'audit.read',
    'evidence.read',
    'evidence.review',
  ],
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
 * The two guards that keep a table lookup total — a role key the tables do not own
 * ------------------------------------------------------------------------------------------- */

/**
 * The permissions the matrix grants a role, or `undefined` for a key the matrix does not own.
 *
 * The guard is the whole reason this helper exists: `ROLE_PERMISSIONS[role]` on its own is an
 * unguarded read of a plain object, so a key the table does not declare — `'__proto__'`,
 * `'constructor'`, `'toString'` or any string outside the contracts' set — resolves up the prototype
 * chain to something that is not a permission list, and a caller that trusted it would throw out of a
 * module that promises no throw. Answering `undefined` for a key the table does not own is what lets
 * every caller deny it instead.
 *
 * @param role The role to read the matrix row of.
 * @returns The role's permissions, or `undefined` when the matrix does not own the key.
 */
function heldPermissionsOf(role: Role): readonly Permission[] | undefined {
  return Object.hasOwn(ROLE_PERMISSIONS, role) ? ROLE_PERMISSIONS[role] : undefined;
}

/**
 * The plants a role's scope covers, or `undefined` for a key `PLANT_SCOPE` does not own.
 *
 * The same guard as `heldPermissionsOf`, for the same reason: an unowned key would otherwise resolve
 * to `Object.prototype`, which is not iterable, and a caller that spread it would throw instead of
 * answering.
 *
 * @param role The role to read the plant scope of.
 * @returns The declared plants, or `undefined` when the table does not own the key.
 */
function plantScopeOf(role: Role): readonly PlantId[] | undefined {
  return Object.hasOwn(PLANT_SCOPE, role) ? PLANT_SCOPE[role] : undefined;
}

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
 * 3. The acting persona's own plant scope. The effective scope is the intersection of the role's
 *    plants and the persona's own, so a persona seeded with one plant cannot reach past it even while
 *    its role spans the group, and a persona whose record names no plant reaches no plant: an empty
 *    scope is denied rather than read as "no narrowing", which is what makes it fail closed. Every
 *    seeded persona's `plantIds` comes from `plantScopeFor` (see above), so this clause changes no
 *    seeded persona's answer; what it closes is a persona record that names no plant. The shell's
 *    plant filter is a different thing entirely: there an empty selection means "All plants", because
 *    it is the user's choice of what to look at rather than a scope a role was granted, and
 *    `src/domain/aggregation/scope.ts` reads it that way.
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
 * @param actor The acting persona, whose own plant scope the effective scope is intersected with.
 * @returns `true` only when the role holds the permission and the subject is inside the effective
 *   plant scope; `false` in every other case, including a role outside the contracts' set.
 */
export function hasPermission(
  role: Role,
  permission: Permission,
  subject: ScopedSubject | null,
  actor: ActiveUser,
): boolean {
  const heldPermissions: readonly Permission[] | undefined = heldPermissionsOf(role);
  if (heldPermissions === undefined || !heldPermissions.includes(permission)) {
    return false;
  }

  if (subject === null) {
    return true;
  }

  const rolePlantScope: readonly PlantId[] | undefined = plantScopeOf(role);
  if (rolePlantScope === undefined || !rolePlantScope.includes(subject.plantId)) {
    return false;
  }

  return actor.plantIds.includes(subject.plantId);
}

/**
 * The plants a role's scope covers — contracts §7.1, restating the seeded persona records.
 *
 * The returned array is freshly allocated, so a caller may sort, filter or mutate it without reaching
 * the table behind it. For a role the table owns it is never empty: a role that may act nowhere could
 * not be named by a disabled control's explanation (rule P-8). A role key the table does not own —
 * `'__proto__'` or any string outside the contracts' set — is scoped to nothing and answered with an
 * empty array rather than an exception, so every caller narrows to no plant instead of throwing.
 *
 * @param role The role to read the plant scope of.
 * @returns The role's plants, in the order the `Scope` row of AAP 0.12.2 lists them; empty when the
 *   table does not own the key.
 */
export function plantScopeFor(role: Role): PlantId[] {
  const declared: readonly PlantId[] | undefined = plantScopeOf(role);
  return declared === undefined ? [] : [...declared];
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
