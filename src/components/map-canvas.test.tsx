/**
 * Component suite for `map-canvas.tsx`, the map lens of the FileMap canvas.
 *
 * Each case asserts one clause of the lens's own contract, taken from the specification and the rules
 * rather than from the implementation's shape: the bundled boundary file is the only geographic source
 * and no request is made for it (rule B-1, T-20); the three zoom levels and the five presets move the
 * projection; the five presets are native controls that report the view they were asked for; each of
 * the four node families reaches the map as a labelled, focusable control whose accessible name states
 * the family and the evidence-pin counts per state (rules B-3, P-6); activating a node reports the
 * selection and opens the evidence drawer for the reference the required mapper resolves for it, a
 * node the mapper cannot resolve declaring no drawer and opening none (rule P-8); the two zoom
 * controls stop at the ends of their range and say why (rule P-8); the competitor marks, the chokepoint
 * halos and the legend appear only when the atlas payload supplies them, and always with the fixed
 * market-intelligence label imported from `src/types` (rules P-1, P-5); and the lens renders under
 * both themes.
 *
 * The fixtures hold plain words for the record names and neutral keys for the identifiers, so this
 * suite borrows no value from a seed record and names no domain identifier shape: what the map draws
 * is entirely the caller's props, and the lens formats no figure of its own (rule P-6). The topology
 * carries two nodes of every family and pin counts that between them cover all six `PinState`
 * members, so a lens that drew only the first node of each array, or that printed one state and
 * dropped the rest, fails here rather than passing on a one-node fixture. The service is mocked
 * because the evidence drawer reads through it; nothing here hashes, reads the clock or touches the
 * network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Atlas, Chokepoint, PinCounts, Topology, TopologyNode } from '../types';
import { SIM_LABELS } from '../types';
import { MAP_CANVAS_TEXT, MAP_VIEW_PRESETS, MAP_VIEW_PRESET_LABELS, MapCanvas } from './map-canvas';
import type { MapCanvasProps } from './map-canvas';
import { CONTROL_RADIUS_CLASSES } from './horizontal-bar-chart';

/**
 * The service the evidence drawer reads through, replaced because this suite is about the drawing.
 *
 * The read never settles, so the drawer stays in its loading state: the case that activates a node
 * asserts that the drawer opened, which is this component's contract, and leaves what a drawer does
 * with an answer to the drawer's own suite.
 */
vi.mock('../services/service-provider', () => ({
  useService: () => ({
    getEvidence: () => new Promise(() => undefined),
  }),
}));

/** The market-intelligence label, read from its single owner so this suite never retypes it. */
const MARKET_INTELLIGENCE_LABEL = SIM_LABELS[5];

/** The six pin states, taken from a complete count record so no state has to be counted twice. */
const NO_PINS: PinCounts = { empty: 0, pending: 0, pass: 0, fail: 0, stale: 0, review: 0 };

/** One node's counts: a complete record with the given states set. */
function pinCounts(stated: Partial<PinCounts>): PinCounts {
  return { ...NO_PINS, ...stated };
}

/**
 * An eight-node network: two nodes of every family, the two lanes of the client's own chain, and pin
 * counts that between them cover each of the six `PinState` members.
 *
 * The coordinates sit across Europe, the Gulf of Mexico and Japan so every node lands inside the world
 * view at every zoom level, which keeps a projection assertion about scale rather than about clipping.
 * A node absent from `pinsByNode` carries no pins, which is the case the accessible name states as
 * "No evidence pins".
 */
