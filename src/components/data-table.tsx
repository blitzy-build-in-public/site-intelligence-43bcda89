/**
 * The one table the application renders.
 *
 * Every screen, panel and chart table view renders its rows through `DataTable`, so the `<table>`
 * structure, the caption, the scoped column headers, the sortable header controls and the keyboard
 * row cursor exist in exactly one place. A screen, a feature folder or any other component must
 * never write a `<table>` of its own (AAP §0.5.2): this component is the application's only table
 * vocabulary, and `chart-frame.tsx` renders each chart's "View as table" view with it.
 *
 * The component is presentational by contract (rule P-6). It computes no figure of its own, formats
 * nothing and sorts nothing: `column.render` returns the cell content the caller computed from the
 * service's response, and ordering is the caller's `sort` state reported back through `onSort`. A
 * caller whose rows arrive already ordered by the service states that order as `defaultOrder`, and the
 * column it names announces it — through `aria-sort`, the caret and the label colour, exactly as a
 * sorted column does — without the table applying it, reordering anything or reporting it through
 * `onSort`, so the order in effect is announced before a reader touches a header. It carries no
 * simulated-data label of its own either (rule P-1) — a column whose figures came from a seed record
 * carries its own label inside the caller's `render`.
 *
 * A caller that bounds its rows (`pageSize`) gets one window of them, with its own controls and a
 * sentence counting the window inside the whole row set. That window is the caller's bound shown, not
 * a second computation of it: the rows it pages are exactly the rows it was handed, the position it
 * prints is counted from them, and no count appears that the rows did not supply (rule P-6).
 *
 * A table with nothing to show renders the caller's `emptyMessage` in one cell spanning every
 * column, and that prop is required so the cell can never be blank. A table the caller declared no
 * columns for counts as nothing to show and takes the same cell, because a row of no cells is not a
 * row: it states nothing on screen and reaches no assistive technology.
 *
 * Row height comes from density tokens rather than from a pixel value here: `--row-height`, bound to
 * `--row-compact` at 32px and `--row-comfortable` at 44px by `src/theme/tokens.css`, and
 * `--row-padding`, bound to the same attribute at 0px and 6px. A row's `height` is only a minimum, so
 * a cell that stacks or wraps overruns the row token and the switch would then change nothing on that
 * table; the cell padding is what carries the density past that floor, and a single-line cell is where
 * the row lands exactly on the row token. This component reads those two tokens only;
 * `src/theme/theme-provider.tsx` sets `data-density` on `<html>`.
 */
import { CaretDown } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, ReactNode } from 'react';

import { ActionButton } from './tooltip';

/**
 * One column of a table: its identity, its visible and accessible header, and how a cell is drawn.
 *
 * `TableColumn` and `DataTableProps` are the shared table vocabulary of the application, so their
 * shape is stable — `chart-frame.tsx`, the exception queue, the approvals inbox, the audit trail,
 * the risk-by-plant rows and the chokepoint table all speak it.
 */
export interface TableColumn<Row> {
  /** Stable column id, used for sorting and as the React key of the cells it produces. */
  readonly id: string;
  /** The visible header text, which is also the accessible name of the column's sort control. */
  readonly header: string;
  /** Whether the header renders a sort control. A column that cannot be ordered omits it. */
  readonly sortable?: boolean;
  /** `end` for numeric columns, so figures line up on their last digit. Defaults to `start`. */
  readonly align?: 'start' | 'end';
  /**
   * Whether the column's cells hold one line, which they do when the caller sets it.
   *
   * A row's `height` is `--row-height`, the density token, and a row's `height` is only a minimum: a
   * cell that wraps or stacks deeper than the token grows the row past it, and the density switch then
   * reaches that row through the cell's `--row-padding` alone. A single-line cell is the case where the
   * two mechanisms agree — the row lands exactly on the token, at 32px compact and 44px comfortable —
   * and it also takes its value's own width, so an identifier is never broken mid-token, and what the
   * wider table needs it takes from the scroll container instead of from the row.
   */
  readonly singleLine?: boolean;
  /**
   * Whether the column stays at the container's inline end while the table scrolls sideways.
   *
   * A column of row controls stays reachable at rest however wide the table gets, rather than
   * sitting past the container's edge until the reader scrolls to it. The pinned cell paints the
   * ground role, because it belongs to a table standing on the page, and it follows the activatable
   * row's hover and press fill, so the row's feedback is not cut off where the pin begins.
   *
   * The pin holds from the `md` breakpoint up, where the container has room for the column and for
   * the columns beside it. Below that a pinned column would cover most of a phone-width container,
   * so it keeps its place in the table there and the reader scrolls to it.
   *
   * A pin is painted above the cells that scroll under it, so it covers whatever columns reach the
   * container's inline end at rest together with the sort controls in their headers; pin a table only
   * where its remaining columns fit beside the pin.
   */
  readonly pinned?: boolean;
  /**
   * The cell content. Money, identifiers and timestamps arrive already wrapped by the caller. The
   * index is the row's own position in the `rows` the caller supplied, so a windowed table hands a
   * cell the position the row holds in the whole set rather than its offset in the window.
   */
  readonly render: (row: Row, index: number) => ReactNode;
}

