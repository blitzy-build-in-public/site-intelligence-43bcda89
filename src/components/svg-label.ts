/**
 * Fitting and placing the text an SVG drawing prints, in that drawing's own user units.
 *
 * WHY ONE MODULE. Four surfaces in this layer print a record's name beside a mark — the FileMap map's
 * nodes and crossings, the atlas network view, the radar's scale and the line chart's annotations — and
 * every one of them meets the same two problems. An SVG `<text>` has neither `text-overflow` nor
 * wrapping, so a long name prints past the box it belongs to; and two marks can stand closer together
 * than one label is wide, so two names print over each other. Solved surface by surface, each picked its
 * own character width, its own distances and its own collision rule, and the four drifted apart. This
 * module holds the one answer they all compose.
 *
 * WHY EVERY FUNCTION HERE IS PURE AND MEASURES NOTHING. Every chart in this layer is a function of its
 * props: the same payload draws the same picture on every render, in every environment and in every
 * test. A DOM measurement (`getBBox`, `getComputedTextLength`) would make the drawing depend on when it
 * was rendered, on which face had loaded and on whether a document existed at all, so the width of a run
 * is estimated from a fixed character width and the type step it is set in. The estimate is deliberately
 * a little generous — a real glyph advance at the 12-unit step is narrower than {@link
 * SVG_LABEL_CHARACTER_WIDTH} — so two labels this module keeps apart are still apart once the browser
 * sets the text. Nothing here reads a clock, a random source or the document, and nothing is stored
 * between calls.
 *
 * WHAT IT DOES NOT DO. It draws nothing and formats nothing. It answers a position, and where a run
 * cannot fit it answers the shortened run; keeping the record's full text — in the mark's accessible
 * name and in a `<title>` child of the printed `<text>` — stays the caller's job, because only the
 * caller knows which string a reader may not lose. Nor does it know what a label means, so it cannot
 * rank or merge two of them: the caller states their order, which is the order of precedence when the
 * drawing runs out of room.
 *
 * IT PLACES TWO KINDS OF THING THROUGH THAT ONE SEARCH. A name, whose position is where its first line
 * starts and whose lines are the text it prints; and a box — the row of evidence-pin numerals a map
 * node carries — whose position is where its top-left corner goes. Both are offered the same ring of
 * candidate positions around the mark they belong to, both are rejected for leaving the drawing or for
 * meeting a box already placed, and both step outwards from the mark in the same order, so a row of
 * badges is kept apart from a neighbour's row by exactly the rule that keeps two names apart.
 */

/* ---------------------------------------------------------------------------------------------
 * The estimation — how wide a run of text is taken to be
 * ------------------------------------------------------------------------------------------- */

/**
 * The type step every drawing in this layer sets a label in, in user units.
 *
 * It is specification §4.3's 12 px step, which is the one size the charts use for a mark's own name and
 * for an annotation; a drawing whose labels are set at another step states its own metrics instead.
 */
export const SVG_LABEL_FONT_SIZE = 12;

/**
 * The width one character of that step is estimated to occupy, in user units.
 *
 * A generous constant on purpose: Urbanist's average advance at 12 units is narrower, so a run this
 * module believes fits has room to spare once the browser renders it, and two labels it keeps apart do
 * not meet on screen. Geometry only — nothing here derives a reading, a figure or a scale from it.
 */
export const SVG_LABEL_CHARACTER_WIDTH = 7;

/** The character a run ends with when it has been shortened to fit. */
export const LABEL_ELLIPSIS = '…';

/**
 * The two numbers a width is estimated from: the type step a label is set in and the character width
 * assumed for it.
 *
 * A caller states both rather than one, because an estimate is only meaningful together with the type
 * it describes: a drawing set in the tabular mono face carries a wider advance at the same step, and its
 * own metrics say so.
 */
export interface SvgTextMetrics {
  /** The type step the label is set in, in the drawing's user units. */
  readonly fontSize: number;
  /** The width one character at that step is taken to occupy. */
  readonly characterWidth: number;
}

/** The metrics of a label set in the 12-unit step this layer's charts share. */
export const SVG_LABEL_TEXT_METRICS: SvgTextMetrics = {
  fontSize: SVG_LABEL_FONT_SIZE,
  characterWidth: SVG_LABEL_CHARACTER_WIDTH,
};

