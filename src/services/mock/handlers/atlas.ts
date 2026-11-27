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
 * - No handler sums a market-intelligence value with a first-party one (rule P-5).
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
 * through the data rather than through the code. The same holds for a pack the selector cannot
 * narrow: a competitor series naming no network the pack holds, or a network stating no product class
 * the atlas offers. Both are broken record sets rather than refused calls, so they throw an `Error`
 * and fail the session loudly, as `src/services/mock/mock-state.ts` does when the record set holds no
 * persona. A `Problem` would report it as one call's outcome and leave every later call to render the
 * same broken record.
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
 *   competitor series carry their own labels, and the pack's provenance and its product-class
 *   classification are both checked before the pack is served.
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
 * THE SELECTOR'S PRODUCT CLASS IS RECORD CONTENT AND A READ ARGUMENT (AAP 0.12.4). The pack's records
 * carry the classification the selector filters on: `CompetitorNetwork.productClasses` states the
 * client product classes a competitor's network competes in, `AtlasSeries.competitorId` names the
 * network a series scores, and {@link assertPackClassification} refuses a pack where either states
 * something the atlas cannot resolve. `getAtlas` accepts an optional class so a caller can name the
 * class it is asking about, and it refuses an unknown one with a `'not-found'` `Problem` naming it; a
 * known class serves the whole payload, because one read answers every class the selector offers —
 * which is what the port's own `getAtlas` documentation states it is for, "so the screen's selector
 * switches between the client and a competitor without a second call". SCR-13 narrows the series,
 * networks, sites and crossings it draws by that classification, so choosing a class changes what the
 * radar, the legend and the network view hold and not only the sentence beside the control (AAP
 * 0.12.4, rule P-8). No figure crosses the families while it does: the class classifies a competitor
 * rather than stating a first-party reading of one, so the blend rule P-5 is untouched.
 */

import { hasPermission, rolesWith } from '../../../domain/policy/permissions';
import { ATLAS_PACK_BANNER, CLIENT_SELF_ASSESSMENT_LABEL, SIM_LABELS } from '../../../types';
import type {
  Atlas,
  AtlasSeries,
  AtlasSite,
  CompetitorId,
  CompetitorNetwork,
  Permission,
  Problem,
  ProductId,
  Provenance,
  RadarAxis,
  Role,
  SimLabel,
} from '../../../types';
import type { ChokepointRecord, MarketIntelligencePack, Plant } from '../seed-loader';
import { MARKET_PACK_VERSION } from '../seed-loader';
import type { HandlerContext } from '../mock-state';
import { demonstrationForbiddenReason, isSimulationOn } from '../simulation';

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
 * role lacks and the roles that hold it (rule P-8). The role list comes from `rolesWith`, so the list
 * cannot drift from the matrix that decided the refusal, while the sentence arrives whole from the
 * caller because the demonstration's refusal and the matrix's denial state different facts.
 *
 * `traceId` is the empty string because a handler mints no correlation identifier: the adapter derives
 * the value from its own request counter and reports it in `Meta.traceId`, so a literal here would
 * either duplicate that spelling or invent one. The empty string records that the handler has none to
 * report rather than inventing a value, and the adapter is the one place that fills it in.
 *
 * @param message The refusal in plain words, true of the cause being reported.
 * @returns The failure to throw.
 */