/** The column the rows are currently ordered by, and in which direction. */
export interface TableSort {
  readonly columnId: string;
  readonly direction: 'asc' | 'desc';
}

/** Everything a `DataTable` needs. The sort is fully controlled by the caller. */
export interface DataTableProps<Row> {
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  /**
   * The greatest number of rows the table shows at once, or absent for every row it is given.
   *
   * Absent, the component renders exactly the rows it was handed and no controls: no caller that
   * supplies its own page, or none at all, changes. Supplied, it bounds the rendering the way the
   * caller already bounded the read behind it — one window of `pageSize` rows, its Previous and Next
   * controls, and a sentence counting the window inside the whole row set — while `aria-rowcount` keeps
   * announcing the whole set and each row keeps announcing its own position in it, so a reader is told
   * where the window sits rather than that the table shrank. The value is a count of rows and nothing
   * else, so a caller whose page size is not a whole positive number, or is at least as wide as its
   * rows, gets the unwindowed table rather than a control that could never act.
   */
  readonly pageSize?: number;
  /** A stable key per row, so a re-sort or a write-back re-render does not remount the rows. */
  readonly getRowKey: (row: Row) => string;
  /** The table's accessible name, rendered as its `<caption>`. Required: an unnamed table fails B-3. */
  readonly caption: string;
  /** The active sort, or `null` when the rows are in the caller's own order. */
  readonly sort: TableSort | null;
  /** Called with a column id when the user activates that column's sort control. */
  readonly onSort: (columnId: string) => void;
  /**
   * The order the caller's rows already arrived in, which this table announces but never applies.
   *
   * A read that orders its own rows — the queue's severity-then-days order, the audit trail's newest
   * first, the inbox's identifier ascending — hands that order here, so the column it names reports
   * `aria-sort` instead of leaving every header unsorted while the rows are visibly ordered. It is not
   * sort state: it changes no row, re-sorts nothing, calls nothing and is reported through no prop, and
   * it is ignored outright the moment `sort` is non-null, because `sort` is the order the caller is
   * applying and this is only the one the caller was handed.
   */
  readonly defaultOrder?: TableSort | null;
  /**
   * Called when the user opens the row: `Enter` on the row cursor, or a pointer click on the row —
   * anywhere outside a control the row holds, whose own click stays with that control. One gesture
   * opens the row once: the later clicks of a multi-click sequence are ignored, because the first
   * of them has already opened it.
   */
  readonly onRowActivate?: (row: Row) => void;
  /**
   * The sentence shown in a single full-width cell when the table shows no data rows — because the
   * caller supplied none, or because it declared no columns to show them in. Required: a table that
   * renders neither rows nor a sentence leaves a blank grid where every other state is explained.
   * The caller supplies it because the sentence belongs to the screen (AAP §0.12.4), and inventing
   * a default here would be a displayed string no input fixes (AAP §0.1).
   */
  readonly emptyMessage: string;
}

/**
 * Every key event whose target sits inside one of these belongs to that control, not to the row
 * cursor: a `J` typed into a field is a character, and `Enter` on a button is that button's own
 * activation. The selector also matches a control's descendants, so a key pressed on the text inside
 * a button stays with the button.
 */
