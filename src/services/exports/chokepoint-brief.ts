/**
 * The chokepoint brief: the JSON document behind SCR-13's "Export the chokepoint brief as JSON",
 * composed once for both adapters of the service port.
 *
 * WHY IT IS HERE RATHER THAN IN THE ADAPTER THAT EXPORTS IT. AAP 0.12.3 requires both adapters to share
 * "the observable behaviour that makes the swap invisible", and the brief is part of that behaviour: the
 * file a reader downloads must not change because the application was bound to the other adapter. AAP
 * 0.12.1's "Exports" row keeps the assemblers in `src/services/mock/exports/`, so those modules stay
 * where the plan puts them and this module holds the document composition they call. The mock adapter's
 * assembler hands it the market-intelligence pack its own state holds; the API client hands it the same
 * competitors and crossings from its own atlas read, with the release label that read publishes, so one
 * builder decides the document's shape, its key order and its fixed strings for both (AAP 0.6.2,
 * rule P-2).
 *
 * BUILT FROM THE MARKET-INTELLIGENCE PACK ALONE (rule P-5). The document carries the pack's release
 * version, the banner that names it, the competitors behind the crossings, and the crossings themselves
 * with their overlap, competitor buffer days and contention note. Each list is filtered on its
 * provenance before it is copied, so a record of the client's own book is dropped rather than relabelled
 * even if the pack were mis-seeded, and no member of the document combines a market-intelligence value
 * with a first-party one.
 *
 * EVERY ELEMENT CARRIES ITS OWN LABEL (rule P-1). The market-intelligence member of `SIM_LABELS` is
 * attached to the document, to each competitor and to each crossing, taken from the constant rather than
 * retyped, and every competitor name carries `COMPETITOR_NAME_TAG` beside it, so the file shows the same
 * two fixed strings the atlas prints on screen. `simulated` sits at the top level, typed as the literal
 * `true`, so the field cannot quietly become false.
 *
 * NO ARITHMETIC (rule P-6). Overlap and the buffer days are the pack's own record content, copied as the
 * records hold them: the document adds nothing up, takes nothing apart, rounds nothing and turns no
 * fraction into a percentage. The only strings the file states are the two label constants, the media
 * type and the file name.
 *
 * DETERMINISTIC AND SIDE-EFFECT FREE. The same reads yield the same bytes on every call: every record is
 * emitted in the order it arrives in, every member is written in one fixed order, and the only clock is
 * `DEMO_CLOCK`, whose value the payload records as `generatedAt` (contracts §1: no business logic reads
 * the system clock). The module performs no I/O — it opens no address, touches no browser interface, and
 * produces a payload the caller's own code turns into a download (rule B-1). It reads no configuration
 * and carries no credential (rule B-2), and it names no company, product or person of its own (rule P-7):
 * every name in the document comes from the records it is handed.
 */

