/**
 * The one place a write invalidates the reads it touched: {@link invalidateAfterWrite}, which the owner
 * of every write calls once the port has resolved it.
 *
 * WHY THIS IS A MODULE OF ITS OWN. AAP 0.6.2's data flow fixes the rule — reads are memoised in the
 * React Query cache under `[method, ...args]`, and a write "invalidates the queries it affects" — and
 * `src/app/providers.tsx` creates the client those reads are keyed in. The write itself belongs to a
 * screen or a sub-component, so the invalidation has to be reachable from both without a feature
 * reaching into the shell's provider module: this leaf holds the one helper both sides can name, so
 * the convention has a single implementation instead of one per call site.
 *
 * HOW THE KEY MATCH WORKS. Every entry in the cache is keyed `[method, ...args]` — the port member's
 * own name first, then the arguments that read was made with — so naming a member in `reads`
 * invalidates every entry of that read, under every argument list it was made with: TanStack Query's
 * default match is by key prefix, not by whole key. That is the granularity a write needs, because the
 * adapter's records are shared: a request recorded against one policy moves the ledger counts and the
 * audit trail as well, so a per-argument invalidation would leave the other surfaces serving the
 * payload they cached before the write.
 *
 * WHAT THIS MODULE DOES NOT DO. It reads nothing (rule P-2): the client and the port's member names are
 * both imported as types, so this file adds no runtime edge to the service layer, no seed module, no
 * adapter and no second data boundary. It carries no wording of its own, so it types no figure,
 * amount, identifier, date or persona (rule P-6) and asserts nothing about the deployment (rule P-4).
 * It names no company or product of the real world (rule P-7), makes no request of its own (rule B-1)
 * and reads no configuration (rule B-2).
 */
import type { QueryClient } from '@tanstack/react-query';

import type { SiteIntelligenceService } from '../services/site-intelligence-service';

/**
 * The name of a port member that can hold a cached read.
 *
 * Derived from `SiteIntelligenceService` itself rather than declared as a list of strings, because a
 * cache entry's key and the member a screen read through `useService()` are the same word (AAP 0.6.2).
 * A mistyped read is then a compile error rather than an invalidation that silently matches no entry,
 * and a member that is renamed makes every write that invalidated it fail to compile.
 */
export type CachedPortMethod = keyof SiteIntelligenceService;

/**
 * Invalidates every cached entry of each read a write touched.
 *
 * Called by the owner of a write once the port has resolved it, and before that surface tells its
 * caller the write happened, so the next read of any affected surface goes back through the port
 * rather than serving the payload it cached before the write (AAP 0.6.2).
 *
 * @param queryClient The client the shell created in `src/app/providers.tsx`, read by the component
 *   that made the write through `useQueryClient()`.
 * @param reads The port members the write touched, named by the write's owner. An empty list is a
 *   write that moved no cached read, and invalidates nothing.
 */
export function invalidateAfterWrite(
  queryClient: QueryClient,
  reads: readonly CachedPortMethod[],
): void {
  for (const read of reads) {
    void queryClient.invalidateQueries({ queryKey: [read] });
  }
}
