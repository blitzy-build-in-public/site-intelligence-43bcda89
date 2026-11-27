/**
 * One cited answer of the evidence assistant: the sentence the service composed, in its own
 * paragraphs; the fixed `Simulated calculation` label that sentence's figures carry; one chip per
 * record the answer cited; and a disclosure listing the queries the service ran and the model it
 * named.
 *
 * THE CONTRACT IT RENDERS. `platform-contracts.md` §10 fixes an answer as its text, the citations
 * behind it, the queries it ran, the model that composed it, whether the answer is partial and the
 * inputs it is missing, and AAP §0.12.2 derives that shape as `Answer` in `src/types/screen-dto.ts`.
 * AAP §0.12.4 gives SCR-06 the panel that shows "Suggested questions with scripted cited answers;
 * citation chips; an expander listing the queries and the model", and this component is that
 * answer's body. Every visible element below is a member of the `Answer` it is handed.
 *
 * IT COMPUTES AND FORMATS NOTHING (rule P-6). No figure, amount, quantity, date or record identifier
 * is written in this module: the prose arrives as `text` with every figure already filled in at call
 * time by the service, and the references, source names, query lines, model identifier and missing
 * inputs each arrive as a member of the answer. The only formatting here is the mono face that
 * `./mono-value.tsx` applies to an identifier. The component also writes no sentence of its own — no
 * greeting, no heading, no empty-state line — because a sentence this module wrote would sit beside
 * sourced ones as an unsourced claim; the strings it does carry are section labels, which name a
 * grouping rather than assert anything about the records under it.
 *
 * THE LABEL BELONGS TO THE ANSWER, NOT TO THE PAGE (rule P-1, AAP §0.10). The shell's `Simulated
 * data` badge labels the demonstration; AAP §0.10 makes the label of a computed figure that figure's
 * own, and a page-level badge does not satisfy it. This region therefore states `Simulated
 * calculation` above the prose. The string is read from `SIM_LABELS` at the position §5.3 gives it,
 * so the one module that writes the seven fixed labels stays the only module that writes them, and
 * no second label is declared here: a recommendation, write-back, control or market-intelligence
 * element is not rendered by this component, so none of their labels belongs to it.
 *
 * CITATIONS ARE CHIPS THAT OPEN THEIR EVIDENCE (principle PR-6, F12). Each chip is
 * `./evidence-drawer.tsx`'s exported `EvidenceRef`, which owns its own drawer instance, so this
 * component renders no dialog of its own and a chip can be placed in a list without the caller
 * wiring a drawer. The chip prints the record's reference in the mono face, the source's display name
 * from `SOURCE_LABELS`, and the freshness state's own word. The state's meaning comes from
 * `freshnessMeaning` in `./freshness-pill.tsx`, the one mapping the top bar's freshness strip also
 * reads, so a citation and a pill cannot describe one source in two ways. The state word is visible
 * text rather than colour or icon alone (rule B-3): the status primitive hides its icon from
 * assistive technology, so without that word the freshness would be announced to nobody. The name and
 * the state are both read from the citation's own freshness record, so a chip cannot print one
 * source's name beside another source's state.
 *
 * THE DISCLOSURE KEEPS THE ANSWER'S WORKING (AAP §0.12.4). The control is `Button` from
 * `src/components`, the owner of the `<button>` element AAP §0.5.2 permits only inside the component
 * that owns it; it carries `type="button"`, `aria-expanded` and, while the panel exists,
 * `aria-controls` naming an id from `useId()`, so the relationship between the control and the panel
 * it reveals is exposed exactly while that panel exists — the shape `./evidence-drawer.tsx` uses for
 * its own trigger. The panel lists the queries the answer ran and the model the service named, each
 * in the mono face, and the inputs the answer is missing under the label `Missing inputs`. Nothing in
 * it is a live call: the model identifier is catalogue text and no request leaves this page to
 * contact it (rule B-1).
 *
 * EMPTY AND ABSENT MEMBERS RENDER NOTHING. An answer with no citation, no query, no missing input or
 * no model shows no chip, no row and no empty region, and never a placeholder value — not a dash that
 * reads as a figure, not a zero, not the string `undefined` (rule P-6). `partial` is true exactly when
 * `missing` is non-empty, which is `Answer`'s own invariant, so the missing-inputs section is keyed on
 * that list: a record that reported itself partial without naming an input would have nothing to list,
 * and this component prints no empty heading for it. When an answer carries no detail at all, the
 * disclosure itself is not rendered, because a control with nothing behind it must not exist
 * (rule P-8); every control that is rendered performs its function, so none of them needs a disabled
 * reason.
 *
 * ACCESSIBILITY AND THEMES — rule B-3. The chips and the disclosure are native controls, so `Enter`
 * and `Space` operate them and `Tab` reaches them in document order; each keeps the 24x24 px minimum
 * target and the 2 px focus-ring outline on `:focus-visible`, and the drawer returns focus to the chip
 * that opened it. Nothing animates: the disclosure reveals its panel outright rather than
 * transitioning, so a reduced-motion session has nothing to opt out of. Every value is a role token of
 * `src/theme/tokens.css` — surfaces, text roles, the control boundary and the type scale — so no raw
 * palette value, no shadow and no off-scale size is reachable from here, and both Command and Paper
 * paint the contrast the specification measured.
 *
 * WHAT IT DOES NOT DO. It reads no data of its own (rule P-2): the answer arrives as a prop, and the
 * only data path it adds is the chip's drawer, which reads through the service provider. It fetches
 * no asset and reads no configuration value (rules B-1, B-2) — the icons it shows are bundled
 * Phosphor components behind the status primitive. It states no property of the workspace: nothing
 * here claims that anything is confined, uncopyable or resistant to alteration (rule P-4). It blends
 * no sources (rule P-5), because it renders one answer's members and aggregates nothing. No markdown
 * is parsed and no raw HTML is injected: the prose is split into paragraphs and rendered as text
 * nodes.
 *
 * Asserted at component level by `assistant-screen.test.tsx`, which renders a suggested question's
 * answer through this component. The seven states of the screen it belongs to and the axe pass over
 * that screen run outside this folder, in `e2e/s1-labelling-and-states.spec.ts` and
 * `e2e/s1-keyboard-and-axe.spec.ts`.
 */
