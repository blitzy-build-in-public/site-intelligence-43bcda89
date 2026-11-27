/**
 * SCR-03's impact chain: the records one disruption reaches, drawn as the ordered sequence they
 * form — purchase order, material, production line, then each customer order the line puts at risk.
 *
 * WHERE IT COMES FROM. AAP §0.12.4's SCR-03 row fixes the chain's shape and its one behaviour: "impact
 * chain from purchase order to material to line to customer orders, each node opening the drawer".
 * AAP §0.12.2 fixes the node itself as `ImpactChainNode` — `ref`, `kind`, `label`, `detail` — and the
 * four kinds as the closed union `ImpactChainNodeKind`, both already declared in
 * `src/types/screen-dto.ts`, so neither is declared a second time here.
 *
 * WHY IT IS PROPS-ONLY — rules P-2 and P-6, AAP §0.18.1. The chain is read by the investigation
 * screen through `useService()` and arrives here as {@link ImpactChainProps.nodes}; this module reads
 * no service, imports no seed record, formats nothing and computes nothing. It renders the nodes in
 * the array's own order and never sorts, groups, dedupes, reverses or re-derives them: the sequence is
 * data the service states, and `kind` chooses a node's caption and nothing else. A component that
 * reordered by kind would silently overrule the record about which record touches which.
 *
 * WHY EVERY NODE IS AN `EvidenceRef` — rules P-6 and P-8, AAP §0.5.2. A node states the identifier of
 * a record, so it is a figure with evidence behind it, and `EvidenceRef` is the only way a figure
 * reaches a screen: it renders the native button, owns the dialog, traps focus in it and returns focus
 * to the trigger on `Escape`. No second dialog is mounted here and no native button, clickable `div`
 * or `role="button"` span is rendered, so the chain cannot put a dead control in front of a reader. A node whose reference is empty — a state the type permits even though the service does not
 * currently produce it — is rendered as static text through the same formatter rather than as a
 * control that could open nothing (rule P-8).
 *
 * WHY THE IDENTIFIER GOES THROUGH `MonoValue` — AAP §0.5.3, rule P-6. An identifier is read in the
 * tabular mono face, and `src/components/mono-value.tsx` is the repository's only formatter, so the
 * reference is rendered there with `kind="id"` and never through a formatter of this module's own.
 * When the record's `label` and its `ref` are the same string — the purchase order and customer order
 * nodes, which are labelled by their identifier — the value is printed once rather than twice.
 *
 * WHY THE SIMULATION LABEL IS THE CALLER'S — rule P-1. The chain's computed values sit on the
 * investigation's own figures, so whether this region carries a §5.3 label is a fact the service
 * states: the caller passes the label it read, and this module paints it through `StatusIndicator`,
 * whose icon, label and status colour always arrive together. No §5.3 string is typed here, so the
 * wording keeps its single owner in `SIM_LABELS` and a corrected string reaches the screen without
 * this file's agreement.
 *
 * WHY THE CONNECTOR IS A SHAPE AND NOT A COLOUR — rule B-3. The list is an `<ol>` of `<li>`, so the
 * sequence reaches assistive technology as a sequence; between the items a directional marker points
 * from each node to the next, so the flow is visible to a reader who cannot distinguish the hairline
 * from the surface. Nothing about a node's state rests on its hue: each node states its kind in words
 * and its record in words.
 *
 * WHAT IT DOES NOT DO. It states no property of the workspace — nothing here claims that a record
 * cannot be altered, is confined or cannot be copied (rule P-4) — and it blends no provenance: the
 * chain is first-party record content, so no market-intelligence series meets it (rule P-5). It writes
 * no company, person or product name of its own: every name on screen is a record value the service
 * supplied (rule P-7). It fetches no asset and reads no configuration value (rules B-1, B-2), and it
 * keeps no state and runs no effect, so a re-render of the screen re-renders the same chain.
 *
 * HOW EVERY NODE FINDS ITS RECORD — AAP 0.2.1 F12. `EvidenceRef` resolves a reference through the
 * service's evidence read, which answers all four kinds the chain draws: the purchase order and the
 * customer order by their own identifiers, and the material and the production line from the records
 * behind them. This component therefore renders every node as the record it names and knows nothing
 * about record families — testing a prefix here would put the service's routing table inside a
 * presentational component — and activating any node of the chain opens the drawer on that record's
 * own value, formula, inputs and provenance.
 */
import { ArrowDown } from '@phosphor-icons/react';
import type { ReactElement } from 'react';