/**
 * The width a run of text is taken to occupy, in the drawing's user units.
 *
 * Every character is the same width, so the answer is the character count times the constant: no
 * per-glyph table, no kerning and no measurement, which is what lets the same payload draw the same
 * picture everywhere.
 *
 * @param text The run to measure.
 * @param metrics The type step and character width it is set in.
 * @returns The estimated width, in user units; zero for an empty run.
 */
export function estimateTextWidth(
  text: string,
  metrics: SvgTextMetrics = SVG_LABEL_TEXT_METRICS,
): number {
  return Array.from(text).length * metrics.characterWidth;
}

/**
 * Shortens a run that is wider than the room it has, marking the cut with {@link LABEL_ELLIPSIS}.
 *
 * The run is cut at a character boundary of the string's own code points rather than at a UTF-16 index,
 * so a name carrying a character outside the basic plane is shortened between glyphs and never inside
 * one, and trailing space is dropped before the ellipsis so a shortened name does not end in "word …".
 * A run that already fits is returned unchanged — the caller compares the answer with its own string to
 * learn whether anything was cut, which is how it knows to print the full text in a `<title>`.
 *
 * @param text The run to fit.
 * @param maxWidth The widest the run may be, in the drawing's user units.
 * @param metrics The type step and character width it is set in.
 * @returns The run, or as much of it as fits followed by the ellipsis; an empty string when not even the
 *   ellipsis fits.
 */
export function truncateToWidth(
  text: string,
  maxWidth: number,
  metrics: SvgTextMetrics = SVG_LABEL_TEXT_METRICS,
): string {
  if (estimateTextWidth(text, metrics) <= maxWidth) {
    return text;
  }

  const ellipsisRoom = maxWidth - estimateTextWidth(LABEL_ELLIPSIS, metrics);

  if (ellipsisRoom <= 0) {
    return '';
  }

  const budget = Math.floor(ellipsisRoom / metrics.characterWidth);
  const kept = Array.from(text).slice(0, budget).join('').trimEnd();

  return kept === '' ? '' : `${kept}${LABEL_ELLIPSIS}`;
}

/* ---------------------------------------------------------------------------------------------
 * The vocabulary a placement reasons about — boxes, requests, marks
 * ------------------------------------------------------------------------------------------- */

/** A rectangle in the drawing's own user units, as the placement reasons about it. */
export interface LabelBox {
  /** The box's left edge. */
  readonly x: number;
  /** The box's top edge. */
  readonly y: number;
  /** The box's width. */
  readonly width: number;
  /** The box's height. */
  readonly height: number;
}

/**
 * One label to place: the lines it prints, and the mark it belongs beside.
 *
 * `x` and `y` are the mark's centre, not a corner, so a candidate position is stated relative to the
 * thing the label names. `lines` holds one entry per printed line, top line first, and a label of more
 * than one line occupies the taller box the last baseline needs — which is what keeps a two-line label
 * from stepping onto its neighbour while only its first line was measured.
 */
export interface LabelRequest {
  /** The caller's key for the mark, which is how the placement is read back and how a mark is ignored. */
  readonly key: string;
  /** The lines the label prints, top line first. */
  readonly lines: readonly string[];
  /** The x of the mark the label belongs beside. */
  readonly x: number;
  /** The y of the mark the label belongs beside. */
  readonly y: number;
}

/**
 * A mark a label or a box must keep clear of, named by the key of the label or box that belongs beside it.
 *
 * The key is what lets a label ignore the mark it belongs to — a name is meant to sit beside its own
 * mark — while stepping around every other mark, ring and badge row in the drawing.
 */
export interface LabelObstacle {
  /** The key of the label or box that belongs beside this mark; the one holding it ignores this box. */
  readonly key: string;
  /** The box the mark occupies, ring included. */
  readonly box: LabelBox;
}

/** A placed label: where its first line starts, and the lines as they fit. */
export interface LabelPlacement {
  /** The left edge of the label's text column, in user units. */
  readonly labelX: number;
  /** The baseline of the label's first line, in user units. */
  readonly labelY: number;
  /** The lines as they fit, in the order the request stated them; a shortened line carries the ellipsis. */
  readonly lines: readonly string[];
}

