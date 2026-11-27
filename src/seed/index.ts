/**
 * The seed record set's barrel: the one module `src/services/mock/seed-loader.ts` consumes, which
 * re-publishes every sibling record module and gathers their record sets into a single object.
 *
 * WHY THE FOLDER HAS AN ENTRY POINT — rule P-2, AAP 0.8. Seed records may be read by the in-browser
 * mock adapter and by nothing else, and the adapter reaches them through one module name. A screen, a
 * component, a domain module or a test that wanted a record would therefore have to say so plainly,
 * and `tests/source-checks/no-seed-import-outside-mock.test.ts` fails on any import of `src/seed/`
 * from outside `src/services/mock/`. Those two properties together are what stop a second consumer
 * of seed data being written by accident: there is exactly one door, it is named here, and passing
 * through it is visible in the diff.
 *
 * The barrel is also what lets the loader clone the whole record set in one call — it hands a
 * `SeedRecordSet` to a deep clone and gets one back — so a reset restores the seed without the loader
 * knowing the shape of any individual record set, and without a hand-written shape that could drift
 * from what the record modules actually publish.
 *
 * WHAT THIS MODULE IS NOT. It declares no record, computes nothing, holds no state, runs no side
 * effect and reads no environment (rule B-2). It carries no number of its own (rule P-6) and names no
 * company, product or figure (rule P-7): every value it publishes is a sibling's export, re-published
 * unchanged. The named imports below exist only because a star re-export re-publishes a name without
 * binding it locally, so the aggregate object needs its own bindings for the values it gathers.
 *
 * The re-export order is the order the record set reads in — master data, the order book, the
 * exceptions and the solver cases that measure options against them, governance, the audit trail, the
 * package and pin data, the market pack, the assistant's questions, the deterministic filler and the
 * synthetic users — so this listing documents the shape of the aggregate beneath it.
 */

/* ---------------------------------------------------------------------------------------------
 * Bindings the aggregate gathers — one named import per record set, from the module that owns it
 * ------------------------------------------------------------------------------------------- */

import { LINES, PLANTS } from './plants';
import { PRODUCTS } from './products';
import { CUSTOMERS } from './customers';
import { SUPPLIERS } from './suppliers';
import { ORIGINS } from './origins';
import { MATERIALS } from './materials';
import { CUSTOMER_ORDERS } from './customer-orders';
import { PURCHASE_ORDERS } from './purchase-orders';
import { PRODUCTION_ORDERS } from './production-orders';
import { EXCEPTIONS } from './exceptions';
import { EXCEPTION_SCENARIOS } from './exception-scenarios';
import { EXCEPTION_HISTORY } from './exception-history';
import { APPROVALS } from './approvals';
import { BASELINE_CASE_ID, SOLVER_CASES } from './solver-cases';
import { POLICIES } from './policies';
import { DOCUMENTS } from './documents';
import { MODEL_CATALOGUE } from './models';
import { SOURCES } from './sources';
import { SOVEREIGNTY } from './sovereignty';
import { SEEDED_AUDIT_EVENTS, SEEDED_EVENT_COUNT, TAMPER_TARGET_ID } from './audit-events';
import { PPAP_ELEMENTS, PPAP_PACKAGES } from './packages';
import { EVIDENCE_PINS, PINS_BY_NODE } from './pins';
import { ASSEMBLIES } from './assemblies';
import { MARKET_INTELLIGENCE, MARKET_PACK_VERSION } from './market-intelligence';
import { ASSISTANT_QUESTIONS, UNSCRIPTED_NOTICE } from './assistant-questions';
import { USERS } from './users';

/* ---------------------------------------------------------------------------------------------
 * Re-exports — every record module's names, so one import reaches the whole folder
 * ------------------------------------------------------------------------------------------- */

/* Master data: plants and their lines, the product and customer book, the supply network. */
export * from './plants';
export * from './products';
export * from './customers';
export * from './suppliers';
export * from './origins';
export * from './materials';

