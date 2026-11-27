/**
 * Component suite for `dependency-graph.tsx`, the six-lane graph lens of the FileMap canvas.
 *
 * Each case asserts one clause of the component's own contract, and together they cover the four
 * obligations that make the lens a pass condition rather than a drawing: the six lanes AAP 0.12.4
 * fixes, a focus stop and a full accessible name for every node of the payload, the selection the
 * lens shares with the map lens, and the two controls it carries — the scenario preview switch and
 * the "Open part" control disabled with the specification's stage tooltip (rule P-8). Rule B-3's
 * clauses are asserted where they can fail: the accessible name of every node, keyboard activation
 * through `Enter` and through `Space`, dimming that never rests on colour alone, and the 24x24 px
 * target of the tooltip's own control lists.
 *
 * THE FIXTURE IS SYNTHETIC AND DELIBERATELY PLAIN. Its identifiers carry no domain prefix, because
 * rule P-6 keeps domain identifiers out of `src/components` — tests included — and the suite only
 * needs five nodes, five lanes and two pin tallies to exercise every branch: a lane whose downstream
 * node the payload does not hold, a node with several pin states, a node with one, a node with none,
 * and a customer whose product reach is empty.
 *
 * THE EVIDENCE DRAWER IS MOCKED. The real drawer reads the service through `useQuery`, so mounting it
 * would test the service provider rather than this lens. The mock records the reference it was handed,
 * which is exactly the part of the drawer's contract this component is responsible for: that
 * activation hands over the reference the caller supplied and mounts the dialog as a sibling of the
 * drawing.
 *
 * Renders under the jsdom environment `vite.config.ts` configures; nothing here hashes, reads the
 * clock or shows a computed figure (rule P-6).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { PinCounts, Topology, TopologyNode } from '../types';
import { DEPENDENCY_GRAPH_LANES, DEPENDENCY_GRAPH_TEXT, DependencyGraph } from './dependency-graph';
import type { DependencyGraphProps } from './dependency-graph';

vi.mock('./evidence-drawer', () => ({
  EvidenceDrawer: ({ evidenceRef }: { evidenceRef: string }) => (
    <div role="dialog" aria-label="Evidence">
      {`Evidence for ${evidenceRef}`}
    </div>
  ),
}));

/* ---------------------------------------------------------------------------------------------
 * The fixture
 * ------------------------------------------------------------------------------------------- */

/** The drawing's title, which is also its accessible name. */
const TITLE = 'Dependency graph of the selected network';

/** A node of the payload, with the coordinates and reach a case does not vary. */
function makeNode(
  id: string,
  kind: TopologyNode['kind'],
  label: string,
  productIds: readonly string[] = [],
): TopologyNode {
  return { id, kind, label, latitude: 0, longitude: 0, productIds: [...productIds] };
}

const ORIGIN = makeNode('origin-north', 'origin', 'Northern mine');
const SUPPLIER_WITH_PINS = makeNode('supplier-one', 'supplier', 'First tier partner', [
  'product-one',
]);
const SUPPLIER_WITHOUT_PINS = makeNode('supplier-two', 'supplier', 'Second tier partner', [
  'product-two',
]);
const PLANT = makeNode('plant-main', 'plant', 'Main assembly site', ['product-one', 'product-two']);
const CUSTOMER = makeNode('customer-harbour', 'customer', 'Harbour works');

/**
 * Three pin tallies: one node whose breakdown fits its box, one with a single pin, and one whose
 * breakdown is too long to print — the case that falls back to its total. The rest carry none.
 */
const PINS_BY_NODE: Record<string, PinCounts> = {
  'plant-main': { pass: 2, fail: 1, review: 0, pending: 0, stale: 0, empty: 0 },
  'supplier-one': { pass: 0, fail: 0, review: 0, pending: 1, stale: 0, empty: 0 },
  'origin-north': { pass: 4, fail: 2, review: 1, pending: 1, stale: 1, empty: 0 },
};

/** The payload every case draws, with one lane whose downstream node the records do not hold. */
const TOPOLOGY: Topology = {
  origins: [ORIGIN],
  suppliers: [SUPPLIER_WITH_PINS, SUPPLIER_WITHOUT_PINS],
  plants: [PLANT],
  customers: [CUSTOMER],
  lanes: [
    { fromId: 'origin-north', toId: 'supplier-one' },
    { fromId: 'supplier-one', toId: 'plant-main' },
    { fromId: 'supplier-two', toId: 'plant-main' },
    { fromId: 'plant-main', toId: 'customer-harbour' },
    { fromId: 'plant-main', toId: 'node-not-in-the-payload' },
  ],
  pinsByNode: PINS_BY_NODE,
};