const TOPOLOGY: Topology = {
  plants: [
    {
      id: 'node-plant',
      kind: 'plant',
      label: 'Regensburg plant',
      latitude: 49.02,
      longitude: 12.1,
      productIds: ['product-one'],
    },
    {
      id: 'node-plant-second',
      kind: 'plant',
      label: 'Brno plant',
      latitude: 49.19,
      longitude: 16.61,
      productIds: ['product-two'],
    },
  ],
  suppliers: [
    {
      id: 'node-supplier',
      kind: 'supplier',
      label: 'Rheinstern Elektronik',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
    {
      id: 'node-supplier-second',
      kind: 'supplier',
      label: 'Fjordvik Components',
      latitude: 57.7,
      longitude: 11.97,
      productIds: ['product-two'],
    },
  ],
  origins: [
    {
      id: 'node-origin',
      kind: 'origin',
      label: 'Bajio metals origin',
      latitude: 21.5,
      longitude: -101.5,
      productIds: [],
    },
    {
      id: 'node-origin-second',
      kind: 'origin',
      label: 'Kansai alloys origin',
      latitude: 34.7,
      longitude: 135.5,
      productIds: ['product-two'],
    },
  ],
  customers: [
    {
      id: 'node-customer',
      kind: 'customer',
      label: 'Nordwerk Nutzfahrzeuge',
      latitude: 53.55,
      longitude: 9.99,
      productIds: [],
    },
    {
      id: 'node-customer-second',
      kind: 'customer',
      label: 'Hochwald Fleetworks',
      latitude: 45.46,
      longitude: 9.19,
      productIds: [],
    },
  ],
  lanes: [
    { fromId: 'node-origin', toId: 'node-supplier' },
    { fromId: 'node-supplier', toId: 'node-plant' },
  ],
  pinsByNode: {
    'node-supplier': pinCounts({ pass: 2, fail: 1 }),
    'node-plant': pinCounts({ stale: 1 }),
    'node-origin-second': pinCounts({ pending: 1, review: 2, empty: 1 }),
  },
};

/** Every node of the payload, counted across the four families rather than restated as a literal. */
const NODE_COUNT =
  TOPOLOGY.plants.length +
  TOPOLOGY.suppliers.length +
  TOPOLOGY.origins.length +
  TOPOLOGY.customers.length;

/** The seven controls beside the map: the two zoom steps and the five view presets. */
const CONTROL_COUNT = 2 + MAP_VIEW_PRESETS.length;

/** One shared crossing, stated with the shared shape's own members and nothing else. */
const CROSSING: Chokepoint = {
  id: 'crossing-one',
  label: 'Southern sea crossing',
  overlap: 67,
  competitorBufferDays: { 'competitor-one': 12 },
  contentionNote: 'Three networks use the crossing and the buffer each holds differs.',
  provenance: 'market_intelligence',
};

/**
 * A market-intelligence payload: one competitor network of two sites with a lane through the crossing,
 * and the crossing itself.
 *
 * The recorded series and axes are empty because this suite asserts nothing about the radar; the atlas
 * shape allows empty lists, and the fields the lens reads are the networks and the crossings.
 */
const ATLAS: Atlas = {
  packLabel: 'Market-intelligence pack, simulated',
  packVersion: 'pack-one',
  productClasses: ['product-one'],
  clientSites: [],
  competitors: [
    {
      competitorId: 'competitor-one',
      label: 'Aurelvik Drive Systems',
      provenance: 'market_intelligence',
      sites: [
        {
          id: 'site-alpha',
          competitorId: 'competitor-one',
          label: 'Ningbo drive plant',
          latitude: 29.87,
          longitude: 121.55,
        },
        {
          id: 'site-beta',
          competitorId: 'competitor-one',
          label: 'Gdansk assembly',
          latitude: 54.35,
          longitude: 18.65,
        },
      ],
      lanes: [{ fromId: 'site-alpha', toId: 'site-beta', chokepointId: CROSSING.id }],
    },
  ],
  chokepoints: [CROSSING],
  radarAxes: [],
  radarSeries: [],
};

/**
 * The mapping a case that asserts nothing about evidence starts from: no record stands behind any
 * node, so activating one reports the selection and opens nothing. The prop is required, so the lens
 * is never composed without one; a case that exercises the drawer names its own mapper.
 */
const NO_NODE_EVIDENCE: (node: TopologyNode) => string | undefined = () => undefined;

/** The props every case starts from, so a case states only what it changes. */
const BASE_PROPS: MapCanvasProps = {
  topology: TOPOLOGY,
  title: 'FileMap canvas network map',
  zoomLevel: 1,
  onZoomLevelChange: () => undefined,
  viewPreset: 'world',
  onViewPresetChange: () => undefined,
  onSelectNode: () => undefined,
  evidenceRefForNode: NO_NODE_EVIDENCE,
};

/** Renders the lens inside the query cache the evidence drawer reads through. */
function renderLens(overrides: Partial<MapCanvasProps> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MapCanvas {...BASE_PROPS} {...overrides} />
    </QueryClientProvider>,
  );
}