/**
 * One box to place beside a mark: the size the box draws at, and the mark it belongs beside.
 *
 * A box is placed for something that has a size of its own rather than a run of text — the row of
 * evidence-pin numerals a map node carries is one — so the placement answers where its corner goes and
 * never what it prints. `x` and `y` are the mark's centre, as they are for a label, so both requests
 * state the same thing about the thing they belong to.
 */
export interface BoxRequest {
  /** The caller's key for the mark, which is how the placement is read back and how a mark is ignored. */
  readonly key: string;
  /** The width the box draws at, in the drawing's user units. */
  readonly width: number;
  /** The height the box draws at, in the drawing's user units. */
  readonly height: number;
  /** The x of the mark the box belongs beside. */
  readonly x: number;
  /** The y of the mark the box belongs beside. */
  readonly y: number;
}

/** A placed box: where its top-left corner goes, in the drawing's user units. */
export interface BoxPlacement {
  /** The box's left edge. */
  readonly x: number;
  /** The box's top edge. */
  readonly y: number;
}

/* ---------------------------------------------------------------------------------------------
 * The fit — what the caller's drawing states about its own room
 * ------------------------------------------------------------------------------------------- */

/**
 * The room a drawing gives the boxes it places, and the geometry a candidate position is built from.
 *
 * Every number here belongs to the caller: a map 960 units wide and a radar 520 units wide cannot share
 * one set of distances, and neither can a drawing whose marks are 15 units across and one whose marks are
 * 3. The algorithm is shared, the geometry is not, which is why neither drawing's proportions are forced
 * on the other by composing this module.
 */
export interface BoxFit {
  /** The drawing's own coordinate box: nothing is placed outside it. */
  readonly bounds: { readonly width: number; readonly height: number };
  /** The clear space kept between a placed box and the drawing's edge, and between two placed boxes. */
  readonly clearance: number;
  /** How far a mark's own ring reaches, so a label centred above or below it clears the ring. */
  readonly markRadius: number;
  /** How far from its mark a label or a box is tried, nearest first. */
  readonly distances: readonly number[];
}

/**
 * The room a drawing gives the names it prints: where they may go, and how wide a run may be.
 *
 * It is a {@link BoxFit} plus the type the names are set in, so a drawing states its room once and the
 * placement of a name and of a box beside it read the same distances, the same clear space and the same
 * bounds.
 */
export interface LabelFit extends BoxFit {
  /** The type step the labels are set in and the character width they are estimated from. */
  readonly metrics: SvgTextMetrics;
  /** The height of one line's box, measured upwards from its baseline. */
  readonly boxHeight: number;
  /** The distance between the baselines of two lines of one label. */
  readonly lineHeight: number;
  /** The widest a shortened label may be; a run longer than this is cut before it is placed again. */
  readonly maxTextWidth: number;
  /**
   * The widths a name the drawing cannot seat whole is shortened to and tried again at, widest first.
   *
   * A drawing whose names all fit states nothing here, and its runs are cut only to
   * {@link maxTextWidth}. A drawing whose marks crowd into a few dozen units states a ladder, because
   * there the narrow gap between two neighbours seats a shortened name where no candidate seats the
   * whole run, and a shortened name is worth more to a reader than an absent one. Each width is tried
   * over every candidate position before the next, narrower one is tried.
   */
  readonly shorteningWidths?: readonly number[];
}

/** Where a candidate position puts a label's first line, before its box is measured. */
interface CandidatePosition {
  /** The left edge of the text column. */
  readonly labelX: number;
  /** The baseline of the first line. */
  readonly labelY: number;
}

/**
 * The clear space this layer's drawings keep between a printed name, its neighbours and the drawing's
 * edge, in user units.
 *
 * It is the space a reader needs to read two names as two rather than as one run of letters, and it is
 * the same on all four sides of a name's box, so the rule holds wherever a name is placed. A drawing may
 * state its own space in {@link LabelFit.clearance}; the maps and charts in this layer share this one.
 */
export const LABEL_CLEARANCE = 4;

