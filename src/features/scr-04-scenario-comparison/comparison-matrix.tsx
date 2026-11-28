/**
 * The comparison matrix: one column per response option, one row per measure, and the reason each
 * option stands where it does.
 *
 * WHAT IT SHOWS AND WHERE EVERY VALUE COMES FROM. The only input is the contracts §3 `ScenarioSet`
 * the comparison screen read through the service, and the component derives nothing from it (rule
 * P-6): every figure is a member of the `Scenario` record — `unitsLate`, `maxDaysLate`,
 * `ordersOnTime`, `addedCostEur`, `lineIdleDays`, `confidence` with its reason, `constraintCheck`
 * with its `constraintMessages`, and `sideEffects` — in the fixed order the SCR-04 row of AAP
 * §0.12.4 states: units late, maximum days late, orders on time, added cost, line idle days,
 * confidence, constraint check, side effects. One row is added to those eight: the run-out reading,
 * which AAP §0.8 requires every surface to render as "the day plus a half-day reading such as
 * 'midday'" and which no surface rendered before it, drawn from the option's own `runOut` pair
 * immediately after the idle days it explains. There is no sum, no difference, no maximum, no
 * percentage and no ordering anywhere in this file. The solver measured the options and the mock
 * adapter recommended one, so a matrix rendered here cannot disagree with the numbers behind it.
 *
 * WHY IT OWNS ITS `<table>` INSTEAD OF RENDERING `DataTable`. `src/components/data-table.tsx` is the
 * application's one table vocabulary, but it is row-oriented by construction: its `columns` are
 * fixed, its `rows` are records, and every header carries a controlled sort control driven by
 * `sort`/`onSort`. This matrix is transposed — one column per scenario, nine fixed measure rows — so
 * the scenarios cannot be its `columns` at all, and routing a sort through it would publish header
 * buttons that cannot change the order the specification fixes: a control with no function, which
 * rule P-8 forbids. The matrix therefore renders the table itself, with both header axes scoped
 * (`<th scope="col">` per scenario, `<th scope="row">` per measure), a `<caption>` for its accessible
 * name, and no sort control.
 *
 * THE EVIDENCE REFERENCE, AND THE GAP IT CLOSES. Every measure is wrapped in `EvidenceRef`, so a
 * reader can reach the source, the record, the instant and the formula behind any figure (rule P-6,
 * principle PR-6). `Scenario` carries no per-measure reference — `SolverResult` declares the measures
 * and their values, and no member names an evidence record — so each cell opens the reference the
 * scenario does carry: its own `id`, which the service's evidence read resolves as the scenario's
 * record. No reference string is invented here, and a fabricated one would be the defect this note
 * exists to prevent.
 *
 * A COMPUTATION THAT COULD NOT COMPLETE. When an option's `constraintCheck` is `'fail'`, its figures
 * are not comparable and none of them is shown: every measure row of that column except the
 * constraint-check row renders {@link CANNOT_COMPUTE_LABEL}, and that row states the record's own
 * `constraintMessages` as the reason. No `NaN`, no substituted zero, no blank cell and no dash-only
 * cell reaches the screen (AAP §0.8). The reason is written once per column rather than painted into
 * each of the seven measure cells, because one reason per option is what the record holds; every one
 * of those cells still carries it, as its own accessible description, through `aria-describedby` on
 * the id {@link constraintReasonId} builds for the element stating the messages. A reader who meets a
 * bare "Cannot compute" therefore learns why from the record instead of from a paraphrase, and an
 * assistive technology receives that reason with the cell, which is what rule B-3's level AA bar
 * requires of a state the matrix reports but does not paint in full.
 *
 * WHAT IS THE SURFACE'S BUSINESS AND WHAT IS THE SCREEN'S. The recommendation's rule and its
 * trade-off sentence belong to the comparison screen (AAP §0.8, §0.12.4), as do the fixed empty-state
 * sentence and the write-back preview. This component marks which column `recommendedId` names — with
 * the §5.3 label `Simulated recommendation` and `aria-current` on the column header, never by colour
 * alone — and lists the options the set held back with the constraint that blocked each one, which
 * the `Rejected` record's own documentation places in this matrix.
 *
 * LABELS (rule P-1, AAP §0.10). Every column carries the §5.3 label its origin calls for:
 * `Simulated calculation` for an option the solver computed in this session (`solver`) or recomputed
 * from edited levers (`sandbox`), and `Simulated data` for an option shipped with the dataset
 * (`seeded`), which is how a reader tells a figure computed here from one the seed file supplied.
 * The column the set recommends carries `Simulated recommendation` beside that label, because a
 * recommendation is a simulated element of its own. The origin's label is chosen by
 * `ScenarioOrigin`'s own discriminant in an exhaustive map, and each one is rendered through
 * `StatusIndicator` with `meaning="simulated"`, so the icon, the word and the colour always arrive
 * together and a page-level badge is never asked to stand in for a column's label.
 *
 * NOTHING HERE REACHES OUT. The component is presentational (rule P-2): it imports no service, reads
 * no seed record and holds no state, so the screen is the only data path. It carries no URL, no
 * inline style and no icon of its own — the only icons are the bundled Phosphor components
 * `StatusIndicator` renders, and every colour, type size, radius and spacing below is a role token
 * of `src/theme/tokens.css`, so both themes render without a second theme-aware branch (rules B-1,
 * B-3). It reads no environment (rule B-2), and no wording or comment in it claims that anything is
 * confined, uncopyable or protected from alteration (rule P-4).
 *
 * ACCESSIBILITY. A real `<table>` with a caption, a scoped `<th>` on both axes, a select control that
 * is a native button at least 24×24 px with a pressed state and the 2 px `--color-focus-ring`
 * indicator, table content that scrolls inside a focusable, named group so a keyboard user can reach
 * a column off the viewport, and every status pairing an icon with a visible label — no meaning rests
 * on colour alone (rule B-3). Selection is fully controlled: the component keeps no copy of it, and
 * when no `onSelectScenario` is supplied no select control is rendered at all rather than an inert
 * one (rule P-8).
 */
