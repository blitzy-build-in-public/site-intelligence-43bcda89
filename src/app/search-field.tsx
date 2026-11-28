/**
 * The Site Intelligence shell's identifier search: the one field in the top bar that finds a record by
 * its identifier and opens it, with the results grouped by the kind of record each hit belongs to.
 *
 * WHAT THIS FILE IS. `platform-specification.md` §5.1 gives the shell an identifier search that opens
 * "the matching screen or the evidence drawer"; AAP §0.5.2 maps `SearchField` to this path, AAP
 * §0.12.1 lists it among the top bar's children, AAP §0.12.4 places it third in the top bar's order,
 * and functional requirement F16 is this file exactly. `src/app/keyboard-shortcuts.ts` focuses it
 * through {@link SEARCH_FIELD_SELECTOR}'s `data-shortcut="search"` attribute, which is the whole
 * contract between the two modules: the shortcut queries the document for that attribute, so the shell
 * can re-render the top bar without either module telling the other when it mounted.
 *
 * WHERE THE RECORDS COME FROM. `useService().searchIdentifiers(term, scope)` through the typed port,
 * memoised by the query cache under `[method, ...args]` (AAP §0.6.2, rule P-2). The field imports no
 * seed module, no adapter, no HTTP client and no domain module, so it cannot become a second data
 * boundary, and the hits arrive already narrowed to the acting persona's reach and the shell's plant
 * and product selection — search is a read, not a second scope filter, so this file hands the
 * selection to the port rather than filtering the answer itself.
 *
 * WHY THE QUERY IS DEBOUNCED, AND WHAT SHOWS WHILE IT RUNS. The field schedules the term and React
 * Query performs the read; no effect here fetches anything (AAP §0.18.1 reserves data loading for the
 * cache). The delay only decides *when* a term becomes a query key. Because a debounce and an
 * in-flight call are both periods in which the previous answer is no longer the answer, the popover
 * reports itself busy across the whole of the debounce window and the call, and shows the hits only
 * once they belong to the term in the input: a reader is never shown one search's results under
 * another search's text.
 *
 * THE COMBOBOX PATTERN, AND WHY FOCUS NEVER LEAVES THE INPUT. The `<input>` belongs to `TextField` in
 * `src/components`, the primitive that owns the element (AAP 0.5.2); this shell control composes it and
 * passes the combobox contract as native props. It implements the WAI-ARIA combobox with a listbox
 * popup through `aria-activedescendant`: DOM focus stays in the `input`, the current option is announced
 * by pointing `aria-activedescendant` at it, and `aria-selected` marks the same option for a sighted
 * reader. Arrow keys move the cursor, `Enter` opens the highlighted hit,
 * `Tab` closes the popover so it cannot linger while focus moves on, and `Escape` closes it and puts
 * focus back in the input (rule B-3). Options carry no `tabIndex` of their own, because a second focus
 * model on top of the active-descendant one would make the popover operable in two ways that disagree;
 * a complete one of the two patterns is what the interface takes, never an incomplete pair. A pointer
 * activates an option through its own click handler, which is the only way a reader not using the
 * keyboard can choose one.
 *
 * HOW THE GROUPS ARE FORMED. From the hits' own `entityType` — the record kind the service groups a
 * hit under — in the order those kinds first appear in the answer. Nothing here holds a list of kinds,
 * so a record family the adapter starts returning is grouped correctly without this file changing, and
 * a family it stops returning leaves no empty heading behind. Each group is a `role="group"` labelled
 * by its own visible heading, so the heading a sighted reader sees is the name assistive technology
 * announces for the group rather than a second copy of it.
 *
 * WHERE A HIT OPENS. The `SearchTarget` the hit carries is read through its `kind` member, which is
 * exactly the pair the type closes over:
 * - `'route'` — the hit has a screen of its own, so the route the target carries is navigated to.
 * - `'drawer'` — the hit is a record the workspace shows through the evidence drawer, so the drawer
 *   opens on the target's reference here in the shell, the reference is written to the shell store's
 *   `selectedNodeId` slot so the screen that owns the record focuses its own evidence affordance, and
 *   the reader is moved to the FileMap canvas — the workspace whose selection that slot names.
 * `SearchHit` carries no owner route for the second case, and deriving one from the grouping word
 * would type the adapter's record-kind names into the shell; the workspace is the honest destination
 * and the drawer is what actually shows the record, so the reader is never taken somewhere that
 * claims to hold a record it does not.
 *
 * THE FOUR RENDERINGS. Busy: one `role="status"` caption. Failure: the service's own message, then a
 * retry control — the adaptation AAP §0.2.2 fixes for a failed read, and the reason no previous
 * answer is left on screen. Empty: a plain sentence rather than a blank box. Answered: the grouped
 * listbox. There is no fifth, and no rendering claims more than the read returned.
 *
 * THE FIELD IS NEVER DISABLED, WHICH IS RULE P-8 MET IN ITS OWN FORM. The service boundary suspends
 * until the adapter can answer, so this field is only mounted when a search can actually run: there is
 * no state in which it exists and cannot act. A read that fails is reported with the retry control
 * rather than by killing the control, so a reader is never handed a dead box with no explanation.
 *
 * WHAT THIS FILE DOES NOT DO.
 * - It types no figure, amount, date, count or record identifier (rule P-6). The delay below is a
 *   scheduling interval, not a business value; every identifier on screen arrives in a hit, and
 *   nothing here counts results, formats money or reads a clock.
 * - It invents no simulation label (rule P-1). The persistent `Simulated data` badge is the shell's,
 *   mounted above the router outlet on every route; a search hit is a record identifier rather than a
 *   computed figure, recommendation, write-back or market-intelligence element, and the seven §5.3
 *   strings belong to the surfaces that carry them (the evidence drawer labels its own figure).
 * - It states nothing about where a record is held, whether it could be altered or whether anything
 *   was verified (rule P-4), and it names no company, customer, model or product of the real world
 *   (rule P-7): the vocabulary is Site Intelligence, the FileMap canvas, and whatever the records
 *   themselves say.
 * - It makes no request of its own (rule B-1) and reads no configuration, environment value or
 *   credential (rule B-2). The read resolves from records already in this browser.
 * - It holds no test hook. Nothing here reads a query parameter, a global or a flag to change
 *   behaviour: the simulation popover and the role switcher are product features, and a browser test
 *   drives this field the way a reader does.
 *
 * Rules served: B-1, B-2, B-3 (keyboard operability, accessible name, visible focus, no colour-only
 * state), P-1, P-2, P-4, P-6, P-7 and P-8.
 */