const CONTROL_TARGET_SELECTOR =
  'input, textarea, select, button, a[href], [contenteditable="true"], [role="button"], [role="link"]';

/**
 * The density token, read as a CSS value rather than a pixel height, so `data-density` drives it.
 * Written as an arbitrary utility because the height is a custom property, not a scale step. On a
 * `<tr>` this is a minimum, so `CELL_CLASS` carries the other half of the density choice.
 */
const ROW_HEIGHT_CLASS = 'h-[var(--row-height)]';

/*
  `border-separate` with `border-spacing-0` rather than `border-collapse`: a sticky cell's own
  inline-start border paints only under separate borders, and zero spacing keeps the hairline row
  separators exactly where the collapsed model drew them, with no doubled border between two cells.
 */
const TABLE_CLASS = 'w-full border-separate border-spacing-0 text-13 text-text-primary';

/**
 * A header cell: the hairline under it, the mono face at the caption step, and the inline padding the
 * column's header text and its sort caret are read against.
 *
 * The inline padding takes the narrowest 4 px step below `sm` and the documented 12 px from `sm` up.
 * A four-column table at phone width cannot hold its figures whole at 12 px of inline padding: the
 * overview's risk-by-plant table measures 404.1 px of minimum width inside a 324 px box at a 390 px
 * viewport, so the money column's header and digits were clipped until the panel was scrolled. Only
 * the inline padding moves, so the density mechanism (`--row-height`, `--row-padding`) and every
 * control's 24x24 px target are untouched, and the shared `:focus-visible` ring keeps its 4 px of
 * space from the scroll container's own `px-1`.
 */
const HEADER_CELL_CLASS =
  'border-b border-hairline px-1 py-2 font-mono text-12 font-medium text-text-caption sm:px-3';

/**
 * A body cell: the hairline under it, the horizontal step beside it, and the density's own vertical
 * padding above and below it.
 *
 * The padding is what keeps the density choice visible on a table whose cells stack. `ROW_HEIGHT_CLASS`
 * sets the row's height, and a row's `height` is only a minimum, so a cell holding two lines measures
 * taller than the token whatever the row states and the switch would then change nothing there. The
 * padding takes half of the difference between the two row heights on each side, so such a row grows
 * by exactly the 12 px the token names. The value lives in `src/theme/tokens.css` as `--row-padding`,
 * so no pixel length is written here.
 *
 * The inline padding follows the header cell's: the narrowest 4 px step below `sm` and the documented
 * 12 px from `sm` up, because a four-column table at phone width cannot hold its figures whole at
 * 12 px of inline padding (measured: 404.1 px of table inside a 324 px box at a 390 px viewport, the
 * money column's digits cut mid-number). Only the inline padding changes, so the vertical padding
 * above stays the density's own and no control's 24x24 px target moves.
 */
const CELL_CLASS = 'border-b border-hairline px-1 py-[var(--row-padding)] align-middle sm:px-3';

/**
 * A pinned column's cell: held at the scroll container's inline end, above the cells that scroll
 * under it, on the ground role the table itself stands on. Its inline-start hairline draws the pin's
 * edge, and its hover and press fills are the activatable row's own, so the row's feedback runs
 * across the pin rather than stopping where the pin begins.
 *
 * Every utility is `md:`-scoped for the reason the column's `pinned` member documents: the pin needs
 * room for the column and for the columns beside it, which a phone-width container does not have.
 */
const PINNED_CELL_CLASS =
  'md:sticky md:end-0 md:z-10 md:border-s md:border-hairline md:bg-ground md:group-hover:bg-surface-2 md:group-active:bg-surface-1';

/**
 * A pinned column's header cell: the same pin on the same ground, without the row fills, because a
 * header cell belongs to no activatable row.
 */
const PINNED_HEADER_CELL_CLASS = 'md:sticky md:end-0 md:z-10 md:border-s md:border-hairline md:bg-ground';

