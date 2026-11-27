/**
 * Component suite for `competitive-atlas-screen.tsx`, the SCR-13 competitive atlas of stage S3.
 *
 * WHY THIS FILE EXISTS. AAP §0.13.1's tree and §0.15.1's File Creation Plan give this path its row
 * (High, Test); AAP §0.12.4's SCR-13 row and §0.14.1's S3 row fix what the screen must show; and
 * AAP §0.15.2 ("Testing") places a colocated component suite beside the module it covers, while the
 * route-level acceptance test `T-21` and the axe pass belong to `e2e/s3-atlas.spec.ts` in another
 * folder. This file therefore carries plain behaviour titles rather than a `T-nn` identifier:
 * duplicating a browser identifier here would misreport what is covered where.
 *
 * WHAT IS UNDER TEST. The screen is the `/competitive` route's listener and the composer of two
 * presentational siblings — `CompetitorNetwork` and `ChokepointTable` — so every case below asserts
 * a clause of that composition rather than its markup:
 *
 * 1. The pack banner is the imported `ATLAS_PACK_BANNER` character for character, and it is on the
 *    page in every state, including the refusal, because the screen renders it outside the state
 *    boundary (AAP §0.12.4 SCR-13, rule P-1).
 * 2. The radar draws exactly one polygon per series the payload carried, one vertex per axis, and
 *    the legend beside it describes the same series one row each: no element carries two series and
 *    no table column combines them (rule P-5).
 * 3. The client's own series is tagged with the imported `CLIENT_SELF_ASSESSMENT_LABEL` and carries
 *    no second `Simulated data` label, asserted inside the client's own legend row and selector
 *    control rather than against the document (rule P-1, rule P-5).
 * 4. Every competitor name the screen paints — in the legend, in the entity selector, in the network
 *    drawing and in the chokepoint table — is followed by the imported `COMPETITOR_NAME_TAG`, and
 *    every competitor series carries the market-intelligence member of `SIM_LABELS`.
 * 5. A `'permission'` refusal renders the forbidden card with the permission the role lacks, the
 *    roles that hold it and the trace identifier of the refused call, and no data surface is shown
 *    as if it had been read (AAP §0.6.2, rule P-8).
 * 6. The chokepoint table carries all seven of its columns and prints the crossings in the order the
 *    pack supplied, each figure exactly as the record stated it (AAP §0.8, rule P-6).
 * 7. The export asks the port for the brief once and offers the document it composed, unchanged,
 *    through the browser's download path: the payload still carries `"simulated": true`, nothing
 *    was re-serialised and no origin was asked for anything (rule P-1, rule B-1).
 * 8. All seven states of specification §8 render for the outcome the screen derives them from —
 *    driven only by what the stubbed read and its `Result.meta` report, never by a flag name — and
 *    the retry the offline and conflict states offer reads the atlas again.
 * 9. The export and both selector groups are reached and operated from the keyboard alone, a control
 *    that cannot act states why in words a screen reader reads (rule B-3, rule P-8), and each caption
 *    naming the class or the entity in view is a status region that announces the change when the
 *    reader makes one (WCAG 2.2 SC 4.1.3).
 * 10. Both themes draw the same surface, read through accessible names, roles and text rather than
 *     through a colour value (rule B-3).
 * 11. The product-class selector narrows every drawn surface — the radar series, the competitor
 *     networks, their sites and the crossings their lanes traverse — states the class in view in words
 *     beside its controls, restores the whole pack from "All product classes", and falls back to the
 *     class's own default entity when the chosen one leaves the view (AAP §0.12.4, rules B-3, P-8).
 * 12. Every mark the screen draws opens the record behind it — a radar vertex the single reading it
 *     draws, a site mark and a crossing halo the identifier the payload gave it, and the chokepoint
 *     table's overlap and buffer-day figures the crossing of their own row — and the drawer shows that
 *     record's four sections rather than a failure region (AAP §0.2.1 F12, §0.12.4, rule P-8).
 * 13. A press on either drawing is resolved to the mark nearest the pointer — even where a
 *     neighbouring mark's larger target is painted above the mark aimed at — and to nothing at all
 *     when it lands clear of every mark (rule P-8).
 * 14. The entity in view is marked in both drawings rather than only in the caption beside the
 *     selector: the radar's emphasised outline and its `aria-current` label-band row follow it, and
 *     the network drawing emphasises that family while the other competitor families recede — the
 *     client's own network included, both as the atlas's opening entity and after a competitor is
 *     chosen (rule P-8, rule B-3).
 * 15. One competitor keeps one hue on every surface when the payload orders its series and its
 *     networks differently, because the slot each renderer paints is resolved from the competitor's
 *     own identifier (rule P-5).
 * 16. Every series is labelled at its own polygon inside the radar drawing — its own label, its own
 *     swatch and a leader to its own vertex — so the outlines are told apart on the drawing rather
 *     than only in the legend beside it (rule P-1).
 * 17. Both of the atlas's tables state whose figures they print: the network table's last column
 *     labels every row with the family it belongs to — market intelligence for a competitor's site,
 *     `Simulated data` for the client's own — and the chokepoint table names each competitor beside
 *     its identifier and its buffer days, from the name the payload holds (rules P-1, P-5, P-7).
 * 18. The chokepoint alert strip leads the content once the read settles — one alert per crossing the
 *     payload carried, in the payload's order, each carrying the market-intelligence label and no
 *     control at all (AAP 0.14.1's S3 row, AAP 0.7's S3 stage row, rules P-1, P-5 and P-8).
 *
 * WHERE THE DATA COMES FROM. The service is mocked at `service-provider.tsx`, the one boundary a
 * screen may read through (rule P-2), so no seed module, no adapter, no HTTP client and nothing from
 * `tests/fixtures/` is involved, and a case observes exactly the calls the screen makes. The stub is
 * typed against `SiteIntelligenceService`, so a renamed or re-signatured port member fails the type
 * check instead of arriving at run time as a call on `undefined`. Everything else — the two
 * siblings, `Card`, `PageHeader`, `ChartFrame`, `RadarChart`, `Legend`, `DataTable`, `StateBoundary`,
 * `ForbiddenCard`, `ActionButton` and the SVG surfaces under them — is the real module, because what
 * a reader receives is the thing under test.
 *
 * THE FIXTURE IS INPUT, NOT AN EXPECTED RESULT (rule P-6). Every value below is data handed to the
 * stubbed read, so the screen is free to place it and a case can only pass by finding what the screen
 * actually rendered: the competitor names, the crossing names, the site names, the contention notes,
 * the overlap and the buffer days are this suite's own plain placeholders, stated once as constants
 * and compared as the values that were supplied. No case recomputes a figure, no case types a
 * currency amount, and no identifier carries a record's shape (`crossing-one`, `series-client`,
 * `site-client-one`) — except a competitor's, which follows contracts §1's `CMP-nn` pattern because
 * the slot every renderer paints it in is resolved from that identifier and from nothing else. The
 * seed holds the real records, and a component test that borrowed them would assert the payload
 * instead of the screen. Every fixed string the screen shows is imported from the
 * module that owns it (`ATLAS_PACK_BANNER`, `COMPETITOR_NAME_TAG`, `CLIENT_SELF_ASSESSMENT_LABEL`,
 * `SIM_LABELS`, `SOURCE_LABELS`, `COMPETITIVE_ATLAS_TEXT`, `STATE_BOUNDARY_TEXT`,
 * `COMPETITOR_NETWORK_TEXT`, `RADAR_CHART_TEXT`, `VIEW_AS_TABLE_LABELS`), so a reworded label reaches
 * one place and this suite fails rather than silently asserting wording the interface no longer shows.
 *
 * The competitor tag is imported, never compared as a literal. Rule P-5's literal wording fixes it
 * with one company word, while AAP §0.10's companion-string row pairs the same tag with a different
 * one. `src/types/primitives.ts` settles the pair by shipping `COMPETITOR_NAME_TAG` as the rule's
 * own wording, naming the rule — the highest-ranked input, per AAP §0.1 — as the winner in that
 * constant's documentation. This suite imports the constant and compares against it, so it encodes
 * neither literal and follows the resolution wherever it moves.
 *
 * `chokepoint-table.tsx` keeps its seven column headers in a module-private constant and exports no
 * accessor, so {@link CHOKEPOINT_COLUMNS} restates them once here: they are structural names rather
 * than specification strings, and a reworded header reaches exactly one place.
 *
 * jsdom implements neither `URL.createObjectURL` nor `URL.revokeObjectURL`, and the screen's download
 * path calls both directly, so the export case installs them as spies, stubs
 * `HTMLAnchorElement.prototype.click` so the file that would be offered is observed rather than
 * navigated to, and restores the globals afterwards.
 *
 * The claim vocabulary rule P-4 forbids is not typed here. `tests/source-checks` rejects it anywhere
 * under `src/`, and this folder sits inside that scan, so a case that wrote it into an assertion
 * would turn the project's own gate red to prove the screen does not say it. The property is held by
 * the source check, and the refusal case asserts what the card does say.
 *
 * Rules this suite is written to hold to:
 * - B-1: the request spies prove the surface fetches nothing while it is drawn and exported, and the
 *   attribute scan proves no element it leaves behind addresses a host or embeds a remote resource.
 * - B-2: no credential of any kind, and no read of a build-time or process-wide environment value
 *   (the source checks own that scan, so this file does not spell the identifier it hunts for).
 * - B-3: every interaction is driven from the keyboard through `@testing-library/user-event`, the
 *   surfaces are found by their accessible names, both chart frames offer a table view, and no
 *   assertion compares a colour value.
 * - P-1: every label is read from the constant that owns it and asserted inside the element that
 *   carries it, never against a page-level badge.
 * - P-2: only the provider module is mocked; no seed, adapter, app module or sibling feature is
 *   imported, and every record arrives through `useService()`.
 * - P-5: the non-blending and tagging cases are the point of this file; the client series and each
 *   competitor series are asserted separately, and no assertion accepts a combined figure.
 * - P-6: every expectation is derived from the inline payload or from a structural count.
 * - P-7: fixture names are plainly synthetic, and no real vendor, customer, carmaker or cloud
 *   product name, no filler text and no other product name appears.
 * - P-8: a disabled control is asserted to expose its reason, and no case accepts a focus stop that
 *   does nothing.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock, touches the network or reaches outside the service boundary.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { EVIDENCE_DRAWER_TEXT } from '../../components/evidence-drawer';
import { CHART_TONE_CLASSES } from '../../components/horizontal-bar-chart';
import { RADAR_CHART_TEXT } from '../../components/radar-chart';
import { STATE_BOUNDARY_TEXT } from '../../components/state-boundary';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import {
  ATLAS_PACK_BANNER,
  CLIENT_SELF_ASSESSMENT_LABEL,
  COMPETITOR_NAME_TAG,
  DEMO_CLOCK,
  SIM_LABELS,
  SOURCE_LABELS,
} from '../../types';
import type {
  Atlas,
  AtlasSeries,
  AtlasSite,
  Chokepoint,
  CompetitorId,
  CompetitorNetwork,
  Evidence,
  ExportPayload,
  Freshness,
  FreshnessState,
  Meta,
  Permission,
  Problem,
  ProductId,
  RadarAxis,
  Result,
  Role,
  Scope,
  SourceId,
} from '../../types';
import { COMPETITIVE_ATLAS_TEXT, CompetitiveAtlasScreen } from './competitive-atlas-screen';
import { COMPETITOR_NETWORK_TEXT, nearestNetworkMark } from './competitor-network';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced — rule P-2
 * ------------------------------------------------------------------------------------------- */

/**
 * The members of the port this surface reaches, and the only ones this suite stubs.
 *
 * Typed as a `Pick` of the port rather than as a shape of this file's own, so the stub cannot drift
 * from the interface: a member the screen starts to call that the stub does not carry fails the type
 * check here instead of arriving at run time as a call on `undefined`. The screen makes one read and
 * one action, and the evidence drawer that every mark it draws opens reads the third, so no other
 * member of `SiteIntelligenceService` answers this surface.
 */
type AtlasPort = Pick<
  SiteIntelligenceService,
  'getAtlas' | 'exportChokepointBrief' | 'getEvidence'
>;

/**
 * The stub every case drives: one mock per member, each typed by the port's own signature.
 *
 * `vi.hoisted` because `vi.mock`'s factory runs before this module's declarations exist, and the
 * mocks a case arms afterwards have to be the same objects the screen calls.
 */
const port: { readonly [K in keyof AtlasPort]: Mock<AtlasPort[K]> } = vi.hoisted(() => ({
  getAtlas: vi.fn<SiteIntelligenceService['getAtlas']>(),
  exportChokepointBrief: vi.fn<SiteIntelligenceService['exportChokepointBrief']>(),
  getEvidence: vi.fn<SiteIntelligenceService['getEvidence']>(),
}));

