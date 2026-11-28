/**
 * The series label band of a drawing: one row per series it shows, each row a swatch, the series' name
 * and the label its figures carry.
 *
 * WHY IT IS ONE COMPONENT. Two drawings in this layer print the same band — the competitive atlas's
 * radar and its network view — and they had grown into two copies of one idea: the same utilities in a
 * different order, two independently chosen sets of row and line heights, two swatch renderers, and one
 * of the two bands carrying a companion line the other forgot. A band is what states, on the drawing
 * itself, which series it shows and which label each one's figures carry (rule P-1), so a band that
 * disagreed with its neighbour about a weight or a text role was a provenance statement that differed
 * between two drawings of the same data. This component owns the row, the swatch's hiding and the
 * truncation; each drawing keeps its own rows, its own order, its own selection and its own geometry.
 *
 * WHY THE GEOMETRY IS THE CALLER'S. The radar draws its band below a 520-unit drawing and the network
 * view below a 760-unit one, with different row and line heights, and the network's swatch prints that
 * series' own shape rather than a plain mark. So the origin, the row and line heights, the text column's
 * x, the width a line may occupy and the swatch column all arrive in {@link SeriesBandGeometry}, and a
 * row's swatch is either a node the caller built in its own shape vocabulary or a utility class this
 * component paints a plain circle in. Nothing about either drawing's proportions is forced on the other.
 *
 * WHY THE TEXT IS FITTED. An SVG `<text>` neither wraps nor ellipsises, so a long series name runs past
 * the view box and is cut by the drawing's edge — and the fixed companion strings rule P-5 requires are
 * printed on the same rows. Every line is therefore shortened through `./svg-label.ts` to the width the
 * caller states, and the caller's full wording is kept in a `<title>` child whenever the drawn run
 * differs from it. A run that fits is returned untouched, so a companion label prints exactly as the
 * record spells it.
 *
 * WHAT IT DOES NOT DO. It does not decide which series exist, in what order they are read, which row the
 * screen holds or what a row's label says: `rows` is the caller's list, `key` keys the row, `current`
 * marks the row the screen reports on — that row states `aria-current` and takes the emphasised weight,
 * so the selection is never carried by colour alone (rule B-3) — and `name` and `companion` are the
 * caller's strings, imported by the caller from the one module that owns them (rule P-1).
 */
import type { ReactNode } from 'react';

import { SVG_LABEL_TEXT_METRICS, truncateToWidth } from './svg-label';
import type { SvgTextMetrics } from './svg-label';

/* ---------------------------------------------------------------------------------------------
 * The rows a band prints
 * ------------------------------------------------------------------------------------------- */

/**
 * One row of a band: the mark that says which series it is, the series' name and the label its figures
 * carry.
 *
 * `swatch` and `swatchClasses` are the two ways a caller states the mark, and only one of them is used: a
 * node is the drawing's own shape (a filled circle, a dashed ring, one of the three competitor polygons),
 * and a utility class is a plain circle in that class. Either way the swatch is decoration, so this
 * component hides it from assistive technology — the row's words are what carry the meaning — and a row
 * that states neither prints its words alone rather than an unexplained gap.
 */
export interface SeriesBandRow {
  /** A stable key for the row, unique within one band. */
  readonly key: string;
  /** The series' name, which is the row's own text. */
  readonly name: string;
  /** The label the series' figures carry, where the series requires one (rule P-1). */
  readonly companion?: string | undefined;
  /**
   * The mark the caller draws, around the origin of the swatch group the band places it in.
   *
   * The band translates that group to the row's own swatch centre, so a caller draws its shape at
   * `(0, 0)` and the band's row height and line height stay the only statement of where it lands.
   */
  readonly swatch?: ReactNode;
  /** The fill utility a plain circular swatch is drawn in, used when no node is supplied. */
  readonly swatchClasses?: string | undefined;
  /** Whether this is the row of the series the screen reports on. */
  readonly current?: boolean | undefined;
}

/**
 * Where a band starts and how its rows are spaced, in the drawing's own user units.
 *
 * Every number here belongs to the caller, because the two drawings that compose this band are a
 * different width and a different height and would be misdrawn by one shared set of proportions.
 */
export interface SeriesBandGeometry {
  /** The baseline of the band's first row. */
  readonly top: number;
  /** The distance between two rows' baselines. */
  readonly rowHeight: number;
  /** The distance between a row's name line and its companion line. */
  readonly lineHeight: number;
  /** The x a row's name and companion lines start at. */
  readonly textX: number;
  /** The widest a name or companion line may be drawn, in user units. */
  readonly maxTextWidth: number;
  /**
   * The type step the band's lines are set in, and the character width they are shortened against.
   *
   * Optional, because a caller that states none prints the layer's own 12-unit step. A drawing that
   * prints its labels at another rendered size states the metrics it resolved for the width it is
   * drawn at — `./svg-label.ts`'s `renderedLabelMetrics` — so the step it prints at and the width its
   * lines are shortened to are one statement rather than two that could disagree.
   */
  readonly metrics?: SvgTextMetrics | undefined;
  /**
   * The swatch column, where the band prints one.
   *
   * Optional, because a band whose rows are names and labels alone — the radar's — has no swatch column
   * to state. `x` is the column's left edge and `size` is the radius a plain circular swatch is drawn at,
   * which is also the room a caller's own shape may occupy.
   */
  readonly swatch?: { readonly x: number; readonly size: number } | undefined;
}