import { useId, useState } from 'react';
import type { ReactElement } from 'react';

import { Button } from '../../components/button';
import { EvidenceRef } from '../../components/evidence-drawer';
import { freshnessMeaning } from '../../components/freshness-pill';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import { SIM_LABELS, SOURCE_LABELS } from '../../types';
import type { Answer, SimLabel } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this module states, held here so the wording has one owner: the component renders
 * these strings and a suite names them through this object instead of retyping them.
 *
 * None of them is a fixed specification §5.3 simulation label — the one label this surface carries is
 * {@link CALC_LABEL}, which is read from `SIM_LABELS` — and none of them is a record value: the
 * answer's prose, its references, its queries, its model and its missing inputs all arrive with the
 * `Answer` (rule P-6). The two control labels name the action the disclosure performs, so the visible
 * text of the control is also its accessible name (WCAG 2.2 SC 2.5.3) and a reader is never left
 * guessing whether the control opens or closes the panel. The three section terms are the grouping
 * AAP §0.12.4 leaves to the implementation: the plan fixes what the expander lists, not how it
 * groups, so each term names the members beneath it, and `Missing inputs` is the term the plan fixes
 * for that list.
 */
export const ASSISTANT_ANSWER_TEXT = {
  /** Shown while the panel is closed: activating the control reveals it. */
  detailShow: 'Show queries and model',
  /** Shown while the panel is open: activating the control hides it again. */
  detailHide: 'Hide queries and model',
  /** The term the queries the answer ran are listed under. */
  queriesLabel: 'Queries run',
  /** The term the model the service named is printed under. */
  modelLabel: 'Model',
  /** The term the inputs the answer could not settle are listed under. */
  missingInputsLabel: 'Missing inputs',
} as const;

/**
 * The one simulation label this surface carries: `Simulated calculation`, the label AAP §0.10
 * assigns to every computed figure — the overview tiles, the risk-by-plant bars, the per-day
 * chart, revenue at risk per exception, the comparison matrix's numeric rows, the canvas ribbon
 * tiles and an answer composed from those figures.
 *
 * The string is read from `SIM_LABELS` at its §5.3 position rather than written again here, so the
 * tuple stays the single owner of the seven fixed labels and a sentence composed of computed figures
 * cannot drift from the label that other figure surfaces print (rule P-1). Typed `SimLabel` so the
 * union rejects a paraphrase at compile time.
 */
const CALC_LABEL: SimLabel = SIM_LABELS[1];

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/** The answer's own column: one vertical stack, so no child needs a margin of its own. */
const ROOT_CLASSES = 'flex min-w-0 flex-col gap-3';

/**
 * The label's type step. `StatusIndicator` paints its label with a text role only, so a size set on
 * the component reaches the label by inheritance and the label keeps that step in both themes.
 */
const LABEL_CLASSES = 'text-12';

/** The prose paragraphs, one 4 px step apart rather than separated by margins. */
const PROSE_CLASSES = 'flex min-w-0 flex-col gap-2';

/**
 * One paragraph of the answer's own sentence, in the primary text role at body size. `break-words`
 * lets a long identifier inside a sentence wrap instead of pushing the panel wider than its column.
 */
