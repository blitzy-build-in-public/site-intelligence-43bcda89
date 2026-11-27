/**
 * The demonstration-only capability the service port does not carry: the role switch behind
 * `src/app/role-switcher.tsx` (AAP 0.12.1 "Demonstration capability" row, AAP 0.6.2).
 *
 * Why it lives outside the port. `platform-contracts.md` §2 fixes `SiteIntelligenceService` method
 * for method and declares no role-setting member, so a `switchRole` added there would stop that
 * interface being the contracts' verbatim one and would leave the port no longer the single
 * vocabulary screens and adapters share (rule P-2). The capability is therefore declared once, here,
 * beside the port rather than inside it: the mock adapter implements it from its own state, and
 * `src/services/create-service.ts` exposes it next to the bound port when the adapter has it. The
 * port keeps its own two demonstration members — the simulation trigger and the demo reset, both of
 * which §2 declares — and neither is restated here, and neither is wrapped, so there is exactly one
 * declaration of each and one import path to it.
 *
 * What the switch is. A demonstration control, and nothing more. It changes which of the eight
 * seeded personas the adapter acts as; it grants no right of its own, because the adapter evaluates
 * the contracts §7.1 permission matrix and the policy engine against the acting persona for every
 * call, and applies that role's plant scope before it answers (AAP 0.6.3, AAP 0.2.1). A caller that
 * switched to a wider role and then called a member the role lacks is refused with a `Problem` whose
 * `type` is `'permission'`, so bypassing the visible control changes nothing about what the service
 * returns. Because that enforcement runs in the browser, the checks behind it are a demonstration
 * and are not production authorisation: the role switcher carries the statement on screen where the
 * control is offered, and the README repeats it under its own heading (rule P-3).
 *
 * A deployment replaces this capability rather than porting it: real identity and real
 * authorisation replace the seeded personas and the browser-side matrix, and the screens that call
 * the port keep calling it unchanged. That replacement is why the capability is a separate contract
 * instead of a member the production port would have to keep satisfying.
 *
 * This module is a declaration and nothing else. It holds no state, selects no persona, appends no
 * audit event and imports nothing but types, so under `verbatimModuleSyntax` every import here is
 * type-only and the module emits no runtime code. It reads no environment variable and carries no
 * credential (rule B-2), reaches no seed record, adapter, domain module or React, and writes no
 * number, identifier or string of its own (rule P-6).
 */

import type { ActiveUser, UserId } from '../types';
import type { Result } from '../types/service';

/* ---------------------------------------------------------------------------------------------
 * The capability — AAP 0.12.1, AAP 0.6.2, platform-contracts.md §6 and §7.1
 * ------------------------------------------------------------------------------------------- */

/**
 * The role switch the demonstration offers, exposed by `src/services/create-service.ts` beside the
 * bound port and driven by the shell's role switcher.
 *
 * One member only. It is asynchronous because a switch is a recorded act: the adapter appends the
 * audit event contracts §6 defines for a persona change, so the resulting identity and its record
 * settle together and a caller cannot read a switched identity beside an event that was never
 * written.
 */
export interface DemonstrationControls {
  /**
   * Acts as another of the seeded personas for the rest of the session.
   *
   * The adapter takes the persona from its own state rather than from a caller's claim, so every
   * read and write after this call is evaluated against the new role's permissions and plant scope
   * (contracts §7.1, AAP 0.6.3). The returned record is the persona the session now acts as, whose
   * home route the router reads to re-evaluate where `/` sends the visitor (AAP 0.12.4).
   *
   * @param userId - The identifier of one of the eight seeded personas, `USR-01` to `USR-08`; an
   * identifier that names none of them is refused with a `Problem` whose `type` is `'not-found'`,
   * which leaves the acting persona as it stood.
   * @returns The persona the session now acts as, with the freshness and simulation metadata every
   * result carries, so the switch reaches a screen through the same envelope as every other call.
   * @throws Problem - A refusal names its cause in `type`; `'not-found'` is the one this member
   * raises, for an identifier that matches no seeded persona.
   */
  switchRole(userId: UserId): Promise<Result<ActiveUser>>;
}
