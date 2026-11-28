/**
 * SCR-12 FileMap canvas, the stage S2 surface on which a planner reads the whole client network
 * through two lenses that share one selection, and reaches the exception the selection resolves to.
 *
 * Implements AAP §0.12.4's SCR-12 row in full — "Ribbon of six computed tiles; canvas at 65% width
 * with the map lens … and the graph lens …; right stack with the four most urgent exceptions and a
 * health card per product; bottom dock with projected stock for the selected exception and the five
 * latest audit events; wall mode hides the navigation; 'View as table' on both lenses. Primary
 * action 'Investigate selected exception'." It also implements AAP §0.15.1's row for this path, AAP
 * §0.14.1's placement of SCR-12 in S2, and AAP §0.6.2's boundary: the screen reaches records only
 * through the port, and never a seed record, an adapter or a domain module.
 *
 * WHAT LISTENS AND WHAT DECIDES. The screen is the listener of exactly one route and the composer of
 * four siblings: `CanvasRibbon` (the six labelled tiles), `MapLens` and `GraphLens` (the two views
 * of one topology), `CanvasRightStack` (the urgent exceptions and the product cards) and
 * `TimelineDock` (the projection and the five latest events). Each of those is presentational and
 * takes its values as props, so this file owns the scope, the reads, the selection, the lens and wall
 * mode, and nothing else. Both lenses are handed the same `selectedNodeId`, which is what makes a
 * selection made in one lens a selection in the other (AAP §0.12.4).
 *
 * NOTHING HERE IS COMPUTED — rules P-6 and P-2. Every figure on this surface arrives from a port
 * member: the ribbon's six tiles from `getCanvasRibbon`, each exception's revenue at risk and the
 * urgency order from `listExceptions` asked with its own list parameters — the four-row window the
 * stack shows, and then, only for a selected plant that window does not answer for, that plant's own
 * rows — the baseline projection and the selected exception's title from `getExceptionDetail`, the
 * option the dock plots over that baseline from `getScenarioSet`, the events from `listAuditEvents`.
 * This module sorts nothing, slices nothing, sums nothing, rounds nothing, formats nothing and reads
 * no clock; the two windows it asks for (four urgent rows, five events) are handed to the service so
 * the service's own ordering and limit apply rather than a screen-side truncation, and the plant read
 * states no window at all for the reason its own declaration gives. The one selection it derives is
 * derived from service data, never from a typed identifier, because a node identifier written here
 * would be a record value the file invents (rule P-6).
 *
 * THE SEVEN STATES COME FROM THE READS, NEVER FROM A FLAG — AAP §0.8, §0.12.1. The body is wrapped in
 * `StateBoundary`, and `deriveScreenState` below reads only what the query set settled to: a
 * `'permission'` refusal is the forbidden card with the permission, the roles that may act and the
 * trace identifier the service supplied; a `'validation'` refusal is the conflict notice; any other
 * rejection is offline with a retry that re-runs the reads; a pending read is the loading state; the
 * freshness report the adapter attaches to every `Result.meta` raises the stale banner (naming the
 * source and its as-of instant) or the partial notice above content that still renders; and a scope
 * with no node and no open exception is the empty state. That derivation is still read from the three
 * loads the surface needs and from the trail, and the canvas's two accessory reads stay out of it: the
 * plant read that covers a selection the four-row window misses, and the selected exception's detail,
 * each stating its own pending and failed condition inside the dock's own slot through this same
 * boundary with the caller's own sentence, so an accessory failure is stated where it bites instead of
 * replacing the lenses, the ribbon and the stack that still work (rule P-8). No member of
 * `SimulationFlag` is named here, so the single popover reaches this screen by changing what the
 * adapter answers rather than by a branch in the view.
 *
 * THE ATLAS IS AN OVERLAY, NOT A DEPENDENCY — rules P-4 and P-5. `getAtlas` is refused for the
 * external supplier engineer, so its refusal degrades the map lens to the first-party network and
 * never the screen. The payload is forwarded to the map lens unchanged and is read for nothing else
 * here: this file authors no competitor string, prints no competitor figure beside a first-party one
 * and combines no two series, so the market intelligence the overlay draws stays labelled by the
 * component that draws it. The one thing this file owes a degraded overlay is its reason: the refusal's
 * own `Problem.type` chooses {@link FILEMAP_CANVAS_TEXT.atlasRefused} or
 * {@link FILEMAP_CANVAS_TEXT.atlasUnavailable}, which the lens paints in its own caption, so a reader
 * can tell a scope that holds no pack from a read that was refused or never answered.
 *
 * CONTROLS — rule P-8. The lens switch, the wall-mode toggle, the graph lens's scenario preview switch
 * and the primary action are all live: the switch changes the lens, the toggle changes the mode and
 * reports it to the shell, the preview switch arms the one response option the screen offers from the
 * selected exception's own set while the caption beside it names that option, and the primary action
 * navigates to `/exceptions/<identifier>` for the exception the selection resolves to through the
 * service. The primary action is on screen whatever the selection is: while an exception does resolve
 * it investigates that exception, and while the selection is not a plant node it is rendered disabled
 * carrying {@link FILEMAP_CANVAS_TEXT.primaryActionUnavailable}, the sentence that names the node to
 * select and the reason a plant is the node that can be investigated — so a reader who selected a
 * supplier, a material, an origin or a customer is told what to do rather than left without the
 * control (rule P-8). A selected plant whose exceptions the four-row window does not reach puts the
 * action in three further states, and each states its own fact rather than repeating that advice:
 * while the read that covers that plant is in flight the reason is
 * {@link FILEMAP_CANVAS_TEXT.primaryActionReading}, and when that read did not answer it is
 * {@link FILEMAP_CANVAS_TEXT.primaryActionUnread}, because the action does have an exception to
 * investigate and cannot reach it yet; when that read answered with no open row at all the reason is
 * {@link FILEMAP_CANVAS_TEXT.primaryActionNoOpenException}, because the plant is the node the reader
 * was told to select and the absence it answered with is why the action has nothing to investigate.
 * An exception whose set offers no option leaves the preview switch visibly disabled carrying the
 * drawing's own reason, which this file neither restates nor replaces. The only fixed disabled string
 * in this area — `Arrives in stage S4` on **Open part** — belongs to the graph lens and is untouched
 * here.
 * "View as table" on both lenses is the same story: each lens composes `ChartFrame`, which owns the
 * toggle and the table view, so this file adds no second toggle and no chart of its own.
 *
 * WALL MODE. The toggle reports the request through `onWallModeChange` so the shell can hide the
 * navigation it owns, and this screen applies the mode to what it does own: the canvas takes the whole
 * row and the right stack stands down, which is what gives the drawing a display to itself. Leaving
 * the mode restores both, so the control performs its visible function with or without a shell
 * handler (rule P-8).
 *
 * REPORTED GAPS, each recorded where it bites rather than worked around:
 * 1. `ActionButton` (`src/components/tooltip.tsx`) forwards `aria-disabled`, `onClick` and
 *    `className` and no other attribute, so the active lens cannot be marked with `aria-pressed`
 *    without editing the shared component layer, which this file may not do. The active lens is
 *    therefore stated in visible text beside the switch (never by colour alone, rule B-3) and the
 *    shortfall is recorded here.
 * 2. The port declares no product-health read and no product-name read: `src/types` carries no
 *    product record and the canvas reads are `getTopology`, `getCanvasRibbon`, `listExceptions` and
 *    `getExceptionDetail`. The product cards are therefore built from the product identifiers the
 *    urgent exception rows carry, each named by that identifier (the record's own spelling rather
 *    than an invented name) and each showing the revenue at risk the first row that reaches it states
 *    — that exception's own amount, captioned with the exception named, because the port supplies no
 *    per-product aggregate and summing the rows here would compute a figure in the screen (rule P-6).
 * 3. `RibbonTile` carries `id`, `value` and `provenance` and no caption and no evidence reference, so
 *    both arrive from `RIBBON_PRESENTATION` below — the captions this screen owns for the six
 *    aggregate keys, and a composed `canvas:<key>` reference carrying the shell selection the tiles
 *    were read under. The evidence read answers that family from the same aggregate over the same
 *    resolved scope, so a ribbon figure opens its four sections and states the number the tile drew
 *    (AAP 0.2.1 F12, principle PR-6). The alternative — no reference — cannot compile, because
 *    `MetricTile` requires one.
 * 4. Both lenses open a node's evidence through `evidenceRefForNode` below, which returns the node's own
 *    identifier: a topology node's id *is* the record's id, and the evidence read resolves the four
 *    node families the lens draws — plant, supplier, tier-2 origin and customer — so activating a node
 *    opens the record behind it (AAP 0.2.1 F12), and it composes no reference of its own (rule P-6).
 *    Declared at module scope so its identity is stable across renders and the drawing is not rebuilt
 *    on every pass.
 * 5. `TimelineDock` builds its own chart-table specification from the series it draws and takes those
 *    series, their references and their labels and the events, so no table specification is supplied
 *    from here; the frame-level label it paints is read off the labels of the two series themselves.
 * 6. The shell that mounts this screen must hand it the scope it holds, and take the selection and the
 *    wall-mode request back: a screen may not read the shell's stores (AAP §0.18.1), so with no
 *    `scope` prop the reads run on `Scope`'s empty "all plants and all products" selection. The
 *    obligation is stated on {@link FilemapCanvasScreenProps} rather than assumed here.
 *
 * Rules this module is built to satisfy: B-1 (no address, no request, no remote image), B-2 (no
 * credential, no configuration read), B-3 (regions named, controls keyboard operable with the shared
 * 24x24 px target and focus ring, the active lens stated in text, no motion), P-1 (every computed
 * figure carries the imported `Simulated calculation` label and no badge is rendered here), P-2
 * (`useService()` is the only data path), P-4 (the dock shows audit events as records and claims
 * nothing about resistance), P-5 (no competitor figure is printed or combined here), P-6 (no figure,
 * identifier, arithmetic or format), P-7 (the `FileMap canvas` name, and every place and party name
 * from the payload), and P-8 (every control acts or does not render).
 */