/**
 * The distances the atlas network view tries a label at, nearest first, in that drawing's user units.
 *
 * A label first tries the clear space beside its mark. When that space is taken — by another label or by
 * another mark — it tries the next distance out, so a name in a crowded region steps away from its mark
 * instead of printing over its neighbour's. The distances are fixed, so the same payload resolves the
 * same collisions every time and a re-render never moves a name. A drawing whose marks are a different
 * size states its own ladder rather than borrowing this one.
 */
export const LABEL_DISTANCES: readonly number[] = [10, 24, 38, 54, 72];

/**
 * The rows a label is offered at, for each distance: the mark's own row, then two rows above it and two
 * below, each one line's box and the clear space further away.
 *
 * A cluster the projection squeezes into a few dozen units has no room left or right, so its names have
 * to stack; five rows at every distance give a crowded name a row of its own instead of a run printed over
 * its neighbour's, and the mark's own row is tried first so an uncrowded name keeps the plain reading
 * position it had.
 */
const CANDIDATE_ROWS: readonly number[] = [0, -1, 1, -2, 2];

/**
 * The rows a box is offered at, for each distance: the mark's own row, then three rows above it and
 * three below, each one box and the clear space further away.
 *
 * More rows than a name is offered, because a cluster of places carries a run of small boxes — every node
 * with evidence pins states its counts — and the boxes stack in a column beside the cluster where names
 * cannot: the nearest clear row wins, so each row still sits as close to its own mark as the drawing
 * allows.
 */
const BOX_CANDIDATE_ROWS: readonly number[] = [0, -1, 1, -2, 2, -3, 3];

/**
 * The places a label may sit relative to its mark, in the order they are tried.
 *
 * Each distance is tried with the same placements — to the right of the mark at three heights, to its
 * left at the same three, and centred above and below it — so a label prefers the plain reading position
 * and steps outwards only as far as it has to. The first three are the positions a reader's eye expects,
 * in the order a right-reading overlay reads them; the three to the left follow in the same order, then
 * the two centred ones, and the run that would start below the mark's left follows last, because it is
 * the position a reader finds latest. Every one of them is offered on each of {@link CANDIDATE_ROWS}.
 *
 * @param request The label to place.
 * @param width The width of the label's widest line.
 * @param fit The room and geometry the drawing states.
 * @returns The candidate positions, most preferred first.
 */
function candidatesOf(
  request: LabelRequest,
  width: number,
  fit: LabelFit,
): readonly CandidatePosition[] {
  const candidates: CandidatePosition[] = [];
  const size = fit.metrics.fontSize;
  const rowStep = fit.boxHeight + fit.clearance;

  for (const distance of fit.distances) {
    const right = request.x + distance;
    const left = request.x - distance - width;
    const centred = request.x - width / 2;
    const above = request.y - fit.markRadius - distance + 10;
    const below = request.y + fit.markRadius + distance + 4;

    for (const row of CANDIDATE_ROWS) {
      const shift = row * rowStep;

      candidates.push(
        { labelX: right, labelY: request.y + 4 + shift },
        { labelX: right, labelY: request.y - size + shift },
        { labelX: right, labelY: request.y + size + 8 + shift },
        { labelX: left, labelY: request.y + 4 + shift },
        { labelX: left, labelY: request.y - size + shift },
        { labelX: centred, labelY: above + shift },
        { labelX: centred, labelY: below + shift },
        { labelX: left, labelY: request.y + size + 8 + shift },
      );
    }
  }

  return candidates;
}

/**
 * The box a label covers when its first line starts at one candidate position.
 *
 * The box's top edge is one type step above the first baseline, because the box's height grows upwards
 * from the line the text was given, and a label of several lines extends downwards by the distance
 * between the last two baselines.
 *
 * @param position Where the label's first line starts.
 * @param width The width of the label's widest line.
 * @param lineCount How many lines the label prints.
 * @param fit The room and geometry the drawing states.
 * @returns The label's box.
 */
function boxOf(
  position: CandidatePosition,
  width: number,
  lineCount: number,
  fit: LabelFit,
): LabelBox {
  return {
    x: position.labelX,
    y: position.labelY - fit.metrics.fontSize,
    width,
    height: fit.boxHeight + Math.max(0, lineCount - 1) * fit.lineHeight,
  };
}

