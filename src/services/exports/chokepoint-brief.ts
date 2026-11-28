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
 * SCOPED TO THE ATLAS STATE IT IS EXPORTED FROM. What this module composes is the whole pack, because
 * `exportChokepointBrief()` takes no argument — the port is fixed verbatim by the contracts — and because
 * the pack is the one read both adapters can supply. The class SCR-13 holds in view is the screen's own
 * state, so the screen narrows the composed document through {@link scopeChokepointBrief} before it
 * offers the file: the crossings that class left drawn, and the class itself. The competitor roster is
 * carried over whole rather than narrowed with them, because a crossing's own `competitorBufferDays`
 * names the competitors behind it and the atlas's chokepoint table names those competitors from the
 * crossing's record, so a file that kept a crossing while withholding the roster would hold identifiers
 * it could not describe. A brief exported from a narrowed atlas therefore lists the crossings the
 * atlas's own table lists, against the roster that table names its competitor cells from, while nothing
 * is recomputed on the way (rule P-6) and the document still reports the market pack alone in either
 * form (rule P-5).
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
  ChokepointId,
  CompetitorId,
  CompetitorNetwork,
  ExportPayload,
  ProductId,
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
 * One shared crossing of the brief: every measure the shared `Chokepoint` shape declares, under its own
 * name and type, plus the label the element carries.
 *
 * Extending `Chokepoint` — less the pair that states where the crossing sits — is what guarantees that
 * the crossing's name, overlap, competitor buffer days, contention note and provenance all reach the
 * file and that none of them is renamed or retyped on the way (rule P-6). The position is a canvas
 * concern rather than a measure of the crossing, so the brief omits it: the shape it is typed with
 * leaves the pair out of reach and the file reports the contention alone (see `briefChokepointOf`).
 */
export interface BriefChokepoint extends Omit<Chokepoint, 'latitude' | 'longitude'> {
  /** The fixed label the element carries, the market-intelligence member of `SIM_LABELS`. */
  readonly simLabel: SimLabel;
}

/**
 * The brief itself: the pack's identity, the product class it reports, its competitors and its
 * crossings, each labelled.
 *
 * The members are written in one fixed order — the pack's identity first, then the class it reports, then
 * the competitors, then the crossings — so two exports of the same state are byte-identical. `simulated`
 * is the literal `true` rather than a `boolean`, so the one field that marks the whole payload as
 * demonstration output cannot be set to false by a caller and cannot widen as the type travels.
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

  /**
   * The product class the brief was exported for: the class SCR-13 held in view, or `null` when every
   * class the pack holds was in view.
   *
   * The member states the class the crossings below were narrowed to, so a reader of the file knows
   * which slice of the pack it reports rather than having to infer one. It is `null` rather than absent
   * for the whole pack, so the field is one member of the document in either form, and the value written
   * is the class the screen held in view rather than one derived from the records.
   */
  readonly productClass: ProductId | null;

  /**
   * The competitors behind the crossings, whole: the pack's own roster in the order the pack records its
   * networks.
   *
   * Every crossing names the competitors that use it in its own `competitorBufferDays`, so this list is
   * what lets a reader of the file resolve each identifier a crossing holds to a name, a label and a
   * provenance. Narrowing it would leave the file holding identifiers nothing in it describes.
   */
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
 * Copies one crossing into the brief, taking every measure the shared `Chokepoint` shape declares.
 *
 * The parameter is typed `Chokepoint` on purpose. The records the pack publishes extend that shape with
 * `clientNodeIds`, which name positions of the client's own network; spreading the live record would
 * carry those identifiers into a payload that reports on the market pack alone (rule P-5). Typing the
 * parameter as the shared shape keeps that member out of reach here, while every measure the shape
 * declares — name, overlap, buffer days, contention note, provenance — is copied under its own name
 * with its own type. The crossing's optional map position is left behind with it: the brief reports the
 * contention the pack records, not where the canvas draws the crossing.
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
 * The document's one member order
 * ------------------------------------------------------------------------------------------- */