import { skipToken, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { create } from 'zustand';
import type { StoreApi, UseBoundStore } from 'zustand';

import { PageHeader } from '../../components/page-header';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  staleSourceOf,
} from '../../components/screen-state';
import { StateBoundary } from '../../components/state-boundary';
import { TIMELINE_DOCK_AUDIT_EVENTS, TimelineDock } from '../../components/timeline-dock';
import { ActionButton } from '../../components/tooltip';
import { useService } from '../../services/service-provider';
/*
 * SCR-03's route is `EXCEPTION_QUEUE_PATH` plus the record's own identifier. The base has one
 * declaration, in `src/types/routes.ts` (AAP 0.12.4), shared with the shell and every screen that
 * navigates to the queue.
 */
import { APPROVAL_GATE_SOURCE, EXCEPTION_QUEUE_PATH, SIM_LABELS } from '../../types';
import type {
  Atlas,
  AuditEvent,
  ExceptionDetail,
  ExceptionId,
  ExceptionQuery,
  ExceptionRow,
  PlantId,
  Result,
  RibbonTile,
  ScenarioSet,
  Scope,
  SimLabel,
  Topology,
  TopologyNode,
} from '../../types';
import { CanvasRibbon } from './canvas-ribbon';
import type { CanvasRibbonProps } from './canvas-ribbon';
import { CanvasRightStack } from './canvas-right-stack';
import type { ProductHealthRow } from './canvas-right-stack';
import { GraphLens } from './graph-lens';
import { MapLens } from './map-lens';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * Every caption, label and sentence this screen states.
 *
 * Held in one object so the wording has a single owner: the component renders these strings and a
 * suite names them through this object instead of retyping them. The title, the primary action and
 * the region names are this screen's own; the six tile captions name the aggregate keys the ribbon
 * payload reports, because `RibbonTile` carries no caption; the product figure's caption is composed
 * with the exception whose amount sits beside it. None of them types a figure, an amount, a date or a
 * record identifier (rule P-6) — the composed caption takes its identifier from the record at call
 * time — and none states a property of a deployment or a capability the demonstration does not
 * implement (rule P-4). The seven §5.3 simulation labels are never retyped here: they are read from
 * `SIM_LABELS`.
 */
export const FILEMAP_CANVAS_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The screen's title, in the one level-one heading it renders (conflict K1 names the workspace). */
  title: 'FileMap canvas',

  /** The one-line account of what the two lenses and the dock below have in common. */
  description:
    'The client network on one surface: both lenses share one selection, the stack holds what needs a response, and the dock reads the exception that selection reaches.',

  /** The one action this screen exists to take, once a selection resolves to an exception. */
  primaryAction: 'Investigate selected exception',

  /**
   * Why the primary action cannot act on a selection that is not a plant node, and what to select
   * instead.
   *
   * Rule P-8 requires a control that cannot act to say so in words rather than to vanish, and the
   * reason is a fact about the records: an exception row names the plant the disruption lands on
   * (`ExceptionRow.plantId`) and no supplier, material, origin or customer, so a plant is the one node
   * kind a selection can be investigated from. The sentence therefore names the node to select instead
   * of restating the absence. That advice holds only for a selection that is not a plant, because a
   * selection that already is one has followed it: a plant states its own reason through
   * {@link FILEMAP_CANVAS_TEXT.primaryActionNoOpenException},
   * {@link FILEMAP_CANVAS_TEXT.primaryActionReading} and
   * {@link FILEMAP_CANVAS_TEXT.primaryActionUnread}. It types no identifier, no figure and no record
   * name (rule P-6), and it claims nothing about a capability the demonstration does not implement
   * (rule P-4).
   */
  primaryActionUnavailable:
    'Select a plant node on the canvas: an exception names the plant the disruption lands on, so a plant is the node this action can investigate.',

  /**
   * Why the primary action cannot act on the plant that is selected, when that plant answers no open
   * exception.
   *
   * The selection is a plant, so the advice
   * {@link FILEMAP_CANVAS_TEXT.primaryActionUnavailable} gives has already been followed, and the read
   * narrowed to that plant has answered rather than failed: no open row lands on it, which is the same
   * fact the dock states through {@link FILEMAP_CANVAS_TEXT.dockEmpty}. The sentence therefore states
   * that absence instead of repeating the not-a-plant advice, so the reader is told why this action has
   * nothing to investigate (rule P-8). It types no identifier, no figure and no record name (rule P-6),
   * and it claims nothing about a capability the demonstration does not implement (rule P-4).
   */
  primaryActionNoOpenException:
    'The plant selected on the canvas answers no open exception, so this action has nothing to investigate.',

  /**
   * Why the primary action cannot act yet, while the read that covers the selected plant is in flight.
   *
   * The four-row window resolves most selections the moment the canvas draws, and a plant it does not
   * answer for is covered by one read narrowed to that plant. Rule P-8 asks the control to state what
   * it is waiting for rather than to claim the selection answers no exception: an exception does exist
   * for this plant, so the sentence names the read that is answering and says what the action will
   * investigate once it has. It types no identifier, no figure and no record name (rule P-6).
   */
  primaryActionReading:
    'Reading the exceptions this plant answers: the action investigates the one that comes first as soon as the read answers.',

  /**
   * Why the primary action cannot act when the read that covers the selected plant did not answer.
   *
   * A failed read is not an absence of exceptions, so the reason states what happened to the read
   * instead of repeating {@link FILEMAP_CANVAS_TEXT.primaryActionUnavailable}'s advice, which the
   * reader has already followed by selecting the plant. It describes the cause the screen observed and
   * claims nothing about why the read failed (rule P-4), and it types no identifier and no figure
   * (rule P-6).
   */
  primaryActionUnread:
    'The read of the exceptions recorded at the selected plant did not answer, so this action has nothing to investigate.',

  /** The accessible name of the group holding the two lens controls. */
  lensGroupLabel: 'Canvas lens',

  /** The map lens control's label, and the word the caption uses for the lens in view. */
  mapLens: 'Map lens',

  /** The graph lens control's label, and the word the caption uses for the lens in view. */
  graphLens: 'Graph lens',

  /** Introduces the caption that states which lens is being drawn, in words rather than colour. */
  lensCaptionPrefix: 'Lens in view:',

  /**
   * Introduces the caption that names the response option the graph lens's preview switch is showing.
   *
   * The switch arms on the option the screen offers and reports the request back, so the caption says
   * which option is in view in words — the switch's own label carries the option's identifier and no
   * name, and the name is the record's. The name that follows is composed from the scenario record at
   * render time, so no figure, identifier or option name is typed here (rule P-6).
   */
  previewCaptionPrefix: 'Scenario in preview:',

  /** The wall-mode control's label while wall mode is off: activating it enters the mode. */
  wallModeEnter: 'Enter wall mode',

  /** The wall-mode control's label while wall mode is on: activating it leaves the mode. */
  wallModeExit: 'Exit wall mode',

  /** The accessible name of the region the active lens is drawn in. */
  canvasRegionLabel: 'Canvas',

  /** The accessible name of the region holding the urgent exceptions and the product cards. */
  stackRegionLabel: 'Urgent exceptions and product health',

  /**
   * What stands where the dock would be when the selection reaches no exception.
   *
   * The sentence asserts an absence, so it prints only once both sources agree on it: the four-row
   * window answered the selection with nothing AND the read narrowed to the selected plant answered
   * with nothing. A failed plant read is not agreement — it is no answer at all — and states itself
   * through {@link FILEMAP_CANVAS_TEXT.selectionUnread} instead.
   */
  dockEmpty: 'No open exception in this selection is answered by the node selected on the canvas.',

  /**
   * What the dock states when the read that covers the selected plant did not answer.
   *
   * The four-row window missed this plant, so the dock's only source for it is the read narrowed to
   * that plant, and that read failed. The dock therefore has no exception to project and no evidence
   * that none exists, which is why it prints this instead of {@link FILEMAP_CANVAS_TEXT.dockEmpty}:
   * the absence is unproven, and a sentence asserting one would be false for a plant whose exception
   * the failed read would have returned (rule P-8). The boundary renders it beside the retry that
   * repeats that one read, so the reader can recover without reloading the canvas. It types no
   * identifier, figure or record name (rule P-6).
   */
  selectionUnread:
    'The read of the exceptions recorded at the selected plant did not answer, so the canvas has no exception to project for it.',

  /**
   * What the dock states when the selected exception's detail read did not answer.
   *
   * The detail is the dock's other accessory read: the projection it draws and the title it prints
   * both come from it, and the exception itself did resolve, so the dock states the read that failed
   * rather than disappearing with no sentence at all — the same treatment the trail, the overlay and
   * the option set receive when their own reads fail (rule P-8, applied consistently). The sentence
   * names no identifier and no figure (rule P-6) and claims nothing about why the read failed
   * (rule P-4); the boundary renders it beside the retry that repeats that one read.
   */
  dockDetailUnavailable:
    'The exception detail read did not answer, so the dock has nothing to plot for the selected exception.',

  /** The caption of the first tile: the count of open exceptions in scope. */
  tileOpenExceptions: 'Open exceptions',

  /** The caption of the second tile: the count of exceptions at the head of the urgency order. */
  tileCriticalExceptions: 'Critical exceptions',

  /** The caption of the third tile: the revenue the open exceptions place at risk. */
  tileRevenueAtRisk: 'Revenue at risk',

  /** The caption of the fourth tile: the count of customer orders the exceptions reach. */
  tileCustomerOrdersAtRisk: 'Customer orders at risk',

  /** The caption of the fifth tile: the median hours from detection to an approved plan. */
  tileMedianHours: 'Median hours to approved plan',

  /** The caption of the sixth tile: how many plants the current selection covers. */
  tilePlantsInScope: 'Plants in scope',

  /**
   * The caption above the one computed amount a product card shows, composed with the exception that
   * states the amount.
   *
   * The amount beside it is that exception row's own revenue at risk, not a total for the product: the
   * port declares no per-product aggregate and summing the rows here would compute a figure in the
   * screen, which rule P-6 forbids. The caption therefore names the
   * record the amount belongs to — the precedent `GRAPH_LENS_TEXT.descriptionTracing` sets for a
   * sentence composed from a record's own value — so one record's amount is never presented under
   * another subject's caption. Nothing is typed into the sentence: the identifier arrives from the
   * row at call time.
   *
   * @param exceptionId - The identifier of the exception whose amount the figure shows.
   * @returns The caption the figure carries.
   */
  productRevenueAtRiskOn: (exceptionId: string): string =>
    `Revenue at risk on exception ${exceptionId}`,

  /** What the boundary says when the selection holds no node and no open exception. */
  empty: 'No node and no open exception fall in the current selection, so there is nothing to draw.',

  /** What the boundary says when a source behind the canvas answered incompletely. */
  partial:
    'A source behind these figures answered incompletely, so the canvas covers the records it supplied.',

  /** What the boundary says when the records moved under the reader. */
  conflict: 'These records changed while they were being read, so the canvas was not updated. Read it again.',

  /**
   * What the dock's events half says when the acting role may not read the audit trail.
   *
   * The trail is the dock's accessory read rather than a precondition of the canvas, so a refused trail
   * states itself here instead of replacing the surface the reader came for. The four personas this
   * screen is the entry route of hold `audit.read`, because AAP §0.12.4's SCR-12 row gives the dock the
   * five latest audit events with no caveat about the role reading them, so this sentence is what the
   * roles the matrix withholds the permission from — the plant manager and the external supplier
   * engineer — read: it names the permission's absence and invents no record.
   */
  auditUnavailable:
    'The acting role may not read the audit trail, so no event is shown here.',

  /**
   * What the map lens's caption says when the atlas read is refused for the acting role.
   *
   * The atlas is the stage S3 overlay the map lens draws over the first-party network, and the
   * service refuses it for a role that may not read the market intelligence, so the refusal degrades
   * the drawing without failing the screen. A reader who sees the overlay missing is owed the reason:
   * silence would leave "no pack" and "refused" indistinguishable, which is exactly what the caption —
   * the lens region's own line of words — exists to tell apart. The sentence names no competitor, no
   * figure and no record (rules P-5, P-6), because this screen authors no market-intelligence content.
   */
  atlasRefused:
    'The overlay is not drawn: the atlas read is refused for the acting role, so this lens shows the first-party network alone.',

  /**
   * What the map lens's caption says when the atlas read failed for a reason other than permission.
   *
   * A failure is not a permission, so the second sentence never describes one as the other: an
   * unreachable or refusing source degrades the same overlay while the reader is told that the read
   * did not answer rather than that the role may not read it (rule P-4's prohibition on stating a
   * property the demonstration does not establish, applied to a cause it did not observe).
   */
  atlasUnavailable:
    'The overlay is not drawn: the atlas read did not answer, so this lens shows the first-party network alone.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The fixed strings, the windows and the references this screen composes
 * ------------------------------------------------------------------------------------------- */

