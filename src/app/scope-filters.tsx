/**
 * The shell's scope filters: the two controls in the top bar that choose which plant and which
 * product the workspace is narrowed to, before the acting role's own plant scope is applied.
 *
 * WHY THE SHELL OWNS THEM, AND WHY THEY ARE CONTROLLED. AAP 0.5.2 places this component in
 * `src/app/`, AAP 0.12.4 puts it in the top bar immediately after the wordmark, and AAP 0.2.1 fixes
 * the requirement it serves: "one scope resolver combining the top-bar plant and product filters with
 * the role's plant scope, used by every list call and every aggregate, so a filtered queue and a
 * filtered overview cannot disagree". The selection therefore lives in the shell store
 * (`src/app/providers.tsx`) and not in this component: both controls are controlled by
 * `useShellStore((state) => state.scope)` and write back with `setScope`, so the exception queue, the
 * overview, the canvas and every aggregate read one value. No `useState`, no default and no copy of
 * the selection exists here, so two surfaces cannot hold different filters.
 *
 * NO FILTERING HAPPENS HERE. This control moves a selection into the store and stops; it filters,
 * sorts and counts nothing (AAP 0.12.4, SCR-02: "the plant and product scope arrives from the shell
 * and is applied by the service, never re-filtered here"). The intersection with the role's plant
 * scope belongs to `resolveScope` in `src/domain/aggregation/scope.ts`, which the adapter calls
 * before a list is filtered or an aggregate computed, so this file states no scoping rule of its own.
 *
 * WHERE THE OPTIONS COME FROM, AND WHY THAT READ (rules P-2, P-6). Every option is a record the
 * service returns: `getTopology` — the read the FileMap canvas makes — is asked once for the
 * unfiltered selection, and the plants it returns are the plants the acting role may see, because an
 * empty plant selection resolves to that role's whole plant scope rather than to "no plants". Asking
 * with the unfiltered selection is deliberate: an option list narrowed by the reader's own filter
 * would shrink as they used it. Nothing is typed here — no plant code, no product code, no amount, no
 * count, no date (rule P-6) — and the only data boundary is `useService()` (rule P-2): no seed
 * module, no adapter and no HTTP client is imported, and the store is the only state.
 *
 * WHERE THE "ALL" VALUE COMES FROM. `Scope` states "all plants" and "all products" as empty arrays, so
 * the unfiltered option carries the empty string — the DOM's spelling of an empty selection, not a
 * code and not a sentinel chosen here — and the handlers map it back to the type's own empty array.
 * The labels `All plants` and `All products` are the words specification §5.1 gives those options.
 *
 * A CONTROL THAT CANNOT ACT SAYS WHY (rule P-8). While the read is in flight, when the adapter
 * refuses it (it needs `exception.read`, and the external supplier engineer does not hold it) and
 * when a family comes back empty, the affected select takes the native `disabled` attribute and the
 * group paints one visible sentence explaining it: the adapter's own message on a refusal, so the
 * reason the reader sees is the adapter's rather than a paraphrase, and the sentence is bound to the
 * disabled control with `aria-describedby` so it is that field's description in the accessibility
 * tree. The native attribute rather than `ActionButton`'s `aria-disabled` treatment is deliberate: a
 * select's popup cannot be made inert by an attribute, so leaving it operable and discarding the
 * change would announce a control that lies about its state.
 *
 * Rules served:
 * - B-3: each control is `SelectField` from `src/components`, the primitive that owns the `<select>`
 *   element (AAP 0.5.2), with a visible `<label>` bound by `htmlFor`/`id`, so the arrow keys, `Space`
 *   and a screen reader's forms mode all work on the browser's own control the primitive renders, and
 *   this file registers no key handler that could get them wrong; the target is the 24x24 px
 *   minimum; the focus ring is the 2 px `--color-focus-ring` role drawn on
 *   `focus-visible`; every colour is a role token, so both themes keep the contrast the specification
 *   measured; the colour transition is `motion-safe:`, so a reduced-motion session gets the state
 *   change without the animation; no raw palette utility, no shadow and no opacity appears here.
 * - P-8: a select that cannot act is visibly disabled with a sentence that says why (see above).
 * - P-6: no figure, amount, date, plant code or product code is typed in this file; every option
 *   value is a record the read returned and the "all" value is the type's empty selection.
 * - P-2: `useService()` is the only path to a record, and the shell store is the only state.
 * - P-1: this file invents no simulation label. A filter is a control rather than a computed figure,
 *   and the persistent `Simulated data` badge is the shell's, mounted above the router outlet.
 * - P-4: nothing here states or implies that the application establishes a configuration, prevents a
 *   copy or resists an edit; a refusal says that the read did not happen and nothing more.
 * - P-7: the product's own vocabulary only — Site Intelligence, the FileMap canvas — and every plant
 *   and product named on screen is a synthetic seed record. No company, customer or model name of the
 *   real world appears, and no placeholder text is used.
 * - B-1: nothing here requests anything: the read resolves from records already in this browser.
 * - B-2: no credential, no configuration value and no environment read of any kind.
 *
 * No test hook. Nothing here reads a query parameter, a global or a flag to change behaviour: the
 * simulation popover and the role switcher are product features a browser test drives as a reader
 * would, and this control is one of them rather than a lever for a test.
 *
 * THE PRODUCT OPTIONS PRINT THE IDENTIFIER, NOT A NAME. The topology payload carries no product
 * display name — only plants, suppliers, origins and customers carry a `label` — so a product
 * option prints the `ProductId` the record set carries.
 *
 * ONE PLANT AND ONE PRODUCT, OR NEITHER. Specification §5.1 fixes a single selection per filter,
 * so a `Scope` naming several plants displays as the unfiltered option: a single-choice control has
 * no spelling for a set.
 *
 * WHICH READ FILLS THE LISTS. The plant and product lists come from `getTopology`, the acting role
 * holds `exception.read` for that read, and the port declares no plant or product list read of its
 * own; the external supplier engineer — who holds `evidence.read` alone — therefore sees both
 * filters disabled with the adapter's message.
 */