/**
 * Replaces the provider module: the one boundary a screen may read through (rule P-2).
 *
 * The screen reads `useService` alone, and the other two exports are answered with nothing so a
 * component that asks for the demonstration controls or the active persona finds an honest absence
 * rather than a missing export.
 */
vi.mock('../../services/service-provider', () => ({
  useService: () => port,
  useDemonstration: () => null,
  useActiveUser: () => null,
}));

/* ---------------------------------------------------------------------------------------------
 * The one piece of wording this suite cannot import
 * ------------------------------------------------------------------------------------------- */

/**
 * The chokepoint table's seven column headers, in the order the table renders them.
 *
 * `./chokepoint-table.tsx` keeps them in a module-private constant and exports no accessor, so they
 * are restated here once. They are structural column names, not specification strings, and their
 * order is what AAP §0.12.4's SCR-13 row fixes: the crossing's identity, its name, the competitors
 * that use it, the overlap, the competitor buffer days, the contention note and the row's provenance.
 */
const CHOKEPOINT_COLUMNS = [
  'Chokepoint',
  'Crossing',
  'Competitors',
  'Overlap',
  'Competitor buffer days',
  'Contention note',
  'Provenance',
] as const;

/* ---------------------------------------------------------------------------------------------
 * Both themes, the demonstration clock and the selection a shell hands in
 * ------------------------------------------------------------------------------------------- */

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** The correlation identifier every stubbed answer carries, as `Meta.traceId`. */
const TRACE_ID = 'trace-atlas';

/**
 * The instant every record in this fixture carries, read from the constant demonstration clock so
 * no case writes a timestamp of its own (contracts §1).
 */
const AS_OF = DEMO_CLOCK;

/**
 * The source the atlas is read from, which is the source the stale banner must name: the screen
 * looks for the market pack first and falls back to any other stale source.
 */
const MARKET_PACK_SOURCE: SourceId = 'market-pack';

/**
 * The selection a shell that has not filtered yet holds: the empty plant and product arrays, which
 * `Scope` documents as "all plants" and "all products" rather than as "none".
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/* ---------------------------------------------------------------------------------------------
 * The radar: five axes, the client's own series and three competitors
 * ------------------------------------------------------------------------------------------- */

/** The five axes, named as plain words so an axis assertion cannot match a series' own label. */
const AXES: readonly RadarAxis[] = [
  { id: 'axis-alpha', label: 'Axis alpha' },
  { id: 'axis-beta', label: 'Axis beta' },
  { id: 'axis-gamma', label: 'Axis gamma' },
  { id: 'axis-delta', label: 'Axis delta' },
  { id: 'axis-epsilon', label: 'Axis epsilon' },
];

/**
 * The two product classes the fixture payload offers, and the classes its competitor networks are
 * classified in.
 *
 * `Competitor A` competes in both, `Competitor B` only in the first and `Competitor C` only in the
 * second, so a case can choose a class that narrows the atlas by more than one surface without
 * emptying it, and can choose the class that removes a competitor it had selected.
 */
const FIRST_CLASS = 'class-one';
const SECOND_CLASS = 'class-two';

/**
 * The three competitor identifiers the fixture payload carries, in the pattern contracts §1 fixes for
 * them (`CMP-nn`).
 *
 * The identifier is what a competitor's colour is selected by — the screen's legend, the radar and
 * the network drawing all resolve their slot from it through `competitorSlotOf` — so the fixture
 * states the identifiers in that pattern rather than as plain placeholders: `CMP-01` takes §4.2's
 * first competitor slot, `CMP-02` the second and `CMP-03` the third. A case that reorders the payload
 * therefore keeps each competitor in its own hue.
 */
const COMPETITOR_ONE: CompetitorId = 'CMP-01';
const COMPETITOR_TWO: CompetitorId = 'CMP-02';
const COMPETITOR_THREE: CompetitorId = 'CMP-03';

/**
 * The client's own series: a first-party self-assessment, so it carries the companion tag from
 * `src/types` rather than one of the seven fixed labels.
 *
 * `competitorId` is `null` because the series reports on the client rather than on a competitor
 * network, which is what keeps the class filter from hiding it.
 */
const CLIENT_SERIES: AtlasSeries = {
  id: 'series-client',
  competitorId: null,
  label: 'Client network',
  provenance: 'first_party',
  simLabel: CLIENT_SELF_ASSESSMENT_LABEL,
  values: [68, 54, 61, 87, 70],
};

/**
 * The three competitor series, market intelligence every one.
 *
 * Their names are deliberately plain and their scores differ on every axis, so no two outlines can
 * coincide and a screen that merged two series into one shape would draw a polygon the count below
 * cannot explain (rule P-5). Each names the network it scores, which is the join the class filter
 * reads.
 */
const COMPETITOR_SERIES: readonly AtlasSeries[] = [
  {
    id: 'series-competitor-one',
    competitorId: COMPETITOR_ONE,
    label: 'Competitor A',
    provenance: 'market_intelligence',
    simLabel: SIM_LABELS[5],
    values: [74, 63, 79, 58, 66],
  },
  {
    id: 'series-competitor-two',
    competitorId: COMPETITOR_TWO,
    label: 'Competitor B',
    provenance: 'market_intelligence',
    simLabel: SIM_LABELS[5],
    values: [59, 81, 52, 64, 75],
  },
  {
    id: 'series-competitor-three',
    competitorId: COMPETITOR_THREE,
    label: 'Competitor C',
    provenance: 'market_intelligence',
    simLabel: SIM_LABELS[5],
    values: [83, 57, 70, 72, 61],
  },
];

/** Every series the payload carries, in the order the pack lists them. */
const SERIES: readonly AtlasSeries[] = [CLIENT_SERIES, ...COMPETITOR_SERIES];

/* ---------------------------------------------------------------------------------------------
 * The network: the client's own site and one network per competitor
 * ------------------------------------------------------------------------------------------- */

/** The client's own site: the first-party side of the overlay, and the one site with no owner. */
const CLIENT_SITE: AtlasSite = {
  id: 'site-client-one',
  competitorId: null,
  label: 'Client site one',
  latitude: 50.11,
  longitude: 8.68,
};

/**
 * One competitor's network, built from the members a case needs to tell it apart.
 *
 * Both sites belong to the network that lists them and the lane joins them, so the drawing places
 * every mark from the payload alone. A lane names a crossing where the pack records one, which is
 * what places the shared-chokepoint halos. The product classes are the payload's own list of the
 * classes the network competes in, which is what the screen's class filter reads.
 *
 * @param competitorId The competitor the network belongs to, as the payload spells it.
 * @param label The network's own name.
 * @param siteSuffix The suffix that keeps this network's two site identifiers distinct.
 * @param crossingId The crossing this network's lane traverses.
 * @param productClasses The product classes the pack classifies this network in.
 * @returns The network.
 */
function competitorNetwork(
  competitorId: CompetitorId,
  label: string,
  siteSuffix: string,
  crossingId: string,
  productClasses: readonly ProductId[],
): CompetitorNetwork {
  return {
    competitorId,
    label,
    provenance: 'market_intelligence',
    productClasses: [...productClasses],
    sites: [
      {
        id: `site-${siteSuffix}-one`,
        competitorId,
        label: `${label} site one`,
        latitude: 48.14,
        longitude: 11.58,
      },
      {
        id: `site-${siteSuffix}-two`,
        competitorId,
        label: `${label} site two`,
        latitude: 45.46,
        longitude: 9.19,
      },
    ],
    lanes: [{ fromId: `site-${siteSuffix}-one`, toId: `site-${siteSuffix}-two`, chokepointId: crossingId }],
  };
}

/** The three competitor networks, in the order the pack lists them. */
const COMPETITOR_NETWORKS: readonly CompetitorNetwork[] = [
  competitorNetwork(COMPETITOR_ONE, 'Competitor A', 'competitor-a', 'crossing-one', [
    FIRST_CLASS,
    SECOND_CLASS,
  ]),
  competitorNetwork(COMPETITOR_TWO, 'Competitor B', 'competitor-b', 'crossing-one', [FIRST_CLASS]),
  competitorNetwork(COMPETITOR_THREE, 'Competitor C', 'competitor-c', 'crossing-two', [
    SECOND_CLASS,
  ]),
];

/** The competitor networks the first class leaves in view: the ones the pack classifies in it. */
const FIRST_CLASS_NETWORKS: readonly CompetitorNetwork[] = COMPETITOR_NETWORKS.filter((network) =>
  network.productClasses.includes(FIRST_CLASS),
);

/**
 * The §4.2 tone each fixture competitor's identifier states, stated once so a case compares a surface
 * against the competitor's identity rather than against the position it holds in a list.
 *
 * `CMP-01` is the first competitor role, `CMP-02` the second and `CMP-03` the third — the slot every
 * renderer resolves from the identifier through `competitorSlotOf`, so a payload that orders its
 * series and its networks differently must still paint each competitor in its own entry of this list.
 */
const COMPETITOR_TONE_BY_ID = [
  { competitorId: COMPETITOR_ONE, tone: CHART_TONE_CLASSES['competitor-1'] },
  { competitorId: COMPETITOR_TWO, tone: CHART_TONE_CLASSES['competitor-2'] },
  { competitorId: COMPETITOR_THREE, tone: CHART_TONE_CLASSES['competitor-3'] },
] as const;

/* ---------------------------------------------------------------------------------------------
 * The shared crossings, and the two measures the table prints exactly as stated
 * ------------------------------------------------------------------------------------------- */

/**
 * The two measures the chokepoint table prints, held as constants so a case compares a cell against
 * the value it supplied rather than against a number typed twice (rule P-6).
 *
 * They are the market pack's own scale: `Chokepoint.overlap` is a bare number whose scale belongs to
 * the record, and `competitorBufferDays` is a count of days per competitor. Nothing here computes,
 * rounds or converts either, and no case states an amount of money.
 */
const OVERLAP_FIRST = 67;
const OVERLAP_SECOND = 42;
const BUFFER_DAYS_FIRST = 12;
const BUFFER_DAYS_SECOND = 9;
const BUFFER_DAYS_THIRD = 21;

/**
 * The two crossings the pack records, in a deliberate order that is neither alphabetical nor by
 * overlap, so a table that sorted them itself would fail the order assertion below.
 *
 * The first is used by two competitors and the second by one, which is also what makes the two
 * competitor columns of a row readable: a crossing only one network uses prints one line.
 */
const CHOKEPOINTS: readonly Chokepoint[] = [
  {
    id: 'crossing-one',
    label: 'Chokepoint one',
    overlap: OVERLAP_FIRST,
    competitorBufferDays: {
      [COMPETITOR_ONE]: BUFFER_DAYS_FIRST,
      [COMPETITOR_TWO]: BUFFER_DAYS_SECOND,
    },
    contentionNote: 'The note the pack states for the first crossing.',
    provenance: 'market_intelligence',
  },
  {
    id: 'crossing-two',
    label: 'Chokepoint two',
    overlap: OVERLAP_SECOND,
    competitorBufferDays: { [COMPETITOR_THREE]: BUFFER_DAYS_THIRD },
    contentionNote: 'The note the pack states for the second crossing.',
    provenance: 'market_intelligence',
  },
];

/* ---------------------------------------------------------------------------------------------
 * The payload the port returns
 * ------------------------------------------------------------------------------------------- */

/**
 * The atlas payload every case starts from: the pack's banner, its class list, the client's own
 * sites, the competitors' networks, the shared crossings, the radar's axes and its series.
 *
 * `packVersion` is a plain placeholder rather than a release label, because this suite asserts
 * nothing about it and a version-shaped literal would be a record value invented here. The client's
 * sites and the competitors' networks are separate members and no member of the record combines
 * them, which is what makes the non-blending rule P-5 structural rather than reviewed.
 */
const ATLAS: Atlas = {
  packLabel: ATLAS_PACK_BANNER,
  packVersion: 'pack-version-under-test',
  productClasses: [FIRST_CLASS, SECOND_CLASS],
  clientSites: [CLIENT_SITE],
  competitors: [...COMPETITOR_NETWORKS],
  chokepoints: [...CHOKEPOINTS],
  radarAxes: [...AXES],
  radarSeries: [...SERIES],
};

/**
 * What the first class leaves drawn, derived from the fixture the way the screen derives it: the
 * networks the pack classifies in that class, the series the client and those networks carry, the
 * crossings a lane of one of them traverses, and the sites they place.
 *
 * A case compares the surface against these, so an assertion states what the payload holds rather
 * than a number typed twice (rule P-6).
 */
const FIRST_CLASS_SERIES: readonly AtlasSeries[] = SERIES.filter(
  (entry) =>
    entry.competitorId === null ||
    FIRST_CLASS_NETWORKS.some((network) => network.competitorId === entry.competitorId),
);

