/**
 * The competitive atlas of stage S3: the simulated market-intelligence pack served as the `Atlas`
 * payload SCR-13 renders, and the chokepoint brief that screen offers as a JSON download.
 *
 * Fixing inputs:
 * - AAP 0.12.1's "Handlers" row — one module per read/write family, so the mock adapter stays a thin
 *   dispatcher and the permission and policy checks appear once per family — at the path AAP 0.13.1
 *   gives it in the `handlers/` tree.
 * - AAP 0.8, "First-party and market-intelligence series stay apart": provenance is structural, no
 *   aggregate blends the two families, and the chokepoint table comes from the market pack alone.
 * - AAP 0.10: the three companion strings and the atlas banner — the market-intelligence member of
 *   `SIM_LABELS` on every competitor element, `COMPETITOR_NAME_TAG` on every competitor name, and
 *   `CLIENT_SELF_ASSESSMENT_LABEL` on the client's own radar series, each read from
 *   `src/types/primitives.ts` rather than retyped here.
 * - `platform-contracts.md` §3, as AAP 0.12.2 records the atlas types, every one of which lives in
 *   `src/types/atlas.ts`.
 * - AAP 0.12.3's `GET /market-intelligence/atlas` row: "Forbidden for USR-08, with
 *   `requiredPermission` and `rolesWithPermission` in the `Problem`".
 * - The parent folder brief's `atlas.ts` entry, including its closing requirement that no handler
 *   sums a market-intelligence value with a first-party one (rule P-5).
 *
 * WHAT IT DOES. It copies the seeded pack into the `Atlas` DTO member by member, and supplies the two
 * halves the pack deliberately omits because they are first-party records: the client's own plants,
 * from `state.records.plants`, and the product classes the selector offers, from
 * `state.records.products`. Every measure it publishes — a radar score, a buffer day, an overlap — is
 * the value the pack's record carries; nothing here scores, ranks, averages, rounds or converts, and
 * no field of the payload mixes the two families. It also holds the gate behind SCR-13's chokepoint
 * brief download, so the export is refused exactly where the picture is refused; the file itself is
 * composed once, by the shared builder the assembler in `src/services/mock/exports/` calls.
 *
 * WHERE PROVENANCE IS KEPT, AND WHY THAT IS THE WHOLE POINT (rule P-5). `AtlasSeries.provenance` is a
 * required member of the shared shape, so a series without one does not compile, and the two families
 * are separate members of the payload — `Atlas.clientSites` for the client's own network,
 * `Atlas.competitors` for the competitors' networks — rather than one list with a flag. The client's
 * radar series is labelled with `CLIENT_SELF_ASSESSMENT_LABEL`, which is deliberately outside the
 * seven-value `SimLabel` union, and every competitor series with the market-intelligence member of
 * `SIM_LABELS`; both are copied from the record that owns them, so the fixed text is written once, in
 * `src/types/primitives.ts` (rule P-1). Competitor names are tagged `COMPETITOR_NAME_TAG` by the
 * rendering components, because the atlas shapes carry no tag member and `src/types/atlas.ts` states
 * that the tag is applied where a name is printed; this module types no name and no tag text.
 *
 * WHAT IT REFUSES, AND HOW IT SAYS SO. The atlas read and the brief's export both require
 * `competitive.read`, which the contracts §7.1 matrix grants to the plant manager, the head of supply
 * chain and the platform administrator and to none of the other five roles, so the external supplier
 * engineer is refused — that refusal is AAP 0.12.3's, and the `Problem` carries the permission the
 * role lacks and the roles that hold it, which is what the forbidden card and a disabled control
 * render instead of a bare denial (rule P-8).
 * The simulation's forbidden trigger produces the identical refusal, so the S1 forbidden screen is
 * reachable without a handler branching on the trigger. Both are thrown as `Problem` object literals;
 * a `Problem` carries a correlation identifier the adapter mints, so the literal records the empty
 * string rather than inventing one, exactly as `src/services/api-client/http.ts` does for a failure it
 * detected itself.
 *
 * A THIRD FAILURE THAT IS NOT A `Problem`, ON PURPOSE. A pack whose competitor network or crossing
 * carries a first-party provenance, or whose series carries a label its provenance contradicts, would
 * put a mislabelled element on the radar and the network view — the mix rule P-5 forbids, arriving
 * through the data rather than through the code. That is a broken record set rather than a refused
 * call, so it throws an `Error` and fails the session loudly, as `src/services/mock/mock-state.ts`
 * does when the record set holds no persona. A `Problem` would report it as one call's outcome and
 * leave every later call to render the same mislabelled record.
 *
 * DETERMINISTIC AND SIDE-EFFECT FREE. The same state yields an equal payload on every call: records
 * are copied in the order the pack holds them, every member is written in one fixed order, and no
 * clock, random source, module-level mutable value or accumulator is read. The module performs no
 * I/O — it opens no address (rule B-1), reads no configuration and carries no credential (rule B-2),
 * and writes no console line. Every collection it returns is a fresh array of fresh objects, so a
 * screen that edited a payload would edit its own copy and not the session's records.
 *
 * `getAtlas` is declared asynchronous to match the port's promise-returning read, so the adapter
 * awaits one shape for every call; its body awaits nothing and performs no I/O. The brief's gate is
 * synchronous, because evaluating the matrix and the pack's provenance reads nothing but the state it
 * is handed.
 *
 * Rules this module is built to satisfy:
 * - P-5: the families are separate members, `provenance` is required, the client series and the
 *   competitor series carry their own labels, and the pack's provenance is checked before it is
 *   served.
 * - P-1: every label comes from the fixed vocabulary of `src/types/primitives.ts`; none is retyped
 *   or paraphrased, and the client series carries no second label from the seven-value union beside
 *   its own companion string.
 * - P-6: no currency amount, no record identifier and no expected result is typed here, nothing is
 *   computed, and `tests/fixtures/` is not reached.
 * - P-2: records arrive through `ctx.state` and the sibling `seed-loader.ts`; `src/seed/`, React,
 *   `src/app`, `src/features` and the API client are never imported.
 * - P-3, P-4: the refusal names the permission and its holders and claims nothing about
 *   authorisation, sovereignty, copying or resistance to each of them; the pack is a simulated market
 *   view and is described as nothing more.
 * - P-7: no real competitor, vendor, customer, carmaker or cloud product name appears, and no name
 *   is invented — the competitors are the pack's own synthetic `CMP-` records.
 * - B-1, B-2: no request is made (the pack is seeded, never fetched) and no credential shape or
 *   environment read appears.
 *
 * THE SELECTOR'S PRODUCT CLASS NARROWS NOTHING INSIDE THE PAYLOAD, AND THE READ TAKES NO ARGUMENT.
 * `getAtlas` takes the session and serves the pack whole, because no market-intelligence record
 * carries a product-class member: `CompetitorNetwork`, `AtlasSite`, `AtlasLane`, `Chokepoint` and
 * `AtlasSeries` have none, and a class is an attribute of the client's own `Product` records.
 * Selecting a competitor by a first-party product attribute would be the blend rule P-5 forbids, and
 * narrowing the client's plants by it would need a product-to-line-to-plant join that no input asks
 * the handler for. The whole pack therefore arrives in one payload — which is what the port's own
 * `getAtlas` documentation states it is for, "so the screen's selector switches between the client
 * and a competitor without a second call" — and the selector narrows what the screen draws. If the
 * seed document is supplied with a class on each competitor network, the read gains an argument that
 * filters on that field, and nothing else changes.
 */