import { useId } from 'react';
import type { ReactElement } from 'react';

import { useQuery } from '@tanstack/react-query';

import { SelectField } from '../components/select-field';
import { useService } from '../services/service-provider';
import type { Scope } from '../types/service';
import { useShellStore } from './providers';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every sentence these controls render, held here so the wording has one owner: the component paints
 * these strings and a suite names them through this object instead of retyping them, the way
 * `FRESHNESS_STRIP_TEXT` and `SERVICE_PROVIDER_TEXT` own their own copy.
 *
 * The two "all" labels are the words specification §5.1 gives those options. None of the others is a
 * specification string, none carries a figure, an amount, a date or a record identifier (rule P-6),
 * and each states what happened to the read and claims nothing about the records beyond it
 * (rule P-4).
 */
export const SCOPE_FILTERS_TEXT = {
  /** The accessible name of the group the two labelled controls read as. */
  group: 'Scope filters',

  /** The plant control's visible label, which is also its accessible name. */
  plantLabel: 'Plant',

  /** The product control's visible label, which is also its accessible name. */
  productLabel: 'Product',

  /** The unfiltered plant option, as specification §5.1 words it. */
  allPlants: 'All plants',

  /** The unfiltered product option, as specification §5.1 words it. */
  allProducts: 'All products',

  /** The notice while the option list is being read. */
  reading: 'Reading the plants and products in scope',

  /**
   * The notice's lead when the read did not happen. The adapter's own message follows it, so a
   * reader is told that the read was refused and then why, in the adapter's words.
   */
  unavailable: 'The scope filters are unavailable.',

  /** What a read that answered with neither plant nor product records says. */
  noRecords: 'No plant or product records were supplied.',

  /** What a read that answered with no plant records says. */
  noPlants: 'No plant records were supplied.',

  /** What a read that answered with no product records says. */
  noProducts: 'No product records were supplied.',
} as const;

/* ---------------------------------------------------------------------------------------------
 * The read, its key and the class lists
 * ------------------------------------------------------------------------------------------- */

/**
 * The unfiltered selection: the "All plants" and "All products" reading `Scope` defines as an empty
 * array on each member.
 *
 * It is the argument this component reads the option lists with, so the lists do not move when the
 * reader narrows the filter. One frozen object is shared by every call rather than a fresh literal
 * per render, which keeps the query key and the argument the same value; nothing writes to it — the
 * port only reads its argument, and `resolveScope` answers with freshly allocated arrays.
 */
const ALL_SCOPE: Scope = Object.freeze({ plants: [], products: [] });