/**
 * What the scroll container carries while any column is pinned: its inline-end scroll padding, and
 * the one thing that has to give way for it.
 *
 * The scroll padding is 288 px, the pin's own width rounded up to a spacing step. The container
 * reserves no room at its inline end on its own, so a control that takes keyboard focus there comes to
 * rest flush against the container's edge — underneath the opaque pin, whose ground fill paints over
 * the control's 2 px focus ring. A ring painted under a pin is an indicator the reader cannot see
 * (rule B-3, WCAG 2.2 SC 2.4.11 Focus Not Obscured). This padding is what the browser's own focus
 * scrolling reads: a control that would come to rest under the pin is scrolled out from under it
 * instead. The value clears the pin's width — the queue's three row controls measure 258.78 px of
 * content plus 24 px of cell padding, rounded up to the 288 px spacing step.
 *
 * The container's own inline-end padding gives way (`pe-0`) because the pin now covers that edge: the
 * 4 px of ring space is drawn behind an opaque cell there and serves nothing, while leaving it makes
 * the columns that scroll underneath show through as a strip of clipped text beside the pin.
 *
 * Both hold from the same `md` breakpoint the pin does, because below that breakpoint no column is
 * pinned and the container has no pin to clear.
 */
const PINNED_SCROLL_PADDING_CLASS = 'md:scroll-pe-72 md:pe-0';

/* Both ring-bearing controls below draw their indicator for keyboard focus only, so neither carries
   an `outline-none` reset. That reset sets `--tw-outline-style: none` on the element, and
   `focus-visible:outline-2` reads that variable back into `outline-style`, so carrying one would
   suppress the very ring B-3 requires. */

/**
 * The sort control: a real button, at least 24 by 24 px (B-3's target minimum), carrying the 2px
 * focus ring of the theme on keyboard focus only. The width and the colour are this list's; the
 * offset is the one `:focus-visible` rule's in `src/styles/index.css`, so the ring sits the same
 * distance out as every other control's rather than at a geometry of its own.
 *
 * The pointer states are role tokens: `hover:` fills the first surface and lifts the label to the
 * primary text role, `active:` holds the second surface under the press. The label colour the JSX
 * supplies says whether this column is the sorted one; these utilities outrank it on a hover and a
 * press because Tailwind emits a variant after the unprefixed utility it overrides. Both states are
 * carried by the same `motion-safe` colour transition the other controls use, so this control's
 * feedback is paced like theirs and a reduced-motion session gets it instantly.
 */
const SORT_BUTTON_CLASS =
  'inline-flex min-h-6 min-w-6 items-center gap-1 rounded-control bg-transparent p-0 font-mono text-12 font-medium hover:bg-surface-1 hover:text-text-primary active:bg-surface-2 active:text-text-primary focus-visible:outline-2 focus-visible:outline-focus-ring motion-safe:transition-colors motion-safe:duration-150';

/**
 * The row cursor's focus indicator: the same 2px theme ring, at the same geometry, as every other
 * focus stop in the product — the width and the colour from this list, the offset from the one
 * `:focus-visible` rule in `src/styles/index.css`. It carries no outline-hiding utility for the
 * reason given above: the ring the `J`/`K` cursor is followed by would lose its outline style and
 * never paint.
 */
const ROW_CLASS =
  'focus-visible:outline-2 focus-visible:outline-focus-ring';

/**
 * A row that opens something also advertises it: a pointer cursor, a hover ground and a pressed
 * ground, which swap over 150ms and are switched off entirely under `prefers-reduced-motion` (B-3).
 * The pressed fill steps back to the first surface, so a press reads as one step below the hover it
 * started from rather than as nothing happening.
 *
 * The affordance is one the row honours: a pointer click on the row — outside any control the row
 * holds, whose own click stays with that control — opens it, exactly as `Enter` on the row cursor
 * does. Nothing here advertises a gesture the row ignores (rule P-8).
 *
 * It also names the row a `group`, which is what a pinned cell's `group-hover:` and `group-active:`
 * fills key on: only a row that opens something offers that feedback, so a row that opens nothing
 * keeps its pinned cell on the ground and advertises no gesture at all.
 */
const ACTIVATABLE_ROW_CLASS =
  'group cursor-pointer transition-colors duration-150 hover:bg-surface-2 active:bg-surface-1 motion-reduce:transition-none';

