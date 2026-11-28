/**
 * SCR-13, the competitive atlas: the simulated market-intelligence pack on one surface, with the
 * client's own resilience beside three competitors', the two networks drawn on one frame and the
 * shared crossings the pack records.
 *
 * FIXING INPUTS. AAP 0.12.4's SCR-13 row fixes the content in full — "Banner naming the simulated
 * pack; selector for the client and three competitors filtered by product class; network view with
 * shared chokepoints; five-axis resilience radar with competitor series tagged `Simulated market
 * intelligence` and the client series `Simulated data: client self-assessment`; chokepoint table
 * with overlap, competitor buffer days and contention note. Primary action: Export the chokepoint
 * brief as JSON. Every competitor name carries the imported competitor tag; forbidden for USR-08."
 * AAP 0.13.1 and 0.15.1 give this path its row (High, source), AAP 0.14.1's S3 row and F13 place it
 * in stage S3, AAP 0.12.3 assigns the read `GET /market-intelligence/atlas` the permission
 * `competitive.read`, and AAP 0.12.1 with contracts §11 fix the chokepoint brief the export
 * downloads. Acceptance test T-21 asserts the banner, the overlay, the labelled series and the
 * chokepoint table against this screen.
 *
 * WHAT THIS FILE OWNS AND WHAT IT HANDS TO ITS SIBLINGS. It is the listener of the `/competitive`
 * route and the composer of three siblings: {@link ChokepointAlertStrip}, which alerts on the
 * crossings the pack records, {@link CompetitorNetwork}, which draws the sites, lanes and crossings,
 * and {@link ChokepointTable}, which lists them. All three are presentational and take their records
 * as props. This file owns the one read, the two selectors, the pack banner, the alert strip's
 * wording, the two chart frames, the legend, the export and the resolver the chokepoint table names a
 * competitor with, and nothing else.
 *
 * RULE P-5 IS THE GOVERNING RULE HERE, AND IT IS STRUCTURAL RATHER THAN REVIEWED. Market
 * intelligence is never blended with a first-party record in one number. The payload keeps the two
 * families in separate members (`clientSites` and `radarSeries`' first-party member against
 * `competitors` and its market-intelligence members), each series carries its own label, and this
 * screen adds no aggregate of any kind: no total, no average, no combined series, no "overall
 * score", no summed column. The radar's table view carries one column per series and one row per
 * axis, which is the payload read as a table rather than a figure over it. Every competitor name it
 * paints is followed by `COMPETITOR_NAME_TAG`, and that treatment is decided by the record's own
 * provenance: only a series stating {@link COMPETITOR_PROVENANCE} is a competitor's, while the
 * client's `first_party` score and a `computed` first-party figure stay client series (AAP §0.8).
 * Each series prints the label its own record states — the market-intelligence member of
 * `SIM_LABELS` for a competitor's, `CLIENT_SELF_ASSESSMENT_LABEL` for the client's and no second
 * label — so a label can never disagree with the payload that supplied the series (rule P-5).
 *
 * THE NETWORK'S TABLE VIEW STATES THE FAMILY OF EVERY FIGURE IT PRINTS. The drawing beside the table
 * labels each competitor's group, so the table cannot leave its reader to infer the same thing from
 * the tag on the network's name: its last column carries the label the row's family owns — the
 * market-intelligence member of the fixed list for a competitor's site, `Simulated data` for one of
 * the client's own — in the same `StatusIndicator` treatment `./chokepoint-table.tsx` gives its own
 * provenance column. One column for the row states it, where a label repeated beside each figure
 * would say the same thing three times and leave a reader nothing to scan: a row's network, its site
 * and both of its coordinates come from one record and share one family (rules P-1, P-5).
 *
 * THE CHOKEPOINT TABLE NAMES THE COMPETITOR BESIDE ITS IDENTIFIER. A crossing's buffer map is keyed by
 * `CMP-0x`, and the pack keeps those companies' names on its networks rather than on the crossing, so
 * this screen builds the table's `competitorNameOf` resolver over `competitors` and the table prints
 * the name the payload holds. Nothing is joined outside the payload and no name is written here
 * (rules P-6, P-7): a reader can tell from the on-screen table which competitor holds the buffer days
 * at a crossing, and the table names the same companies the exported brief maps those identifiers to.
 *
 * RULE DIVERGENCE, REPORTED AND NOT RESOLVED IN THIS FILE (the same note `src/components/legend.tsx`
 * and `./competitor-network.tsx` carry). Rule P-5's text fixes one company word for the competitor
 * tag while AAP 0.10's companion-string row pairs the same tag with a different one;
 * `src/types/primitives.ts` settles the pair by shipping `COMPETITOR_NAME_TAG` as the rule's own
 * wording, naming the rule — the highest-ranked input (AAP 0.1) — as the winner in that constant's
 * documentation. This file imports the constant and renders it verbatim, so a change to the
 * resolution needs one edit in the types layer and none here.
 *
 * NOTHING HERE IS COMPUTED, FORMATTED OR TYPED (rules P-6, P-2). Every figure, name and identifier
 * on the surface arrives from `getAtlas()` through the port: the class list, the series' scores, the
 * sites' coordinates, the crossings' overlap and buffer days, the contention notes. This module sums
 * nothing, averages nothing, rounds nothing, sorts nothing and reads no clock, and it types no
 * currency literal and no domain identifier — the classes a reader selects are the payload's own
 * `productClasses` entries. The class selector decides which of those records are drawn and the entity
 * selector which record the two drawings mark and which one the captions name; neither computes a
 * value, and nothing either narrows is derived from a figure.
 *
 * THE SEVEN STATES COME FROM THE READ, NEVER FROM A FLAG — AAP 0.8, 0.12.1. The body is wrapped in
 * `StateBoundary`, and the shared `deriveScreenState` (`src/components/screen-state.ts`) reads only
 * what the one query settled to: a
 * `'permission'` refusal is the forbidden card built from the service's own `requiredPermission`,
 * `rolesWithPermission` and `traceId` (the refusal USR-08 meets); a `'validation'` refusal is the
 * conflict notice; any other rejection is offline with a retry that re-runs the read; a pending read
 * is the loading state; the freshness report the adapter attaches to `Result.meta` raises the stale
 * banner, naming the source and its as-of instant, or the partial notice above content that still
 * renders; and a pack with no competitor series or no crossing is the empty state. No member of
 * `SimulationFlag` is named here, so the single simulation popover reaches this screen by changing
 * what the adapter answers rather than by a branch in the view. This screen performs no permission
 * check of its own and says nothing about the standing of the browser-side checks behind the port
 * (rules P-2, P-3): it explains the refusal the service made.
 *
 * THE EXPORT IS A BROWSER-BUILT FILE AND NEVER A REQUEST (rules B-1, B-2). `exportChokepointBrief()`
 * resolves the download payload — its suggested file name, its media type and the document's text,
 * which already carries `"simulated": true` at its top level — and this screen offers it through a
 * `Blob` object URL and a transient download anchor. Nothing is added to, stripped from or reshaped
 * in that payload. No address is opened, no credential exists and no configuration is read anywhere
 * in the path; the only global it touches is the browser's own `URL` and `document`.
 *
 * REPORTED GAPS, AND WHAT EACH MARKING RESTS ON, recorded where it bites rather than worked around:
 * 1. The port's `getAtlas()` takes no argument, so the product-class selector narrows what this
 *    screen draws rather than what it reads: one payload answers every class the selector offers, and
 *    the class in view decides which competitor networks are drawn, together with the sites, the
 *    crossings their lanes traverse, the alerts the band leads with and the radar series those
 *    networks carry (AAP §0.12.4). The narrowing runs on the pack's own classification —
 *    `CompetitorNetwork.productClasses`, joined to each series by `AtlasSeries.competitorId` — so it
 *    states no figure of its own and no first-party measure of a competitor, which is what keeps rule
 *    P-5 intact through a filter that follows one of the client's own product classes. The client's
 *    own series and sites stay drawn in every class, because they report on the client rather than on
 *    a competitor the class could select.
 * 2. THE ENTITY IN VIEW IS MARKED IN BOTH DRAWINGS. `RadarChart` takes `selectedSeriesId` and draws
 *    that series' outline heavier while its label-band row states `aria-current` and prints its name
 *    in the emphasised weight; `CompetitorNetwork` takes `highlightedCompetitorId` and emphasises the
 *    family in view — the client's own network when the value is `null` — while the competitors that
 *    are not in view recede. The selector therefore performs the selection it presents rather than
 *    only highlighting its own control (rule P-8), the marking is a stroke weight, a text weight and
 *    an attribute rather than a hue (rule B-3), and the caption beside the group and the chip's own
 *    `aria-pressed` state it as before. The legend beside the radar is the one surface
 *    that only describes the series. Both drawings also answer with evidence instead of restating the
 *    selection: every radar vertex carries `<series id>#<axis id>` (see
 *    {@link radarVertexReference}) and every site mark and crossing halo carries the identifier it was
 *    drawn from (see {@link networkMarkReference}), so each vertex, site and halo opens the record
 *    behind it (AAP §0.2.1 F12, §0.12.4) and no mark is a focus stop with nothing behind it (rule
 *    P-8).
 * 3. BOTH SELECTOR GROUPS STATE THEIR CHOSEN CHIP PROGRAMMATICALLY. Each chip of both groups renders
 *    the plain `Button` primitive of `src/components/button.tsx` — the owner of a button whose state
 *    lives in an aria attribute — and carries `aria-pressed`, true for the class or the entity in view
 *    and false for every other chip, so a reader is told which one is chosen rather than left to
 *    compare fills (rule B-3). The caption beside each group still restates the choice in words, and
 *    the two drawings keep marking the entity in view with `aria-current`. `ActionButton`
 *    (`src/components/tooltip.tsx`) admits neither attribute, so it now renders the export action
 *    alone.
 * 4. The network drawing mixes the client's own sites with the competitors' networks, so no single
 *    frame-level simulation label would be true of all of it. Both frames are composed with
 *    `ChartFrame`'s market-intelligence variant, which paints no frame-level label, and each family
 *    is labelled inside the drawing by `./competitor-network.tsx` itself (rule P-5).
 * 5. The payload carries no lane list for the client's own network — `Atlas` declares `clientSites`
 *    and each competitor's `lanes`, and the client's lanes are neither declared nor composed — so the
 *    network view is handed `NO_CLIENT_LANES` rather than a lane list this screen would have to
 *    invent. The client's sites are drawn, and the shared crossings are placed from the competitor
 *    lanes that traverse them.
 * 6. Two strings the plan does not fix are written here and reported: the empty sentence (the
 *    specification fixes none for SCR-13) and the sentence shown when the export fails in a shape
 *    that did not arrive as the service's `Problem`.
 *
 * Rules this module is built to satisfy: B-1 (no address, no request, no remote font, icon or
 * image), B-2 (no credential, no environment read), B-3 (every control keyboard operable with the
 * shared 24x24 px target and focus ring, the active selection stated in text and in `aria-pressed` and
 * never by colour alone, both frames offering "View as table", headings running `h1` then the cards'
 * `h2`s, no animation declared here), P-1 (the pack banner from its constant, the per-series labels
 * from the types layer, no model and no live feed implied), P-2 (`useService()` is the only data path;
 * no seed, adapter, app, domain or sibling feature module is imported), P-3 (nothing about
 * authorisation), P-4 (nothing about sovereignty, copying or resistance), P-5 (the governing rule
 * above), P-6 (no figure, currency literal or identifier typed), P-7 (Site Intelligence's own
 * vocabulary, every company and place name from the payload, no filler text) and P-8 (every control
 * either acts — the two selector groups through `Button`, the export through `ActionButton` — or is
 * disabled through `ActionButton` with the reason in its `disabledReason`).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { ChartFrame } from '../../components/chart-frame';
import type { ChartTableSpec } from '../../components/chart-frame';
import type { TableColumn } from '../../components/data-table';
import { competitorSlotOf } from '../../components/horizontal-bar-chart';
import { Legend } from '../../components/legend';
import type { LegendEntry } from '../../components/legend';
import { offerExportFile } from '../../components/offer-export-file';
import { PageHeader } from '../../components/page-header';
import { RadarChart } from '../../components/radar-chart';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import { StatusIndicator } from '../../components/status-indicator';
import {
  ActionButton,
  CONTROL_STRUCTURE_CLASSES,
  PRIMARY_CONTROL_CLASSES,
  PRIMARY_STATE_CLASSES,
  SECONDARY_CONTROL_CLASSES,
} from '../../components/tooltip';
import { useService } from '../../services/service-provider';
import { ATLAS_PACK_BANNER, COMPETITOR_NAME_TAG, SIM_LABELS } from '../../types';
import type {
  Atlas,
  AtlasLane,
  AtlasSeries,
  AtlasSite,
  Chokepoint,
  CompetitorId,
  CompetitorNetwork as CompetitorNetworkPayload,
  ExportPayload,
  Provenance,
  RadarAxis,
  Result,
  Scope,
  SimLabel,
  SourceId,
} from '../../types';
import {
  ChokepointAlertStrip,
  DEFAULT_DESCRIPTION as CHOKEPOINT_ALERT_DESCRIPTION,
  DEFAULT_EMPTY_MESSAGE as CHOKEPOINT_ALERT_EMPTY,
  DEFAULT_TITLE as CHOKEPOINT_ALERT_TITLE,
} from './chokepoint-alert-strip';
import { ChokepointTable } from './chokepoint-table';
import type { CompetitorNameResolver } from './chokepoint-table';
import { CompetitorNetwork } from './competitor-network';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every caption, label and sentence this screen states that no input fixes.
 *
 * Held in one object so the wording has a single owner: the component renders these strings and a
 * suite names them through this object instead of retyping them. None of them is a record value or
 * a figure (rule P-6), and none repeats a string another module owns: the seven §5.3 labels, the
 * competitor name tag, the client series label and the pack banner are imported from `../../types`,
 * and every company, place and identifier is the payload's. Nothing below states a property of a
 * deployment, a capability the demonstration does not implement, or anything about where a record is
 * held (rules P-3, P-4).
 */