/**
 * The one specification §5.3 label every computed figure on this surface carries:
 * `Simulated calculation`, taken from the tuple in `src/types/primitives.ts` that owns the seven
 * exact strings, so this module types no label text of its own (rule P-1).
 */
const CALCULATION_LABEL: SimLabel = SIM_LABELS[1];

/**
 * `Simulated data` — the label of a reading that shipped with the dataset rather than being computed in
 * this session, which is what a seeded option's projection is. The dock's option series carries it where
 * its record states `origin: 'seeded'`, and the frame then states it for the whole figure, because it is
 * the one label true of both series (AAP §0.10, rule P-1).
 */
const DATA_LABEL: SimLabel = SIM_LABELS[0];

/**
 * The window this screen asks the queue for: the four most urgent exceptions AAP §0.12.4's SCR-12 row
 * fixes for the right stack.
 *
 * It is handed to `listExceptions` as a list parameter rather than applied to the result, so the
 * service's own ordering decides which four arrive and this file neither sorts nor truncates (rule
 * P-6). It is a window, not a figure: nothing displays it.
 */
const URGENT_EXCEPTION_LIMIT = 4;

/**
 * The one narrowing the plant read is made with, and the two it deliberately states nothing about.
 *
 * The read that covers a plant the urgent window misses asks `listExceptions` for that plant and
 * nothing else. `status` is left out because the four-row window beside it is drawn from the same
 * population: a status filter here would let the two sources disagree about which exception a plant
 * answers, and the window could then print a record this read had filtered away. `limit` is left out
 * because the question this read answers is the dock's — does the selected plant answer any exception
 * at all — and a window could cut that answer short after the query had already narrowed the
 * population to one plant. It is a narrowing, not a figure: nothing displays it.
 *
 * `ExceptionQuery.plantId` is the wider reading of "at this plant": the adapter keeps a row the plant
 * lands on **or** one it also affects (`src/services/mock/handlers/exceptions.ts`, reading
 * `src/types/service.ts`). The dock projects one exception, and the join both sources make is the
 * landing plant, so the row is picked by its own `plantId` in {@link exceptionLandedOn}.
 *
 * The plant arrives as an argument rather than as a typed constant, because the identifier is the
 * selected node's own record value and writing one here would be an identifier this file invents
 * (rule P-6).
 *
 * @param plantId - The selected plant's own identifier, as the topology spells it.
 * @returns The query, stating that plant and nothing else.
 */
function plantExceptionQuery(plantId: PlantId): ExceptionQuery {
  return { plantId };
}

/**
 * The order the dock's five latest events are asked for in, stated at the call site that needs it.
 *
 * `listAuditEvents` documents its answer as the events "in chain order"
 * (`src/services/site-intelligence-service.ts`), while the adapter's own default is newest first
 * (`src/services/mock/handlers/audit.ts`). A surface that shows the five LATEST events therefore cannot
 * leave the direction to a default it does not own: it asks for that order in the query, in the
 * `field:dir` form `ListQuery.sort` defines, so the dependency is visible here and the read answers the
 * order this screen means rather than the order its adapter happens to apply.
 *
 * It is exported so the suite names the order through this constant instead of retyping it.
 */
export const DOCK_EVENT_ORDER = 'timestamp:desc';

/**
 * The selection a screen reads when the shell supplies none: the empty plant and product arrays,
 * which `Scope` documents as "all plants" and "all products" rather than as "none".
 *
 * Declared once and reused, so the query keys of a screen the shell rendered without a scope stay
 * stable across renders instead of changing identity on every pass.
 */
const NO_SCOPE: Scope = { plants: [], products: [] };

/**
 * The root of the references this screen's aggregate figures carry, prefixed to the aggregate's own
 * key.
 *
 * The evidence read answers `canvas:<key>` from the same aggregates this screen reads — the ribbon's
 * own six tiles and the overview they are computed over — resolved through the same one scope
 * resolver, so a tile's drawer states the figure the tile drew rather than a second computation of it
 * (AAP 0.2.1 F12, principle PR-6). `RibbonTile` carries no reference of its own, so this screen
 * composes one from the aggregate's key; it is stable across renders, so a figure keeps one reference
 * for one reading.
 */
const AGGREGATE_REF_ROOT = 'canvas';

/** The query parameter a reference carries the shell's plant selection in. */
const PLANTS_PARAM = 'plants';

