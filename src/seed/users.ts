/**
 * The eight seeded personas: the record set the demonstration's role switcher selects between, and
 * the acting identity every audit event and every exception owner attributes its work to.
 *
 * Derivation, recorded because the plan's 27-module tree (AAP 0.13.1, AAP 0.15.1) does not list this
 * module. Three inputs require these records and no planned file owns them — AAP 0.2.3's eight
 * personas, each with a role, a plant scope and a home route; AAP 0.6.3 and AAP 0.7 ("the role
 * switcher selects one of the eight seeded users"); and AAP 0.12.1's
 * `switchRole(userId): Promise<Result<ActiveUser>>` — while rule P-3 makes the switcher a
 * demonstration control over seeded users and rule P-7 confines the product's people to the
 * synthetic records of the seed data. AAP 0.8 requires every synthetic record to sit in `src/seed/`.
 * Without this module the eight users would be invented inside `src/app/role-switcher.tsx` or the
 * mock adapter, which would split the seeded record set and put a record outside the one folder the
 * mock adapter loads from. Writing them here is the smallest complete set for that named category;
 * the deviation is from the file count alone, never from where the inputs place records.
 *
 * Fixing inputs, persona by persona (AAP 0.2.3, AAP 0.7, AAP 0.12.4):
 *
 * | id | role | home route |
 * |---|---|---|
 * | `USR-01` | material planner | `/canvas` |
 * | `USR-02` | plant manager | `/approvals` |
 * | `USR-03` | head of supply chain | `/canvas` |
 * | `USR-04` | platform administrator | `/admin/sovereignty` |
 * | `USR-05` | production planner | `/canvas` |
 * | `USR-06` | auditor | `/audit` |
 * | `USR-07` | supplier quality engineer | `/canvas` |
 * | `USR-08` | external supplier engineer | `/evidence` |
 *
 * The role and the home route are the two members a consumer keys on, and neither is stored twice
 * elsewhere: `src/app/nav-items.ts` resolves the landing route from the role, and its table agrees
 * with every `homeRoute` below character for character, so the two cannot drift silently — a changed
 * route shows up as a role switch that lands on one page while the router resolves another.
 *
 * Plant scope. A persona's `plantScope` is the fixed set its lists and aggregates are narrowed to,
 * intersected by the service with the top-bar plant filter (AAP 0.12.2, `Scope` in
 * `src/types/service.ts`). One rule assigns it: a persona's scope covers the plants it works across
 * and the plant of every exception it owns, so no owner is outside the scope of a record it owns.
 * This record set holds that fact's one declaration; `src/domain/policy/permissions.ts` imports types
 * and nothing else (rule P-2) and so restates the eight sets, which is why the two are changed
 * together.
 *
 * The assignment below is record content chosen from the shape the plant and line records of
 * `src/seed/plants.ts` give: a plant manager's single plant, the final-assembly plants a material
 * planner tracks, the two plants that each run exactly one final-assembly line for the production
 * planner, the plants whose incoming material the quality engineer inspects, the full set for the
 * three cross-plant roles, and one receiving plant for the external engineer, which is what the mock
 * adapter relies on when it narrows this persona's evidence pins to its own vendor's records. The
 * rule above then extends the two sets whose owned exceptions reach past those plants, `USR-05` and
 * `USR-07`. Every scope therefore contains `PLT-BRN`, the plant the demonstrated supply exception and
 * the plan whose side effect the approval flow acknowledges are recorded against, so the disruption of
 * AAP 0.2.1 reaches every persona who can act on it.
 *
 * DERIVATION — the seed document is not on disk. The persona records belong to
 * `platform-seed-data.md`, which is not part of this repository, so every name and job title below
 * is derived rather than transcribed. What the inputs fix is the set and what a consumer keys on:
 * AAP 0.2.3's eight personas, AAP 0.12.4's home route for each of them, and the
 * `switchRole(userId)` capability of AAP 0.12.1 that these records serve. The plant scopes are
 * derived from the shape the plant and line records give, as the paragraph above sets out. If the
 * seed document is supplied later, its table transcribes over these records and supersedes them
 * with no change to any consumer, because every consumer reads a persona through the service.
 *
 * Rules this module is built to satisfy:
 * - P-3: these records exist to drive a demonstration control. Nothing here states or implies that a
 *   browser-side permission check is production-grade enforcement — that statement belongs on the
 *   role switcher's own label and in the README.
 * - P-7: every person below is a synthetic name this record set introduces, standing for no real
 *   individual; no real company, customer, carmaker or cloud product is named, and no placeholder
 *   prose is used.
 * - P-6: a record carries the persona and its scope, never a figure and never a copy of the role to
 *   permission matrix, which `src/domain/policy/permissions.ts` owns alone.
 * - P-2: it imports `src/types` and nothing else — no seed record, no adapter, no component — so it
 *   cannot become a second data boundary, and only `src/services/mock/seed-loader.ts` imports it.
 * - B-1 and B-2: a persona carries no address, no credential and no key of any kind, because nothing
 *   in the demonstration signs in, and no external location is named anywhere in this module.
 */