/* The order book: customer demand, inbound supply and the shop-floor plan. */
export * from './customer-orders';
export * from './purchase-orders';
export * from './production-orders';

/* Exceptions, the scenarios a solver case measures, and the resolved history behind the tile. */
export * from './exceptions';
export * from './exception-scenarios';
export * from './exception-history';

/* Governance records: approvals, solver cases, policies, document bodies, models, sources. */
export * from './approvals';
export * from './solver-cases';
export * from './policies';
export * from './documents';
export * from './models';
export * from './sources';
export * from './sovereignty';

/* The audit trail, the package and pin data of the evidence workspace, the assembly structures. */
export * from './audit-events';
export * from './packages';
export * from './pins';
export * from './assemblies';

/* The simulated market-intelligence pack, the assistant's scripted questions, the filler, the users. */
export * from './market-intelligence';
export * from './assistant-questions';
export * from './filler';
export * from './users';

/* ---------------------------------------------------------------------------------------------
 * The aggregate — AAP 0.13.1, rule P-2
 * ------------------------------------------------------------------------------------------- */

/**
 * Every seeded record set, gathered under the name the mock adapter's loader clones.
 *
 * Grouped as the record set reads: the scope master data first (the plants, lines, products,
 * customers, suppliers, origins and materials every scoped read is keyed on), then the order book,
 * then the exception and scenario records, then governance, then the audit trail with the two
 * constants the verification and the simulation popover address it by, then the evidence workspace's
 * packages, pins and assemblies, then the market pack, the assistant's questions and the users.
 *
 * The scalar members are here for the same reason as the collections: `baselineCaseId` is the
 * case the adapter resolves the default exception against rather than a case identifier typed into a
 * screen (AAP 0.8), and `tamperTargetId` with `seededEventCount` are what the simulation popover
 * edits and what the bootstrap asserts it built, so a component never carries either identifier.
 *
 * Nothing in this object is produced here — each member is the constant the record module exports, so
 * a consumer reads the seed through one shape while the records themselves stay owned where they are
 * defined.
 */
export const SEED = {
  plants: PLANTS,
  lines: LINES,
  products: PRODUCTS,
  customers: CUSTOMERS,
  suppliers: SUPPLIERS,
  origins: ORIGINS,
  materials: MATERIALS,
  customerOrders: CUSTOMER_ORDERS,
  purchaseOrders: PURCHASE_ORDERS,
  productionOrders: PRODUCTION_ORDERS,
  exceptions: EXCEPTIONS,
  exceptionScenarios: EXCEPTION_SCENARIOS,
  exceptionHistory: EXCEPTION_HISTORY,
  approvals: APPROVALS,
  solverCases: SOLVER_CASES,
  baselineCaseId: BASELINE_CASE_ID,
  policies: POLICIES,
  documents: DOCUMENTS,
  modelCatalogue: MODEL_CATALOGUE,
  sources: SOURCES,
  sovereignty: SOVEREIGNTY,
  auditEvents: SEEDED_AUDIT_EVENTS,
  tamperTargetId: TAMPER_TARGET_ID,
  seededEventCount: SEEDED_EVENT_COUNT,
  ppapElements: PPAP_ELEMENTS,
  ppapPackages: PPAP_PACKAGES,
  evidencePins: EVIDENCE_PINS,
  pinsByNode: PINS_BY_NODE,
  assemblies: ASSEMBLIES,
  marketIntelligence: MARKET_INTELLIGENCE,
  marketPackVersion: MARKET_PACK_VERSION,
  assistantQuestions: ASSISTANT_QUESTIONS,
  unscriptedNotice: UNSCRIPTED_NOTICE,
  users: USERS,
};

/**
 * The shape of the whole record set, taken from the aggregate itself.
 *
 * `src/services/mock/seed-loader.ts` types its deep clone with this name, so the loader holds one
 * parameter type and one return type that cannot disagree with the record modules: adding a record
 * set to `SEED` widens this type and reaches the loader without either module being edited by hand.
 */
export type SeedRecordSet = typeof SEED;