/** The row of controls under a windowed table: the two controls and the sentence that counts them. */
const WINDOW_ROW_CLASS = 'flex min-w-0 flex-wrap items-center gap-3 pt-2';

/** The window's status sentence, one step down the type scale in the caption role. */
const WINDOW_SUMMARY_CLASS = 'text-12 text-text-caption';

/** The label of the control that shows the rows before the ones on screen. */
const PREVIOUS_WINDOW_LABEL = 'Previous rows';

/** The label of the control that shows the rows after the ones on screen. */
const NEXT_WINDOW_LABEL = 'Next rows';

/**
 * Why the backward control cannot act, stated because a control that cannot act owes the reader the
 * reason rather than an inert press (rule P-8). {@link ActionButton} paints it on hover and focus and
 * keeps it on screen once an activation is refused.
 */
const FIRST_WINDOW_REASON =
  'The table starts at its first row, so there is no earlier window to show.';

/** Why the forward control cannot act, on the same rule and the same mechanism as the reason above. */
const LAST_WINDOW_REASON =
  'These are the last rows the table holds, so there is no later window to show.';

/**
 * What the window says about the rows it is showing, counted from the rows the caller supplied.
 *
 * A function of those counts rather than a template holding a figure: the component states no number
 * of its own (rule P-6), so the positions and the total here can only be the ones its rows and its
 * own window produced.
 *
 * @param firstShown - The position of the window's first row, counting the caller's rows from 1.
 * @param lastShown - The position of the window's last row, on the same count.
 * @param total - The number of rows the caller supplied.
 * @returns The sentence, naming the window inside the whole row set.
 */
function windowSummary(firstShown: number, lastShown: number, total: number): string {
  return `Rows ${String(firstShown)} to ${String(lastShown)} of ${String(total)}.`;
}

/**
 * Joins the class names that apply, dropping the ones a conditional left out, so a variant reads as
 * one list at the call site instead of a template string with stray spaces.
 */
function classNames(
  ...values: readonly (string | false | null | undefined)[]
): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value !== '')
    .join(' ');
}

/**
 * The direction announced for the given column, or `null` when the order names another column.
 *
 * The order handed in is the caller's `sort` when it has one and the order its rows arrived in
 * otherwise, so the header of a table nobody has sorted still states the order the service returned.
 */
function directionFor(
  order: TableSort | null,
  columnId: string,
): 'asc' | 'desc' | null {
  if (order === null || order.columnId !== columnId) {
    return null;
  }
  return order.direction;
}

/**
 * Whether the event happened inside a control that owns its own keys — and its own activation, so a
 * click on it opens what the control offers rather than the row around it.
 */
function happenedInsideControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(CONTROL_TARGET_SELECTOR) !== null
  );
}

