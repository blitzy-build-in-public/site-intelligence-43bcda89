/**
 * The application's one door to the seeded record set (AAP 0.8, AAP 0.12.1 "Seed loader",
 * AAP 0.13.2 "Data", rule P-2).
 *
 * What it is for. `src/seed/` holds the demonstration's synthetic records as typed modules, and rule
 * P-2 allows them to be read by the in-browser mock adapter and by nothing else. This module is the
 * only file in the application that imports that folder, so the records reach the adapter through
 * one named function, and `tests/source-checks/no-seed-import-outside-mock.test.ts` fails the build
 * on every other import of `src/seed/`. A screen, a component, a domain module or a test that wanted a
 * record would therefore have to name this folder and be caught, which is what stops a second
 * boundary being written by accident.
 *
 * WHY IT CLONES, AND WHY THAT IS THE WHOLE POINT — contracts §1. The adapter keeps the demonstration's
 * state in memory and edits it: an exception is dismissed, a note is added, an approval is decided,
 * a simulation flag flips. If it edited the seed modules themselves, `Reset demo data` could not
 * restore the seeded records, because a module's exported array has already been rewritten by the
 * time anyone asks for the original. `loadSeed()` therefore hands back a deep clone on every call:
 * the adapter mutates its own copy, a reset calls this function again, and the seed modules are never
 * written to. The same property makes each caller's copy independent of every other's, so one
 * caller's edit cannot surface in another's read.
 *
 * WHY `structuredClone` RATHER THAN A JSON ROUND TRIP. The records are plain data — strings, numbers,
 * booleans, arrays and object literals, as `src/seed/` publishes them — so the platform's own
 * structured clone copies them exactly, keeps the types `number` and `boolean` instead of degrading
 * them to text, and preserves keys whose value is `undefined` rather than dropping them, which a
 * JSON round trip would not. It is also the same call a browser makes natively, so the clone behaves
 * identically in the test runner and in the page (rule B-1: nothing is fetched to perform it).
 *
 * WHAT IT DOES NOT DO. It holds no state of its own, runs no side effect, and composes no figure: it
 * publishes records, never a computed number, so no measure, identifier or expected result is typed
 * here (rule P-6). The deterministic filler of `src/seed/filler.ts` is a generator rather than a
 * record set, so its builders are not re-exported — this module's job is to hand back the record set
 * the barrel gathers, not the machinery that derives part of it. It names no company, product or
 * person of its own (rule P-7), reaches no address and reads no configuration (rules B-1 and B-2),
 * and claims nothing about what the records establish (rule P-4).
 *
 * THE SURFACE, STATED ONCE. The whole module is three things: `loadSeed()`, a type-only re-export of
 * every name `src/seed/` declares so sibling modules can type their work without reaching the folder
 * themselves, and the five fixed scalar constants the adapter and the simulation popover address
 * records by. The `SEED` aggregate and every record array stay unexported on purpose: an exported
 * array would let a caller edit a seed module directly and break the reset behaviour this file
 * exists to provide. The option positions `src/seed/exception-scenarios.ts` publishes for the case
 * measured at call time are the one record set the aggregate does not gather, so `loadSeed()` clones
 * them into the record set beside it (see `MockRecordSet`).
 */

/* ---------------------------------------------------------------------------------------------
 * Imports — the seed barrel, and only the seed barrel (rule P-2)
 * ------------------------------------------------------------------------------------------- */

import { SEED, SOLVER_OPTION_SETS } from '../../seed';
import type { SeededSolverOption, SeedRecordSet } from '../../seed';

/* ---------------------------------------------------------------------------------------------
 * Type surface — every name `src/seed/` declares, so consumers never reach the folder
 * ------------------------------------------------------------------------------------------- */

/**
 * Re-published as types only, which keeps the folder's declared shapes reachable to the adapter's
 * sibling modules while its values stay behind `loadSeed()`. Under `verbatimModuleSyntax` this form
 * emits no runtime code, so it cannot become a second path to a record.
 */
export type * from '../../seed';

/* ---------------------------------------------------------------------------------------------
 * Scalar constants — the five names a consumer addresses records by
 * ------------------------------------------------------------------------------------------- */

/**
 * The fixed scalar constants of the record set, re-exported so no adapter, screen or control types
 * their value instead:
 * - `BASELINE_CASE_ID` — the solver case the default exception is resolved against (AAP 0.8);
 * - `MARKET_PACK_VERSION` — the market-intelligence pack's release label;
 * - `SEEDED_EVENT_COUNT` — the number of events the seeded audit chain holds at start;
 * - `TAMPER_TARGET_ID` — the seeded event the simulation popover edits;
 * - `UNSCRIPTED_NOTICE` — the assistant's fixed answer outside its scripted questions.
 *
 * The `SEED` aggregate and the record arrays are deliberately absent from this list.
 */
export {
  BASELINE_CASE_ID,
  MARKET_PACK_VERSION,
  SEEDED_EVENT_COUNT,
  TAMPER_TARGET_ID,
  UNSCRIPTED_NOTICE,
} from '../../seed';

/* ---------------------------------------------------------------------------------------------
 * The loader — AAP 0.8, AAP 0.12.1, contracts §1 in-memory state
 * ------------------------------------------------------------------------------------------- */

/**
 * The record set the adapter loads: the seed's own aggregate, plus the option positions it publishes
 * beside that aggregate.
 *
 * `SeedRecordSet` is `SEED`'s shape, so the barrel types every record set it gathers. The option
 * positions are the one record family the aggregate does not gather: they belong to an exception
 * whose options are measured at call time, `src/seed/exception-scenarios.ts` publishes them as
 * `SOLVER_OPTION_SETS`, and they reach a handler as part of the loaded record set for the same reason
 * every other record does — through the session's state and as a clone, so no handler reads a seed
 * module (rule P-2).
 */
export interface MockRecordSet extends SeedRecordSet {
  /** The option positions the records state for the exceptions measured at call time. */
  readonly solverOptions: readonly SeededSolverOption[];
}

/**
 * Returns a fresh, unshared copy of every seeded record set.
 *
 * Called once by the adapter's bootstrap, which hashes the cloned audit drafts before the first
 * screen renders, and again on `Reset demo data`, which is why the copy must not be shared with the
 * clone a caller received earlier. Each call deep-clones the barrel's `SEED` aggregate, so the value
 * members arrive as new arrays of new objects and the scalar members as the same primitives they are;
 * an edit to one call's result reaches neither a later call's result nor the seed modules. The option
 * positions the barrel publishes beside the aggregate are cloned the same way, so a caller cannot
 * edit a seed module through the record set either.
 *
 * The clone is typed with `MockRecordSet`, which states `SeedRecordSet`, the barrel's own type for the
 * aggregate, plus that one published family. Adding a record set to `SEED` therefore widens the
 * returned type without this module being edited.
 *
 * @returns Every seeded record set — the master data, the order book, the exceptions, scenarios and
 * history, governance records, the audit drafts, the package and pin data, the market pack, the
 * assistant's questions, the seeded personas and the option positions measured at call time —
 * deep-cloned and safe to mutate.
 */
export function loadSeed(): MockRecordSet {
  return { ...structuredClone(SEED), solverOptions: structuredClone(SOLVER_OPTION_SETS) };
}
