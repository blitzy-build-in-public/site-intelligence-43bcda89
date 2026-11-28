/**
 * The drawer every displayed figure opens, and the reference that opens it.
 *
 * WHY THIS PAIR EXISTS. Rule P-6 of the project rules — restated as principle PR-6 in
 * `platform-specification.md` — makes every figure on screen answerable: a reader must be able to
 * reach the source, the record, the instant, the freshness and the formula behind any number,
 * chart mark, node, arc or pin. `EvidenceRef` is the wrapper that makes that reachable and
 * {@link EvidenceDrawer} is the surface it opens, so a figure reaches a screen wrapped in an
 * `EvidenceRef` and never as bare text (AAP §0.12.4, §0.13.2, functional requirement F12).
 *
 * THE DATA IT SHOWS, AND WHERE EACH PART COMES FROM. The record is the port's own read —
 * `getEvidence(ref)`, which contracts §9 states as `GET /evidence?ref=` — and this module computes
 * nothing from it (rule P-6): every string below is a field of the `Evidence` record or of the
 * `Result.meta` that qualified the call, quoted as the service supplied it. `Evidence` carries ten
 * fields (AAP §0.12.2) and no single field names its freshness, so the four sections are derived
 * from those fields and from the freshness array the service returns beside them:
 *
 * 1. **Value and formula** — `Evidence.value`, rendered through the one presentation formatter with
 *    `Evidence.label` beside it, and `Evidence.formula`, the rule that produced it.
 * 2. **Source, record and time** — the reference the figure carries, `Evidence.provenance`, and the
 *    six sources' `Freshness` records from the result's metadata: each source's name as plain detail
 *    text beside its state, which the shared freshness mapping turns into the status primitive's
 *    meaning, icon and colour, with the instant it last answered.
 * 3. **Inputs, upstream and downstream** — `Evidence.inputs`, `Evidence.upstream` and
 *    `Evidence.downstream`, the records the value was built from and the records that depend on it.
 * 4. **Confidence, missing inputs and documents** — `Evidence.confidence`, whose level is shown as
 *    the status it is (the meaning's icon, the level's own word and the status role colour) with its
 *    reason beside it, `Evidence.missingInputs` and the `Evidence.documents` behind it.
 *
 * A section whose record carries no content for it is not rendered at all, so the drawer never
 * shows an empty heading or a blank line standing in for a value it does not have.
 *
 * WHY THE DRAWER IS SELF-CONTAINED. A component in this folder may not import `src/app` — the shell
 * imports the component layer, and reaching back would invert the layer direction and close a
 * cycle — so there is deliberately no shell-level drawer provider, no context and no global
 * registration here. `EvidenceRef` owns one open flag and mounts its own {@link EvidenceDrawer}
 * instance, and a screen that needs a standalone drawer renders `EvidenceDrawer` directly with its
 * own `onClose`. That keeps the decision reversible in this one file: if the shell later owns a
 * single shared drawer, the change lands here and nowhere else.
 *
 * FOCUS, KEYBOARD AND THE POINTER — rule B-3, WCAG 2.2 AA. The trigger is a native `<button>` whose
 * accessible name is the visible value plus a visually hidden "— open evidence", so a screen reader
 * user hears both what the figure is and what activating it does (SC 2.5.3, label in name). The
 * drawer is a `role="dialog"` region named by its own heading, focus moves into it when it opens,
 * `Tab` and `Shift+Tab` cycle inside it, `Escape` closes it, and focus returns to the element that
 * opened it — the triggering figure — when it unmounts. It claims `aria-modal` in the overlay form
 * only: from 1280 px the panel is docked beside a page that stays readable and operable, and the
 * claim there would tell assistive technology the rest of the page is inert when it is not (AAP
 * §0.12.4). Both controls keep the 24x24 px minimum target and the 2 px focus ring the token layer
 * fixes, and the only transition in the file is a colour change carried by `motion-safe:`, so
 * nothing here ignores `prefers-reduced-motion`.
 *
 * THE DRAWER IS RENDERED THROUGH A PORTAL, and that is a markup decision rather than a stylistic
 * one: a figure sits inside a table cell, beside a chart or in the middle of a sentence, and a
 * fixed-position container nested inside a paragraph is invalid HTML that a browser silently
 * reparses. Rendering the dialog into `document.body` keeps the trigger where the sentence needs it
 * and the dialog outside any flow that could break it.
 *
 * THAT PORTAL IS WHY THE DOCKED COLUMN IS RESERVED ELSEWHERE. The panel is positioned against the
 * viewport, not against the page, so the page's own flow would make no room for it and a docked
 * drawer would lie over the content it is supposed to sit beside. The reservation is taken on the
 * document element instead, by {@link reserveDockedColumn}, and `src/styles/index.css` turns it into
 * the body's inline-end padding for exactly as long as a docked drawer holds it — AAP §0.12.4's
 * "docked from 1280 px, an overlay below it", with nothing reserved below the breakpoint, where the
 * panel covers the viewport rather than sharing it.
 *
 * THE DRAWER IS A FIGURE CARRIER IN ITS OWN RIGHT, so it prints the label the record carries (rule
 * P-1, AAP §0.10). This is the one place a reader goes to inspect a computed figure, so the value row
 * shows `Evidence.label` — the exact §5.3 string the service attached to that record — beside the
 * value, through the shared status primitive that pairs the icon, the label and the colour. It
 * chooses no label of its own and holds no provenance-to-label map: the record's typed `SimLabel` is
 * the stronger source and cannot disagree with the figure it belongs to.
 *
 * WHAT IT DOES NOT DO. It states no security property of the workspace — no sentence claims
 * that anything is confined, uncopyable or resistant to alteration (rule P-4); it reports a
 * provenance and a freshness and nothing more. It blends nothing (rule P-5): the provenance is shown
 * as the record states it, so a market-intelligence reading is named as one rather than presented as
 * a first-party figure. It fetches nothing and reads no configuration (rules B-1, B-2) — the icons
 * are bundled Phosphor components, and the only data access is `useService()` (rule P-2).
 *
 * THE REFERENCE PROP IS NAMED `ref`, WHICH IS THE NAME AAP §0.5.2 FIXES FOR IT. React 19 hands
 * `ref` to a function component as an ordinary prop — it is read from `props` here exactly as
 * `children` is — so the plan's spelling needs no deviation and no `forwardRef` wrapper.
 * {@link EvidenceDrawer} and `MetricTile` keep their own `evidenceRef` member, the spelling that same
 * plan section gives those two, so only this primitive's contract follows §0.5.2's `ref: string`.
 */
