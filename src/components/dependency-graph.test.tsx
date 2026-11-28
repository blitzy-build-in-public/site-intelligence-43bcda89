/**
 * Component suite for `dependency-graph.tsx`, the six-lane graph lens of the FileMap canvas.
 *
 * Each case asserts one clause of the component's own contract, and together they cover the four
 * obligations that make the lens a pass condition rather than a drawing: the six lanes AAP 0.12.4
 * fixes, a focus stop and a full accessible name for every node of the payload, the selection the
 * lens shares with the map lens, and the controls it carries — the three emphasis-direction controls
 * and the dimming switch AAP 0.12.4 and AAP 0.14.1 require of the lens, the scenario preview switch,
 * and the "Open part" control disabled with the specification's stage tooltip (rule P-8). Rule B-3's
 * clauses are asserted where they can fail: the accessible name of every node, keyboard activation
 * through `Enter` and through `Space`, dimming that never rests on colour alone, the pressed state
 * carried by weight as well as by colour, the stated reason of every control that cannot act, and the
 * 24x24 px target of the tooltip's own control lists. Two further properties are asserted because a
 * reader depends on them: the drawing redraws identically from one render to the next, and every
 * control the lens offers is reachable and operable by keyboard alone — the four emphasis controls,
 * the preview switch, a node that opens its evidence, and the disabled control whose reason has to
 * arrive with focus.
 *
 * THE FIXTURE IS SYNTHETIC AND DELIBERATELY PLAIN. Its identifiers carry no domain prefix, because
 * rule P-6 keeps domain identifiers out of `src/components` — tests included — and the suite only
 * needs six nodes, six lanes and two pin tallies to exercise every branch: a lane whose downstream
 * node the payload does not hold, a node with several pin states, a node with one, a node with none, a
 * material beside the supplier it is bought from, and a customer whose product reach is empty.
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
import type { ReactElement } from 'react';

import type { PinCounts, Topology, TopologyNode } from '../types';
import {
  DEPENDENCY_GRAPH_LANES,
  DEPENDENCY_GRAPH_TEXT,
  GRAPH_EMPHASIS_DIRECTIONS,
  DependencyGraph,
} from './dependency-graph';
import type { DependencyGraphProps, GraphEmphasisDirection } from './dependency-graph';
import { CONTROL_RADIUS_CLASSES } from './horizontal-bar-chart';

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
const MATERIAL = makeNode('material-sheet', 'material', 'Rolled sheet', ['product-two']);

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
  materials: [MATERIAL],
  plants: [PLANT],
  customers: [CUSTOMER],
  lanes: [
    { fromId: 'origin-north', toId: 'supplier-one' },
    { fromId: 'supplier-one', toId: 'plant-main' },
    { fromId: 'supplier-two', toId: 'material-sheet' },
    { fromId: 'material-sheet', toId: 'plant-main' },
    { fromId: 'plant-main', toId: 'customer-harbour' },
    { fromId: 'plant-main', toId: 'node-not-in-the-payload' },
  ],
  pinsByNode: PINS_BY_NODE,
};

/** The node count of the payload, counted from the payload rather than written down. */
const NODE_COUNT =
  TOPOLOGY.origins.length +
  TOPOLOGY.suppliers.length +
  TOPOLOGY.materials.length +
  TOPOLOGY.plants.length +
  TOPOLOGY.customers.length;

const noop = (): void => {};

/**
 * The mapping a case that asserts nothing about evidence starts from: no record stands behind any
 * node, so activating one reports the selection and opens nothing. The prop is required, so the lens
 * is never composed without one; a case that exercises the drawer names its own mapper.
 */
const NO_NODE_EVIDENCE: (node: TopologyNode) => string | undefined = () => undefined;

/**
 * Renders the lens with the props a case does not vary.
 *
 * `evidenceRefForNode` is required, so it is supplied unconditionally. The emphasis pair is required
 * for the same reason and defaults to the reading the lens opens on — both directions, dimming on —
 * with handlers that report nothing, so a case about one control varies that control alone. Each
 * remaining optional prop is applied only when the case supplies it, because the component
 * distinguishes an absent handler from a present one and an explicit `undefined` would not exercise
 * that.
 */
