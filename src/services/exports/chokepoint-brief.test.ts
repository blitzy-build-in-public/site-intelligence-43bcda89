// @vitest-environment node

/**
 * What the chokepoint brief states, and what scoping it to the atlas state in view does to it.
 *
 * WHY THIS SUITE EXISTS. `src/services/mock/mock-backend.test.ts` asserts that the adapter's payload
 * equals `buildChokepointBrief`'s payload for the same read — the composer compared against itself — so
 * a member the builder wrote wrongly, or one it never wrote at all, passed every gate. One was missing:
 * the document stated no product class, so an atlas narrowed to one class exported the whole pack and the
 * file disagreed with the table it came from. The cases below read the file's own text and assert the two
 * things that fix it: the document states `productClass` and `null` means every class, and
 * `scopeChokepointBrief` narrows the crossings of a composed brief to the records the class in view left
 * drawn, in the document's own order, stamping the class it was narrowed to. It carries the pack's
 * competitor roster over whole rather than narrowing it with the crossings, because a crossing names the
 * competitors behind it in `competitorBufferDays`: a roster narrowed beside the crossings would leave the
 * file holding identifiers nothing in it resolves, which is the case below that a class leaving a
 * competitor out of the drawing covers.
 *
 * WHAT IT ASSERTS, AND WHAT IT LEAVES ALONE. Which crossings a scope selects and in which order; that the
 * document's own members — the instant, the release label, the banner, the element label, the competitor
 * roster, the file name and the media type — survive the narrowing unchanged, the roster whole and in its
 * own order; that every competitor a kept crossing names is one the roster describes, so the file never
 * holds an identifier nothing in it resolves; that narrowing a whole-pack brief to every class the pack
 * holds reproduces the builder's bytes exactly, so the read-back and re-serialisation add nothing; that
 * two calls over one payload and one scope produce identical bytes; and that content which is not a
 * chokepoint brief is refused rather than scoped. It does not restate the document's key order, the
 * provenance filter or the file name's wording: those belong to the builder, and the adapter suite holds
 * the adapter to the builder.
 *
 * THE FIXTURES ARE TYPED, NOT SEEDED. Every member of `CompetitorNetwork` and `Chokepoint` is filled here,
 * because the builder is a pure function of the reads it is handed. Nothing is imported from `src/seed`
 * (rule P-2), and the identifiers, names, day counts and overlap values below are the fixtures' own — none
 * of them spells a seeded record — so no case asserts a value or a count the dataset owns (rule P-6). The
 * two fixed strings the cases assert are read from the types module rather than retyped, so each has one
 * owner: `SIM_LABELS[5]` for the label every element carries (rules P-1, P-5) and `COMPETITOR_NAME_TAG`
 * for the tag every competitor name carries (rule P-5).
 *
 * WHY THE NODE ENVIRONMENT, ON THE FIRST LINE ABOVE. Nothing here renders. Both functions are pure and
 * return text, so the suite needs no DOM, no service and no network (rule B-1).
 */

import { describe, expect, it } from 'vitest';

