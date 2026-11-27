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
 * 1. **Value and formula** — `Evidence.value`, rendered through the one presentation formatter, and
 *    `Evidence.formula`, the rule that produced it.
 * 2. **Source, record and time** — the reference the figure carries, `Evidence.provenance`, and the
 *    six sources' `Freshness` records from the result's metadata: each source's state through the
 *    shared freshness mapping, with the instant it last answered.
 * 3. **Inputs, upstream and downstream** — `Evidence.inputs`, `Evidence.upstream` and
 *    `Evidence.downstream`, the records the value was built from and the records that depend on it.
 * 4. **Confidence, missing inputs and documents** — `Evidence.confidence` with its own reason,
 *    `Evidence.missingInputs` and the `Evidence.documents` behind it.
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
 * drawer is a `role="dialog"` region named by its own heading, `aria-modal="true"`, focus moves into
 * it when it opens, `Tab` and `Shift+Tab` cycle inside it, `Escape` closes it, and focus returns to
 * the element that opened it — the triggering figure — when it unmounts. Both controls keep the
 * 24x24 px minimum target and the 2 px focus ring the token layer fixes, and the only transition in
 * the file is a colour change carried by `motion-safe:`, so nothing here ignores
 * `prefers-reduced-motion`.
 *
 * THE DRAWER IS RENDERED THROUGH A PORTAL, and that is a markup decision rather than a stylistic
 * one: a figure sits inside a table cell, beside a chart or in the middle of a sentence, and a
 * fixed-position container nested inside a paragraph is invalid HTML that a browser silently
 * reparses. Rendering the dialog into `document.body` keeps the trigger where the sentence needs it
 * and the dialog outside any flow that could break it.
 *
 * WHAT IT DOES NOT DO. It renders no simulation label of its own (rule P-1): the figure it explains
 * already carries its exact §5.3 label where the figure is displayed, and repeating it here would
 * give one element two labels. It states no security property of the workspace — no sentence claims
 * that anything is confined, uncopyable or resistant to alteration (rule P-4); it reports a
 * provenance and a freshness and nothing more. It blends nothing (rule P-5): the provenance is shown
 * as the record states it, so a market-intelligence reading is named as one rather than presented as
 * a first-party figure. It fetches nothing and reads no configuration (rules B-1, B-2) — the icons
 * are bundled Phosphor components, and the only data access is `useService()` (rule P-2).
 *
 * A RECORDED DEVIATION FROM THE PLAN'S PROP NAME. AAP §0.5.2 spells the reference prop `ref`, which
 * cannot be used: React reserves `ref` on every component and would intercept the value instead of
 * passing it here. The prop is therefore `evidenceRef`, the spelling the same plan section already
 * uses for `MetricTile`, so the application has one spelling for one thing.
 */
import { ArrowUpRight, X } from '@phosphor-icons/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useService } from '../services/service-provider';
import { SOURCE_LABELS } from '../types';
import type { Evidence, Freshness, Problem, ScreenState } from '../types';
import { freshnessMeaning } from './freshness-pill';
import { MonoValue } from './mono-value';
import { Panel } from './panel';
import { STATE_BOUNDARY_TEXT, StateBoundary } from './state-boundary';
import type { StateBoundaryForbidden } from './state-boundary';
import { StatusIndicator } from './status-indicator';
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

  /** The label the correlation identifier is printed under, so a reader can quote it. */
  traceLabel: 'Trace',
} as const;

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
 */
const TRIGGER_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center gap-1 rounded-control text-left underline',
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

/** Supporting detail — a state token, an instant, a correlation identifier. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** A stacked list of record values. */
const LIST_CLASSES = 'flex min-w-0 flex-col gap-1';

/** One list entry. */
const LIST_ITEM_CLASSES = 'min-w-0 break-words';

/** One source's freshness inside section 2: its status, its state and the instant it answered. */
const FRESHNESS_ROW_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2';

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