/** The node count of the payload, counted from the payload rather than written down. */
const NODE_COUNT =
  TOPOLOGY.origins.length +
  TOPOLOGY.suppliers.length +
  TOPOLOGY.plants.length +
  TOPOLOGY.customers.length;

const noop = (): void => {};

/**
 * Renders the lens with the props a case does not vary.
 *
 * Each optional prop is applied only when the case supplies it, because the component distinguishes
 * an absent handler from a present one and an explicit `undefined` would not exercise that.
 */
function renderGraph(overrides: Partial<DependencyGraphProps> = {}): ReturnType<typeof render> {
  return render(
    <DependencyGraph
      topology={overrides.topology ?? TOPOLOGY}
      title={overrides.title ?? TITLE}
      onSelectNode={overrides.onSelectNode ?? noop}
      {...(overrides.selectedNodeId === undefined
        ? {}
        : { selectedNodeId: overrides.selectedNodeId })}
      {...(overrides.dimmedNodeIds === undefined
        ? {}
        : { dimmedNodeIds: overrides.dimmedNodeIds })}
      {...(overrides.pathNodeIds === undefined ? {} : { pathNodeIds: overrides.pathNodeIds })}
      {...(overrides.previewScenarioId === undefined
        ? {}
        : { previewScenarioId: overrides.previewScenarioId })}
      {...(overrides.onPreviewScenarioChange === undefined
        ? {}
        : { onPreviewScenarioChange: overrides.onPreviewScenarioChange })}
      {...(overrides.evidenceRefForNode === undefined
        ? {}
        : { evidenceRefForNode: overrides.evidenceRefForNode })}
    />,
  );
}

/** The focus stop of one node, found by a fragment of its accessible name. */
function nodeButton(nameFragment: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(nameFragment) });
}

/** The boundary of one node, read through its rendered attribute so the class list can be compared. */
function nodeBox(nameFragment: string): string {
  const box = nodeButton(nameFragment).querySelector('rect');

  if (box === null) {
    throw new Error(`The node named ${nameFragment} draws no boundary.`);
  }

  return box.getAttribute('class') ?? '';
}

/** The classes one node's boundary carries, as tokens, so a variant prefix cannot satisfy a match. */
function nodeBoxTokens(nameFragment: string): readonly string[] {
  return nodeBox(nameFragment).split(' ');
}

/** The drawing itself: the one surface the payload's lanes are painted on. */
function drawing(container: HTMLElement): Element {
  const surface = container.querySelector('[role="group"]');

  if (surface === null) {
    throw new Error('The lens draws no surface.');
  }

  return surface;
}

/**
 * Every lane path of the drawing, in the order the payload stated them.
 *
 * The query is scoped to the drawing because the pin-state key below it renders bundled status
 * icons, and an icon draws paths of its own; a document-wide query would count them as lanes.
 */
function lanePaths(container: HTMLElement): readonly string[] {
  return Array.from(drawing(container).querySelectorAll('path')).map(
    (path) => path.getAttribute('class') ?? '',
  );
}

