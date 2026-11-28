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
 * The control's pointer states, and their single owner: the hover fill and the pressed pair.
 *
 * Both states come from role tokens alone — `hover:` fills the first surface behind the label and
 * lifts it to the primary text role, and `active:` holds the accent boundary over the second
 * surface so a press reads as one step below a hover — with no raw palette value, no arbitrary
 * value and no opacity, because dimming a label is exactly how contrast falls below the ratio rule
 * B-3 requires.
 *
 * It is exported so the component suite names these states through this list rather than retyping
 * them: which role answers the pointer is this control's own choice that no input fixes, so a
 * legitimate token change must move the list and the suite together, while a control that stops
 * applying the list still fails the suite.
 */
export const POINTER_STATE_CLASSES = [
  'hover:bg-surface-1 hover:text-text-primary',
  'active:border-accent active:bg-surface-2',
].join(' ');

/**
 * The control's surface: a bordered, secondary-text control on the page ground rather than an
 * elevated one, because specification §4.3 exposes no shadow token at all. Sizes come from the
 * token scale — `text-13` for the label, `rounded-control` for the 2 px radius, `min-h-6 min-w-6`
 * for the 24x24 px target the accessibility rule sets — and the focus ring is the 2 px
 * `--color-focus-ring` outline, drawn only for keyboard focus. The pointer states are
 * {@link POINTER_STATE_CLASSES} composed in place, so the hover fill and the pressed pair keep one
 * owner instead of being restated here, while both remain role tokens. `motion-safe:` keeps the
 * transition out of a reduced-motion session.
 */
const CONTROL_CLASSES = [
  'inline-flex min-h-6 min-w-6 items-center justify-center',
  'rounded-control border border-control-boundary px-2 py-1',
  'bg-transparent font-sans text-13 text-text-secondary',
  POINTER_STATE_CLASSES,
  'focus-visible:outline-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * What `ChartFrame` in `./chart-frame.tsx` hands the control that switches representations: which
 * representation is on screen, the handler that asks for the other one, and the chart's own title so
 * that two toggles on one screen are told apart. The parent owns that state and this control only
 * reads it, so the label always names the representation a reader would get rather than the one in
 * front of them (success criterion 9).
 */
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
 * keyboard behaviour; no key handler is registered here. The visible label and the accessible name
 * both state the action the control performs — "View as table" while the chart is up, "View as
 * chart" once the table is — so the visible text is a prefix of the accessible name and the label a
 * user reads and the name a screen reader announces agree.
 *
 * The control holds no state of its own and therefore declares none: the name carries the state,
 * because it names the other representation exactly when the parent has switched to this one.
 * `aria-pressed` is deliberately absent. The words are fixed — success criterion 9 and the browser
 * checks quote "View as table" — and `VIEW_AS_TABLE_LABELS` above is their single owner, so a
 * pressed state would put a second, differently-scoped model beside them: the name would state the
 * action while "pressed" stated the mode, and a screen-reader user would hear the contradiction
 * "View as chart, pressed". One model states one thing, and it is the action.
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
      className={className === undefined ? CONTROL_CLASSES : `${CONTROL_CLASSES} ${className}`}
      onClick={() => {
        onViewingChange(NEXT_VIEWING[viewing]);
      }}
    >
      {label}
    </button>
  );
}