import { useQuery } from '@tanstack/react-query';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type {
  FocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  ReactElement,
} from 'react';
import { useNavigate } from 'react-router';

import { EvidenceDrawer } from '../components/evidence-drawer';
import { MonoValue } from '../components/mono-value';
import { TextField } from '../components/text-field';
import { ActionButton } from '../components/tooltip';
import { useService } from '../services/service-provider';
import type { SearchHit } from '../types/screen-dto';
import { useShellStore } from './providers';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence this field states, held here so the wording has one owner: the component renders
 * these strings and a suite names them through this object instead of retyping them, the way
 * `FRESHNESS_STRIP_TEXT`, `EVIDENCE_DRAWER_TEXT` and `SERVICE_PROVIDER_TEXT` own their own copy.
 *
 * None of them is a specification string — the seven §5.3 simulation labels belong to the surfaces
 * that carry them and none appears here (rule P-1) — and none carries a figure, a count, a date or a
 * record identifier (rule P-6). Each states what happened to the read or how to work the control, and
 * claims nothing about the records beyond that (rule P-4).
 */
export const SEARCH_FIELD_TEXT = {
  /** The control's accessible name, and the placeholder a sighted reader reads it by. */
  label: 'Search identifiers',

  /**
   * How the control is worked, in the reader's terms. It is the input's description rather than a
   * second label, so a reader who arrives by keyboard or by screen reader is told what the arrow keys
   * and `Enter` do without the hints being painted over the top bar.
   */
  hint: 'Type part of an identifier. Results are grouped by the kind of record. Use the up and down arrow keys to move through them, press Enter to open the highlighted one, or press Escape to close the list.',

  /** The accessible name of the results list, which the input's `aria-controls` points at. */
  results: 'Identifier search results',

  /** What the popover says while the delay or the call is running. */
  reading: 'Searching identifiers',

  /** What an answered search with no hit says, instead of rendering an empty box. */
  none: 'No identifier matches that search.',

  /**
   * The failure lead. The service's own message follows it, so a reader is told that the read did not
   * happen and then why, in the adapter's words rather than in a second account written here.
   */
  unreadable: 'Identifiers could not be read.',

  /** The retry control's visible label. */
  retry: 'Try again',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The query, the delay and the destination — the values this file decides for itself
 * ------------------------------------------------------------------------------------------- */

/**
 * How long a typed term waits before it becomes a query key.
 *
 * A scheduling interval rather than a business value: it changes when the read happens, never what
 * the read answers, and it is the only number in this file (rule P-6). Long enough that a reader
 * typing an identifier does not send one call per character, short enough that the list keeps up with
 * them; the busy caption covers the whole window, so nothing stale is ever shown in its place.
 */
const TYPE_DELAY_MS = 250;

/**
 * The workspace a hit without a screen of its own moves the reader to: the FileMap canvas, whose
 * selection is the shell store's `selectedNodeId` slot.
 *
 * A route the shell's own navigation table publishes rather than a record value (rule P-6), and the
 * one place a drawer hit's reference becomes something a screen can focus. See the module note for
 * why no owner route is derived from the hit's grouping word.
 */
const WORKSPACE_ROUTE = '/canvas';

/** The query cache's key prefix: the port member's own name (AAP §0.6.2). */
const SEARCH_QUERY_METHOD = 'searchIdentifiers';

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The field's own box: the positioning context the popover is placed in.
 *
 * No width of its own, because the top bar sizes the third of its columns; no colour and no size for
 * the input, which owns its own. `relative` is what anchors the popover under the input without a
 * measuring pass.
 */
const FIELD_CLASSES = 'relative flex min-w-0 flex-col';

/**
 * The input: the bordered control of specification §4.3. `min-h-6 min-w-6` is the 24x24 px minimum
 * target of rule B-3 — the height is the target and the field's own padding keeps the text off the
 * boundary — and `w-full` keeps the field inside the column the top bar gives it.
 *
 * The focus ring is drawn on `focus-visible` from the `--color-focus-ring` role so a keyboard reader
 * sees where they are and a pointer click leaves no ring behind. The pointer states are role tokens
 * too: `hover:` lifts the boundary to the accent role, and the transition stays out of a
 * reduced-motion session. The placeholder takes the caption role, which each theme measures against
 * the surface it sits on, so the hint text keeps the contrast the tokens were chosen for (rule B-3).
 */
const INPUT_CLASSES = [
  'min-h-6 w-full min-w-0 rounded-control border border-control-boundary px-2 py-1',
  'bg-surface-1 font-sans text-13 text-text-primary placeholder:text-text-caption',
  'hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
].join(' ');

/**
 * The popover: a first surface inside the decorative hairline at the card radius, placed under the
 * input and above the page it covers.
 *
 * `start-0` is the inline-start edge rather than a physical side, so the popover opens towards the
 * reading direction; `w-80` is the default spacing scale's own step rather than an arbitrary value.
 * No elevation is set because the token layer exposes no shadow utility to select (specification
 * §4.3), and the popover is separated from the page by its hairline and its surface instead.
 */
const POPOVER_CLASSES = [
  'absolute start-0 top-full z-40 mt-1 flex w-80 max-w-full min-w-0 flex-col gap-1',
  'rounded-card border border-hairline bg-surface-1 p-2',
].join(' ');

/** The listbox's own column, so groups are separated by the grid's step rather than by margins. */
const LISTBOX_CLASSES = 'flex min-w-0 flex-col gap-1';

/** One group's column: its heading, then its options. */
const GROUP_CLASSES = 'flex min-w-0 flex-col';

/**
 * A group's visible heading, in the caption role of the smaller type step.
 *
 * It names the group in the accessibility tree as well as on screen — the `role="group"` above it is
 * labelled by this element's id — so it is a heading in the visual sense and the group's accessible
 * name in the semantic one, never both at once.
 */
const GROUP_HEADING_CLASSES = 'px-1 py-1 text-12 font-medium text-text-caption';

/**
 * One option: the identifier, a two-pixel inline-start boundary that carries the selection, and the
 * pointer fill.
 *
 * The selection is not colour alone (rule B-3): the boundary on the inline-start edge appears with
 * `aria-selected`, `aria-selected` itself tells assistive technology which option the arrow keys are
 * on, and the background steps to the second surface so a sighted reader sees the same fact twice.
 * The boundary is logical and always present, so an option does not shift sideways when it becomes
 * the selected one.
 */
const OPTION_CLASSES = [
  'flex min-w-0 cursor-pointer items-center border-s-2 border-transparent px-2 py-1',
  'text-13 text-text-primary',
  'hover:bg-surface-2',
  'aria-selected:border-accent aria-selected:bg-surface-2',
].join(' ');

/**
 * The identifier inside an option: the mono face comes from {@link MonoValue}, and the value wraps
 * rather than being cut, because the whole identifier is what the reader is looking for (rule P-6).
 */
const OPTION_VALUE_CLASSES = 'min-w-0 break-words';

/**
 * A notice's line: the smaller type step in the secondary text role, allowed to break a long word,
 * because a message it can carry is the service's own and its length is not this module's to predict.
 */
const NOTICE_CLASSES = 'min-w-0 break-words px-1 py-1 text-12 text-text-secondary';

/** The failure's column: the message, then the control that asks again. */
const NOTICE_STACK_CLASSES = 'flex min-w-0 flex-col items-start gap-1 px-1 py-1';

/* ---------------------------------------------------------------------------------------------
 * The grouped answer — the record kinds the service grouped the hits under
 * ------------------------------------------------------------------------------------------- */

/**
 * One option of the listbox: a hit, and the position in the whole answer that the arrow keys address.
 *
 * The position is carried beside the hit because `aria-activedescendant` and `aria-selected` name one
 * option of one list, while the answer arrives grouped: a group's own index would repeat in the next
 * group, so the flat position the answer gives each hit is kept with it instead of being recomputed
 * from where a group happens to sit.
 */
interface HitOption {
  /** The hit the service returned. */
  readonly hit: SearchHit;

  /** The hit's position in the whole answer. */
  readonly index: number;
}

/** One group of the answer: a record kind the service used, and the hits carrying it. */
interface HitGroup {
  /** The record kind, in the service's own words. */
  readonly entityType: string;

  /** The hits of that kind, in the order the service returned them. */
  readonly options: readonly HitOption[];
}

/**
 * Groups an answer by the record kind each hit carries, in the order the kinds first appear.
 *
 * The kinds are taken from the hits rather than from a list held here: the adapter groups by the
 * record families the persona may read, so a family this file has never heard of is grouped and
 * labelled correctly the first time it appears, and a family that returns nothing leaves no heading
 * behind. First-appearance order is the service's own ordering, which keeps the best-known families
 * (the exception, then the records that hang off it) at the top of the list without a rank table.
 *
 * @param hits - The answered hits, in the order the service returned them. Not modified.
 * @returns One entry per kind, in first-appearance order, each holding its hits.
 */
function groupHits(hits: readonly SearchHit[]): readonly HitGroup[] {
  const kindOrder: string[] = [];
  const optionsByKind = new Map<string, HitOption[]>();

  hits.forEach((hit, index) => {
    const options = optionsByKind.get(hit.entityType);

    if (options === undefined) {
      kindOrder.push(hit.entityType);
      optionsByKind.set(hit.entityType, [{ hit, index }]);
      return;
    }

    options.push({ hit, index });
  });

  return kindOrder.map((entityType) => ({
    entityType,
    options: optionsByKind.get(entityType) ?? [],
  }));
}

/**
 * The position the arrow keys move to, clamped to the answer's own ends.
 *
 * `-1` is "no option is highlighted": the first arrow press from there takes the first option going
 * down and the last one going up. From either end the index stays put rather than wrapping, so
 * holding an arrow key does not cycle through the list under a reader's hands.
 *
 * @param current - The highlighted position, or `-1` for none.
 * @param step - `1` for down, `-1` for up.
 * @param length - How many options the answer holds.
 * @returns The position to highlight.
 */
function nextOptionIndex(current: number, step: number, length: number): number {
  if (length === 0) {
    return -1;
  }

  if (current < 0) {
    return step > 0 ? 0 : length - 1;
  }

  const candidate = current + step;

  if (candidate < 0) {
    return 0;
  }

  if (candidate > length - 1) {
    return length - 1;
  }

  return candidate;
}

/**
 * The message a failed read carries, or `null` when the thrown value carries none.
 *
 * The adapter throws a `Problem` rather than an `Error`, so the value is narrowed structurally: a
 * `Problem` always carries a non-empty `message`, and a value that does not yields `null` so the
 * notice falls back to its own lead sentence rather than printing an empty one or the word
 * `undefined`. Nothing is cast and no suppression directive appears in this file.
 *
 * @param error - Whatever the read threw.
 * @returns The refusal's own message, or `null`.
 */
function messageOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('message' in error)) {
    return null;
  }

  const { message } = error;

  return typeof message === 'string' && message !== '' ? message : null;
}