import type { ReactElement, ReactNode } from 'react';

import { Button } from '../../components/button';
import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { runOutReading } from '../../components/run-out-reading';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import {
  CANNOT_COMPUTE_LABEL,
  COMPARISON_MEASURE_COLUMN_LABEL,
  COMPARISON_MEASURE_LABELS,
  COMPARISON_SET_ASIDE_LABEL,
  CONSTRAINT_CHECK_LABELS,
  SIDE_EFFECT_FIELD_LABELS,
  SIM_LABELS,
} from '../../types';
import type {
  ConfidenceLevel,
  ConstraintCheck,
  Rejected,
  Scenario,
  ScenarioId,
  ScenarioOrigin,
  ScenarioSet,
  SideEffect,
  SimLabel,
} from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording: the fixed string this component reads, and the words it states itself
 * ------------------------------------------------------------------------------------------- */

/**
 * The cell a measure shows when its option's constraint check failed, re-exported from the shared
 * vocabulary.
 *
 * The wording is AAP §0.2.2's and §0.8's own — "the interface shows 'Cannot compute' with that
 * reason" — and its single copy sits in `src/types/primitives.ts`, beside the seven labels, because
 * the comparison CSV states the same words and a service module may not import a feature module to
 * reach them (AAP §0.18.1). It is re-exported here so this screen's components and suites keep
 * reading the exact text from the module they already import instead of retyping it, and so no
 * second copy of it can drift.
 */
export { CANNOT_COMPUTE_LABEL };

/**
 * Every word this matrix states itself, held here so its wording has one owner.
 *
 * WHAT IT STILL OWNS, AND WHAT IT NOW READS FROM THE SHARED VOCABULARY. The caption naming what the
 * table compares and the one cell an empty set renders are the matrix's own and stay here. Everything
 * else — the nine measure labels, the corner cell naming the row axis, the heading over the options the
 * set held back, the two constraint states and the four field labels inside one side effect — reads
 * `src/types/comparison-text.ts`, because the comparison CSV states the same words and a service module
 * may not import a feature module (AAP §0.18.1). Each member below keeps the shape and the name its
 * readers already use, so `COMPARISON_MATRIX_TEXT.rows.addedCost` is the same string it always was,
 * and no reader in this feature changes.
 *
 * Eight of the nine measure labels are AAP §0.12.4's SCR-04 row verbatim, in the order that row lists
 * them; the ninth names the run-out reading AAP §0.8 requires that row's screens to render beside them.
 * The three levels a `ConfidenceLevel` reports are the matrix's own words and stay here, beside the
 * caption naming what the table compares and the one cell an empty set renders. None of these words
 * carries a figure, an amount, a date or a record identifier, and no record sentence — a confidence
 * reason, a constraint message, a blocking constraint — is paraphrased here: those arrive with the
 * record and are rendered as the record states them (rule P-6).
 */