import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { ATLAS_PACK_BANNER, CLIENT_SELF_ASSESSMENT_LABEL, SIM_LABELS } from '../../../types';
import type {
  Atlas,
  AtlasSeries,
  AtlasSite,
  CompetitorNetwork,
  Permission,
  Problem,
  Provenance,
  RadarAxis,
  Role,
  SimLabel,
} from '../../../types';
import type { ChokepointRecord, MarketIntelligencePack, Plant } from '../seed-loader';
import { MARKET_PACK_VERSION } from '../seed-loader';
import type { HandlerContext } from '../mock-state';
import { isSimulationOn } from '../simulation';

/* ---------------------------------------------------------------------------------------------
 * Fixed vocabulary — taken from its one owner, never retyped (rules P-1 and P-5)
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission `getAtlas` and the chokepoint brief's export require: the atlas read of contracts
 * §7.1, which AAP 0.12.3 assigns to `GET /market-intelligence/atlas`.
 *
 * Named once so the check, the `Problem` field and the sentence describing the refusal all quote one
 * value, and so a change to the contracts §7.1 row needs one edit here rather than three.
 */
const COMPETITIVE_READ: Permission = 'competitive.read';

/**
 * The label every competitor element carries: `SIM_LABELS[5]`, the vocabulary's market-intelligence
 * member.
 *
 * AAP 0.10 lists the seven labels in this order and `src/types/primitives.ts` holds the same order, so
 * the index is the vocabulary's own position for the label rather than a string this module spells.
 * It is used to check a competitor series carries the right one; the label itself is copied from the
 * series record, which owns it.
 */