/**
 * The query cache key, in the `[method, ...args]` form the cache is keyed by (AAP 0.6.2).
 *
 * The method's own name first and its argument second, so a write that invalidates `getTopology`
 * invalidates this entry with the canvas's, while the unfiltered argument keeps this payload distinct
 * from a scoped one.
 */
const TOPOLOGY_QUERY_KEY = ['getTopology', ALL_SCOPE] as const;

/**
 * The DOM's spelling of the type's unfiltered selection: the empty string, which is the empty value
 * and not a code. A `<select>`'s option value is a string, so the "all" option carries this and the
 * handlers map it back to `[]`.
 */
const ALL_VALUE = '';

/**
 * The group's layout: one column — the two fields on a row of their own, and the sentence explaining a
 * control that cannot act beneath them — whose height is reserved before it is known which sentence the
 * read will answer with.
 *
 * WHY THE HEIGHT IS RESERVED AND WHAT THE NOTICE MAY WIDEN. The top bar is one wrapping row
 * (`ROW_CLASSES` in `src/app/top-bar.tsx`) whose height every control beside this one pays for, so a
 * group that adds a line when its read answers re-breaks its neighbours' lines and moves the navigation
 * and the page's own content under the reader. Measured on the desktop audit (QA finding QA1-01): the
 * pending sentence this group paints made the box 77 px tall and widened it from 260 px to 484 px, and
 * both reverted when the read settled, shifting `main#main-content` by 0.31 of the viewport. `min-h-20`
 * therefore holds the 80 px the settled announcement occupies — the 51 px fields row, the 8 px grid step
 * between the rows and the sentence's own 18 px line, which the grid's next step rounds up to 80 px —
 * so the sentence's line is reserved in both states rather than added in one of them.
 *
 * No colour or surface is set here — each field owns its own, and the token layer exposes no elevation
 * utility to select (specification §4.3). The one size is the reserved block, stated in the spacing
 * scale's own steps so it stays on the 4 px grid.
 */
const GROUP_CLASSES = 'flex min-w-0 flex-col gap-2 min-h-20';

/**
 * The two fields on one line, aligned on the bottom of their controls so the two labelled controls line
 * up however long each label is, and wrapping among themselves rather than growing the group's width
 * past the sentence's cap below.
 */
const FIELDS_ROW_CLASSES = 'flex min-w-0 flex-wrap items-end gap-2';

/** One field: its label above its control, separated by one step of the grid rather than a margin. */
const FIELD_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The label: the type scale's 12 px in the secondary text role, above the control it names. */
const LABEL_CLASSES = 'text-12 font-medium text-text-secondary';

/**
 * The control itself: role tokens only — `rounded-control` for the 2 px radius,
 * `--color-control-boundary` for its edge, the first raised surface behind it, the type scale's 13 px
 * in the primary text role, and the tabular mono face, because the value it shows is a record
 * identifier.
 *
 * `min-h-6` is the 24x24 px target rule B-3 sets. The focus ring is the 2 px `--color-focus-ring`
 * role, drawn on `focus-visible` so a pointer click leaves none behind while a keyboard user never
 * loses the indicator. The pointer is answered too: `hover:` lifts the boundary to the accent role,
 * the state the assistant's model selector and the simulated-data badge carry, so the two pickers in
 * the interface look alike. A control that cannot act answers neither state: `disabled:hover:`
 * re-asserts the resting boundary over the hover, and the fill and label move to the roles the theme
 * measured for a raised surface, so nothing here is dimmed with opacity — the way contrast falls
 * below the ratio rule B-3 requires. `motion-safe:` gates the colour transition, so a reduced-motion
 * session gets the same states with no animation.
 */
const SELECT_CLASSES = [
  'block min-h-6 rounded-control border border-control-boundary px-2 py-1',
  'bg-surface-1 font-mono text-13 tabular-nums text-text-primary hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-secondary',
  'disabled:hover:border-control-boundary',
].join(' ');