/* ---------------------------------------------------------------------------------------------
 * The class table — one owner, so the two drawings cannot disagree
 * ------------------------------------------------------------------------------------------- */

/**
 * A series' name: the primary text role, at the type step the caller states in its geometry.
 *
 * The order of the utilities is stated once, here, so every drawing that composes this band takes one
 * class order for a series' name, and the drawings cannot disagree about it. The step itself is not a
 * class: a drawing is scaled into its frame, so the size a row prints at is resolved from the width
 * that frame gives it and arrives in {@link SeriesBandGeometry.metrics} — a `text-12` utility here
 * would set a user-unit size and print at whatever the scale happened to be.
 */
const NAME_CLASSES = 'fill-text-primary';

/** A series' companion line: the caption role, which specification §4 measures for the surface behind it. */
const COMPANION_CLASSES = 'fill-text-caption';

/**
 * The weight the row of the series in view takes: the type scale's own bundled weight, so the emphasis is
 * structure rather than a size, a colour or a decoration (rule B-3).
 */
const CURRENT_NAME_CLASSES = 'font-semibold';

/* ---------------------------------------------------------------------------------------------
 * The component
 * ------------------------------------------------------------------------------------------- */

/**
 * What a drawing hands {@link SeriesBand}: the rows it draws, the band's own geometry, and the name the
 * band is announced with where it is a group in the accessibility tree.
 */
export interface SeriesBandProps {
  /** One row per drawn series, in the order the drawing reads them. Required; empty draws no band. */
  readonly rows: readonly SeriesBandRow[];
  /** Where the band starts and how its rows are spaced, in the drawing's own user units. */
  readonly geometry: SeriesBandGeometry;
  /**
   * The band's accessible group name.
   *
   * Optional rather than required, because not every drawing's band is a group of its own: the network
   * view names its band, while the radar's rows sit directly in the drawing's own group and a second
   * group there would change a tree that already reads correctly. Omitted, the rows are rendered as they
   * are.
   */
  readonly label?: string | undefined;
}

/**
 * Renders the band under a drawing: one swatch, one name line and one optional companion line per drawn
 * series.
 *
 * An empty `rows` list renders nothing at all rather than a heading over nothing, and each line is
 * shortened to {@link SeriesBandGeometry.maxTextWidth} with the caller's full wording left in a `<title>`
 * child, so no run can leave the drawing's box.
 *
 * @param props The rows, the band's geometry and the group name to announce it with.
 * @returns The band, or `null` when no series is drawn.
 */
export function SeriesBand({ rows, geometry, label }: SeriesBandProps) {
  if (rows.length === 0) {
    return null;
  }

  const printed = rows.map((row, index) => (
    <BandRow key={row.key} row={row} index={index} geometry={geometry} />
  ));

  if (label === undefined) {
    return <>{printed}</>;
  }

  return (
    <g role="group" aria-label={label}>
      {printed}
    </g>
  );
}

/** The props one row of a band is printed from. */
interface BandRowProps {
  /** The row to print. */
  readonly row: SeriesBandRow;
  /** The row's place in the band, which is what sets its baseline. */
  readonly index: number;
  /** Where the row's lines and swatch sit. */
  readonly geometry: SeriesBandGeometry;
}

/**
 * One row of a band: the swatch, the name line and the companion line.
 *
 * The swatch is wrapped in a group marked `aria-hidden` and translated to the row's own swatch centre, so
 * a screen reader meets the row's words and not a second, unnamed graphic beside them (rule B-3), and a
 * caller that changes its row height does not have to move the swatch as well.
 *
 * @param props The row, its place in the band and the band's geometry.
 * @returns The row.
 */
function BandRow({ row, index, geometry }: BandRowProps) {
  const metrics = geometry.metrics ?? SVG_LABEL_TEXT_METRICS;
  const nameY = geometry.top + index * geometry.rowHeight;
  const name = truncateToWidth(row.name, geometry.maxTextWidth, metrics);
  const companion =
    row.companion === undefined
      ? undefined
      : truncateToWidth(row.companion, geometry.maxTextWidth, metrics);
  const column = geometry.swatch;
  const swatch =
    row.swatch ??
    (column === undefined || row.swatchClasses === undefined ? undefined : (
      <circle cx={0} cy={0} r={column.size} className={row.swatchClasses} />
    ));

  return (
    <g aria-current={row.current === true ? 'true' : undefined}>
      {column === undefined || swatch === undefined || swatch === null ? null : (
        <g
          aria-hidden="true"
          transform={`translate(${column.x + column.size} ${nameY - geometry.lineHeight / 2})`}
        >
          {swatch}
        </g>
      )}
      <text
        x={geometry.textX}
        y={nameY}
        fontSize={metrics.fontSize}
        className={row.current === true ? `${NAME_CLASSES} ${CURRENT_NAME_CLASSES}` : NAME_CLASSES}
      >
        {name === row.name ? null : <title>{row.name}</title>}
        {name}
      </text>
      {companion === undefined || row.companion === undefined ? null : (
        <text
          x={geometry.textX}
          y={nameY + geometry.lineHeight}
          fontSize={metrics.fontSize}
          className={COMPANION_CLASSES}
        >
          {companion === row.companion ? null : <title>{row.companion}</title>}
          {companion}
        </text>
      )}
    </g>
  );
}
