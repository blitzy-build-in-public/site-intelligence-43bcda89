/**
 * The one scope resolver: the shell's plant and product selection intersected with the acting role's
 * plant scope, in the shape every list call and every aggregate consumes.
 *
 * One resolver, one answer. `resolveScope` is the single place the top-bar filters meet the role's
 * scope, and the mock adapter calls it before a list is filtered or an aggregate is computed, so a
 * filtered exception queue and a filtered overview cannot disagree about what is in scope (AAP 0.2.1;
 * AAP 0.12.1, "Scope resolution").
 *
 * Fixing inputs:
 * - `platform-contracts.md` §5, whose ten aggregates are computed over a resolved `Scope`.
 * - `platform-specification.md` §5.1, which fixes the top bar's filters as one plant selection and one
 *   product selection, each offering "All plants" or "All products" beside the individual records.
 * - AAP 0.12.1, whose scope-resolution row fixes the signature `resolveScope(filters, role): Scope` and
 *   names `src/domain/policy/permissions.ts` as the module the role's plant scope is read from.
 * - AAP 0.12.2, which fixes the filter universe: the four plants and the three products of the seed's
 *   records. Those identifiers are record values owned by the seed and the shell store, and none of
 *   them is written here (rule P-6): the canonical order this module emits is already the order
 *   `plantScopeFor` returns, so no plant table is restated beside it.
 *
 * What resolution does, member by member:
 * - `plants` is the selection intersected with `plantScopeFor(role)`. An absent selection is the
 *   "All plants" selection and resolves to the role's scope unfiltered. A selection naming a plant
 *   outside the role's scope resolves to an empty array: it is not widened to the role's scope and the
 *   role is not ignored, because the empty answer is what surfaces the empty or forbidden state
 *   instead of showing another plant's records.
 * - `products` is the selection passed through. Products are not plant-scoped — a product is built at
 *   the lines of more than one plant — so no role narrows the member and this module adds no rule of
 *   its own.
 *
 * How a resolved `Scope` reads — the one reading a caller may rely on:
 * - `plants: []` means *nothing is in scope*, never "all plants". `plantScopeFor` never returns an
 *   empty list, so a resolved plants member is empty only when the selection put every plant outside
 *   the role's scope. The "All plants" selection is resolved here, once, into the role's explicit
 *   plants, and that is what makes the two readings distinguishable downstream: a caller filters with
 *   `scope.plants.includes(record.plantId)` and leaks nothing when the array is empty.
 * - `products: []` keeps the input convention and means "all products", because the product selection
 *   is passed through rather than resolved. The asymmetry with `plants` is deliberate: it is the cost
 *   of intersecting one member and not the other, and a caller that read both members the same way
 *   would either narrow products by a rule the inputs do not state or widen plants past the role.
 *
 * Deterministic, pure and fresh (AAP 0.2.1, AAP 0.18.2). The plants come back in the canonical order
 * `plantScopeFor` states, never in the caller's click order, so every table, chart and aggregate
 * downstream is reproducible from the same filters. The function reads no clock, opens no random
 * source, holds no module-level state and performs no I/O, so identical arguments yield identical
 * output on every run. It mutates neither argument and returns freshly allocated arrays on every call,
 * so a caller may sort, filter or mutate the result without reaching anything this module owns.
 *
 * Rules this module is built to satisfy:
 * - P-3: the scoping resolved here runs in the browser of a build that has no backend, no sign-in and
 *   no session, so it is a demonstration control and not production authorisation. It narrows what a
 *   screen asks for and grants no access on its own; the mock adapter applies the same role scope to
 *   every call it serves, so changing the shell's filters reaches no record the role may not read.
 * - P-6: no identifier, amount, count or date is written here, and nothing is rounded — a selection is
 *   carried through, and the plant order is the one `plantScopeFor` already states.
 * - P-2: the module imports the shared types through the `../../types` barrel and one function from the
 *   policy module, and nothing else — no seed record, no adapter, no service module and no React — so
 *   it cannot become a second data boundary.
 * - P-4: it returns a selection and claims nothing beyond it. Nothing here states or implies that the
 *   application establishes sovereignty, prevents copying or resists tampering.
 * - P-7: no company, person or product of the real world is named, and the identifiers the module
 *   handles are the synthetic records of the seed.
 * - B-1 and B-2: the module contacts no host, addresses none and reads no configuration.
 *
 * OPEN ITEM: a selection naming an identifier that is not one of the seed's plants or products is not
 * rejected here. For plants it resolves to an empty array, because such a value is outside every
 * role's scope — the same honest answer an out-of-scope plant gets; for products it is passed through
 * and surfaces as an empty result at the reader. Validating the universe would need a copy of the
 * record set, which rule P-2 keeps out of this module.
 */

import type { Role, Scope } from '../../types';
import { plantScopeFor } from '../policy/permissions';

/* ---------------------------------------------------------------------------------------------
 * The selection the shell holds — platform-specification.md §5.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The shell's selection as the top bar holds it: one plant filter and one product filter, each able to
 * stand for "all".
 *
 * Declared here rather than in `src/types` because it is not a contracts type but the minimal shape of
 * the call. The shell store in `src/app/` holds these two values and this module may not import that
 * folder (AAP 0.6.2, AAP 0.13.2), so the boundary is stated structurally instead. Precedent for a
 * module-local exported type in this layer: `ScopedSubject` in `src/domain/policy/permissions.ts`.
 *
 * Both members take their type from `Scope` itself — a plant here is exactly one element of
 * `Scope['plants']` — so a single-value selection and the resolved collection cannot drift apart. A
 * member that is absent, or explicitly `undefined`, is the "All plants" or "All products" selection,
 * which is also the spelling a store holding `PlantId | undefined` hands over under
 * `exactOptionalPropertyTypes`.
 */
export interface ScopeFilterInput {
  /** The selected plant, absent or `undefined` for "All plants". */
  readonly plantId?: Scope['plants'][number] | undefined;

  /** The selected product, absent or `undefined` for "All products". */
  readonly productId?: Scope['products'][number] | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The resolver — contracts §5; AAP 0.12.1, "Scope resolution"
 * ------------------------------------------------------------------------------------------- */

/**
 * Resolves the shell's selection against a role's plant scope — contracts §5; AAP 0.12.1, scope
 * resolution.
 *
 * The plant list is built by walking the role's own scope and keeping the plant the selection names,
 * which gives the intersection and the canonical order in one pass without a plant identifier written
 * into this file. The product selection is passed through, because no role narrows it.
 *
 * @param filters The top bar's plant and product selection, each member absent for "all".
 * @param role The acting persona's role, whose plant scope caps the selection.
 * @returns A fresh `Scope`: the plants the selection and the role's scope agree on, in canonical order,
 *   and the product selection unchanged. Its `plants` member is empty when the selection names no plant
 *   inside the role's scope, which no reader may mistake for "all plants".
 */
export function resolveScope(filters: ScopeFilterInput, role: Role): Scope {
  const selectedPlant: Scope['plants'][number] | undefined = filters.plantId;
  const plants: Scope['plants'] = plantScopeFor(role).filter(
    (plant) => selectedPlant === undefined || plant === selectedPlant,
  );

  const selectedProduct: Scope['products'][number] | undefined = filters.productId;
  const products: Scope['products'] = selectedProduct === undefined ? [] : [selectedProduct];

  return { plants, products };
}