import { ATLAS_PACK_BANNER, COMPETITOR_NAME_TAG, DEMO_CLOCK, SIM_LABELS } from '../../types';
import type {
  Chokepoint,
  CompetitorId,
  CompetitorNetwork,
  ExportPayload,
  Provenance,
  SimLabel,
  Timestamp,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The payload — AAP 0.12.1 "Exports", contracts §11
 * ------------------------------------------------------------------------------------------- */

/**
 * One competitor of the brief: the network's identity, its display name and its provenance, with the
 * name tag and the simulation label the atlas prints beside the name.
 *
 * The provenance is carried rather than assumed, so a reader of the file sees on the record itself that
 * the network is market intelligence (rule P-5), and it is what the builder filters on before a network
 * is copied here.
 */
export interface BriefCompetitor {
  /** The competitor the network belongs to, `CMP-nn`. */
  readonly competitorId: CompetitorId;

  /** The competitor's display name, as the atlas selector prints it. */
  readonly label: string;

  /** Where the network's records came from, market intelligence for every competitor. */
  readonly provenance: Provenance;

  /** The fixed tag every competitor name carries, `COMPETITOR_NAME_TAG`. */
  readonly nameTag: typeof COMPETITOR_NAME_TAG;

  /** The fixed label the element carries, the market-intelligence member of `SIM_LABELS`. */
  readonly simLabel: SimLabel;
}

/**
 * One shared crossing of the brief: every member the shared `Chokepoint` shape declares, under its own
 * name and type, plus the label the element carries.
 *
 * Extending `Chokepoint` rather than restating it is what guarantees that the crossing's name, overlap,
 * competitor buffer days, contention note and provenance all reach the file and that none of them is
 * renamed or retyped on the way (rule P-6). Straying beyond that shape is what the builder declines to
 * do, because the records the pack publishes carry members the brief must not reproduce (see
 * `briefChokepointOf`).
 */
export interface BriefChokepoint extends Chokepoint {
  /** The fixed label the element carries, the market-intelligence member of `SIM_LABELS`. */
  readonly simLabel: SimLabel;
}

/**
 * The brief itself: the pack's identity, its competitors and its crossings, each labelled.
 *
 * The members are written in one fixed order — the pack's identity first, then the competitors, then the
 * crossings — so two exports of the same state are byte-identical. `simulated` is the literal `true`
 * rather than a `boolean`, so the one field that marks the whole payload as demonstration output cannot
 * be set to false by a caller and cannot widen as the type travels.
 */
export interface ChokepointBriefDocument {
  /** Marks the whole payload as simulated output: the literal `true`, at the top level. */
  readonly simulated: true;

  /** The demonstration clock the document is built at, `DEMO_CLOCK`. */
  readonly generatedAt: Timestamp;

  /** The market pack's release label, as the atlas read publishes it. */
  readonly packVersion: string;

  /** The banner naming the simulated pack, `ATLAS_PACK_BANNER`, which quotes the same release. */
  readonly banner: typeof ATLAS_PACK_BANNER;

  /** The fixed label the document carries, the market-intelligence member of `SIM_LABELS`. */
  readonly simLabel: SimLabel;

  /** The competitors behind the crossings, in the order the pack records its networks. */
  readonly competitors: readonly BriefCompetitor[];

  /** The shared crossings, in the order the pack records them. */
  readonly chokepoints: readonly BriefChokepoint[];
}

/**
 * The reads the brief is composed from, as either adapter can supply them.
 *
 * `competitors` and `chokepoints` are the market-intelligence pack's own lists, still carrying the
 * members the brief must not reproduce — the builder filters and copies them member by member — and
 * `packVersion` is the pack's release label, which the atlas read publishes so a client can compose the
 * brief without reaching the seed the label is defined in (rule P-2).
 */
export interface ChokepointBriefInput {
  /** The competitor networks of the market-intelligence pack. */
  readonly competitors: readonly CompetitorNetwork[];

  /** The shared crossings of the market-intelligence pack. */
  readonly chokepoints: readonly Chokepoint[];

  /** The market pack's release label, as the atlas read reports it. */
  readonly packVersion: string;
}

/* ---------------------------------------------------------------------------------------------
 * Fixed strings — taken from the vocabulary rather than retyped (rules P-1 and P-5)
 * ------------------------------------------------------------------------------------------- */

/**
 * The label every element of the brief carries: `SIM_LABELS[5]`, which reads
 * "Simulated market intelligence". AAP §0.10 lists the seven labels in this order, and
 * `src/types/primitives.ts` holds the same order, so the index is the vocabulary's own position for the
 * label rather than a string this module spells.
 */
const MARKET_INTELLIGENCE_LABEL: SimLabel = SIM_LABELS[5];

/**
 * The provenance a record must carry to enter the brief: the market-intelligence member of `Provenance`.
 *
 * A record carrying either other member is dropped rather than relabelled, so a reading of the client's
 * own book cannot reach the payload even if the pack were mis-seeded, which is the guarantee rule P-5
 * asks of the document rather than of the screen that renders it.
 */
const MARKET_INTELLIGENCE_ONLY: Provenance = 'market_intelligence';

/** The media type, fixed so a reader opens the payload as JSON. */
const JSON_MEDIA_TYPE = 'application/json';

/** The file name the download suggests. It carries no identifier, date or figure of its own. */
const FILE_NAME = 'chokepoint-brief.json';

/** The indentation applied when the document is serialised, so the downloaded file stays readable. */
const JSON_INDENT = 2;

/* ---------------------------------------------------------------------------------------------
 * One element of the brief
 * ------------------------------------------------------------------------------------------- */

/**
 * Copies one competitor network into the brief, member by member.
 *
 * Composed rather than spread from the network, for two reasons: `CompetitorNetwork` also carries the
 * network's sites and lanes, and the brief names the competitors behind the crossings rather than
 * reproducing their networks; and a member-by-member copy fixes the key order of every element, so the
 * file's bytes depend on the records they are built from alone and not on the order those literals
 * happen to list them in.
 */
function briefCompetitorOf(network: CompetitorNetwork): BriefCompetitor {
  return {
    competitorId: network.competitorId,
    label: network.label,
    provenance: network.provenance,
    nameTag: COMPETITOR_NAME_TAG,
    simLabel: MARKET_INTELLIGENCE_LABEL,
  };
}

/**
 * Copies one crossing into the brief, taking every member the shared `Chokepoint` shape declares.
 *
 * The parameter is typed `Chokepoint` on purpose. The records the pack publishes extend that shape with
 * the crossing's map position and with `clientNodeIds`, which name positions of the client's own
 * network; spreading the live record would carry those identifiers into a payload that reports on the
 * market pack alone (rule P-5). Typing the parameter as the shared shape keeps those members out of
 * reach here, while every declared member — name, overlap, buffer days, contention note, provenance — is
 * copied under its own name with its own type.
 */
function briefChokepointOf(crossing: Chokepoint): BriefChokepoint {
  return {
    id: crossing.id,
    label: crossing.label,
    overlap: crossing.overlap,
    competitorBufferDays: crossing.competitorBufferDays,
    contentionNote: crossing.contentionNote,
    provenance: crossing.provenance,
    simLabel: MARKET_INTELLIGENCE_LABEL,
  };
}

/* ---------------------------------------------------------------------------------------------
 * The export — AAP 0.12.4 SCR-13, contracts §11
 * ------------------------------------------------------------------------------------------- */

/**
 * Builds the chokepoint-brief payload from the market-intelligence reads either adapter can supply.
 *
 * The crossings and the networks keep the order they arrive in, so two exports of an untouched session
 * are byte-identical and a reader can compare one against the next. Each is filtered on its provenance
 * before it is copied: a crossing or network carrying a first-party or computed provenance is dropped
 * rather than relabelled or reported, which is the rule P-5 guarantee this module's header states.
 *
 * @param input - The pack's competitors, its crossings and its release label.
 * @returns The payload: the file name, the media type and the JSON text.
 */
export function buildChokepointBrief(input: ChokepointBriefInput): ExportPayload {
  const brief: ChokepointBriefDocument = {
    simulated: true,
    generatedAt: DEMO_CLOCK,
    packVersion: input.packVersion,
    banner: ATLAS_PACK_BANNER,
    simLabel: MARKET_INTELLIGENCE_LABEL,
    competitors: input.competitors
      .filter((network) => network.provenance === MARKET_INTELLIGENCE_ONLY)
      .map(briefCompetitorOf),
    chokepoints: input.chokepoints
      .filter((crossing) => crossing.provenance === MARKET_INTELLIGENCE_ONLY)
      .map(briefChokepointOf),
  };

  return {
    filename: FILE_NAME,
    mediaType: JSON_MEDIA_TYPE,
    content: JSON.stringify(brief, null, JSON_INDENT),
  };
}