function competitiveReadRefusal(message: string): Problem {
  const rolesWithPermission: Role[] = rolesWith(COMPETITIVE_READ);

  return {
    type: 'permission',
    message,
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
 * forbidden trigger refuses the call with the demonstration's own sentence, because the role holding
 * the permission is refused by the control rather than by the matrix (rules P-3, P-4), while a genuine
 * denial names the permission the role does not hold and the roles that do (rule P-8).
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @throws Problem - `type: 'permission'`, carrying the permission and the roles that hold it.
 */
function assertCompetitiveRead(ctx: HandlerContext): void {
  if (isSimulationOn(ctx.state, 'forbidden')) {
    throw competitiveReadRefusal(
      demonstrationForbiddenReason(ctx.actor.role, COMPETITIVE_READ),
    );
  }

  if (!hasPermission(ctx.actor.role, COMPETITIVE_READ, null, ctx.actor)) {
    throw competitiveReadRefusal(
      `Reading the simulated market-intelligence pack requires the ${COMPETITIVE_READ} permission, ` +
        `and the ${ctx.actor.role} role does not hold it. The roles that hold it are ` +
        `${rolesWith(COMPETITIVE_READ).join(', ')}.`,
    );
  }
}

/**
 * The failure an unknown product class is refused with.
 *
 * The argument names a class the selector offers, so an identifier the records do not hold is a
 * request for something the pack cannot answer: `'not-found'` is that cause in the contracts §2
 * vocabulary, and the message names the class it was given and the ones the atlas does offer, both
 * interpolated from the records so neither list is typed here (rule P-6).
 *
 * @param offered - The product classes the seeded records publish.
 * @param requested - The class the caller asked for.
 * @returns The failure to throw.
 */
function unknownProductClassProblem(
  offered: readonly ProductId[],
  requested: ProductId,
): Problem {
  return {
    type: 'not-found',
    message:
      `The competitive atlas has no product class ${requested}. The classes it offers are ` +
      `${offered.join(', ')}.`,
    traceId: '',
  };
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
 * The pack's classification and joins, checked before it is served — AAP 0.12.4, rule P-6
 * ------------------------------------------------------------------------------------------- */

/** The classes a record states, or the words for a record that states none, so a message reads. */
function describeClasses(productClasses: readonly ProductId[]): string {
  return productClasses.length === 0 ? 'no product class' : productClasses.join(', ');
}

/** The network a series names, or the words for a series that names none. */
function describeSeriesJoin(competitorId: CompetitorId | null): string {
  return competitorId === null
    ? 'naming no competitor network'
    : `naming the competitor network ${competitorId}`;
}

/**
 * Fails loudly when the seeded pack's product-class classification or its series join is broken.
 *
 * Two properties are checked, and both are properties of the records rather than of one call, which
 * is why a breach throws an `Error` instead of returning a `Problem` — the same reason
 * {@link assertPackProvenance} beside it does:
 *
 * 1. A market-intelligence series names a competitor network the pack holds. That series is drawn as
 *    that competitor's reading, and SCR-13 narrows the series by the product class of the network its
 *    `competitorId` names, so a join the pack cannot resolve would silently hide a competitor's
 *    score from every class the selector offers (AAP 0.12.4).
 * 2. Every competitor network states at least one product class the atlas offers. A network
 *    classified in nothing would be drawn under no class the selector names, and one classified in an
 *    identifier the client's own product records do not hold would make the selector's list and the
 *    classification disagree about the same vocabulary.
 *
 * The messages quote the offending record's own identifier and the values it states, both
 * interpolated, so the report points at the record to fix without an identifier or a class being
 * written in this file (rule P-6).
 *
 * @param pack - The seeded market-intelligence pack the call is about to serve.
 * @param offered - The product classes the client's own product records publish.
 * @throws Error - A market-intelligence series names no network the pack holds, or a competitor
 *   network states no class the atlas offers.
 */
function assertPackClassification(
  pack: MarketIntelligencePack,
  offered: readonly ProductId[],
): void {
  const heldNetworks = pack.competitors.map((network) => network.competitorId);
  const held = new Set<CompetitorId>(heldNetworks);

  for (const series of pack.radarSeries) {
    if (series.provenance !== MARKET_INTELLIGENCE) {
      continue;
    }

    if (series.competitorId === null || !held.has(series.competitorId)) {
      throw new Error(
        `The market-intelligence pack records series ${series.id} with provenance ` +
          `${MARKET_INTELLIGENCE} and ${describeSeriesJoin(series.competitorId)}, and the pack ` +
          `holds the competitor networks ${heldNetworks.join(', ')}. A competitor series must name ` +
          `a network the pack records, because the atlas narrows it by that network's product class.`,
      );
    }
  }

  for (const network of pack.competitors) {
    if (network.productClasses.some((productClass) => offered.includes(productClass))) {
      continue;
    }

    throw new Error(
      `The market-intelligence pack records competitor network ${network.competitorId} in ` +
        `${describeClasses(network.productClasses)}, and the atlas offers ` +
        `${describeClasses(offered)}. A competitor network must state a class the atlas offers, ` +
        'because the selector filters the networks by it.',
    );
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
 * The provenance is copied, not assumed, so the payload says where the network came from, and the
 * product classes are copied as a fresh list because they are what SCR-13's selector filters on —
 * the screen reads them and writes neither (AAP 0.12.4).
 *
 * @param network - One competitor network of the pack.
 * @returns The network as the atlas publishes it.
 */
function competitorNetworkOf(network: CompetitorNetwork): CompetitorNetwork {
  return {
    competitorId: network.competitorId,
    label: network.label,
    provenance: network.provenance,
    productClasses: [...network.productClasses],
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
 * (rule P-1). `competitorId` is copied beside them: it is the join that lets a screen match this
 * series to the network it scores, and `null` on the client's own series is what tells the two
 * families apart there (AAP 0.12.4). The scores are copied so the payload cannot be used to write
 * into the seeded record.
 *
 * @param series - One series of the pack.
 * @returns The series as the atlas publishes it.
 */
function radarSeriesOf(series: AtlasSeries): AtlasSeries {
  return {
    id: series.id,
    competitorId: series.competitorId,
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
 * `productClass` is validated before the pack is served: an unknown class is refused as `'not-found'`,
 * naming it and the classes the atlas offers, and the pack's own classification is checked first, so
 * every competitor network states the product classes it competes in and every competitor series names
 * the network it scores (see `assertPackClassification`). A known class serves the whole payload,
 * because one read answers every class the selector offers and the screen narrows what it draws — the
 * class is record content the screen filters on as well as a read parameter (the module header records
 * that split).
 *
 * Two calls over one session return equal payloads: the records are read in the order the pack holds
 * them and nothing is accumulated, ordered by a derived key or read from a clock.
 *
 * @param ctx - The session's state and the persona the call acts as.
 * @param productClass - The product class the caller is asking about, when it names one.
 * @returns The atlas payload SCR-13 renders.
 * @throws Problem - `type: 'permission'` when the persona may not read the pack or the simulation's
 *   forbidden trigger is set; `type: 'not-found'` when `productClass` is not a class the records hold.
 * @throws Error - The seeded pack would put a mislabelled element on screen (see
 *   `assertPackProvenance`), or its product-class classification or its series join is broken (see
 *   `assertPackClassification`).
 */
export async function getAtlas(
  ctx: HandlerContext,
  productClass?: ProductId,
): Promise<Atlas> {
  assertCompetitiveRead(ctx);

  const records = ctx.state.records;
  const pack = records.marketIntelligence;

  assertPackProvenance(pack);

  const productClasses = records.products.map((product) => product.id);

  assertPackClassification(pack, productClasses);

  if (productClass !== undefined && !productClasses.includes(productClass)) {
    throw unknownProductClassProblem(productClasses, productClass);
  }

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
