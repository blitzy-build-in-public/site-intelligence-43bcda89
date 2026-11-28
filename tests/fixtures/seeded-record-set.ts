/**
 * The seeded record set, reached for the two domain suites that compare the seed's own output
 * against the fixtures beside this file. AAP 0.8 makes those comparisons, AAP 0.2.1, 0.13.2 and
 * 0.18.1 forbid a `src/domain` file from importing `src/services`, and rule P-2 leaves the loader
 * the one door to `src/seed/`; this accessor holds that single dependency inside `tests/`, where
 * the AAP puts the fixtures a suite reads, so the domain folder names neither, and it types no
 * figure or record value of its own (rule P-6).
 */

import { loadSeed } from '../../src/services/mock/seed-loader';

/**
 * A fresh copy of every seeded record set, exactly as the mock adapter's loader hands one over.
 * The return type is the loader's own, derived rather than restated, so a record set the seed
 * gains or renames reaches both suites without an edit here.
 */
export function loadSeededRecordSet(): ReturnType<typeof loadSeed> {
  return loadSeed();
}