import { ArrowUpRight, X } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useService } from '../services/service-provider';
import { SOURCE_LABELS } from '../types';
import type { ConfidenceLevel, Evidence, Freshness, Problem, ScreenState, WriteBack } from '../types';
import { freshnessMeaning } from './freshness-pill';
import { MonoValue } from './mono-value';
import { Panel } from './panel';
import { STATE_BOUNDARY_TEXT, StateBoundary } from './state-boundary';
import type { StateBoundaryForbidden } from './state-boundary';
import { StatusIndicator } from './status-indicator';
import type { StatusMeaning } from './status-indicator';
import { ActionButton, CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from './tooltip';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this module states, held here so the wording has one owner: the components below
 * render these strings and a suite names them through this object instead of retyping them.
 *
 * None of these is a fixed specification string. The seven §5.3 simulation labels belong to the
 * figures that carry them (rule P-1), the retry label is `STATE_BOUNDARY_TEXT.retryLabel` because the
 * state boundary already owns it, and the record's own sentences — the formula, the confidence
 * reason, the missing inputs — arrive with the record and are never paraphrased here (rule P-6).
 * Nothing below carries a figure, an amount, a date or a record identifier, and nothing states a
 * claim about where a record is held or whether it could be altered (rule P-4).
 *
 * The four section labels are the grouping AAP §0.12.4 leaves to the implementation: the plan fixes
 * which fields the drawer shows, not how they group, so each label names the fields beneath it.
 */
export const EVIDENCE_DRAWER_TEXT = {
  /** The drawer's heading, which is also its accessible name. */
  title: 'Evidence',

  /**
   * The visually hidden completion of the trigger's accessible name. The visible value comes first,
   * so the name still contains what the reader sees (WCAG 2.2 SC 2.5.3) and then says what
   * activating it does.
   */
  openSuffix: '— open evidence',

  /** The close control's visible label. */
  closeLabel: 'Close',

  /** Section 1: the value and the rule that produced it. */
  valueSection: 'Value and formula',

  /** The value row's caption. */
  valueLabel: 'Value',

  /** The formula row's caption. */
  formulaLabel: 'Formula',

  /** Section 2: the reference, the provenance and the six sources' freshness. */
  sourceSection: 'Source, record and time',

  /** The reference row's caption. */
  recordLabel: 'Record',

  /** The provenance row's caption. */
  provenanceLabel: 'Provenance',

  /** The freshness list's caption. */
  freshnessLabel: 'Source freshness',

  /** Section 3: what fed the value and what depends on it. */
  linksSection: 'Inputs, upstream and downstream',

  /** The inputs list's caption. */
  inputsLabel: 'Inputs',

  /** The upstream list's caption. */
  upstreamLabel: 'Upstream',

  /** The downstream list's caption. */
  downstreamLabel: 'Downstream',

  /** Section 4: the judgement the record carries about its own value. */
  judgementSection: 'Confidence, missing inputs and documents',

  /** The confidence row's caption. */
  confidenceLabel: 'Confidence',

  /** The missing-inputs list's caption. */
  missingInputsLabel: 'Missing inputs',

  /** The documents list's caption. */
  documentsLabel: 'Documents',

  /**
   * The failure region's headline. It says what the drawer could not do and nothing about why,
   * because the reason is the service's own sentence and is printed beneath it.
   */
  failureHeadline: 'The evidence behind this figure could not be read',

  /** Shown only when the failure arrived without a message, so the region is never silent. */
  failureFallback: 'The read stopped without reporting a cause.',

  /**
   * The drawer's own sentence for a failure that did not arrive in the service's shape — a read that
   * rejected with something carrying no `Problem` at all — so that case states what happened instead
   * of leaving a heading over an empty body.
   *
   * It states no cause, because the drawer has none to state, and no security property of any kind
   * (rule P-4). It is word for word the sentence the grant dialog states for the same case: one
   * wording exists for a call that stopped without reporting why. The drawer repeats it here rather
   * than importing it, because a component may not reach into a feature module — the dependency runs
   * the other way, features importing components.
   */
  unreportedFailure: 'The call stopped without reporting a cause.',

  /** The label the correlation identifier is printed under, so a reader can quote it. */
  traceLabel: 'Trace',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The references a figure is composed from
 * ------------------------------------------------------------------------------------------- */

/**
 * The root of a write-back step's reference: `write-back:<ownerId>/<sequence>`.
 *
 * Held here, once, because this module owns the composing half of the grammar the evidence read
 * resolves: a second spelling of the root in a screen or a component is how a reference and the read
 * that answers it drift apart.
 */
const WRITE_BACK_STEP_REF_ROOT = 'write-back';

/**
 * The reference one step of a plan's simulated write-back carries.
 *
 * Contracts §3 gives `WriteBack` a position, a system, the reference it writes, its description and its
 * state — and no identifier of its own — so a step is addressed by the record its steps belong to and
 * the position the record states: `write-back:<ownerId>/<sequence>`, where the owner is an approval or
 * a response option. Both values are the caller's: the owner's identifier arrives from the screen that
 * read the record and the position is the record's own `sequence`, so this function names no record,
 * counts no step and holds no figure (rules P-6 and P-2), and the two surfaces that draw steps compose
 * one reference the same way rather than each spelling the grammar (AAP §0.5.2's one primitive for a
 * figure's evidence).
 *
 * @param ownerId - The identifier of the approval or the option whose write-back the step belongs to.
 * @param step - The step, exactly as the record states it.
 * @returns The reference the evidence read resolves to that step.
 */
export function writeBackStepRef(ownerId: string, step: WriteBack): string {
  return `${WRITE_BACK_STEP_REF_ROOT}:${ownerId}/${step.sequence}`;
}

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The trigger: the figure itself, wrapped in a native button and marked as opening something.
 *
 * It keeps the visible figure's own type and colour — the figure is the label, so the control adds
 * no font size, weight or colour of its own to it — and adds the two things a reader needs to see:
 * an underline in the control-boundary role — the role the token layer assigns to a control's
 * boundary, so the mark reads as an affordance in both themes — and the 2 px `--color-focus-ring`
 * outline on `:focus-visible`. `min-h-6 min-w-6` is the 24x24 px minimum target rule B-3 requires,
 * and the colour transition is `motion-safe:` so a reduced-motion session gets the change without
 * the animation.
 *
 * `relative` is not decoration: the visually hidden `sr-only` completion of the accessible name is
 * `position: absolute`, so without a positioned ancestor it resolves against the initial containing
 * block and escapes the box of whatever scrolls around it. A figure inside a table that scrolls
 * sideways on a narrow viewport would then be laid out at its column's full width in the document
 * itself, and the page would scroll sideways to reach a string nobody can see.
 */
const TRIGGER_CLASSES = [
  'relative inline-flex min-h-6 min-w-6 items-center gap-1 rounded-control text-left underline',
  'decoration-control-boundary underline-offset-2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
  'hover:decoration-accent',
].join(' ');

/** The trigger's own mark: decorative, so it is hidden from assistive technology. */
const TRIGGER_ICON_CLASSES = 'size-3 shrink-0';

/**
 * The portal host. It covers the viewport so the dialog can dock against one of its edges, and it
 * takes no pointer events of its own: the dialog re-enables them, which is what leaves the page
 * beside a docked drawer readable and operable from 1280 px up.
 */
const CONTAINER_CLASSES = 'pointer-events-none fixed inset-0 z-40';

/**
 * The dialog panel.
 *
 * Below the `xl` breakpoint it is the overlay the plan requires: it takes the whole viewport, so
 * there is no sliver of page beside it competing for attention. From 1280 px up it is docked —
 * 420 px wide against the inline end of the viewport, which is the width AAP §0.12.4 fixes — and the
 * page beside it stays readable. The surface is the first raised surface inside the decorative
 * hairline at the panel radius, with no elevation: the token layer clears Tailwind's shadow
 * namespace, so no shadow utility exists to add (specification §4.3, rule B-3).
 *
 * `start-auto` overrides the `start-0` that the overlay form needs, and `xl:border-s` supplies the
 * hairline that separates a docked drawer from the page. Both are logical properties, so the drawer
 * docks and borders on the correct side in either writing direction.
 *
 * The `xl` variant here and {@link DOCKED_QUERY} below decide the same width, so both name it in the
 * same unit: these variants resolve against Tailwind's `80rem` for `xl`, and that query states
 * `80rem` for the same reason rather than a pixel width that would disagree with them whenever the
 * browser's default font size is not 16 px. This class list shapes the panel; that query tells the
 * dialog which shape it is in, so the modality claim follows the presentation rather than the
 * stylesheet.
 *
 * The 420 px is stated once more, in `--evidence-drawer-dock-width` at the top of `@layer base` in
 * `src/styles/index.css`, where it reserves the column the panel occupies so the page narrows beside
 * the panel instead of being covered by it (see {@link reserveDockedColumn}). The two are one value
 * in two places — a class the panel must carry and a length a stylesheet must know — so a change to
 * either is a change to both.
 */
const DRAWER_CLASSES = [
  'pointer-events-auto absolute inset-y-0 start-0 flex w-full min-w-0 flex-col gap-3 overflow-y-auto',
  'border-hairline bg-surface-1 p-4 text-14 text-text-primary',
  'focus-visible:outline-2 focus-visible:outline-focus-ring',
  'xl:start-auto xl:end-0 xl:w-[420px] xl:border-s',
].join(' ');

/** The drawer's heading row: the title block, and the close control beside it. */
const HEADER_CLASSES = 'flex min-w-0 items-start justify-between gap-3';

/** The title block: the heading and the reference the figure carries. */
const HEADER_TEXT_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The heading itself. Focus is moved to the dialog rather than to this text, so it is not a stop. */
const TITLE_CLASSES = 'text-20 font-semibold text-text-primary';

/** The reference line under the heading, in the secondary text role. */
const RECORD_LINE_CLASSES = 'text-13 break-words text-text-secondary';

/** The close control keeps its own intrinsic width so a long heading wraps instead of pushing it. */
const CLOSE_CLASSES = 'shrink-0';

/** A bundled icon inside a control: decorative, sized by CSS rather than by an attribute. */
const ICON_CLASSES = 'size-3 shrink-0';

/** The drawer's body: one column, separated by the 4 px grid rather than by margins. */
const BODY_CLASSES = 'flex min-w-0 flex-col gap-3';

/** One labelled group inside a panel or a definition list. */
const GROUP_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The caption of a group, at the smallest step of the type scale. */
const LABEL_CLASSES = 'text-12 text-text-caption';

/** Body text that carries a record's own sentence. Long values wrap rather than overflow. */
const TEXT_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/** The value row, one step up the type scale because it is the figure the drawer was opened for. */
const VALUE_CLASSES = 'min-w-0 break-words text-16 text-text-primary';

/** Supporting detail — a source's name, an instant, a reason, a correlation identifier. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** A stacked list of record values. */
const LIST_CLASSES = 'flex min-w-0 flex-col gap-1';

/** One list entry. */
const LIST_ITEM_CLASSES = 'min-w-0 break-words';

/** One source's freshness inside section 2: its name, its state as the status and the instant. */
const FRESHNESS_ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

/**
 * What each confidence level amounts to in the shared status vocabulary.
 *
 * A confidence level is an enumerated value, so the drawer shows it the way every other enumerated
 * value in the interface is shown — the meaning's icon, the level's own word and a status role colour
 * together (rule B-3, AAP §0.5.2) — rather than as unmarked mono prose. The mapping is the one the
 * rest of the product already states for this field: a high reading is a pass, a medium one is
 * something to review, and a low one is the warning that the evidence rests on little. It is
 * exhaustive by type, so a fourth level fails compilation here rather than rendering a status with
 * nothing to tell it apart but its word.
 */
const CONFIDENCE_MEANINGS = {
  high: 'pass',
  medium: 'review',
  low: 'warning',
} as const satisfies Record<ConfidenceLevel, StatusMeaning>;

/**
 * A notice on the second raised surface, inside the decorative hairline at the card radius, as the
 * freshness pill and the state boundary paint their own. Every value is a role token, so both themes
 * resolve the pairing the specification measured, and no elevation utility exists to add.
 */
const NOTICE_CLASSES =
  'flex min-w-0 flex-col gap-2 rounded-card border border-hairline bg-surface-2 px-2 py-2';

/* ---------------------------------------------------------------------------------------------
 * The reference: the wrapper a figure reaches a screen through
 * ------------------------------------------------------------------------------------------- */

/**
 * What a figure hands {@link EvidenceRef}: the reference it carries in the service's own form and
 * the figure itself, already formatted by the module that computed it. Both describe one record,
 * and the visible value has to be the figure a reader is pointing at rather than a label for the
 * evidence behind it, because it starts the trigger's accessible name (AAP §0.12.4, contracts §9).
 */
export interface EvidenceRefProps {
  /**
   * The reference the figure carries, in the service's own form — the identifier `getEvidence`
   * resolves and the string the drawer prints as the record behind the value.
   *
   * Named `ref` because AAP §0.5.2 fixes this primitive's prop that way. React 19 passes `ref` to a
   * function component as an ordinary prop, so the plan's name is the one that reaches `props` and
   * the value is not intercepted (see the module note above).
   */
  readonly ref: string;

  /**
   * The figure itself, already formatted by the module that computed it — usually a `MonoValue`.
   *
   * Required, and rendered as the control's visible content, because the visible value has to be the
   * start of the control's accessible name (WCAG 2.2 SC 2.5.3): a trigger labelled "open evidence"
   * with the value hidden would not let a speech-input user name the figure they are pointing at.
   */
  readonly children: ReactNode;

  /** Layout-only additions from the calling cell, chart frame or sentence. Never a colour. */
  readonly className?: string | undefined;
}

/**
 * Wraps one displayed figure in the control that opens its evidence.
 *
 * The element is a native `<button type="button">`, so it is keyboard operable, reachable by a
 * speech-input user by its visible label, and announced as a control rather than as text. It carries
 * `aria-haspopup="dialog"` always, and `aria-controls` pointing at its own drawer's id while that
 * drawer is open, so the relationship is exposed exactly while it exists.
 *
 * The component renders in two places — a table cell, a chart's frame and the middle of a sentence —
 * so it introduces no block-level box of its own: the button is inline content and the drawer it
 * mounts goes to `document.body` through a portal (see the module note). It is also usable with no
 * provider of its own: the only context it reads is the service, and only once the drawer is open.
 */
export function EvidenceRef({ ref, children, className }: EvidenceRefProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = useId();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? drawerId : undefined}
        onClick={() => {
          setIsOpen(true);
        }}
        className={joinClasses(TRIGGER_CLASSES, className)}
      >
        {children}
        <ArrowUpRight aria-hidden="true" focusable="false" className={TRIGGER_ICON_CLASSES} />
        <span className="sr-only">{EVIDENCE_DRAWER_TEXT.openSuffix}</span>
      </button>
      {isOpen ? (
        <EvidenceDrawer
          id={drawerId}
          evidenceRef={ref}
          onClose={() => {
            setIsOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
/* ---------------------------------------------------------------------------------------------
 * The drawer
 * ------------------------------------------------------------------------------------------- */

/**
 * The width at which {@link DRAWER_CLASSES} stops covering the viewport and docks 420 px against the
 * inline end — Tailwind's `xl` breakpoint, which AAP §0.12.4 states as "docked from 1280 px, an
 * overlay below it".
 *
 * The query is written in `rem`, the unit the class list's `xl:` variants resolve against, and never
 * in `px`. Tailwind 4 defines `xl` as `80rem`, which is 1280 px only while the browser's default font
 * size is 16 px: a query stated in `px` would keep matching at that fixed pixel width after the `xl:`
 * classes had stopped applying, so a reader whose default font size is larger would get a panel
 * covering the viewport while the dialog had already dropped its modality claim. Stating both sides
 * of the breakpoint in `rem` keeps them font-relative, so the styling and the claim cannot disagree
 * at any default font size.
 */
const DOCKED_QUERY = '(min-width: 80rem)';

/**
 * Whether the viewport currently calls for the docked presentation, read synchronously.
 *
 * Read during the first render rather than after it, so the dialog's modality claim is right on the
 * frame it appears and never flips once an effect has run. An environment with no `matchMedia` at
 * all — the jsdom test environment, which implements no media query, and any pass without a DOM —
 * answers `false` and therefore gets the overlay presentation: a modal claim is accurate while the
 * panel covers the viewport, and it is the safe default for an environment that cannot report a
 * width.
 */
function matchesDockedQuery(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia(DOCKED_QUERY).matches;
}

/**
 * The presentation the drawer is in, kept current while it stays open.
 *
 * The state starts from a synchronous read of the same query, and the effect subscribes to the
 * query's `change` event, so a resize across the docked breakpoint moves the drawer between its docked
 * and overlay forms without a remount and the modality claim follows it. The effect also re-reads the
 * query once on mount, because the subscription only reports changes that happen after it exists. The
 * listener is removed when the drawer unmounts, so nothing stays registered after it closes.
 */
function useDockedPresentation(): boolean {
  const [isDocked, setIsDocked] = useState(matchesDockedQuery);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const query = window.matchMedia(DOCKED_QUERY);

    setIsDocked(query.matches);

    function handleChange(event: MediaQueryListEvent): void {
      setIsDocked(event.matches);
    }

    query.addEventListener('change', handleChange);

    return () => {
      query.removeEventListener('change', handleChange);
    };
  }, []);

  return isDocked;
}

/**
 * The attribute the stylesheet reads to reserve the docked column inside the page's own layout.
 *
 * An attribute on the document element rather than a class on some wrapper, because there is no
 * wrapper to put one on: the panel is portalled to `document.body` and the page around it belongs to
 * the shell, which this folder may not render into (see the module note). The attribute makes the
 * reservation a fact about the document while a drawer is open — visible to the stylesheet, to a
 * browser check and to a reader inspecting the page — and `src/styles/index.css` pairs it with the
 * drawer's width at the same `80rem` breakpoint {@link DOCKED_QUERY} names (AAP §0.12.4).
 */
const DOCKED_COLUMN_ATTRIBUTE = 'data-evidence-docked';

/**
 * The drawers that currently hold the docked column, one entry per mounted docked drawer.
 *
 * A count rather than a flag, because the docked drawer is not modal: two figures may be open at
 * once, each `EvidenceRef` mounting its own drawer, and a flag — or a last-writer-wins attribute —
 * would let the first drawer to close release a column the second still occupies, sliding the page
 * back underneath a panel that is still open. The owners are opaque symbols because nothing needs to
 * name a drawer; only whether the set is empty matters.
 */
const dockedColumnOwners = new Set<symbol>();

/**
 * Reserves the docked column for the caller and answers the release that gives it back.
 *
 * Called from the drawer's effect while `isDocked` holds (see the module note for why the column has
 * to be reserved outside the portal at all). Each call takes its own ownership, so an effect that
 * runs again — a remount, or a resize that crosses the breakpoint and back — is given a release of
 * its own as well, and the attribute leaves the document only when the last ownership is released.
 * Nothing is reserved, and nothing is thrown away, in an environment with no document to reserve it
 * on.
 *
 * @returns The release for this ownership; call it once, from the effect's cleanup.
 */
function reserveDockedColumn(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  const owner = Symbol('evidence-drawer');

  dockedColumnOwners.add(owner);
  document.documentElement.setAttribute(DOCKED_COLUMN_ATTRIBUTE, '');

  return () => {
    dockedColumnOwners.delete(owner);

    if (dockedColumnOwners.size === 0) {
      document.documentElement.removeAttribute(DOCKED_COLUMN_ATTRIBUTE);
    }
  };
}

/**
 * What a mount point hands {@link EvidenceDrawer} directly, for a screen that owns the open state:
 * the reference `getEvidence` resolves, the handler that closes the panel, and, where a trigger
 * announced the dialog, its id. The caller keeps that open flag, because the drawer never decides
 * to close — the close control, `Escape` and the caller's own state all end in one `onClose`.
 */
export interface EvidenceDrawerProps {
  /**
   * The reference whose evidence is shown: the identifier `getEvidence` resolves, printed in the
   * header and used as the query cache key.
   */
  readonly evidenceRef: string;

  /**
   * Closes the drawer.
   *
   * Called by the close control, by `Escape` and by nothing else — the drawer never decides on its
   * own that it should close, so the component that mounted it owns that state in one place.
   */
  readonly onClose: () => void;

  /**
   * The dialog element's id, supplied by `EvidenceRef` so the trigger's `aria-controls` resolves to
   * it while the drawer is open.
   *
   * Optional because a screen may render the drawer directly: without an id the dialog is still
   * named by its heading and still behaves identically, and only the programmatic relationship from
   * a trigger is absent.
   */
  readonly id?: string | undefined;
}

/**
 * The evidence behind one figure, in whichever of its two presentations the viewport calls for.
 *
 * The dialog is portalled into `document.body` (see the module note) and named by its own heading.
 * Below 1280 px it covers the viewport and claims `aria-modal`, so assistive technology treats the
 * page behind it as inert while it is open. From 1280 px it docks at 420 px against the inline end
 * (AAP §0.12.4) and claims no modality at all — the attribute is absent rather than `"false"`, so no
 * form of the claim reaches a reader — because the page beside it stays readable and operable.
 * {@link useDockedPresentation} is what tells the two apart, and while it reports a docked drawer the
 * column that drawer occupies is reserved on the document element ({@link reserveDockedColumn}), so
 * the page narrows into the remaining width instead of running on underneath the panel.
 *
 * FOCUS — the effect that moves focus. On mount it records the element that had focus, moves focus
 * to the dialog itself (not to its first control, so a screen reader announces the dialog's name and
 * role before its contents), and on unmount it returns focus to the element it recorded. `Tab`
 * cycling and `Escape` are handled by the dialog's own `onKeyDown`: no listener is registered on the
 * document, so nothing outside the drawer changes behaviour while it is open, and nothing remains
 * registered after it closes.
 *
 * DATA — `useQuery`, keyed by the port method's name and the reference, read through `useService()`.
 * The read is wrapped in `StateBoundary` so the pending call renders the shared skeleton and a
 * permission refusal renders the shared forbidden card. Every other failure renders
 * {@link FailureRegion}, which has two shapes and invents neither of them: a failure the service
 * raised in its own `Problem` shape is printed character for character with the correlation
 * identifier beside it, and a read that stopped for anything else gets the drawer's own sentence
 * and a retry, with no cause, permission, role or trace id supplied in its place. The boundary's
 * `offline` notice states that no source answered, and a reference the records do not hold did not
 * fail for that reason, so the drawer reports the cause it was given rather than one it does not
 * know (rule P-6).
 */
export function EvidenceDrawer({ evidenceRef, onClose, id }: EvidenceDrawerProps): ReactElement {
  const service = useService();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const isDocked = useDockedPresentation();

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['getEvidence', evidenceRef],
    queryFn: () => service.getEvidence(evidenceRef),
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      /* An SVGElement is accepted as well as an HTMLElement, because a chart's mark is an `<g
         role="button" tabindex="0">` — the element that opened the drawer in a line, grouped-bar or
         radar surface — and a guard against `HTMLElement` alone left those marks' readers on `<body>`
         after the dialog closed, against WCAG 2.2 SC 2.4.3. Both interfaces carry `focus()`. */
      if (
        (previouslyFocused instanceof HTMLElement ||
          previouslyFocused instanceof SVGElement) &&
        previouslyFocused.isConnected
      ) {
        previouslyFocused.focus();
      }
    };
  }, []);

  /* The docked panel shares the page rather than covering it, so the column it occupies is reserved
     on the document while it is docked and given back when it closes or when the viewport drops
     below the breakpoint again: `src/styles/index.css` pads the body's inline end by the drawer's
     width exactly while the attribute this effect holds is present (AAP §0.12.4). The reservation is
     ref-counted by {@link reserveDockedColumn}, so the two docked drawers a reader may have open at
     once keep the column until the last of them closes. */
  useEffect(() => {
    if (!isDocked) {
      return undefined;
    }

    return reserveDockedColumn();
  }, [isDocked]);

  const problem = asProblem(error);
  const forbidden = toForbidden(problem);

  /* The two states `StateBoundary` can render exactly for this drawer: the pending read, and a
     refusal that carries the permission and the roles that hold it. Every other failure is the
     caller's to describe, so the boundary passes its content through unchanged and the failure
     region inside it says what happened. */
  const boundaryState: ScreenState | undefined = isPending
    ? 'loading'
    : forbidden !== null
      ? 'forbidden'
      : undefined;

  /** Repeats the read. `refetch` settles its own rejection, so the result is deliberately dropped. */
  function requestRetry(): void {
    void refetch();
  }

  function renderBody(): ReactNode {
    if (isPending) {
      return null;
    }

    if (problem !== null) {
      return forbidden !== null ? null : (
        <FailureRegion problem={problem} onRetry={requestRetry} />
      );
    }

    if (data === undefined) {
      /* The read settled with no record and no `Problem`: a rejection that did not arrive in the
         service's shape, so there is no cause to print and none is invented. The failure region
         still says that the read stopped and offers the retry, rather than leaving the dialog's
         header and close control over an empty body. */
      return <FailureRegion problem={null} onRetry={requestRetry} />;
    }

    return (
      <EvidenceSections
        evidenceRef={evidenceRef}
        evidence={data.data}
        freshness={data.meta.freshness}
      />
    );
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'Tab') {
      trapTab(event, dialogRef.current);
    }
  }

  return createPortal(
    <div className={CONTAINER_CLASSES}>
      <div
        ref={dialogRef}
        id={id}
        role="dialog"
        aria-modal={isDocked ? undefined : 'true'}
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={DRAWER_CLASSES}
      >
        <div className={HEADER_CLASSES}>
          <div className={HEADER_TEXT_CLASSES}>
            <h2 id={titleId} className={TITLE_CLASSES}>
              {EVIDENCE_DRAWER_TEXT.title}
            </h2>
            <p className={RECORD_LINE_CLASSES}>
              {EVIDENCE_DRAWER_TEXT.recordLabel}{' '}
              <MonoValue value={evidenceRef} kind="id" />
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={joinClasses(
              CONTROL_STRUCTURE_CLASSES,
              SECONDARY_CONTROL_CLASSES,
              CLOSE_CLASSES,
            )}
          >
            <X aria-hidden="true" focusable="false" className={ICON_CLASSES} />
            <span>{EVIDENCE_DRAWER_TEXT.closeLabel}</span>
          </button>
        </div>
        <StateBoundary
          state={boundaryState}
          forbidden={forbidden ?? undefined}
          onRetry={requestRetry}
        >
          {renderBody()}
        </StateBoundary>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The record, as the four sections the plan fixes
 * ------------------------------------------------------------------------------------------- */

/**
 * What the drawer hands its one section renderer: the reference the record was opened by, the record
 * itself, and the six sources' freshness as the result's metadata reported it, so every section
 * lands on the same record and the freshness printed beside a value is the read's own rather than
 * one section's copy of it.
 */
interface EvidenceSectionsProps {
  /** The reference the figure carries, printed as the record behind the value. */
  readonly evidenceRef: string;

  /** The record the service returned for that reference. */
  readonly evidence: Evidence;

  /** The six sources' freshness, as the result's metadata reported it beside the record. */
  readonly freshness: readonly Freshness[];
}

/**
 * Renders the four sections of one evidence record.
 *
 * Each section is a `Panel`, which supplies the surface, the hairline and the caption, so a section
 * reads like every other grouped block in the product and no section invents its own surface. The
 * bodies are definition lists where the field has a name (value, formula, record, provenance) and
 * plain stacked groups where the caption is a heading for a list, because a `dl` whose terms name
 * lists would misdescribe both.
 *
 * A body is rendered only when the record carries content for it: `Evidence.value` and
 * `Evidence.formula` are optional in substance even though they are typed as strings, so an empty
 * one renders nothing rather than an empty row, and the two list sections disappear entirely when
 * their three lists are all empty. Nothing is substituted for a missing field — a placeholder here
 * would be a figure the record does not support (rule P-6).
 */
function EvidenceSections({
  evidenceRef,
  evidence,
  freshness,
}: EvidenceSectionsProps): ReactElement {
  const hasValue = evidence.value !== '' || evidence.formula !== '';
  const hasLinks =
    evidence.inputs.length > 0 ||
    evidence.upstream.length > 0 ||
    evidence.downstream.length > 0;
  const hasMissingInputs = evidence.missingInputs.length > 0;
  const hasDocuments = evidence.documents.length > 0;

  return (
    <div className={BODY_CLASSES}>
      {hasValue ? (
        <Panel label={EVIDENCE_DRAWER_TEXT.valueSection}>
          <dl className={LIST_CLASSES}>
            {evidence.value !== '' ? (
              <div className={GROUP_CLASSES}>
                <dt className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.valueLabel}</dt>
                <dd className={VALUE_CLASSES}>
                  {/* `Evidence.value` arrives already formatted by the module that computed it, so
                      it is rendered through the one presentation formatter with the kind that
                      passes a string through unchanged while applying the mono face and the tabular
                      figures the plan fixes for every figure. */}
                  <MonoValue value={evidence.value} kind="id" />{' '}
                  {/* The record's own `SimLabel`, printed beside the figure it belongs to: the drawer
                      carries a figure, so it states that figure's exact §5.3 label instead of
                      relying on the page-level badge (rule P-1, AAP §0.10). The label is held at the
                      detail step so the value stays the row's figure. */}
                  <StatusIndicator
                    meaning="simulated"
                    label={evidence.label}
                    className={DETAIL_CLASSES}
                  />
                </dd>
              </div>
            ) : null}
            {evidence.formula !== '' ? (
              <div className={GROUP_CLASSES}>
                <dt className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.formulaLabel}</dt>
                <dd className={TEXT_CLASSES}>{evidence.formula}</dd>
              </div>
            ) : null}
          </dl>
        </Panel>
      ) : null}

      <Panel label={EVIDENCE_DRAWER_TEXT.sourceSection}>
        <dl className={LIST_CLASSES}>
          <div className={GROUP_CLASSES}>
            <dt className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.recordLabel}</dt>
            <dd className={TEXT_CLASSES}>
              <MonoValue value={evidenceRef} kind="id" />
            </dd>
          </div>
          <div className={GROUP_CLASSES}>
            <dt className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.provenanceLabel}</dt>
            <dd className={TEXT_CLASSES}>
              <MonoValue value={evidence.provenance} kind="id" />
            </dd>
          </div>
          {freshness.length > 0 ? (
            <div className={GROUP_CLASSES}>
              <dt className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.freshnessLabel}</dt>
              <dd>
                <ul className={LIST_CLASSES}>
                  {freshness.map((record) => (
                    <li key={record.source} className={FRESHNESS_ROW_CLASSES}>
                      {/* The source's name is identity and the state is the status this row
                          reports, so the state is the status primitive's label: the meaning's icon
                          and status colour attach to the word that states a status rather than to
                          the name of the source they describe, which would otherwise be painted as
                          though the name were the reading (rule B-3). */}
                      <span className={DETAIL_CLASSES}>
                        {SOURCE_LABELS[record.source] ?? record.source}
                      </span>
                      <StatusIndicator
                        meaning={freshnessMeaning(record.state)}
                        label={record.state}
                      />
                      <MonoValue
                        value={record.asOf}
                        kind="timestamp"
                        className={DETAIL_CLASSES}
                      />
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ) : null}
        </dl>
      </Panel>

      {hasLinks ? (
        <Panel label={EVIDENCE_DRAWER_TEXT.linksSection}>
          <div className={LIST_CLASSES}>
            <ReferenceList label={EVIDENCE_DRAWER_TEXT.inputsLabel} values={evidence.inputs} />
            <ReferenceList label={EVIDENCE_DRAWER_TEXT.upstreamLabel} values={evidence.upstream} />
            <ReferenceList
              label={EVIDENCE_DRAWER_TEXT.downstreamLabel}
              values={evidence.downstream}
            />
          </div>
        </Panel>
      ) : null}

      <Panel label={EVIDENCE_DRAWER_TEXT.judgementSection}>
        <div className={LIST_CLASSES}>
          <div className={GROUP_CLASSES}>
            <p className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.confidenceLabel}</p>
            <p className={TEXT_CLASSES}>
              {/* The level is the enumerated value this section reports, so it carries the icon,
                  the word and the status colour every other enumerated value carries, and the
                  record's reason reads beside it (rule B-3, AAP §0.5.2). */}
              <StatusIndicator
                meaning={CONFIDENCE_MEANINGS[evidence.confidence.level]}
                label={evidence.confidence.level}
              />{' '}
              <span className={DETAIL_CLASSES}>{evidence.confidence.reason}</span>
            </p>
          </div>
          {hasMissingInputs ? (
            <ReferenceList
              label={EVIDENCE_DRAWER_TEXT.missingInputsLabel}
              values={evidence.missingInputs}
            />
          ) : null}
          {hasDocuments ? (
            <div className={GROUP_CLASSES}>
              <p className={LABEL_CLASSES}>{EVIDENCE_DRAWER_TEXT.documentsLabel}</p>
              <ul className={LIST_CLASSES}>
                {evidence.documents.map((documentId, index) => (
                  <li key={`${documentId}-${index}`} className={LIST_ITEM_CLASSES}>
                    <MonoValue value={documentId} kind="id" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

/** Props of one captioned list of the record's own values. */
interface ReferenceListProps {
  /** The list's caption, from {@link EVIDENCE_DRAWER_TEXT}. */
  readonly label: string;

  /** The values, exactly as the record states them. */
  readonly values: readonly string[];
}

/**
 * One captioned list of values the record supplies — its inputs, the records upstream and
 * downstream of it, or the inputs it could not read.
 *
 * An empty list renders nothing at all, which is what lets section 3 call it for all three of its
 * lists and show only the ones the record filled. Each entry is plain text rather than a mono value:
 * these strings are the record's own sentences about what fed the figure, not identifiers this
 * module could format.
 */
function ReferenceList({ label, values }: ReferenceListProps): ReactElement | null {
  if (values.length === 0) {
    return null;
  }

  return (
    <div className={GROUP_CLASSES}>
      <p className={LABEL_CLASSES}>{label}</p>
      <ul className={LIST_CLASSES}>
        {values.map((value, index) => (
          <li key={`${label}-${index}`} className={LIST_ITEM_CLASSES}>
            {value}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The failure a read can end in
 * ------------------------------------------------------------------------------------------- */

/**
 * What a failed read leaves {@link FailureRegion} to explain: the `Problem` the service raised,
 * carried whole so its own sentence is the one printed, or `null` for a rejection that arrived in
 * another shape and so has no member to print, and the handler that repeats the read the region's
 * one control offers.
 */
interface FailureRegionProps {
  /**
   * The failure that ended the read: the `Problem` the service raised, carried whole so its own
   * message can be printed, or `null` for a rejection that did not arrive in that shape and so has
   * no member this region could print.
   */
  readonly problem: Problem | null;

  /** Repeats the read. */
  readonly onRetry: () => void;
}

/**
 * What the drawer shows when the read failed for a reason the state boundary does not own.
 *
 * It renders the cause it was given and invents none (rule P-6), in one of two shapes. With the
 * service's `Problem` the sentence is `Problem.message`, printed character for character rather than
 * paraphrased, with the correlation identifier beside it so a reader can quote the call when
 * reporting it. With `null` — a rejection carrying no `Problem`, so no cause, no permission, no role
 * list and no trace id this drawer ever received — it prints the module's own sentence and no trace
 * row at all, because a correlation identifier supplied there would be one the read never reported.
 *
 * The retry control is `ActionButton`, the application's one control pattern, so the drawer repeats
 * no button styling of its own and the control keeps the minimum target and the focus ring rule B-3
 * requires; its label is the state boundary's, which already owns that wording, and activating it
 * repeats the read rather than standing as a control that cannot act (rule P-8).
 *
 * The region is announced (`role="status"`), so a reader who activated a figure is told the read
 * failed without having to hunt for the message. Its wording states what happened and nothing about
 * where a record is held or whether it could be altered (rule P-4).
 */
function FailureRegion({ problem, onRetry }: FailureRegionProps): ReactElement {
  const message =
    problem === null
      ? EVIDENCE_DRAWER_TEXT.unreportedFailure
      : problem.message !== ''
        ? problem.message
        : EVIDENCE_DRAWER_TEXT.failureFallback;

  return (
    <div className={BODY_CLASSES}>
      <div role="status" className={NOTICE_CLASSES}>
        <StatusIndicator meaning="fail" label={EVIDENCE_DRAWER_TEXT.failureHeadline} />
        <p className={TEXT_CLASSES}>{message}</p>
        {problem === null ? null : (
          <p className={DETAIL_CLASSES}>
            {EVIDENCE_DRAWER_TEXT.traceLabel}{' '}
            <MonoValue value={problem.traceId} kind="id" />
          </p>
        )}
      </div>
      <div>
        <ActionButton onClick={onRetry}>{STATE_BOUNDARY_TEXT.retryLabel}</ActionButton>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * Narrowing what was thrown, and keeping Tab inside the dialog
 * ------------------------------------------------------------------------------------------- */

/**
 * Whether a value names one of the causes `Problem.type` distinguishes.
 *
 * Written as a chain of comparisons rather than as a membership test on a list, so the narrowing is
 * a type guard the compiler accepts without a cast: `src/types/service.ts` declares the five
 * members, and a member added there fails to compile here until it is named.
 */
function isProblemType(value: unknown): value is Problem['type'] {
  return (
    value === 'permission' ||
    value === 'policy' ||
    value === 'validation' ||
    value === 'simulated-write-back' ||
    value === 'not-found'
  );
}

/**
 * The service's failure, recovered from the value a rejected query was handed.
 *
 * A service call fails by throwing its `Problem` (contracts §2), and the query cache hands that same
 * value back as an `unknown` error. The three members every failure carries are checked before the
 * value is treated as one, so a rejection that is not a `Problem` — a defect in the read rather than
 * a refusal — is never displayed as though it were a refusal: it reaches {@link FailureRegion} with
 * no problem at all, which says that the read stopped and prints no member of a failure nobody
 * raised. The remaining members are the service's to populate: only the adapter throws these, and it
 * throws a `Problem`.
 */
function asProblem(error: unknown): Problem | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  if (!('type' in error) || !('message' in error) || !('traceId' in error)) {
    return null;
  }

  if (!isProblemType(error.type)) {
    return null;
  }

  if (typeof error.message !== 'string' || typeof error.traceId !== 'string') {
    return null;
  }

  return error as Problem;
}

/**
 * The denial a permission failure explains, or `null` when the failure is of another kind.
 *
 * `StateBoundary` and `ForbiddenCard` need the permission, the roles that hold it and the trace id
 * to say who may act; a permission failure that somehow carried neither is treated as an
 * unexplained failure rather than being filled in with a guessed permission, which would name a rule
 * the reader cannot check (rules P-6, P-8).
 */
function toForbidden(problem: Problem | null): StateBoundaryForbidden | null {
  if (problem === null || problem.type !== 'permission') {
    return null;
  }

  const permission = problem.requiredPermission;
  const roles = problem.rolesWithPermission;

  if (permission === undefined || !Array.isArray(roles)) {
    return null;
  }

  return { permission, roles, reason: problem.message, traceId: problem.traceId };
}

/**
 * Everything inside the dialog that can take focus.
 *
 * The selector names the elements a browser offers a Tab stop for; the filter drops the ones it does
 * not — a negatively-tabbed element and anything hidden from assistive technology — so the first and
 * last members are the real ends of the cycle rather than elements the browser would skip.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** The dialog's focusable descendants, in document order. */
function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.tabIndex >= 0 && element.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Keeps `Tab` and `Shift+Tab` inside the dialog, so an overlay cannot be tabbed out of into the page
 * assistive technology has been told is inert, and a reader stays with the panel they opened.
 *
 * The docked presentation keeps the same cycle, and that is not a keyboard trap (WCAG 2.1.2):
 * `Escape` closes the drawer and the close control is always one stop away, so focus is releasable
 * from the keyboard in both forms. What has to follow the presentation is the modality claim, never
 * the cycle.
 *
 * The handler is bound to the dialog element rather than to the document, so nothing outside the
 * drawer changes behaviour while it is open and no listener survives it. Focus that sits on the
 * dialog itself — which is where it is put on open — is treated as the first stop for a backwards
 * move and left to the browser for a forward one, which is what makes the first Tab land on the
 * first control instead of skipping it.
 */
function trapTab(
  event: ReactKeyboardEvent<HTMLDivElement>,
  dialog: HTMLDivElement | null,
): void {
  if (dialog === null) {
    return;
  }

  const focusable = focusableElements(dialog);
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (first === undefined || last === undefined) {
    event.preventDefault();
    dialog.focus();
    return;
  }

  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || active === dialog) {
      event.preventDefault();
      last.focus();
    }

    return;
  }

  if (active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Concatenates the class names that are present, so an omitted `className` leaves no trailing space
 * and no empty entry reaches the attribute.
 */
function joinClasses(...values: readonly (string | undefined)[]): string {
  return values
    .filter((value): value is string => value !== undefined && value.length > 0)
    .join(' ');
}