/** The query parameter a reference carries the shell's product selection in. */
const PRODUCTS_PARAM = 'products';

/** The separator a selection's two lists are stated with. */
const SELECTION_SEPARATOR = ',';

/**
 * The shell selection a reference carries, as a query suffix.
 *
 * The suffix is present only when the selection names plants or products, so an unnarrowed screen
 * composes the bare `<root>:<key>` form the evidence read documents, and a narrowed canvas opens a
 * drawer narrowed by the same filters the canvas itself was read under (AAP 0.2.1).
 *
 * @param scope - The shell's plant and product selection.
 * @returns `?plants=…&products=…`, or an empty string when the selection names neither.
 */
function selectionQuery(scope: Scope): string {
  const params: string[] = [];

  if (scope.plants.length > 0) {
    params.push(`${PLANTS_PARAM}=${scope.plants.join(SELECTION_SEPARATOR)}`);
  }

  if (scope.products.length > 0) {
    params.push(`${PRODUCTS_PARAM}=${scope.products.join(SELECTION_SEPARATOR)}`);
  }

  return params.length === 0 ? '' : `?${params.join('&')}`;
}

/**
 * The reference one aggregate figure carries: the root, a colon, the aggregate's own key, then the
 * selection the figure was read under.
 *
 * @param key - The aggregate the figure reports, as `RibbonTile.id` spells it.
 * @param scope - The shell's selection, which the drawer's read narrows by.
 * @returns The reference the tile's evidence trigger carries.
 */
function aggregateRef(key: string, scope: Scope): string {
  return `${AGGREGATE_REF_ROOT}:${key}${selectionQuery(scope)}`;
}


/**
 * What each of the ribbon's six tiles shows beyond its figure: the caption this screen owns for that
 * aggregate key, the reference the figure opens — composed for the selection the tiles were read
 * under — and, where the figure needs it, the presentation rule the tile applies, so the median
 * hours reach the reader at the precision the aggregate computed — unrounded, as AAP §0.8 fixes
 * that reading — rather than as a whole hour the tile's own evidence drawer would contradict.
 *
 * Keyed by `RibbonTile.id`, the aggregate keys `src/domain/aggregation/urgency.ts` emits, so a tile
 * is matched to its caption by identity rather than by position and a key the payload does not carry
 * is ignored. `CanvasRibbon` renders nothing for a tile with no entry here, which is why every key the
 * aggregate builds has one.
 *
 * @param scope - The shell's plant and product selection, which every reference carries.
 * @returns The presentation map the ribbon renders its tiles with.
 */
function ribbonPresentation(scope: Scope): CanvasRibbonProps['presentation'] {
  return {
    'open-exceptions': {
      label: FILEMAP_CANVAS_TEXT.tileOpenExceptions,
      evidenceRef: aggregateRef('open-exceptions', scope),
    },
    'critical-exceptions': {
      label: FILEMAP_CANVAS_TEXT.tileCriticalExceptions,
      evidenceRef: aggregateRef('critical-exceptions', scope),
    },
    'revenue-at-risk': {
      label: FILEMAP_CANVAS_TEXT.tileRevenueAtRisk,
      evidenceRef: aggregateRef('revenue-at-risk', scope),
      kind: 'money',
    },
    'customer-orders-at-risk': {
      label: FILEMAP_CANVAS_TEXT.tileCustomerOrdersAtRisk,
      evidenceRef: aggregateRef('customer-orders-at-risk', scope),
    },
    'median-hours-to-approved-plan': {
      label: FILEMAP_CANVAS_TEXT.tileMedianHours,
      evidenceRef: aggregateRef('median-hours-to-approved-plan', scope),
      kind: 'measured-hours',
    },
    'plants-in-scope': {
      label: FILEMAP_CANVAS_TEXT.tilePlantsInScope,
      evidenceRef: aggregateRef('plants-in-scope', scope),
    },
  };
}

/* ---------------------------------------------------------------------------------------------
 * Layout, built from role tokens and the 4 px grid only
 * ------------------------------------------------------------------------------------------- */

/** The page frame: one column, separated by the 6-step of the spacing scale. */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/** The toolbar: the lens switch on one side, the wall-mode control on the other. */
const TOOLBAR_CLASSES = 'flex min-w-0 flex-wrap items-center justify-between gap-3';

/** The two lens controls, side by side on the 4 px grid. */
const LENS_SWITCH_CLASSES = 'flex flex-wrap items-center gap-2';

/**
 * The caption stating which lens is drawn. It is the reason the active lens never depends on colour:
 * the two controls differ by their label and the words here say which one is in view (rule B-3).
 */
const LENS_CAPTION_CLASSES = 'min-w-0 text-13 text-text-secondary';

/**
 * The canvas row: the lens and the stack stacked below the 1280 px breakpoint and side by side from
 * it, which is the breakpoint AAP §0.12.4's layout note fixes for this screen.
 */
const CANVAS_ROW_CLASSES = 'flex min-w-0 flex-col items-stretch gap-4 xl:flex-row xl:items-start';

/**
 * The canvas region: 65% of the row where the row is a row.
 *
 * The proportion is AAP §0.12.4's, and it is stated as a fraction of the container rather than as a
 * pixel width so the lens keeps it at every viewport above the breakpoint. In wall mode the region
 * takes the whole row, because the mode exists to give the drawing the display.
 */
const CANVAS_REGION_CLASSES = 'min-w-0 xl:basis-[65%]';

/** The canvas region in wall mode: the whole row. */
const CANVAS_REGION_WALL_CLASSES = 'min-w-0 xl:basis-full';

/** The stack beside the canvas: the rest of the row. */
const STACK_REGION_CLASSES = 'min-w-0 xl:basis-[35%]';

/** The dock's slot: full width under the row, whatever the row did. */
const DOCK_CLASSES = 'flex min-w-0 flex-col';

/* ---------------------------------------------------------------------------------------------
 * Neutral empty collections, so a memoised member needs no fabricated record
 * ------------------------------------------------------------------------------------------- */

/** The exception rows of a read that has not settled, or settled to nothing. */
const NO_ROWS: readonly ExceptionRow[] = [];

/** The ribbon tiles of a read that has not settled, or settled to nothing. */
const NO_TILES: readonly RibbonTile[] = [];

/** The topology nodes of a payload that has not settled, or holds no node. */
const NO_NODES: readonly TopologyNode[] = [];

/** The audit events of a read that has not settled, or settled to nothing. */
const NO_EVENTS: readonly AuditEvent[] = [];

/* ---------------------------------------------------------------------------------------------
 * The topology, read as one list of nodes
 * ------------------------------------------------------------------------------------------- */

/**
 * Every node of one payload, in the five families' order.
 *
 * `Topology` carries the families as five arrays — the shape the lenses address directly — so a
 * selection, which is a node identifier whatever family it belongs to, needs them as one list. The
 * concatenation preserves each family's own order and computes nothing: it is the payload read a
 * second way, not a new population. Materials come last so the first node of the list — the fallback a
 * selection with no exception to resolve to falls back on — stays a plant.
 *
 * @param topology - The payload the service returned, read and not modified.
 * @returns The five families' nodes in family order.
 */
function nodesOf(topology: Topology): readonly TopologyNode[] {
  return [
    ...topology.plants,
    ...topology.suppliers,
    ...topology.origins,
    ...topology.customers,
    ...topology.materials,
  ];
}

/**
 * The evidence reference a canvas node carries: the node's own identifier.
 *
 * A topology node IS the seed record — `src/services/mock/handlers/topology.ts` copies each plant,
 * supplier, tier-2 origin and customer into its node — so the identifier the drawing holds is the
 * record identifier the service's evidence read resolves, and activating the node opens that record's
 * value, formula, inputs, upstream and downstream, confidence and documents (AAP §0.2.1 F12). The
 * screen composes no reference of its own: a prefixed, mapped or derived one would be an identifier
 * written here (rule P-6), and the whole of the mapper's work is to hand the record's own identifier
 * on to the service.
 *
 * @param node - The node the reader activated, as the payload spells it.
 * @returns The reference the service's evidence read resolves for that node.
 */
const evidenceRefForNode = (node: TopologyNode): string => node.id;

/**
 * The node identifier a canvas opens with when the shell holds no selection (rule P-6).
 *
 * The choice is made from service data and never from a literal. The most urgent exception's plant is
 * preferred, because the exception is what the screen exists to investigate and the plant is the only
 * field on an `ExceptionRow` a node can be joined to — a supplier, a material, an origin and a customer
 * are not named on the row, so a plant node is the one kind a selection can resolve to an exception
 * through. Failing that, the first node the payload supplies is selected, so a scope whose exceptions
 * fall outside the four-row window still opens on a drawable network rather than on nothing.
 *
 * @param topology - The payload the service returned.
 * @param urgentRows - The urgent exceptions, in the service's own order.
 * @returns The identifier to select, or `null` when the payload holds no node at all.
 */
