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
 * confidence, constraint check, side effects. There is no sum, no difference, no maximum, no
 * percentage and no ordering anywhere in this file. The solver measured the options and the mock
 * adapter recommended one, so a matrix rendered here cannot disagree with the numbers behind it.
 *
 * WHY IT OWNS ITS `<table>` INSTEAD OF RENDERING `DataTable`. `src/components/data-table.tsx` is the
 * application's one table vocabulary, but it is row-oriented by construction: its `columns` are
 * fixed, its `rows` are records, and every header carries a controlled sort control driven by
 * `sort`/`onSort`. This matrix is transposed — one column per scenario, eight fixed measure rows — so
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
 * constraint-check row renders {@link CANNOT_COMPUTE_LABEL}, and that row carries the record's own
 * `constraintMessages` as the reason. No `NaN`, no substituted zero, no blank cell and no dash-only
 * cell reaches the screen (AAP §0.8). The reason is stated once per column rather than repeated in
 * each of the seven measure cells, because one reason per option is what the record holds and a
 * reader following the column meets it where the check is reported.
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

import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { CANNOT_COMPUTE_LABEL, SIM_LABELS } from '../../types';
import type {
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
 * The eight measure labels are AAP §0.12.4's SCR-04 row verbatim, in the order that row lists them.
 * The rest is grouping vocabulary the plan leaves to the implementation — the caption naming what
 * the table compares, the corner cell naming the row axis, the constraint states a `ConstraintCheck`
 * reports, the field labels inside one side effect, and the two state markers for an empty set and
 * the options the set held back. None of them is a fixed specification string, none carries a figure,
 * an amount, a date or a record identifier, and no record sentence — a confidence reason, a
 * constraint message, a blocking constraint — is paraphrased here: those arrive with the record and
 * are rendered as the record states them (rule P-6).
 */
export const COMPARISON_MATRIX_TEXT = {
  /** The table's accessible name, used when the screen supplies none of its own. */
  caption: 'Response options and the measures they are compared on',

  /** The corner cell, which names the row axis: every row below it is one measure. */
  cornerLabel: 'Measure',

  /** The one cell an empty set renders, in place of the eight measure rows. */
  emptySet: 'No options',

  /** The heading of the list carrying the options the set held back. */
  rejectedLabel: 'Set aside',

  /** The eight measure rows, in the order AAP §0.12.4's SCR-04 row states them. */
  rows: {
    unitsLate: 'Units late',
    maxDaysLate: 'Maximum days late',
    ordersOnTime: 'Orders on time',
    addedCost: 'Added cost',
    lineIdleDays: 'Line idle days',
    confidence: 'Confidence',
    constraintCheck: 'Constraint check',
    sideEffects: 'Side effects',
  },

  /** The two states a `ConstraintCheck` reports, each shown with its icon and colour. */
  constraint: {
    pass: 'Pass',
    fail: 'Fail',
  },

  /** The field labels inside one side effect, so no bare number stands unexplained. */
  sideEffect: {
    product: 'Product',
    kits: 'Kits deferred',
    value: 'Value deferred',
    days: 'Days deferred',
  },
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
 */
const SCROLL_CLASS =
  'overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';

/* ---------------------------------------------------------------------------------------------
 * The cells that carry more than one record field
 * ------------------------------------------------------------------------------------------- */

/** Props of the confidence cell. */
interface ConfidenceValuesProps {
  /** The level and the reason, taken together: a level without its reason explains nothing. */
  readonly confidence: Scenario['confidence'];
}

/**
 * One option's confidence: the level the record states, then the sentence explaining it.
 *
 * Both members are rendered and neither is derived — `Confidence.reason` is a required field
 * precisely because SCR-04 shows the two together (AAP §0.12.4) — and the level is set in the mono
 * face the way the evidence drawer sets it, so the same vocabulary reads the same on both surfaces.
 */
function ConfidenceValues({ confidence }: ConfidenceValuesProps): ReactElement {
  return (
    <span className="flex flex-col items-start gap-1">
      <MonoValue kind="id" value={confidence.level} />
      <span className="text-12 text-text-secondary">{confidence.reason}</span>
    </span>
  );
}

/** Props of the side-effect cell. */
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
 * The eight measure rows, in the order the specification states them
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of the matrix: the measure it names, and how that measure is drawn for one option.
 *
 * `reportsConstraint` marks the row that reports the option's own constraint state. It is the one
 * row a failed column still fills, because it is where the record's `constraintMessages` are stated:
 * every other row of that column reports {@link CANNOT_COMPUTE_LABEL} instead of a figure (AAP §0.8).
 */
interface MeasureRow {
  /** Stable row id, used as the React key. */
  readonly id: string;
  /** The visible row header, and the accessible name of every cell beneath it. */
  readonly label: string;
  /** How the measure is drawn for one option. It reads the record's field and formats nothing. */
  readonly render: (scenario: Scenario) => ReactNode;
  /** Whether this is the row a failed column still fills with the record's own reason. */
  readonly reportsConstraint?: boolean;
}

/**
 * The eight measure rows, in the order AAP §0.12.4's SCR-04 row fixes — units late, maximum days
 * late, orders on time, added cost, line idle days, confidence, constraint check, side effects — and
 * each reading exactly the `Scenario` member that states it.
 *
 * Counts and days are rendered as the record's own number with no formatting, because no input fixes
 * a presentation convention for them and `MonoValue`'s four kinds are money, identifier, timestamp
 * and hash. Money goes through `MonoValue kind="money"`, the application's one money formatter, and
 * the confidence and side-effect cells compose their several fields in the components above.
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
         message therefore sits on its own line with the gap between lines doing the separating. */
      return (
        <div className="flex flex-col items-start gap-1">
          <StatusIndicator meaning={presentation.meaning} label={presentation.label} />
          {scenario.constraintMessages.length === 0 ? null : (
            <ul className="flex flex-col gap-1 text-12 text-text-secondary">
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

/** Props of {@link RejectedOption}. */
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
 * Renders the comparison matrix: one column per option, eight measure rows, the recommended column
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
                        <button
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
                        </button>
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
                  {scenarios.map((scenario) => (
                    <td key={scenario.id} className={CELL_CLASS}>
                      {scenario.constraintCheck === 'fail' && row.reportsConstraint !== true ? (
                        <StatusIndicator meaning="fail" label={CANNOT_COMPUTE_LABEL} />
                      ) : (
                        row.render(scenario)
                      )}
                    </td>
                  ))}
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