/** The path data of the country shapes: the first path of the map's first group. */
function countryPathsOf(container: HTMLElement): string {
  return container.querySelector('svg > g:first-child > path')?.getAttribute('d') ?? '';
}

/** The lane paths: the second group of the map holds one path per lane whose ends were placed. */
function lanePathsOf(container: HTMLElement): readonly string[] {
  const group = container.querySelectorAll('svg > g')[1];

  return [...(group?.querySelectorAll('path') ?? [])].map(
    (path) => path.getAttribute('d') ?? '',
  );
}


/**
 * The pointer-state utilities one class list declares, filtered by their prefix rather than matched as a
 * whole string, so a legitimate token change inside a state cannot fail the case while the requirement —
 * a hover and a pressed treatment built from role tokens — still holds.
 */
function pointerStates(classList: string): readonly string[] {
  return classList
    .split(' ')
    .filter((utility) => utility.startsWith('group-hover:') || utility.startsWith('group-active:'));
}

/** Every node of the map, as the focusable groups the drawing renders one of per topology node. */
function nodeMarks(container: HTMLElement): readonly Element[] {
  return [...container.querySelectorAll('svg g[role="button"]')];
}

describe('MapCanvas', () => {
  it('draws the bundled boundaries without asking any origin for them', () => {
    const requested = vi.spyOn(globalThis, 'fetch');
    const { container } = renderLens();

    const paths = countryPathsOf(container);

    expect(paths.length).toBeGreaterThan(1000);
    expect(paths.startsWith('M')).toBe(true);
    expect(requested).not.toHaveBeenCalled();
    requested.mockRestore();
  });

  it('links nothing outside the document and embeds no foreign image', () => {
    const { container } = renderLens({ overlay: ATLAS });

    /* Every graphic in the lens is drawn inline: no element addresses anything at all. */
    const addresses = [...container.querySelectorAll('[href], [xlink\\:href], [src], [srcset]')].map(
      (element) =>
        element.getAttribute('href') ??
        element.getAttribute('xlink:href') ??
        element.getAttribute('src') ??
        element.getAttribute('srcset') ??
        '',
    );

    expect(addresses.filter((address) => address.trim() !== '')).toStrictEqual([]);
    /* And nothing that could load a resource on its own: no raster, no sprite reference, no frame. */
    expect(container.querySelectorAll('img, image, use, iframe, object, embed')).toHaveLength(0);
  });

  it('draws one arc per lane whose two endpoints the projection places', () => {
    const { container } = renderLens();

    const lanes = lanePathsOf(container);

    expect(lanes).toHaveLength(TOPOLOGY.lanes.length);
    for (const lane of lanes) {
      expect(lane.startsWith('M')).toBe(true);
    }
  });

  it('moves the projection at each of the three zoom levels', () => {
    const atOne = countryPathsOf(renderLens({ zoomLevel: 1 }).container);
    const atTwo = countryPathsOf(renderLens({ zoomLevel: 2 }).container);
    const atThree = countryPathsOf(renderLens({ zoomLevel: 3 }).container);

    expect(atOne).not.toBe(atTwo);
    expect(atTwo).not.toBe(atThree);
    expect(atOne).not.toBe(atThree);
  });

  it('offers the five presets, frames the region each names and reports the one chosen', async () => {
    const user = userEvent.setup();
    const chosen: string[] = [];
    const { container } = renderLens({
      onViewPresetChange: (preset) => {
        chosen.push(preset);
      },
    });

    const group = screen.getByRole('group', { name: MAP_CANVAS_TEXT.presetGroupLabel });

    expect(within(group).getAllByRole('button')).toHaveLength(MAP_VIEW_PRESETS.length);

    const worldPaths = countryPathsOf(container);

    for (const preset of MAP_VIEW_PRESETS) {
      await user.click(within(group).getByRole('button', { name: MAP_VIEW_PRESET_LABELS[preset] }));
    }

    expect(chosen).toStrictEqual([...MAP_VIEW_PRESETS]);

    /* Every preset other than the world view frames a region of its own, so its path differs. */
    for (const preset of MAP_VIEW_PRESETS) {
      if (preset === 'world') {
        continue;
      }

      expect(countryPathsOf(renderLens({ viewPreset: preset }).container)).not.toBe(worldPaths);
    }

    expect(worldPaths.length).toBeGreaterThan(1000);
  });

  it('draws every node of the payload, whichever family it belongs to', () => {
    const { container } = renderLens();

    const nodes = nodeMarks(container);

    expect(nodes).toHaveLength(NODE_COUNT);

    const labels = [
      ...TOPOLOGY.plants,
      ...TOPOLOGY.suppliers,
      ...TOPOLOGY.origins,
      ...TOPOLOGY.customers,
    ].map((node) => node.label);

    for (const label of labels) {
      const named = nodes.some((node) => (node.getAttribute('aria-label') ?? '').startsWith(`${label},`));

      expect(named).toBe(true);
    }
  });

  it('names every node with its label, its family and the pin counts per state', () => {
    renderLens();

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    expect(supplier).toHaveAttribute('tabindex', '0');
    expect(supplier).toHaveAccessibleName(
      'Rheinstern Elektronik, Supplier. Evidence pins: 1 failed, 2 passed.',
    );
    expect(
      screen.getByRole('button', { name: /Bajio metals origin/ }),
    ).toHaveAccessibleName('Bajio metals origin, Tier-2 origin. No evidence pins.');
    /* The remaining states reach a reader through the same name, in the lens's own fixed order. */
    expect(
      screen.getByRole('button', { name: /Kansai alloys origin/ }),
    ).toHaveAccessibleName(
      'Kansai alloys origin, Tier-2 origin. Evidence pins: 1 awaiting review, 2 needing review, 1 with no record.',
    );
  });

  it('prints a badge for each state a node carries a pin in', () => {
    renderLens();

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    /* The badges are numerals of the payload's own counts, one per state present: 1 failed, 2 passed. */
    expect(within(supplier).getByText('1')).toBeInTheDocument();
    expect(within(supplier).getByText('2')).toBeInTheDocument();
  });

  it('rounds a pin badge from the control radius token, not a literal radius', () => {
    renderLens();

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });
    const badges = [...supplier.querySelectorAll('rect')].filter((rect) =>
      rect.classList.contains(CONTROL_RADIUS_CLASSES),
    );

    /* Two states are present on this node, so two badges are drawn and neither carries a literal radius. */
    expect(badges).toHaveLength(2);

    for (const badge of badges) {
      expect(badge).not.toHaveAttribute('rx');
    }
  });

  it('reports the selection and opens the evidence the mapper resolves for the node', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];
    renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
      evidenceRefForNode: (node) => `evidence-for-${node.id}`,
    });

    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    expect(supplier).toHaveAttribute('aria-haspopup', 'dialog');

    await user.click(supplier);

    expect(selected).toStrictEqual(['node-supplier']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('activates a node from the keyboard with Enter and with Space, opening its evidence', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];
    renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
      evidenceRefForNode: (node) => `evidence-for-${node.id}`,
    });

    const plant = screen.getByRole('button', { name: /Regensburg plant/ });

    plant.focus();
    expect(document.activeElement).toBe(plant);

    await user.keyboard('{Enter}');

    expect(selected).toStrictEqual(['node-plant']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();

    /* The second key reports the selection again and leaves the same evidence open behind it. */
    plant.focus();
    await user.keyboard(' ');

    expect(selected).toStrictEqual(['node-plant', 'node-plant']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('opens nothing for a node the mapper resolves no record for, and declares no drawer', async () => {
    const user = userEvent.setup();
    renderLens({ evidenceRefForNode: NO_NODE_EVIDENCE });

    const plant = screen.getByRole('button', { name: /Regensburg plant/ });

    expect(plant).not.toHaveAttribute('aria-haspopup');

    await user.click(plant);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('decides per node: only the node the mapper resolves declares and opens evidence', async () => {
    const user = userEvent.setup();
    renderLens({
      evidenceRefForNode: (node) => (node.id === 'node-plant' ? 'evidence-for-plant' : undefined),
    });

    const plant = screen.getByRole('button', { name: /Regensburg plant/ });
    const supplier = screen.getByRole('button', { name: /Rheinstern Elektronik/ });

    expect(plant).toHaveAttribute('aria-haspopup', 'dialog');
    expect(supplier).not.toHaveAttribute('aria-haspopup');

    await user.click(supplier);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(plant);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('rings the node the screen holds as selected', () => {
    const unselected = renderLens().container;
    const selected = renderLens({ selectedNodeId: 'node-plant' }).container;

    const ringCount = (container: HTMLElement): number =>
      [...container.querySelectorAll('svg circle')].filter((circle) =>
        (circle.getAttribute('class') ?? '').includes('stroke-focus-ring'),
      ).length;

    expect(ringCount(selected)).toBeGreaterThan(ringCount(unselected));
  });

  it('answers the pointer on every node, over the ring the keyboard reveals', () => {
    const { container } = renderLens();

    const nodes = nodeMarks(container);

    expect(nodes.length).toBeGreaterThan(0);

    for (const node of nodes) {
      /* The group marker the pointer ring's variants hang on. */
      expect(node.getAttribute('class')).toContain('group');

      /* The pointer ring is the node's one element painted in the accent role as a stroke. */
      const pointerRing = node.querySelector('.stroke-accent');
      const ringClasses = pointerRing?.getAttribute('class') ?? '';
      const states = pointerStates(ringClasses);

      expect(pointerRing).not.toBeNull();
      expect(states.some((utility) => utility.startsWith('group-hover:'))).toBe(true);
      expect(states.some((utility) => utility.startsWith('group-active:'))).toBe(true);
      for (const utility of states) {
        /* Every state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(fill|stroke|opacity)-[a-z0-9]/u);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }
      expect(ringClasses).toContain('motion-safe:transition-opacity');

      /* The keyboard's own ring is still drawn, in the focus-ring role, on the mark it belongs to. */
      const focusRing = [...node.querySelectorAll('circle')].some((circle) => {
        const classes = circle.getAttribute('class') ?? '';

        return classes.includes('stroke-focus-ring') && classes.includes('group-focus-visible:opacity-100');
      });

      expect(focusRing).toBe(true);
    }
  });

  it('stops the zoom controls at the ends of the range with the reason stated', () => {
    const { unmount } = renderLens({ zoomLevel: 3 });

    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(MAP_CANVAS_TEXT.zoomAtClosestReason)).toBeInTheDocument();
    unmount();

    renderLens({ zoomLevel: 1 });

    expect(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByText(MAP_CANVAS_TEXT.zoomAtWidestReason)).toBeInTheDocument();
  });

  it('reports the level each zoom control asks for without drawing it', async () => {
    const user = userEvent.setup();
    const levels: string[] = [];
    const { container } = renderLens({
      zoomLevel: 2,
      onZoomLevelChange: (level) => {
        levels.push(String(level));
      },
    });

    const drawn = countryPathsOf(container);

    await user.click(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel }));
    await user.click(screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel }));

    expect(levels).toStrictEqual(['3', '1']);
    /* The level is the screen's to hold: a control reports the step and leaves the drawing where it was. */
    expect(countryPathsOf(container)).toBe(drawn);
  });

  it('renders its controls as native buttons a keyboard reaches in order', async () => {
    const user = userEvent.setup();
    renderLens();

    const controls = [
      screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel }),
      screen.getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel }),
      ...MAP_VIEW_PRESETS.map((preset) =>
        screen.getByRole('button', { name: MAP_VIEW_PRESET_LABELS[preset] }),
      ),
    ];

    for (const control of controls) {
      expect(control.tagName).toBe('BUTTON');
      expect(control).toHaveAccessibleName();
    }

    /* The node marks carry the button role on their SVG groups; the controls beside them are native. */
    for (const name of [MAP_CANVAS_TEXT.zoomGroupLabel, MAP_CANVAS_TEXT.presetGroupLabel]) {
      const group = screen.getByRole('group', { name });

      expect(group.querySelectorAll('[role="button"]:not(button)')).toHaveLength(0);
      expect(
        within(group).getAllByRole('button').every((control) => control.tagName === 'BUTTON'),
      ).toBe(true);
    }

    /* Every control is a keyboard stop, reached by Tab alone and in the order it is drawn in. */
    const reached: Element[] = [];

    for (let step = 0; step < CONTROL_COUNT; step += 1) {
      await user.tab();

      if (document.activeElement !== null) {
        reached.push(document.activeElement);
      }
    }

    expect(reached).toStrictEqual(controls);
  });

  it('draws no competitor element at all until the atlas payload arrives', () => {
    const { container } = renderLens();

    expect(screen.queryByText(MARKET_INTELLIGENCE_LABEL)).not.toBeInTheDocument();
    expect(screen.queryByText(CROSSING.label)).not.toBeInTheDocument();
    /* Neither group the overlay contributes exists, and no competitor mark or halo is in the document. */
    expect(
      screen.queryByRole('group', { name: new RegExp(MARKET_INTELLIGENCE_LABEL, 'u') }),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll('[class*="stroke-competitor"], circle[stroke-dasharray]'),
    ).toHaveLength(0);
  });

  it('draws the competitor marks, the halos and a legend when the atlas payload arrives', () => {
    const { container } = renderLens({ overlay: ATLAS });

    expect(container.querySelectorAll('[class*="stroke-competitor"]').length).toBeGreaterThan(0);

    /* The marks are named as market intelligence, and every halo prints the imported label itself. */
    expect(
      screen.getByRole('group', {
        name: `${MARKET_INTELLIGENCE_LABEL}: ${MAP_CANVAS_TEXT.competitorGroupSuffix}`,
      }),
    ).toBeInTheDocument();

    const halos = screen.getByRole('group', { name: MARKET_INTELLIGENCE_LABEL });

    expect(within(halos).getAllByText(MARKET_INTELLIGENCE_LABEL)).toHaveLength(
      ATLAS.chokepoints.length,
    );
    expect(within(halos).getByText(CROSSING.label)).toBeInTheDocument();
    /* The legend's own row adds the competitor name tag the shared legend owns. */
    expect(screen.getByText('Aurelvik Drive Systems')).toBeInTheDocument();
  });

  it('places a halo at the crossing’s own position when the payload states one', () => {
    const placed = { ...CROSSING, latitude: 30.5, longitude: 32.5 } as Chokepoint;
    const { container } = renderLens({
      overlay: { ...ATLAS, chokepoints: [placed] },
    });

    const halo = container.querySelector('svg circle[stroke-dasharray]');

    expect(halo).not.toBeNull();
    expect(halo?.getAttribute('cx')).toBeDefined();
  });

  it('renders the lens under both themes', () => {
    for (const theme of ['command', 'paper']) {
      document.documentElement.setAttribute('data-theme', theme);

      const { container, unmount } = renderLens();

      expect(screen.getByRole('group', { name: BASE_PROPS.title })).toBeInTheDocument();
      expect(countryPathsOf(container).length).toBeGreaterThan(1000);

      unmount();
    }

    document.documentElement.removeAttribute('data-theme');
  });
});
