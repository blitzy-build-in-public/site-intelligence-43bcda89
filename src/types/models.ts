/**
 * Model catalogue vocabulary: the placeholder models, the processing boundary each one sits
 * behind, and the outbound destination an inference through an entry would reach.
 *
 * Fixing inputs: `platform-contracts.md` §3 declares `ModelCatalogue` among the core types and
 * fixes none of its members, so each member below is derived from the screen that consumes it
 * (AAP 0.12.2). AAP 0.6.3 records the four models as modelled only, with no model connected
 * (rule P-1), and its outbound-endpoint row with AAP 0.8 fixes `endpoint`. AAP 0.12.4's SCR-06
 * is the one consumer this run builds, through the model selector and the POL-007 block card's
 * switch to the in-boundary model.
 *
 * The boundary is declared configuration, labelled "Declared, not verified" wherever it surfaces
 * (rule P-4), and the identifiers, labels and versions stay seed record content (rule P-6). The
 * catalogue carries no availability member: POL-007 evaluates the boundary at call time, so
 * availability is a policy decision on the query.
 */

/**
 * The processing boundary a model sits behind: POL-007 (contracts §7.2) blocks an `'external'`
 * model for a context carrying `customer-confidential` or `eu-only` material, and offers the
 * `'in-boundary'` one as the permitted alternative.
 */
export type ModelBoundary = 'in-boundary' | 'external';

/** One catalogue entry: identity, label, version, boundary and declared outbound destination. */
export interface ModelEntry {
  id: string;

  label: string;

  version: string;

  /** Boundary POL-007 evaluates for this entry. */
  boundary: ModelBoundary;

  /**
   * The outbound endpoint an inference through this entry would reach, present only on the entry
   * whose destination the deployment declares; a refusal of it counts against this value in the
   * outbound ledger (AAP 0.6.3, AAP 0.8), and the entry is never contacted (rules P-1, B-1).
   */
  endpoint?: string;
}

/** The catalogue the model selector lists — contracts §3's `ModelCatalogue` — in seed order. */
export interface ModelCatalogue {
  models: ModelEntry[];

  /**
   * `id` of the entry selected by default — the in-boundary model POL-007 offers as the
   * permitted alternative — which must match one member of `models`: an invariant the handler
   * enforces.
   */
  defaultModelId: string;
}