const MARKET_INTELLIGENCE_LABEL: SimLabel = SIM_LABELS[5];

/**
 * The provenance a competitor network and a shared crossing must carry.
 *
 * The other two members of `Provenance` describe the client's own records, so a record carrying one of
 * them in the competitors' list or the crossings' list would be a first-party reading drawn and
 * labelled as market intelligence — the blend rule P-5 keeps out of the payload.
 */
const MARKET_INTELLIGENCE: Provenance = 'market_intelligence';

/* ---------------------------------------------------------------------------------------------
 * The refusal the atlas read and the brief's export share — AAP 0.12.3, contracts §7.1, rule P-8
 * ------------------------------------------------------------------------------------------- */

/**
 * The permission failure the atlas and its brief are refused with.
 *
 * Composed as a plain `Problem` object so a caller can narrow on `type` and read the cause without
 * unwrapping an `Error`, and it carries the two members the forbidden card renders: the permission the
 * role lacks and the roles that hold it (rule P-8). The role list comes from `rolesWith`, so the
 * sentence names who may act and cannot drift from the matrix that decided the refusal.
 *
 * `traceId` is the empty string because a handler mints no correlation identifier: the adapter derives
 * the value from its own request counter and reports it in `Meta.traceId`, so a literal here would
 * either duplicate that spelling or invent one. The empty string records that the handler has none to
 * report rather than inventing a value, and the adapter is the one place that fills it in.
 */
function competitiveReadRefusal(ctx: HandlerContext): Problem {
  const rolesWithPermission: Role[] = rolesWith(COMPETITIVE_READ);

  return {
    type: 'permission',
    message:
      `Reading the simulated market-intelligence pack requires the ${COMPETITIVE_READ} permission, ` +
      `and the ${ctx.actor.role} role does not hold it. The roles that hold it are ` +
      `${rolesWithPermission.join(', ')}.`,
    traceId: '',
    requiredPermission: COMPETITIVE_READ,
    rolesWithPermission,
  };
}

/**
 * Refuses the call when the acting persona may not read the pack, or when the simulation's forbidden
 * trigger is in effect.
 *
 * The matrix is evaluated by `hasPermission`, not by reading `actor.permissions`, so the refusal comes
 * from the one authority both adapters share (AAP 0.6.2). The atlas read is not plant-scoped — the pack
 * describes competitors rather than a record of the client's own — so the subject is `null`. The
 * forbidden trigger produces the same `Problem` rather than a different one, so the screen state the
 * popover demonstrates is the state a real refusal produces.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @throws Problem - `type: 'permission'`, carrying the permission and the roles that hold it.
 */
function assertCompetitiveRead(ctx: HandlerContext): void {
  const refusedByControl = isSimulationOn(ctx.state, 'forbidden');
  const refusedByMatrix = !hasPermission(ctx.actor.role, COMPETITIVE_READ, null, ctx.actor);

  if (refusedByControl || refusedByMatrix) {
    throw competitiveReadRefusal(ctx);
  }
}

/* ---------------------------------------------------------------------------------------------
 * The pack's provenance, checked before it is served — rule P-5
 * ------------------------------------------------------------------------------------------- */

/**
 * Fails loudly when the seeded pack would put a mislabelled element on a screen.
 *
 * Two properties are checked, and both are properties of the data rather than of this call, which is
 * why a breach throws an `Error` instead of returning a `Problem`:
 *
 * 1. Every competitor network and every shared crossing carries `market_intelligence`. Either one
 *    carrying a first-party or computed provenance would be drawn as a competitor while the interface
 *    labelled it with the client's own reading, which is the mix rule P-5 forbids (AAP 0.8).
 * 2. Every series carries the label its provenance requires: a market-intelligence series the
 *    market-intelligence member of `SIM_LABELS`, and a first-party series
 *    `CLIENT_SELF_ASSESSMENT_LABEL`. A computed series is not checked, because the vocabulary fixes no
 *    companion label for one and no series of that provenance is defined to be served.
 *
 * The messages quote the offending record's own identifier and provenance, both interpolated, so the
 * report points at the record to fix without an identifier being written in this file.
 *
 * @param pack - The seeded market-intelligence pack the call is about to serve.
 * @throws Error - A competitor network or crossing is not market intelligence, or a series' label
 *   contradicts its provenance.
 */