import { buildChokepointBrief, scopeChokepointBrief } from './chokepoint-brief';
import type { ChokepointBriefScope } from './chokepoint-brief';
import {
  ATLAS_PACK_BANNER,
  COMPETITOR_NAME_TAG,
  DEMO_CLOCK,
  SIM_LABELS,
} from '../../types';
import type {
  Chokepoint,
  ChokepointId,
  CompetitorId,
  CompetitorNetwork,
  ExportPayload,
  ProductId,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The fixtures
 * ------------------------------------------------------------------------------------------- */

/** The release label the fixture pack publishes, which the document must carry unchanged. */
const PACK_VERSION = 'fixture-pack-version';

/** The class the cases scope to, which the fixture pack's records are not classified in: it is the state
 * the atlas held in view rather than a field of any record here. */
const CLASS_IN_VIEW: ProductId = 'fixture-class-in-view';

/** The three competitors of the fixture pack, in the order the pack lists them. */
const COMPETITOR_ONE: CompetitorId = 'fixture-competitor-one';
const COMPETITOR_TWO: CompetitorId = 'fixture-competitor-two';
const COMPETITOR_THREE: CompetitorId = 'fixture-competitor-three';

/** The three crossings of the fixture pack, in the order the pack lists them. */
const CROSSING_ONE: ChokepointId = 'fixture-crossing-one';
const CROSSING_TWO: ChokepointId = 'fixture-crossing-two';
const CROSSING_THREE: ChokepointId = 'fixture-crossing-three';

/**
 * One competitor network of the fixture pack.
 *
 * The sites and lanes are empty because the brief names the competitors behind the crossings rather than
 * reproducing their networks; the case that would notice a network's own members reaching the file asserts
 * its absence below.
 *
 * @param competitorId - The competitor the network belongs to.
 * @param label - The network's own name.
 * @returns The network.
 */
function competitorNetwork(competitorId: CompetitorId, label: string): CompetitorNetwork {
  return {
    competitorId,
    label,
    provenance: 'market_intelligence',
    productClasses: [],
    sites: [],
    lanes: [],
  };
}

/**
 * One shared crossing of the fixture pack.
 *
 * The overlap and the day counts are this suite's own inputs rather than expected results (rule P-6): the
 * document copies them, and no case adds them up, rounds them or converts them.
 *
 * @param id - The crossing's identifier.
 * @param label - The crossing's name.
 * @param overlap - How far the competitors' use of the crossing overlaps.
 * @param bufferDays - Each competitor's buffer at the crossing, in days.
 * @param contentionNote - The plain-language account of the contention there.
 * @returns The crossing.
 */
function chokepoint(
  id: ChokepointId,
  label: string,
  overlap: number,
  bufferDays: Readonly<Record<CompetitorId, number>>,
  contentionNote: string,
): Chokepoint {
  return {
    id,
    label,
    overlap,
    competitorBufferDays: { ...bufferDays },
    contentionNote,
    provenance: 'market_intelligence',
  };
}

/** The fixture pack's three competitors, in the order the pack lists them. */
const COMPETITORS: readonly CompetitorNetwork[] = [
  competitorNetwork(COMPETITOR_ONE, 'Fixture competitor one'),
  competitorNetwork(COMPETITOR_TWO, 'Fixture competitor two'),
  competitorNetwork(COMPETITOR_THREE, 'Fixture competitor three'),
];

/** The fixture pack's three crossings, in an order neither alphabetical nor by overlap. */
const CHOKEPOINTS: readonly Chokepoint[] = [
  chokepoint(
    CROSSING_ONE,
    'Fixture crossing one',
    61,
    { [COMPETITOR_ONE]: 12, [COMPETITOR_TWO]: 9 },
    'The note the fixture states for the first crossing.',
  ),
  chokepoint(
    CROSSING_TWO,
    'Fixture crossing two',
    47,
    { [COMPETITOR_TWO]: 21 },
    'The note the fixture states for the second crossing.',
  ),
  chokepoint(
    CROSSING_THREE,
    'Fixture crossing three',
    38,
    { [COMPETITOR_THREE]: 6 },
    'The note the fixture states for the third crossing.',
  ),
];

/** The payload the builder composes from the fixture pack, built once because it reads no clock or state. */
const PAYLOAD: ExportPayload = buildChokepointBrief({
  competitors: COMPETITORS,
  chokepoints: CHOKEPOINTS,
  packVersion: PACK_VERSION,
});

/** The scope of an atlas showing every class the pack holds: every crossing, under no class. */
const WHOLE_PACK: ChokepointBriefScope = {
  productClass: null,
  chokepointIds: CHOKEPOINTS.map((crossing) => crossing.id),
};

/* ---------------------------------------------------------------------------------------------
 * Reading a document back
 * ------------------------------------------------------------------------------------------- */

/**
 * One of the document's lists, each record as its own member set, in the order the file writes them.
 *
 * Read as `unknown` and narrowed rather than cast, so a document whose members moved fails the case that
 * reads them instead of being trusted because a type says a member is there.
 *
 * @param document - The parsed document.
 * @param member - The member the records sit under, as the file spells it.
 * @returns Each record's members, in the file's order.
 */
function recordsOf(
  document: Record<string, unknown>,
  member: string,
): readonly Record<string, unknown>[] {
  const records = document[member];

  if (!Array.isArray(records)) {
    throw new Error(`The brief carries no ${member} list, so its records cannot be read.`);
  }

  return records.map((record: unknown): Record<string, unknown> => {
    if (typeof record !== 'object' || record === null || Array.isArray(record)) {
      throw new Error(`The brief's ${member} list holds a record that is not an object.`);
    }

    return { ...record };
  });
}

/**
 * One of the document's lists, reduced to the member that names each record.
 *
 * @param document - The parsed document.
 * @param member - The member the records sit under, as the file spells it.
 * @param idMember - The member of each record that names it.
 * @returns Each record's identifier, in the file's order.
 */
function idsIn(
  document: Record<string, unknown>,
  member: string,
  idMember: string,
): readonly unknown[] {
  return recordsOf(document, member).map((record) => record[idMember]);
}

/**
 * The members of a payload's document, parsed back so a case can perturb one of them.
 *
 * @param payload - The payload whose content is read.
 * @returns The document's members, keyed as the file spells them.
 */
function documentOf(payload: ExportPayload): Record<string, unknown> {
  const parsed: unknown = JSON.parse(payload.content);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('The payload does not carry a JSON object, so it is not a brief to read.');
  }

  return { ...parsed };
}