/** The crossings the first class leaves in view. */
const FIRST_CLASS_CHOKEPOINTS: readonly Chokepoint[] = CHOKEPOINTS.filter((crossing) =>
  FIRST_CLASS_NETWORKS.some((network) =>
    network.lanes.some((lane) => lane.chokepointId === crossing.id),
  ),
);

/** The sites the first class leaves drawn: the client's own and those of its networks. */
const FIRST_CLASS_SITES: readonly AtlasSite[] = [
  ...ATLAS.clientSites,
  ...FIRST_CLASS_NETWORKS.flatMap((network) => [...network.sites]),
];

/**
 * The payload of a pack with nothing to compare: no series and no crossing, so the screen's own
 * emptiness check decides the state rather than a missing record.
 */
const EMPTY_PACK: Atlas = {
  ...ATLAS,
  clientSites: [],
  competitors: [],
  chokepoints: [],
  radarSeries: [],
};

/* ---------------------------------------------------------------------------------------------
 * The payload the press cases draw: two marks close enough that one target covers the other's dot
 * ------------------------------------------------------------------------------------------- */

/**
 * The competitor site the press cases draw, placed beside the client's own site on the drawing's
 * frame.
 *
 * Both coordinates are this suite's own plain placeholders, chosen so the frame draws the two marks
 * a few units apart — closer together than a mark's pointer target, which is the overlap the press
 * resolution exists for.
 */
const PRESS_SITE: AtlasSite = {
  id: 'site-press-competitor',
  competitorId: COMPETITOR_ONE,
  label: 'Competitor site pressed',
  latitude: 48.8,
  longitude: 11.9,
};

/**
 * The atlas the press cases draw: the client's own site and one competitor's site, and no lane, so
 * nothing but those two marks stands on the drawing.
 *
 * A crossing record stays in the payload because a pack with no crossing is the screen's empty state;
 * with no lane naming it the frame has nowhere to place it, so it draws no halo and the two marks are
 * all a press can reach.
 */
const PRESS_ATLAS: Atlas = {
  ...ATLAS,
  competitors: [
    {
      competitorId: COMPETITOR_ONE,
      label: 'Competitor A',
      provenance: 'market_intelligence',
      productClasses: [FIRST_CLASS],
      sites: [PRESS_SITE],
      lanes: [],
    },
  ],
  chokepoints: CHOKEPOINTS.slice(0, 1),
  radarSeries: SERIES.filter(
    (entry) => entry.competitorId === null || entry.competitorId === PRESS_SITE.competitorId,
  ),
};

/**
 * The evidence the drawer renders for whichever series a case opens.
 *
 * The case below asserts which reference the screen asked the service for, not what the drawer says
 * about it, so this payload states no figure of its own: its strings are this file's own words and the
 * one §5.3 label a market-intelligence reading carries arrives from `SIM_LABELS` (rules P-1, P-5, P-6).
 */
const EVIDENCE: Evidence = {
  value: 'the scores the market pack states',
  provenance: 'market_intelligence',
  label: SIM_LABELS[5],
  formula: 'The scoring relation the pack states, quoted by the read.',
  inputs: ['input-one'],
  upstream: [],
  downstream: [],
  confidence: { level: 'high', reason: 'Every value is a field of the record itself.' },
  missingInputs: [],
  documents: [],
};

/**
 * One `Result<Atlas>` envelope: the payload, the freshness report a case asks for, the literal
 * `simulated: true` every response carries and this suite's correlation identifier.
 *
 * @param payload The atlas to answer with.
 * @param state The state the market pack reports, defaulting to a current source.
 * @returns The envelope the port resolves with.
 */
function envelope(payload: Atlas, state: FreshnessState = 'fresh'): Result<Atlas> {
  const freshness: Freshness[] = [{ source: MARKET_PACK_SOURCE, asOf: AS_OF, state }];
  const meta: Meta = { freshness, simulated: true, traceId: TRACE_ID };

  return { data: payload, meta };
}

/**
 * The brief the export answers with, composed as its builder composes it: JSON text carrying the
 * simulation marker at its top level and the pack release the read published.
 *
 * The document is deliberately one this suite can compare byte for byte, because the screen must
 * offer it unchanged (rule P-1): nothing adds, strips or re-serialises a field on the way through.
 */
const EXPORT_PAYLOAD: ExportPayload = {
  filename: 'chokepoint-brief.json',
  mediaType: 'application/json',
  content: JSON.stringify(
    {
      simulated: true,
      packVersion: ATLAS.packVersion,
      chokepoints: CHOKEPOINTS.map((crossing) => crossing.id),
    },
    null,
    2,
  ),
};

/**
 * One `Result<Evidence>` envelope, shaped as the port answers it: the record, an empty freshness report
 * and the correlation identifier every stubbed answer in this suite carries.
 *
 * @param evidence The record the drawer is answered with.
 * @returns The envelope the port resolves with.
 */
function evidenceEnvelope(evidence: Evidence): Result<Evidence> {
  const meta: Meta = { freshness: [], simulated: true, traceId: TRACE_ID };

  return { data: evidence, meta };
}

/* ---------------------------------------------------------------------------------------------
 * The refusals a state case needs
 * ------------------------------------------------------------------------------------------- */

/** The permission the atlas read requires (AAP §0.12.3 `GET /market-intelligence/atlas`). */
const DENIED_PERMISSION: Permission = 'competitive.read';

/** A role that holds the permission above, named by the refusal and printed by the card. */
const HOLDING_ROLE: Role = 'head-of-supply-chain';

/**
 * The refusal the external supplier engineer meets: the permission the role lacks, the roles that
 * hold it and the trace identifier of the refused call, member for member what the card explains.
 */
const DENIAL: Problem = {
  type: 'permission',
  message: 'The acting role may not read the competitive atlas.',
  traceId: `${TRACE_ID}-refused`,
  requiredPermission: DENIED_PERMISSION,
  rolesWithPermission: [HOLDING_ROLE],
};

/**
 * A rejection that did not arrive in the port's `Problem` shape: the read stopped without answering,
 * so the boundary reports it as a source that did not answer and offers the retry it is allowed to
 * offer (rule P-8). A `'not-found'` refusal is the unified `'empty'` on every screen, and
 * `src/components/screen-state.test.ts` proves that mapping once for all of them.
 */
const FAILURE = new Error('the atlas read stopped without answering');

/** A refusal made while the records moved under the reader, which the boundary shows as a conflict. */
const CONFLICT: Problem = {
  type: 'validation',
  message: 'The records moved while they were read.',
  traceId: TRACE_ID,
};

/* ---------------------------------------------------------------------------------------------
 * The browser's download path, stubbed because jsdom implements none of it
 * ------------------------------------------------------------------------------------------- */

/** The object URL the stubbed factory hands back, which nothing resolves. */
const OBJECT_URL = 'blob:synthetic-object-url';

/** The factory the screen's download path is expected to call, once, with the composed document. */
const createObjectUrl = vi.fn<(value: Blob) => string>(() => OBJECT_URL);

/** The revoker it is expected to call once the file has been offered. */
const revokeObjectUrl = vi.fn<(value: string) => void>();

/**
 * Supplies both object-URL members jsdom leaves undefined, so the download path is reachable at all.
 *
 * `Object.defineProperty` is used rather than `vi.spyOn` because there is no property to spy on;
 * {@link removeObjectUrlStubs} puts the globals back afterwards.
 */
function installObjectUrlStubs(): void {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: createObjectUrl,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: revokeObjectUrl,
  });
}

/** Removes the stubs, whether or not a case installed them. */
function removeObjectUrlStubs(): void {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
}

/* ---------------------------------------------------------------------------------------------
 * The harness and the readings it takes
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the screen as the shell mounts it: inside a cache of its own, with retries off.
 *
 * The cache is fresh per render and its entries are collected immediately, so a refusal fails the
 * same way however often it is repeated and one case cannot read another's cached payload.
 *
 * @returns The container the render produced, so a case can unmount before rendering again.
 */
function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  return render(
    <QueryClientProvider client={client}>
      <CompetitiveAtlasScreen scope={NO_SCOPE} />
    </QueryClientProvider>,
  );
}

/** Puts the document on one theme and one density, the two preferences the theme layer keys on. */
function useTheme(theme: (typeof THEMES)[number]): void {
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-density', 'compact');
}

/**
 * The item at a position, or a failure naming what was missing.
 *
 * `noUncheckedIndexedAccess` makes every indexed read a possible absence, and a case that reached for
 * a missing cell would otherwise compare against `undefined` and report the wrong thing.
 */
function at<T>(items: readonly T[], index: number, what: string): T {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`the ${what} at position ${String(index)} is missing`);
  }

  return item;
}

/** Collapses a string's runs of whitespace, so a cell of several elements compares as one line. */
function collapse(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/** Every string an element's subtree holds, with its whitespace collapsed. */
function collapsedTextOf(element: HTMLElement): string {
  return collapse(element.textContent ?? '');
}

/** Escapes a literal for use inside a `RegExp`, so a permission name is matched, not interpreted. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

/** Every count of the vertices one rendered polygon carries, read from its `points` attribute. */
function vertexCountOf(polygon: SVGPolygonElement): number {
  const points = (polygon.getAttribute('points') ?? '').trim();

  return points === '' ? 0 : points.split(/\s+/u).length;
}

/**
 * The user-event harness the keyboard cases drive.
 *
 * Named so a helper can take it as an argument without widening its parameter to `any`.
 */
type User = ReturnType<typeof userEvent.setup>;

/**
 * Walks the document's tab order until the focused element satisfies a predicate, so a case asserts
 * reachability without numbering the focus stops of a surface it does not own.
 *
 * @param user The user-event harness.
 * @param matches The predicate the focused element must satisfy.
 * @param limit The greatest number of stops to walk before the case fails.
 * @returns The element the walk stopped on.
 * @throws When the walk never reaches a matching element, which is the failure the case asserts.
 */
async function tabTo(
  user: User,
  matches: (element: Element) => boolean,
  limit: number,
): Promise<HTMLElement> {
  for (let step = 0; step < limit; step += 1) {
    await user.tab();

    const active = document.activeElement;

    if (active !== null && matches(active)) {
      return active as HTMLElement;
    }
  }

  throw new Error('The keyboard walk never reached the control the case needs.');
}

/** How many focus stops a case walks before it reports that a control is unreachable. */
const TAB_WALK_LIMIT = 40;

/** The radar card: the surface holding the drawing and the legend that names its series. */
async function radarCard(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: COMPETITIVE_ATLAS_TEXT.radarCardTitle });
}

/**
 * The polygons the radar actually draws, one per series it was handed.
 *
 * Read from the drawing rather than from the payload, so a case proves what a reader receives: the
 * class filter narrows the shapes on the surface, not the caption beside them.
 *
 * @returns Every polygon of the radar's own group, in document order.
 */
async function radarPolygons(): Promise<SVGPolygonElement[]> {
  const card = await radarCard();
  const drawing = within(card).getByRole('group', { name: RADAR_CHART_TEXT.groupLabel });

  return [...drawing.querySelectorAll<SVGPolygonElement>('polygon')];
}

/** The network card: the surface holding the drawing and its table view. */
async function networkCard(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: COMPETITIVE_ATLAS_TEXT.networkCardTitle });
}

/**
 * One competitor's own group inside the network drawing, found by the name the drawing gives it.
 *
 * The name is the network's tagged label, the words for what it draws and the label its figures carry,
 * so the lookup states the record rather than a position among the drawing's groups.
 */
function competitorGroupIn(drawing: HTMLElement, network: CompetitorNetwork): HTMLElement {
  return within(drawing).getByRole('group', {
    name: new RegExp(
      `^${escapeRegExp(`${network.label} ${COMPETITOR_NAME_TAG}`)}, ${escapeRegExp(
        COMPETITOR_NETWORK_TEXT.competitorGroupSuffix,
      )}`,
      'u',
    ),
  });
}

/** The client's own group inside the network drawing, named as the self-assessment it is. */
function clientGroupIn(drawing: HTMLElement): HTMLElement {
  return within(drawing).getByRole('group', {
    name: `${COMPETITOR_NETWORK_TEXT.clientGroupName}, ${CLIENT_SELF_ASSESSMENT_LABEL}`,
  });
}

/**
 * The `stroke-width` each of a drawing's polygons is drawn with, in document order.
 *
 * The emphasis the entity in view takes is a drawing weight rather than a hue, so a case reads it back
 * from the markup instead of comparing a colour value (rule B-3).
 */
function polygonStrokeWidthsOf(drawing: HTMLElement): readonly number[] {
  return [...drawing.querySelectorAll('polygon')].map((polygon) =>
    Number(polygon.getAttribute('stroke-width')),
  );
}

/**
 * The centre and the radius of one mark's invisible pointer target, in the drawing's own units.
 *
 * The target is the circle a mark paints with nothing and reaches the pointer with, so reading it
 * back is how a press case states a press in the drawing's coordinates instead of restating the
 * component's geometry.
 *
 * @param mark The mark's control, as the drawing rendered it.
 * @returns The target's centre and its radius.
 */
