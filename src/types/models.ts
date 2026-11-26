/**
 * Model catalogue vocabulary: the four placeholder models of the demonstration
 * and the processing boundary each one sits behind.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §3 declares `ModelCatalogue` among the core types
 *   and fixes none of its members, so each member below is derived from the
 *   screen that consumes it (AAP 0.12.2).
 * - AAP 0.6.3 records the four placeholders — MDL-LOCAL-L v3, MDL-EXTRACT v2,
 *   MDL-CLASSIFY v1.4 and EXT-REASONING-01 — as modelled only: the assistant
 *   answers from a script whose numbers are filled in at call time, and no
 *   model is connected (rule P-1). Nothing here describes an inference call.
 * - AAP 0.12.4 SCR-06 consumes this vocabulary in stage S1: the assistant's
 *   model selector offers the in-boundary model and an external reasoning
 *   model, and the POL-007 block card offers a one-click switch to the
 *   in-boundary model. The S5 model screen is out of this run's scope and
 *   renders the stage notice, so nothing here describes that screen.
 *
 * The boundary is declared configuration. Where it surfaces in the interface it
 * carries the label "Declared, not verified" (rule P-4), and it states what the
 * deployment declares rather than what it establishes.
 *
 * OPEN ITEM: the four identifiers, labels and versions are seed record content
 * in `src/seed/models.ts`; this module deliberately types none of them, so the
 * seed remains their single source (rule P-6). The seed's entry order is the
 * order the selector lists them in.
 * OPEN ITEM: `ModelCatalogue.defaultModelId` has to equal one entry's `id`, an
 * invariant no type can express; the mock adapter's handler enforces it.
 * OPEN ITEM: the catalogue carries no per-model availability member. POL-007
 * evaluates the boundary at call time, so whether an external model may answer
 * a particular context is a policy decision on the query, not a property of the
 * entry.
 */

/**
 * The processing boundary a model sits behind.
 *
 * This is the field POL-007 reads before the assistant produces an answer. An
 * `'external'` model is the one that can be blocked for a context carrying
 * `customer-confidential` or `eu-only` material — which is why the block card
 * exists — and an `'in-boundary'` model is the permitted alternative that card
 * offers as a one-click switch.
 */
export type ModelBoundary = 'in-boundary' | 'external';

/**
 * One entry of the model catalogue.
 *
 * The four entries are seed records — MDL-LOCAL-L v3, MDL-EXTRACT v2,
 * MDL-CLASSIFY v1.4 and EXT-REASONING-01 — and this shape only carries them:
 * `id` gives the model an identity the selector can select and the audit
 * payload can name, `label` is the printable form, `version` is the version the
 * record declares, and `boundary` is the POL-007 input. EXT-REASONING-01 is the
 * `'external'` one.
 */
export interface ModelEntry {
  /**
   * Seed record identifier, unique within the catalogue.
   */
  id: string;

  /**
   * Printable name shown by the selector and the answer's model line.
   */
  label: string;

  /**
   * Version declared by the seed record, shown beside the label.
   */
  version: string;

  /**
   * Boundary POL-007 evaluates for this entry.
   */
  boundary: ModelBoundary;
}

/**
 * The catalogue the model selector lists.
 *
 * `models` is every placeholder the demonstration knows about, and
 * `defaultModelId` is the one selected before the user chooses — the
 * in-boundary model, which is the permitted alternative POL-007 offers when it
 * blocks an external answer. The handler enforces that `defaultModelId` matches
 * one entry's `id`; the type cannot.
 */
export interface ModelCatalogue {
  /**
   * Every model entry, in seed record order.
   */
  models: ModelEntry[];

  /**
   * `id` of the entry selected by default; must match one member of `models`.
   */
  defaultModelId: string;
}