/**
 * Whether a box sits inside the drawing's box, clear of its edge by the stated space.
 *
 * @param box The box: a label's, or a box the drawing places beside a mark.
 * @param fit The room and geometry the drawing states.
 * @returns `true` when the box is wholly inside the drawing.
 */
export function labelFitsInside(box: LabelBox, fit: BoxFit): boolean {
  return (
    box.x >= fit.clearance &&
    box.y >= fit.clearance &&
    box.x + box.width <= fit.bounds.width - fit.clearance &&
    box.y + box.height <= fit.bounds.height - fit.clearance
  );
}

/**
 * Whether two label boxes intersect, each grown by the clear space the drawing states.
 *
 * The gap is added on all four sides, so the answer is about the space a reader needs between two names
 * rather than about the glyph boxes alone.
 *
 * @param one A box.
 * @param other The other box.
 * @param clearance The clear space kept between them.
 * @returns `true` when the two boxes are closer than the clearance on every axis.
 */
export function labelBoxesCollide(one: LabelBox, other: LabelBox, clearance: number): boolean {
  return (
    one.x < other.x + other.width + clearance &&
    other.x < one.x + one.width + clearance &&
    one.y < other.y + other.height + clearance &&
    other.y < one.y + one.height + clearance
  );
}

/**
 * The box a mark occupies, grown to the ring a reader sees around it.
 *
 * @param key The key the thing being placed is stored under — a label's key or a box's — so the mark's
 *   own label or box may ignore it.
 * @param x The mark's centre x.
 * @param y The mark's centre y.
 * @param radius How far the mark's own ring reaches.
 * @returns The obstacle a label keeps clear of.
 */
export function markObstacleOf(
  key: string,
  x: number,
  y: number,
  radius: number,
): LabelObstacle {
  return {
    key,
    box: { x: x - radius, y: y - radius, width: 2 * radius, height: 2 * radius },
  };
}

/* ---------------------------------------------------------------------------------------------
 * The placement — the first candidate that is clear, then a shorter run, then nothing; and the same
 * search for a box, which is never dropped
 * ------------------------------------------------------------------------------------------- */

/** The width of a label's widest line. */
function widestLineOf(lines: readonly string[], metrics: SvgTextMetrics): number {
  let widest = 0;

  for (const line of lines) {
    widest = Math.max(widest, estimateTextWidth(line, metrics));
  }

  return widest;
}

/** A position rounded to the drawing's grid, so the same props emit the same markup twice. */
function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The first candidate position for one run of lines, or `null` when every candidate is taken or outside.
 *
 * @param request The label to place.
 * @param lines The lines to place, which may already have been shortened.
 * @param blockers The boxes already occupied, which this label may not touch.
 * @param fit The room and geometry the drawing states.
 * @returns The placement, or `null`.
 */
function clearPositionOf(
  request: LabelRequest,
  lines: readonly string[],
  blockers: readonly LabelBox[],
  fit: LabelFit,
): LabelPlacement | null {
  const width = widestLineOf(lines, fit.metrics);

  if (width <= 0) {
    return null;
  }

  for (const candidate of candidatesOf(request, width, fit)) {
    const box = boxOf(candidate, width, lines.length, fit);

    if (!labelFitsInside(box, fit)) {
      continue;
    }

    if (blockers.some((blocker) => labelBoxesCollide(blocker, box, fit.clearance))) {
      continue;
    }

    return { labelX: rounded(candidate.labelX), labelY: rounded(candidate.labelY), lines };
  }

  return null;
}

/**
 * The runs one label is offered, in the order they are tried: the caller's own run cut to
 * {@link LabelFit.maxTextWidth}, because that is the widest the drawing prints, and then the same run
 * cut to each of {@link LabelFit.shorteningWidths}.
 *
 * A cut identical to the one before it is dropped, so a drawing that states no ladder — or whose names
 * all fit — costs the single attempt of its own run, and a further attempt is spent only when a
 * narrower cut actually changes the text. A cut that would print nothing at all is dropped too,
 * because a label of no glyphs is not a label.
 *
 * @param request The label to place.
 * @param fit The room and geometry the drawing states.
 * @returns The runs to try, widest first.
 */
