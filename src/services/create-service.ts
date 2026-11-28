/**
 * The one binding point of the service port: this module decides which adapter implements
 * `SiteIntelligenceService`, and it is the only place in the application that constructs one (rule
 * P-2, AAP 0.6.2, AAP 0.12.1 "Adapter selection", AAP 0.13.2 "Contract surface").
 *
 * WHAT IT EXPORTS, AND WHY EACH NAME EXISTS. Three functions over one module-scope instance.
 *
 * - `createService` returns the bound adapter, constructing it on the first call and the same instance
 *   afterwards. The in-browser adapter hashes the seeded audit trail in a bootstrap its own
 *   constructor starts, so one instance per page is one session as well as one hashing pass; a second
 *   instance would be a second session, which a suite comparing a reset session against a fresh one
 *   needs and which the application itself never wants.
 * - `getDemonstrationControls` returns the bound adapter as `DemonstrationControls` when it carries
 *   the capability, and `null` when it does not, so the role switcher can disable itself with an
 *   explanation instead of assuming the capability is there (rule P-8).
 * - `whenServiceReady` settles when the bound adapter can answer its first call, so the provider holds
 *   the shell skeleton until the records are loaded rather than letting a screen read a half-built
 *   session.
 *
 * THE ONE-PROVIDER CHANGE. Swapping the in-browser adapter for a real service is one file and two
 * lines, both in this module: the import at the top of it, retargeted from `./mock/mock-backend` to
 * `./api-client/api-client`, and the assignment inside `createService`, where `new ApiClient()` in
 * place of `new MockBackend()` binds the unconnected HTTP adapter of `src/services/api-client/`. No
 * screen, component, feature or shell module changes with either line (AAP 0.6.2, success criterion 8).
 * Nothing branches on a flag, a query parameter or a configuration value to decide which adapter is
 * bound, so the application cannot start half-bound: exactly one adapter is constructed, and it is
 * the one written on that line.
 *
 * THE BINDING ALSO REPORTS ITS WRITES. The adapter is wrapped in `withWriteReporting` before it is
 * bound, so every resolved write announces the reads it moved to the write-reads channel of
 * `./write-reads` — the map AAP 0.6.2 states and contracts §6's audit chain implies for every audited
 * action. That report is what lets the cache learn of a write whose own screen has unmounted, and it
 * costs the swap nothing: `withWriteReporting` takes the adapter and answers the port, so replacing
 * `new MockBackend()` with `new ApiClient()` inside the wrapper leaves the two lines above as the whole
 * change (AAP §0.6.2, AAP §0.12.1 "Adapter selection").
 *
 * WHY TWO OF THE THREE EXPORTS ARE NOT PORT MEMBERS. `SiteIntelligenceService` is the port, the
 * application's one shared contract between screens and adapters, whose derivation from the contracts'
 * capabilities is recorded at the port's own header. It declares neither a readiness promise nor a
 * role-setting member. The role switch is a demonstration capability declared beside the port in
 * `src/services/demonstration-controls.ts`, and readiness is a property of one adapter's construction
 * rather than of the contract it satisfies. Both are therefore detected on the bound value rather than
 * added to an interface that would then carry members no caller of the port reads, and both answer for
 * an adapter carrying neither: the capability accessor returns `null`, and readiness resolves
 * immediately.
 *
 * WHAT IT DOES NOT DO. It reads no configuration, environment variable or credential and holds none,
 * because which adapter is bound is a code constant rather than a setting (rule B-2). It names no
 * host, port or address (rule B-1). It imports no seed record, computes no figure, identifier or amount
 * and enforces no permission or policy: the adapter owns the state, the matrix, the policies and the
 * chain, and this module only selects it (rules P-2, P-6). The role switch it exposes is a
 * demonstration control — the permission checks behind it run in the browser of a build with no
 * backend, no sign-in and no session, so they are not production authorisation, which the switcher
 * states on screen and the README repeats (rule P-3). Nothing here claims that the selection, the
 * adapter or the readiness step establishes a configuration, prevents a copy or defeats an edit: the
 * chain and the controls that show it carry their own label where they surface (rule P-4).
 *
 * The product is Site Intelligence and its workspace is the FileMap canvas (rule P-7).
 */

import { MockBackend } from './mock/mock-backend';
import type { DemonstrationControls } from './demonstration-controls';
import type { SiteIntelligenceService } from './site-intelligence-service';
import { withWriteReporting } from './write-reads';

/* ---------------------------------------------------------------------------------------------
 * The bound adapter — AAP 0.12.1 "Adapter selection", AAP 0.6.2, rule P-2
 * ------------------------------------------------------------------------------------------- */

/**
 * The page's single service instance, constructed by the first `createService` call and returned
 * unchanged by every later one.
 *
 * Module scope rather than a field of the provider, because the instance outlives a provider's
 * re-render: the adapter's bootstrap promise has to be the same promise across renders, so a boundary
 * awaiting readiness sees one pending state rather than a fresh pass over the trail each time it
 * renders.
 *
 * The lifetime is not a correctness hazard for a caller that wants a first-visit session, because
 * `resetDemo()` on the port is how a caller restores the seeded state (AAP 0.12.1).
 */
let boundService: SiteIntelligenceService | null = null;

