/**
 * The demonstration-only capability the service port does not carry: the role switch behind
 * `src/app/role-switcher.tsx`, the read of the persona the session acts as, and the roster a switch
 * may name (AAP 0.12.1 "Demonstration capability" row, AAP 0.6.2, AAP 0.6.3 "Identity").
 *
 * Three members, and the source each one answers to. This interface declares `switchRole`,
 * `getActiveUser` and an optional `listPersonas`. The AAP 0.12.1 row names `switchRole` as the
 * capability the port does not carry; the two reads beyond it are each required by a source this
 * module cannot otherwise satisfy. Rule P-2 forbids a shell component reaching `src/seed`, and the
 * role switcher takes no props, so `listPersonas` is the only route by which the control can offer
 * the personas a switch may name. A policy page has to report the decision the adapter will take
 * after a switch, so `getActiveUser` re-reads the persona the adapter is enforcing rather than
 * reporting a copy of its own (AAP 0.12.4).
 *
 * Why it lives outside the port. The port carries the contracts' own member set, whose derivation
 * from the contracts' capabilities is recorded at its header (AAP 0.1, AAP 0.6.2), member by member
 * and each against the input that names the capability, and it declares no role-setting member, no
 * read of the acting persona and no roster read, so any one of the three added there would make the
 * port something other than that contract and would leave screens and adapters sharing a vocabulary
 * the contract does not carry (rule P-2). The capability is therefore declared once, here, beside
 * the port rather than inside it: the mock adapter implements it from its own state, and
 * `src/services/create-service.ts` exposes it next to the bound port when the adapter has it. The
 * port keeps its own two demonstration members — the simulation trigger and the demo reset, both of
 * which AAP 0.6.2 places on the port — and neither is restated here, and neither is wrapped, so
 * there is exactly one declaration of each and one import path to it.
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
 * The identity surface the demonstration offers, exposed by `src/services/create-service.ts` beside
 * the bound port: the role switch the shell's role switcher drives, the read of the persona the
 * session is acting as, and the roster a switch may name.
 *
 * Three members, because one identity has three sides. A switch changes which persona the session
 * acts as and records the change; the read reports the persona the adapter is enforcing, so the
 * shell takes the role it displays from the same value the adapter authorises against; and the
 * roster reports the personas a switch may name, which is the only way a caller can offer a choice
 * without reading the seed's user records itself (rule P-2). The AAP 0.12.1 row names `switchRole`
 * alone as the capability the port does not carry; the module note above says why the two reads stand
 * beside it and why none of the three can move onto the port, whose member set is the contracts' own
 * and whose derivation is recorded at its header (AAP 0.1, AAP 0.6.2). All three are asynchronous,
 * and for the same reason: a switch is a recorded act, so the adapter appends the audit event
 * contracts §6 defines for a persona change and the resulting identity settles together with its
 * record, so a caller cannot read a switched identity beside an event that was never written; and
 * the two reads are served through the envelope every member returns.
 *
 * The roster is the one optional member. An adapter that carries no seeded personas — the
 * unconnected HTTP client, whose service knows its caller from a real session — leaves it absent,
 * and a caller that finds it absent offers the acting persona alone rather than assuming a list it
 * was never given. Declaring it optional is also what keeps a test double carrying only the switch
 * and the read assignable to this interface.
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

  /**
   * Reads the persona the session is acting as.
   *
   * The record is the adapter's own resolution of the persona it enforces: the seeded persona the
   * session opened with, or the one the last successful `switchRole` selected — and restoring the
   * demonstration's records leaves that persona in place, because it is the reader's own choice rather
   * than a seeded record, so the read keeps answering with it. Its role, its plant scope and its
   * permissions are therefore the ones a call is authorised against rather than a parallel copy the
   * interface keeps, which is what AAP 0.6.3's "Identity" row describes: the adapter holds the active
   * user and the interface never decides what a caller may do.
   *
   * This is the read the shell seeds its persona from, and seeding from it is what makes the persona
   * the interface displays and the persona the adapter enforces one value. The theme's default density
   * and the router's entry route follow the persona in force for a fresh session, before anyone has
   * switched (AAP 0.12.4), and a change to the persona — a switch, or the reset that keeps it — is
   * reported by the next read rather than leaving the interface displaying somebody the adapter no
   * longer acts as.
   *
   * Why the read belongs here rather than on the port. The port carries the contracts' own member
   * set, so a member added there would make the port something other than that contract and would
   * leave screens and adapters sharing a vocabulary the contract does not carry (rule P-2). The
   * demonstration's identity surface is declared in this module, and a read of who the session acts as
   * is the other half of the switch that changes it. A deployment replaces the whole capability with
   * real identity and real authorisation: a real service knows its caller from the session that
   * reached it, so no member of the production port reports one.
   *
   * A demonstration read with no gate of its own: the acting persona is the caller's own identity, so
   * asking which persona the session acts as requires no permission and is refused for no role, and
   * it appends no audit event, because reading who one is already acting as is not one of the acts
   * contracts §6 records — contrast `switchRole`, whose event that section fixes.
   *
   * @returns The persona the session acts as, with the freshness and simulation metadata every
   * result carries, so the read reaches a caller through the same envelope as every other call.
   * @throws Problem - No cause of its own: the member reports the persona the adapter's state holds
   * and evaluates nothing a caller sent. A session whose state named no seeded persona is a broken
   * state rather than a caller's mistake, and the adapter reports it loudly instead of answering as
   * an identity that does not exist.
   */
  getActiveUser(): Promise<Result<ActiveUser>>;

  /**
   * Reads the personas a role switch may name, in the adapter's own order.
   *
   * The roster the shell's role switcher offers, declared here because the port carries no read of
   * the seeded personas and rule P-2 forbids a screen or a component reaching them directly. Each
   * record is the same `ActiveUser` shape `switchRole` answers with — the identifier a caller passes
   * back to it, the synthetic name and role the choice is named by, that role's plant scope and
   * permissions, and the home route the router opens for it — so a caller builds its options from
   * one read rather than assembling an identity out of parts.
   *
   * Optional, and absent on an adapter that holds no seeded personas: real identity belongs to the
   * session that reached a real service, so the unconnected HTTP client has no roster to report. A
   * caller that finds the member absent offers the acting persona alone, which is why this member is
   * declared optional rather than required — the alternative would force every adapter to claim a
   * capability it does not have.
   *
   * It appends no audit event and requires no permission: reading who the demonstration could act as
   * changes nothing about who it does act as, and the seeded personas are not a record whose
   * disclosure the permission matrix governs. Nothing about the answer authorises anything: a switch
   * to a persona a caller saw here is still evaluated against the matrix and the policy engine by the
   * adapter, and the checks behind both run in the browser of a build with no backend, so they are a
   * demonstration and not production authorisation (rule P-3).
   *
   * @returns Every persona the adapter can act as, in the order it holds them, in the envelope every
   * call returns.
   * @throws Problem - No cause of its own on the in-browser adapter, which reports its own seeded
   * records; a deployment's implementation may refuse the read on its own terms.
   */
  listPersonas?(): Promise<Result<ActiveUser[]>>;
}
