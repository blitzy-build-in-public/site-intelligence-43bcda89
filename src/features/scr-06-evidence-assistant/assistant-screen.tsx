/**
 * SCR-06 Evidence assistant, the route element the router mounts at `/assistant` (stage S1).
 *
 * WHAT THIS FILE IS, AND DELIBERATELY IS NOT. It is the page wrapper and nothing else: the screen's one
 * level-one heading through `PageHeader`, and the assistant composition mounted beneath it. Every data
 * interaction — the suggested questions the service publishes, the model catalogue, the question the
 * reader asks, the cited answer, the refusal a policy or a permission produced, and the seven-state
 * decision over all of it — lives in `./assistant-panel`. AAP §0.2.1 and principle PR-1 keep the
 * assistant a cited panel beside the workspace rather than the workspace itself, so this route adds no
 * second surface of its own: no chart, no table, no figure and no state.
 *
 * WHAT THE SHELL SUPPLIES, AND WHAT IS THEREFORE ABSENT HERE. The top bar, the navigation, the
 * scope filters, the role switcher, the simulation popover and the persistent `Simulated data` badge
 * are mounted once by `src/app/app.tsx` above the router outlet, so every route carries them and no
 * route can carry two (rule P-1). This file mounts none of them.
 *
 * ONE `h1`, PRODUCED BY THE COMPONENT THAT OWNS HEADINGS (rule B-3). `PageHeader` is the only owner of
 * a screen's `h1` (AAP §0.5.2), so the title is handed to it and no heading is written here. The route
 * therefore has one level-one heading, in a correct outline, and nothing in this file adds a
 * focusable element of its own: the panel's question controls and its composer are the screen's
 * interactive content, and they are rendered by the module that owns their behaviour.
 *
 * THE PRODUCT EYEBROW ABOVE THE TITLE, SO THE HEADER SLOT READS AS ITS SIBLINGS' DO (rule P-7). The
 * header carries `Site Intelligence` above the title, the name rule P-7 fixes for the product and the
 * string scr-01, scr-04, scr-07, scr-12 and scr-13 hand to the same `PageHeader` slot. A name a rule
 * fixes is no claim about a record, so it needs none of the sourcing a figure would: every route can
 * state it without an input producing it, which is why the slot reads the same way here as there.
 *
 * NO ACTION IN THE HEADER, ON PURPOSE (rule P-8). SCR-06's one action is the composer's submit, "Ask a
 * suggested question", and it belongs to the composer because it acts on the question in the field.
 * Repeating it in the header's `actions` slot would create a second focus stop whose effect is not
 * distinct from the first's — a control a reader must visit, that asks the same nothing — which is
 * exactly the dead affordance rule P-8 bars. The header therefore carries the eyebrow and the title
 * alone, and this file renders no link and no button.
 *
 * NO STATE BOUNDARY, NO QUERY AND NO DERIVATION HERE. The panel reads through the port with React
 * Query and decides the screen state once, in one place, from what those reads settled to (rule P-2).
 * A boundary in this wrapper would be a second opinion on the same request, so the wrapper mounts the
 * panel unconditionally and lets it own loading, empty, stale, partial, offline, forbidden and
 * conflict alike (AAP §0.12.4, specification §8).
 *
 * RULES THIS FILE IS BUILT TO SATISFY.
 * - P-6: the only strings it owns are the screen title, which AAP §0.12.4 fixes as SCR-06's name, and
 *   the product eyebrow, which rule P-7 fixes. No figure, amount, date, identifier or record value is
 *   typed here.
 * - P-2: no data access at all. The seed, the mock adapter, the API client and the domain modules are
 *   not imported, and `scope` is forwarded to the panel untouched — the service intersects it with the
 *   acting role's plant scope, so narrowing it here would put a second reach rule beside the adapter's.
 * - B-1, B-2: no address, no request, no embedded asset, no credential shape, no environment read.
 * - P-1, P-3, P-4, P-5, P-7: nothing here presents a model as connected, implies that a permission
 *   check is production authorisation, claims a deployment property, renders a market-intelligence
 *   value, or names anything but the product's own vocabulary.
 */