/**
 * Every member of the document except the simulation marker, which is always `true`.
 *
 * Named so the assembly below can be the one owner of the members' order: the builder and the scoping
 * function both hand their members through it rather than each writing the object out, so a member
 * cannot reach one path and miss the other.
 */
type ChokepointBriefMembers = Omit<ChokepointBriefDocument, 'simulated'>;

/**
 * Assembles the brief in its one fixed member order.
 *
 * The order is the file's bytes as much as it is the object's shape: the pack's identity first, then the
 * class it reports, then the competitors and the crossings, so two exports of the same state are
 * byte-identical. `simulated` leads because it marks the whole document rather than any member of it, and
 * it is written here as the literal `true`, so no path can set it false.
 *
 * @param members - Every member the document states beside the simulation marker.
 * @returns The document, ready to serialise.
 */
function briefDocumentOf(members: ChokepointBriefMembers): ChokepointBriefDocument {
  return {
    simulated: true,
    generatedAt: members.generatedAt,
    packVersion: members.packVersion,
    banner: members.banner,
    simLabel: members.simLabel,
    productClass: members.productClass,
    competitors: members.competitors,
    chokepoints: members.chokepoints,
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
 * The document reports the whole pack, so `productClass` is `null`: this builder holds no class, and the
 * screen that exports the file narrows the document to the class it has in view through
 * {@link scopeChokepointBrief}.
 *
 * @param input - The pack's competitors, its crossings and its release label.
 * @returns The payload: the file name, the media type and the JSON text.
 */
export function buildChokepointBrief(input: ChokepointBriefInput): ExportPayload {
  const brief = briefDocumentOf({
    generatedAt: DEMO_CLOCK,
    packVersion: input.packVersion,
    banner: ATLAS_PACK_BANNER,
    simLabel: MARKET_INTELLIGENCE_LABEL,
    productClass: null,
    competitors: input.competitors
      .filter((network) => network.provenance === MARKET_INTELLIGENCE_ONLY)
      .map(briefCompetitorOf),
    chokepoints: input.chokepoints
      .filter((crossing) => crossing.provenance === MARKET_INTELLIGENCE_ONLY)
      .map(briefChokepointOf),
  });

  return {
    filename: FILE_NAME,
    mediaType: JSON_MEDIA_TYPE,
    content: JSON.stringify(brief, null, JSON_INDENT),
  };
}

/* ---------------------------------------------------------------------------------------------
 * The atlas state a brief is scoped to — SCR-13's class in view
 * ------------------------------------------------------------------------------------------- */

/**
 * What the atlas had in view when a reader asked for the brief: the class the screen was showing, and
 * the crossings that class left drawn.
 *
 * The screen supplies it, because `exportChokepointBrief()` takes no argument — the port is fixed
 * verbatim by the contracts — while the class in view is the screen's own state, held in this screen's
 * store and nowhere a service can read. Scoping the composed document against it is therefore the one
 * path the class takes into the file, and it is what keeps the file and the table it was exported from
 * from disagreeing.
 *
 * There is no competitor list here, and that is deliberate: the crossing records name the competitors
 * behind them in `competitorBufferDays`, so a scope naming the roster as well as the crossings could
 * keep a crossing while dropping a competitor it names, leaving a file that holds an identifier it
 * cannot resolve to a name, a label or a provenance. The atlas does not narrow its roster this way
 * either — its chokepoint table names each row's competitors from the crossing's own record, against
 * the pack's whole roster.
 */
export interface ChokepointBriefScope {
  /** The product class in view, or `null` when every class the pack holds was in view. */
  readonly productClass: ProductId | null;

  /** The crossings the atlas drew, which are those an in-view network's lane traverses. */
  readonly chokepointIds: readonly ChokepointId[];
}

/**
 * What a value turned out to be, in the words a refusal needs.
 *
 * A brief's members are text, numbers, lists and nested records, so naming the shape a wrong value had
 * is what makes the failure a diagnosis rather than a report that something was wrong.
 *
 * @param value - The value a member turned out to hold.
 * @returns The value's shape.
 */
function describeValue(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (Array.isArray(value)) {
    return 'a list';
  }

  return typeof value;
}

/**
 * Whether a parsed value is an object whose members can be read by name.
 *
 * `JSON.parse` answers a value of no known type, so every member of the document is read through a check
 * rather than assumed: this one proves the value is an object and not a list, a text, a number or `null`.
 *
 * @param value - The value to read.
 * @returns Whether the value is an object whose members can be read by name.
 */
function isMembers(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads one member of a parsed document as text.
 *
 * @param members - The parsed document being read.
 * @param member - The member's name, which a failure names.
 * @returns The member's text.
 * @throws Error - The member is absent, or holds something other than text.
 */
function textOf(members: Readonly<Record<string, unknown>>, member: string): string {
  const value = members[member];

  if (typeof value !== 'string') {
    throw new Error(`the chokepoint brief's ${member} is not text: ${describeValue(value)}`);
  }

  return value;
}

/**
 * Reads one member of a parsed document as a usable number.
 *
 * @param members - The parsed document being read.
 * @param member - The member's name, which a failure names.
 * @returns The member's number.
 * @throws Error - The member is absent, or holds something other than a finite number.
 */
function numberOf(members: Readonly<Record<string, unknown>>, member: string): number {
  const value = members[member];

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`the chokepoint brief's ${member} is not a number: ${describeValue(value)}`);
  }

  return value;
}

/**
 * Reads a parsed label as one of the seven fixed labels.
 *
 * The labels are taken from `SIM_LABELS` rather than retyped, so this check consults the same constant
 * the document is stamped from and cannot admit a label the vocabulary does not hold.
 *
 * @param value - The parsed member.
 * @returns The label.
 * @throws Error - The value is not one of the seven labels.
 */
function simLabelOf(value: unknown): SimLabel {
  const label = SIM_LABELS.find((candidate) => candidate === value);

  if (label === undefined) {
    throw new Error(
      `the chokepoint brief carries a label that is not one of the seven fixed strings: ${describeValue(value)}`,
    );
  }

  return label;
}

/**
 * Reads a parsed provenance as one of the three members `Provenance` admits.
 *
 * @param value - The parsed member.
 * @returns The provenance.
 * @throws Error - The value is none of the three members.
 */
function provenanceOf(value: unknown): Provenance {
  switch (value) {
    case 'first_party':
    case 'computed':
    case 'market_intelligence':
      return value;
    default:
      throw new Error(
        `the chokepoint brief carries a provenance it does not admit: ${describeValue(value)}`,
      );
  }
}

/**
 * Reads one crossing's per-competitor buffer days.
 *
 * Every entry is copied into a record of its own, so the crossing that reaches the scoped document holds
 * a map of day counts rather than whatever object the parsed text happened to hold.
 *
 * @param value - The parsed member.
 * @returns Each competitor's buffer at the crossing, in days.
 * @throws Error - The value is not a record, or an entry of it is not a finite number.
 */
function bufferDaysOf(value: unknown): Record<CompetitorId, number> {
  if (!isMembers(value)) {
    throw new Error(
      `the chokepoint brief's competitorBufferDays is not a record: ${describeValue(value)}`,
    );
  }

  const days: Record<CompetitorId, number> = {};

  for (const [competitorId, count] of Object.entries(value)) {
    if (typeof count !== 'number' || !Number.isFinite(count)) {
      throw new Error(
        `the chokepoint brief's buffer days for ${competitorId} are not a number: ${describeValue(count)}`,
      );
    }

    days[competitorId] = count;
  }

  return days;
}

/**
 * Reads one of the document's lists, entry by entry and in the order the document holds them.
 *
 * @param value - The parsed member.
 * @param member - The member's name, which a failure names.
 * @param read - The reader of one entry, which is also what checks it.
 * @returns The entries, in the document's own order.
 * @throws Error - The value is not a list.
 */
function listOf<T>(
  value: unknown,
  member: string,
  read: (entry: unknown, index: number) => T,
): readonly T[] {
  if (!Array.isArray(value)) {
    throw new Error(`the chokepoint brief's ${member} is not a list: ${describeValue(value)}`);
  }

  return value.map((entry: unknown, index: number) => read(entry, index));
}

/**
 * Reads one competitor back out of a composed brief, member by member.
 *
 * Every member is checked before it is copied, and the copy is written in the order
 * {@link briefCompetitorOf} writes it, so narrowing a document and serialising it again cannot reorder a
 * competitor's members or carry a value of the wrong shape into the scoped file.
 *
 * @param value - One entry of the document's `competitors`.
 * @param index - The entry's position, which a failure names.
 * @returns The competitor.
 * @throws Error - The entry is not a competitor the brief declares.
 */
function briefCompetitorAt(value: unknown, index: number): BriefCompetitor {
  if (!isMembers(value)) {
    throw new Error(
      `the chokepoint brief's competitor ${index} is not an object: ${describeValue(value)}`,
    );
  }

  if (value['nameTag'] !== COMPETITOR_NAME_TAG) {
    throw new Error(
      `the chokepoint brief's competitor ${index} carries no competitor name tag: ${describeValue(value['nameTag'])}`,
    );
  }

  return {
    competitorId: textOf(value, 'competitorId'),
    label: textOf(value, 'label'),
    provenance: provenanceOf(value['provenance']),
    nameTag: COMPETITOR_NAME_TAG,
    simLabel: simLabelOf(value['simLabel']),
  };
}

/**
 * Reads one crossing back out of a composed brief, every measure the document states included.
 *
 * As with a competitor, each member is checked and copied in {@link briefChokepointOf}'s order, so a
 * narrowed document carries the same measures, under the same names, that the builder wrote.
 *
 * @param value - One entry of the document's `chokepoints`.
 * @param index - The entry's position, which a failure names.
 * @returns The crossing.
 * @throws Error - The entry is not a crossing the brief declares.
 */
function briefChokepointAt(value: unknown, index: number): BriefChokepoint {
  if (!isMembers(value)) {
    throw new Error(
      `the chokepoint brief's chokepoint ${index} is not an object: ${describeValue(value)}`,
    );
  }

  return {
    id: textOf(value, 'id'),
    label: textOf(value, 'label'),
    overlap: numberOf(value, 'overlap'),
    competitorBufferDays: bufferDaysOf(value['competitorBufferDays']),
    contentionNote: textOf(value, 'contentionNote'),
    provenance: provenanceOf(value['provenance']),
    simLabel: simLabelOf(value['simLabel']),
  };
}

/**
 * Reads the brief document out of the JSON text a payload carries.
 *
 * The document is checked rather than assumed: a payload that does not hold the brief — the evidence
 * pack, a CSV comparison, a truncated download — fails here with the member that did not fit, which is
 * what keeps a scoped brief from being assembled out of something this module did not compose.
 *
 * @param content - The payload's content, as the builder serialised it.
 * @returns The document's members, ready for {@link briefDocumentOf}.
 * @throws Error - The content is not JSON text, or is not the document a chokepoint brief is.
 */
function briefMembersOf(content: string): ChokepointBriefMembers {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('the content the brief was composed into is not JSON text');
  }

  if (!isMembers(parsed)) {
    throw new Error(
      `the chokepoint brief's content is not a JSON document: ${describeValue(parsed)}`,
    );
  }

  if (parsed['simulated'] !== true) {
    throw new Error(
      `the chokepoint brief does not declare itself simulated: ${describeValue(parsed['simulated'])}`,
    );
  }

  if (parsed['banner'] !== ATLAS_PACK_BANNER) {
    throw new Error(
      `the chokepoint brief's banner is not the pack banner: ${describeValue(parsed['banner'])}`,
    );
  }

  const productClass = parsed['productClass'];

  if (productClass !== null && typeof productClass !== 'string') {
    throw new Error(
      `the chokepoint brief's productClass is neither a class nor null: ${describeValue(productClass)}`,
    );
  }

  return {
    generatedAt: textOf(parsed, 'generatedAt'),
    packVersion: textOf(parsed, 'packVersion'),
    banner: ATLAS_PACK_BANNER,
    simLabel: simLabelOf(parsed['simLabel']),
    productClass,
    competitors: listOf(parsed['competitors'], 'competitors', briefCompetitorAt),
    chokepoints: listOf(parsed['chokepoints'], 'chokepoints', briefChokepointAt),
  };
}