function attemptsOf(request: LabelRequest, fit: LabelFit): readonly (readonly string[])[] {
  const attempts: (readonly string[])[] = [];
  const widths = [fit.maxTextWidth, ...(fit.shorteningWidths ?? [])];

  for (const width of widths) {
    const lines = request.lines.map((line) => truncateToWidth(line, width, fit.metrics));
    const previous = attempts[attempts.length - 1];

    if (lines.some((line) => line === '')) {
      continue;
    }

    if (previous !== undefined && previous.every((line, index) => line === lines[index])) {
      continue;
    }

    attempts.push(lines);
  }

  return attempts;
}

/**
 * The box a placement covers, in the drawing's user units.
 *
 * The search keeps the boxes it has already answered clear of the next, so the box this reads is the one
 * the candidate was tested as rather than one rebuilt later from the placement's two numbers.
 *
 * @param placement A placement this module answered.
 * @param fit The room and geometry the drawing states.
 * @returns The box the placed lines occupy.
 */
function labelPlacementBoxOf(placement: LabelPlacement, fit: LabelFit): LabelBox {
  return boxOf(
    { labelX: placement.labelX, labelY: placement.labelY },
    widestLineOf(placement.lines, fit.metrics),
    placement.lines.length,
    fit,
  );
}

/**
 * Resolves a position for every label, keeping them off each other, off the marks and off the edge.
 *
 * WHY THIS EXISTS. Two marks can stand at one point — a competitor's site a few units from the client's
 * own, two records stating one coordinate, a cluster of plants an ocean apart on a projection that
 * squeezes them together — and a name printed from each of them overprints the other, so neither can be
 * read. This walks the labels in the order the caller states, and gives each the first candidate that is
 * inside the drawing and clear of every obstacle and of every label already placed.
 *
 * WHAT HAPPENS WHEN THERE IS NO ROOM. The run is shortened and the whole search runs again, widest cut
 * first (see {@link attemptsOf}), because a shorter name needs less space and is worth more to a reader
 * than an absent one. Only a label that cannot be cleared at its shortest is left out of the answer: it
 * is never placed on top of another, so a caller that finds no entry for a key draws no text there and
 * leans on the mark's accessible name — which is why the caller's mark must carry the record's full text.
 *
 * THE ORDER IS THE PRECEDENCE. A caller that places its most important labels first has them seated before
 * the ones it can afford to lose, so this module never has to guess which name matters.
 *
 * @param requests The labels to place, in reading order of precedence.
 * @param obstacles The marks each label must keep clear of, its own included and ignored.
 * @param fit The room and geometry the drawing states.
 * @returns One placement per label that has room, keyed by the request's key.
 */
export function placeLabels(
  requests: readonly LabelRequest[],
  obstacles: readonly LabelObstacle[],
  fit: LabelFit,
): ReadonlyMap<string, LabelPlacement> {
  const placements = new Map<string, LabelPlacement>();
  const occupied: LabelBox[] = [];

  for (const request of requests) {
    const blockers = [
      ...obstacles.filter((obstacle) => obstacle.key !== request.key).map((obstacle) => obstacle.box),
      ...occupied,
    ];
    let placement: LabelPlacement | null = null;

    for (const lines of attemptsOf(request, fit)) {
      placement = clearPositionOf(request, lines, blockers, fit);

      if (placement !== null) {
        break;
      }
    }

    if (placement === null) {
      continue;
    }

    placements.set(request.key, placement);
    occupied.push(labelPlacementBoxOf(placement, fit));
  }

  return placements;
}

/**
 * The boxes a box of one size is offered around its mark: up and to the right of it, up and to the left,
 * down and to the right, down and to the left, then beside it at its own height on either side, and
 * centred above and below — each at every distance the drawing states and on each of
 * {@link BOX_CANDIDATE_ROWS}.
 *
 * The four diagonal places come first because a box beside a mark is read as belonging to the mark it
 * sits off, and the diagonals leave both the mark and the row a name prints in beside it untouched;
 * every other place follows, nearest distance first, so a box steps outwards only as far as it must.
 *
 * @param request The box to place.
 * @param fit The room and geometry the drawing states.
 * @returns The candidate boxes, most preferred first.
 */