/** Props of {@link EvidenceRef}. */
export interface EvidenceRefProps {
  /**
   * The reference the figure carries, in the service's own form — the identifier `getEvidence`
   * resolves and the string the drawer prints as the record behind the value.
   *
   * Named `evidenceRef` rather than the plan's `ref` because React reserves `ref` on every
   * component and would intercept it instead of passing it here (see the module note above).
   */
  readonly evidenceRef: string;

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
export function EvidenceRef({ evidenceRef, children, className }: EvidenceRefProps): ReactElement {
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
          evidenceRef={evidenceRef}
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

/** Props of {@link EvidenceDrawer}. */
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
 * The evidence behind one figure, as a modal dialog.
 *
 * The dialog is portalled into `document.body` (see the module note), named by its own heading and
 * marked `aria-modal`, so assistive technology treats the page behind it as inert while it is open.
 * Below 1280 px it covers the viewport; from 1280 px it docks at 420 px against the inline end and
 * leaves the page beside it readable.
 *
 * FOCUS — the only effect in the module. On mount it records the element that had focus, moves focus
 * to the dialog itself (not to its first control, so a screen reader announces the dialog's name and
 * role before its contents), and on unmount it returns focus to the element it recorded. `Tab`
 * cycling and `Escape` are handled by the dialog's own `onKeyDown`: no listener is registered on the
 * document, so nothing outside the drawer changes behaviour while it is open, and nothing remains
 * registered after it closes.
 *
 * DATA — `useQuery`, keyed by the port method's name and the reference, read through `useService()`.
 * The read is wrapped in `StateBoundary` so the pending call renders the shared skeleton and a
 * permission refusal renders the shared forbidden card. Every other failure renders
 * {@link FailureRegion}, which shows the service's own message and a retry: the boundary's `offline`
 * notice states that no source answered, and a reference the records do not hold did not fail for
 * that reason, so the drawer reports the cause it was given rather than one it does not know
 * (rule P-6).
 */
export function EvidenceDrawer({ evidenceRef, onClose, id }: EvidenceDrawerProps): ReactElement {
  const service = useService();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  const { data, error, isPending, refetch } = useQuery({
    queryKey: ['getEvidence', evidenceRef],
    queryFn: () => service.getEvidence(evidenceRef),
  });

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();

    return () => {
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

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
      return null;
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
        aria-modal="true"
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

/** Props of the section renderer. */
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
                  <MonoValue value={evidence.value} kind="id" />
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
                      <StatusIndicator
                        meaning={freshnessMeaning(record.state)}
                        label={SOURCE_LABELS[record.source] ?? record.source}
                      />
                      <span className={DETAIL_CLASSES}>{record.state}</span>
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
              <MonoValue value={evidence.confidence.level} kind="id" />{' '}
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

/** Props of {@link FailureRegion}. */
interface FailureRegionProps {
  /** The failure the service raised, carried whole so its own message can be printed. */
  readonly problem: Problem;

  /** Repeats the read. */
  readonly onRetry: () => void;
}

/**
 * What the drawer shows when the read failed for a reason the state boundary does not own.
 *
 * The sentence is the service's own `Problem.message`, printed character for character rather than
 * paraphrased (rule P-6), with the correlation identifier beside it so a reader can quote the call
 * when reporting it. The retry control is `ActionButton`, the application's one control pattern, so
 * the drawer repeats no button styling of its own and the control keeps the minimum target and the
 * focus ring rule B-3 requires; its label is the state boundary's, which already owns that wording.
 *
 * The region is announced (`role="status"`), so a reader who activated a figure is told the read
 * failed without having to hunt for the message. Its wording states what happened and nothing about
 * where a record is held or whether it could be altered (rule P-4).
 */
function FailureRegion({ problem, onRetry }: FailureRegionProps): ReactElement {
  const message =
    problem.message !== '' ? problem.message : EVIDENCE_DRAWER_TEXT.failureFallback;

  return (
    <div className={BODY_CLASSES}>
      <div role="status" className={NOTICE_CLASSES}>
        <StatusIndicator meaning="fail" label={EVIDENCE_DRAWER_TEXT.failureHeadline} />
        <p className={TEXT_CLASSES}>{message}</p>
        <p className={DETAIL_CLASSES}>
          {EVIDENCE_DRAWER_TEXT.traceLabel}{' '}
          <MonoValue value={problem.traceId} kind="id" />
        </p>
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
 * a refusal — is not displayed as though it were a refusal. The remaining members are the service's
 * to populate: only the adapter throws these, and it throws a `Problem`.
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

  return { permission, roles, traceId: problem.traceId };
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
 * Keeps `Tab` and `Shift+Tab` inside the dialog, so a modal region cannot be tabbed out of into the
 * page assistive technology has been told is inert.
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