/**
 * The explanation of a control that cannot act: plain text on the line beneath both fields, not a hint
 * behind a hover. The group is a column (`GROUP_CLASSES`), so the sentence always takes that line
 * rather than being squeezed between the two fields, and that line is reserved there in every state.
 *
 * ONE CLAMPED LINE, ITS WIDTH BOUNDED ON THE GRID. The sentence is the adapter's own message, and a
 * refusal names the permission it needs, the role that is acting and every role that holds it, so it
 * runs to some three hundred characters. Left to break, that set this group's preferred width and
 * wrapped onto up to five lines, and the row then displaced the two fields and left the identifier
 * search on a line of its own: one role's bar measured 420 px against 289 px for every other role
 * (QA finding QA2-06). `truncate` keeps the whole sentence as this element's text — which is the
 * text `aria-describedby` binds to the two disabled selects, so a screen reader is still given all
 * of it — while painting a single line. The `title` carries the same sentence, so a reader using a
 * pointer reads the remainder the ellipsis hides.
 *
 * HOW MUCH OF IT IS SHOWN IS THE ROW'S DECISION, NOT A FIXED CUT. `max-w-80` bounds the line at the
 * scale's 80th step, so the sentence cannot widen this group past what the top bar's first line holds
 * and cannot re-break that line when the notice appears or goes away (QA finding QA1-01); the reserved
 * line the column holds then keeps the bar's height the same in both states. From `xl` up the row has
 * width to spare, so the line may grow to the 36 rem step (`max-w-xl`): the notice then shows as much
 * of the sentence as one top-bar line can hold with the identifier search still beside it and no extra
 * row at the 1280 px width QA1-01 measures. Neither width is an arbitrary value: each is a named step
 * of the scale, so the bar's boxes stay on the grid.
 */
const NOTICE_CLASSES = 'min-w-0 max-w-80 truncate text-12 text-text-caption xl:max-w-xl';

/* ---------------------------------------------------------------------------------------------
 * The option lists, read from the payload rather than typed here
 * ------------------------------------------------------------------------------------------- */

/**
 * One entry of a filter: the value the store holds, and the text the reader sees.
 *
 * Both members are record content. `value` is a plant or product identifier the read returned, and
 * `label` is the record's own display name, or that identifier where the record carries no name.
 */
interface ScopeOption {
  /** The identifier written to the shell store when this option is chosen. */
  readonly value: string;

  /** The text the option prints. */
  readonly label: string;
}

/**
 * The part of a topology node the plant filter reads: its identifier and its display name.
 *
 * Declared structurally rather than imported, because the topology payload type is the service
 * layer's vocabulary and this file reaches the port through `useService()` alone (rule P-2). The
 * shape is exactly what `getTopology` returns for a plant node, so the call site needs no cast.
 */
interface LabelledNodeLike {
  /** The node's identifier. */
  readonly id: string;

  /** The node's display name, which the canvas prints too. */
  readonly label: string;
}

/**
 * The part of a topology node the product filter reads: the products the node reaches.
 *
 * Read across the plant, supplier, tier-2 origin and customer nodes, because a product's presence in
 * the network is what the read answers with — the payload carries no product list of its own. A
 * material is not read here: the supplier that sells it already reaches every product it goes into, so
 * no product is named only by a material.
 */
interface ProductReachLike {
  /** The products the node reaches, in the record's own order. */
  readonly productIds: readonly string[];
}

/**
 * Turns the plant nodes into the plant options, in the payload's order.
 *
 * @param nodes The plant nodes the read returned.
 * @returns One option per plant, the identifier as its value and the record's name as its text.
 */
function plantOptionsOf(nodes: readonly LabelledNodeLike[]): ScopeOption[] {
  return nodes.map((node) => ({ value: node.id, label: node.label }));
}

/**
 * Turns the network's product reach into the product options.
 *
 * The products are collected across every node family in payload order and each one is kept once, so
 * the list is a set with a stable order: two reads of the same records present the same options, and
 * a product reached by a supplier and by a plant it feeds appears as one option rather than two. The
 * option's text is the identifier, because the payload carries no product name.
 *
 * @param nodes The plant, supplier, origin and customer nodes the read returned.
 * @returns One option per distinct product, in first-seen order; empty when the network reaches none.
 */
function productOptionsOf(nodes: readonly ProductReachLike[]): ScopeOption[] {
  const seen = new Set<string>();
  const options: ScopeOption[] = [];

  for (const node of nodes) {
    for (const productId of node.productIds) {
      if (seen.has(productId)) {
        continue;
      }

      seen.add(productId);
      options.push({ value: productId, label: productId });
    }
  }

  return options;
}

/**
 * The option value a stored selection shows.
 *
 * The control offers one plant and one product or neither (specification §5.1), so a selection
 * holding exactly one member shows that member and every other shape shows the unfiltered option.
 *
 * @param selection The stored plants or products.
 * @returns The identifier the select shows, or the unfiltered value.
 */
