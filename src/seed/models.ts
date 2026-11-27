/**
 * Model catalogue records: the four placeholder models the demonstration names, and the processing
 * boundary each one sits behind.
 *
 * Fixing inputs:
 * - AAP 0.6.3 records MDL-LOCAL-L v3, MDL-EXTRACT v2, MDL-CLASSIFY v1.4 and EXT-REASONING-01 as
 *   modelled only. No model is connected: the assistant answers from a script whose figures are
 *   filled in at call time (rule P-1), so nothing here describes an inference call, a request body,
 *   a prompt or a result.
 * - AAP 0.12.2 fixes the catalogue's shape in `src/types/models.ts` — `ModelCatalogue`,
 *   `ModelEntry` and `ModelBoundary` — and that module deliberately types no identifier, label or
 *   version, so the four records below are their single owner (rule P-6).
 * - AAP 0.12.4 SCR-06 consumes the catalogue. The assistant's model selector lists the entries in
 *   the order given below, `defaultModelId` is the entry selected before the user chooses, and
 *   POL-007 reads each entry's `boundary` before an answer is composed: the `external` entry is the
 *   one such a policy can block, and the in-boundary entry is the one-click switch the block card
 *   offers instead.
 *
 * `src/services/mock/seed-loader.ts` is the only module that imports this one (rule P-2); it hands
 * the catalogue to the adapter, which serves it to the selector.
 *
 * Rules served:
 * - P-1: every record is a placeholder. No entry states that a model is connected, and `boundary`
 *   says where an answer would be composed rather than that one was.
 * - P-4: `boundary` is declared configuration the policy engine reads. No entry or comment here
 *   claims the deployment establishes anything, and the interface labels the value "Declared, not
 *   verified" wherever it surfaces.
 * - P-6: the four designations are seed record content, owned here and nowhere else. No displayed
 *   figure appears in this module.
 * - P-7: every label is a synthetic placeholder identifier. No real model provider, product or
 *   vendor is named, and no company, person or figure outside the seed appears.
 * - B-1: nothing here addresses a network location — no host, no path, no endpoint.
 * - B-2: nothing here reads configuration and nothing resembles a credential.
 */
import type { ModelCatalogue } from '../types';

/**
 * The catalogue the assistant's model selector lists, in seed record order.
 *
 * Each entry records its version twice by design: `id` and `label` carry the full designation the
 * inputs fix, because that designation is what the selector shows and what an answer's `modelId`
 * names, while `version` carries the designation's own trailing suffix — the text after the model
 * code, whether that is `v3`, `v2`, `v1.4`, or the `01` that ends the external entry's name.
 *
 * `defaultModelId` resolves to the in-boundary entry, so a visit never begins on the model POL-007
 * may have to block. The handler that serves the catalogue enforces that this identifier matches a
 * member of `models`; the type alone cannot.
 */
export const MODEL_CATALOGUE: ModelCatalogue = {
  models: [
    {
      id: 'MDL-LOCAL-L v3',
      label: 'MDL-LOCAL-L v3',
      version: 'v3',
      boundary: 'in-boundary',
    },
    {
      id: 'MDL-EXTRACT v2',
      label: 'MDL-EXTRACT v2',
      version: 'v2',
      boundary: 'in-boundary',
    },
    {
      id: 'MDL-CLASSIFY v1.4',
      label: 'MDL-CLASSIFY v1.4',
      version: 'v1.4',
      boundary: 'in-boundary',
    },
    // The only entry whose answers would be composed outside the declared boundary, which is why
    // POL-007 can block it for a context carrying customer-confidential or eu-only material.
    {
      id: 'EXT-REASONING-01',
      label: 'EXT-REASONING-01',
      version: '01',
      boundary: 'external',
    },
  ],
  defaultModelId: 'MDL-LOCAL-L v3',
};