import type { ReactElement } from 'react';

import { PageHeader } from '../../components/page-header';
import type { Scope } from '../../types';
import { AssistantPanel } from './assistant-panel';

/* ---------------------------------------------------------------------------------------------
 * The wording this module owns
 * ------------------------------------------------------------------------------------------- */

/**
 * The strings this screen states.
 *
 * The title is AAP §0.12.4's own name for SCR-06, and the navigation entry that reaches this route
 * carries the same label, so the two cannot describe the route differently. The eyebrow is the
 * product name, which rule P-7 fixes rather than a record producing it, and it fills the same
 * `PageHeader` slot scr-01, scr-04, scr-07, scr-12 and scr-13 fill, so the header reads alike on
 * every route that carries one. Both are held here rather than written into the JSX so the wording
 * has a single owner, the way the sibling screens hold theirs. No description and no stage note is
 * added: a supporting line would be a sentence this screen authored about what the assistant says,
 * and rule P-6 leaves every such claim to the records.
 */
const SCREEN_TEXT = {
  /** The eyebrow above the title: the product name rule P-7 fixes. */
  eyebrow: 'Site Intelligence',

  /** The screen's title, in the one level-one heading it renders through `PageHeader`. */
  title: 'Evidence assistant',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The layout, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The page column: the header, then the panel, separated by the 4 px grid rather than by margins.
 *
 * One column at every width — the panel is a sentence list and a form, both of which read best at the
 * container's width — so no breakpoint utility and no custom media query appears here (AAP §0.12.4).
 * The sibling screens carry the same list, so a reader moving between routes sees the sections sit at
 * the same distance from one another.
 */
const SCREEN_CLASSES = 'flex min-w-0 flex-col gap-6';

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * Props for {@link AssistantScreen}.
 *
 * Every member is optional, and each one that a caller may omit is typed `| undefined` so the router
 * may render `<AssistantScreen />` with nothing to pass. `src/app` is written separately from this
 * folder, so the exact set the router hands a screen is not fixed here; making a prop required would
 * break the route the day the router renders the element without it, and adding a required shape
 * would have this file dictate the shell's instead of accepting it.
 */
export interface AssistantScreenProps {
  /**
   * The shell's plant and product selection, forwarded to the panel unchanged.
   *
   * The assistant's three reads take no scope: the adapter applies the acting role's own reach before
   * it answers, and no member of the port accepts a selection. The member therefore travels with the
   * panel so the shell can pass one set of props to every screen, and this file neither derives,
   * filters nor amends it (rule P-2).
   */
  readonly scope?: Scope | undefined;

  /**
   * The identifier of a suggested question to place in the composer before the reader asks anything.
   *
   * Passed straight through: the panel resolves it against the questions the service published, so a
   * prompt on screen is the record's own text, and an identifier the service does not know leaves the
   * composer empty rather than inventing a question (rule P-6).
   */
  readonly initialQuestionId?: string | undefined;
}

/**
 * SCR-06's route element, at `/assistant`.
 *
 * The page heading and the assistant panel, in that order, and nothing else. The panel reaches the
 * service port through `useService()` and owns every read, the chosen model, the reader's draft, the
 * answer and the refusal, so this component holds no state, starts no effect and reads no record: it
 * is a composition, which is what lets SCR-06 appear both as this route and as the shell's side panel
 * from the same module (AAP §0.12.4).
 *
 * @param props - The shell's plant and product selection and an optional question to preselect. See
 *   {@link AssistantScreenProps}.
 * @returns The page header and the assistant panel, in one column.
 */
export function AssistantScreen({
  scope,
  initialQuestionId,
}: AssistantScreenProps): ReactElement {
  return (
    <div className={SCREEN_CLASSES}>
      {/* The product eyebrow and the title, and no `actions` slot: the composer's submit is the
          screen's one action and belongs to the panel (rule P-8). */}
      <PageHeader title={SCREEN_TEXT.title} eyebrow={SCREEN_TEXT.eyebrow} />

      <AssistantPanel variant="page" scope={scope} initialQuestionId={initialQuestionId} />
    </div>
  );
}