function boxCandidatesOf(request: BoxRequest, fit: BoxFit): readonly LabelBox[] {
  const candidates: LabelBox[] = [];
  const { width, height } = request;
  const rowStep = height + fit.clearance;

  for (const distance of fit.distances) {
    const right = request.x + distance;
    const left = request.x - distance - width;
    const centred = request.x - width / 2;

    for (const row of BOX_CANDIDATE_ROWS) {
      const shift = row * rowStep;

      candidates.push(
        { x: right, y: request.y - distance - height + shift, width, height },
        { x: left, y: request.y - distance - height + shift, width, height },
        { x: right, y: request.y + distance + shift, width, height },
        { x: left, y: request.y + distance + shift, width, height },
        { x: right, y: request.y - height / 2 + shift, width, height },
        { x: left, y: request.y - height / 2 + shift, width, height },
        {
          x: centred,
          y: request.y - fit.markRadius - distance - height + shift,
          width,
          height,
        },
        { x: centred, y: request.y + fit.markRadius + distance + shift, width, height },
      );
    }
  }

  return candidates;
}

/**
 * The candidate a box falls back on when not one of its candidates is clear: the first candidate inside the
 * drawing that meets the fewest obstacles, or `undefined` when no candidate lies inside it at all.
 *
 * This is the last resort before {@link homePlacementOf}, and it exists because a box is never left out. It
 * is not a licence to overlap: the count is of the boxes already placed as well as the obstacles, and each
 * box joins them as soon as it is answered, so two boxes that both run out of room are still pushed apart
 * from each other — the second meets the first and answers a place that meets fewer, which is what keeps a
 * crowded drawing from stacking its numerals on one point.
 *
 * @param candidates The candidates, most preferred first.
 * @param blockers The boxes the candidate may not touch.
 * @param fit The room and geometry the drawing states.
 * @returns The best candidate inside the drawing, or `undefined` when none is inside it.
 */
function leastBlockedOf(
  candidates: readonly LabelBox[],
  blockers: readonly LabelBox[],
  fit: BoxFit,
): LabelBox | undefined {
  let best: LabelBox | undefined;
  let fewest = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    if (!labelFitsInside(candidate, fit)) {
      continue;
    }

    const met = blockers.filter((blocker) =>
      labelBoxesCollide(blocker, candidate, fit.clearance),
    ).length;

    if (met < fewest) {
      best = candidate;
      fewest = met;

      if (met === 0) {
        break;
      }
    }
  }

  return best;
}

/**
 * The pitch of the search a box falls back on when every place beside its mark is taken, in user units.
 *
 * A cropped frame can project a whole cluster into one corner — the atlas's five presets frame five regions
 * of one world, and the client's own sites stand in one band of it — and a box anchored inside that cluster
 * then finds no clear place within the ladder its drawing states, while the rest of the surface is empty.
 * The search therefore continues over the drawing itself on this grid, which is coarse enough to stay a
 * short list and fine enough that neighbouring boxes do not all answer the same cell.
 */
const BOX_ESCAPE_STEP = 32;

/**
 * The nearest clear place for a box on the drawing's own grid, or `undefined` when the whole surface is taken.
 *
 * The cells are walked in a fixed order and the nearest to the box's own mark wins, with the first cell of an
 * equal distance kept, so the answer is a pure function of the requests, the boxes already placed and the
 * drawing's bounds: the same payload spreads its boxes the same way on every render.
 *
 * @param request The box to place.
 * @param blockers The boxes the place may not touch.
 * @param fit The room and geometry the drawing states.
 * @returns The clear grid place, or `undefined`.
 */
function clearGridPlaceOf(
  request: BoxRequest,
  blockers: readonly LabelBox[],
  fit: BoxFit,
): LabelBox | undefined {
  let best: LabelBox | undefined;
  let nearest = Number.POSITIVE_INFINITY;

  for (
    let y = fit.clearance;
    y + request.height <= fit.bounds.height - fit.clearance;
    y += BOX_ESCAPE_STEP
  ) {
    for (
      let x = fit.clearance;
      x + request.width <= fit.bounds.width - fit.clearance;
      x += BOX_ESCAPE_STEP
    ) {
      const candidate: LabelBox = { x, y, width: request.width, height: request.height };

      if (blockers.some((blocker) => labelBoxesCollide(blocker, candidate, fit.clearance))) {
        continue;
      }

      const distance = Math.hypot(
        candidate.x + candidate.width / 2 - request.x,
        candidate.y + candidate.height / 2 - request.y,
      );

      if (distance < nearest) {
        best = candidate;
        nearest = distance;
      }
    }
  }

  return best;
}