function resolveInitialSelection(
  topology: Topology,
  urgentRows: readonly ExceptionRow[],
): string | null {
  const plantIds = new Set(topology.plants.map((node) => node.id));

  for (const row of urgentRows) {
    if (plantIds.has(row.plantId)) {
      return row.plantId;
    }
  }

  const first = nodesOf(topology)[0];

  return first === undefined ? null : first.id;
}

/**
 * The exception a selected node answers within the urgent window, or `undefined` when it answers none.
 *
 * An exception row names the plant the disruption lands on, so a plant node resolves to the first
 * exception on that plant as the service ordered them — the most urgent of them, because the ordering
 * is the service's. Any other node kind resolves to nothing: a supplier, a material, an origin and a
 * customer carry no field on `ExceptionRow` to join on, and this module invents none (rule P-6).
 *
 * This is the first of the screen's two sources and the one that answers most selections with no read
 * of its own: a plant whose exception ranks outside the four-row window yields `undefined` here, and
 * {@link exceptionLandedOn} resolves it from the read narrowed to that plant instead.
 *
 * @param urgentRows - The urgent exceptions, in the service's own order.
 * @param node - The node the canvas holds as selected, if one is.
 * @returns The exception the selection reaches, or `undefined`.
 */
function resolveSelectedException(
  urgentRows: readonly ExceptionRow[],
  node: TopologyNode | undefined,
): ExceptionRow | undefined {
  if (node === undefined || node.kind !== 'plant') {
    return undefined;
  }

  return urgentRows.find((row) => row.plantId === node.id);
}

/**
 * The exception that landed on a selected plant, read from the rows narrowed to that plant.
 *
 * The join is the plant the disruption lands on — `row.plantId === node.id`, the same predicate the
 * window resolution makes — because the plant read's own filter is wider: `ExceptionQuery.plantId`
 * keeps a row the plant lands on **or** one it also affects, while the dock projects the exception
 * this plant answers. Picking the row by its own `plantId` is therefore what keeps the two sources
 * describing the same relationship, and the first row is the service's own most urgent for that
 * plant because the query states no order of its own.
 *
 * A node of any other kind resolves to nothing, for the reason {@link resolveSelectedException}
 * gives: no other family carries a field on `ExceptionRow` to join on.
 *
 * @param plantRows - The rows the read narrowed to the selected plant returned, in the service's order.
 * @param node - The node the canvas holds as selected, if one is.
 * @returns The exception that landed on the plant, or `undefined`.
 */
function exceptionLandedOn(
  plantRows: readonly ExceptionRow[],
  node: TopologyNode | undefined,
): ExceptionRow | undefined {
  if (node === undefined || node.kind !== 'plant') {
    return undefined;
  }

  return plantRows.find((row) => row.plantId === node.id);
}

/**
 * One health card per product the urgent exceptions touch (AAP §0.12.4: "a health card per product").
 *
 * The port declares no product-health and no product-name read, so each card is built from the product
 * identifiers the exception rows themselves carry and is named by that identifier — the record's own
 * spelling rather than an invented name. The one figure a card shows is
 * the revenue at risk the exception row that first reaches the product states, captioned with that
 * exception named: it is that record's own amount, never a product total, because the port computes
 * no per-product aggregate and summing the rows here would compute a figure in the screen (rule P-6).
 * The figure opens the exception record behind it and carries the imported `Simulated calculation`
 * label (rule P-1).
 *
 * The order is the rows' order and, within a row, the products' order, so a product's card sits where
 * the most urgent exception that reaches it sits; nothing is sorted, summed or averaged here.
 *
 * @param urgentRows - The urgent exceptions, in the service's own order.
 * @returns One row per distinct product the rows reach, or none when they reach none.
 */
function productHealthOf(urgentRows: readonly ExceptionRow[]): readonly ProductHealthRow[] {
  const seen = new Set<string>();
  const health: ProductHealthRow[] = [];

  for (const row of urgentRows) {
    for (const productId of row.productIds) {
      if (seen.has(productId)) {
        continue;
      }

      seen.add(productId);

      health.push({
        productId,
        productName: productId,
        figures: [
          {
            label: FILEMAP_CANVAS_TEXT.productRevenueAtRiskOn(row.id),
            value: row.revenueAtRiskEur,
            kind: 'money',
            evidenceRef: row.id,
            simLabel: CALCULATION_LABEL,
          },
        ],
      });
    }
  }

  return health;
}

/* ---------------------------------------------------------------------------------------------
 * Props
 * ------------------------------------------------------------------------------------------- */

/**
 * Props of {@link FilemapCanvasScreen}.
 *
 * Every member is optional and defaulted inside the component, because the route element that renders
 * this screen is declared elsewhere in the shell and may hand it none of them: a shell that owns the
 * scope, the selection and the navigation calls the screen with them, and a shell that does not gets a
 * screen that still draws, still switches lenses, still toggles wall mode and still investigates the
 * exception its selection resolves to.
 *
 * THE ROUTING OBLIGATION, stated here because it is the one part of this screen's contract the screen
 * cannot enforce itself. The route element is the shell's, and this screen may not read the shell's
 * stores (AAP §0.18.1), so a shell that holds a filtered selection must pass it: with no `scope` the
 * screen reads the empty selection, which `Scope` defines as "all plants and all products" and which
 * is the right reading only for a shell that has not filtered yet. The same holds, the other way
 * round, for the selection and the wall-mode request — a shell that displays either must receive it
 * through {@link FilemapCanvasScreenProps.onSelectedNodeChange} and
 * {@link FilemapCanvasScreenProps.onWallModeChange}, or the reader's choice stays inside this screen.
 */
export interface FilemapCanvasScreenProps {
  /**
   * The shell's plant and product selection, forwarded unchanged to every port call that takes one:
   * `getTopology`, `getCanvasRibbon` and `listExceptions`. The other reads — `getExceptionDetail`,
   * `listAuditEvents` and `getAtlas` — take no scope, by the port's own signatures.
   *
   * The service intersects it with the acting role's plant scope before it answers, so this screen
   * never narrows a result itself (AAP §0.2.1). Absent, the read uses the empty selection `Scope`
   * documents as "all plants and all products"; a shell that holds a filtered selection and omits it
   * would show the unfiltered network beside a filtered queue, which is exactly why the routing note
   * above states the obligation.
   */
  readonly scope?: Scope;

  /**
   * The node the shell holds as selected, shared with the two lenses (AAP §0.12.4).
   *
   * `undefined` and `null` both mean the shell holds no selection, in which case the screen resolves
   * one from the payloads it read — never from a literal (rule P-6). A value is used as given and the
   * screen's own choice of node is ignored, so a shell that owns the selection owns it completely.
   */
  readonly selectedNodeId?: string | null;

  /**
   * Reports the node a reader activated in either lens, and `null` when a selection is cleared.
   *
   * Absent, the screen keeps the selection itself, so activating a node still moves both lenses and
   * the primary action with no handler in reach (rule P-8).
   */
  readonly onSelectedNodeChange?: (nodeId: string | null) => void;

  /**
   * Reports the wall-mode request the toggle makes.
   *
   * The shell owns the navigation, so hiding it is the shell's work: this screen never imports the
   * shell's modules. Absent, the toggle still changes the mode and the canvas still takes the full
   * width of its own row, so the control performs its visible function either way (rule P-8).
   */
  readonly onWallModeChange?: (wallMode: boolean) => void;
}

/* ---------------------------------------------------------------------------------------------
 * The two lenses, named once, and the lens in view kept outside the component
 * ------------------------------------------------------------------------------------------- */

/** Which lens the canvas is drawing; the two members are the switch's two controls. */
type LensId = 'map' | 'graph';

/** The lens the canvas opens on: the map, because it places the network before the graph bands it. */
const DEFAULT_LENS: LensId = 'map';

/**
 * The lens in view, held in this module rather than in the component's own state.
 *
 * The shell unmounts the canvas when the reader leaves `/canvas`, so a lens chosen in `useState` was
 * discarded by every client-side route change and the screen came back on the map however the reader had
 * left it. A zustand store created here outlives the component, so the reader returns to the lens they
 * were reading.
 *
 * Only the lens lives here. Wall mode is a presentation request the shell owns the navigation for, the
 * screen's own selection is the fallback for a shell that holds none, and the armed preview names a
 * response option of the selection this visit read — the three belong to this visit and to the records it
 * saw, so they stay in the component. Nor is this the shell's store: the props note above records that
 * this screen may not read the shell's stores (AAP 0.18.1), and AAP 0.6.1 gives that one the active role,
 * the scope, the selected node, wall mode and the simulation popover rather than any screen's lens.
 *
 * Created with no persistence middleware: theme and density are the only preferences this application
 * writes to browser storage (platform-contracts.md §1), so a reload opens on the map again.
 */
interface CanvasViewState {
  /** The lens the canvas is drawing. */
  lens: LensId;

  /** Switches the lens the canvas draws. */
  setLens(lens: LensId): void;
}

/** The canvas's view state, read through a zustand hook so the screen re-renders on the lens alone. */
const useCanvasViewStore: UseBoundStore<StoreApi<CanvasViewState>> = create<CanvasViewState>()(
  (set) => ({
    lens: DEFAULT_LENS,

    setLens: (lens) => {
      set({ lens });
    },
  }),
);

