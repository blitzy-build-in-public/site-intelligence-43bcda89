/**
 * The demonstration-only capability the service port does not carry: the role switch behind
 * `src/app/role-switcher.tsx`, the read of the persona the session acts as, and the roster a switch may
 * name (AAP 0.12.1 "Demonstration capability" row, AAP 0.6.2, AAP 0.6.3 "Identity").
 *
 * Why it sits beside the port rather than inside it: the port carries the contracts' own member set and
 * declares no role-setting member, no read of the acting persona and no roster read, so any one of the
 * three added there would make the port something other than that contract and leave screens and
 * adapters sharing a vocabulary it does not carry (rule P-2). The capability is declared once, here: the
 * mock adapter implements it from its own state and `src/services/create-service.ts` exposes it beside
 * the bound port. The port keeps its own two demonstration members, `setSimulation` and `resetDemo`, and
 * neither is restated or wrapped here, so each has one declaration and one import path.
 *
 * A deployment replaces the capability rather than porting it: real identity and real authorisation
 * replace the seeded personas and the browser-side matrix, and the screens that call the port keep
 * calling it unchanged.
 *
 * This module is a declaration: it holds no state, selects no persona, appends no audit event and
 * imports only types, so under `verbatimModuleSyntax` it emits no runtime code.
 */

import type { ActiveUser, UserId } from '../types';
import type { Result } from '../types/service';

/**
 * The identity surface the demonstration offers, exposed beside the bound port: the role switch, the
 * read of the persona in force and the roster a switch may name, which are the three sides of one
 * identity (AAP 0.12.1, contracts §6 and §7.1). All three are asynchronous because a switch is a
 * recorded act whose event and identity settle together. `listPersonas` alone is optional: an adapter
 * holding no seeded personas has no roster to report, and a caller that finds it absent offers the
 * acting persona alone.
 */
export interface DemonstrationControls {
  /**
   * Acts as another of the eight seeded personas for the rest of the session, and records the change
   * against the persona contracts §6 names for it. The adapter takes the persona from its own state
   * rather than a caller's claim, so every call afterwards is evaluated against the new role's
   * permissions and plant scope (contracts §7.1, AAP 0.6.3).
   *
   * @param userId - The identifier of one of the eight seeded personas, `USR-01` to `USR-08`; an
   * identifier naming none of them is refused with a `Problem` whose `type` is `'not-found'`.
   * @returns The persona the session now acts as, whose home route the router reads to re-evaluate
   * where `/` sends the visitor, in the envelope every result carries.
   * @throws Problem - A refusal names its cause in `type`; `'not-found'` is the one this member raises,
   * and it leaves the acting persona as it stood.
   */
  switchRole(userId: UserId): Promise<Result<ActiveUser>>;

  /**
   * Reads the persona the session is acting as: the seeded persona it opened with or the one the last
   * successful `switchRole` selected, which restoring the records leaves in place because it is the
   * reader's own choice rather than a seeded record. Its role, plant scope and permissions are what
   * every call is authorised against, and the shell seeds the persona it displays from this read, so
   * the persona shown and the persona enforced are one value (AAP 0.6.3, AAP 0.12.4). It needs no
   * permission and appends no audit event: reading who one acts as is not an act contracts §6 records.
   *
   * @returns The persona the session acts as, in the envelope every call returns.
   * @throws Problem - No cause of its own, because the member reports the persona the adapter's state
   * holds and evaluates nothing a caller sent; a state naming no seeded persona is a broken state the
   * adapter reports loudly rather than answering as an identity that does not exist.
   */
  getActiveUser(): Promise<Result<ActiveUser>>;

  /**
   * Reads the personas a role switch may name, in the adapter's own order: the roster the shell's role
   * switcher offers, each record the same `ActiveUser` shape `switchRole` answers with, so a caller
   * builds its options from one read rather than assembling an identity out of parts (rule P-2 keeps a
   * screen out of the seed's user records). It appends no audit event and needs no permission: reading
   * who the demonstration could act as changes nothing about who it does, and a switch to a persona seen
   * here is still evaluated against the matrix and the policy engine (rule P-3).
   *
   * @returns Every persona the adapter can act as, in the order it holds them.
   * @throws Problem - No cause of its own on the in-browser adapter, which reports its own seeded
   * records; a deployment's implementation may refuse the read on its own terms.
   */
  listPersonas?(): Promise<Result<ActiveUser[]>>;
}