export const COMPETITIVE_ATLAS_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The screen's title, in the one level-one heading it renders (specification SCR-13). */
  title: 'Competitive atlas',

  /** The one-line account of what the surface compares. */
  description:
    'The simulated market-intelligence pack beside the client\u2019s own self-assessment: the resilience scores, the networks and the shared crossings, each family drawn and labelled on its own.',

  /** The one action this screen exists to take, in the header's action slot. */
  exportAction: 'Export the chokepoint brief as JSON',

  /** Why the export cannot act while the atlas is still being read. */
  exportWaiting: 'The atlas is still being read, so the brief cannot be prepared yet.',

  /** Why the export cannot act when the atlas could not be read at all. */
  exportUnavailable:
    'The atlas could not be read, so the brief cannot be prepared. Read it again first.',

  /** Why the export cannot act while a brief it already asked for is being prepared. */
  exportRunning: 'A brief is already being prepared.',

  /** What the export states when it fails in a shape that did not arrive as the service's `Problem`. */
  exportFailedUntyped: 'The brief could not be prepared.',

  /**
   * What the export states when the brief arrived but this page cannot hand a file over.
   *
   * The brief was composed and recorded before anything was offered, so this names the limit the reader
   * actually met rather than reporting an export the service did not fail (rule P-8).
   */
  downloadUnavailable:
    'This page offers no way to save a file, so the brief could not be downloaded.',

  /** The accessible name of the banner region that names the simulated pack. */
  bannerRegionLabel: 'Market-intelligence pack',

  /** The heading of the card holding the two selector groups. */
  selectorTitle: 'What the atlas is read for',

  /** The accessible name of the product-class group. */
  classGroupLabel: 'Product class in view',

  /**
   * The label of the control that puts every class the pack holds back in view.
   *
   * It is the first control of the class group, so the narrowing a class performs is reversible: a
   * reader who chose a class can always return to the unfiltered atlas (rule P-8).
   */
  allClassesLabel: 'All product classes',

  /** Introduces the caption that states which product class is in view, in words rather than colour. */
  classCaptionPrefix: 'Product class in view:',

  /**
   * The sentence printed after the class in view, stating what that class narrows.
   *
   * A reader told only "in view" could believe the control distinguishes nothing, or could believe it
   * narrows the client's own reading as well. This sentence says what is drawn: a competitor network
   * is drawn while the pack classifies it in the class in view, and the sites, crossings and series
   * are the ones those networks carry (AAP §0.12.4). It states a classification rather than a
   * measure, so no first-party figure is blended into a competitor's (rule P-5).
   */
  classCaptionDetail:
    'Only the competitor networks the pack classifies in this class are drawn, with their sites, the crossings their lanes traverse and their radar series beside the client\u2019s own.',

  /** The sentence printed while every class the pack holds is in view. */
  allClassesCaptionDetail:
    'Every class the pack holds is in view, so every competitor the pack records is drawn.',

  /** The accessible name of the client-and-competitors group. */
  entityGroupLabel: 'Entity in view',

  /** Introduces the caption that states which entity is in view, in words rather than colour. */
  entityCaptionPrefix: 'Entity in view:',

  /** What either caption states when the payload offered nothing to select. */
  nothingInView: 'nothing',

  /** The heading of the card holding the resilience radar and its legend. */
  radarCardTitle: 'Resilience radar',

  /** The radar figure's own caption, which "View as table" takes its accessible name from. */
  radarFigureTitle: 'Resilience scores by axis and series',

  /** What the radar figure shows, and what it deliberately does not. */
  radarFigureDescription:
    'One polygon per series, each drawn and labelled on its own. No combined or averaged score is shown.',

  /** The accessible name of the radar's table view, rendered as the table's caption. */
  radarTableCaption: 'Resilience scores by axis, one column per series',

  /** The heading of the card holding the network view. */
  networkCardTitle: 'Competitor network view',

  /** The network figure's own caption. */
  networkFigureTitle: 'Sites placed by network',

  /** What the network figure draws, and where the crossings it marks are listed. */
  networkFigureDescription:
    'The client\u2019s own sites and every competitor network on one frame. The crossings the lanes traverse are listed in the chokepoint table below.',

  /** The accessible name of the network's table view, rendered as the table's caption. */
  networkTableCaption: 'Sites the network view places, by network and position',

  /** The heading of the card holding the chokepoint table. */
  chokepointCardTitle: 'Shared chokepoints',

  /**
   * The heading, the description and the empty sentence of the chokepoint alert strip that leads the
   * atlas content, and the sentence it adds while a product class is in view.
   *
   * The band renders the three through the wording its own module owns and exports, imported at the
   * top of this file, so the sentence stating where the figures live — the alerts state the pack's
   * contention account, the table below adds the overlap and each competitor's buffer days — has one
   * owner and a change to it reaches this screen without a second edit.
   * {@link chokepointAlertNarrowed} is this screen's own, because it states what this screen's class
   * selector leaves the band listing. The band leads the content because the crossings the pack
   * records come before the figures drawn over them, which is the order AAP 0.14.1's S3 row and
   * AAP 0.7's S3 stage row fix for stage S3.
   */
  chokepointAlertCardTitle: CHOKEPOINT_ALERT_TITLE,

  /** What the alert strip says it carries, printed above the alerts. */
  chokepointAlertDescription: CHOKEPOINT_ALERT_DESCRIPTION,

  /**
   * The sentence the alert band adds while a product class is in view, stating what that class leaves
   * it listing.
   */
  chokepointAlertNarrowed:
    'The crossings a lane of a network in the class in view traverses are the ones listed here; the rest of the pack\u2019s crossings stay out of view until every class is back in view.',

  /** What the alert strip says when the pack records no crossing to alert on. */
  chokepointAlertEmpty: CHOKEPOINT_ALERT_EMPTY,

  /** The accessible name of the chokepoint table, rendered as the table's caption. */
  chokepointTableCaption:
    'Shared crossings in the pack, with overlap, each competitor\u2019s buffer days and the contention note',

  /** The label of the table view's axis column. */
  columnAxis: 'Axis',

  /** The label of the table view's site column. */
  columnSite: 'Site',

  /** The label of the table view's network column. */
  columnNetwork: 'Network',

  /** The label of the table view's latitude column. */
  columnLatitude: 'Latitude',

  /** The label of the table view's longitude column. */
  columnLongitude: 'Longitude',

  /**
   * The label of the network table's provenance column: the family the row's figures belong to.
   *
   * The chokepoint table titles the same reading `Provenance` in its own last column, so the two
   * tables of this screen name one column the same way.
   */
  columnProvenance: 'Provenance',

  /**
   * The words a client site's row prints in the network column: the client's own network has no
   * label in the payload, so the table names the family the row belongs to instead of inventing a
   * network name for it.
   */
  clientSiteKind: 'Client network',

  /** What the boundary says when nothing the class in view selects can be compared. */
  empty: 'No competitor series and no shared crossing are in view, so there is nothing to compare.',

  /** What the boundary says when a source behind the pack answered incompletely. */
  partial:
    'A source behind this pack answered incompletely, so the atlas covers the records it supplied.',

  /** What the boundary says when the records moved under the reader. */
  conflict: 'These records changed while they were being read, so the atlas was not updated.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * Fixed vocabulary and neutral collections
 * ------------------------------------------------------------------------------------------- */