function renderGraph(overrides: Partial<DependencyGraphProps> = {}): ReturnType<typeof render> {
  return render(
    <DependencyGraph
      topology={overrides.topology ?? TOPOLOGY}
      title={overrides.title ?? TITLE}
      onSelectNode={overrides.onSelectNode ?? noop}
      evidenceRefForNode={overrides.evidenceRefForNode ?? NO_NODE_EVIDENCE}
      emphasisDirection={overrides.emphasisDirection ?? 'both'}
      onEmphasisDirectionChange={overrides.onEmphasisDirectionChange ?? noop}
      dimming={overrides.dimming ?? true}
      onDimmingChange={overrides.onDimmingChange ?? noop}
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

/**
 * The drawing itself: the one surface the payload's lanes are painted on.
 *
 * The controls row above it holds a `role="group"` of its own — the three direction controls — so the
 * query names the element as well as the role. The requirement it exists for is unchanged and still
 * asserted: the surface a reader's assistive technology reaches as a group is the drawing, not a strip
 * of controls.
 */
function drawing(container: HTMLElement): Element {
  const surface = container.querySelector('svg[role="group"]');

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

/**
 * The transform of every node, in the order the lanes place them.
 *
 * The attribute is what holds a node's position, so comparing these lists across two renders is what
 * proves the layout is a function of the payload alone.
 */
function nodeTransforms(container: HTMLElement): readonly string[] {
  return Array.from(container.querySelectorAll('g[role="button"]')).map(
    (node) => node.getAttribute('transform') ?? '',
  );
}

/** The geometry of every lane and arrowhead, which the fixed layout derives from one placement list. */
function laneGeometry(container: HTMLElement): readonly string[] {
  return Array.from(drawing(container).querySelectorAll('path')).map(
    (path) => path.getAttribute('d') ?? '',
  );
}

/** The classes one node's label carries, as tokens, so a weight can be read without a style pass. */
function nodeLabelTokens(nameFragment: string): readonly string[] {
  const label = nodeButton(nameFragment).querySelector('text');

  if (label === null) {
    throw new Error(`The node named ${nameFragment} draws no label.`);
  }

  return (label.getAttribute('class') ?? '').split(' ');
}

/**
 * Tabs from wherever focus is until it reaches `target`.
 *
 * A case that asserts a keyboard path has to arrive at the control the way a keyboard user does, so
 * the target is found by pressing Tab rather than by focusing it programmatically. The limit turns a
 * control that has left the tab order — the defect rule B-3 forbids — into a failure naming it,
 * instead of a loop that never ends.
 */
async function tabUntilFocused(
  user: ReturnType<typeof userEvent.setup>,
  target: HTMLElement,
  limit = 16,
): Promise<void> {
  for (let step = 0; step < limit; step += 1) {
    await user.tab();

    if (document.activeElement === target) {
      return;
    }
  }

  throw new Error(
    `The keyboard did not reach ${
      target.getAttribute('aria-label') ?? target.textContent ?? target.tagName
    }.`,
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
    // The Materials lane is a family of the payload now, so its column holds the material node the
    // payload carries instead of the empty note.
    expect(
      screen.getByRole('button', { name: /^Rolled sheet, Material node, / }),
    ).toBeInTheDocument();
    // No node of the payload may be placed in a lane its family does not name.
    expect(screen.getAllByRole('button', { name: / node, / })).toHaveLength(NODE_COUNT);
  });

  it('draws a lane for every pairable pair and skips the one whose node the payload lacks', () => {
    const { container } = renderGraph();

    // One path per lane, plus one arrowhead per lane; the lane naming a node outside the payload
    // draws neither.
    expect(lanePaths(container)).toHaveLength((TOPOLOGY.lanes.length - 1) * 2);
  });

  it('places every node at the same coordinates on a second render of the same topology', () => {
    const first = renderGraph();
    const firstTransforms = nodeTransforms(first.container);
    const firstGeometry = laneGeometry(first.container);

    first.unmount();

    const second = renderGraph();

    /* The layout is a pure function of the payload: a hand-laid grid, with no random jitter, no
       physics pass and no measuring of the rendered box. Two renders of one topology therefore draw
       one picture, which is what lets this suite and a browser test assert the same geometry. */
    expect(firstTransforms).toHaveLength(NODE_COUNT);
    expect(nodeTransforms(second.container)).toEqual(firstTransforms);
    expect(laneGeometry(second.container)).toEqual(firstGeometry);
  });

  it('gives every node its own slot on the grid rather than stacking two nodes in one place', () => {
    const { container } = renderGraph();
    const transforms = nodeTransforms(container);

    for (const transform of transforms) {
      expect(transform).toMatch(/^translate\(-?\d+ -?\d+\)$/u);
    }

    expect(new Set(transforms).size).toBe(NODE_COUNT);
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

  it('carries that name as an explicit label, the way the map lens and every chart do', () => {
    const { container } = renderGraph();

    const surface = drawing(container);

    /* Rule B-3: the name is the title the caller gave, stated on the drawing itself rather than through
       an id reference two instances could collide over. */
    expect(surface).toHaveAttribute('aria-label', TITLE);
    expect(surface).not.toHaveAttribute('aria-labelledby');
  });

  it('draws the payload with no nodes at all without failing', () => {
    renderGraph({
      topology: {
        origins: [],
        suppliers: [],
        materials: [],
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

  it('opens the evidence drawer for the reference the mapper supplies', async () => {
    const user = userEvent.setup();

    renderGraph({ evidenceRefForNode: (node) => `reference-${node.id}` });

    const supplier = nodeButton('First tier partner');

    expect(supplier).toHaveAttribute('aria-haspopup', 'dialog');

    await user.click(supplier);

    expect(screen.getByRole('dialog', { name: 'Evidence' })).toHaveTextContent(
      'Evidence for reference-supplier-one',
    );
  });

  it('opens no drawer for a node the mapper resolves no record for, and declares none', async () => {
    const user = userEvent.setup();

    renderGraph({ evidenceRefForNode: NO_NODE_EVIDENCE });

    const supplier = nodeButton('First tier partner');

    expect(supplier).not.toHaveAttribute('aria-haspopup');

    await user.click(supplier);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('decides per node: only the node the mapper resolves declares and opens evidence', async () => {
    const user = userEvent.setup();

    renderGraph({
      evidenceRefForNode: (node) => (node.id === 'plant-main' ? 'reference-plant' : undefined),
    });

    const plant = nodeButton('Main assembly site');
    const customer = nodeButton('Harbour works');

    expect(plant).toHaveAttribute('aria-haspopup', 'dialog');
    expect(customer).not.toHaveAttribute('aria-haspopup');

    await user.click(customer);

    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(plant);

    expect(screen.getByRole('dialog', { name: 'Evidence' })).toHaveTextContent(
      'Evidence for reference-plant',
    );
  });

  it('closes an open drawer when a newly selected node resolves no reference', async () => {
    const user = userEvent.setup();

    renderGraph({
      evidenceRefForNode: (node) => (node.id === 'plant-main' ? 'reference-plant' : undefined),
    });

    await user.click(nodeButton('Main assembly site'));

    expect(screen.getByRole('dialog', { name: 'Evidence' })).toBeInTheDocument();

    await user.click(nodeButton('Harbour works'));

    /* The map lens answers the same gesture the same way: another node's evidence never sits beside
       the node the reader has just selected. */
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the evidence dialog from the keyboard, not only from the pointer', async () => {
    const user = userEvent.setup();

    renderGraph({ evidenceRefForNode: (node) => `reference-${node.id}` });

    const plant = nodeButton('Main assembly site');

    await tabUntilFocused(user, plant);

    expect(plant).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog', { name: 'Evidence' })).toHaveTextContent(
      'Evidence for reference-plant-main',
    );
  });

  it('rounds a node box from the control radius token, not a literal radius', () => {
    renderGraph({});

    for (const name of ['Main assembly site', 'Harbour works']) {
      const box = nodeButton(name).querySelector('rect');

      expect(box).not.toBeNull();
      expect(box?.getAttribute('class')).toContain(CONTROL_RADIUS_CLASSES);
      expect(box).not.toHaveAttribute('rx');
    }
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

  it.each([
    { emphasis: 'default', node: 'Harbour works', overrides: {} },
    { emphasis: 'dimmed', node: 'Second tier partner', overrides: { dimmedNodeIds: ['supplier-two'] } },
    { emphasis: 'path', node: 'First tier partner', overrides: { pathNodeIds: ['supplier-one'] } },
    { emphasis: 'selected', node: 'First tier partner', overrides: { selectedNodeId: 'supplier-one' } },
  ] as const)(
    'answers the pointer on the $emphasis level without giving up the emphasis it carries',
    ({ node, overrides }) => {
      renderGraph(overrides);

      const tokens = nodeBoxTokens(node);
      const states = tokens.filter(
        (utility) => utility.startsWith('group-hover:') || utility.startsWith('group-active:'),
      );

      expect(states.some((utility) => utility.startsWith('group-hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('group-active:'))).toBe(true);
      for (const utility of states) {
        /* Every state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(
          /^(fill|stroke|opacity)-[a-z0-9]/u,
        );
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }

      /* Emphasis is untouched by those states: the level keeps exactly one boundary weight of its own. */
      expect(tokens.filter((utility) => /^stroke-[12]$/u.test(utility))).toHaveLength(1);

      /* The keyboard indicator is still on the node's own group, carried by the guarded transition. */
      const group = nodeButton(node).getAttribute('class') ?? '';

      expect(group).toContain('focus-visible:outline-focus-ring');
      expect(group).toContain('motion-safe:transition-colors');
    },
  );

  it('marks the selected node with a heavier boundary and a heavier label, not colour alone', async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();

    renderGraph({ selectedNodeId: 'supplier-one', onSelectNode });

    const selected = nodeBoxTokens('First tier partner');
    const plain = nodeBoxTokens('Harbour works');

    /* A reader who cannot tell the two theme colours apart still sees a heavier boundary and a
       heavier label on the node the screen has selected (rule B-3). */
    expect(selected).toContain('stroke-2');
    expect(selected).not.toContain('stroke-1');
    expect(plain).toContain('stroke-1');
    expect(plain).not.toContain('stroke-2');

    expect(nodeLabelTokens('First tier partner')).toContain('font-semibold');
    expect(nodeLabelTokens('Harbour works')).toContain('font-medium');

    /* The selection belongs to the screen: activating another node reports it and leaves the node
       the caller selected marked as it was, because this component keeps no selection of its own. */
    await user.click(nodeButton('Harbour works'));

    expect(onSelectNode).toHaveBeenCalledWith('customer-harbour');
    expect(nodeBoxTokens('First tier partner')).toContain('stroke-2');
    expect(nodeBoxTokens('Harbour works')).toContain('stroke-1');
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

  it('turns the preview on and off from the keyboard alone', async () => {
    const user = userEvent.setup();
    const onPreviewScenarioChange = vi.fn();

    renderGraph({ previewScenarioId: 'scenario-alternate', onPreviewScenarioChange });

    const toggle = screen.getByRole('switch', { name: 'Preview scenario scenario-alternate' });

    await tabUntilFocused(user, toggle);

    expect(toggle).toHaveFocus();
    expect(toggle).not.toHaveAttribute('aria-disabled');

    await user.keyboard(' ');

    expect(onPreviewScenarioChange).toHaveBeenLastCalledWith('scenario-alternate');
    expect(toggle).toHaveAttribute('aria-checked', 'true');

    await user.keyboard('{Enter}');

    expect(onPreviewScenarioChange).toHaveBeenLastCalledWith(null);
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('renders no preview switch when the screen reports the preview to nobody', () => {
    renderGraph({ selectedNodeId: 'plant-main' });

    /* The lens's own dimming switch renders whenever a node can be traced, so this case names the
       preview control rather than counting switches: a preview that reports to nobody is not offered
       at all (rule P-8). */
    expect(screen.queryByRole('switch', { name: /Preview scenario/iu })).toBeNull();
    expect(
      screen.getByRole('switch', { name: DEPENDENCY_GRAPH_TEXT.dimmingLabel }),
    ).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The emphasis controls — AAP 0.12.4's dimming and upstream/downstream path
 * ------------------------------------------------------------------------------------------- */

/** The group holding the three direction controls, named by the caption the drawing gives it. */
function directionGroup(): HTMLElement {
  return screen.getByRole('group', { name: DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabel });
}

/** The dimming switch, found by the label it prints. */
function dimmingSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: DEPENDENCY_GRAPH_TEXT.dimmingLabel });
}

/** One direction control, found by the label it prints. */
function directionControl(
  direction: keyof typeof DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabels,
): HTMLElement {
  return within(directionGroup()).getByRole('button', {
    name: DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabels[direction],
  });
}

describe('DependencyGraph emphasis controls', () => {
  it('renders one pressed control per direction, all operable while a node resolves', () => {
    renderGraph({ selectedNodeId: 'plant-main', emphasisDirection: 'upstream' });

    const controls = within(directionGroup()).getAllByRole('button');

    expect(GRAPH_EMPHASIS_DIRECTIONS).toHaveLength(3);
    expect(controls).toHaveLength(GRAPH_EMPHASIS_DIRECTIONS.length);
    expect(directionControl('upstream')).toHaveAttribute('aria-pressed', 'true');
    expect(directionControl('both')).toHaveAttribute('aria-pressed', 'false');
    expect(directionControl('downstream')).toHaveAttribute('aria-pressed', 'false');

    for (const control of [...controls, dimmingSwitch()]) {
      expect(control).not.toHaveAttribute('aria-disabled');
    }
  });

  it('reports the direction a pointer chooses and leaves the pressed state to the caller', async () => {
    const user = userEvent.setup();
    const onEmphasisDirectionChange = vi.fn();

    renderGraph({ selectedNodeId: 'plant-main', onEmphasisDirectionChange });

    await user.click(directionControl('downstream'));

    expect(onEmphasisDirectionChange).toHaveBeenCalledWith('downstream');
    /* Controlled, like the map's view preset: the caller owns the value, so the control this component
       draws has not moved on its own. */
    expect(directionControl('both')).toHaveAttribute('aria-pressed', 'true');
    expect(directionControl('downstream')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the direction a keyboard chooses, and carries the pressed state by weight too', async () => {
    const user = userEvent.setup();
    const onEmphasisDirectionChange = vi.fn();

    renderGraph({ selectedNodeId: 'plant-main', onEmphasisDirectionChange });

    await tabUntilFocused(user, directionControl('upstream'));

    expect(directionControl('upstream')).toHaveFocus();

    await user.keyboard('{Enter}');

    expect(onEmphasisDirectionChange).toHaveBeenCalledWith('upstream');

    /* Rule B-3: the pressed state is not colour alone — the label steps up a weight as well. */
    expect(directionControl('upstream').getAttribute('class')).toContain('aria-pressed:font-semibold');
  });

  it('toggles the dimming switch from the keyboard and from the pointer, reporting both directions', async () => {
    const user = userEvent.setup();
    const onDimmingChange = vi.fn();

    renderGraph({ selectedNodeId: 'plant-main', onDimmingChange });

    expect(dimmingSwitch()).toHaveAttribute('aria-checked', 'true');

    await tabUntilFocused(user, dimmingSwitch());

    expect(dimmingSwitch()).toHaveFocus();

    await user.keyboard(' ');

    expect(onDimmingChange).toHaveBeenLastCalledWith(false);

    await user.click(dimmingSwitch());

    expect(onDimmingChange).toHaveBeenCalledTimes(2);
    expect(onDimmingChange).toHaveBeenLastCalledWith(false);
    /* Rule B-3: the switch's state is stated by `aria-checked` and by its label's weight, never by a
       colour alone. */
    expect(dimmingSwitch().getAttribute('class')).toContain('aria-checked:font-semibold');
  });

  it('states the dimming switch as checked when the caller holds it on', () => {
    renderGraph({ selectedNodeId: 'plant-main', dimming: false });

    expect(dimmingSwitch()).toHaveAttribute('aria-checked', 'false');
  });

  it('disables all four controls with one stated reason while no node resolves, and reports nothing', async () => {
    const user = userEvent.setup();
    const onEmphasisDirectionChange = vi.fn();
    const onDimmingChange = vi.fn();

    renderGraph({ onEmphasisDirectionChange, onDimmingChange });

    const controls = [...within(directionGroup()).getAllByRole('button'), dimmingSwitch()];

    expect(controls).toHaveLength(GRAPH_EMPHASIS_DIRECTIONS.length + 1);

    for (const control of controls) {
      expect(control).toHaveAttribute('aria-disabled', 'true');

      /* The reason is mounted as the control's description whether or not the hint is painted, so a
         reader is told why before the control is ever reached (rule P-8). */
      const describedBy = control.getAttribute('aria-describedby');

      expect(describedBy).not.toBeNull();
      expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
        DEPENDENCY_GRAPH_TEXT.emphasisUnavailable,
      );

      await user.click(control);
    }

    expect(onEmphasisDirectionChange).not.toHaveBeenCalled();
    expect(onDimmingChange).not.toHaveBeenCalled();
  });

  it('disables them for a selected node the payload no longer holds', () => {
    renderGraph({ selectedNodeId: 'node-not-in-the-payload' });

    expect(directionControl('both')).toHaveAttribute('aria-disabled', 'true');
    expect(dimmingSwitch()).toHaveAttribute('aria-disabled', 'true');
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

  it('reaches the staged reason by keyboard and associates it with the disabled control', async () => {
    const user = userEvent.setup();

    renderGraph({ selectedNodeId: 'plant-main' });

    const openPart = screen.getByRole('button', { name: DEPENDENCY_GRAPH_TEXT.openPartLabel });

    /* A disabled control keeps its place in the tab order and hides its reason until it is reached,
       so the explanation is only worth anything if focus can arrive at it (rules B-3 and P-8). */
    expect(openPart).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('tooltip')).toBeNull();

    await tabUntilFocused(user, openPart);

    expect(openPart).toHaveFocus();

    const hint = screen.getByRole('tooltip');

    /* The specification fixes this sentence, so it is asserted character for character. */
    expect(hint.textContent).toBe('Arrives in stage S4');

    const describedBy = openPart.getAttribute('aria-describedby');

    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy ?? '')).toBe(hint);
  });
});

/* ---------------------------------------------------------------------------------------------
 * Render cost — the memo the canvas screen's re-renders rest on
 * ------------------------------------------------------------------------------------------- */

describe('DependencyGraph render cost', () => {
  it('draws nothing again when its parent re-renders with the props it already has', () => {
    /* The mapper runs once per node while the drawing is built, so counting its calls counts the
       renders of this component rather than the renders of its parent. */
    const evidenceRefForNode = vi.fn((): undefined => undefined);

    /* A fresh element per render, with the same prop values: reusing one element object would let
       React skip the render on referential equality alone, which would prove nothing about the memo. */
    const graphElement = (emphasisDirection: GraphEmphasisDirection): ReactElement => (
      <DependencyGraph
        topology={TOPOLOGY}
        title={TITLE}
        onSelectNode={noop}
        evidenceRefForNode={evidenceRefForNode}
        emphasisDirection={emphasisDirection}
        onEmphasisDirectionChange={noop}
        dimming
        onDimmingChange={noop}
      />
    );

    const { rerender } = render(graphElement('both'));
    const passesOfTheFirstRender = evidenceRefForNode.mock.calls.length;

    expect(passesOfTheFirstRender).toBe(NODE_COUNT);

    /* React.memo is what spares this drawing: the canvas screen re-renders on every node click, every
       lens switch and every wall-mode toggle, and a re-render that changed none of these props must
       leave the ~600 marks of the surface exactly as they were. */
    rerender(graphElement('both'));

    expect(evidenceRefForNode).toHaveBeenCalledTimes(passesOfTheFirstRender);

    /* And a changed prop still reaches it: without this the case above would pass for a component that
       had stopped reading its props at all. */
    rerender(graphElement('upstream'));

    expect(evidenceRefForNode).toHaveBeenCalledTimes(passesOfTheFirstRender + NODE_COUNT);
    expect(directionControl('upstream')).toHaveAttribute('aria-pressed', 'true');
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