export const COMPARISON_MATRIX_TEXT = {
  /** The table's accessible name, used when the screen supplies none of its own. */
  caption: 'Response options and the measures they are compared on',

  /** The corner cell, which names the row axis: every row below it is one measure. */
  cornerLabel: COMPARISON_MEASURE_COLUMN_LABEL,

  /** The one cell an empty set renders, in place of the nine measure rows. */
  emptySet: 'No options',

  /** The heading of the list carrying the options the set held back. */
  rejectedLabel: COMPARISON_SET_ASIDE_LABEL,

  /**
   * The nine measure rows: AAP §0.12.4's SCR-04 row in the order it states them, with the run-out
   * reading AAP §0.8 requires carried after the idle days it explains.
   */
  rows: COMPARISON_MEASURE_LABELS,

  /** The two states a `ConstraintCheck` reports, each shown with its icon and colour. */
  constraint: CONSTRAINT_CHECK_LABELS,

  /** The three levels a `ConfidenceLevel` reports, each shown with its icon and colour. */
  confidence: {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  },

  /** The field labels inside one side effect, so no bare number stands unexplained. */
  sideEffect: SIDE_EFFECT_FIELD_LABELS,
} as const;

/* ---------------------------------------------------------------------------------------------
 * The simulation labels, read from the one tuple that holds them
 * ------------------------------------------------------------------------------------------- */

/**
 * The label a column carries when the figures in it were computed rather than shipped: an option the
 * adapter measured through `solveSupplyDelay` at call time (`solver`) and one the sandbox recomputed
 * from edited levers (`sandbox`) are both calculations made in this session.
 *
 * Read from `SIM_LABELS` at the position specification §5.3 gives it, and typed `SimLabel` so a
 * paraphrase cannot compile (rule P-1).
 */
const CALCULATED_SIM_LABEL: SimLabel = SIM_LABELS[1];

/** The label a column carries when its option is dataset content rather than a computed figure. */
const SEEDED_SIM_LABEL: SimLabel = SIM_LABELS[0];

/** The label the recommended column carries, which is the §5.3 string for a recommendation. */
const RECOMMENDATION_SIM_LABEL: SimLabel = SIM_LABELS[2];

/**
 * The simulation label per `ScenarioOrigin`, and the only place the three are chosen.
 *
 * The map is exhaustive over the union and has no index signature, so a fourth origin added to
 * `ScenarioOrigin` fails to compile until its label is decided here rather than defaulting to
 * whichever entry happened to be listed first.
 */
const ORIGIN_SIM_LABEL: Record<ScenarioOrigin, SimLabel> = {
  solver: CALCULATED_SIM_LABEL,
  seeded: SEEDED_SIM_LABEL,
  sandbox: CALCULATED_SIM_LABEL,
};

/**
 * How one `ConstraintCheck` is presented: the shared status meaning it is drawn as, and the word
 * shown beside the icon.
 *
 * The word is required because a status is never a colour alone (rule B-3), and the meaning reuses
 * the application's one status vocabulary so a passing check reads exactly like every other pass.
 * Exhaustive by type, so a third state fails to compile.
 */
interface ConstraintPresentation {
  /** The shared status meaning, selecting the icon and the status colour role. */
  readonly meaning: StatusMeaning;
  /** The visible word beside the icon, and the status's accessible name. */
  readonly label: string;
}

/** The presentation of each `ConstraintCheck`, and the only place one is chosen. */
const CONSTRAINT_PRESENTATION: Record<ConstraintCheck, ConstraintPresentation> = {
  pass: { meaning: 'pass', label: COMPARISON_MATRIX_TEXT.constraint.pass },
  fail: { meaning: 'fail', label: COMPARISON_MATRIX_TEXT.constraint.fail },
};

/**
 * How one `ConfidenceLevel` is presented: the shared status meaning that selects the icon and the
 * status colour role for it.
 *
 * The mapping is the one the application already states for this field — a high reading is a pass, a
 * medium one is something to review, and a low one is the warning that the assessment rests on little
 * — so a confidence level carries the icon, the word and the colour that every other enumerated value
 * carries instead of arriving as unmarked prose (rule B-3, AAP §0.5.2). No meaning and no status
 * colour outside the shared six is introduced here, and the visible word beside the icon is the
 * level's own, read from {@link COMPARISON_MATRIX_TEXT} rather than spelled a second time in markup.
 *
 * Exported so the sandbox panel on this same screen draws the level of its recomputed option from this
 * one map, and it is exhaustive by type: a fourth level fails to compile rather than rendering a
 * status with nothing to tell it apart but a hue.
 */