function selectionValueOf(selection: readonly string[]): string {
  const [first] = selection;

  return selection.length === 1 && first !== undefined ? first : ALL_VALUE;
}

/* ---------------------------------------------------------------------------------------------
 * Why a control cannot act, in one sentence
 * ------------------------------------------------------------------------------------------- */

/**
 * The message a refusal carries, or `null` when the thrown value carries none.
 *
 * The adapter throws a `Problem` rather than an `Error`, so the value is narrowed structurally
 * instead of by class: the `in` check proves the member exists and leaves it `unknown`, and the
 * `typeof` test proves it is worth printing. A value that carries no message yields `null`, so the
 * notice falls back to its own lead sentence rather than printing an empty one or the word
 * `undefined`. No cast and no suppression directive appears here (success criterion 5).
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
 * The one sentence the group paints while a control cannot act, or `null` when both can.
 *
 * Written as a function of the read's state and the two option lists rather than as inlined
 * conditionals, so every outcome is exhaustive by construction: a read that has not settled, one that
 * was refused, and one that answered with a family empty each get the sentence that fits them, and a
 * read answered with both families populated gets none.
 *
 * @param status - The read's state as the query cache reports it.
 * @param plantsAvailable - Whether the plant list holds an option.
 * @param productsAvailable - Whether the product list holds an option.
 * @param error - Whatever a refused read threw: the adapter's `Problem`, whose message is printed.
 * @returns The sentence to paint, or `null`.
 */
function noticeOf(
  status: 'pending' | 'error' | 'success',
  plantsAvailable: boolean,
  productsAvailable: boolean,
  error: unknown,
): string | null {
  if (status === 'pending') {
    return SCOPE_FILTERS_TEXT.reading;
  }

  if (status === 'error') {
    const message = messageOf(error);

    return message === null
      ? SCOPE_FILTERS_TEXT.unavailable
      : `${SCOPE_FILTERS_TEXT.unavailable} ${message}`;
  }

  if (!plantsAvailable) {
    return productsAvailable ? SCOPE_FILTERS_TEXT.noPlants : SCOPE_FILTERS_TEXT.noRecords;
  }

  return productsAvailable ? null : SCOPE_FILTERS_TEXT.noProducts;
}

/* ---------------------------------------------------------------------------------------------
 * The two controls
 * ------------------------------------------------------------------------------------------- */

/** Props of the internal field that renders one labelled select. */
interface ScopeFieldProps {
  /** The identifier binding the label to its control; the shell holds one per field. */
  readonly selectId: string;

  /** The field's visible label, which is also its control's accessible name. */
  readonly label: string;

  /** The text of the unfiltered option. */
  readonly allLabel: string;

  /** The option value the store currently holds, or the unfiltered value. */
  readonly value: string;

  /** The options the read returned; empty while it has not settled or answered with none. */
  readonly options: readonly ScopeOption[];

  /** Whether the control cannot act, in which case it is natively disabled. */
  readonly disabled: boolean;

  /** The id of the sentence explaining why it cannot act, or `undefined` when it can. */
  readonly describedBy: string | undefined;

  /** Reports the chosen option value; the caller maps it onto the shell store. */
  readonly onChange: (value: string) => void;
}

/**
 * One scope filter: a visible `<label>`, the `SelectField` it names, and nothing else.
 *
 * The field primitive is composed rather than the application's `ActionButton` pattern, for the reason
 * that pattern exists: a button commits an action, while a filter offers a list, and the `<select>`
 * `SelectField` owns (AAP 0.5.2) keeps every option reachable by keyboard and by a screen reader's
 * forms mode. The label is bound with `htmlFor`, so the control has an accessible name that contains
 * the visible word (WCAG 2.2 SC 2.5.3) and a click on the label opens the list.
 *
 * The "all" option is always present, even while the read is in flight, so the control never renders
 * an empty list; it is disabled in exactly that state, with the group's notice as its description.
 *
 * @param props The field's label, the stored value, the options and its disabled state.
 * @returns The labelled field.
 */