/**
 * The whole sentence a failed read is reported with: the field's own lead, then the service's message
 * when it gave one (rule P-6 — the cause a reader reads is the adapter's, not a paraphrase of it).
 *
 * @param error - Whatever the read threw.
 * @returns The sentence the failure notice shows.
 */
function failureMessageOf(error: unknown): string {
  const message = messageOf(error);

  return message === null ? SEARCH_FIELD_TEXT.unreadable : `${SEARCH_FIELD_TEXT.unreadable} ${message}`;
}

/* ---------------------------------------------------------------------------------------------
 * The field
 * ------------------------------------------------------------------------------------------- */

/**
 * The identifier search of the shell's top bar, with no props.
 *
 * Takes none because everything it needs is already its own: the port comes from `useService()`, the
 * scope and the selection slot from the shell store, the route from the router. A caller therefore
 * cannot hand it a second record set, narrow it to one record kind, or point it at another adapter.
 *
 * @returns The labelled input and, while a search is open, its popover.
 */
export function SearchField(): ReactElement {
  const service = useService();
  const navigate = useNavigate();
  const scope = useShellStore((state) => state.scope);
  const setSelectedNodeId = useShellStore((state) => state.setSelectedNodeId);

  const inputRef = useRef<HTMLInputElement>(null);

  const inputId = useId();
  const hintId = useId();
  const popoverId = useId();
  const listboxId = useId();
  const groupHeadingIdBase = useId();

  const [term, setTerm] = useState('');
  const [settledTerm, setSettledTerm] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [openedReference, setOpenedReference] = useState<string | null>(null);

  /*
   * The delay, and the only effect in this file. It schedules the term and nothing else: the read is
   * the query cache's, which is what keeps a call from being made per keystroke without a second
   * mechanism deciding when data is loaded (AAP §0.18.1). Clearing the field settles at once, so an
   * emptied box closes its popover rather than leaving the last answer under it for another delay.
   */
  useEffect(() => {
    const trimmed = term.trim();

    if (trimmed === '') {
      setSettledTerm('');
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSettledTerm(trimmed);
    }, TYPE_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [term]);

  /*
   * The read: the port member's own name first, then the arguments it was called with, which is the
   * key form every cached read in the application uses (AAP §0.6.2). A scope change is a new key, so
   * switching plant re-reads the search rather than serving an answer narrowed to the old selection.
   * A refusal is not retried on a timer: the demonstration's forbidden trigger is a decision, and the
   * reader is given the retry control instead.
   */
  const search = useQuery({
    queryKey: [SEARCH_QUERY_METHOD, settledTerm, scope],
    queryFn: () => service.searchIdentifiers(settledTerm, scope),
    enabled: settledTerm.length > 0,
    retry: false,
  });

  const hits = search.data?.data;

  const groups = useMemo(() => (hits === undefined ? [] : groupHits(hits)), [hits]);

  const orderedHits = useMemo(
    () => groups.flatMap((group) => group.options.map((option) => option.hit)),
    [groups],
  );

  /* Busy covers the delay as well as the call: between the two, the answer on screen would belong to
     the previous term, and showing it as if it were current is the one thing this popover may not do. */
  const isDelayRunning = term.trim() !== settledTerm;

  /* The popover opens as soon as there is a term rather than once the term has settled, so a reader
     who has typed is told the search is running instead of meeting 250 ms of silence. */
  const isPopoverShown = isPopoverOpen && term.trim().length > 0;
  const isBusy = isPopoverShown && (isDelayRunning || search.isFetching);
  const hasHits = orderedHits.length > 0;
  const isListboxShown = isPopoverShown && !isBusy && !search.isError && hasHits;

  const activeHit = orderedHits[activeIndex];
  const activeOptionId =
    isListboxShown && activeHit !== undefined ? `${listboxId}-option-${activeIndex}` : undefined;

  /** Closes the popover and drops the cursor, so a reopened list starts with nothing highlighted. */
  const closePopover = (): void => {
    setIsPopoverOpen(false);
    setActiveIndex(-1);
  };

  /**
   * Opens the hit the reader chose.
   *
   * The two destinations are the whole of `SearchTarget`: a route is navigated to, and a reference
   * opens the evidence drawer here in the shell, is written to the selection slot so the screen that
   * owns the record focuses its own affordance, and moves the reader to the FileMap canvas.
   */
  const activate = (hit: SearchHit): void => {
    if (hit.target.kind === 'route') {
      navigate(hit.target.value);
    } else {
      setSelectedNodeId(hit.target.value);
      setOpenedReference(hit.target.value);
      navigate(WORKSPACE_ROUTE);
    }

    closePopover();
    /* The field is cleared rather than left holding the identifier just opened: the list cannot then
       linger over the screen the reader moved to, and the next search starts from an empty field. */
    setTerm('');
  };

  const handleChange = (value: string): void => {
    setTerm(value);
    setIsPopoverOpen(true);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Escape') {
      if (isPopoverShown) {
        event.preventDefault();
        closePopover();
      } else if (term !== '') {
        setTerm('');
      }

      /* Focus never left the input while the list was open, so this only puts it back where the
         control is when an `Escape` closed a popover the reader had reached another way. */
      inputRef.current?.focus();
      return;
    }

    if (event.key === 'Tab') {
      closePopover();
      return;
    }

    if (!isPopoverShown) {
      if (event.key === 'ArrowDown' && hasHits) {
        event.preventDefault();
        setIsPopoverOpen(true);
        setActiveIndex(0);
      }

      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        nextOptionIndex(current, event.key === 'ArrowDown' ? 1 : -1, orderedHits.length),
      );
      return;
    }

    if (event.key === 'Enter') {
      const hit = orderedHits[activeIndex];

      if (hit === undefined) {
        return;
      }

      event.preventDefault();
      activate(hit);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>): void => {
    const nextFocus = event.relatedTarget;

    /* A focus move inside the field — onto the retry control — leaves the popover open; a move out of
       it closes the popover, so it cannot hang over the page while the reader works elsewhere. */
    if (nextFocus instanceof Node && event.currentTarget.contains(nextFocus)) {
      return;
    }

    closePopover();
  };

  const retry = (): void => {
    void search.refetch();
  };

  return (
    <div className={FIELD_CLASSES} onBlur={handleBlur}>
      <label htmlFor={inputId} className="sr-only">
        {SEARCH_FIELD_TEXT.label}
      </label>
      <p id={hintId} className="sr-only">
        {SEARCH_FIELD_TEXT.hint}
      </p>
      <TextField
        ref={inputRef}
        id={inputId}
        data-shortcut="search"
        type="search"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder={SEARCH_FIELD_TEXT.label}
        value={term}
        className={INPUT_CLASSES}
        aria-expanded={isPopoverShown}
        aria-controls={isPopoverShown ? popoverId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={activeOptionId}
        aria-describedby={hintId}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {isPopoverShown ? (
        <div id={popoverId} className={POPOVER_CLASSES} aria-busy={isBusy}>
          {isBusy ? <Notice text={SEARCH_FIELD_TEXT.reading} /> : null}
          {!isBusy && search.isError ? (
            <FailureNotice message={failureMessageOf(search.error)} onRetry={retry} />
          ) : null}
          {!isBusy && !search.isError && !hasHits ? (
            <Notice text={SEARCH_FIELD_TEXT.none} />
          ) : null}
          {isListboxShown ? (
            <HitListbox
              groups={groups}
              listboxId={listboxId}
              groupHeadingIdBase={groupHeadingIdBase}
              activeIndex={activeIndex}
              onActivate={activate}
            />
          ) : null}
        </div>
      ) : null}
      {openedReference === null ? null : (
        <EvidenceDrawer
          evidenceRef={openedReference}
          onClose={() => {
            setOpenedReference(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The answer, the notice and the retry — the three surfaces the popover can hold
 * ------------------------------------------------------------------------------------------- */

/**
 * What the answered search hands the listbox: the hits grouped by the record kind the service grouped
 * them under, the ids that tie the popover to the input, and the position the arrow keys address.
 *
 * The ids are supplied rather than generated here because they are the field's own — the input's
 * `aria-controls` and `aria-activedescendant` point at elements this component only names — and the
 * position is the whole answer's rather than a group's, so the listbox derives no selection itself.
 */
interface HitListboxProps {
  /** The answer, grouped by record kind, in the order the kinds first appear. */
  readonly groups: readonly HitGroup[];

  /** The listbox's id, which the input's `aria-controls` points at and the options are named under. */
  readonly listboxId: string;

  /** The id prefix each group's visible heading is given, so the heading names the group. */
  readonly groupHeadingIdBase: string;

  /** The position the arrow keys highlight, or `-1` for none. */
  readonly activeIndex: number;

  /** Opens the hit the reader chose. */
  readonly onActivate: (hit: SearchHit) => void;
}

/**
 * The answered search: one labelled group per record kind, one option per hit.
 *
 * The listbox owns no focus stop of its own — the input above it holds focus and points at the
 * highlighted option with `aria-activedescendant` — so a keyboard reader moves through the answer
 * without leaving the field they are typing in. A pointer activates an option through the option's own
 * click handler, and the option's identifier is rendered by {@link MonoValue} in the mono face so
 * identifiers read the way they do everywhere else in the interface.
 *
 * @returns The listbox, with a visible heading for every group.
 */
function HitListbox({
  groups,
  listboxId,
  groupHeadingIdBase,
  activeIndex,
  onActivate,
}: HitListboxProps): ReactElement {
  return (
    <div
      id={listboxId}
      role="listbox"
      aria-label={SEARCH_FIELD_TEXT.results}
      className={LISTBOX_CLASSES}
    >
      {groups.map((group, groupIndex) => {
        const headingId = `${groupHeadingIdBase}-group-${groupIndex}`;

        return (
          <div
            key={group.entityType}
            role="group"
            aria-labelledby={headingId}
            className={GROUP_CLASSES}
          >
            <p id={headingId} className={GROUP_HEADING_CLASSES}>
              {group.entityType}
            </p>
            {group.options.map((option) => (
              <div
                key={option.hit.ref}
                id={`${listboxId}-option-${option.index}`}
                role="option"
                aria-selected={option.index === activeIndex}
                className={OPTION_CLASSES}
                onClick={() => {
                  onActivate(option.hit);
                }}
              >
                <MonoValue value={option.hit.ref} kind="id" className={OPTION_VALUE_CLASSES} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

/**
 * What one line of popover state is asked to say: the sentence the field composed, whether that is the
 * busy caption or the answer that nothing matched.
 *
 * The field decides which of the two it is, so one notice serves both without branching on the read's
 * own state; it states the line in a polite live region and offers nothing to operate (rule B-3).
 */
interface NoticeProps {
  /** The sentence to show. */
  readonly text: string;
}

/**
 * One line of state — that the search is running, or that nothing matched.
 *
 * A `role="status"` live region with visible text, so a reader whose assistive technology is watching
 * the page hears the same thing a sighted reader reads rather than meeting an empty popover. It is not
 * a control, so it carries no focus stop and no handler (rule B-3).
 *
 * @returns The caption, in the secondary text role.
 */
function Notice({ text }: NoticeProps): ReactElement {
  return (
    <span role="status" aria-live="polite" className={NOTICE_CLASSES}>
      {text}
    </span>
  );
}

/**
 * What a failed read is reported through: the whole sentence the field composed from its own lead and
 * the service's message, and the callback that asks the same read again (AAP §0.2.2).
 *
 * The retry is required, so a failure never reaches a reader without the control that repeats it,
 * and the notice holds no state of its own: pressing it re-runs the read the field owns rather than
 * a copy taken when the failure was rendered.
 */
interface FailureNoticeProps {
  /** The whole sentence: the field's lead, then the service's own message when it gave one. */
  readonly message: string;

  /** Asks the same read again. */
  readonly onRetry: () => void;
}

/**
 * What a failed read renders: why it failed, then the control that asks again (AAP §0.2.2).
 *
 * The retry is {@link ActionButton}, the application's only control pattern, so it carries the 24x24 px
 * target, the focus ring and the pointer states every other control has, and the failure states itself
 * rather than leaving the previous answer on screen as if it were current.
 *
 * @returns The failure's column.
 */
function FailureNotice({ message, onRetry }: FailureNoticeProps): ReactElement {
  return (
    <div className={NOTICE_STACK_CLASSES}>
      <span role="status" aria-live="polite" className={NOTICE_CLASSES}>
        {message}
      </span>
      <ActionButton onClick={onRetry}>{SEARCH_FIELD_TEXT.retry}</ActionButton>
    </div>
  );
}