import { EvidenceRef } from '../../components/evidence-drawer';
import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { StatusIndicator } from '../../components/status-indicator';
import type { ImpactChainNode, ImpactChainNodeKind, SimLabel } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The wording, in the one place it is written
 * ------------------------------------------------------------------------------------------- */

/**
 * Every string this module states, held here so the wording has one owner: the component renders
 * these, and the suite that covers the screen names them through this object instead of retyping
 * them.
 *
 * Neither entry is a fixed specification string. The seven §5.3 labels belong to the figures that
 * carry them and arrive through {@link ImpactChainProps.simLabel} (rule P-1); the chain's own
 * identifiers, names and sentences are record content and arrive in {@link ImpactChainNode} (rule
 * P-6). Nothing below carries an amount, an instant or a record identifier.
 */
export const IMPACT_CHAIN_TEXT = {
  /** The name of the region the chain renders in, and of the list that fills it. */
  regionLabel: 'Impact chain',
} as const;

/**
 * What each kind of node is called, one caption per kind.
 *
 * `satisfies Record<ImpactChainNodeKind, string>` is what keeps this honest: it demands a caption for
 * every member of the union and refuses an entry for anything else, so a kind added to
 * `src/types/screen-dto.ts` fails compilation here rather than rendering a node with no caption. The
 * names are the records' own words for these things — a purchase order, a material, a production line,
 * a customer order — and nothing here is a figure.
 */
export const IMPACT_CHAIN_KIND_LABELS = {
  'purchase-order': 'Purchase order',
  material: 'Material',
  line: 'Production line',
  'customer-order': 'Customer order',
} as const satisfies Record<ImpactChainNodeKind, string>;

/* ---------------------------------------------------------------------------------------------
 * The class lists, built from role tokens only
 * ------------------------------------------------------------------------------------------- */

/**
 * The region's caption row: the chain's name and, when the service supplied one, the §5.3 label
 * beside it, so the label reads as part of the region's name rather than as decoration below it.
 */
const REGION_CAPTION_CLASSES = 'inline-flex min-w-0 flex-wrap items-center gap-2';

/**
 * The list: one column on the 4 px grid, with the 4 px step between items because the connector
 * inside each item already carries the space that separates two nodes.
 */
const LIST_CLASSES = 'flex min-w-0 flex-col gap-1';

/** One node: its caption, its value and the record's own sentence, stacked on the same grid step. */
const NODE_CLASSES = 'flex min-w-0 flex-col gap-1';

/**
 * The connector that reads from the node above to the node below.
 *
 * It carries the arrow itself, which is the cue that survives a reader who cannot see colour, and it
 * keeps the caption text role so the mark sits below the node it leaves rather than competing with it.
 */
const CONNECTOR_CLASSES = 'flex items-center pt-1 text-text-caption';

/** The arrow: the size step the shell uses for an inline mark, never allowed to shrink or grow. */
const CONNECTOR_ICON_CLASSES = 'size-3 shrink-0';

/** The kind's caption: the type scale's 12 px step in the caption role, above the value. */
const KIND_CLASSES = 'text-12 font-medium text-text-caption';

/** The node's own label: the 14 px step in the primary role, breaking rather than overflowing. */
const LABEL_CLASSES = 'min-w-0 break-words text-14 font-medium text-text-primary';

/** The value row, so a label and the identifier sit on one line until the width runs out. */
const VALUE_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-2 text-14 text-text-primary';

/** The record's own account of the node: the 13 px step in the secondary role, wrapped. */
const DETAIL_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/** What an empty chain shows instead of an empty list, in the same secondary role. */
const EMPTY_CLASSES = 'min-w-0 break-words text-13 text-text-secondary';

/* ---------------------------------------------------------------------------------------------
 * One node
 * ------------------------------------------------------------------------------------------- */

/** Props of the node view that {@link ImpactChain} renders once per record. */
interface ImpactChainNodeViewProps {
  /** The node, exactly as the service supplied it. */
  readonly node: ImpactChainNode;

  /**
   * Whether the connector above this node is drawn.
   *
   * False for the first node only: a chain has nothing flowing into its first link, so drawing an
   * arrow there would claim an upstream record the service did not name.
   */
  readonly showConnector: boolean;
}

/**
 * Renders one link of the chain: its kind, its value as the control that opens the record behind it,
 * and the record's own sentence about itself.
 *
 * `ref` is the whole evidence reference `ImpactChainNode` declares — the type has no second member for
 * one — and it is what `EvidenceRef` resolves. The three cases the value row covers are the record's
 * own states, not presentation choices: a reference with a label distinct from it prints both, a
 * reference that is its own label prints once, and an empty reference prints the label as static text
 * because a control that could open nothing must not reach a reader (rule P-8).
 */