/**
 * The market-intelligence label of specification §5.3, taken by position from the fixed list in
 * `src/types` so the exact string has one owner and is never spelled in this module (rule P-1).
 *
 * The tuple lists the seven labels in §5.3 order and the sixth is the one a competitor's figures
 * carry; indexing at a constant index keeps the literal type, which is what `LegendEntry`'s
 * `competitor` branch requires.
 */
const MARKET_INTELLIGENCE_LABEL: (typeof SIM_LABELS)[5] = SIM_LABELS[5];

/**
 * The one provenance a competitor series carries, and the only one that earns the competitor
 * treatment: the market-intelligence label beside the series and `COMPETITOR_NAME_TAG` beside its
 * name (rule P-5).
 *
 * `Provenance` has two other members, `first_party` and `computed`, and both are first-party family
 * values rather than competitor estimates — the client's own score is one, and a figure the
 * application derived from the client's own records is the other (AAP §0.8). A series is therefore
 * treated as a competitor only when the record itself says `market_intelligence`; testing for the
 * first-party member instead would read a computed series as a competitor's and print the
 * market-intelligence label over a first-party figure, which is the one thing rule P-5 forbids.
 */
const COMPETITOR_PROVENANCE: Provenance = 'market_intelligence';

/**
 * The `Simulated data` member of the same fixed list, taken by position for the same reason (rule
 * P-1).
 *
 * A client site's own coordinates are a seeded first-party record and not a competitor's estimate,
 * so the network table's provenance column labels that row with this member. The two labels are the
 * family statement the table makes about a row's figures, and neither is ever blended into the other:
 * a row is either a competitor's or the client's, and its label says which (rule P-5).
 */
const SIMULATED_DATA_LABEL: (typeof SIM_LABELS)[0] = SIM_LABELS[0];

/** The classes the atlas offers when the payload has not arrived, so a memoised list stays stable. */
const NO_CLASSES: readonly string[] = [];

/** The competitor networks of a read that has not settled, or settled to nothing. */
const NO_NETWORKS: readonly CompetitorNetworkPayload[] = [];

/** The series of a read that has not settled, or settled to nothing. */
const NO_SERIES: readonly AtlasSeries[] = [];

/** The axes of a read that has not settled, or settled to nothing. */
const NO_AXES: readonly RadarAxis[] = [];

/** The client sites of a payload that has not settled, or holds none. */
const NO_SITES: readonly AtlasSite[] = [];

/** The crossings of a payload that has not settled, or holds none. */
const NO_CHOKEPOINTS: readonly Chokepoint[] = [];

/**
 * The client's own lanes, which this payload does not carry.
 *
 * `Atlas` declares the client's sites (`clientSites`) and every competitor network with its own
 * `lanes`, but no lane list for the client's own network — a member the atlas handler does not
 * compose and `src/types/atlas.ts` does not declare. The network view therefore draws the client's
 * sites as its first-party side and the crossings the competitors' lanes traverse, and this screen
 * invents no client lane to fill the gap (rule P-6): a lane written here would state a connection
 * between two plants that no record holds.
 */
const NO_CLIENT_LANES: readonly AtlasLane[] = [];

/**
 * The selection a screen reads when the shell supplies none: the empty plant and product arrays,
 * which `Scope` documents as "all plants" and "all products" rather than as "none".
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * What a cell states when a series carries no score for an axis.
 *
 * `AtlasSeries.values` is documented as aligned to `Atlas.radarAxes` by index, so a shorter array is
 * a payload defect rather than a zero. A dash says the record holds nothing there, where a figure
 * would invent one (rules P-6, P-5).
 */
const NO_SCORE_MARKER = '—';

/* ---------------------------------------------------------------------------------------------
 * Layout, built from role tokens and the 4 px grid only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 6-step of the spacing scale. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/**
 * The banner naming the pack: the second raised surface inside the decorative hairline, at the card
 * radius, in the primary text role. Role tokens only, so both themes paint the values their own
 * measure fixes, and the token layer exposes no elevation utility, so no shadow can be added.
 */
const BANNER_CLASSES =
  'rounded-card border border-hairline bg-surface-2 px-3 py-2 text-13 break-words text-text-primary';

/** The selector row: the two groups stacked below 1280 px and side by side from it. */
const SELECTOR_ROW_CLASSES =
  'flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:items-start xl:justify-between';

/** One selector group: its controls and, beside them, the words stating what is in view. */
const SELECTOR_GROUP_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/**
 * The caption stating the class or the entity in view. It is the reason the selection never rests on
 * colour alone: the two controls differ by label and the words here say which one is active (B-3).
 */
const SELECTION_CAPTION_CLASSES = 'min-w-0 text-13 text-text-secondary';