function assertPackProvenance(pack: MarketIntelligencePack): void {
  for (const network of pack.competitors) {
    if (network.provenance !== MARKET_INTELLIGENCE) {
      throw new Error(
        `The market-intelligence pack records competitor network ${network.competitorId} with ` +
          `provenance ${network.provenance}. A competitor network must be ${MARKET_INTELLIGENCE}, ` +
          'because it is drawn as a competitor and labelled as market intelligence.',
      );
    }
  }

  for (const crossing of pack.chokepoints) {
    if (crossing.provenance !== MARKET_INTELLIGENCE) {
      throw new Error(
        `The market-intelligence pack records chokepoint ${crossing.id} with provenance ` +
          `${crossing.provenance}. A shared crossing must be ${MARKET_INTELLIGENCE}, because its ` +
          'overlap and buffer days are market intelligence and it is labelled as such.',
      );
    }
  }

  for (const series of pack.radarSeries) {
    if (series.provenance === MARKET_INTELLIGENCE && series.simLabel !== MARKET_INTELLIGENCE_LABEL) {
      throw new Error(
        `The market-intelligence pack records series ${series.id} with provenance ` +
          `${MARKET_INTELLIGENCE} and the label ${series.simLabel}, and a competitor series must ` +
          `carry ${MARKET_INTELLIGENCE_LABEL}.`,
      );
    }

    if (series.provenance === 'first_party' && series.simLabel !== CLIENT_SELF_ASSESSMENT_LABEL) {
      throw new Error(
        `The market-intelligence pack records series ${series.id} with provenance ` +
          `${series.provenance} and the label ${series.simLabel}, and the client's own series must ` +
          `carry ${CLIENT_SELF_ASSESSMENT_LABEL}.`,
      );
    }
  }
}

/* ---------------------------------------------------------------------------------------------
 * One element of the payload — every member copied, no value derived (rules P-5 and P-6)
 * ------------------------------------------------------------------------------------------- */

/**
 * The client's own side of the overlay: one plant, as the atlas draws it.
 *
 * `competitorId` is `null`, which is how a site of the client's own network is told apart from a
 * competitor's site on one shared shape. The label is the plant's own name and the coordinates are the
 * plant record's, so nothing is placed or named here.
 *
 * @param plant - One plant of the client's seeded network.
 * @returns The plant as an atlas site.
 */
function clientSiteOf(plant: Plant): AtlasSite {
  return {
    id: plant.id,
    competitorId: null,
    label: plant.name,
    latitude: plant.latitude,
    longitude: plant.longitude,
  };
}

/**
 * One competitor network, copied member by member.
 *
 * Composed rather than spread so the key order of every site and lane is fixed by this function, and
 * so each nested record is a fresh object: a screen that edited a returned site would edit its own
 * copy rather than the session's seeded record (contracts §1 keeps the state in memory until a reset).
 * The provenance is copied, not assumed, so the payload says where the network came from.
 *
 * @param network - One competitor network of the pack.
 * @returns The network as the atlas publishes it.
 */
function competitorNetworkOf(network: CompetitorNetwork): CompetitorNetwork {
  return {
    competitorId: network.competitorId,
    label: network.label,
    provenance: network.provenance,
    sites: network.sites.map((site) => ({ ...site })),
    lanes: network.lanes.map((lane) => ({ ...lane })),
  };
}

/**
 * One shared crossing, copied with the pack's own record members.
 *
 * The pack's crossings extend the shared `Chokepoint` shape with the crossing's map position and with
 * the client's own network positions that route through it, which
 * `src/seed/market-intelligence.ts` declares for the S3 canvas's chokepoint halos. They are carried
 * through unchanged rather than dropped at the service boundary — `ChokepointRecord` extends
 * `Chokepoint`, so the atlas shape accepts a record that adds them — while the buffer map is copied so
 * a screen cannot write into the session's record.
 *
 * @param crossing - One crossing of the pack.
 * @returns The crossing as the atlas publishes it.
 */
function atlasCrossingOf(crossing: ChokepointRecord): ChokepointRecord {
  return {
    ...crossing,
    competitorBufferDays: { ...crossing.competitorBufferDays },
  };
}

/**
 * One radar axis, copied.
 *
 * The axes' order is the order every series' `values` array aligns to, so the list is copied in the
 * order the pack holds it and never re-ordered: a re-ordered axis list would silently relabel a score,
 * which is the property `src/types/atlas.ts` documents for `AtlasSeries.values`.
 *
 * @param axis - One axis of the pack.
 * @returns The axis as the atlas publishes it.
 */
function radarAxisOf(axis: RadarAxis): RadarAxis {
  return { id: axis.id, label: axis.label };
}

/**
 * One radar series, copied with its provenance, its label and a copy of its scores.
 *
 * Both the provenance and the label are the record's own, which is what keeps the client's
 * self-assessment and the competitors' estimates apart inside one list (rule P-5), and the label is
 * copied rather than re-derived so the fixed string stays with the record that owns the reading
 * (rule P-1). The scores are copied so the payload cannot be used to write into the seeded record.
 *
 * @param series - One series of the pack.
 * @returns The series as the atlas publishes it.
 */