function ImpactChainNodeView({ node, showConnector }: ImpactChainNodeViewProps): ReactElement {
  const hasEvidenceRef = node.ref.trim().length > 0;
  const labelIsTheReference = node.label === node.ref;

  return (
    <li className={NODE_CLASSES}>
      {showConnector ? (
        <span className={CONNECTOR_CLASSES}>
          {/* Decorative: the ordered list already tells assistive technology that one node follows
              another, so the mark adds no second announcement of the same fact (rule B-3). */}
          <ArrowDown aria-hidden="true" focusable="false" className={CONNECTOR_ICON_CLASSES} />
        </span>
      ) : null}

      <span className={KIND_CLASSES}>{IMPACT_CHAIN_KIND_LABELS[node.kind]}</span>

      <span className={VALUE_CLASSES}>
        {hasEvidenceRef ? (
          <EvidenceRef ref={node.ref}>
            {/* The button is a flex row, where a whitespace-only text node lays out to nothing but
                still separates the two words in the accessible name and in the text content, so a
                reader hears "Housing blank material-one" rather than one run-together word. */}
            {labelIsTheReference ? null : <span className={LABEL_CLASSES}>{node.label}</span>}{' '}
            <MonoValue value={node.ref} kind="id" />
          </EvidenceRef>
        ) : (
          <span className={LABEL_CLASSES}>{node.label}</span>
        )}
      </span>

      <span className={DETAIL_CLASSES}>{node.detail}</span>
    </li>
  );
}

/* ---------------------------------------------------------------------------------------------
 * The chain
 * ------------------------------------------------------------------------------------------- */

/** Props of {@link ImpactChain}. */
export interface ImpactChainProps {
  /**
   * The chain exactly as the service supplied it, in the supplied order.
   *
   * The order is the record's, so it is rendered as it arrives: nothing here sorts by severity, kind
   * or identifier, nothing groups the customer orders, and nothing removes a node that repeats a
   * reference (rule P-6, AAP §0.12.4).
   */
  readonly nodes: readonly ImpactChainNode[];

  /**
   * The exact specification §5.3 label the chain's computed values carry, when the service states one.
   *
   * Absent, the region renders unnamed rather than carrying a label of this module's invention: rule
   * P-1 makes the label the property of the figure that carries it, and a component may not decide
   * that a region is simulated on the record's behalf.
   */
  readonly simLabel?: SimLabel | undefined;

  /**
   * What an exception with no chain shows instead of an empty list.
   *
   * The caller supplies the service's own wording, because the sentence describes a record state this
   * component cannot see: an empty `<ol>` would announce "list, zero items" and a stand-in sentence
   * written here would be copy no input fixes.
   */
  readonly emptyMessage: string;
}

/**
 * Renders the investigation's impact chain as one ordered list of records, each opening its evidence.
 *
 * The root is a {@link Panel}, so the chain sits in a named region of the second raised surface inside
 * whichever card the investigation screen places it in, and the list inside it is an `<ol>` because the
 * sequence is part of what the record says. An exception with no chain renders the same region holding
 * the caller's sentence, so an absent chain reads as an absence rather than as a fault or an empty
 * list.
 *
 * The return type is `ReactElement`: `@types/react` 19 declares no global `JSX` namespace under this
 * project's `types` setting, and every sibling component annotates its own return the same way.
 *
 * @param props The chain, the optional §5.3 label and the empty-chain sentence. See
 *   {@link ImpactChainProps}.
 * @returns The named region with one list item per node, or the region holding the empty sentence.
 */
export function ImpactChain({
  nodes,
  simLabel,
  emptyMessage,
}: ImpactChainProps): ReactElement {
  /* One caption node for both branches, so the region reads the same whether or not it has content:
     the chain's name, and the label the service attached to the figures beside it (rule P-1). */
  const regionCaption = (
    <span className={REGION_CAPTION_CLASSES}>
      <span>{IMPACT_CHAIN_TEXT.regionLabel}</span>
      {simLabel === undefined ? null : <StatusIndicator meaning="simulated" label={simLabel} />}
    </span>
  );

  if (nodes.length === 0) {
    return (
      <Panel label={regionCaption}>
        <p className={EMPTY_CLASSES}>{emptyMessage}</p>
      </Panel>
    );
  }

  return (
    <Panel label={regionCaption}>
      <ol aria-label={IMPACT_CHAIN_TEXT.regionLabel} className={LIST_CLASSES}>
        {nodes.map((node, index) => (
          <ImpactChainNodeView
            key={`${node.kind}-${node.ref}`}
            node={node}
            showConnector={index > 0}
          />
        ))}
      </ol>
    </Panel>
  );
}