import type { PlantId, Role, UserId } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Record shape
 * ------------------------------------------------------------------------------------------- */

/**
 * One persona as the seed records it: who the demonstration is acting as, what that role may reach,
 * and where the router opens for them.
 *
 * Declared here rather than in `src/types` because that folder owns only the `ActiveUser` session
 * shape — the record the service hands back once a persona is active. The members are aligned with
 * `ActiveUser` so the mock adapter builds one without a conversion table: `id`, `name`, `role` and
 * `homeRoute` are copied as they stand, `plantScope` becomes `plantIds` (a mutable array of the same
 * identifiers) and `permissions` is filled from the contracts §7.1 matrix by
 * `src/domain/policy/permissions.ts`, which is the single place that derives it (rule P-6).
 */
export interface SeededUser {
  /** The persona's identifier, `USR-01` through `USR-08`. */
  id: UserId;

  /** The persona's synthetic name (rule P-7). */
  name: string;

  /** The persona's role, which selects the permission set and the plant scope of a session. */
  role: Role;

  /** The plants this persona's lists and aggregates are narrowed to, in filter order. */
  plantScope: readonly PlantId[];

  /** The route the router opens for this persona and returns to when the role changes. */
  homeRoute: string;

  /** The persona's job title, as the role switcher and the shell show it. */
  jobTitle: string;
}

/* ---------------------------------------------------------------------------------------------
 * Records — one row per persona
 * ------------------------------------------------------------------------------------------- */

/**
 * The eight personas, in identifier order.
 *
 * Every identifier here is the one the audit trail, the exception queue and the approval inbox
 * attribute work to, so an actor or an owner recorded elsewhere resolves to exactly one row. The
 * array is `readonly`: the records are seed content, and the session a persona produces is the mock
 * adapter's mutable copy rather than a change to this set.
 */
export const USERS: readonly SeededUser[] = [
  {
    id: 'USR-01',
    name: 'Marta Berzina',
    role: 'material-planner',
    /** The two European final-assembly plants, where the supplied material this role tracks is consumed. */
    plantScope: ['PLT-RGB', 'PLT-BRN'],
    homeRoute: '/canvas',
    jobTitle: 'Material planner',
  },
  {
    id: 'USR-02',
    name: 'Tomas Herrera',
    role: 'plant-manager',
    /** One plant: the manager of a single site, the one whose plan the approval detail puts a duty on. */
    plantScope: ['PLT-BRN'],
    homeRoute: '/approvals',
    jobTitle: 'Plant manager',
  },
  {
    id: 'USR-03',
    name: 'Anika Vogel',
    role: 'head-of-supply-chain',
    /** Every plant: the role answers for the whole network, across both regions. */
    plantScope: ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
    homeRoute: '/canvas',
    jobTitle: 'Head of supply chain',
  },
  {
    id: 'USR-04',
    name: 'Rafael Duarte',
    role: 'platform-administrator',
    /** Every plant: administration of the workspace is not narrowed by site. */
    plantScope: ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
    homeRoute: '/admin/sovereignty',
    jobTitle: 'Platform administrator',
  },
  {
    id: 'USR-05',
    name: 'Petra Novakova',
    role: 'production-planner',
    /**
     * The two plants that each run exactly one final-assembly line, which is the pair this role
     * plans, plus `PLT-RAK`, where it owns `EXC-2026-1186`.
     */
    plantScope: ['PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
    homeRoute: '/canvas',
    jobTitle: 'Production planner',
  },
  {
    id: 'USR-06',
    name: 'Henrik Lindqvist',
    role: 'auditor',
    /** Every plant: the trail is read across the whole network rather than site by site. */
    plantScope: ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
    homeRoute: '/audit',
    jobTitle: 'Internal auditor',
  },
  {
    id: 'USR-07',
    name: 'Sofia Almeida',
    role: 'supplier-quality-engineer',
    /**
     * The European plants whose incoming purchased material this role inspects, plus `PLT-QRO` for
     * `EXC-2026-1187` and `EXC-2026-1189` and `PLT-RAK` for `EXC-2026-1192`, which it owns there.
     */
    plantScope: ['PLT-RGB', 'PLT-BRN', 'PLT-QRO', 'PLT-RAK'],
    homeRoute: '/canvas',
    jobTitle: 'Supplier quality engineer',
  },
  {
    id: 'USR-08',
    name: 'Jonas Weiler',
    role: 'external-supplier-engineer',
    /** One receiving plant, tied with the plant manager for the narrowest of the eight. */
    plantScope: ['PLT-BRN'],
    homeRoute: '/evidence',
    jobTitle: 'Supplier engineer, external',
  },
];