/**
 * Returns the canvas's view state to the one a first visit starts in.
 *
 * The state outlives every mount on purpose, so a suite that drives this screen calls this between cases:
 * without it the lens one case switched to would still be in force in the next.
 * `src/app/role-switcher.test.tsx` resets the shell store the same way.
 */
export function resetCanvasViewState(): void {
  useCanvasViewStore.setState({ lens: DEFAULT_LENS });
}

/* ---------------------------------------------------------------------------------------------
 * The screen
 * ------------------------------------------------------------------------------------------- */

/**
 * SCR-12 FileMap canvas: the ribbon, the two lenses, the right stack and the dock.
 *
 * Eight reads go through the port, each keyed by its method's own name and the arguments it was made
 * with (AAP §0.6.2), so a scope change re-reads the topology, the ribbon and the queue together and a
 * write that invalidates one of those reads reaches this screen:
 *
 * - `getTopology(scope)` — the five node families, the lanes and the pin counts both lenses draw;
 * - `getCanvasRibbon(scope)` — the six computed tiles above the canvas;
 * - `listExceptions({ limit }, scope)` — the four most urgent exceptions, in the service's order and
 *   within the service's window, for the right stack;
 * - `listExceptions({ plantId }, scope)` — the same read narrowed to the selected plant, made only
 *   when the window answers nothing for it, so the dock projects the exception that plant answers
 *   instead of reporting an absence the four-row window cannot see ({@link plantExceptionQuery});
 * - `listAuditEvents({ limit })` — the five latest events the dock prints;
 * - `getExceptionDetail(id)` — the selected exception's own title and the baseline its records project,
 *   read only once a selection resolves to an exception;
 * - `getScenarioSet(id)` — the selected exception's response options, read only once a selection
 *   resolves to an exception, because the option in view is drawn over that baseline in the dock and is
 *   the one the graph lens's preview switch offers.
 *
 * `getAtlas()` is the eighth and the only optional one: its refusal degrades the map lens to
 * the first-party network, so its failure is never the screen's failure.
 *
 * Nothing here writes, so a re-render can move no record; the state the component owns is the reader's
 * own — wall mode, a selection the shell has not taken over, and the response option the reader armed in
 * the preview switch — beside the lens in view, which lives in the module store above so a route change
 * keeps it.
 *
 * @param props - The shell's scope, the selection it holds and the two callbacks it offers. See
 *   {@link FilemapCanvasScreenProps}: every member is optional.
 * @returns The header with its primary action, the ribbon, the toolbar, the two regions and the dock,
 *   all inside the state boundary the reads settled to.
 */