/**
 * A payload carrying text of a case's choosing under the brief's own file name and media type, so a case
 * can hand the scoping function content no adapter composes.
 *
 * @param content - The text the payload carries.
 * @returns The payload.
 */
function payloadCarrying(content: string): ExportPayload {
  return { filename: PAYLOAD.filename, mediaType: PAYLOAD.mediaType, content };
}

/**
 * The document a payload was scoped into, parsed back.
 *
 * @param payload - The payload the scoping function answered with.
 * @returns The scoped document's members.
 */
function scopedDocumentOf(payload: ExportPayload): Record<string, unknown> {
  return documentOf(payload);
}

/**
 * The competitors one crossing of a parsed document names in its own buffer days.
 *
 * `Chokepoint.competitorBufferDays` holds one entry per competitor that uses the crossing, so its keys
 * are the identifiers the crossing references — the ones the roster has to describe.
 *
 * @param crossing - One crossing record of the parsed document.
 * @returns Each competitor the crossing names, in the record's own order.
 */
function bufferDaysOf(crossing: Record<string, unknown>): readonly string[] {
  const days = crossing['competitorBufferDays'];

  if (typeof days !== 'object' || days === null || Array.isArray(days)) {
    throw new Error(
      'The brief’s crossing names no competitor buffer days, so its competitors cannot be read.',
    );
  }

  return Object.keys(days);
}

/* ---------------------------------------------------------------------------------------------
 * The builder: the whole pack, stamped with no class
 * ------------------------------------------------------------------------------------------- */