/**
 * Narrows a composed chokepoint brief to the atlas state it was exported from.
 *
 * WHY THE SCREEN DOES THIS RATHER THAN THE SERVICE. `exportChokepointBrief()` takes no argument — the
 * port is fixed verbatim by the contracts, and both adapters answer it from the whole pack — while the
 * product class in view is the atlas screen's own state, held in that screen's store for as long as the
 * route is open. The screen is therefore the one place that knows which records it drew, and it hands
 * that knowledge here: the class it held and the crossings it drew. The file then lists exactly the
 * crossings the atlas's own table lists, against the roster that table names its competitor cells from,
 * so a brief exported from a narrowed atlas cannot disagree with the surface it came from.
 *
 * WHAT IS COPIED AND WHAT IS NOT. The document's own members are carried over unchanged — the instant it
 * was generated at, the pack's release label, the banner, the label every element carries and the
 * competitor roster — and `productClass` states the class the file was narrowed to. Only `chokepoints`
 * is narrowed, and it keeps the order the document holds them in whatever order the identifiers arrive
 * in, so the narrowing selects records rather than reordering or recomputing them (rule P-6). The
 * payload keeps its file name and media type, so the download a reader receives is the same file under
 * the same name whichever class was in view.
 *
 * WHY THE ROSTER IS CARRIED WHOLE. Every crossing names the competitors that use it in its own
 * `competitorBufferDays`, and the atlas's chokepoint table names those competitors from the crossing's
 * record rather than from a list narrowed with the class, so what a reader sees on screen stays the
 * pack's own competitor list in the pack's own order. Narrowing the roster here would keep a crossing
 * while withholding the competitor it names: the file would hold identifiers nothing in it describes.
 * Carried whole, the file describes every competitor identifier it holds, which is the one thing a
 * reader of it is entitled to rely on.
 *
 * @param payload - The payload the adapter composed from the whole pack.
 * @param scope - The class in view and the crossings it left drawn.
 * @returns A new payload: the same file name and media type, over the narrowed document.
 * @throws Error - The payload's content is not the document a chokepoint brief is.
 */
export function scopeChokepointBrief(
  payload: ExportPayload,
  scope: ChokepointBriefScope,
): ExportPayload {
  const brief = briefMembersOf(payload.content);
  const chokepointIds = new Set<ChokepointId>(scope.chokepointIds);

  const scoped = briefDocumentOf({
    generatedAt: brief.generatedAt,
    packVersion: brief.packVersion,
    banner: brief.banner,
    simLabel: brief.simLabel,
    productClass: scope.productClass,
    competitors: brief.competitors,
    chokepoints: brief.chokepoints.filter((crossing) => chokepointIds.has(crossing.id)),
  });

  return {
    filename: payload.filename,
    mediaType: payload.mediaType,
    content: JSON.stringify(scoped, null, JSON_INDENT),
  };
}
