/**
 * The one scope resolver: the shell's plant and product selection intersected with the role's
 * plant scope, in the shape every list call and every aggregate consumes.
 *
 * Fixing inputs: `platform-contracts.md` §5 (the ten aggregates over a resolved `Scope`);
 * `platform-specification.md` §5.1 (one plant filter and one product filter, each offering "All
 * plants" or "All products"); AAP 0.12.1 (`resolveScope(filters, role): Scope`, the plant scope
 * read from `src/domain/policy/permissions.ts`); AAP 0.12.2 (the filter universe is the seed's
 * own plants and products — record values none written here, rule P-6).
 *
 * What a caller cannot infer (AAP 0.2.1): the plant selection is intersected with the role's
 * scope, and a selection entirely outside it resolves to `plants: []`, never widened and never
 * read as "all plants"; `products` is passed through, so `products: []` keeps the input
 * convention "all products"; plants come back in the canonical order `plantScopeFor` states; and
 * an unknown identifier is not rejected here, resolving for plants to an empty array and passing
 * for products, since validating the universe would need a copy of the record set (rule P-2).
 */

import type { Role, Scope } from '../../types';
import { plantScopeFor } from '../policy/permissions';

/* ---------------------------------------------------------------------------------------------
 * The selection the shell holds — platform-specification.md §5.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The selection a read is narrowed by: the plants and the product it names, each absent or empty
 * for "all". Not a contracts type but the minimal shape of the call, declared here because the
 * shell store in `src/app/` may not be imported (AAP 0.6.2, AAP 0.13.2).
 */
export interface ScopeFilterInput {
  readonly plantIds?: readonly Scope['plants'][number][] | undefined;

  readonly plantId?: Scope['plants'][number] | undefined;

  readonly productId?: Scope['products'][number] | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The resolver — contracts §5; AAP 0.12.1, "Scope resolution"
 * ------------------------------------------------------------------------------------------- */

/**
 * The caller's whole selection wins over the top bar's single plant, and absent means the "All
 * plants" selection (AAP 0.2.1): two selected plants narrow to those two, not to every plant.
 */
function selectedPlantsOf(filters: ScopeFilterInput): readonly Scope['plants'][number][] {
  if (filters.plantIds !== undefined && filters.plantIds.length > 0) {
    return filters.plantIds;
  }

  return filters.plantId === undefined ? [] : [filters.plantId];
}

/**
 * Resolves the shell's selection against a role's plant scope — contracts §5; AAP 0.12.1, scope
 * resolution.
 *
 * The plants are the role's own scope filtered to the names the selection states — the
 * intersection in canonical order, with no identifier written here; products pass through.
 */
export function resolveScope(filters: ScopeFilterInput, role: Role): Scope {
  const selectedPlants: readonly Scope['plants'][number][] = selectedPlantsOf(filters);
  const plants: Scope['plants'] = plantScopeFor(role).filter(
    (plant) => selectedPlants.length === 0 || selectedPlants.includes(plant),
  );

  const selectedProduct: Scope['products'][number] | undefined = filters.productId;
  const products: Scope['products'] = selectedProduct === undefined ? [] : [selectedProduct];

  return { plants, products };
}