/**
 * One selector chip at rest: the structure every bordered control shares plus the secondary
 * appearance, both taken from their single owner in `src/components/tooltip.tsx`.
 *
 * Composing the two exported lists rather than writing them again is what keeps a chip and the
 * secondary action beside it one control pattern, and it lets the plain `Button` primitive own the
 * element — which is what a chip needs, because the chip states which of its peers is chosen through
 * `aria-pressed` and `ActionButton`'s props admit no such attribute (rule B-3).
 */
const RESTING_CHIP_CLASSES = `${CONTROL_STRUCTURE_CLASSES} ${SECONDARY_CONTROL_CLASSES}`;

/**
 * The chip whose class or entity is in view: the same structure, the filled action pair and the
 * primary action's pointer states.
 *
 * The chosen chip keeps the filled pair it wore when the chips were actions, so the selection a reader
 * sees is unchanged and no colour is invented here; what the plain primitive adds is `aria-pressed` on
 * the control itself, so the choice is stated programmatically as well as in the caption beside the
 * group (rule B-3).
 */
const CHOSEN_CHIP_CLASSES =
  `${CONTROL_STRUCTURE_CLASSES} ${PRIMARY_CONTROL_CLASSES} ${PRIMARY_STATE_CLASSES}`;

/**
 * A companion tag — the competitor name tag, the market-intelligence label or the client series
 * label — inside the control radius with the hairline boundary, so it reads as a tag rather than as
 * a continuation of the name beside it.
 *
 * This list belongs to a card surface, where the caption role is the correct one: the card paints
 * the page's own surface, and Khaki in Command and Coffee Bean in Paper are measured against it.
 */
const OPTION_TAG_CLASSES =
  'rounded-control border border-hairline px-1 text-12 text-text-caption';

/**
 * The same companion tag where it sits inside a selector control, which is a different surface.
 *
 * A control that carries the tag is filled with the action pair or the secondary surface, and the
 * primary fill inverts against the page — Cream on the Command ground, Chocolate on the Paper one —
 * so a caption role painted here would be a page-surface colour on the wrong surface: Khaki on Cream
 * measures 2.51:1 and Coffee Bean on Chocolate 2.36:1, both under the 4.5:1 rule B-3 requires of
 * text. The colour role is therefore left off and the tag inherits the control's own foreground,
 * which is the one value that suits the fill in every state of every variant: the primary action pair
 * (17.08:1 in both themes), that pair inverted on hover and on press (17.08:1 and 13.28:1 in
 * Command, 17.08:1 and 15.12:1 in Paper) and the secondary variant's primary text (13.28:1 and
 * 15.12:1). The boundary follows the same inherited foreground rather than the page hairline, so the
 * edge stays as legible as the text it encloses on whichever fill the control paints — the hairline
 * role would drop to 1.82:1 against the primary hover fill in Command.
 *
 * Only the two colour decisions differ from {@link OPTION_TAG_CLASSES}: the control radius, the 12 px
 * step and the padding are the tag's own and are unchanged.
 */
const CONTROL_TAG_CLASSES = 'rounded-control border border-current px-1 text-12';

/**
 * An identifier in the tabular mono face, so the class identifiers line up when a reader compares
 * two of them. Presentation only: the value arrives as the payload spells it.
 */
const IDENTIFIER_CLASSES = 'font-mono text-13 tabular-nums';

/** The notice the export's failure is reported in: the raised second surface, in the primary role. */
const NOTICE_CLASSES =
  'rounded-card border border-hairline bg-surface-2 px-3 py-2 text-13 break-words text-text-primary';

/* ---------------------------------------------------------------------------------------------
 * The entity list and its defaults
 * ------------------------------------------------------------------------------------------- */

/**
 * The product class the atlas opens on.
 *
 * The shell's own product selection leads, because a shell that has filtered to one product expects
 * the atlas to open on that product's class; a class the pack does not offer is ignored rather than
 * requested. With no shell selection the atlas opens unfiltered, because `null` means every class the
 * pack holds is in view: a reader who has narrowed nothing meets every competitor the pack records,
 * and the "All product classes" control opens active beside the classes (rule P-8). Nothing is
 * computed either way — the class returned is the payload's own.
 *
 * @param scope - The shell's plant and product selection.
 * @param productClasses - The classes the payload offers.
 * @returns The class to open on, or `null` when every class the pack holds is in view.
 */
function resolveDefaultClass(
  scope: Scope,
  productClasses: readonly string[],
): string | null {
  for (const selected of scope.products) {
    if (productClasses.includes(selected)) {
      return selected;
    }
  }

  return null;
}

/**
 * The entity the atlas opens on: the client's own series when the pack carries one, and otherwise
 * the first series it lists.
 *
 * The client leads because the screen exists to compare the client against the competitors, and the
 * first-party series is the only member of the payload that is the client's own. The choice is made
 * from payload data and never from a typed identifier (rule P-6).
 *
 * @param series - The radar series the payload carries.
 * @returns The identifier to select, or `null` when the payload carries no series at all.
 */
function resolveDefaultEntity(series: readonly AtlasSeries[]): string | null {
  const client = series.find((entry) => entry.provenance === 'first_party');
  const chosen = client ?? series[0];

  return chosen === undefined ? null : chosen.id;
}

/**
 * The label of the entity in view, or `undefined` when the payload no longer lists it.
 *
 * A lookup, not a computation: the identifier is matched against the series the payload carries and
 * the record's own label is returned.
 *
 * @param series - The radar series the payload carries.
 * @param entityId - The identifier the selector holds.
 * @returns The record's label, or `undefined`.
 */
function labelOfEntity(
  series: readonly AtlasSeries[],
  entityId: string | null,
): string | undefined {
  if (entityId === null) {
    return undefined;
  }

  return series.find((entry) => entry.id === entityId)?.label;
}

/* ---------------------------------------------------------------------------------------------
 * What the class in view leaves drawn — AAP 0.12.4's selector at work on the payload
 * ------------------------------------------------------------------------------------------- */

/**
 * The competitor networks a product class leaves in view.
 *
 * A network is in view while the pack classifies it in the class in view; `null` is "every class the
 * pack holds", which leaves every network in view. The classification is the record's own
 * `CompetitorNetwork.productClasses`, read in the order the pack lists the networks, so nothing is
 * matched by a name and no figure is derived here (rules P-5, P-6).
 *
 * @param competitors - The competitor networks the payload carries, in its own order.
 * @param productClass - The class in view, or `null` for every class the pack holds.
 * @returns The networks in view.
 */
function competitorNetworksInViewOf(
  competitors: readonly CompetitorNetworkPayload[],
  productClass: string | null,
): readonly CompetitorNetworkPayload[] {
  if (productClass === null) {
    return competitors;
  }

  return competitors.filter((network) => network.productClasses.includes(productClass));
}

/**
 * The radar series a class leaves in view.
 *
 * The client's own first-party series is always drawn, because it reports on the client rather than
 * on a competitor the class could select; a competitor series is drawn while its `competitorId` names
 * a network in view. That join is what keeps one identity across the radar and the network view
 * without matching a series' label against a network's name (rule P-5).
 *
 * @param series - The radar series the payload carries, in its own order.
 * @param networks - The competitor networks in view.
 * @returns The series in view.
 */
function radarSeriesInViewOf(
  series: readonly AtlasSeries[],
  networks: readonly CompetitorNetworkPayload[],
): readonly AtlasSeries[] {
  const networksInView = new Set(networks.map((network) => network.competitorId));

  return series.filter(
    (entry) => entry.competitorId === null || networksInView.has(entry.competitorId),
  );
}

/**
 * The shared crossings a class leaves in view: the ones a lane of an in-view network traverses.
 *
 * `null` is "every class the pack holds", which leaves every crossing in view. A crossing no network
 * in view routes through is a crossing the drawn lanes do not reach, so listing it beside them would
 * print a row for a network the drawing no longer shows.
 *
 * @param chokepoints - The crossings the payload carries, in its own order.
 * @param networks - The competitor networks in view.
 * @param productClass - The class in view, or `null` for every class the pack holds.
 * @returns The crossings in view.
 */
function chokepointsInViewOf(
  chokepoints: readonly Chokepoint[],
  networks: readonly CompetitorNetworkPayload[],
  productClass: string | null,
): readonly Chokepoint[] {
  if (productClass === null) {
    return chokepoints;
  }

  const traversed = new Set<string>();

  for (const network of networks) {
    for (const lane of network.lanes) {
      if (lane.chokepointId !== undefined) {
        traversed.add(lane.chokepointId);
      }
    }
  }

  return chokepoints.filter((crossing) => traversed.has(crossing.id));
}