/**
 * Returns the bound service adapter, constructing it on the first call.
 *
 * This module is the whole of the one-provider change (AAP 0.6.2, success criterion 8): binding the
 * other adapter takes two lines here — the import at the top of the file, retargeted to that adapter,
 * and the assignment below — and nothing else in the application moves.
 *
 * @returns The session's `SiteIntelligenceService`, the same instance on every call.
 */
export function createService(): SiteIntelligenceService {
  if (boundService === null) {
    // The single binding point of rule P-2, and one of the two lines the swap takes: the import at the
    // top of this file is retargeted from `MockBackend` to `ApiClient`, and `new ApiClient()` in place
    // of `new MockBackend()` on this line points the application at the unconnected HTTP adapter of
    // `src/services/api-client/`. No screen, component, feature or shell module changes with either of
    // the two lines (AAP 0.6.2, AAP 0.12.1 "Adapter selection").
    //
    // The wrapper reports each resolved write's moved reads to `./write-reads`, which is how the cache
    // hears of a write whose own screen has gone (AAP §0.3.2, AAP §0.6.2). It takes the adapter and
    // answers the port, so the swap above replaces this line's constructor and nothing else.
    const service: SiteIntelligenceService = withWriteReporting(new MockBackend());

    boundService = service;
  }

  return boundService;
}

/* ---------------------------------------------------------------------------------------------
 * The demonstration capability — AAP 0.12.1 "Demonstration capability", AAP 0.6.2, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * Decides whether a value carries the demonstration capability, by the members the capability declares
 * rather than by the adapter's class.
 *
 * A run-time check rather than a cast, because the port says nothing about the capability: a value
 * carrying it can be handed back as `DemonstrationControls`, and one without it is reported as absent
 * instead of failing when the role switcher or the start-up identity read is used. Both members are
 * looked up with `in` and then checked with `typeof`, so a value carrying a non-callable `switchRole`
 * or `getActiveUser` is not mistaken for one that implements the interface, and a value carrying only
 * one of the two is not handed back as a capability whose other half a caller would then call into
 * nothing.
 */
function isDemonstrationControls(candidate: unknown): candidate is DemonstrationControls {
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    !('switchRole' in candidate) ||
    !('getActiveUser' in candidate)
  ) {
    return false;
  }

  const { switchRole, getActiveUser } = candidate;

  return typeof switchRole === 'function' && typeof getActiveUser === 'function';
}

/**
 * Returns the bound adapter's demonstration capability, or `null` when the bound adapter carries none.
 *
 * The capability — the role switch and the read of the persona the session acts as — is a
 * demonstration contract and not a member of the port (rule P-3,
 * `src/services/demonstration-controls.ts`). This accessor is where a caller learns whether the bound
 * adapter has it: the in-browser adapter does, and the unconnected HTTP client leaves identity to the
 * service it addresses, so it does not. A `null` is what lets the role switcher render disabled with
 * the reason the adapter gives rather than assume a capability that may not be there (rule P-8), and
 * what tells the boundary that a session has no start-up persona to seed the shell with.
 *
 * @param service - The bound service to read the capability from, defaulting to the session's own.
 * @returns The capability when the adapter implements it, otherwise `null`.
 */
export function getDemonstrationControls(
  service: SiteIntelligenceService = createService(),
): DemonstrationControls | null {
  return isDemonstrationControls(service) ? service : null;
}

/* ---------------------------------------------------------------------------------------------
 * Readiness — AAP 0.2.1, AAP 0.12.1 "Provider"
 * ------------------------------------------------------------------------------------------- */

/**
 * The non-port readiness handshake an adapter may carry: one member that settles when the adapter can
 * answer its first call.
 *
 * Declared here rather than on `SiteIntelligenceService`, because readiness is a property of one
 * adapter's construction and the port is the application's one shared contract between screens and
 * adapters, derived from the contracts' capabilities as its own header records. The in-browser adapter
 * is the one that carries it: its constructor starts hashing the 200 seeded audit events through the
 * platform's own Web Crypto, and this is the promise that pass settles.
 */
interface ReadinessAware {
  /** Resolves once the adapter can answer a call, and rejects if its own start-up failed. */
  whenReady(): Promise<void>;
}

/**
 * Decides whether a value carries the readiness handshake, by the member it declares and by that
 * member's callability rather than by the adapter's class.
 */
function isReadinessAware(candidate: unknown): candidate is ReadinessAware {
  if (typeof candidate !== 'object' || candidate === null || !('whenReady' in candidate)) {
    return false;
  }

  const { whenReady } = candidate;

  return typeof whenReady === 'function';
}

/**
 * Settles when the bound adapter can answer its first call.
 *
 * The provider awaits this before it renders a screen, so no read meets records that are not loaded or
 * audit events that carry no hash (AAP 0.2.1). An adapter without the handshake — the unconnected HTTP
 * client has none, because a real service's own readiness is the network's — resolves on the next
 * microtask rather than delaying the first render.
 *
 * A start-up failure is reported by the returned promise's rejection, which is the failure path the
 * provider renders; this function adds no fallback, because a session that could not hash its trail is
 * not a session a screen should read.
 *
 * @param service - The bound service to wait for, defaulting to the session's own.
 * @returns A promise that settles when the adapter is ready.
 */
export function whenServiceReady(
  service: SiteIntelligenceService = createService(),
): Promise<void> {
  if (!isReadinessAware(service)) {
    return Promise.resolve();
  }

  return Promise.resolve(service.whenReady());
}