function radarSeriesOf(series: AtlasSeries): AtlasSeries {
  return {
    id: series.id,
    label: series.label,
    provenance: series.provenance,
    simLabel: series.simLabel,
    values: [...series.values],
  };
}

/* ---------------------------------------------------------------------------------------------
 * The atlas read — AAP 0.12.3, contracts §3, AAP 0.12.4 SCR-13
 * ------------------------------------------------------------------------------------------- */

/**
 * Reads the competitive atlas: the pack's banner, the selector's product classes, the client's own
 * sites and the competitors' networks, the four shared crossings, the five radar axes and the four
 * series, each labelled.
 *
 * The payload is assembled from three record sets and adds nothing of its own: the banner is
 * `ATLAS_PACK_BANNER`, the release label beside it is `MARKET_PACK_VERSION`, the product classes are
 * the identifiers of the client's own products, the client's sites are its plants, and everything else
 * is the pack's records copied member by member. The banner is taken from the constant rather than from
 * the pack's `packLabel` slot so the fixed string has one owner and the payload carries it even if a
 * record were mis-seeded without it; the release label travels with the atlas so the chokepoint brief
 * can be composed over this read alone, by both adapters (AAP 0.12.1 "Exports" row).
 *
 * The read takes the session and nothing else, and serves the pack whole for the reason the module
 * header records: no market-intelligence record carries a product-class member, so narrowing a
 * competitor by a first-party product attribute would be the blend rule P-5 forbids. The SCR-13
 * selector narrows what the screen draws — the entity list and the statements beside it — and never
 * what this read returns.
 *
 * Two calls over one session return equal payloads: the records are read in the order the pack holds
 * them and nothing is accumulated, ordered by a derived key or read from a clock.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @returns The atlas payload SCR-13 renders.
 * @throws Problem - `type: 'permission'` when the persona may not read the pack or the simulation's
 *   forbidden trigger is set.
 * @throws Error - The seeded pack would put a mislabelled element on screen (see
 *   `assertPackProvenance`).
 */
export async function getAtlas(ctx: HandlerContext): Promise<Atlas> {
  assertCompetitiveRead(ctx);

  const records = ctx.state.records;
  const pack = records.marketIntelligence;

  assertPackProvenance(pack);

  const productClasses = records.products.map((product) => product.id);

  return {
    packLabel: ATLAS_PACK_BANNER,
    packVersion: MARKET_PACK_VERSION,
    productClasses,
    clientSites: records.plants.map(clientSiteOf),
    competitors: pack.competitors.map(competitorNetworkOf),
    chokepoints: pack.chokepoints.map(atlasCrossingOf),
    radarAxes: pack.radarAxes.map(radarAxisOf),
    radarSeries: pack.radarSeries.map(radarSeriesOf),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The chokepoint brief's gate — AAP 0.12.4 SCR-13, AAP 0.12.3, rule P-5
 * ------------------------------------------------------------------------------------------- */

/**
 * The gate behind SCR-13's "Export the chokepoint brief as JSON".
 *
 * The export is the atlas family's own, so its gate is the atlas read's: the persona must hold
 * `competitive.read` — or the simulation's forbidden trigger must be in effect, which produces the
 * identical refusal — and the pack must be market-intelligence only, in every network, every crossing
 * and every series. Those are the two checks `getAtlas` performs before it serves the picture, so the
 * export is refused exactly where the picture is refused and the external supplier engineer, whom
 * AAP 0.12.3 forbids the read, reaches neither.
 *
 * Composing the document is not this module's work. The assembler
 * `src/services/mock/exports/chokepoint-brief.ts` calls the builder both adapters share, over the same
 * session pack this guard inspects, so the file cannot disagree with the atlas on screen (AAP 0.12.1
 * "Exports" row). The adapter calls this once per export and then composes once, which is why the
 * guard returns nothing: the value the file is built from is the pack the assembler reads, not a
 * payload composed a second time here.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @throws Problem - `type: 'permission'` when the persona may not read the pack or the simulation's
 *   forbidden trigger is set, carrying the permission the role lacks and the roles that hold it.
 * @throws Error - The seeded pack would put a mislabelled element in the file (see
 *   `assertPackProvenance`).
 */
export function assertChokepointBriefReadable(ctx: HandlerContext): void {
  assertCompetitiveRead(ctx);
  assertPackProvenance(ctx.state.records.marketIntelligence);
}