/**
 * The caption stating the class in view in words, in either state (rule B-3).
 *
 * With a class chosen it names the class and says what that class narrows; with no class chosen it
 * names the unfiltered state and says that every competitor the pack records is drawn. A payload
 * offering no class at all states that nothing is in view rather than claiming a filter that has
 * nothing to select.
 *
 * @param productClasses - The classes the payload offers.
 * @param classInView - The class in view, or `null` for every class the pack holds.
 * @returns The sentence the class group prints beside its controls.
 */
function classCaptionOf(
  productClasses: readonly string[],
  classInView: string | null,
): string {
  if (productClasses.length === 0) {
    return `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${COMPETITIVE_ATLAS_TEXT.nothingInView}`;
  }

  if (classInView === null) {
    return (
      `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${COMPETITIVE_ATLAS_TEXT.allClassesLabel}. ` +
      COMPETITIVE_ATLAS_TEXT.allClassesCaptionDetail
    );
  }

  return `${COMPETITIVE_ATLAS_TEXT.classCaptionPrefix} ${classInView}. ${COMPETITIVE_ATLAS_TEXT.classCaptionDetail}`;
}

/* ---------------------------------------------------------------------------------------------
 * The legend and the radar's table view — the payload read two ways, never combined
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the radar's table view: an axis and every series' score on it, keyed by series
 * identifier.
 *
 * The row holds the payload's own numbers in the payload's own order. It carries no total, no
 * average and no combined column, which is rule P-5 expressed in the table's shape rather than
 * trusted to the renderer.
 */
interface RadarTableRow {
  /** The axis' identifier, used as the row key and to look the scores up. */
  readonly axisId: string;

  /** The axis' name, as the radar prints it. */
  readonly axisLabel: string;

  /** Each series' score on this axis, keyed by series identifier; absent when a series states none. */
  readonly scores: Readonly<Record<string, number | undefined>>;
}

/**
 * One row of the network's table view: a site the drawing places, with the family it belongs to.
 *
 * Only sites are rows. The crossings the drawing marks have no coordinate member of their own — the
 * component places each at the position it states or at the midpoint of the first lane naming it — so
 * they are listed by `./chokepoint-table.tsx` instead of being repeated here with a guessed position.
 */
interface NetworkTableRow {
  /** The site's identifier, used as the row key. */
  readonly id: string;

  /** The name the drawing prints for the site. */
  readonly siteLabel: string;

  /** The network the site belongs to, as the payload names it, or the client's own wording. */
  readonly networkLabel: string;

  /** Whether the site belongs to a competitor, which decides whether the name tag is printed. */
  readonly isCompetitor: boolean;

  /**
   * The label the row's provenance column prints: the family every figure in this row belongs to.
   *
   * It is taken from the fixed §5.3 list by the family the site belongs to, never chosen here: the
   * market-intelligence member for a competitor's site, because its coordinates and its network are
   * market intelligence, and the `Simulated data` member for one of the client's own, because that
   * site is a seeded first-party record (rules P-1, P-5).
   */
  readonly provenanceLabel: SimLabel;

  /** Latitude in decimal degrees, exactly as the record states it. */
  readonly latitude: number;

  /** Longitude in decimal degrees, exactly as the record states it. */
  readonly longitude: number;
}

/**
 * The legend's entries: one per series the payload carries, in the payload's own order.
 *
 * The entry's kind is decided by the series' provenance, which is what keeps the two families apart
 * structurally: a series that states {@link COMPETITOR_PROVENANCE} becomes a `competitor` entry,
 * whose `simLabel` the type makes mandatory and whose name the legend follows with
 * `COMPETITOR_NAME_TAG`; every other provenance — the client's own `first_party` score and a
 * `computed` first-party figure alike — becomes a `client-series` entry, which carries the label its
 * own record states so the legend prints that rather than a constant chosen here (rules P-1, P-5,
 * AAP §0.8).
 *
 * The competitor's `simLabel` is the record's own and is narrowed to the market-intelligence member
 * the entry type requires by an equality check rather than an assertion: the atlas handler refuses to
 * serve a market-intelligence series carrying any other label (see `assertPackProvenance` in
 * `src/services/mock/handlers/atlas.ts`), so a served payload prints the label it states, and the
 * constant stands in only for a payload that could not have arrived.
 *
 * A competitor's slot comes from `competitorSlotOf`, the one lookup `radar-chart.tsx` and
 * `./competitor-network.tsx` resolve their own colours through, so a legend swatch, the polygon
 * beside it and the competitor's network marks follow the record's identifier rather than the order
 * this list happens to hold. A competitor whose identifier states no slot of its own takes the first
 * competitor hue: a fourth hue does not exist, and the first-party accent would present a
 * market-intelligence series as the client's own reading (rule P-5).
 *
 * @param series - The radar series the payload carries.
 * @returns The entries the legend renders, or none when the payload carries no series.
 */
function legendEntriesOf(series: readonly AtlasSeries[]): readonly LegendEntry[] {
  const entries: LegendEntry[] = [];

  for (const entry of series) {
    if (entry.provenance !== COMPETITOR_PROVENANCE) {
      entries.push({
        kind: 'client-series',
        id: entry.id,
        label: entry.label,
        simLabel: entry.simLabel,
      });
      continue;
    }

    entries.push({
      kind: 'competitor',
      id: entry.id,
      label: entry.label,
      index: competitorSlotOf(entry.competitorId) ?? 1,
      simLabel:
        entry.simLabel === MARKET_INTELLIGENCE_LABEL ? entry.simLabel : MARKET_INTELLIGENCE_LABEL,
    });
  }

  return entries;
}

/**
 * The column header for one series in the radar's table view.
 *
 * The header carries the series' own name and the label that series states, so a reader comparing
 * two columns learns, in the table alone, which family each belongs to: a competitor's column adds
 * the name tag the market pack requires beside it, and every other column prints the record's own
 * label — the client self-assessment label for the client's series, the computed label for a figure
 * the application derived (rules P-1, P-5). The record states that label, so the column never
 * relabels a series the payload described.
 *
 * @param series - The series the column reports.
 * @returns The header text.
 */
function seriesColumnHeader(series: AtlasSeries): string {
  if (series.provenance === COMPETITOR_PROVENANCE) {
    return `${series.label} (${COMPETITOR_NAME_TAG}; ${series.simLabel})`;
  }

  return `${series.label} (${series.simLabel})`;
}

/**
 * The radar's table view: one row per axis, one column per series, carrying the same scores the
 * drawing places.
 *
 * The rows are the payload read as a table, not a figure over it: no total, no average and no
 * combined column, because any of them would blend a first-party reading with a market-intelligence
 * one (rule P-5). The axis order and the series order are the payload's.
 *
 * @param axes - The radar's axes, in the order every series' values align to.
 * @param series - The series the payload carries.
 * @returns The specification the chart frame's table view renders.
 */
function radarTableOf(
  axes: readonly RadarAxis[],
  series: readonly AtlasSeries[],
): ChartTableSpec<RadarTableRow> {
  const rows: RadarTableRow[] = axes.map((axis, axisIndex) => {
    const scores: [string, number | undefined][] = series.map((entry) => [
      entry.id,
      entry.values[axisIndex],
    ]);

    return { axisId: axis.id, axisLabel: axis.label, scores: Object.fromEntries(scores) };
  });

  const columns: readonly TableColumn<RadarTableRow>[] = [
    {
      id: 'axis',
      header: COMPETITIVE_ATLAS_TEXT.columnAxis,
      render: (row) => row.axisLabel,
    },
    ...series.map((entry) => ({
      id: entry.id,
      header: seriesColumnHeader(entry),
      align: 'end' as const,
      render: (row: RadarTableRow): ReactNode => row.scores[entry.id] ?? NO_SCORE_MARKER,
    })),
  ];

  return {
    caption: COMPETITIVE_ATLAS_TEXT.radarTableCaption,
    columns,
    rows,
    getRowKey: (row) => row.axisId,
  };
}

/**
 * The rows the network's table view lists: the client's own sites and every competitor's, in the
 * payload's order and with the payload's own names.
 *
 * The families are labelled rather than merged: a competitor's row names its network and says that
 * the site is a competitor's, the renderer adds the imported name tag beside the network's name, and
 * the row carries the §5.3 label its family owns for the provenance column to print, so a reader
 * never has to infer whose site a row is or where its figures came from (rule P-5). The sites are the
 * ones the drawing beside the table places — the client's own and those of the networks in view — so
 * the table and the drawing cannot state different networks (AAP §0.12.4). Nothing is sorted,
 * counted or combined.
 *
 * @param clientSites - The client's own sites the payload carries.
 * @param networks - The competitor networks in view.
 * @returns The rows, or none when nothing in view places a site.
 */