export const CONFIDENCE_PRESENTATION: Record<ConfidenceLevel, StatusMeaning> = {
  high: 'pass',
  medium: 'review',
  low: 'warning',
};

/* ---------------------------------------------------------------------------------------------
 * The class lists
 * ------------------------------------------------------------------------------------------- */

/**
 * The table itself: full width, collapsed borders, the 13 px body size of the type scale, and the
 * primary text role. Every colour, size and spacing below is a role token of `src/theme/tokens.css`,
 * so the matrix follows the active theme and no raw palette value is reachable from it.
 */
const TABLE_CLASS = 'w-full border-collapse text-13 text-text-primary';

/**
 * A column header cell: the mono caption role that names a column, top-aligned so a header carrying a
 * name, a label and a recommendation mark sits on one line with its neighbours.
 */
const COLUMN_HEADER_CLASS =
  'border-b border-hairline px-3 py-2 text-start align-top font-mono text-12 font-medium text-text-caption';

/** A row header cell: the measure's name, in the secondary text role so it recedes behind the value. */
const ROW_HEADER_CLASS =
  'border-b border-hairline px-3 py-2 text-start align-top font-medium text-text-secondary';

/** A measure cell: the value the row names, top-aligned so a wrapped neighbour never moves it. */
const CELL_CLASS = 'border-b border-hairline px-3 py-2 align-top';

/**
 * The select control on a scenario's header: a native button at least 24×24 px (rule B-3's target
 * minimum) carrying the 2 px `--color-focus-ring` indicator on keyboard focus, with role-token
 * pointer states paced by a `motion-safe` colour transition so a reduced-motion session gets the
 * change without the animation.
 *
 * It carries no `outline-none` reset: that utility sets `--tw-outline-style: none`, which
 * `focus-visible:outline-2` reads back, so it would suppress the very ring rule B-3 requires.
 */