export function FilemapCanvasScreen(props: FilemapCanvasScreenProps): ReactElement {
  const service = useService();
  const navigate = useNavigate();

  const scope = props.scope ?? NO_SCOPE;

  const lens = useCanvasViewStore((state) => state.lens);
  const setLens = useCanvasViewStore((state) => state.setLens);
  const [wallMode, setWallMode] = useState(false);
  const [ownSelection, setOwnSelection] = useState<string | null>(null);
  const [armedPreviewId, setArmedPreviewId] = useState<string | null>(null);

  /*
   * Retries are off on purpose: a refusal the acting role's permissions produce fails the same way
   * however often it is repeated, and the boundary offers the reader an explicit retry for the case
   * where repeating the read can succeed.
   */
  const topologyQuery = useQuery<Result<Topology>, unknown>({
    queryKey: ['getTopology', scope],
    queryFn: () => service.getTopology(scope),
    retry: false,
  });

  const ribbonQuery = useQuery<Result<RibbonTile[]>, unknown>({
    queryKey: ['getCanvasRibbon', scope],
    queryFn: () => service.getCanvasRibbon(scope),
    retry: false,
  });

  const urgentQuery = useQuery<Result<ExceptionRow[]>, unknown>({
    queryKey: ['listExceptions', { limit: URGENT_EXCEPTION_LIMIT }, scope],
    queryFn: () => service.listExceptions({ limit: URGENT_EXCEPTION_LIMIT }, scope),
    retry: false,
  });

  /*
   * The trail the dock's events half prints: the five latest, asked for newest first. The order is
   * stated in the query rather than left to the adapter's default, because the port documents this read
   * as the chain's own order and only the caller knows which direction its surface needs
   * ({@link DOCK_EVENT_ORDER}). It is part of the key as well, so a cache entry says which page it holds.
   */
  const auditQuery = useQuery<Result<AuditEvent[]>, unknown>({
    queryKey: ['listAuditEvents', { limit: TIMELINE_DOCK_AUDIT_EVENTS, sort: DOCK_EVENT_ORDER }],
    queryFn: () =>
      service.listAuditEvents({ limit: TIMELINE_DOCK_AUDIT_EVENTS, sort: DOCK_EVENT_ORDER }),
    retry: false,
  });

  const atlasQuery = useQuery<Result<Atlas>, unknown>({
    queryKey: ['getAtlas'],
    queryFn: () => service.getAtlas(),
    retry: false,
  });

  /*
   * Whether the trail was refused rather than unanswered: only a refusal has a reader-facing
   * explanation worth printing, and an unreachable source keeps the dock's own neutral sentence so a
   * defect is never described as a permission.
   *
   * It is read before the events because it decides them. A refusal is the service's answer that this
   * role holds no event, so what the read still carries must not reach the dock (rule P-2): the role
   * switch invalidates every read and React Query keeps the previous `data` across the refetch it
   * starts, so a role without `audit.read` would otherwise be handed the records the previous role
   * read together with their evidence controls (rule P-8) — exactly the case the dock's refusal
   * sentence exists to cover.
   */
  const trailRefused = isProblem(auditQuery.error) && auditQuery.error.type === 'permission';

  /*
   * Why the map lens draws no overlay, when the atlas read is what left it out.
   *
   * `getAtlas` is the screen's only optional read, so its failure never reaches the state derivation
   * below — the surface the reader landed on keeps working. That makes the absence silent unless the
   * screen says why, and a reader cannot tell a scope that holds no pack from a read that was refused.
   * The sentence is therefore chosen here from the refusal's own `type`, which is the service's word
   * for the cause: a permission refusal says the role may not read it, and anything else says the read
   * did not answer. Nothing is said while the read is in flight, and nothing is said when it answered,
   * so the caption reports a degradation rather than a settled absence.
   */
  const atlasFailure = atlasQuery.error;
  const atlasNotice =
    atlasFailure === null || atlasFailure === undefined
      ? undefined
      : isProblem(atlasFailure) && atlasFailure.type === 'permission'
        ? FILEMAP_CANVAS_TEXT.atlasRefused
        : FILEMAP_CANVAS_TEXT.atlasUnavailable;

  const topology = topologyQuery.data?.data;
  const ribbonTiles = ribbonQuery.data?.data ?? NO_TILES;

  /*
   * The ribbon's captions and references, derived once per selection: a tile of one reading keeps one
   * reference, and a re-render that moves no selection rebuilds no projection (AAP 0.2.1 F12).
   */
  const tilePresentation = useMemo(() => ribbonPresentation(scope), [scope]);
  const urgentRows = urgentQuery.data?.data ?? NO_ROWS;
  const auditEvents = trailRefused ? NO_EVENTS : (auditQuery.data?.data ?? NO_EVENTS);
  const atlas = atlasQuery.data?.data;

  const nodes = useMemo(
    () => (topology === undefined ? NO_NODES : nodesOf(topology)),
    [topology],
  );

  /*
   * The selection: the shell's when it holds one, the reader's own next, and otherwise the node the
   * payloads resolve — never a literal identifier (rule P-6). `null` from the shell counts as no
   * selection, which is why the two nullish checks chain rather than stopping at the first.
   */
  const initialSelection = useMemo(
    () => (topology === undefined ? null : resolveInitialSelection(topology, urgentRows)),
    [topology, urgentRows],
  );
  const selectedNodeId = props.selectedNodeId ?? ownSelection ?? initialSelection;

  const selectedNode = useMemo(
    () => (selectedNodeId === null ? undefined : nodes.find((node) => node.id === selectedNodeId)),
    [nodes, selectedNodeId],
  );

  /*
   * The window's answer, and the one read that covers a plant the window does not answer for.
   *
   * The four-row window is tried first and costs nothing: when it answers the selection, the dock
   * projects that exception straight away and no further read is made. A plant whose exception ranks
   * outside that window resolves to nothing there, so the queue is asked for that plant alone — the
   * only way to tell a plant that answers no open exception from one whose exception the window
   * cannot see, which is the difference between the dock's empty sentence and a projection (F01,
   * AAP §0.12.4's dock and primary action).
   */
  const windowException = useMemo(
    () => resolveSelectedException(urgentRows, selectedNode),
    [urgentRows, selectedNode],
  );
  const selectedPlantId =
    selectedNode === undefined || selectedNode.kind !== 'plant' ? null : selectedNode.id;
  const plantReadNeeded = selectedPlantId !== null && windowException === undefined;

  /*
   * The covering read itself: one port call narrowed to the selected plant
   * ({@link plantExceptionQuery}), skipped whenever the window already answered so the common case
   * keeps today's immediate behaviour and adds neither latency nor a request.
   *
   * Its key names the plant by the node's own identifier rather than by the node the screen holds, so
   * a change of selection is a different cache entry and one plant's rows are never read under
   * another's question. The key is stated from the same nullable value the query is skipped on, so it
   * is expressible whether or not the read was started (AAP §0.6.2 keys every read by its method and
   * the arguments it was made with).
   */
  const plantQuery = useQuery<Result<ExceptionRow[]>, unknown>({
    queryKey: ['listExceptions', { plantId: selectedPlantId }, scope],
    queryFn:
      plantReadNeeded && selectedPlantId !== null
        ? () => service.listExceptions(plantExceptionQuery(selectedPlantId), scope)
        : skipToken,
    retry: false,
  });

  const plantRows = plantQuery.data?.data ?? NO_ROWS;

  /*
   * Whether that read is still answering, and whether it failed: both flags are qualified by the
   * condition that started the read, because a query skipped under this key keeps what it left there
   * (AAP §0.6.2 memoises each read under its method and the arguments it was made with). It reports
   * itself pending for as long as it is skipped, and it keeps the error it failed with even once the
   * window starts answering for the same plant — so a read the selection no longer asks reports
   * neither a pending state nor a failure, and the dock projects the exception the window resolved
   * instead of standing that projection down over a failure nothing is waiting on.
   */
  const plantFailure = plantQuery.error;
  const plantReadPending = plantReadNeeded && plantQuery.isPending;
  const plantReadFailed = plantReadNeeded && plantFailure !== null && plantFailure !== undefined;

  /*
   * The exception the selection reaches, from the two sources in that order: the four-row window's
   * own answer, and — only where the window answered nothing — the row that landed on the selected
   * plant in the read narrowed to it. Everything downstream reads this one value: the dock's bed, the
   * primary action, the option set and the option the graph lens previews, so no two of them can
   * resolve the same selection to different exceptions.
   */
  const selectedException = useMemo(
    () => windowException ?? exceptionLandedOn(plantRows, selectedNode),
    [windowException, plantRows, selectedNode],
  );

  /*
   * The selected exception's own detail: the projection the dock draws and the title it prints. The
   * read is skipped rather than guessed when no exception resolves, so a selection that reaches none
   * asks the service for nothing rather than for a record it does not have.
   */
  const detailQuery = useQuery<Result<ExceptionDetail>, unknown>({
    queryKey: ['getExceptionDetail', selectedException === undefined ? null : selectedException.id],
    queryFn:
      selectedException === undefined
        ? skipToken
        : () => service.getExceptionDetail(selectedException.id),
    retry: false,
  });

  const detail = detailQuery.data?.data;

  /*
   * The detail read's own pending and failed conditions, for the dock's bed and for its retry. Both
   * flags are qualified by the condition that started the read, exactly as the plant read's are: the
   * query is skipped while no exception resolves, a skipped query is pending by definition, and an
   * exception that no longer resolves cannot have a failed detail read to report.
   */
  const detailFailure = detailQuery.error;
  const detailReadPending = selectedException !== undefined && detailQuery.isPending;
  const detailReadFailed =
    selectedException !== undefined && detailFailure !== null && detailFailure !== undefined;

  const productHealth = useMemo(() => productHealthOf(urgentRows), [urgentRows]);

  /*
   * The selected exception's response options: what the graph lens's preview switch can offer. It is an
   * accessory read beside the detail — an exception whose set is empty, or whose set the acting role may
   * not read, leaves the switch visibly disabled with the drawing's own reason instead of blanking the
   * canvas (rule P-8) — so it is kept out of the state derivation below exactly as the audit trail is.
   */
  const scenarioQuery = useQuery<Result<ScenarioSet>, unknown>({
    queryKey: ['getScenarioSet', selectedException === undefined ? null : selectedException.id],
    queryFn:
      selectedException === undefined
        ? skipToken
        : () => service.getScenarioSet(selectedException.id),
    retry: false,
  });

  /*
   * The one option in view: the option the reader armed in the preview switch when that identifier names
   * an option of this set, else the option the set's recommendation rule picked, else the first option
   * the set holds, else none. Every candidate is the records' own — `armedPreviewId` is the request the
   * reader made through that switch, `recommendedId` is what the rule chose and `scenarios` is the order
   * the set states — so this file authors no ranking, no measure and no figure (rule P-6).
   *
   * There is ONE of these, and both the preview caption and the dock read it, so the option the caption
   * names and the option the dock plots can never be two different records. Nothing is in view while the
   * read has not settled, and a set holding no option leaves nothing in view, which is the case the
   * drawing's disabled switch states a reason for.
   */
  const activeScenario = useMemo(() => {
    const set = scenarioQuery.data?.data;

    if (set === undefined) {
      return undefined;
    }

    const armed =
      armedPreviewId === null
        ? undefined
        : set.scenarios.find((scenario) => scenario.id === armedPreviewId);

    return (
      armed ??
      set.scenarios.find((scenario) => scenario.id === set.recommendedId) ??
      set.scenarios[0]
    );
  }, [scenarioQuery.data, armedPreviewId]);

  const activeScenarioId = activeScenario === undefined ? null : activeScenario.id;

  /*
   * The state, read from what the three reads the surface needs settled to. A typed refusal outranks an
   * untyped rejection, and none of the three accessory reads is among them: the atlas is the one optional
   * read, because its refusal degrades an overlay rather than the surface; the trail is the dock's
   * accessory read, which the four personas this screen is the entry route of hold, so only a role the
   * matrix withholds it from is refused and that refusal states itself in the dock's events half instead
   * of blanking the canvas those personas land on (rule P-8); and the scenario set is the preview
   * switch's accessory read, which leaves that switch visibly disabled with the drawing's own reason for
   * the same end.
   *
   * Emptiness is read from the payloads' own content: a scope that draws a node has something to draw
   * even when no exception in it is open, so `hasContent` holds for either half and the empty state
   * renders exactly when the sentence it prints — no node and no open exception in the selection — is
   * true.
   */
  const errors = [topologyQuery.error, ribbonQuery.error, urgentQuery.error];
  const failure =
    errors.find((error) => isProblem(error)) ??
    errors.find((error) => error !== null && error !== undefined);
  const pending =
    topologyQuery.isPending ||
    ribbonQuery.isPending ||
    urgentQuery.isPending ||
    auditQuery.isPending;
  const freshness = (topologyQuery.data ?? ribbonQuery.data ?? urgentQuery.data ?? auditQuery.data)
    ?.meta.freshness;
  const hasContent = nodes.length > 0 || urgentRows.length > 0;

  /*
   * The reads' own facts, plus this screen's reading of what they returned: ERP gates the approval a
   * planner takes from this screen, so the stale notice names it first (AAP §0.2.1), and the canvas has
   * something to show only once the nodes and the right stack's rows have arrived.
   */
  const state = deriveScreenState({
    isPending: pending,
    error: failure,
    freshness,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    hasContent,
  });
  const staleRecord =
    freshness === undefined ? undefined : staleSourceOf(freshness, APPROVAL_GATE_SOURCE);
  const forbiddenRecord = forbiddenOf(failure);

  /** Asks the port for the four reads again, which is what the boundary's retry control does. */
  function retryReads(): void {
    void topologyQuery.refetch();
    void ribbonQuery.refetch();
    void urgentQuery.refetch();
    void auditQuery.refetch();
  }

  /**
   * Asks the port for the plant read again, which is what the dock's own retry control does.
   *
   * Only that one read is repeated: the canvas around it answered, so re-reading the topology, the
   * ribbon and the queue would ask for what the screen already holds.
   */
  function retryPlantRead(): void {
    void plantQuery.refetch();
  }

  /** Asks the port for the selected exception's detail again, for the dock's detail retry control. */
  function retryDetailRead(): void {
    void detailQuery.refetch();
  }

  /*
   * Takes a node a lens reports as the selection, in this screen and — if the shell wants it — there.
   *
   * `useCallback` with the shell's handler as its one dependency is what keeps this identity stable
   * across the screen's own state changes: the lenses below are memoised on the props they are given
   * (`src/components/dependency-graph.tsx` wraps its drawing in `React.memo`), and the shell binds
   * `onSelectedNodeChange` to a stable setter, so a callback built once per handler means a node click
   * rebuilds the drawing's emphasis rather than the drawing.
   */
  const selectNode = useCallback(
    (nodeId: string): void => {
      setOwnSelection(nodeId);
      props.onSelectedNodeChange?.(nodeId);
    },
    [props.onSelectedNodeChange],
  );

  /** Flips wall mode, applies it here and reports it, because hiding the navigation is the shell's. */
  function toggleWallMode(): void {
    const next = !wallMode;
    setWallMode(next);
    props.onWallModeChange?.(next);
  }

  /** Opens the investigation of the exception the selection reaches (SCR-03's route). */
  function investigate(exceptionId: ExceptionId): void {
    void navigate(`${EXCEPTION_QUEUE_PATH}/${encodeURIComponent(exceptionId)}`);
  }

  /*
   * The primary action is always on screen, because rule P-8 asks a control that cannot act to say why
   * rather than to disappear: a reader who selected a supplier, a material, an origin or a customer
   * would otherwise be left with no control and no way forward. While the selection resolves to an
   * exception the control investigates it, and otherwise it is disabled carrying the reason true of
   * that state — the node to select when the selection is not a plant node, the covering read that is
   * still answering while one is in flight, that read's failure when it did not answer, and the absence
   * that read established when the plant answers no open exception — rather than always the first of
   * them, which a selected plant has already followed. `ActionButton`'s prop union makes the reason as
   * structural as the disabled state, and its `aria-disabled` keeps the control focusable so the reason
   * reaches a keyboard reader too (rule B-3).
   */
  const headerActions: ReactNode = (
    <ActionButton
      variant="primary"
      {...(selectedException !== undefined
        ? {
            onClick: () => {
              investigate(selectedException.id);
            },
          }
        : plantReadPending
          ? { disabled: true, disabledReason: FILEMAP_CANVAS_TEXT.primaryActionReading }
          : plantReadFailed
            ? { disabled: true, disabledReason: FILEMAP_CANVAS_TEXT.primaryActionUnread }
            : selectedPlantId !== null
              ? { disabled: true, disabledReason: FILEMAP_CANVAS_TEXT.primaryActionNoOpenException }
              : { disabled: true, disabledReason: FILEMAP_CANVAS_TEXT.primaryActionUnavailable })}
    >
      {FILEMAP_CANVAS_TEXT.primaryAction}
    </ActionButton>
  );

  const lensLabel = lens === 'map' ? FILEMAP_CANVAS_TEXT.mapLens : FILEMAP_CANVAS_TEXT.graphLens;

  return (
    <div className={SCREEN_CLASSES}>
      <PageHeader
        title={FILEMAP_CANVAS_TEXT.title}
        eyebrow={FILEMAP_CANVAS_TEXT.eyebrow}
        description={FILEMAP_CANVAS_TEXT.description}
        actions={headerActions}
      />

      <StateBoundary
        state={state}
        stale={staleRecord}
        onRetry={retryReads}
        emptyMessage={FILEMAP_CANVAS_TEXT.empty}
        partialMessage={FILEMAP_CANVAS_TEXT.partial}
        conflictMessage={FILEMAP_CANVAS_TEXT.conflict}
        forbidden={forbiddenRecord}
      >
        {topology === undefined ? null : (
          <>
            <CanvasRibbon tiles={ribbonTiles} presentation={tilePresentation} />

            <div className={TOOLBAR_CLASSES}>
              <div
                role="group"
                aria-label={FILEMAP_CANVAS_TEXT.lensGroupLabel}
                className={LENS_SWITCH_CLASSES}
              >
                <ActionButton
                  variant={lens === 'map' ? 'selected' : 'secondary'}
                  pressed={lens === 'map'}
                  onClick={() => {
                    setLens('map');
                  }}
                >
                  {FILEMAP_CANVAS_TEXT.mapLens}
                </ActionButton>
                <ActionButton
                  variant={lens === 'graph' ? 'selected' : 'secondary'}
                  pressed={lens === 'graph'}
                  onClick={() => {
                    setLens('graph');
                  }}
                >
                  {FILEMAP_CANVAS_TEXT.graphLens}
                </ActionButton>
                {/* The lens in view, in words: the two controls differ by label and the state is
                    stated here rather than by colour alone (rule B-3). The caption changes without a
                    page load, so this status region announces the lens the reader switched to
                    (WCAG 2.2 SC 4.1.3). */}
                <span role="status" className={LENS_CAPTION_CLASSES}>
                  {`${FILEMAP_CANVAS_TEXT.lensCaptionPrefix} ${lensLabel}`}
                </span>
              </div>

              <ActionButton onClick={toggleWallMode}>
                {wallMode ? FILEMAP_CANVAS_TEXT.wallModeExit : FILEMAP_CANVAS_TEXT.wallModeEnter}
              </ActionButton>
            </div>

            <div className={CANVAS_ROW_CLASSES}>
              <section
                aria-label={FILEMAP_CANVAS_TEXT.canvasRegionLabel}
                className={wallMode ? CANVAS_REGION_WALL_CLASSES : CANVAS_REGION_CLASSES}
              >
                {lens === 'map' ? (
                  <MapLens
                    topology={topology}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={selectNode}
                    atlas={atlas}
                    atlasNotice={atlasNotice}
                    evidenceRefForNode={evidenceRefForNode}
                  />
                ) : (
                  <>
                    {/* The option the preview switch is showing, named from its own record: the switch's
                        accessible name carries the option's identifier, and this caption states which
                        option is in view in words. It changes without a page load, so it is a status
                        region and the change is announced (WCAG 2.2 SC 4.1.3, rule B-3). */}
                    {activeScenario !== undefined && armedPreviewId === activeScenario.id ? (
                      <p role="status" className={LENS_CAPTION_CLASSES}>
                        {`${FILEMAP_CANVAS_TEXT.previewCaptionPrefix} ${activeScenario.name}`}
                      </p>
                    ) : null}
                    <GraphLens
                      topology={topology}
                      selectedNodeId={selectedNodeId}
                      onSelectNode={selectNode}
                      evidenceRefForNode={evidenceRefForNode}
                      previewScenarioId={activeScenarioId}
                      onPreviewScenarioChange={setArmedPreviewId}
                    />
                  </>
                )}
              </section>

              {wallMode ? null : (
                <aside
                  aria-label={FILEMAP_CANVAS_TEXT.stackRegionLabel}
                  className={STACK_REGION_CLASSES}
                >
                  <CanvasRightStack
                    urgentExceptions={urgentRows}
                    productHealth={productHealth}
                    onSelectException={investigate}
                  />
                </aside>
              )}
            </div>

            {plantReadPending ? (
              <div className={DOCK_CLASSES}>
                {/* The covering read is in flight: the dock has nothing to project yet, and the
                    boundary's own loading region says so instead of the bed's axes drawing empty. */}
                <StateBoundary state="loading">{null}</StateBoundary>
              </div>
            ) : plantReadFailed ? (
              <div className={DOCK_CLASSES}>
                {/* The one source that could answer for this selection did not answer, so the dock
                    states that read rather than asserting an absence the failure cannot support, and
                    the boundary's retry repeats that read alone (rule P-8). */}
                <StateBoundary
                  state="offline"
                  onRetry={retryPlantRead}
                  offlineMessage={FILEMAP_CANVAS_TEXT.selectionUnread}
                >
                  {null}
                </StateBoundary>
              </div>
            ) : detailReadFailed ? (
              <div className={DOCK_CLASSES}>
                {/* The exception resolved and the detail that drives the dock did not: the dock states
                    that read beside a retry rather than disappearing from the surface, which is how
                    the trail, the overlay and the option set state their own failures. */}
                <StateBoundary
                  state="offline"
                  onRetry={retryDetailRead}
                  offlineMessage={FILEMAP_CANVAS_TEXT.dockDetailUnavailable}
                >
                  {null}
                </StateBoundary>
              </div>
            ) : detailReadPending ? (
              <div className={DOCK_CLASSES}>
                {/* The detail read is answering, so the dock's slot is announced as busy rather than
                    left blank while it arrives. */}
                <StateBoundary state="loading">{null}</StateBoundary>
              </div>
            ) : selectedException === undefined ? (
              <div className={DOCK_CLASSES}>
                {/* No exception to project: the dock explains the gap rather than showing empty axes.
                    Both sources agree on that absence here — the window answered nothing and the read
                    narrowed to the selection answered nothing — so the sentence is true. */}
                <StateBoundary state="empty" emptyMessage={FILEMAP_CANVAS_TEXT.dockEmpty}>
                  {null}
                </StateBoundary>
              </div>
            ) : detail === undefined ? (
              <div className={DOCK_CLASSES}>
                {/* Nothing to plot and no failure to report: the read that would fill this bed has not
                    answered, so the slot says it is still reading rather than disappearing (rule P-8). */}
                <StateBoundary state="loading">{null}</StateBoundary>
              </div>
            ) : (
              <div className={DOCK_CLASSES}>
                {/* The baseline the records project, and the option in view drawn over it: the same
                    `activeScenario` the preview caption names, so the caption and the dock can never
                    name two different options. */}
                <TimelineDock
                  exceptionId={selectedException.id}
                  exceptionTitle={detail.exception.title}
                  stockSeries={detail.stockSeries}
                  stockEvidenceRef={selectedException.id}
                  stockSimLabel={CALCULATION_LABEL}
                  stockOption={
                    activeScenario === undefined
                      ? undefined
                      : {
                          evidenceRef: activeScenario.id,
                          name: activeScenario.name,
                          dailyClosingStock: activeScenario.dailyClosingStock,
                          simLabel:
                            activeScenario.origin === 'seeded' ? DATA_LABEL : CALCULATION_LABEL,
                        }
                  }
                  auditEvents={auditEvents}
                  auditEmptyMessage={
                    trailRefused ? FILEMAP_CANVAS_TEXT.auditUnavailable : undefined
                  }
                />
              </div>
            )}
          </>
        )}
      </StateBoundary>
    </div>
  );
}