function networkRowsOf(
  clientSites: readonly AtlasSite[],
  networks: readonly CompetitorNetworkPayload[],
): readonly NetworkTableRow[] {
  const rows: NetworkTableRow[] = clientSites.map((site) => ({
    id: site.id,
    siteLabel: site.label,
    networkLabel: COMPETITIVE_ATLAS_TEXT.clientSiteKind,
    isCompetitor: false,
    provenanceLabel: SIMULATED_DATA_LABEL,
    latitude: site.latitude,
    longitude: site.longitude,
  }));

  for (const network of networks) {
    for (const site of network.sites) {
      rows.push({
        id: site.id,
        siteLabel: site.label,
        networkLabel: network.label,
        isCompetitor: true,
        provenanceLabel: MARKET_INTELLIGENCE_LABEL,
        latitude: site.latitude,
        longitude: site.longitude,
      });
    }
  }

  return rows;
}

/**
 * The network's table view: one row per site the drawing places.
 *
 * The last column states the family every figure in the row belongs to, because the drawing beside
 * the table labels each competitor's group and the table must not leave a reader to infer the same
 * thing from the tag on the network's name: one cell for the row says which family the network, the
 * site and both coordinates came from, where a label repeated beside each figure would say it three
 * times and give a reader nothing to scan (rules P-1, P-5). The column takes the position and the
 * treatment `./chokepoint-table.tsx` gives its own provenance column, so both tables of this screen
 * report provenance the same way.
 *
 * @param clientSites - The client's own sites the payload carries.
 * @param networks - The competitor networks in view.
 * @returns The specification the chart frame's table view renders.
 */
function networkTableOf(
  clientSites: readonly AtlasSite[],
  networks: readonly CompetitorNetworkPayload[],
): ChartTableSpec<NetworkTableRow> {
  const columns: readonly TableColumn<NetworkTableRow>[] = [
    {
      id: 'network',
      header: COMPETITIVE_ATLAS_TEXT.columnNetwork,
      render: (row) =>
        row.isCompetitor ? (
          <>
            <span>{row.networkLabel}</span>{' '}
            <span className={OPTION_TAG_CLASSES}>{COMPETITOR_NAME_TAG}</span>
          </>
        ) : (
          <span>{row.networkLabel}</span>
        ),
    },
    {
      id: 'site',
      header: COMPETITIVE_ATLAS_TEXT.columnSite,
      render: (row) => row.siteLabel,
    },
    {
      id: 'latitude',
      header: COMPETITIVE_ATLAS_TEXT.columnLatitude,
      align: 'end',
      render: (row) => row.latitude,
    },
    {
      id: 'longitude',
      header: COMPETITIVE_ATLAS_TEXT.columnLongitude,
      align: 'end',
      render: (row) => row.longitude,
    },
    {
      id: 'provenance',
      header: COMPETITIVE_ATLAS_TEXT.columnProvenance,
      render: (row) => <StatusIndicator meaning="simulated" label={row.provenanceLabel} />,
    },
  ];

  return {
    caption: COMPETITIVE_ATLAS_TEXT.networkTableCaption,
    columns,
    rows: networkRowsOf(clientSites, networks),
    getRowKey: (row) => row.id,
  };
}

/**
 * Builds the resolver the chokepoint table names a competitor with, over the networks the atlas
 * serves.
 *
 * The names are record content and are not this module's to spell (rule P-7): each network's own
 * label is the pack's company name for that identifier, and the table prints it beside the `CMP-0x`
 * the crossing's buffer map keys on, so a reader of the on-screen table learns which competitor holds
 * a buffer at a crossing without opening the exported brief. A competitor the payload holds no
 * network for is answered with nothing, which leaves the table printing the identifier alone rather
 * than a name written here (rules P-6, P-7). The resolver is built over the whole pack rather than
 * over the networks in view, because a name is a record rather than a figure: the class filter
 * narrows which records are drawn, never which company an identifier belongs to. Declared at module
 * scope so its identity is stable for the table's own memoisation.
 *
 * @param competitors - The competitor networks the atlas serves, in the payload's order.
 * @returns The resolver the chokepoint table asks for a competitor's company name.
 */
function competitorNameResolverOf(
  competitors: readonly CompetitorNetworkPayload[],
): CompetitorNameResolver {
  return (competitorId) =>
    competitors.find((network) => network.competitorId === competitorId)?.label;
}

/* ---------------------------------------------------------------------------------------------
 * The source the atlas is read from
 * ------------------------------------------------------------------------------------------- */

/**
 * The one source every figure on this surface arrives from, named once so the stale notice prefers it.
 *
 * The pack's own currency is what a reader compares the competitor series and the chokepoints against,
 * so a notice that named another aged source first would describe the figure's own source second. The
 * literal is the `SourceId` member `src/types/sources.ts` declares, typed here rather than left as a
 * bare string so a renamed source fails this file's compilation.
 */
const ATLAS_SOURCE: SourceId = 'market-pack';

/* ---------------------------------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------------------------------- */

/**
 * What the shell hands the atlas: the plant and product selection the route element holds, which is
 * the whole of this screen's input. The atlas read takes no scope — `getAtlas()` declares no
 * argument, by the port's own signature — so the selection reaches the surface as the product class
 * the atlas opens on, and only where it names a class the pack offers (see
 * {@link resolveDefaultClass}); the surfaces after that narrow the payload from the reader's own
 * choice of class (AAP §0.12.4). A shell that omits the selection still gets a screen that reads
 * the atlas, states the class in view and exports the brief, but the reader then chooses the class
 * themselves.
 */