function ScopeField({
  selectId,
  label,
  allLabel,
  value,
  options,
  disabled,
  describedBy,
  onChange,
}: ScopeFieldProps): ReactElement {
  return (
    <div className={FIELD_CLASSES}>
      <label htmlFor={selectId} className={LABEL_CLASSES}>
        {label}
      </label>
      <SelectField
        id={selectId}
        className={SELECT_CLASSES}
        value={value}
        disabled={disabled}
        aria-describedby={describedBy}
        options={[
          { value: ALL_VALUE, label: allLabel },
          ...options.map((option) => ({ value: option.value, label: option.label })),
        ]}
        onChange={onChange}
      />
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The filters
 * ------------------------------------------------------------------------------------------- */

/**
 * The top bar's plant and product filters.
 *
 * Takes no props: the selection comes from the shell store and the options from the port, so a caller
 * cannot hand either in and cannot narrow the workspace to a plant or product the acting role may not
 * see. The root is a `<div>` carrying `role="group"` and an accessible name, so the two controls are
 * announced as one named region rather than as two loose fields, and `aria-busy` follows the read so
 * assistive technology is told that the options are still being filled.
 *
 * The read is asked once, with the unfiltered selection, and it is the canvas's own read: an empty
 * plant selection resolves to the acting role's whole plant scope, so the options are exactly the
 * plants that role may narrow to and they do not move when the reader picks one.
 *
 * @returns The group holding the two filters, and the notice when either cannot act.
 */
export function ScopeFilters(): ReactElement {
  const service = useService();
  const scope = useShellStore((state) => state.scope);
  const setScope = useShellStore((state) => state.setScope);

  const plantSelectId = useId();
  const productSelectId = useId();
  const noticeId = useId();

  const network = useQuery({
    queryKey: TOPOLOGY_QUERY_KEY,
    queryFn: () => service.getTopology(ALL_SCOPE),
    /*
     * A refusal here is a decision rather than a glitch — the acting role may not read the records
     * the options come from, or the demonstration's forbidden trigger is on — so retrying would only
     * delay the honest notice. The retry surface belongs to `StateBoundary`, which a page composes
     * around its own reads.
     */
    retry: false,
  });

  const topology = network.data?.data;
  const plantOptions = topology === undefined ? [] : plantOptionsOf(topology.plants);
  const productOptions =
    topology === undefined
      ? []
      : productOptionsOf([
          ...topology.plants,
          ...topology.suppliers,
          ...topology.origins,
          ...topology.customers,
        ]);

  const notice = noticeOf(
    network.status,
    plantOptions.length > 0,
    productOptions.length > 0,
    network.error,
  );

  const plantCannotAct = network.status !== 'success' || plantOptions.length === 0;
  const productCannotAct = network.status !== 'success' || productOptions.length === 0;

  /*
   * Each handler writes the whole selection, keeping the other member as the store holds it: the
   * store's setter replaces the value rather than merging it, and narrowing to one plant must not
   * silently widen the product filter.
   */
  const handlePlantChange = (value: string): void => {
    setScope({ plants: value === ALL_VALUE ? [] : [value], products: scope.products });
  };

  const handleProductChange = (value: string): void => {
    setScope({ plants: scope.plants, products: value === ALL_VALUE ? [] : [value] });
  };

  return (
    <div
      role="group"
      aria-label={SCOPE_FILTERS_TEXT.group}
      aria-busy={network.status === 'pending'}
      className={GROUP_CLASSES}
    >
      <div className={FIELDS_ROW_CLASSES}>
        <ScopeField
          selectId={plantSelectId}
          label={SCOPE_FILTERS_TEXT.plantLabel}
          allLabel={SCOPE_FILTERS_TEXT.allPlants}
          value={selectionValueOf(scope.plants)}
          options={plantOptions}
          disabled={plantCannotAct}
          describedBy={plantCannotAct && notice !== null ? noticeId : undefined}
          onChange={handlePlantChange}
        />
        <ScopeField
          selectId={productSelectId}
          label={SCOPE_FILTERS_TEXT.productLabel}
          allLabel={SCOPE_FILTERS_TEXT.allProducts}
          value={selectionValueOf(scope.products)}
          options={productOptions}
          disabled={productCannotAct}
          describedBy={productCannotAct && notice !== null ? noticeId : undefined}
          onChange={handleProductChange}
        />
      </div>
      {notice === null ? null : (
        <p
          id={noticeId}
          role="status"
          aria-live="polite"
          title={notice}
          className={NOTICE_CLASSES}
        >
          {notice}
        </p>
      )}
    </div>
  );
}