const TEXT_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/**
 * The citation chips, wrapping onto as many rows as the panel needs. The list carries the type step
 * the chips inherit, because the evidence trigger deliberately adds no font size of its own to the
 * value it wraps.
 */
const CITATION_LIST_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-13';

/** One chip's list item: it may shrink, so a long reference wraps rather than overflowing. */
const CITATION_ITEM_CLASSES = 'min-w-0';

/** The source name inside a chip keeps its own intrinsic width, so a reference wraps before it does. */
const CITATION_STATUS_CLASSES = 'shrink-0 text-12';

/** The freshness state's own word beside the source name, one step below the reference. */
const CITATION_STATE_CLASSES = 'shrink-0 text-12 text-text-secondary';

/** The disclosure and its panel: the control, then the panel one 4 px step beneath it. */
const DETAIL_REGION_CLASSES = 'flex min-w-0 flex-col gap-2';

/**
 * The disclosure control itself: a bordered control on the page ground rather than an elevated one,
 * because the token layer exposes no shadow at all. `min-h-6 min-w-6` is the 24x24 px minimum target
 * rule B-3 sets, the radius is the control radius of specification §4.3, and the focus ring is the
 * 2 px focus-ring role drawn only for keyboard focus. The resting colour is the secondary text role
 * and the hover state lifts it to the primary role over the first surface, so the control reads as an
 * affordance without a palette value that must not appear on one of the two grounds.
 *
 * No transition is declared, which is how rule B-3's reduced-motion clause is honoured here: a
 * reduced-motion session has nothing to opt out of, and the panel opens and closes outright in every
 * session.
 */
const DETAIL_CONTROL_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center justify-center',
  'rounded-control border border-control-boundary px-2 py-1',
  'bg-transparent font-sans text-13 text-text-secondary',
  'hover:bg-surface-1 hover:text-text-primary active:bg-surface-2',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
].join(' ');

/**
 * The panel's own column. It is a definition list because each of its rows is a term together with
 * the values filed under it — the queries run, the model, the missing inputs — which is the pairing
 * a screen reader announces as such.
 */
const DETAIL_LIST_CLASSES = 'flex min-w-0 flex-col gap-2';

/** One term-and-value group of the panel: the wrapper HTML allows a `<dl>` to hold. */
const DETAIL_GROUP_CLASSES = 'flex min-w-0 flex-col gap-1';

/** A group's term, at the smallest step of the type scale in the caption role. */
const DETAIL_TERM_CLASSES = 'text-12 text-text-caption';

/** A group's value, wrapping rather than overflowing the panel. */
const DETAIL_VALUE_CLASSES = 'min-w-0 break-words text-13 text-text-primary';

/** A stacked list of record values inside a group. */
const DETAIL_ENTRIES_CLASSES = 'flex min-w-0 flex-col gap-1';

/** One entry of such a list. */
const DETAIL_ENTRY_CLASSES = 'min-w-0 break-words';

/**
 * A query line as the service logs it: a record's kind and its reference, or a solver measurement
 * with its case and lever values, joined by spaces. The mono face it inherits from `MonoValue` is the
 * one the interface fixes for identifiers, and `break-words` lets a long line wrap inside a narrow
 * panel instead of overflowing it.
 */
const QUERY_CLASSES = 'break-words text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link AssistantAnswer}. */
export interface AssistantAnswerProps {
  /**
   * The answer exactly as the service returned it: its text, its citations, its queries, its model,
   * and the inputs it is missing.
   *
   * Required, and taken whole rather than as loose fields, so the chip beside a sentence and the model
   * the disclosure names always belong to the same answer. Nothing is added to it here: every member
   * is either rendered as it stands or left out when it is empty.
   */
  readonly answer: Answer;
}

/**
 * Splits an answer's prose into the paragraphs the record states.
 *
 * A blank line — a line holding only horizontal whitespace, after either newline convention — ends a
 * paragraph, which is the whole of the structure the record's text carries: the demonstration
 * composes plain sentences, so no markdown, no inline emphasis and no markup is parsed, and the text
 * reaches the document as text nodes. Empty paragraphs are dropped, so leading and trailing newlines
 * add no empty line; a single newline inside a paragraph is left to the browser's whitespace
 * collapsing rather than being turned into markup the record did not ask for.
 *
 * @param text - The answer's own sentence, as the service supplied it.
 * @returns The paragraphs to render, in the record's order, with none of them empty.
 */