export interface CompetitiveAtlasScreenProps {
  /**
   * The shell's plant and product selection, as the route element holds it.
   *
   * The atlas read takes no scope — `getAtlas()` declares no argument, by the port's own signature —
   * so this screen passes it nowhere. It is used for the one thing it can honestly decide here: the
   * product class the atlas opens on, which follows the shell's product selection when that selection
   * names a class the pack offers (see {@link resolveDefaultClass}).
   *
   * Optional, and defaulted inside the component: the route element is declared elsewhere in the
   * shell, and a shell that renders this screen without a scope gets a screen that still reads the
   * atlas, still states the class in view and still exports the brief. A shell that holds a filtered
   * product selection should pass it, or the atlas opens with every class in view rather than on the
   * product the reader filtered to.
   */
  readonly scope?: Scope;
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * SCR-13, the competitive atlas: the pack banner, the two selectors, the radar with its legend, the
 * network view and the chokepoint table, over one read.
 *
 * One read goes through the port, keyed by its method's own name (AAP §0.6.2), so a role switch or a
 * simulation trigger that invalidates `getAtlas` re-reads this whole surface at once:
 * `getAtlas()` — the pack's banner, class list, series, axes, client sites, competitor networks and
 * shared crossings — and nothing else. The export is an action rather than a query, so it is a
 * mutation and never appears in the cache.
 *
 * Nothing here writes, so a re-render can move no record; the state the component owns is the
 * reader's own — the class in view, the entity in view and the mark the network holds as selected —
 * plus the one refusal the reader has to be told about, a brief this page could not hand over, and
 * never a copy of service data. The class in view narrows every surface the screen draws — the
 * alerts the band lists, the radar series, the competitor networks, their sites and the crossings
 * their lanes traverse — from the payload's own classification, so the selector filters the atlas
 * rather than restating it (AAP §0.12.4).
 *
 * @param props - The shell's selection. See {@link CompetitiveAtlasScreenProps}.
 * @returns The header with its export action, the pack banner, the chokepoint alert strip, the
 *   selectors, the radar with its legend, the network view and the chokepoint table, all but the
 *   banner inside the state boundary the read settled to.
 */
export function CompetitiveAtlasScreen(props: CompetitiveAtlasScreenProps): ReactElement {
  const service = useService();

  const scope = props.scope ?? NO_SCOPE;

  /*
   * The reader's own class choice. `undefined` means the reader has chosen nothing yet, so the atlas
   * follows the shell's product selection (see {@link resolveDefaultClass}); `null` means the reader
   * asked for every class the pack holds. The two stay distinct so "All product classes" stays
   * reachable under a shell that has filtered to one product (rule P-8).
   */
  const [ownClass, setOwnClass] = useState<string | null | undefined>(undefined);
  const [ownEntity, setOwnEntity] = useState<string | null>(null);
  const [selectedMarkId, setSelectedMarkId] = useState<string | null>(null);

  /*
   * What the export reports when the brief arrived but this page has no way to hand it over. The
   * mutation's own error state answers a different question — whether the brief could be prepared at
   * all — so a page that cannot offer a file says that instead of borrowing the service's failure
   * (rule P-8).
   */
  const [exportOfferFailure, setExportOfferFailure] = useState<string | null>(null);

  /*
   * Retries are off on purpose: a refusal the acting role's permissions produce fails the same way
   * however often it is repeated, and the boundary offers the reader an explicit retry for the case
   * where repeating the read can succeed.
   */
  const atlasQuery = useQuery<Result<Atlas>, unknown>({
    queryKey: ['getAtlas'],
    queryFn: () => service.getAtlas(),
    retry: false,
  });

  /*
   * The export is an action, so it is a mutation: it is performed when a reader asks for it, its
   * progress is what disables the control while a brief is being prepared, and a failure of the
   * export itself is reported from its own error state. The one outcome it cannot state — a payload
   * that arrived on a page with no object-URL factory to offer it with — is held in
   * `exportOfferFailure`, because the brief was prepared and recorded and only the hand-over failed.
   */
  const exportMutation = useMutation<Result<ExportPayload>, unknown, void>({
    mutationFn: () => service.exportChokepointBrief(),
    onSuccess: (result) => {
      if (!offerExportFile(result.data)) {
        setExportOfferFailure(COMPETITIVE_ATLAS_TEXT.downloadUnavailable);
      }
    },
  });

  const atlas = atlasQuery.data?.data;
  const productClasses = atlas?.productClasses ?? NO_CLASSES;
  const series = atlas?.radarSeries ?? NO_SERIES;
  const axes = atlas?.radarAxes ?? NO_AXES;
  const clientSites = atlas?.clientSites ?? NO_SITES;
  const competitors = atlas?.competitors ?? NO_NETWORKS;
  const chokepoints = atlas?.chokepoints ?? NO_CHOKEPOINTS;

  const defaultClass = useMemo(
    () => resolveDefaultClass(scope, productClasses),
    [scope, productClasses],
  );

  /*
   * The class in view and what it leaves drawn. Every collection below is the payload's own list
   * narrowed to the class the reader chose, in the payload's own order, so the selector filters the
   * atlas rather than restating it and no figure is derived on the way (rules P-5, P-6, AAP §0.12.4).
   */
  const classInView = ownClass === undefined ? defaultClass : ownClass;
  const networksInView = useMemo(
    () => competitorNetworksInViewOf(competitors, classInView),
    [competitors, classInView],
  );
  const seriesInView = useMemo(
    () => radarSeriesInViewOf(series, networksInView),
    [series, networksInView],
  );
  const chokepointsInView = useMemo(
    () => chokepointsInViewOf(chokepoints, networksInView, classInView),
    [chokepoints, networksInView, classInView],
  );

  /*
   * The entity in view follows the reader's own choice while that series is still drawn, and falls
   * back to the class's default otherwise, so a class that removes the chosen competitor cannot leave
   * a caption naming a series the radar no longer draws.
   */
  const defaultEntity = useMemo(() => resolveDefaultEntity(seriesInView), [seriesInView]);
  const entityInView =
    ownEntity !== null && seriesInView.some((entry) => entry.id === ownEntity)
      ? ownEntity
      : defaultEntity;

  /*
   * The network family the entity in view belongs to: the client's own network (`null`) when the
   * series in view is the first-party one, that competitor's identifier when it is a competitor's, and
   * no highlight at all when the payload leaves no series in view. It is the join
   * `AtlasSeries.competitorId` states, so both drawings mark one identity rather than two guesses.
   */
  const entitySeries = seriesInView.find((entry) => entry.id === entityInView);
  const highlightedCompetitorId = entitySeries?.competitorId;

  const radarTable = useMemo(() => radarTableOf(axes, seriesInView), [axes, seriesInView]);
  const networkTable = useMemo(
    () => (atlas === undefined ? null : networkTableOf(clientSites, networksInView)),
    [atlas, clientSites, networksInView],
  );
  const legendEntries = useMemo(() => legendEntriesOf(seriesInView), [seriesInView]);
  /*
   * The company names the chokepoint table prints beside each competitor identifier, resolved from
   * the pack's own networks: a name is a record rather than a figure, so it is read from the payload
   * once and never typed into a component (rules P-6, P-7).
   */
  const competitorNameOf = useMemo(() => competitorNameResolverOf(competitors), [competitors]);

  const freshness = atlasQuery.data?.meta.freshness;

  /*
   * Whether the read holds anything to compare, decided from the pack rather than from the class in
   * view on purpose: the selector sits inside the state boundary below, and the empty state replaces
   * the boundary's content, so a class that left nothing to draw would take away the "All product
   * classes" control a reader needs to return to the whole pack (rule P-8).
   */
  const hasContent = series.length > 0 && chokepoints.length > 0;

  /*
   * The read's own facts, plus this screen's reading of the pack: the figures all arrive from the
   * market pack, so the stale notice names it first, and the surface has something to draw only once
   * both the competitor series and the chokepoints have arrived.
   */
  const state = deriveScreenState({
    isPending: atlasQuery.isPending,
    error: atlasQuery.error,
    freshness,
    staleSourcePreference: ATLAS_SOURCE,
    hasContent,
  });
  const staleRecord = freshness === undefined ? undefined : staleSourceOf(freshness, ATLAS_SOURCE);
  const forbiddenRecord = forbiddenOf(atlasQuery.error);

  /** Asks the port for the atlas again, which is what the boundary's retry control does. */
  function retryRead(): void {
    void atlasQuery.refetch();
  }

  /** Takes a class a reader chose, which narrows every surface the atlas draws to that class. */
  function selectClass(productClassId: string): void {
    setOwnClass(productClassId);
  }

  /** Puts every class the pack holds back in view, which is the class group's first control. */
  function selectAllClasses(): void {
    setOwnClass(null);
  }

  /** Takes the series a reader chose in the selector, which is the entity the atlas reports on. */
  function selectEntity(seriesId: string): void {
    setOwnEntity(seriesId);
  }

  /** Takes a mark the network reported, so its ring and its `aria-current` follow the reader. */
  function selectMark(entityId: string): void {
    setSelectedMarkId(entityId);
  }

  /** Asks the port for the chokepoint brief and offers it as a download. */
  function requestExport(): void {
    /* A new attempt replaces what the previous one reported, so a refusal never stands beside a brief
       that is being prepared again. */
    setExportOfferFailure(null);
    exportMutation.mutate();
  }

  const exportReason = exportReasonFor({
    readPending: atlasQuery.isPending,
    readFailed: atlasQuery.isError,
    hasAtlas: atlas !== undefined,
    exportPending: exportMutation.isPending,
  });

  const exportAction = (
    <ActionButton
      variant="primary"
      {...(exportReason === null
        ? { onClick: requestExport }
        : { disabled: true, disabledReason: exportReason })}
    >
      {COMPETITIVE_ATLAS_TEXT.exportAction}
    </ActionButton>
  );

  const exportError = exportMutation.error;
  const exportFailure =
    exportError === null || exportError === undefined
      ? null
      : isProblem(exportError)
        ? exportError.message
        : COMPETITIVE_ATLAS_TEXT.exportFailedUntyped;

  /* The export's own failure first — no brief was prepared — then this page's refusal to hand a
     prepared one over, so one region answers the reader either way (rule P-8). */
  const exportNotice = exportFailure ?? exportOfferFailure;

  const entityLabel = labelOfEntity(seriesInView, entityInView);
  const entityInViewLabel = entityLabel ?? COMPETITIVE_ATLAS_TEXT.nothingInView;
  const classCaption = classCaptionOf(productClasses, classInView);
  /*
   * What the alert band says it carries. While a class is in view the band lists only the crossings
   * that class leaves, so the description adds the sentence saying so rather than claiming the whole
   * pack is listed (AAP §0.12.4).
   */
  const chokepointAlertDescription =
    classInView === null
      ? COMPETITIVE_ATLAS_TEXT.chokepointAlertDescription
      : `${COMPETITIVE_ATLAS_TEXT.chokepointAlertDescription} ${COMPETITIVE_ATLAS_TEXT.chokepointAlertNarrowed}`;

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader
        title={COMPETITIVE_ATLAS_TEXT.title}
        eyebrow={COMPETITIVE_ATLAS_TEXT.eyebrow}
        description={COMPETITIVE_ATLAS_TEXT.description}
        actions={exportAction}
      />

      {/* The banner names the pack in every state, so it sits outside the boundary the read settles
          to and renders before the content the read supplies (AAP §0.12.4 SCR-13). */}
      <div
        role="note"
        aria-label={COMPETITIVE_ATLAS_TEXT.bannerRegionLabel}
        className={BANNER_CLASSES}
      >
        {ATLAS_PACK_BANNER}
      </div>

      {exportNotice === null ? null : (
        <p role="status" className={NOTICE_CLASSES}>
          {exportNotice}
        </p>
      )}

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryRead}
        emptyMessage={COMPETITIVE_ATLAS_TEXT.empty}
        partialMessage={COMPETITIVE_ATLAS_TEXT.partial}
        conflictMessage={COMPETITIVE_ATLAS_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {atlas === undefined || networkTable === null ? null : (
          <>
            {/* The alert strip leads the atlas content: AAP 0.14.1's S3 row and AAP 0.7's S3 stage row
                place it in this stage, and a reader meets the crossings the pack records before the
                figures drawn over them. It lists the crossings a lane of an in-view network traverses,
                like every other drawn surface, so one class in view governs the whole screen. It is
                presentational and holds no control (rule P-8). */}
            <ChokepointAlertStrip
              chokepoints={chokepointsInView}
              title={COMPETITIVE_ATLAS_TEXT.chokepointAlertCardTitle}
              description={chokepointAlertDescription}
              emptyMessage={COMPETITIVE_ATLAS_TEXT.chokepointAlertEmpty}
            />

            <Card title={COMPETITIVE_ATLAS_TEXT.selectorTitle}>
              <div className={SELECTOR_ROW_CLASSES}>
                <div
                  role="group"
                  aria-label={COMPETITIVE_ATLAS_TEXT.classGroupLabel}
                  className={SELECTOR_GROUP_CLASSES}
                >
                  {/* The unfiltered state leads, so a class a reader chose can always be undone and
                      the whole pack drawn again (rule P-8). It is offered only when the payload
                      names a class to filter by. */}
                  {productClasses.length === 0 ? null : (
                    <Button
                      aria-pressed={classInView === null}
                      className={classInView === null ? CHOSEN_CHIP_CLASSES : RESTING_CHIP_CLASSES}
                      onClick={selectAllClasses}
                    >
                      {COMPETITIVE_ATLAS_TEXT.allClassesLabel}
                    </Button>
                  )}
                  {productClasses.map((productClassId) => (
                    <Button
                      key={productClassId}
                      aria-pressed={productClassId === classInView}
                      className={
                        productClassId === classInView ? CHOSEN_CHIP_CLASSES : RESTING_CHIP_CLASSES
                      }
                      onClick={() => {
                        selectClass(productClassId);
                      }}
                    >
                      <span className={IDENTIFIER_CLASSES}>{productClassId}</span>
                    </Button>
                  ))}
                  {/* The class in view, in words: each chip states its own chosen state through
                      `aria-pressed`, and the caption states the choice again in words, so it never
                      rests on colour alone (rule B-3). The caption changes without a page load, so
                      this status region announces the class the reader chose (WCAG 2.2 SC 4.1.3). */}
                  <span role="status" className={SELECTION_CAPTION_CLASSES}>
                    {classCaption}
                  </span>
                </div>

                <div
                  role="group"
                  aria-label={COMPETITIVE_ATLAS_TEXT.entityGroupLabel}
                  className={SELECTOR_GROUP_CLASSES}
                >
                  {seriesInView.map((entry) => (
                    <Button
                      key={entry.id}
                      aria-pressed={entry.id === entityInView}
                      className={
                        entry.id === entityInView ? CHOSEN_CHIP_CLASSES : RESTING_CHIP_CLASSES
                      }
                      onClick={() => {
                        selectEntity(entry.id);
                      }}
                    >
                      <span>{entry.label}</span>{' '}
                      {/* The tag states the family the record belongs to: the competitor name tag
                          for a market-intelligence series, and the label the record states for every
                          other one, so a computed first-party series is not tagged as a competitor's
                          (rule P-5). */}
                      <span className={CONTROL_TAG_CLASSES}>
                        {entry.provenance === COMPETITOR_PROVENANCE
                          ? COMPETITOR_NAME_TAG
                          : entry.simLabel}
                      </span>
                    </Button>
                  ))}
                  {/* The entity in view, in words rather than colour, and announced when the reader
                      changes it without a page load (rule B-3, WCAG 2.2 SC 4.1.3). Each chip carries
                      `aria-pressed` for the same reason the class chips do. */}
                  <span role="status" className={SELECTION_CAPTION_CLASSES}>
                    {`${COMPETITIVE_ATLAS_TEXT.entityCaptionPrefix} ${entityInViewLabel}`}
                  </span>
                </div>
              </div>
            </Card>

            <Card title={COMPETITIVE_ATLAS_TEXT.radarCardTitle}>
              <ChartFrame<RadarTableRow>
                provenance="market_intelligence"
                title={COMPETITIVE_ATLAS_TEXT.radarFigureTitle}
                description={COMPETITIVE_ATLAS_TEXT.radarFigureDescription}
                tableRows={radarTable}
              >
                <RadarChart
                  axes={axes}
                  series={seriesInView}
                  selectedSeriesId={entityInView}
                  evidenceRefFor={radarVertexReference}
                />
              </ChartFrame>
              {/* The radar draws no legend of its own, so the series in view are described beside
                  it from the same payload data (rule P-5). */}
              <Legend entries={legendEntries} />
            </Card>

            <Card title={COMPETITIVE_ATLAS_TEXT.networkCardTitle}>
              <ChartFrame<NetworkTableRow>
                provenance="market_intelligence"
                title={COMPETITIVE_ATLAS_TEXT.networkFigureTitle}
                description={COMPETITIVE_ATLAS_TEXT.networkFigureDescription}
                tableRows={networkTable}
              >
                <CompetitorNetwork
                  networks={networksInView}
                  clientSites={clientSites}
                  lanes={NO_CLIENT_LANES}
                  chokepoints={chokepointsInView}
                  selectedEntityId={selectedMarkId}
                  onSelectEntity={selectMark}
                  evidenceRefFor={networkMarkReference}
                  highlightedCompetitorId={highlightedCompetitorId}
                />
              </ChartFrame>
            </Card>

            <Card title={COMPETITIVE_ATLAS_TEXT.chokepointCardTitle}>
              <ChokepointTable
                chokepoints={chokepointsInView}
                caption={COMPETITIVE_ATLAS_TEXT.chokepointTableCaption}
                competitorNameOf={competitorNameOf}
              />
            </Card>
          </>
        )}
      </StateBoundary>
    </div>
  );
}