function targetOf(mark: Element): {
  readonly centre: { readonly x: number; readonly y: number };
  readonly radius: number;
} {
  const target = mark.querySelector('circle[pointer-events="all"]');

  if (target === null) {
    throw new Error('the mark drew no pointer target');
  }

  return {
    centre: { x: Number(target.getAttribute('cx')), y: Number(target.getAttribute('cy')) },
    radius: Number(target.getAttribute('r')),
  };
}

/**
 * How far apart two points of a drawing's grid are, in that drawing's own units.
 *
 * @param one The first point.
 * @param other The second point.
 * @returns The distance between them.
 */
function distanceBetween(
  one: { readonly x: number; readonly y: number },
  other: { readonly x: number; readonly y: number },
): number {
  return Math.hypot(one.x - other.x, one.y - other.y);
}

/**
 * Lays the drawing out at its own scale, then presses it at one point of its own grid.
 *
 * jsdom computes no layout at all, so the element reports a zero-width box and the drawing declines
 * to resolve a press against it — correctly, since there is no scale to convert the pointer by. A
 * press case states the box a browser would have measured: the view box's own width and height, with
 * the element's top-left corner at the origin, which makes one user unit one CSS pixel and lets the
 * press be stated in the drawing's coordinates. The press is dispatched at the `<svg>`, which is the
 * element the drawing resolves a press on.
 *
 * @param drawing The drawing's own `<svg>`.
 * @param point The point to press, in the drawing's coordinates.
 */
function pressDrawingAt(
  drawing: HTMLElement,
  point: { readonly x: number; readonly y: number },
): void {
  const box = (drawing.getAttribute('viewBox') ?? '')
    .trim()
    .split(/\s+/u)
    .map(Number);
  const width = box[2];
  const height = box[3];

  if (width === undefined || height === undefined || !(width > 0) || !(height > 0)) {
    throw new Error('the drawing rendered no view box to lay out');
  }

  vi.spyOn(drawing, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    width,
    height,
    toJSON: () => ({}),
  });

  fireEvent.click(drawing, { clientX: point.x, clientY: point.y });
}

/** The chokepoint card: the surface holding the crossings table. */
async function chokepointCard(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: COMPETITIVE_ATLAS_TEXT.chokepointCardTitle });
}

/** The banner naming the pack, which the screen renders outside the state boundary. */
function packBanner(): HTMLElement {
  return screen.getByRole('note', { name: COMPETITIVE_ATLAS_TEXT.bannerRegionLabel });
}

/** Arms every stub with the payloads a case starts from, so a case states only the read it changes. */
beforeEach(() => {
  for (const member of Object.values(port)) {
    member.mockReset();
  }

  port.getAtlas.mockResolvedValue(envelope(ATLAS));
  port.getEvidence.mockResolvedValue(evidenceEnvelope(EVIDENCE));
  port.exportChokepointBrief.mockResolvedValue({
    data: { ...EXPORT_PAYLOAD },
    meta: { freshness: [], simulated: true, traceId: TRACE_ID },
  });

  createObjectUrl.mockClear();
  revokeObjectUrl.mockClear();
});

/** Leaves `<html>` on the theme of whichever suite runs next, and no stub or attribute behind. */
afterEach(() => {
  removeObjectUrlStubs();
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-density');
});


