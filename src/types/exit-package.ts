/**
 * Exit package vocabulary: the exit artefact's sections and the package that carries them.
 *
 * Fixing inputs: `platform-contracts.md` §3 declares `ExitPackage` among the core types and
 * directs that it be defined in types next to them, fixing none of its members, so each member
 * is derived from AAP 0.12.2's "exit package sections". AAP 0.12.2, §0.12.3 and §0.14.2 place
 * the package and its screen in stage S5, whose endpoints exist on both adapters for interface
 * conformance and are never invoked, so the module exists so the port type-checks.
 *
 * A section names the records it packages and copies none of them, so the package stays an exit
 * artefact rather than a second source of truth beside the seed records. `generatedAt` is the
 * constant demonstration clock instant of contracts §1, never a system clock read (AAP 0.2.1).
 */

import type { Timestamp } from './primitives';

/**
 * One section of the exit package (AAP 0.12.2): a heading, a summary line and the identifiers it
 * carries.
 */
export interface ExitPackageSection {
  /**
   * Stable identity of the section, so the handler need not rely on list position.
   */
  id: string;

  title: string;

  summary: string;

  /**
   * Identifiers of the records this section packages, already defined elsewhere: references
   * rather than copies, so a corrected record is never contradicted by a stale copy inside the
   * package.
   */
  recordRefs: string[];
}

/**
 * The exit package itself, declared so the service interface can carry the stage S5 endpoint
 * without inventing its vocabulary; no code assembles or displays one.
 */
export interface ExitPackage {
  /**
   * The instant the package was produced, from the demonstration clock and not the system clock.
   */
  generatedAt: Timestamp;

  sections: ExitPackageSection[];
}