/**
 * Why the export cannot act, or `null` when it can.
 *
 * Rule P-8 gives a disabled control a sentence saying why, so each case the control can be
 * unavailable in has its own: the atlas is still being read, the atlas could not be read or never
 * arrived, and a brief is already being prepared. A reason is never invented for a case that cannot
 * occur — an enabled control carries none.
 *
 * @param facts - What the read and the mutation settled to.
 * @returns The sentence to explain a disabled export, or `null` when the control can act.
 */
function exportReasonFor(facts: {
  readonly readPending: boolean;
  readonly readFailed: boolean;
  readonly hasAtlas: boolean;
  readonly exportPending: boolean;
}): string | null {
  if (facts.exportPending) {
    return COMPETITIVE_ATLAS_TEXT.exportRunning;
  }

  if (facts.readPending) {
    return COMPETITIVE_ATLAS_TEXT.exportWaiting;
  }

  if (facts.readFailed || !facts.hasAtlas) {
    return COMPETITIVE_ATLAS_TEXT.exportUnavailable;
  }

  return null;
}

/**
 * The evidence reference one radar vertex opens: the series the vertex belongs to and the axis it sits
 * on, written `<series id>#<axis id>`.
 *
 * Every vertex is a payload record's own score — the series' value at the position its axis holds — so
 * every vertex opens the reading behind it (AAP §0.2.1 F12, §0.12.4). The reference is the form the
 * service's `getEvidence` read answers for a radar reading: the series identifier before the separator
 * and the axis identifier after it, each one the payload's own, and each refused when the simulated
 * pack holds no such record. The mapper composes the two identifiers it is handed and nothing else, so
 * it states no figure, spells no identifier and reaches no record of its own (rules P-2, P-6).
 * Declared at module scope so its identity is stable across renders.
 *
 * @param seriesId - The identifier of the series the vertex belongs to, as the payload states it.
 * @param axisId - The identifier of the axis the vertex sits on, as the payload states it.
 * @returns The reference the drawer opens the reading with.
 */
function radarVertexReference(seriesId: string, axisId: string): string {
  return `${seriesId}#${axisId}`;
}

/**
 * The evidence reference one mark of the network drawing opens: the identifier the mark was drawn from.
 *
 * The drawing reports only identifiers it received from the payload — a competitor's site, one of the
 * client's own plants, or a shared crossing — so the reference is that identifier unchanged, and the
 * service's `getEvidence` read resolves each of those families by it (AAP §0.2.1 F12, §0.12.4). Every
 * site mark and every crossing halo therefore opens its own record, and no mark becomes a control with
 * nothing behind it (rule P-8). Declared at module scope so its identity is stable across renders.
 *
 * @param entityId - The identifier of the site or crossing the mark was drawn from.
 * @returns The reference the drawer opens that record with.
 */
function networkMarkReference(entityId: string): string {
  return entityId;
}