describe('buildChokepointBrief', () => {
  it('composes the whole pack under no class, every element carrying its own fixed label', () => {
    const document = documentOf(PAYLOAD);

    /* The document declares itself simulated at its top level, and states the class it reports. No class
       is in view for the builder, so the member is `null` rather than absent: the field is one member of
       the document in either form (rule P-1). */
    expect(document['simulated']).toBe(true);
    expect(document['productClass']).toBeNull();

    /* The pack's identity is its own: the release label the read published, the banner that names it, the
       instant the document was built at and the label every element of the brief carries. */
    expect(document['packVersion']).toBe(PACK_VERSION);
    expect(document['banner']).toBe(ATLAS_PACK_BANNER);
    expect(document['generatedAt']).toBe(DEMO_CLOCK);
    expect(document['simLabel']).toBe(SIM_LABELS[5]);

    /* Both lists are the pack's own records, in the pack's own order. */
    expect(idsIn(document, 'competitors', 'competitorId')).toStrictEqual([
      COMPETITOR_ONE,
      COMPETITOR_TWO,
      COMPETITOR_THREE,
    ]);
    expect(idsIn(document, 'chokepoints', 'id')).toStrictEqual([
      CROSSING_ONE,
      CROSSING_TWO,
      CROSSING_THREE,
    ]);

    /* Every competitor names itself the way the atlas prints it, and carries the label its family carries
       (rules P-1, P-5). */
    for (const competitor of recordsOf(document, 'competitors')) {
      expect(competitor['label']).toBeTypeOf('string');
      expect(competitor['provenance']).toBe('market_intelligence');
      expect(competitor['nameTag']).toBe(COMPETITOR_NAME_TAG);
      expect(competitor['simLabel']).toBe(SIM_LABELS[5]);
    }

    /* Every crossing keeps the measures the pack states, copied rather than recomputed (rule P-6). */
    for (const [index, crossing] of recordsOf(document, 'chokepoints').entries()) {
      const stated = CHOKEPOINTS[index];

      if (stated === undefined) {
        throw new Error('The document lists more crossings than the fixture pack holds.');
      }

      expect(crossing['label']).toBe(stated.label);
      expect(crossing['overlap']).toBe(stated.overlap);
      expect(crossing['competitorBufferDays']).toStrictEqual(stated.competitorBufferDays);
      expect(crossing['contentionNote']).toBe(stated.contentionNote);
      expect(crossing['provenance']).toBe('market_intelligence');
      expect(crossing['simLabel']).toBe(SIM_LABELS[5]);
    }

    /* The payload names its file and its type, and states no class it was not given. */
    expect(PAYLOAD.filename).toBe('chokepoint-brief.json');
    expect(PAYLOAD.mediaType).toBe('application/json');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The scope: the class in view, and the records it left drawn
 * ------------------------------------------------------------------------------------------- */

describe('scopeChokepointBrief', () => {
  it('narrows the crossings to the records the scope names, in the document’s order and not the scope’s', () => {
    const scoped = scopeChokepointBrief(PAYLOAD, {
      productClass: CLASS_IN_VIEW,
      /* The identifiers arrive in an order the document does not hold, and one crossing the scope does
         not name stands between the two it does: the narrowing selects records rather than reordering
         them. */
      chokepointIds: [CROSSING_THREE, CROSSING_ONE],
    });

    const document = scopedDocumentOf(scoped);
    const wholePack = documentOf(PAYLOAD);

    expect(idsIn(document, 'chokepoints', 'id')).toStrictEqual([CROSSING_ONE, CROSSING_THREE]);

    /* The roster is the document's own list, whole and in the document's own order: scoping selects the
       crossings and leaves the competitors it describes untouched. */
    expect(idsIn(document, 'competitors', 'competitorId')).toStrictEqual(
      idsIn(wholePack, 'competitors', 'competitorId'),
    );

    /* The records that did reach the file are the document's own, member for member: narrowing selects
       and never rewrites. */
    const kept = recordsOf(document, 'chokepoints').map((crossing) => crossing['id']);
    const expected = recordsOf(wholePack, 'chokepoints').filter((crossing) =>
      kept.includes(crossing['id']),
    );

    expect(recordsOf(document, 'chokepoints')).toStrictEqual(expected);
  });

  it('describes every competitor its crossings reference, whichever crossings the scope keeps', () => {
    /* One crossing is kept, and its buffer days name one competitor while the pack records three:
       narrowing the roster beside the crossings would leave the file holding two identifiers nothing in
       it resolves to a name, a label or a provenance. */
    const scoped = scopeChokepointBrief(PAYLOAD, {
      productClass: CLASS_IN_VIEW,
      chokepointIds: [CROSSING_TWO],
    });

    const document = scopedDocumentOf(scoped);
    const roster = idsIn(document, 'competitors', 'competitorId');
    const referenced = recordsOf(document, 'chokepoints').flatMap(bufferDaysOf);

    expect(idsIn(document, 'chokepoints', 'id')).toStrictEqual([CROSSING_TWO]);
    expect(referenced).toStrictEqual([COMPETITOR_TWO]);
    expect(roster).toStrictEqual([COMPETITOR_ONE, COMPETITOR_TWO, COMPETITOR_THREE]);

    for (const competitorId of referenced) {
      expect(roster).toContain(competitorId);
    }
  });

  it('states the class the file was narrowed to and carries the document’s own members over unchanged', () => {
    const scoped = scopeChokepointBrief(PAYLOAD, {
      productClass: CLASS_IN_VIEW,
      chokepointIds: [],
    });

    const document = scopedDocumentOf(scoped);
    const wholePack = documentOf(PAYLOAD);

    /* The class in view is stamped into the file, so a reader knows which slice of the pack it reports. */
    expect(document['productClass']).toBe(CLASS_IN_VIEW);

    /* Everything the document itself stated is carried over unchanged, the roster and its order
       included. */
    for (const member of [
      'simulated',
      'generatedAt',
      'packVersion',
      'banner',
      'simLabel',
      'competitors',
    ]) {
      expect(document[member]).toStrictEqual(wholePack[member]);
    }

    /* The download is the same file under the same name and type, whichever class was in view. */
    expect(scoped.filename).toBe(PAYLOAD.filename);
    expect(scoped.mediaType).toBe(PAYLOAD.mediaType);

    /* A scope that names no crossing lists none, and still describes every competitor the pack records:
       the crossings are what the class narrows, never the roster. */
    expect(idsIn(document, 'chokepoints', 'id')).toStrictEqual([]);
    expect(idsIn(document, 'competitors', 'competitorId')).toStrictEqual(
      COMPETITORS.map((network) => network.competitorId),
    );
  });

  it('reproduces the builder’s bytes where every class the pack holds is in view', () => {
    const scoped = scopeChokepointBrief(PAYLOAD, WHOLE_PACK);

    /* The whole pack under no class is the document the builder composed: reading it back and serialising
       it again adds, drops and reorders nothing. */
    expect(scoped.content).toBe(PAYLOAD.content);
    expect(scopedDocumentOf(scoped)['productClass']).toBeNull();
  });

  it('composes the same bytes on every call over one payload and one scope', () => {
    const scope: ChokepointBriefScope = {
      productClass: CLASS_IN_VIEW,
      chokepointIds: [CROSSING_ONE, CROSSING_TWO],
    };

    const first = scopeChokepointBrief(PAYLOAD, scope);
    const second = scopeChokepointBrief(PAYLOAD, scope);

    /* Nothing in the scoping reads a clock, a random source or a mutable global, so the same payload and
       scope yield the same file on every call (contracts §1). */
    expect(second.content).toBe(first.content);
    expect(first.content).toBe(scopeChokepointBrief(PAYLOAD, { ...scope }).content);
  });

  it.each<{ readonly condition: string; readonly content: string }>([
    { condition: 'text that is not JSON', content: 'not a brief' },
    { condition: 'a JSON list', content: '[]' },
    { condition: 'a JSON string', content: '"simulated": true' },
    { condition: 'an object that is not a document of the brief’s', content: '{}' },
  ])('refuses content that is $condition rather than scoping it', ({ content }) => {
    expect(() => scopeChokepointBrief(payloadCarrying(content), WHOLE_PACK)).toThrow(
      /chokepoint brief|brief/iu,
    );
  });

  it('refuses a document that declares itself something other than the simulated brief', () => {
    const document = documentOf(PAYLOAD);

    expect(() =>
      scopeChokepointBrief(
        payloadCarrying(JSON.stringify({ ...document, simulated: false }, null, 2)),
        WHOLE_PACK,
      ),
    ).toThrow(/does not declare itself simulated/u);
  });

  it('refuses a document whose list holds a record the brief does not declare', () => {
    const document = documentOf(PAYLOAD);

    expect(() =>
      scopeChokepointBrief(
        payloadCarrying(JSON.stringify({ ...document, chokepoints: [{ id: CROSSING_ONE }] }, null, 2)),
        WHOLE_PACK,
      ),
    ).toThrow(/chokepoint brief/u);
  });
});