const SELECT_BUTTON_CLASS = [
  'inline-flex min-h-6 min-w-6 items-center rounded-control bg-transparent p-0 text-start',
  'text-13 font-medium text-text-primary',
  'hover:bg-surface-1 active:bg-surface-2',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * What a selected column's name looks like: an underline in the accent role, so the selection is
 * visible without relying on the pressed state alone, which assistive technology hears but a sighted
 * reader does not. An underline is a shape rather than a hue, so the marking survives a greyscale
 * rendering and never rests on colour alone (rule B-3).
 */
const SELECTED_NAME_CLASS = 'underline decoration-accent decoration-2 underline-offset-2';

/**
 * The scroll container around the table. A matrix with several options is wider than a narrow
 * viewport, and content a keyboard user cannot scroll to is content they cannot read, so the
 * container is focusable and named by the table's own caption.
 *
 * It is positioned so the absolutely positioned, visually hidden text the matrix renders inside its
 * cells — the caption and each evidence trigger's suffix — is laid out against this box and clipped
 * by its `overflow-x-auto`, instead of escaping a static ancestor and widening the document until
 * the page itself scrolls sideways.
 */
const SCROLL_CLASS =
  'relative overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/* ---------------------------------------------------------------------------------------------
 * The cells that carry more than one record field
 * ------------------------------------------------------------------------------------------- */

/**
 * What the confidence cell renders: the option's confidence as the record states it, the level and
 * the reason together, so a reader never meets a level that nothing explains. Neither half is derived
 * here (rule P-6).
 */
interface ConfidenceValuesProps {
  /** The level and the reason, taken together: a level without its reason explains nothing. */
  readonly confidence: Scenario['confidence'];
}

/**
 * One option's confidence: the level the record states, drawn as the status it is, then the sentence
 * explaining it.
 *
 * Both members are rendered and neither is derived — `Confidence.reason` is a required field
 * precisely because SCR-04 shows the two together (AAP §0.12.4). The level goes through
 * `StatusIndicator`, with the meaning {@link CONFIDENCE_PRESENTATION} maps onto it and the level's own
 * word as the label, so the icon, the word and the status colour reach the cell together (§0.5.2,
 * rule B-3). A confidence level is an enumerated value and not an identifier, so the identifier
 * formatter `MonoValue` has no part in it.
 */
function ConfidenceValues({ confidence }: ConfidenceValuesProps): ReactElement {
  return (
    <span className="flex flex-col items-start gap-1">
      <StatusIndicator
        meaning={CONFIDENCE_PRESENTATION[confidence.level]}
        label={COMPARISON_MATRIX_TEXT.confidence[confidence.level]}
      />
      <span className="text-12 text-text-secondary">{confidence.reason}</span>
    </span>
  );
}

/**
 * What the side-effect cell renders: the side effects the option carries, and the one reference every
 * figure among them opens — the scenario's own record, because a side effect carries no reference of
 * its own. Both arrive as the record states them, and neither is derived here (rule P-6).
 */
interface SideEffectValuesProps {
  /** The side effects the option carries, exactly as the record states them. */
  readonly sideEffects: readonly SideEffect[];
  /** The reference every figure in the cell opens: the scenario's own record. */
  readonly evidenceRef: string;
}

/**
 * What an option costs a record that is not the one being rescued, one definition list per side
 * effect, in the order the record states them.
 *
 * Each number is paired with the field it is rather than left to a unit word that would have to
 * agree with a count this component is not allowed to inspect: a definition list states "Kits
 * deferred, then the number" for one kit and for many alike, so the cell reads correctly whatever
 * the record holds. The figures are wrapped in `EvidenceRef`; the product identifier is not a figure,
 * so it is rendered without a trigger.
 */
function SideEffectValues({ sideEffects, evidenceRef }: SideEffectValuesProps): ReactElement {
  return (
    <ul className="flex flex-col gap-2">
      {sideEffects.map((sideEffect) => (
        <li key={`${sideEffect.productId}-${sideEffect.daysDeferred}`} className="break-words">
          <dl className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-12 text-text-secondary">
            <div className="flex items-baseline gap-1">
              <dt className="text-text-caption">{COMPARISON_MATRIX_TEXT.sideEffect.product}</dt>
              <dd>
                <MonoValue kind="id" value={sideEffect.productId} />
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-text-caption">{COMPARISON_MATRIX_TEXT.sideEffect.kits}</dt>
              <dd>
                <EvidenceRef ref={evidenceRef}>{sideEffect.kitsDelayed}</EvidenceRef>
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-text-caption">{COMPARISON_MATRIX_TEXT.sideEffect.value}</dt>
              <dd>
                <EvidenceRef ref={evidenceRef}>
                  <MonoValue kind="money" value={sideEffect.valueDeferredEur} />
                </EvidenceRef>
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-text-caption">{COMPARISON_MATRIX_TEXT.sideEffect.days}</dt>
              <dd>
                <EvidenceRef ref={evidenceRef}>{sideEffect.daysDeferred}</EvidenceRef>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The id a "Cannot compute" cell describes itself with
 * ------------------------------------------------------------------------------------------- */

/**
 * The prefix of the id the element stating one option's constraint messages carries.
 *
 * A constant rather than an id built inside the component, because the id has to be the same one in
 * two places at once: the list in the constraint-check row that states the messages, and the measure
 * cells of that column that point at it. Neither place may recompute a value the other holds.
 */
const CONSTRAINT_REASON_ID_PREFIX = 'comparison-constraint-reason';

/**
 * The id of the element stating one option's constraint messages, or `undefined` when the record
 * states none.
 *
 * Derived from the option's own identifier, so it is stable across renders and identical for the list
 * that states the reason and the cells that point at it; nothing counts, generates or caches it. The
 * `undefined` arm is what keeps the reference from dangling: an option whose `constraintMessages` is
 * empty renders no list at all, so its cells carry no description rather than pointing at an element
 * that does not exist.
 *
 * @param scenario - The option whose reason is being referenced, exactly as the set carries it.
 * @returns The id of the element holding that option's messages, or `undefined` when it holds none.
 */
function constraintReasonId(scenario: Scenario): string | undefined {
  return scenario.constraintMessages.length === 0
    ? undefined
    : `${CONSTRAINT_REASON_ID_PREFIX}-${scenario.id}`;
}

/* ---------------------------------------------------------------------------------------------
 * The nine measure rows, in the order the specification states them
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the matrix: the measure it names, and how that measure is drawn for one option.
 *
 * `reportsConstraint` marks the row that reports the option's own constraint state. It is the one row
 * a failed column still fills, because it states the record's `constraintMessages` and gives that
 * statement the id the column's other cells describe themselves with: every other row of that column
 * reports {@link CANNOT_COMPUTE_LABEL} instead of a figure (AAP §0.8).
 */
interface MeasureRow {
  /** Stable row id, used as the React key. */
  readonly id: string;
  /** The visible row header, and the accessible name of every cell beneath it. */
  readonly label: string;
  /** How the measure is drawn for one option. It reads the record's field and formats nothing. */
  readonly render: (scenario: Scenario) => ReactNode;
  /**
   * Whether this is the row a failed column still fills with the record's own reason.
   *
   * It is the row that states the messages and the one that gives the element holding them the id
   * {@link constraintReasonId} builds, which is what the column's other measure cells point at so a
   * reader meets the reason on whichever cell they reach first.
   */
  readonly reportsConstraint?: boolean;
}

/**
 * The nine measure rows: the eight AAP §0.12.4's SCR-04 row fixes — units late, maximum days late,
 * orders on time, added cost, line idle days, confidence, constraint check, side effects — and the
 * run-out reading AAP §0.8 requires, which sits immediately after the idle days it explains. Each row
 * reads exactly the `Scenario` member that states it.
 *
 * Counts and days are rendered as the record's own number with no formatting, because no input fixes
 * a presentation convention for them and `MonoValue`'s four kinds are money, identifier, timestamp
 * and hash. Money goes through `MonoValue kind="money"`, the application's one money formatter, the
 * run-out pair through the one component that owns its wording (AAP §0.8), and the confidence and
 * side-effect cells compose their several fields in the components above — the confidence level among
 * them as the status {@link CONFIDENCE_PRESENTATION} makes of it, because an enumerated value shows
 * its icon, its word and its colour together (§0.5.2, rule B-3).
 */
const MEASURE_ROWS: readonly MeasureRow[] = [
  {
    id: 'units-late',
    label: COMPARISON_MATRIX_TEXT.rows.unitsLate,
    render: (scenario) => <EvidenceRef ref={scenario.id}>{scenario.unitsLate}</EvidenceRef>,
  },
  {
    id: 'max-days-late',
    label: COMPARISON_MATRIX_TEXT.rows.maxDaysLate,
    render: (scenario) => <EvidenceRef ref={scenario.id}>{scenario.maxDaysLate}</EvidenceRef>,
  },
  {
    id: 'orders-on-time',
    label: COMPARISON_MATRIX_TEXT.rows.ordersOnTime,
    render: (scenario) => <EvidenceRef ref={scenario.id}>{scenario.ordersOnTime}</EvidenceRef>,
  },
  {
    id: 'added-cost',
    label: COMPARISON_MATRIX_TEXT.rows.addedCost,
    render: (scenario) => (
      <EvidenceRef ref={scenario.id}>
        <MonoValue kind="money" value={scenario.addedCostEur} />
      </EvidenceRef>
    ),
  },
  {
    id: 'line-idle-days',
    label: COMPARISON_MATRIX_TEXT.rows.lineIdleDays,
    render: (scenario) => <EvidenceRef ref={scenario.id}>{scenario.lineIdleDays}</EvidenceRef>,
  },
  {
    /* AAP §0.8 requires the run-out rendered as the day plus a half-day reading, and this is where a
       reader compares options against it. The wording is the presentation module's, the day is the
       record's own, and the cell opens the same evidence reference every sibling measure opens. */
    id: 'run-out',
    label: COMPARISON_MATRIX_TEXT.rows.runOut,
    render: (scenario) => (
      <EvidenceRef ref={scenario.id}>{runOutReading(scenario.runOut)}</EvidenceRef>
    ),
  },
  {
    id: 'confidence',
    label: COMPARISON_MATRIX_TEXT.rows.confidence,
    render: (scenario) => (
      <EvidenceRef ref={scenario.id}>
        <ConfidenceValues confidence={scenario.confidence} />
      </EvidenceRef>
    ),
  },
  {
    id: 'constraint-check',
    label: COMPARISON_MATRIX_TEXT.rows.constraintCheck,
    reportsConstraint: true,
    render: (scenario) => {
      const presentation = CONSTRAINT_PRESENTATION[scenario.constraintCheck];

      /* A `<div>` and not a `<span>`: the reasons are a list, which is flow content, and a span may
         hold nothing but phrasing content. The list carries no `list-disc` marker because a flex
         container blockifies its items and a blockified `<li>` loses the marker it was given; each
         message therefore sits on its own line with the gap between lines doing the separating. It is
         also the statement the column's other measure cells point at, so it carries the id
         `constraintReasonId` builds for this option and states each message exactly as the record
         holds it — the cells repeat none of this text (AAP §0.8, rule B-3, rule P-6). */
      return (
        <div className="flex flex-col items-start gap-1">
          <StatusIndicator meaning={presentation.meaning} label={presentation.label} />
          {scenario.constraintMessages.length === 0 ? null : (
            <ul
              id={constraintReasonId(scenario)}
              className="flex flex-col gap-1 text-12 text-text-secondary"
            >
              {scenario.constraintMessages.map((message, index) => (
                <li key={`${index}-${message}`} className="break-words">
                  {message}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    },
  },
  {
    id: 'side-effects',
    label: COMPARISON_MATRIX_TEXT.rows.sideEffects,
    render: (scenario) =>
      scenario.sideEffects.length === 0 ? null : (
        <SideEffectValues sideEffects={scenario.sideEffects} evidenceRef={scenario.id} />
      ),
  },
];

/* ---------------------------------------------------------------------------------------------
 * One option the set held back
 * ------------------------------------------------------------------------------------------- */

/**
 * What the matrix hands one held-back option: the `Rejected` record alone, which names the option and
 * the constraint that blocked it. Both members are shown and neither is derived or softened, so the
 * caller passes the record as the set stated it (rule P-6).
 */
interface RejectedOptionProps {
  /** The option set aside and the constraint that blocked it, exactly as the record states them. */
  readonly rejected: Rejected;
}

/**
 * One option the set held back, with the constraint that blocked it.
 *
 * The record carries the option's identifier and the blocking constraint and nothing else, so
 * nothing else is shown: the identifier is the `Rejected` record's own member and the constraint is
 * its sentence, rendered as the record states it (rule P-6). The identifier is not a figure, so it
 * is not wrapped in an evidence trigger.
 */
function RejectedOption({ rejected }: RejectedOptionProps): ReactElement {
  return (
    <li className="break-words">
      <MonoValue kind="id" value={rejected.scenarioId} />
      {' — '}
      <span className="text-text-secondary">{rejected.blockingConstraint}</span>
    </li>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The matrix
 * ------------------------------------------------------------------------------------------- */

/**
 * Props of {@link ComparisonMatrix}.
 *
 * The selection is fully controlled by the caller: the component keeps no copy of it, so the column
 * a reader has chosen cannot disagree with the one the screen believes is chosen.
 */
export interface ComparisonMatrixProps {
  /**
   * Every option measured for one exception, with the recommendation and the options set aside,
   * exactly as the service returned them. Nothing is filtered, reordered or recalculated here.
   */
  readonly scenarioSet: ScenarioSet;

  /**
   * The table's accessible name, rendered as its `<caption>` and as the name of the scroll group
   * around it.
   *
   * Optional because the screen knows the exception and can name the table after it; absent, empty
   * and `undefined` all fall back to {@link COMPARISON_MATRIX_TEXT}'s caption, so the table is never
   * unnamed (rule B-3).
   */
  readonly caption?: string | undefined;

  /**
   * The option whose column is currently selected, if any. Compared against each scenario's own
   * identifier to set that column's control pressed and to mark its name.
   */
  readonly selectedScenarioId?: ScenarioId | undefined;

  /**
   * Called with the scenario's identifier when a reader activates that column's select control.
   *
   * Absent, no select control is rendered at all: a control that cannot change anything would be a
   * dead affordance (rule P-8), and the column names are then plain text.
   */
  readonly onSelectScenario?: ((scenarioId: ScenarioId) => void) | undefined;
}

/**
 * Renders the comparison matrix: one column per option, nine measure rows, the recommended column
 * marked, and the options the set held back listed beneath the table.
 *
 * @param props The option set, the optional caption and the controlled selection. See
 *   {@link ComparisonMatrixProps}.
 * @returns The matrix inside its surface. Always a table — an empty set renders one full-width cell
 *   rather than nothing, so the block a screen reserved is never blank.
 */
export function ComparisonMatrix({
  scenarioSet,
  caption,
  selectedScenarioId,
  onSelectScenario,
}: ComparisonMatrixProps): ReactElement {
  const { scenarios, rejected } = scenarioSet;
  const tableCaption =
    caption !== undefined && caption !== '' ? caption : COMPARISON_MATRIX_TEXT.caption;

  return (
    /* An unnamed grouping container rather than the panel's default `<section>`: the matrix carries
       its own caption on the table, and a `<section>` without an accessible name is a generic
       container anyway, so the `<div>` states what the element actually is. */
    <Panel as="div">
      {/* Focusable and named, so a column scrolled off a narrow viewport is still reachable by
          keyboard (rule B-3, WCAG 2.2 SC 2.1.1). */}
      <div role="group" aria-label={tableCaption} tabIndex={0} className={SCROLL_CLASS}>
        <table className={TABLE_CLASS}>
          <caption className="sr-only">{tableCaption}</caption>
          <thead>
            <tr>
              <th scope="col" className={COLUMN_HEADER_CLASS}>
                {COMPARISON_MATRIX_TEXT.cornerLabel}
              </th>
              {scenarios.map((scenario) => {
                /* Which column the recommendation rule picked is published structurally through
                   `aria-current`, never through a colour, and the visible mark is the §5.3 label
                   itself, so the requirement to label a recommendation and the requirement to mark
                   the column are answered by one element (rules P-1, B-3). */
                const isRecommended = scenarioSet.recommendedId === scenario.id;
                const isSelected = selectedScenarioId === scenario.id;

                return (
                  <th
                    key={scenario.id}
                    scope="col"
                    aria-current={isRecommended ? 'true' : undefined}
                    className={COLUMN_HEADER_CLASS}
                  >
                    <div className="flex flex-col items-start gap-1">
                      {onSelectScenario === undefined ? (
                        <span className={isSelected ? SELECTED_NAME_CLASS : undefined}>
                          {scenario.name}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => {
                            onSelectScenario(scenario.id);
                          }}
                          className={joinClasses(
                            SELECT_BUTTON_CLASS,
                            isSelected ? SELECTED_NAME_CLASS : undefined,
                          )}
                        >
                          {scenario.name}
                        </Button>
                      )}
                      {/* The option's own identifier, so every column is identifiable by the
                          reference the rest of the screen quotes — the recommendation block, the
                          set-aside list, an evidence reference and the audit trail — rather than by
                          its name alone. It is an identifier, not a figure, so it is not wrapped in
                          an evidence trigger. */}
                      <MonoValue kind="id" value={scenario.id} />
                      <StatusIndicator
                        meaning="simulated"
                        label={ORIGIN_SIM_LABEL[scenario.origin]}
                      />
                      {isRecommended ? (
                        <StatusIndicator meaning="simulated" label={RECOMMENDATION_SIM_LABEL} />
                      ) : null}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scenarios.length === 0 ? (
              /* One cell across the whole table. The sentence a reader is owed for an empty set
                 belongs to the screen (AAP §0.12.4), so this states the fact and adds no
                 explanation of its own. */
              <tr>
                <td
                  colSpan={scenarios.length + 1}
                  className={joinClasses(CELL_CLASS, 'text-text-secondary')}
                >
                  {COMPARISON_MATRIX_TEXT.emptySet}
                </td>
              </tr>
            ) : (
              MEASURE_ROWS.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={ROW_HEADER_CLASS}>
                    {row.label}
                  </th>
                  {scenarios.map((scenario) => {
                    /* A measure this option cannot state reports the fixed sentence, and describes
                       itself with the record's own reason — the list the constraint-check row states
                       for the column — so the reason reaches the cell rather than only the row that
                       reports the check (AAP §0.8, rule B-3). An option whose record carries no
                       message has no element to point at, so its cells carry no description. */
                    const cannotCompute =
                      scenario.constraintCheck === 'fail' && row.reportsConstraint !== true;

                    return (
                      <td
                        key={scenario.id}
                        className={CELL_CLASS}
                        aria-describedby={cannotCompute ? constraintReasonId(scenario) : undefined}
                      >
                        {cannotCompute ? (
                          <StatusIndicator meaning="fail" label={CANNOT_COMPUTE_LABEL} />
                        ) : (
                          row.render(scenario)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rejected.length === 0 ? null : (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="mb-1 text-12 text-text-caption">{COMPARISON_MATRIX_TEXT.rejectedLabel}</p>
          <ul className="flex flex-col gap-1 text-13 text-text-primary">
            {rejected.map((rejectedOption) => (
              <RejectedOption key={rejectedOption.scenarioId} rejected={rejectedOption} />
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}

/**
 * Joins the class names that apply, dropping the ones a conditional left out, so a variant reads as
 * one list at the call site instead of a template string that may leave a stray space behind.
 */
function joinClasses(...values: readonly (string | undefined)[]): string {
  return values.filter((value) => value !== undefined && value !== '').join(' ');
}