/**
 * A table of rows with a caption, scoped headers, sortable column controls and a `J`/`K` row cursor.
 *
 * The keyboard model is the one AAP §0.12.4 fixes and `src/app/keyboard-shortcuts.ts` documents:
 * this component owns `J` (next row), `K` (previous row) and `Enter` (open the focused row); the
 * shell owns `/` and the overlays own `Esc`. Keys whose target is a control are left alone, so the
 * cursor never steals a keystroke from a button, a link or a field.
 *
 * Exactly one row is tabbable at a time — the row cursor carries `tabIndex={0}` and every other row
 * `tabIndex={-1}` — so a table of any length is a single tab stop, and `J`/`K` then move focus
 * through the rows, wrapping at both ends.
 *
 * Each data row also states its position for assistive technology — `aria-rowindex` read against the
 * table's `aria-rowcount` — so a move with `J`/`K` announces where the cursor landed and not only
 * what the row holds.
 *
 * A `pageSize` narrows what the body paints, never what the row set is: the body holds one window of
 * that many rows, `aria-rowcount` keeps announcing every row the caller supplied, each painted row
 * keeps announcing its own position in that whole set, and `J`/`K` walk the window it can see — wrapping
 * inside it, and following it when its controls move it. A reader is therefore told that the table holds
 * rows the window does not show, which is the fact a bare shorter list would hide.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  sort,
  onSort,
  defaultOrder,
  onRowActivate,
  emptyMessage,
  pageSize,
}: DataTableProps<Row>): ReactElement {
  const tableRef = useRef<HTMLTableElement | null>(null);
  const [cursorIndex, setCursorIndex] = useState(0);
  const [windowStart, setWindowStart] = useState(0);

  /**
   * The order the headers announce: the caller's sort while it has one, and the order its rows arrived
   * in otherwise. A non-null `sort` is the caller applying an order, so it replaces the handed-in one
   * entirely rather than combining with it.
   */
  const announcedOrder = sort ?? defaultOrder ?? null;

  /**
   * Whether any column is pinned, which is the one thing the scroll container has to know about it:
   * a pin covers the container's inline end, so the container reserves that width as scroll padding
   * and a control focused there is scrolled clear of the pin instead of resting underneath it.
   */
  const hasPinnedColumn = columns.some((column) => column.pinned === true);

  /**
   * Whether the body shows the empty sentence instead of data rows. A caller that declares no
   * columns has nothing to show either, so it takes the same rendering: mapping its rows would emit
   * a `<tr>` with no `<td>` in it, which states nothing and is invisible to assistive technology.
   */
  const showsEmptyMessage = rows.length === 0 || columns.length === 0;
  /** The empty cell spans every column, and one when the caller declared no columns to span. */
  const columnCount = Math.max(columns.length, 1);
  /**
   * The rows `aria-rowcount` counts beside the header: every row the caller supplied, or the one cell
   * that explains their absence. A windowed body paints fewer of them, and the count still states the
   * whole set, because that is what a row's announced position is measured against.
   */
  const bodyRowCount = showsEmptyMessage ? 1 : rows.length;
  /**
   * What `aria-rowcount` announces: the body rows plus the header row, because ARIA numbers a
   * table's rows from 1 and this table's row 1 is the header. A data row's `aria-rowindex` is its
   * 0-based list position plus 2 for the same reason. A windowed table counts the rows the caller
   * supplied rather than the window it paints, which is what tells a reader that rows are held back.
   */
  const rowCount = bodyRowCount + 1;

  /**
   * The number of rows one window holds: the page size where the caller stated one this table can
   * honour — a whole positive count, narrower than the rows it supplied — and every row otherwise, so
   * an absent, fractional, non-positive or wider page size leaves the table it always was.
   */
  const statedPageSize = pageSize === undefined ? undefined : Math.trunc(pageSize);
  const windowLength =
    statedPageSize !== undefined &&
    Number.isFinite(statedPageSize) &&
    statedPageSize >= 1 &&
    statedPageSize < rows.length
      ? statedPageSize
      : rows.length;
  /** Whether the body paints one window of the rows rather than all of them. */
  const windowed = !showsEmptyMessage && windowLength < rows.length;

  /** The last start a full window can take, so the final window is a full one rather than a stub. */
  const lastWindowStart = Math.max(rows.length - windowLength, 0);
  /**
   * The window this render shows, clamped rather than trusted as stored: a filter, a write-back or a
   * role switch can hand this table fewer rows than the window it was left on, and an unclamped start
   * would paint nothing at all. It is zero whenever the body shows the empty sentence, since there is
   * no row for a window to hold.
   */
  const firstVisibleIndex = showsEmptyMessage
    ? 0
    : Math.min(Math.max(windowStart, 0), lastWindowStart);
  const lastVisibleIndex = showsEmptyMessage ? -1 : firstVisibleIndex + windowLength - 1;

  /**
   * The cursor is clamped to the window this render shows rather than trusted as stored: a filter, a
   * write-back or a role switch can shrink the list under it, a window control can move the window out
   * from under it, and a stale index would leave no row tabbable at all. It is also absent whenever the
   * body shows the empty sentence, since that rendering has no data row for the cursor to sit on.
   */
  const activeIndex = showsEmptyMessage
    ? -1
    : Math.min(Math.max(cursorIndex, firstVisibleIndex), lastVisibleIndex);

  /** Moves the cursor and the DOM focus together, which is what makes `J`/`K` a roving cursor. */
  function moveCursorTo(index: number): void {
    setCursorIndex(index);
    const body = tableRef.current?.tBodies[0];
    body?.rows[index - firstVisibleIndex]?.focus();
  }

  /** Shows the window before this one; the cursor is clamped into it by the render that follows. */
  const showPreviousWindow = (): void => {
    setWindowStart(Math.max(firstVisibleIndex - windowLength, 0));
  };

  /** Shows the window after this one, which every full window's start allows. */
  const showNextWindow = (): void => {
    setWindowStart(Math.min(firstVisibleIndex + windowLength, lastWindowStart));
  };

  const activateRow = (row: Row): void => {
    if (onRowActivate !== undefined) {
      onRowActivate(row);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTableElement>): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    if (happenedInsideControl(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();

    if (key === 'j' || key === 'k') {
      if (activeIndex < 0) {
        return;
      }
      event.preventDefault();
      moveCursorTo(
        key === 'j'
          ? activeIndex >= lastVisibleIndex
            ? firstVisibleIndex
            : activeIndex + 1
          : activeIndex <= firstVisibleIndex
            ? lastVisibleIndex
            : activeIndex - 1,
      );
      return;
    }

    if (key === 'enter') {
      const row = activeIndex < 0 ? undefined : rows[activeIndex];
      if (row === undefined || onRowActivate === undefined) {
        return;
      }
      event.preventDefault();
      onRowActivate(row);
    }
  };

  return (
    <>
      {/*
        The scroll container is positioned so the absolutely positioned, visually hidden text a cell
        carries — the caption, an evidence trigger's suffix, a tooltip's closed description — is laid
        out against this box and clipped by its `overflow-x-auto`. Left static, those 1 by 1 px boxes
        escape every ancestor with `overflow-x: auto` and widen the document instead, which scrolls the
        whole page sideways however narrow the table's own container is.

        The 4 px of padding on each side is what the one `:focus-visible` ring in
        `src/styles/index.css` needs: an outline is painted outside the row it is drawn on, and a scroll
        container clips at its padding box, so a row cursor at an edge of the table would otherwise lose
        that edge's stroke and read as two horizontal rules with no vertical ones. The equal negative
        margin and the width raised by the same 8 px cancel the padding outside this box, so the table's
        own box — its width and its left and top edge — stays exactly where it was.

        A table that pins a column also keeps that column's width free at the container's inline end as
        scroll padding, and gives up its own padding at that end, so a control focused there is scrolled
        out from under the pin rather than stopping beneath it and the columns scrolling underneath do
        not show through beside it (see `PINNED_SCROLL_PADDING_CLASS`).
      */}
      <div
        className={classNames(
          'relative -mx-1 -my-1 w-[calc(100%_+_8px)] overflow-x-auto px-1 py-1',
          hasPinnedColumn ? PINNED_SCROLL_PADDING_CLASS : undefined,
        )}
      >
        {/*
          `aria-rowcount` counts the header row as row 1, so a reader given a data row's position also
          knows how many rows the table holds in total: the row count includes it.
        */}
        <table
          ref={tableRef}
          className={TABLE_CLASS}
          aria-rowcount={rowCount}
          onKeyDown={handleKeyDown}
        >
          {/*
            The caption is the table's accessible name and is read by assistive technology; it is
            visually hidden because every screen already names the table it shows in its own page
            header, and repeating that text inside the table would say it twice on screen.
          */}
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {columns.map((column) => {
                const direction = directionFor(announcedOrder, column.id);
                const ariaSort =
                  direction === null
                    ? 'none'
                    : direction === 'asc'
                      ? 'ascending'
                      : 'descending';

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={column.sortable === true ? ariaSort : undefined}
                    className={classNames(
                      HEADER_CELL_CLASS,
                      column.align === 'end' ? 'text-end' : 'text-start',
                      column.pinned === true ? PINNED_HEADER_CELL_CLASS : undefined,
                    )}
                  >
                    {column.sortable === true ? (
                      <button
                        type="button"
                        className={classNames(
                          SORT_BUTTON_CLASS,
                          direction === null
                            ? 'text-text-caption'
                            : 'text-text-primary',
                        )}
                        onClick={() => {
                          onSort(column.id);
                        }}
                      >
                        <span>{column.header}</span>
                        {/*
                          Hidden from assistive technology: `aria-sort` on the header cell already
                          announces the order, so the caret is decoration that must not rename the
                          button. It points down for descending and flips for ascending.
                        */}
                        <CaretDown
                          aria-hidden="true"
                          weight="bold"
                          className={classNames(
                            'shrink-0',
                            direction === 'asc' ? 'rotate-180' : undefined,
                          )}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {showsEmptyMessage ? (
              <tr className={ROW_HEIGHT_CLASS}>
                <td
                  colSpan={columnCount}
                  className={classNames(CELL_CLASS, 'text-text-secondary')}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.slice(firstVisibleIndex, firstVisibleIndex + windowLength).map((row, offset) => {
                /*
                  `aria-rowindex` counts the header row as row 1, so this data row — at 0-based index
                  `index` in the rows the caller supplied — is row `index + 2`. It is deliberately not
                  `index + 1`: that is the header's position, and announcing it would say the cursor
                  sits on a different row. The index is the row's position in the whole row set rather
                  than its offset inside the window, so a row of a windowed table still announces where
                  it sits in the table `aria-rowcount` describes.
                */
                const index = firstVisibleIndex + offset;

                return (
                  <tr
                    key={getRowKey(row)}
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-rowindex={index + 2}
                    className={classNames(
                      ROW_HEIGHT_CLASS,
                      ROW_CLASS,
                      onRowActivate === undefined ? undefined : ACTIVATABLE_ROW_CLASS,
                    )}
                    onFocus={() => {
                      setCursorIndex(index);
                    }}
                    onClick={
                      onRowActivate === undefined
                        ? undefined
                        : (event) => {
                            /*
                              The first click of a double click has already opened the row, so the
                              second is not a second activation: the row opens something, and opening
                              it twice would push a duplicate history entry, which leaves one Back
                              press with the URL where it already was and makes the row look broken.
                              `detail` counts the clicks of the sequence, so anything after the first
                              one is dropped here rather than opening the row again.
                            */
                            if (event.detail > 1) {
                              return;
                            }
                            /*
                              One click opens the row, the way `Enter` on the row cursor does. A click
                              that started inside a control the row holds — a button, a link, a field,
                              an evidence trigger — belongs to that control, so the row stays closed
                              behind it rather than opening as well.
                            */
                            if (happenedInsideControl(event.target)) {
                              return;
                            }
                            activateRow(row);
                          }
                    }
                  >
                    {columns.map((column) => (
                      <td
                        key={column.id}
                        className={classNames(
                          CELL_CLASS,
                          column.align === 'end' ? 'text-end' : 'text-start',
                          column.singleLine === true ? 'whitespace-nowrap' : undefined,
                          column.pinned === true ? PINNED_CELL_CLASS : undefined,
                        )}
                      >
                        {column.render(row, index)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {windowed ? (
        <div className={WINDOW_ROW_CLASS}>
          {/*
            One control per direction, written once per state on purpose: `ActionButtonProps` is a
            discriminated union, so a control that cannot act cannot be constructed without the
            sentence that says why, and each branch passes its own literal rather than a flag (rule
            P-8).
          */}
          {firstVisibleIndex === 0 ? (
            <ActionButton disabled disabledReason={FIRST_WINDOW_REASON}>
              {PREVIOUS_WINDOW_LABEL}
            </ActionButton>
          ) : (
            <ActionButton onClick={showPreviousWindow}>{PREVIOUS_WINDOW_LABEL}</ActionButton>
          )}
          {lastVisibleIndex >= rows.length - 1 ? (
            <ActionButton disabled disabledReason={LAST_WINDOW_REASON}>
              {NEXT_WINDOW_LABEL}
            </ActionButton>
          ) : (
            <ActionButton onClick={showNextWindow}>{NEXT_WINDOW_LABEL}</ActionButton>
          )}
          {/*
            The sentence a reader needs to know the table holds rows this window does not show. It is a
            live region so a move with the controls is announced rather than only painted, and every
            count in it comes from the rows the caller supplied.
          */}
          <p role="status" className={WINDOW_SUMMARY_CLASS}>
            {windowSummary(firstVisibleIndex + 1, lastVisibleIndex + 1, rows.length)}
          </p>
        </div>
      ) : null}
    </>
  );
}
