/**
 * The "View as table" control of a chart, map or graph.
 *
 * Rule B-3 requires a table view of every chart, map and graph, and success criterion 9 of this
 * build makes a working toggle a pass condition rather than a nicety. This module is the one
 * control that provides it: `ChartFrame` in `./chart-frame.tsx` composes it, owns the `viewing`
 * state and swaps the two representations, and is the toggle's only intended parent. A chart, the
 * map lens, the dependency graph and `./data-table.tsx` therefore carry no toggle of their own —
 * the table is what this control reveals, so a table that offered one would offer nothing.
 *
 * The control is presentational and fully controlled: it keeps no state, reads no clock, renders
 * no figure and no identifier (rule P-6), and is never disabled (rule P-8), because choosing which
 * representation to read always performs its function.
 */

/**
 * The two representations the control switches between, and the whole of its state space: a chart
 * view and a table view, with no third state.
 */
export type Viewing = 'chart' | 'table';

/**
 * The control's two labels, held here so the wording has one owner: the component renders them,
 * and the component and browser tests name them through this constant instead of retyping the
 * strings. Success criterion 9 and the browser checks quote these exact words, so a reworded label
 * belongs in this object and nowhere else.
 */
export const VIEW_AS_TABLE_LABELS = {
  /** Shown while the chart is up: activating the control reveals the table. */
  showTable: 'View as table',
  /** Shown while the table is up: activating the control returns to the chart. */
  showChart: 'View as chart',
} as const;

/** The label the control carries for the representation currently on screen. */
const LABEL_FOR_VIEWING: Readonly<Record<Viewing, string>> = {
  chart: VIEW_AS_TABLE_LABELS.showTable,
  table: VIEW_AS_TABLE_LABELS.showChart,
};

/** The representation an activation asks for, which is always the other one. */
const NEXT_VIEWING: Readonly<Record<Viewing, Viewing>> = {
  chart: 'table',
  table: 'chart',
};

/**
 * The control's surface: a bordered, secondary-text control on the page ground rather than an
 * elevated one, because specification §4.3 exposes no shadow token at all. Sizes come from the
 * token scale — `text-13` for the label, `rounded-control` for the 2 px radius, `min-h-6 min-w-6`
 * for the 24x24 px target the accessibility rule sets — and the focus ring is the 2 px
 * `--color-focus-ring` outline, drawn only for keyboard focus. The hover tint and its transition
 * use role tokens, and `motion-safe:` keeps the transition out of a reduced-motion session.
 */
const CONTROL_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center justify-center',
  'rounded-control border border-control-boundary px-2 py-1',
  'bg-transparent font-sans text-13 text-text-secondary',
  'hover:text-text-primary',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/** Props of {@link ViewAsTableToggle}. */
export interface ViewAsTableToggleProps {
  /** Which representation is on screen now, owned by the parent. */
  readonly viewing: Viewing;
  /** Called with the opposite representation when the control is activated. */
  readonly onViewingChange: (next: Viewing) => void;
  /**
   * Accessible context for the control, such as the chart's title, so that two toggles on one
   * screen are told apart by a screen-reader user. When it is absent the accessible name is the
   * visible label alone.
   */
  readonly chartLabel?: string;
  /** Layout-only classes for the parent's arrangement; no visual property is overridden by it. */
  readonly className?: string;
}

/**
 * The switch between a chart's drawn form and its table form.
 *
 * It renders one native `<button>`, so `Enter` and `Space` activate it and the browser owns the
 * keyboard behaviour; no key handler is registered here. The visible label states the action
 * ("View as table" while the chart is up) and `aria-pressed` states the current representation, so
 * a screen-reader user hears both what activating it does and which form is showing. The visible
 * text is a prefix of the accessible name, which keeps the label a user can read and the label a
 * screen reader announces in agreement.
 */
export function ViewAsTableToggle({
  viewing,
  onViewingChange,
  chartLabel,
  className,
}: ViewAsTableToggleProps) {
  const label = LABEL_FOR_VIEWING[viewing];
  const accessibleName = chartLabel === undefined ? label : `${label}: ${chartLabel}`;

  return (
    <button
      type="button"
      aria-label={accessibleName}
      aria-pressed={viewing === 'table'}
      className={className === undefined ? CONTROL_CLASSES : `${CONTROL_CLASSES} ${className}`}
      onClick={() => {
        onViewingChange(NEXT_VIEWING[viewing]);
      }}
    >
      {label}
    </button>
  );
}
