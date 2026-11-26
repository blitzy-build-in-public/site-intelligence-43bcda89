/**
 * Exit package vocabulary: the sections a deployment hands over as an exit
 * artefact, and the package that carries them.
 *
 * Fixing inputs:
 * - `platform-contracts.md` §3 declares `ExitPackage` among the core types and
 *   directs that it be defined in types next to them, fixing none of its
 *   members. AAP 0.12.2 names "the exit package sections" as the type's
 *   content, so each member below is derived from that statement alone.
 * - AAP 0.12.3 and 0.14.2 place the exit package and its screen in stage S5,
 *   which this run does not build: the port's S5 endpoints exist on both
 *   adapters for interface conformance and are never invoked, and the route
 *   renders the stage notice. This module therefore exists so the port
 *   type-checks; no screen, handler or download builder consumes it yet.
 *
 * A section names the records it packages and holds none of their content, so
 * the package stays an exit artefact rather than a second rendering of the
 * workspace or a second source of truth beside the seed records.
 *
 * OPEN ITEM: the section list, each section's heading and the order the screen
 * prints the sections in are seed record content; this module deliberately
 * types none of them, so the seed remains their single source (rule P-6).
 * OPEN ITEM: `generatedAt` must be the constant demonstration clock instant of
 * contracts §1 rather than a reading of the system clock, which no type can
 * enforce; the handler supplies the constant value (AAP 0.2.1, determinism).
 * OPEN ITEM: the package carries no manifest, preview, licensing or packaging
 * format shape. Each belongs to a screen this run does not build, and declaring
 * one here would describe behaviour no input fixes.
 */

import type { Timestamp } from './primitives';

/**
 * One section of the exit package.
 *
 * The screen prints the sections in the order the package lists them, and each
 * section states what it packages in words a reader can act on: a heading, one
 * summary line, and the identifiers of the records the section carries.
 */
export interface ExitPackageSection {
  /**
   * Stable identity of the section within the package, so the handler can
   * assemble the package from mutable state without relying on list position.
   */
  id: string;

  /**
   * Printable heading the screen prints above the section's summary line.
   */
  title: string;

  /**
   * The single line a reader sees under the heading, describing what the
   * section packages.
   */
  summary: string;

  /**
   * Identifiers of the records this section packages — an exception, an audit
   * event, an evidence pin or their kin, already defined elsewhere. These are
   * references rather than copies, so a record corrected in the workspace is
   * never contradicted by a stale copy inside the package.
   */
  recordRefs: string[];
}

/**
 * The exit package itself.
 *
 * It exists so the service interface can declare the stage S5 exit-package
 * endpoint without inventing its vocabulary; nothing in this run assembles or
 * displays one.
 */
export interface ExitPackage {
  /**
   * The instant the package was produced, taken from the demonstration clock
   * rather than the system clock, so the same demonstration state always
   * produces the same package.
   */
  generatedAt: Timestamp;

  /**
   * Every section the package carries, in the order the screen prints them.
   */
  sections: ExitPackageSection[];
}