function toParagraphs(text: string): string[] {
  return text
    .split(/\r?\n[ \t]*\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Renders one answer as its prose, the label its figures carry, its citation chips and the
 * disclosure that lists the queries it ran and the model it named.
 *
 * The root is a `<div>` rather than a landmark, a heading or a list: the calling panel owns the
 * surface, the heading outline and the wording of the question, and this component contributes the
 * answer's own content inside them. Its four regions appear in the order a reader needs them — what
 * the figures are, what they say, which records they rest on, and what the answer consulted to
 * produce them — and a region whose record is empty is left out entirely rather than drawn as an
 * empty shell.
 *
 * @param props The answer as the service returned it. See {@link AssistantAnswerProps}.
 * @returns The answer's body, ready to sit inside the assistant's panel.
 */
export function AssistantAnswer({ answer }: AssistantAnswerProps): ReactElement {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const detailId = useId();

  const paragraphs = toParagraphs(answer.text);
  const citations = answer.citations;
  const queries = answer.queriesRun;
  const modelId = answer.modelId.trim();
  const missing = answer.missing;

  const hasCitations = citations.length > 0;
  const hasQueries = queries.length > 0;
  const hasModel = modelId.length > 0;
  const hasMissing = missing.length > 0;

  /* What the disclosure would reveal. With none of it present there is nothing for the control to do,
     so the control is not rendered at all rather than rendered inert (rule P-8). */
  const hasDetail = hasQueries || hasModel || hasMissing;

  return (
    <div className={ROOT_CLASSES}>
      {/* The figures in this sentence were computed here, so the sentence carries that label itself
          rather than relying on the badge the shell shows once on every route (rule P-1, AAP §0.10). */}
      <StatusIndicator meaning="simulated" label={CALC_LABEL} className={LABEL_CLASSES} />

      {paragraphs.length > 0 ? (
        <div className={PROSE_CLASSES}>
          {paragraphs.map((paragraph, index) => (
            <p key={`${index}-${paragraph}`} className={TEXT_CLASSES}>
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {hasCitations ? (
        <ul role="list" className={CITATION_LIST_CLASSES}>
          {citations.map((citation, index) => (
            /* The label and the state both come from the citation's own freshness record, so a chip
               cannot print one source's name beside another source's state. The source name is the
               display name the source vocabulary fixes for that key, falling back to the key the
               record itself carries rather than to a second name table. */
            <li key={`${index}-${citation.ref}`} className={CITATION_ITEM_CLASSES}>
              <EvidenceRef ref={citation.ref}>
                <MonoValue value={citation.ref} kind="id" />
                <StatusIndicator
                  meaning={freshnessMeaning(citation.freshness.state)}
                  label={SOURCE_LABELS[citation.freshness.source] ?? citation.freshness.source}
                  className={CITATION_STATUS_CLASSES}
                />
                <span className={CITATION_STATE_CLASSES}>{citation.freshness.state}</span>
              </EvidenceRef>
            </li>
          ))}
        </ul>
      ) : null}

      {hasDetail ? (
        <div className={DETAIL_REGION_CLASSES}>
          <Button
            type="button"
            aria-expanded={isDetailOpen}
            aria-controls={isDetailOpen ? detailId : undefined}
            className={DETAIL_CONTROL_CLASSES}
            onClick={() => {
              setIsDetailOpen((open) => !open);
            }}
          >
            {isDetailOpen
              ? ASSISTANT_ANSWER_TEXT.detailHide
              : ASSISTANT_ANSWER_TEXT.detailShow}
          </Button>

          {isDetailOpen ? (
            <dl id={detailId} className={DETAIL_LIST_CLASSES}>
              {hasQueries ? (
                <div className={DETAIL_GROUP_CLASSES}>
                  <dt className={DETAIL_TERM_CLASSES}>{ASSISTANT_ANSWER_TEXT.queriesLabel}</dt>
                  <dd className={DETAIL_VALUE_CLASSES}>
                    <ul role="list" className={DETAIL_ENTRIES_CLASSES}>
                      {queries.map((query, index) => (
                        <li key={`${index}-${query}`} className={DETAIL_ENTRY_CLASSES}>
                          <MonoValue value={query} kind="id" className={QUERY_CLASSES} />
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}

              {hasModel ? (
                <div className={DETAIL_GROUP_CLASSES}>
                  <dt className={DETAIL_TERM_CLASSES}>{ASSISTANT_ANSWER_TEXT.modelLabel}</dt>
                  <dd className={DETAIL_VALUE_CLASSES}>
                    <MonoValue value={modelId} kind="id" />
                  </dd>
                </div>
              ) : null}

              {hasMissing ? (
                <div className={DETAIL_GROUP_CLASSES}>
                  <dt className={DETAIL_TERM_CLASSES}>
                    {ASSISTANT_ANSWER_TEXT.missingInputsLabel}
                  </dt>
                  <dd className={DETAIL_VALUE_CLASSES}>
                    <ul role="list" className={DETAIL_ENTRIES_CLASSES}>
                      {missing.map((input, index) => (
                        <li key={`${index}-${input}`} className={DETAIL_ENTRY_CLASSES}>
                          {input}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