describe('CompetitiveAtlasScreen', () => {
  it('reads the atlas through the port once and names the simulated pack above the body', async () => {
    renderScreen();

    /* The read takes no scope: the port's signature declares no argument, so the shell's selection
       reaches the screen for the one decision it can honestly make here — the class the atlas opens
       on — and never parameterises the read. */
    expect(port.getAtlas).toHaveBeenCalledTimes(1);
    expect(port.getAtlas).toHaveBeenCalledWith();

    /* The banner is the imported fixed string, character for character, and it is on the page before
       the read settles because the screen renders it outside the state boundary. */
    expect(packBanner().textContent).toBe(ATLAS_PACK_BANNER);

    expect(await radarCard()).toBeVisible();
    expect(packBanner().textContent).toBe(ATLAS_PACK_BANNER);
  });

  it('draws one polygon per series and reads them back as one column per series with nothing combined', async () => {
    const user = userEvent.setup();

    renderScreen();

    const card = await radarCard();
    const drawing = within(card).getByRole('group', { name: RADAR_CHART_TEXT.groupLabel });
    const polygons = [...drawing.querySelectorAll<SVGPolygonElement>('polygon')];

    /* One outline per series, and no shape standing in for a total: the count is the payload's. */
    expect(polygons).toHaveLength(SERIES.length);

    /* Every outline places one vertex per axis, so no series is averaged with another onto a shape
       of its own invention. */
    for (const polygon of polygons) {
      expect(vertexCountOf(polygon)).toBe(AXES.length);
    }

    /* The legend describes the same series, one row each, and no row names two of them. */
    const legend = within(card).getByRole('list');
    const legendRows = within(legend).getAllByRole('listitem');

    expect(legendRows).toHaveLength(SERIES.length);

    for (const row of legendRows) {
      expect(SERIES.filter((series) => collapsedTextOf(row).includes(series.label))).toHaveLength(1);
    }

    /* The table view is the payload read as a table: one row per axis and one column per series,
       with no total and no average column in which the two families could meet (rule P-5). */
    await user.click(
      within(card).getByRole('button', {
        name: `${VIEW_AS_TABLE_LABELS.showTable}: ${COMPETITIVE_ATLAS_TEXT.radarFigureTitle}`,
      }),
    );

    const table = screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.radarTableCaption });

    expect(within(table).getAllByRole('row')).toHaveLength(AXES.length + 1);

    const headers = within(table).getAllByRole('columnheader');

    expect(headers).toHaveLength(SERIES.length + 1);
    expect(collapsedTextOf(at(headers, 0, 'axis header'))).toBe(COMPETITIVE_ATLAS_TEXT.columnAxis);

    for (const header of headers.slice(1)) {
      const text = collapsedTextOf(header);
      const named = SERIES.filter((series) => text.includes(series.label));

      expect(named).toHaveLength(1);

      const series = named[0];

      if (series === undefined) {
        throw new Error('a column header named no series');
      }

      if (series.provenance === 'first_party') {
        expect(text).toContain(CLIENT_SELF_ASSESSMENT_LABEL);
        expect(text).not.toContain(COMPETITOR_NAME_TAG);
        expect(text).not.toContain(SIM_LABELS[5]);
      } else {
        expect(text).toContain(COMPETITOR_NAME_TAG);
        expect(text).toContain(SIM_LABELS[5]);
      }
    }
  });

  it('asks the service for the reading behind the vertex a reader activates', async () => {
    const user = userEvent.setup();
    const series = at(SERIES, 0, 'radar series');
    const axis = at(AXES, 0, 'radar axis');
    const score = at(series.values, 0, 'series score');

    renderScreen();

    const card = await radarCard();
    const drawing = within(card).getByRole('group', { name: RADAR_CHART_TEXT.groupLabel });
    const vertices = within(drawing).getAllByRole('button');

    /* One control per mark, so every vertex of every series opens its own evidence (AAP 0.2.1 F12). */
    expect(vertices).toHaveLength(SERIES.length * AXES.length);

    const vertex = within(drawing).getByRole('button', {
      name: `${axis.label}, ${series.label}: ${String(score)}`,
    });

    vertex.focus();
    expect(vertex).toHaveFocus();

    await user.keyboard('{Enter}');
    await screen.findByRole('dialog');

    /* The reference names the one reading the vertex draws — the series, the separator, then the axis
       it sits on — which is the record the pack states that score in (AAP §0.2.1 F12, rule P-5). */
    expect(port.getEvidence).toHaveBeenCalledTimes(1);
    expect(port.getEvidence.mock.calls[0]?.[0]).toBe(`${series.id}#${axis.id}`);
  });

  it('tags the client’s own series as a self-assessment and never as a second simulated-data label', async () => {
    renderScreen();

    const card = await radarCard();
    const legend = within(card).getByRole('list');
    const clientRow = within(legend).getByText(CLIENT_SERIES.label).closest('li');

    if (clientRow === null) {
      throw new Error('the client series was described by no legend row');
    }

    /* The companion tag the types layer owns, printed beside the client's own name (AAP §0.10). */
    expect(within(clientRow).getByText(CLIENT_SELF_ASSESSMENT_LABEL)).toBeInTheDocument();

    /* And only that one: the client's series is given no competitor tag and no second copy of the
       badge label, because the seven fixed strings have no member for a first-party series. */
    expect(within(clientRow).queryByText(SIM_LABELS[0], { exact: true })).toBeNull();
    expect(within(clientRow).queryByText(COMPETITOR_NAME_TAG, { exact: true })).toBeNull();

    /* The entity selector says the same thing about the same series. */
    const selector = screen.getByRole('group', { name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel });
    const clientControl = within(selector).getByRole('button', {
      name: new RegExp(`^${escapeRegExp(CLIENT_SERIES.label)}`, 'u'),
    });

    expect(within(clientControl).getByText(CLIENT_SELF_ASSESSMENT_LABEL)).toBeInTheDocument();
    expect(within(clientControl).queryByText(SIM_LABELS[0], { exact: true })).toBeNull();

    /* The network drawing tells the same story about the client's own sites: the family's group is
       named with the same companion label, so a reader who meets those marks learns whose they are
       and that they are a self-assessment rather than a competitor estimate (rule P-5). */
    const drawing = await networkCard();

    expect(
      within(drawing).getByRole('group', {
        name: `${COMPETITOR_NETWORK_TEXT.clientGroupName}, ${CLIENT_SELF_ASSESSMENT_LABEL}`,
      }),
    ).toBeInTheDocument();
  });

  it('follows every competitor name with the imported competitor tag wherever the screen paints one', async () => {
    renderScreen();

    const card = await radarCard();
    const legend = within(card).getByRole('list');

    for (const network of COMPETITOR_NETWORKS) {
      const row = within(legend).getByText(network.label, { exact: true }).closest('li');

      if (row === null) {
        throw new Error(`the series of ${network.label} was described by no legend row`);
      }

      expect(within(row).getByText(COMPETITOR_NAME_TAG)).toBeInTheDocument();
      expect(within(row).getByText(SIM_LABELS[5])).toBeInTheDocument();
    }

    /* The entity selector tags every competitor control it offers. */
    const selector = screen.getByRole('group', { name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel });

    for (const network of COMPETITOR_NETWORKS) {
      const control = within(selector).getByRole('button', {
        name: new RegExp(`^${escapeRegExp(network.label)}`, 'u'),
      });

      expect(within(control).getByText(COMPETITOR_NAME_TAG)).toBeInTheDocument();
    }

    /* The network drawing names each competitor's group with its tagged name, and prints the tagged
       name again as the label band's own line, so neither a reader nor a screen reader meets a
       competitor without it (rule P-5). */
    const drawing = await networkCard();

    for (const network of COMPETITOR_NETWORKS) {
      const tagged = `${network.label} ${COMPETITOR_NAME_TAG}`;

      /* The group is named for the network, its tag, what it draws and the label its figures carry,
         so the family and its provenance arrive together. */
      expect(
        within(drawing).getAllByRole('group', {
          name: new RegExp(
            `${escapeRegExp(tagged)}, ${escapeRegExp(
              COMPETITOR_NETWORK_TEXT.competitorGroupSuffix,
            )}, ${escapeRegExp(SIM_LABELS[5])}`,
            'u',
          ),
        }).length,
      ).toBeGreaterThan(0);
      expect(within(drawing).getByText(tagged, { exact: true })).toBeInTheDocument();
    }

    /* The client's own band row is tagged as a self-assessment rather than as a competitor. */
    expect(
      within(drawing).getAllByText(CLIENT_SELF_ASSESSMENT_LABEL).length,
    ).toBeGreaterThan(0);

    /* Every competitor element the chokepoint table prints carries the tag beside it. */
    const table = screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption });
    const rows = within(table).getAllByRole('row').slice(1);

    CHOKEPOINTS.forEach((crossing, index) => {
      const cells = within(at(rows, index, 'crossing row')).getAllByRole('cell');
      const competitors = at(cells, 2, 'competitors cell');
      const named = Object.keys(crossing.competitorBufferDays);

      expect(within(competitors).getAllByText(COMPETITOR_NAME_TAG)).toHaveLength(named.length);

      for (const competitorId of named) {
        expect(within(competitors).getByText(competitorId)).toBeInTheDocument();
      }
    });
  });

  it('paints one competitor in one hue on every surface when the payload orders its lists differently', async () => {
    const user = userEvent.setup();

    /* The networks arrive in the reverse of the order their identifiers state, while the series keep
       the pack's own order: a hue resolved from a list position would put each competitor in another
       company's colour here, so every surface named below proves the slot follows the identifier. */
    port.getAtlas.mockResolvedValue(
      envelope({ ...ATLAS, competitors: [...COMPETITOR_NETWORKS].reverse() }),
    );

    renderScreen();

    const card = await radarCard();
    const legend = within(card).getByRole('list');
    const polygons = await radarPolygons();
    const drawing = await networkCard();
    const entityGroup = await screen.findByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel,
    });

    expect(polygons).toHaveLength(SERIES.length);

    for (const { competitorId, tone } of COMPETITOR_TONE_BY_ID) {
      const series = COMPETITOR_SERIES.find((entry) => entry.competitorId === competitorId);
      const network = COMPETITOR_NETWORKS.find((entry) => entry.competitorId === competitorId);

      if (series === undefined || network === undefined) {
        throw new Error(`the fixture states no series or no network for ${competitorId}`);
      }

      /* The legend swatch beside the series' own name. */
      const row = within(legend).getByText(series.label, { exact: true }).closest('li');

      if (row === null) {
        throw new Error(`no legend row describes ${series.label}`);
      }

      expect(row.querySelector('span[aria-hidden="true"]')?.getAttribute('class')).toContain(
        tone.swatch,
      );

      /* The radar's own polygon for that series, at the position the payload gives it. */
      const polygon = polygons[SERIES.indexOf(series)];

      if (polygon === undefined) {
        throw new Error(`the radar drew no polygon for ${series.label}`);
      }

      const outline = polygon.getAttribute('class') ?? '';

      expect(outline).toContain(tone.fill);
      expect(outline).toContain(tone.stroke);

      /* And every mark of that competitor's own network, drawn in the same role token: the competitor
         is marked as the entity in view first, so the drawing paints its hue rather than the
         recession it applies to a competitor family that is not in view. */
      await user.click(
        within(entityGroup).getByRole('button', {
          name: new RegExp(`^${escapeRegExp(network.label)}`, 'u'),
        }),
      );

      const group = competitorGroupIn(drawing, network);

      expect(group).toHaveAttribute('aria-current', 'true');

      const marks = [...group.querySelectorAll('polygon')];

      expect(marks.length).toBeGreaterThan(0);

      for (const mark of marks) {
        const classes = mark.getAttribute('class') ?? '';

        expect(classes).toContain(tone.stroke);
        expect(classes).not.toContain('stroke-hairline');
      }
    }
  });

  it('prints every series’ own label inside the radar drawing, beside its own polygon', async () => {
    renderScreen();

    const drawing = within(await radarCard()).getByRole('group', {
      name: RADAR_CHART_TEXT.groupLabel,
    });

    /* Each series is labelled at its own outline rather than only in the legend beside it, so a reader
       can tell the polygons apart on the drawing itself (rule P-1). */
    const labels = [...drawing.querySelectorAll('g[pointer-events="none"] text')].map((text) =>
      (text.textContent ?? '').trim(),
    );

    expect(labels).toEqual(SERIES.map((series) => series.label));
  });

  it('marks the client’s own network, the entity the atlas opens on, in both drawings', async () => {
    renderScreen();

    const radarDrawing = within(await radarCard()).getByRole('group', {
      name: RADAR_CHART_TEXT.groupLabel,
    });
    const widths = polygonStrokeWidthsOf(radarDrawing);
    const clientIndex = SERIES.indexOf(CLIENT_SERIES);
    const clientWidth = at(widths, clientIndex, 'client outline width');

    /* The client's series is the one the atlas opens on, so its outline is the emphasised one and
       every other outline keeps the drawing's own weight. */
    expect(clientWidth).toBeGreaterThan(0);

    widths.forEach((width, index) => {
      if (index === clientIndex) {
        return;
      }

      expect(width).toBeLessThan(clientWidth);
    });

    /* The radar's label-band row names the same entity, so the drawing carries the selection itself
       and not only the selector beside it (rule P-8). */
    const rows = [...radarDrawing.querySelectorAll('g[aria-current="true"]')];

    expect(rows).toHaveLength(1);
    expect(at(rows, 0, 'radar band row in view').textContent).toContain(CLIENT_SERIES.label);

    /* In the network drawing the client's own group is the marked one ... */
    const drawing = await networkCard();
    const client = clientGroupIn(drawing);

    expect(client).toHaveAttribute('aria-current', 'true');
    expect(within(client).getByText(CLIENT_SITE.label, { exact: true }).getAttribute('class')).toContain(
      'font-semibold',
    );

    /* ... and every competitor family recedes to the graph lens's ground fill and hairline stroke,
       with its printed names in the text role §4 measures for a recessed reading. */
    for (const network of COMPETITOR_NETWORKS) {
      const group = competitorGroupIn(drawing, network);

      expect(group).not.toHaveAttribute('aria-current');

      const marks = [...group.querySelectorAll('polygon')];

      expect(marks.length).toBeGreaterThan(0);

      for (const mark of marks) {
        const classes = mark.getAttribute('class') ?? '';

        expect(classes).toContain('fill-ground');
        expect(classes).toContain('stroke-hairline');
      }

      expect(
        within(group)
          .getByText(`${network.label} site one`, { exact: true })
          .getAttribute('class'),
      ).toContain('fill-text-secondary');
    }
  });

  it('moves the marking to the competitor the entity selector chooses, and recedes the others', async () => {
    const user = userEvent.setup();

    renderScreen();

    const chosen = at(COMPETITOR_NETWORKS, 1, 'chosen competitor network');
    const chosenSeries = COMPETITOR_SERIES.find(
      (entry) => entry.competitorId === chosen.competitorId,
    );
    const chosenTone = COMPETITOR_TONE_BY_ID.find(
      (entry) => entry.competitorId === chosen.competitorId,
    )?.tone;

    if (chosenSeries === undefined || chosenTone === undefined) {
      throw new Error('the fixture states no series or no tone for the competitor under test');
    }

    const entityGroup = await screen.findByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel,
    });

    await user.click(
      within(entityGroup).getByRole('button', {
        name: new RegExp(`^${escapeRegExp(chosen.label)}`, 'u'),
      }),
    );

    /* The radar's emphasised outline followed the selection, and so did its label-band row. */
    const radarDrawing = within(await radarCard()).getByRole('group', {
      name: RADAR_CHART_TEXT.groupLabel,
    });
    const widths = polygonStrokeWidthsOf(radarDrawing);
    const chosenIndex = SERIES.indexOf(chosenSeries);
    const chosenWidth = at(widths, chosenIndex, 'chosen outline width');

    expect(chosenWidth).toBeGreaterThan(0);

    widths.forEach((width, index) => {
      if (index === chosenIndex) {
        return;
      }

      expect(width).toBeLessThan(chosenWidth);
    });

    const rows = [...radarDrawing.querySelectorAll('g[aria-current="true"]')];

    expect(rows).toHaveLength(1);
    expect(at(rows, 0, 'radar band row in view').textContent).toContain(chosenSeries.label);

    /* In the network drawing that competitor's own group is marked and keeps its own hue ... */
    const drawing = await networkCard();
    const chosenGroup = competitorGroupIn(drawing, chosen);

    expect(chosenGroup).toHaveAttribute('aria-current', 'true');

    const chosenMarks = [...chosenGroup.querySelectorAll('polygon')];

    expect(chosenMarks.length).toBeGreaterThan(0);

    for (const mark of chosenMarks) {
      const classes = mark.getAttribute('class') ?? '';

      expect(classes).toContain(chosenTone.stroke);
      expect(classes).not.toContain('stroke-hairline');
    }

    /* ... the client's own family is no longer the entity in view ... */
    expect(clientGroupIn(drawing)).not.toHaveAttribute('aria-current');

    /* ... and every other competitor family recedes. */
    for (const network of COMPETITOR_NETWORKS) {
      if (network.competitorId === chosen.competitorId) {
        continue;
      }

      const group = competitorGroupIn(drawing, network);

      expect(group).not.toHaveAttribute('aria-current');

      for (const mark of group.querySelectorAll('polygon')) {
        expect(mark.getAttribute('class')).toContain('stroke-hairline');
      }
    }
  });

  it('narrows the drawn series, networks, sites and crossings to the class in view', async () => {
    const user = userEvent.setup();

    renderScreen();

    const classGroup = await screen.findByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.classGroupLabel,
    });

    /* The atlas opens with every class in view, so the whole pack is drawn before the class is
       chosen — the narrowing below is the control's doing and not the opening state's. */
    expect(await radarPolygons()).toHaveLength(SERIES.length);
    expect(FIRST_CLASS_SERIES.length).toBeLessThan(SERIES.length);

    await user.click(within(classGroup).getByRole('button', { name: FIRST_CLASS }));

    /* The caption restates the class and says what it narrowed (AAP §0.12.4, rule B-3). */
    expect(
      within(classGroup).getByText(
        `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${FIRST_CLASS}. ${COMPETITIVE_ATLAS_TEXT.classCaptionDetail}`,
      ),
    ).toBeInTheDocument();

    /* The radar draws one polygon per series in view, and the legend and the entity selector list
       exactly those series: the client's own, which reports on no competitor, and each competitor
       the pack classifies in the class. */
    expect(await radarPolygons()).toHaveLength(FIRST_CLASS_SERIES.length);

    const legend = within(await radarCard()).getByRole('list');

    expect(within(legend).getAllByRole('listitem')).toHaveLength(FIRST_CLASS_SERIES.length);

    const entityGroup = screen.getByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel,
    });

    expect(within(entityGroup).getAllByRole('button')).toHaveLength(FIRST_CLASS_SERIES.length);

    for (const network of COMPETITOR_NETWORKS) {
      const offered = within(entityGroup).queryByRole('button', {
        name: new RegExp(`^${escapeRegExp(network.label)}`, 'u'),
      });

      expect(offered === null).toBe(!FIRST_CLASS_NETWORKS.includes(network));
    }

    /* The network view places the sites of the networks in view and none of the others. */
    const networkDrawing = await networkCard();

    for (const site of FIRST_CLASS_SITES) {
      expect(within(networkDrawing).getAllByText(site.label, { exact: true }).length).toBeGreaterThan(
        0,
      );
    }

    for (const network of COMPETITOR_NETWORKS) {
      for (const site of network.sites) {
        if (FIRST_CLASS_NETWORKS.includes(network)) {
          continue;
        }

        expect(within(networkDrawing).queryByText(site.label, { exact: true })).toBeNull();
      }
    }

    /* The network's table view lists the same sites the drawing places, so the two never disagree. */
    await user.click(
      within(networkDrawing).getByRole('button', {
        name: `${VIEW_AS_TABLE_LABELS.showTable}: ${COMPETITIVE_ATLAS_TEXT.networkFigureTitle}`,
      }),
    );

    const networkTable = screen.getByRole('table', {
      name: COMPETITIVE_ATLAS_TEXT.networkTableCaption,
    });

    expect(within(networkTable).getAllByRole('row')).toHaveLength(FIRST_CLASS_SITES.length + 1);

    /* And the chokepoint table lists only the crossings a lane of an in-view network traverses. */
    const chokepointTable = screen.getByRole('table', {
      name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption,
    });

    expect(FIRST_CLASS_CHOKEPOINTS.length).toBeGreaterThan(0);
    expect(FIRST_CLASS_CHOKEPOINTS.length).toBeLessThan(CHOKEPOINTS.length);
    expect(within(chokepointTable).getAllByRole('row')).toHaveLength(FIRST_CLASS_CHOKEPOINTS.length + 1);
  });

  it('restores the whole pack from the “All product classes” control', async () => {
    const user = userEvent.setup();

    renderScreen();

    const classGroup = await screen.findByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.classGroupLabel,
    });

    await user.click(within(classGroup).getByRole('button', { name: FIRST_CLASS }));

    expect(await radarPolygons()).toHaveLength(FIRST_CLASS_SERIES.length);

    /* The unfiltered state is reachable again, so choosing a class narrows nothing irreversibly
       (rule P-8). */
    await user.click(
      within(classGroup).getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.allClassesLabel }),
    );

    expect(
      within(classGroup).getByText(
        `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${COMPETITIVE_ATLAS_TEXT.allClassesLabel}. ${COMPETITIVE_ATLAS_TEXT.allClassesCaptionDetail}`,
      ),
    ).toBeInTheDocument();

    expect(await radarPolygons()).toHaveLength(SERIES.length);
    expect(within(within(await radarCard()).getByRole('list')).getAllByRole('listitem')).toHaveLength(
      SERIES.length,
    );

    const entityGroup = screen.getByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel,
    });

    expect(within(entityGroup).getAllByRole('button')).toHaveLength(SERIES.length);

    const chokepointTable = screen.getByRole('table', {
      name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption,
    });

    expect(within(chokepointTable).getAllByRole('row')).toHaveLength(CHOKEPOINTS.length + 1);
  });

  it('falls back to the class’s own default entity when the chosen one leaves the view', async () => {
    const user = userEvent.setup();
    const third = at(COMPETITOR_NETWORKS, 2, 'competitor network');

    renderScreen();

    const entityGroup = await screen.findByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel,
    });

    await user.click(
      within(entityGroup).getByRole('button', {
        name: new RegExp(`^${escapeRegExp(third.label)}`, 'u'),
      }),
    );

    expect(
      screen.getByText(`${COMPETITIVE_ATLAS_TEXT.entityCaptionPrefix} ${third.label}`),
    ).toBeInTheDocument();

    /* The first class classifies no network this series reports on, so the caption returns to the
       class's own default series instead of naming one the radar no longer draws. */
    await user.click(
      within(screen.getByRole('group', { name: COMPETITIVE_ATLAS_TEXT.classGroupLabel })).getByRole(
        'button',
        { name: FIRST_CLASS },
      ),
    );

    expect(
      screen.getByText(`${COMPETITIVE_ATLAS_TEXT.entityCaptionPrefix} ${CLIENT_SERIES.label}`),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(`${COMPETITIVE_ATLAS_TEXT.entityCaptionPrefix} ${third.label}`),
    ).toBeNull();
    expect(
      within(entityGroup).queryByRole('button', {
        name: new RegExp(`^${escapeRegExp(third.label)}`, 'u'),
      }),
    ).toBeNull();
  });

  it('states the class group’s selection in words beside the control that carries it', async () => {
    const user = userEvent.setup();

    renderScreen();

    const classGroup = await screen.findByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.classGroupLabel,
    });

    /* The atlas opens with every class in view, and both the caption and the control say so rather
       than leaving the reader to compare colours (rule B-3). */
    expect(
      within(classGroup).getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.allClassesLabel }),
    ).toHaveClass('bg-action-primary-bg');
    expect(within(classGroup).getByRole('button', { name: FIRST_CLASS })).not.toHaveClass(
      'bg-action-primary-bg',
    );
    expect(
      within(classGroup).getByText(
        `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${COMPETITIVE_ATLAS_TEXT.allClassesLabel}. ${COMPETITIVE_ATLAS_TEXT.allClassesCaptionDetail}`,
      ),
    ).toBeInTheDocument();

    await user.click(within(classGroup).getByRole('button', { name: FIRST_CLASS }));

    expect(within(classGroup).getByRole('button', { name: FIRST_CLASS })).toHaveClass(
      'bg-action-primary-bg',
    );
    expect(
      within(classGroup).getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.allClassesLabel }),
    ).not.toHaveClass('bg-action-primary-bg');
    expect(
      within(classGroup).getByText(
        `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${FIRST_CLASS}. ${COMPETITIVE_ATLAS_TEXT.classCaptionDetail}`,
      ),
    ).toBeInTheDocument();
  });

  it('explains a permission refusal with the permission, the roles that hold it and the trace id', async () => {
    port.getAtlas.mockRejectedValue(DENIAL);

    renderScreen();

    /* The card names the permission the acting role lacks, without this suite restating the wording
       the card composes around it. */
    expect(
      await screen.findByRole('heading', { name: new RegExp(escapeRegExp(DENIED_PERMISSION), 'u') }),
    ).toBeInTheDocument();
    expect(screen.getByText(HOLDING_ROLE)).toBeInTheDocument();
    expect(screen.getByText(DENIAL.traceId)).toBeInTheDocument();

    /* The banner still names what the page is about, because it sits outside the boundary. */
    expect(packBanner().textContent).toBe(ATLAS_PACK_BANNER);

    /* Nothing is offered as if it had been read: no radar, no network, no table, no selector. */
    expect(screen.queryByRole('region', { name: COMPETITIVE_ATLAS_TEXT.radarCardTitle })).toBeNull();
    expect(screen.queryByRole('region', { name: COMPETITIVE_ATLAS_TEXT.networkCardTitle })).toBeNull();
    expect(
      screen.queryByRole('region', { name: COMPETITIVE_ATLAS_TEXT.chokepointCardTitle }),
    ).toBeNull();
    expect(screen.queryByRole('group', { name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel })).toBeNull();

    /* Repeating a call the role is not permitted to make would be refused again, so no retry exists
       (rule P-8). */
    expect(screen.queryByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel })).toBeNull();

    /* The one action the page offers cannot act, and says why. */
    const exportAction = screen.getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.exportAction });

    expect(exportAction).toHaveAttribute('aria-disabled', 'true');
    expect(exportAction).toHaveAccessibleDescription(COMPETITIVE_ATLAS_TEXT.exportUnavailable);
  });

  it('prints every column of the chokepoint table and the crossings in the order the pack supplied', async () => {
    renderScreen();

    await chokepointCard();

    const table = screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption });
    const headers = within(table).getAllByRole('columnheader');

    expect(headers.map((header) => collapsedTextOf(header))).toStrictEqual([...CHOKEPOINT_COLUMNS]);

    const rows = within(table).getAllByRole('row').slice(1);

    expect(rows).toHaveLength(CHOKEPOINTS.length);

    CHOKEPOINTS.forEach((crossing, index) => {
      const cells = within(at(rows, index, 'crossing row')).getAllByRole('cell');

      expect(cells).toHaveLength(CHOKEPOINT_COLUMNS.length);
      expect(collapsedTextOf(at(cells, 0, 'identity cell'))).toBe(crossing.id);
      expect(collapsedTextOf(at(cells, 1, 'name cell'))).toBe(crossing.label);

      /* The two figures are printed exactly as the record stated them: nothing rounds, converts or
         totals them here (rule P-6). Each one is the trigger that opens the crossing's record, so the
         figure leads the control's accessible name (rule P-8, AAP §0.2.1 F12). */
      expect(
        within(at(cells, 3, 'overlap cell')).getByRole('button', {
          name: new RegExp(`^${escapeRegExp(String(crossing.overlap))}\\b`, 'u'),
        }),
      ).toBeInTheDocument();
      expect(collapsedTextOf(at(cells, 5, 'note cell'))).toBe(crossing.contentionNote);

      /* Every row is market intelligence, and the cell says so with the label its record carries
         (rule P-1, rule P-5). */
      expect(collapsedTextOf(at(cells, 6, 'provenance cell'))).toBe(SIM_LABELS[5]);

      /* The buffer column repeats the competitor beside its days, so no figure is left unattributed,
         and each day count opens the crossing's own record. */
      const bufferCell = at(cells, 4, 'buffer days cell');

      for (const [competitorId, days] of Object.entries(crossing.competitorBufferDays)) {
        expect(within(bufferCell).getByText(competitorId)).toBeInTheDocument();
        expect(
          within(bufferCell).getAllByRole('button', {
            name: new RegExp(`^${escapeRegExp(String(days))}\\b`, 'u'),
          }).length,
        ).toBeGreaterThan(0);
      }
    });
  });

  it('labels every row of the network table with the family its figures belong to', async () => {
    const user = userEvent.setup();

    renderScreen();

    const card = await networkCard();

    /* The network drawing's table view: the same sites it places, printed as figures. */
    await user.click(
      within(card).getByRole('button', {
        name: `${VIEW_AS_TABLE_LABELS.showTable}: ${COMPETITIVE_ATLAS_TEXT.networkFigureTitle}`,
      }),
    );

    const table = screen.getByRole('table', {
      name: COMPETITIVE_ATLAS_TEXT.networkTableCaption,
    });
    const headers = within(table).getAllByRole('columnheader');

    /* The provenance column closes the row, after the coordinates it speaks for, in the position and
       with the treatment the chokepoint table gives its own provenance column (rule P-5). */
    expect(collapsedTextOf(at(headers, headers.length - 1, 'trailing header'))).toBe(
      COMPETITIVE_ATLAS_TEXT.columnProvenance,
    );

    const rows = within(table).getAllByRole('row').slice(1);

    /**
     * The one row that prints a given site, found by the site's name rather than by its position, so
     * a case reads the row a reader would point at.
     *
     * @param siteLabel The name the row prints for its site.
     * @returns The row.
     * @throws When no row prints that site, which is the failure the case is asserting.
     */
    function rowOf(siteLabel: string): HTMLElement {
      const row = rows.find(
        (candidate) =>
          collapsedTextOf(at(within(candidate).getAllByRole('cell'), 1, 'site cell')) === siteLabel,
      );

      if (row === undefined) {
        throw new Error(`the network table printed no row for ${siteLabel}`);
      }

      return row;
    }

    /* The client's own row is a seeded first-party record, so its network, its site and both of its
       coordinates are labelled `Simulated data` and never market intelligence (rules P-1, P-5). */
    const clientRow = rowOf(CLIENT_SITE.label);
    const clientCells = within(clientRow).getAllByRole('cell');

    expect(collapsedTextOf(at(clientCells, 0, 'client network cell'))).toBe(
      COMPETITIVE_ATLAS_TEXT.clientSiteKind,
    );
    expect(collapsedTextOf(at(clientCells, 2, 'client latitude cell'))).toBe(
      String(CLIENT_SITE.latitude),
    );
    expect(collapsedTextOf(at(clientCells, 3, 'client longitude cell'))).toBe(
      String(CLIENT_SITE.longitude),
    );
    expect(collapsedTextOf(at(clientCells, 4, 'client provenance cell'))).toBe(SIM_LABELS[0]);
    expect(within(clientRow).queryByText(SIM_LABELS[5])).toBeNull();

    /* Every competitor's row is market intelligence: the same column says so for the network, the
       site and both coordinates at once, and the network's name keeps its tag beside it. */
    for (const network of COMPETITOR_NETWORKS) {
      for (const site of network.sites) {
        const row = rowOf(site.label);
        const cells = within(row).getAllByRole('cell');

        expect(collapsedTextOf(at(cells, 0, 'competitor network cell'))).toBe(
          `${network.label} ${COMPETITOR_NAME_TAG}`,
        );
        expect(collapsedTextOf(at(cells, 2, 'site latitude cell'))).toBe(String(site.latitude));
        expect(collapsedTextOf(at(cells, 3, 'site longitude cell'))).toBe(String(site.longitude));
        expect(collapsedTextOf(at(cells, 4, 'competitor provenance cell'))).toBe(SIM_LABELS[5]);
        expect(within(row).queryByText(SIM_LABELS[0])).toBeNull();
      }
    }
  });

  it('names each competitor of the chokepoint table beside its identifier and its buffer days', async () => {
    renderScreen();

    await chokepointCard();

    const table = screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption });
    const rows = within(table).getAllByRole('row').slice(1);

    CHOKEPOINTS.forEach((crossing, index) => {
      const cells = within(at(rows, index, 'crossing row')).getAllByRole('cell');
      const competitors = at(cells, 2, 'competitors cell');
      const bufferDays = at(cells, 4, 'buffer days cell');
      const entries = Object.entries(crossing.competitorBufferDays);
      const competitorLines = within(competitors).getAllByRole('listitem');
      const bufferLines = within(bufferDays).getAllByRole('listitem');

      expect(competitorLines).toHaveLength(entries.length);
      expect(bufferLines).toHaveLength(entries.length);

      entries.forEach(([competitorId, days], lineIndex) => {
        const network = COMPETITOR_NETWORKS.find(
          (candidate) => candidate.competitorId === competitorId,
        );

        if (network === undefined) {
          throw new Error(`the fixture holds no network for ${competitorId}`);
        }

        /* The pack's own name sits between the identifier and the tag, so the line reads as one
           attributable phrase and names the company the identifier stands for (rules P-5, P-7). */
        expect(collapsedTextOf(at(competitorLines, lineIndex, 'competitor line'))).toBe(
          `${competitorId} ${network.label} ${COMPETITOR_NAME_TAG}`,
        );

        /* The day count carries the same two: whose buffer it is, printed on the line the figure is
           on, with the figure still the trigger that opens the crossing's record (rule P-8). */
        const bufferLine = at(bufferLines, lineIndex, 'buffer line');

        expect(collapsedTextOf(bufferLine)).toMatch(
          new RegExp(`^${escapeRegExp(`${competitorId} ${network.label} `)}${String(days)}\\b`, 'u'),
        );
        expect(
          within(bufferLine).getByRole('button', {
            name: new RegExp(`^${escapeRegExp(String(days))}\\b`, 'u'),
          }),
        ).toBeInTheDocument();
      });
    });
  });

  it('opens the evidence behind a radar vertex on the one reading the vertex draws', async () => {
    const user = userEvent.setup();

    renderScreen();

    const card = await radarCard();
    const drawing = within(card).getByRole('group', { name: RADAR_CHART_TEXT.groupLabel });
    const axis = at(AXES, 0, 'radar axis');
    const score = at(CLIENT_SERIES.values, 0, 'client score');

    /* One control per reading — every series across every axis — so no vertex is left a plain mark
       (AAP §0.2.1 F12, rule P-8). */
    expect(within(drawing).getAllByRole('button')).toHaveLength(SERIES.length * AXES.length);

    const vertex = within(drawing).getByRole('button', {
      name: `${axis.label}, ${CLIENT_SERIES.label}: ${String(score)}`,
    });

    /* The mark is a keyboard-operable control that opens something (rule B-3, rule P-8). */
    expect(vertex).toHaveAttribute('tabindex', '0');
    expect(vertex).toHaveAttribute('aria-haspopup', 'dialog');

    vertex.focus();
    expect(vertex).toHaveFocus();

    await user.keyboard('{Enter}');

    /* What it opens is the one reading it draws: the series it belongs to, the separator, then the
       axis it sits on (AAP §0.2.1 F12, §0.12.4). */
    expect(port.getEvidence).toHaveBeenCalledWith(`${CLIENT_SERIES.id}#${axis.id}`);

    const dialog = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    expect(await within(dialog).findByText(EVIDENCE.value)).toBeInTheDocument();
    expect(within(dialog).getByText(EVIDENCE.formula)).toBeInTheDocument();

    /* The reference is printed in the drawer's record line and again in its source section, so the
       record the vertex named is what the drawer reports. */
    expect(
      within(dialog).getAllByText(`${CLIENT_SERIES.id}#${axis.id}`).length,
    ).toBeGreaterThan(0);
    expect(within(dialog).queryByText(EVIDENCE_DRAWER_TEXT.failureHeadline)).toBeNull();
  });

  it('opens the record each network mark names, a client site, a competitor site and a crossing', async () => {
    const user = userEvent.setup();

    renderScreen();

    const card = await networkCard();
    const competitorSite = at(
      at(COMPETITOR_NETWORKS, 0, 'competitor network').sites,
      0,
      'competitor site',
    );
    const crossing = at(CHOKEPOINTS, 0, 'shared chokepoint');

    /* Every site the frame places and every crossing it draws is a control that opens its record, so
       no mark is left as a plain shape (AAP §0.2.1 F12, rule P-8). */
    const drawnSites = [
      ...ATLAS.clientSites,
      ...COMPETITOR_NETWORKS.flatMap((network) => [...network.sites]),
    ];

    for (const mark of [...drawnSites, ...CHOKEPOINTS]) {
      expect(
        within(card)
          .getByRole('button', { name: new RegExp(`^${escapeRegExp(mark.label)}`, 'u') })
          .getAttribute('aria-haspopup'),
      ).toBe('dialog');
    }

    /* Every mark reports the identifier it was drawn from, and that identifier is the reference the
       drawer opens: the client's own site, a competitor's site and a shared crossing alike. */
    const marks = [
      { label: CLIENT_SITE.label, reference: CLIENT_SITE.id },
      { label: competitorSite.label, reference: competitorSite.id },
      { label: crossing.label, reference: crossing.id },
    ];

    for (const mark of marks) {
      const control = within(card).getByRole('button', {
        name: new RegExp(`^${escapeRegExp(mark.label)}`, 'u'),
      });

      expect(control).toHaveAttribute('aria-haspopup', 'dialog');

      control.focus();
      await user.keyboard('{Enter}');

      expect(port.getEvidence).toHaveBeenLastCalledWith(mark.reference);

      const dialog = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

      expect(await within(dialog).findByText(EVIDENCE.value)).toBeInTheDocument();
      /* The record line and the source section both print the reference the mark named. */
      expect(within(dialog).getAllByText(mark.reference).length).toBeGreaterThan(0);
      expect(within(dialog).queryByText(EVIDENCE_DRAWER_TEXT.failureHeadline)).toBeNull();

      await user.click(
        within(dialog).getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }),
      );

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title })).toBeNull();
      });
    }
  });

  it('resolves a press to the nearest network mark even where another mark’s target is painted above it', async () => {
    port.getAtlas.mockResolvedValue(envelope(PRESS_ATLAS));

    renderScreen();

    const card = await networkCard();
    const drawing = within(card).getByRole('group', { name: COMPETITOR_NETWORK_TEXT.groupLabel });
    const clientMark = within(drawing).getByRole('button', {
      name: new RegExp(`^${escapeRegExp(CLIENT_SITE.label)}`, 'u'),
    });
    const competitorMark = within(drawing).getByRole('button', {
      name: new RegExp(`^${escapeRegExp(PRESS_SITE.label)}`, 'u'),
    });
    const clientTarget = targetOf(clientMark);
    const competitorTarget = targetOf(competitorMark);

    /* The reproduction: the competitor's dot lies inside the client's target, and the client's group
       is painted last, so a press resolved to the topmost target would open the client site's record
       instead. The drawing answers with the mark whose centre is nearest the pointer. */
    expect(distanceBetween(clientTarget.centre, competitorTarget.centre)).toBeLessThan(
      clientTarget.radius,
    );
    expect(
      competitorMark.compareDocumentPosition(clientMark) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    pressDrawingAt(drawing, competitorTarget.centre);

    /* One gesture, one activation — and it is the mark the reader aimed at. */
    expect(port.getEvidence).toHaveBeenCalledTimes(1);
    expect(port.getEvidence).toHaveBeenLastCalledWith(PRESS_SITE.id);

    const dialog = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    expect(await within(dialog).findByText(EVIDENCE.value)).toBeInTheDocument();
    /* The record line and the source section both print the reference the mark named. */
    expect(within(dialog).getAllByText(PRESS_SITE.id).length).toBeGreaterThan(0);
    expect(within(dialog).queryByText(EVIDENCE_DRAWER_TEXT.failureHeadline)).toBeNull();
  });

  it('attributes a press on a mark’s printed name to the mark that name belongs to', async () => {
    port.getAtlas.mockResolvedValue(envelope(PRESS_ATLAS));

    renderScreen();

    const card = await networkCard();
    const drawing = within(card).getByRole('group', { name: COMPETITOR_NETWORK_TEXT.groupLabel });
    const competitorMark = within(drawing).getByRole('button', {
      name: new RegExp(`^${escapeRegExp(PRESS_SITE.label)}`, 'u'),
    });
    const printedName = competitorMark.querySelector('text');

    if (printedName === null) {
      throw new Error('the mark printed no name to press');
    }

    /* A mark's name is part of the mark and lies outside every target's reach, so a press on it is
       the mark's own. jsdom reports no layout, which is the other half of the case: with no box to
       convert the pointer by, the drawing falls back to the mark whose own group received the press
       rather than dividing by a scale of zero. */
    fireEvent.click(printedName);

    expect(port.getEvidence).toHaveBeenCalledTimes(1);
    expect(port.getEvidence).toHaveBeenLastCalledWith(PRESS_SITE.id);
    expect(
      await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title }),
    ).toBeInTheDocument();
  });

  it('activates nothing when a press on the network drawing lands clear of every mark', async () => {
    port.getAtlas.mockResolvedValue(envelope(PRESS_ATLAS));

    renderScreen();

    const card = await networkCard();
    const drawing = within(card).getByRole('group', { name: COMPETITOR_NETWORK_TEXT.groupLabel });

    /* The top-left corner of the plot, nowhere near the two marks this payload draws: the press
       reaches no target and belongs to no mark, so nothing is selected and no record opens
       (rule P-8). */
    pressDrawingAt(drawing, { x: 1, y: 1 });

    expect(port.getEvidence).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('answers a point with the nearest network mark, and with none beyond the target radius', async () => {
    renderScreen();

    const card = await networkCard();
    const drawing = within(card).getByRole('group', { name: COMPETITOR_NETWORK_TEXT.groupLabel });

    /* The radius is the drawing's own, read back from a rendered target rather than restated. */
    const { radius } = targetOf(at(within(drawing).getAllByRole('button'), 0, 'network mark'));
    const near = { entityId: 'entity-near', x: 100, y: 100 };
    const far = { entityId: 'entity-far', x: 100, y: 100 + radius * 1.5 };

    // The nearer centre answers, whatever order the marks are listed in.
    expect(nearestNetworkMark([far, near], { x: 102, y: 104 }, radius)).toBe(near);
    // Two marks at one centre are told apart by the order the drawing paints them in.
    expect(nearestNetworkMark([near, { ...far, y: near.y }], near, radius)).toBe(near);
    // A press whose nearest mark is still beyond the radius belongs to no mark at all.
    expect(nearestNetworkMark([near, far], { x: 100, y: 100 + radius * 3 }, radius)).toBeNull();
    expect(nearestNetworkMark([], near, radius)).toBeNull();
  });

  it('makes the overlap and every buffer-day figure open the record of the row crossing', async () => {
    const user = userEvent.setup();

    renderScreen();

    await chokepointCard();

    const table = screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption });
    const crossing = at(CHOKEPOINTS, 0, 'shared chokepoint');
    const row = at(within(table).getAllByRole('row').slice(1), 0, 'crossing row');
    const cells = within(row).getAllByRole('cell');
    const overlapTrigger = within(at(cells, 3, 'overlap cell')).getByRole('button');

    /* The figure is the control's label, and the record behind it is the row's crossing (rule P-8). */
    expect(overlapTrigger).toHaveAccessibleName(
      new RegExp(`^${escapeRegExp(String(crossing.overlap))}\\b`, 'u'),
    );

    await user.click(overlapTrigger);

    expect(port.getEvidence).toHaveBeenLastCalledWith(crossing.id);

    const dialog = await screen.findByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title });

    expect(await within(dialog).findByText(EVIDENCE.value)).toBeInTheDocument();
    /* The record line and the source section both print the crossing the figure named. */
    expect(within(dialog).getAllByText(crossing.id).length).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole('button', { name: EVIDENCE_DRAWER_TEXT.closeLabel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: EVIDENCE_DRAWER_TEXT.title })).toBeNull();
    });

    const bufferCell = at(cells, 4, 'buffer days cell');
    const bufferTriggers = within(bufferCell).getAllByRole('button');

    expect(bufferTriggers).toHaveLength(Object.keys(crossing.competitorBufferDays).length);

    /* The buffer column repeats the competitor on each line, so the day count is never unattributed,
       and the keyboard reaches the figure it belongs to (rule P-5, rule B-3). */
    for (const [competitorId] of Object.entries(crossing.competitorBufferDays)) {
      expect(within(bufferCell).getByText(competitorId)).toBeInTheDocument();
    }

    const firstTrigger = at(bufferTriggers, 0, 'buffer-day trigger');

    firstTrigger.focus();
    expect(firstTrigger).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(port.getEvidence).toHaveBeenLastCalledWith(crossing.id);
  });

  it('leads the atlas content with one alert per crossing the payload carried, each labelled market intelligence', async () => {
    renderScreen();

    const band = await screen.findByRole('region', {
      name: COMPETITIVE_ATLAS_TEXT.chokepointAlertCardTitle,
    });

    /* The band leads the content the read supplied, so it renders before the selector card a reader
       meets next (AAP 0.14.1's S3 row, AAP 0.7's S3 stage row). */
    const selector = screen.getByRole('region', { name: COMPETITIVE_ATLAS_TEXT.selectorTitle });

    expect(band.compareDocumentPosition(selector) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    /* One alert per crossing the stubbed payload supplied, counted from that payload rather than typed,
       in the order the pack lists them: nothing dropped, nothing re-ordered (AAP 0.8, rule P-6). */
    const alerts = within(band).getAllByRole('listitem');

    expect(alerts).toHaveLength(CHOKEPOINTS.length);

    CHOKEPOINTS.forEach((crossing, index) => {
      const alert = at(alerts, index, 'chokepoint alert');

      expect(within(alert).getByText(crossing.id)).toBeInTheDocument();
      expect(within(alert).getByText(crossing.label)).toBeInTheDocument();
      expect(within(alert).getByText(crossing.contentionNote)).toBeInTheDocument();

      /* Every alert is market intelligence, and the label is on the alert itself rather than on the
         page around it (rule P-1, rule P-5). */
      expect(within(alert).getAllByText(SIM_LABELS[5])).toHaveLength(1);
    });

    /* The band acts on nothing, so it offers nothing to press (rule P-8). */
    expect(within(band).queryByRole('button')).toBeNull();
    expect(within(band).queryByRole('link')).toBeNull();
  });

  it('offers the chokepoint brief the service composed as the file it named, unchanged', async () => {
    const user = userEvent.setup();
    const offered: { readonly href: string; readonly download: string }[] = [];
    const fetched = vi.spyOn(globalThis, 'fetch');

    installObjectUrlStubs();
    /* The anchor is activated, not navigated: jsdom implements no download and would report one. */
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture(
      this: HTMLAnchorElement,
    ): void {
      offered.push({ href: this.href, download: this.download });
    });

    renderScreen();
    await radarCard();

    await user.click(screen.getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.exportAction }));

    await waitFor(() => {
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
    });

    /* One call to the port, whatever renders the activation caused. */
    expect(port.exportChokepointBrief).toHaveBeenCalledTimes(1);

    const composed = createObjectUrl.mock.calls[0]?.[0];

    if (composed === undefined) {
      throw new Error('the brief was never handed to the browser’s download path');
    }

    expect(composed).toBeInstanceOf(Blob);
    expect(composed.type).toBe(EXPORT_PAYLOAD.mediaType);

    /* The document is the one the service composed: nothing added, dropped or re-serialised, so the
       simulation marker its builder set at the top level survives the screen's handling (rule P-1). */
    expect(await composed.text()).toBe(EXPORT_PAYLOAD.content);

    const handed: unknown = JSON.parse(await composed.text());

    expect(handed).toMatchObject({ simulated: true });

    const file = at(offered, 0, 'offered file');

    expect(offered).toHaveLength(1);
    expect(file.download).toBe(EXPORT_PAYLOAD.filename);

    /* The object URL is released once the file has been offered, and no origin was asked for
       anything at any point (rule B-1). */
    await waitFor(() => {
      expect(revokeObjectUrl).toHaveBeenCalledWith(OBJECT_URL);
    });

    expect(revokeObjectUrl).toHaveBeenCalledTimes(1);
    expect(fetched).not.toHaveBeenCalled();
  });

  it('shows the loading state while the read is pending, and says why the export cannot act yet', async () => {
    /* A read that never settles: the surface has nothing to draw and says so. */
    port.getAtlas.mockReturnValue(new Promise<Result<Atlas>>(() => undefined));

    renderScreen();

    const busy = screen.getByRole('status', { name: STATE_BOUNDARY_TEXT.loading });

    expect(busy).toHaveAttribute('aria-busy', 'true');
    /* Nothing stands in for the pack behind a read that has not answered. */
    expect(screen.queryByRole('region', { name: COMPETITIVE_ATLAS_TEXT.radarCardTitle })).toBeNull();

    /* The banner is the one thing the page can state before the read settles. */
    expect(packBanner().textContent).toBe(ATLAS_PACK_BANNER);

    /* The action cannot act, and its reason is reachable and announced rather than painted only on
       hover (rule B-3, rule P-8). */
    const exportAction = screen.getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.exportAction });

    expect(exportAction).toHaveAttribute('aria-disabled', 'true');
    expect(exportAction).toHaveAccessibleDescription(COMPETITIVE_ATLAS_TEXT.exportWaiting);
  });

  it('reports a rejection the service did not type as a source that did not answer, and reads again on retry', async () => {
    const user = userEvent.setup();

    port.getAtlas.mockRejectedValueOnce(FAILURE);

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.offlineHeadline)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: COMPETITIVE_ATLAS_TEXT.radarCardTitle })).toBeNull();

    /* A read that failed cannot be exported, and the control says so. */
    const exportAction = screen.getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.exportAction });

    expect(exportAction).toHaveAttribute('aria-disabled', 'true');
    expect(exportAction).toHaveAccessibleDescription(COMPETITIVE_ATLAS_TEXT.exportUnavailable);

    expect(port.getAtlas).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }));

    /* The retry asks the port again rather than re-rendering what failed to arrive. */
    expect(await radarCard()).toBeInTheDocument();
    expect(port.getAtlas).toHaveBeenCalledTimes(2);
  });

  it('reports records that moved under the reader as a conflict, with a control that reads them again', async () => {
    const user = userEvent.setup();

    port.getAtlas.mockRejectedValueOnce(CONFLICT);

    renderScreen();

    expect(await screen.findByText(COMPETITIVE_ATLAS_TEXT.conflict)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.reloadLabel }));

    expect(await radarCard()).toBeInTheDocument();
    expect(port.getAtlas).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state with the screen’s own sentence when the pack holds nothing to compare', async () => {
    port.getAtlas.mockResolvedValue(envelope(EMPTY_PACK));

    renderScreen();

    expect(await screen.findByText(COMPETITIVE_ATLAS_TEXT.empty)).toBeInTheDocument();

    /* A pack with nothing in it is a real answer: it replaces the content rather than warning above
       it. */
    expect(screen.queryByRole('region', { name: COMPETITIVE_ATLAS_TEXT.radarCardTitle })).toBeNull();
    expect(packBanner().textContent).toBe(ATLAS_PACK_BANNER);
  });

  it('names the stale source and its as-of time above the figures that are still drawn', async () => {
    port.getAtlas.mockResolvedValue(envelope(ATLAS, 'stale'));

    renderScreen();

    /* The notice names the source the read reported, through the one owner of the six display names,
       and prints the instant that source last answered. */
    expect(
      await screen.findByText(
        `${SOURCE_LABELS[MARKET_PACK_SOURCE]}${STATE_BOUNDARY_TEXT.staleSuffix}`,
      ),
    ).toBeInTheDocument();
    /* The instant is read inside the notice, which is reached from its own headline rather than by role
       alone: the atlas states two status regions beside it, the captions naming the class and the entity
       in view (rule B-3). */
    const staleNotice = screen
      .getByText(`${SOURCE_LABELS[MARKET_PACK_SOURCE]}${STATE_BOUNDARY_TEXT.staleSuffix}`)
      .closest<HTMLElement>('[role="status"]');

    expect(staleNotice).not.toBeNull();

    if (staleNotice !== null) {
      expect(within(staleNotice).getByText(AS_OF)).toBeInTheDocument();
    }

    /* A warning about the data does not withhold the data. */
    expect(await radarCard()).toBeInTheDocument();
  });

  it('passes a partial freshness report through above content that still renders', async () => {
    port.getAtlas.mockResolvedValue(envelope(ATLAS, 'partial'));

    renderScreen();

    expect(await screen.findByText(STATE_BOUNDARY_TEXT.partialHeadline)).toBeInTheDocument();
    expect(screen.getByText(COMPETITIVE_ATLAS_TEXT.partial)).toBeInTheDocument();
    expect(await radarCard()).toBeInTheDocument();
  });

  it('reaches the export and both selector groups from the keyboard and states each selection in words', async () => {
    const user = userEvent.setup();

    renderScreen();
    await radarCard();

    /* The action this screen exists to take is reached without a pointer. */
    const exportAction = await tabTo(
      user,
      (element) => (element.textContent ?? '').trim() === COMPETITIVE_ATLAS_TEXT.exportAction,
      TAB_WALK_LIMIT,
    );

    expect(exportAction.tagName).toBe('BUTTON');
    expect(exportAction).toHaveFocus();

    /* The class selector is reached and operated from the keyboard, and the screen then states in
       words which class is in view rather than leaving the reader to compare colours (rule B-3). */
    const secondClass = at(ATLAS.productClasses, 1, 'product class');

    await tabTo(user, (element) => (element.textContent ?? '').trim() === secondClass, TAB_WALK_LIMIT);
    await user.keyboard('{Enter}');

    expect(
      screen.getByText(
        `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${secondClass}. ${COMPETITIVE_ATLAS_TEXT.classCaptionDetail}`,
      ),
    ).toBeInTheDocument();

    /* So is the entity selector, whose caption then names the series in view. */
    const competitor = at(COMPETITOR_NETWORKS, 0, 'competitor network');

    await tabTo(
      user,
      (element) => (element.textContent ?? '').trim().startsWith(competitor.label),
      TAB_WALK_LIMIT,
    );
    await user.keyboard('{Enter}');

    expect(
      screen.getByText(`${COMPETITIVE_ATLAS_TEXT.entityCaptionPrefix} ${competitor.label}`),
    ).toBeInTheDocument();

    /* The radar's table view is reachable too, so the drawing has a keyboard route to its values
       (success criterion 9, rule B-3). */
    await tabTo(
      user,
      (element) =>
        element.getAttribute('aria-label') ===
        `${VIEW_AS_TABLE_LABELS.showTable}: ${COMPETITIVE_ATLAS_TEXT.radarFigureTitle}`,
      TAB_WALK_LIMIT,
    );
    await user.keyboard('{Enter}');

    expect(
      screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.radarTableCaption }),
    ).toBeInTheDocument();
  });

  it('states both selection captions in status regions that announce each change', async () => {
    const user = userEvent.setup();

    renderScreen();
    await radarCard();

    const classGroup = screen.getByRole('group', { name: COMPETITIVE_ATLAS_TEXT.classGroupLabel });
    const entityGroup = screen.getByRole('group', {
      name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel,
    });

    /* Each caption changes when its selector is operated and no page loads, so each is its group's one
       status region and the words it holds are what a screen reader announces (rule B-3, WCAG 2.2 SC
       4.1.3). */
    expect(within(classGroup).getAllByRole('status')).toHaveLength(1);
    expect(within(entityGroup).getAllByRole('status')).toHaveLength(1);

    const classStatus = within(classGroup).getByRole('status');
    const entityStatus = within(entityGroup).getByRole('status');

    /* Nothing is narrowed until a reader chooses a class, so the caption says the whole pack is in
       view and, once a class is chosen, says what that class narrows (AAP §0.12.4). */
    expect(collapsedTextOf(classStatus)).toContain(COMPETITIVE_ATLAS_TEXT.classCaptionPrefix);
    expect(collapsedTextOf(classStatus)).toContain(COMPETITIVE_ATLAS_TEXT.allClassesCaptionDetail);
    expect(collapsedTextOf(entityStatus)).toContain(COMPETITIVE_ATLAS_TEXT.entityCaptionPrefix);

    /* The entity caption names the series the payload put in view, and the class caption follows the
       reader to the class chosen, in the same region rather than a second one beside it. */
    expect(SERIES.some((entry) => collapsedTextOf(entityStatus).includes(entry.label))).toBe(true);

    const secondClass = at(ATLAS.productClasses, 1, 'product class');

    await tabTo(user, (element) => (element.textContent ?? '').trim() === secondClass, TAB_WALK_LIMIT);
    await user.keyboard('{Enter}');

    expect(within(classGroup).getByRole('status')).toBe(classStatus);
    expect(collapsedTextOf(classStatus)).toContain(secondClass);

    /* And the same region now states what that class narrows, which is the class filter acting rather
       than only being named (AAP §0.12.4). */
    expect(collapsedTextOf(classStatus)).toContain(COMPETITIVE_ATLAS_TEXT.classCaptionDetail);
  });

  it.each(THEMES)('holds under the %s theme', async (theme) => {
    useTheme(theme);

    const rendered = renderScreen();

    /* What is asserted is what a reader receives, never a colour: jsdom resolves no custom property,
       so both themes are read through the same roles, names and text. */
    expect(await radarCard()).toBeVisible();
    expect(await networkCard()).toBeVisible();
    expect(await chokepointCard()).toBeVisible();

    expect(packBanner().textContent).toBe(ATLAS_PACK_BANNER);
    expect(screen.getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.exportAction })).toBeVisible();
    expect(screen.getByRole('group', { name: COMPETITIVE_ATLAS_TEXT.classGroupLabel })).toBeVisible();
    expect(screen.getByRole('group', { name: COMPETITIVE_ATLAS_TEXT.entityGroupLabel })).toBeVisible();
    expect(
      screen.getByRole('table', { name: COMPETITIVE_ATLAS_TEXT.chokepointTableCaption }),
    ).toBeVisible();
    expect(within(await radarCard()).getAllByRole('listitem')).toHaveLength(SERIES.length);

    rendered.unmount();
  });

  it('asks no origin for anything and carries no test hook (rule B-1)', async () => {
    const user = userEvent.setup();
    const fetched = vi.spyOn(globalThis, 'fetch');
    const opened = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const sent = vi.spyOn(XMLHttpRequest.prototype, 'send');

    installObjectUrlStubs();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      /* the file is offered, not navigated to */
    });

    const { container } = renderScreen();

    await radarCard();

    /* The surface is operated the way a reader would before the claim is made. */
    await user.click(screen.getByRole('button', { name: COMPETITIVE_ATLAS_TEXT.exportAction }));

    await waitFor(() => {
      expect(createObjectUrl).toHaveBeenCalledTimes(1);
    });

    expect(fetched).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();

    /* Nothing the surface leaves behind addresses a host or embeds a resource that would. */
    const addresses = [
      ...container.querySelectorAll('[href],[xlink\\:href],[src],[srcset],[action]'),
    ]
      .map(
        (element) =>
          element.getAttribute('href') ??
          element.getAttribute('xlink:href') ??
          element.getAttribute('src') ??
          element.getAttribute('srcset') ??
          element.getAttribute('action') ??
          '',
      )
      .filter((address) => address.trim() !== '');

    expect(addresses).toStrictEqual([]);
    expect(container.querySelectorAll('img, image, iframe, object, embed')).toHaveLength(0);
    /* And no hook exists for a test to reach production behaviour through. */
    expect(container.querySelectorAll('[data-testid]')).toHaveLength(0);
  });
});