/**
 * The box a request is drawn in when none of its candidates lies on the drawing: the nearest place beside
 * its mark, whether or not that place is clear.
 *
 * This is the map lens's own rule for a mark a zoomed frame projects off the surface, stated for a name in
 * `labelAt` and applied here for a row of numerals: the row travels with its mark, off the surface, where
 * the drawing's frame cuts it and it covers nothing, rather than being clamped to the edge — a row sitting
 * at the frame's edge would read as belonging to whatever mark is drawn there.
 *
 * @param request The box to place.
 * @param fit The room and geometry the drawing states.
 * @returns The box's top-left corner, at the box's home position beside its mark.
 */
function homePlacementOf(request: BoxRequest, fit: BoxFit): BoxPlacement {
  const distance = fit.distances[0] ?? 0;

  return {
    x: rounded(request.x + distance),
    y: rounded(request.y - distance - request.height),
  };
}

/**
 * Resolves a position for every box, keeping them off each other, off the marks and off the edge.
 *
 * WHY THIS IS SEPARATE FROM {@link placeLabels}. A box is not a run of text: it has a size the caller
 * draws at and nothing to shorten, so it has no lines to cut and no width to estimate, and the caller
 * cannot lean on an accessible name for it the way a mark does for a name it could not print — a row of
 * evidence-pin numerals states counts the mark's accessible name repeats, and a row left out would put
 * the drawing's own figure count at odds with the record it draws. A BOX IS THEREFORE NEVER LEFT OUT, and
 * the places it is answered at, in order, are: the first candidate inside the drawing and clear of every
 * obstacle; when none is clear, the nearest clear place on the drawing's own grid (see
 * {@link clearGridPlaceOf}), which is what a cluster a cropped frame squeezes into one corner leaves; when
 * the surface has no room at all, the candidate meeting the fewest obstacles (see {@link leastBlockedOf});
 * and for a mark the frame puts off the surface, its own home position, which the frame cuts, exactly as a
 * crossing's pair there does (see {@link homePlacementOf}). The search is only run for a mark the drawing
 * contains: a row pulled onto the surface from a mark outside it would read as some other place's.
 *
 * The rest is {@link placeLabels}' rule: the walk is in the caller's order, each box must clear every
 * obstacle but its own mark's and every box already placed, and the answer is keyed by the request's key.
 *
 * @param requests The boxes to place, in reading order of precedence.
 * @param obstacles The marks each box must keep clear of, its own included and ignored.
 * @param fit The room and geometry the drawing states.
 * @returns One placement per box, keyed by the request's key.
 */
export function placeBoxes(
  requests: readonly BoxRequest[],
  obstacles: readonly LabelObstacle[],
  fit: BoxFit,
): ReadonlyMap<string, BoxPlacement> {
  const placements = new Map<string, BoxPlacement>();
  const occupied: LabelBox[] = [];

  for (const request of requests) {
    const blockers = [
      ...obstacles.filter((obstacle) => obstacle.key !== request.key).map((obstacle) => obstacle.box),
      ...occupied,
    ];
    const candidates = boxCandidatesOf(request, fit);
    const onTheDrawing =
      request.x >= 0 &&
      request.y >= 0 &&
      request.x <= fit.bounds.width &&
      request.y <= fit.bounds.height;
    const seated = !onTheDrawing
      ? undefined
      : (candidates.find(
          (candidate) =>
            labelFitsInside(candidate, fit) &&
            !blockers.some((blocker) => labelBoxesCollide(blocker, candidate, fit.clearance)),
        ) ??
        clearGridPlaceOf(request, blockers, fit) ??
        leastBlockedOf(candidates, blockers, fit));
    const answer =
      seated === undefined
        ? homePlacementOf(request, fit)
        : { x: rounded(seated.x), y: rounded(seated.y) };

    placements.set(request.key, answer);
    occupied.push({ ...answer, width: request.width, height: request.height });
  }

  return placements;
}