/** Leaves `<html>` on the default theme for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

/* ---------------------------------------------------------------------------------------------
 * The lanes
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph lanes', () => {
  it('draws the six lanes of the lens, each with its own heading', () => {
    renderGraph();

    expect(DEPENDENCY_GRAPH_LANES).toHaveLength(6);

    for (const lane of DEPENDENCY_GRAPH_LANES) {
      expect(screen.getByText(lane.label)).toBeInTheDocument();
    }
  });

  it('states that a stage the payload carries no nodes for holds none, and invents nothing', () => {
    renderGraph();

    const emptyLanes = DEPENDENCY_GRAPH_LANES.filter((lane) => lane.kind === null);

    expect(screen.getAllByText(DEPENDENCY_GRAPH_TEXT.emptyLane)).toHaveLength(emptyLanes.length);
    // No node of the payload may be placed in a lane its family does not name.
    expect(screen.getAllByRole('button', { name: / node, / })).toHaveLength(NODE_COUNT);
  });

  it('draws a lane for every pairable pair and skips the one whose node the payload lacks', () => {
    const { container } = renderGraph();

    // One path per lane, plus one arrowhead per lane; the lane naming a node outside the payload
    // draws neither.
    expect(lanePaths(container)).toHaveLength((TOPOLOGY.lanes.length - 1) * 2);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The nodes
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph nodes', () => {
  it('makes every node a focus stop named by its label, its family and its pin summary', () => {
    renderGraph();

    const nodes = screen.getAllByRole('button', { name: / node, / });

    expect(nodes).toHaveLength(NODE_COUNT);

    for (const node of nodes) {
      expect(node).toHaveAttribute('tabindex', '0');
      expect(node.tagName.toLowerCase()).toBe('g');
    }

    expect(
      screen.getByRole('button', {
        name: 'Main assembly site, Plant node, 3 evidence pins: 1 fail, 2 pass',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'First tier partner, Supplier node, 1 evidence pin: 1 pending',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Harbour works, Customer node, no evidence pins',
      }),
    ).toBeInTheDocument();
  });

  it('prints the pin breakdown inside the node that carries the pins', () => {
    renderGraph();

    expect(screen.getByText('1 fail, 2 pass')).toBeInTheDocument();
    expect(screen.getByText('1 pending')).toBeInTheDocument();
  });

  it('prints a node total when its whole breakdown would not fit, keeping the breakdown spoken', () => {
    renderGraph();

    expect(screen.getByText('9 evidence pins')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name:
          'Northern mine, Tier-2 origin node, ' +
          '9 evidence pins: 2 fail, 1 stale, 1 pending, 1 review, 4 pass',
      }),
    ).toBeInTheDocument();
  });

  it('explains every state word the summaries print, with an icon and a label for each', () => {
    renderGraph();

    expect(screen.getByText(DEPENDENCY_GRAPH_TEXT.pinKeyLabel)).toBeInTheDocument();

    for (const word of ['fail', 'stale', 'pending', 'review', 'pass']) {
      expect(screen.getByText(word)).toBeInTheDocument();
    }

    // A state no node carries a pin in is not explained, so the key never lists a word the drawing
    // cannot show.
    expect(screen.queryByText('empty')).toBeNull();
  });

  it('names the drawing for assistive technology from its title', () => {
    renderGraph();

    expect(screen.getByRole('group', { name: TITLE })).toBeInTheDocument();
  });

  it('draws the payload with no nodes at all without failing', () => {
    renderGraph({
      topology: {
        origins: [],
        suppliers: [],
        plants: [],
        customers: [],
        lanes: [],
        pinsByNode: {},
      },
    });

    expect(screen.queryAllByRole('button', { name: / node, / })).toHaveLength(0);
    expect(screen.getAllByText(DEPENDENCY_GRAPH_TEXT.emptyLane)).toHaveLength(
      DEPENDENCY_GRAPH_LANES.length,
    );
  });
});

/* ---------------------------------------------------------------------------------------------
 * Activation and the evidence drawer
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph activation', () => {
  it('reports the node a pointer activates', async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();

    renderGraph({ onSelectNode });
    await user.click(nodeButton('Main assembly site'));

    expect(onSelectNode).toHaveBeenCalledWith('plant-main');
  });

  it('reports the node the keyboard activates with Enter and with Space', async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();

    renderGraph({ onSelectNode });

    nodeButton('Harbour works').focus();
    await user.keyboard('{Enter}');

    expect(onSelectNode).toHaveBeenCalledWith('customer-harbour');

    onSelectNode.mockClear();
    nodeButton('Harbour works').focus();
    await user.keyboard(' ');

    expect(onSelectNode).toHaveBeenCalledWith('customer-harbour');
  });

  it('opens the evidence drawer for the reference the caller supplies', async () => {
    const user = userEvent.setup();

    renderGraph({ evidenceRefForNode: (node) => `reference-${node.id}` });
    await user.click(nodeButton('First tier partner'));

    expect(screen.getByRole('dialog', { name: 'Evidence' })).toHaveTextContent(
      'Evidence for reference-supplier-one',
    );
  });

  it('opens no drawer when the caller supplies no reference for the node', async () => {
    const user = userEvent.setup();

    renderGraph();
    await user.click(nodeButton('First tier partner'));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The overlays the screen drives
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph overlays', () => {
  it('dims a node with a thinner boundary and a lighter label, keeping its name', () => {
    renderGraph({ dimmedNodeIds: ['supplier-two'] });

    const dimmedTokens = nodeBoxTokens('Second tier partner');
    const plainTokens = nodeBoxTokens('First tier partner');

    expect(dimmedTokens).not.toEqual(plainTokens);
    expect(dimmedTokens).toContain('stroke-hairline');
    expect(dimmedTokens).toContain('stroke-1');
    expect(plainTokens).toContain('stroke-control-boundary');
    expect(
      screen.getByRole('button', {
        name: 'Second tier partner, Supplier node, no evidence pins',
      }),
    ).toBeInTheDocument();
  });

  it('traces the named path on its nodes and on the lanes between them', () => {
    const { container } = renderGraph({
      pathNodeIds: ['origin-north', 'supplier-one', 'plant-main'],
    });

    expect(nodeBoxTokens('First tier partner')).toContain('stroke-accent');
    expect(nodeBoxTokens('Main assembly site')).toContain('stroke-accent');
    expect(nodeBoxTokens('Harbour works')).not.toContain('stroke-accent');

    // The origin-to-supplier lane and the supplier-to-plant lane are both on the traced path, and
    // each draws its lane in the accent role and its arrowhead in the accent fill.
    const paths = lanePaths(container);

    expect(paths.filter((classes) => classes.includes('stroke-accent'))).toHaveLength(2);
    expect(paths.filter((classes) => classes.includes('fill-accent'))).toHaveLength(2);
  });

  it('draws the selected node more strongly than a traced one, keeping the selection alone', () => {
    renderGraph({ selectedNodeId: 'supplier-one', pathNodeIds: ['plant-main'] });

    expect(nodeBox('First tier partner')).toContain('fill-surface-1');
    expect(nodeBoxTokens('Main assembly site')).toContain('stroke-accent');
    expect(nodeBoxTokens('Harbour works')).not.toContain('stroke-accent');
  });
});

/* ---------------------------------------------------------------------------------------------
 * The scenario preview switch
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph preview switch', () => {
  it('names the scenario it would preview and reports both directions of the toggle', async () => {
    const user = userEvent.setup();
    const onPreviewScenarioChange = vi.fn();

    renderGraph({ previewScenarioId: 'scenario-alternate', onPreviewScenarioChange });

    const toggle = screen.getByRole('switch', { name: 'Preview scenario scenario-alternate' });

    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);

    expect(onPreviewScenarioChange).toHaveBeenLastCalledWith('scenario-alternate');
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.click(toggle);

    expect(onPreviewScenarioChange).toHaveBeenLastCalledWith(null);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('cannot be turned on with no scenario to preview, and states why', async () => {
    const user = userEvent.setup();
    const onPreviewScenarioChange = vi.fn();

    renderGraph({ previewScenarioId: null, onPreviewScenarioChange });

    const toggle = screen.getByRole('switch', { name: 'Preview scenario' });

    expect(toggle).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(DEPENDENCY_GRAPH_TEXT.previewUnavailable)).toBeInTheDocument();

    await user.click(toggle);

    expect(onPreviewScenarioChange).not.toHaveBeenCalled();
  });

  it('renders no switch at all when the screen reports the preview to nobody', () => {
    renderGraph();

    expect(screen.queryByRole('switch')).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The "Open part" control, and the stage it belongs to
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph open part', () => {
  it('disables "Open part" with the specification stage tooltip, reachable by keyboard focus', async () => {
    const user = userEvent.setup();

    renderGraph({ selectedNodeId: 'plant-main' });

    const openPart = screen.getByRole('button', { name: DEPENDENCY_GRAPH_TEXT.openPartLabel });
    const reason = screen.getByText(DEPENDENCY_GRAPH_TEXT.stageFourReason);

    expect(openPart).toHaveAttribute('aria-disabled', 'true');
    expect(openPart.getAttribute('aria-describedby')).toBe(reason.id);

    await user.click(openPart);

    expect(screen.getByRole('tooltip')).toHaveTextContent(DEPENDENCY_GRAPH_TEXT.stageFourReason);
  });

  it('names the selected node beside the control', () => {
    renderGraph({ selectedNodeId: 'plant-main' });

    const caption = screen.getByText(DEPENDENCY_GRAPH_TEXT.selectedLabel);
    const strip = caption.parentElement;

    expect(strip).not.toBeNull();
    expect(within(strip as HTMLElement).getByText('Main assembly site')).toBeInTheDocument();
  });

  it('offers no part control for a selected node that reaches no product', () => {
    renderGraph({ selectedNodeId: 'customer-harbour' });

    expect(screen.queryByRole('button', { name: DEPENDENCY_GRAPH_TEXT.openPartLabel })).toBeNull();
  });

  it('offers no part control and no strip while nothing is selected', () => {
    renderGraph();

    expect(screen.queryByText(DEPENDENCY_GRAPH_TEXT.selectedLabel)).toBeNull();
    expect(screen.queryByRole('button', { name: DEPENDENCY_GRAPH_TEXT.openPartLabel })).toBeNull();
  });
});

/* ---------------------------------------------------------------------------------------------
 * Both themes
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph themes', () => {
  it.each(['command', 'paper'] as const)('renders under the %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);

    renderGraph({ selectedNodeId: 'plant-main' });

    expect(screen.getByRole('group', { name: TITLE })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: / node, / })).toHaveLength(NODE_COUNT);
  });
});
