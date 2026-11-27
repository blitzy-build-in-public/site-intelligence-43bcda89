/**
 * Component suite for `map-lens.tsx`, the framed map lens of the FileMap canvas (SCR-12, stage S2).
 *
 * WHAT IS UNDER TEST. `MapLens` composes the drawing in `src/components/map-canvas.tsx` inside
 * `src/components/chart-frame.tsx`, holds the map's view state, forwards the shared selection and hands
 * the frame the rows its table view prints. Every case below asserts one clause of that composition
 * rather than its markup: the three zoom levels the drawing declares are reachable and the lens's own
 * state moves between them (rule P-8 at both ends of the range); the five view presets are keyboard
 * controls whose pressed state follows the lens; every node's accessible name carries its label, its
 * family and its evidence-pin summary per state, so no marker asks a reader to tell a hue apart (rule
 * B-3); activation reports the node to the screen that owns the selection and the ring the drawing
 * paints follows that prop only, never a selection the lens kept for itself; the "View as table" view
 * prints one row per node with the payload's own labels, neighbours and counts, and switching back
 * restores the drawing; nothing asks any origin for anything while all of that happens (rule B-1, the
 * component-level half of T-20); the atlas overlay's chokepoint halos appear only when the payload is
 * supplied and always under the fixed market-intelligence label imported from `src/types` (rules P-1,
 * P-5); the frame states its simulation label inside the figure it owns, so the pin counts are
 * labelled without a page-level badge; and the evidence drawer opens for a node whose record the
 * screen resolved and for no other. Every one of those holds under both themes.
 *
 * THE FIXTURES ARE BUILT HERE AND BORROW NO RECORD. A topology of two nodes per family, one lane chain
 * and pin counts that between them cover all six `PinState` members, plus one market-intelligence atlas
 * of a single competitor network whose lane names one crossing. No seed module, no `src/services/mock`
 * and nothing from `tests/fixtures` is imported (rule P-2; rule P-6 keeps the seed file's expected
 * results as fixtures for the domain, not for a component). Every identifier is neutral and no label is
 * shaped like a domain record, so the `no-typed-figures` source check reads this folder without a
 * collision, and the only literals the cases state are structural: the drawing's wording for the six
 * pin states, which this suite restates so a reworded summary fails here.
 *
 * THE ONE SERVICE MEMBER IS REPLACED, NOT REACHED. The drawing mounts `EvidenceDrawer` for a node whose
 * evidence reference the caller resolved, and the drawer reads `getEvidence` through
 * `useService()`. The provider module is therefore mocked with a stub typed against
 * `SiteIntelligenceService`, so the drawer opens with a record instead of a request and a renamed
 * member fails to compile (rule P-2). Nothing here hashes, reads the clock or touches the network; the
 * suite runs in the jsdom environment `vite.config.ts` sets by default.
 *
 * Rules this suite is written to hold to:
 * - B-1: the request spies in the network case prove the lens fetches nothing, and the attribute scan
 *   proves no element it renders addresses a host or embeds a remote image.
 * - B-3: every interaction is driven from the keyboard through `@testing-library/user-event`, the table
 *   view is proven rather than assumed, and no assertion compares a colour value — the selection ring
 *   is found by the role utilities the drawing composes.
 * - P-1: every simulation label this suite names is read from `SIM_LABELS` — the frame's own label and
 *   the market-intelligence label — so no label string is spelled here at all.
 * - P-2: no seed record, no adapter and no HTTP client is imported; the provider is mocked.
 * - P-5: the market-intelligence label is read from `SIM_LABELS`, and the case that supplies an atlas
 *   proves no competitor value reaches the table view.
 * - P-6: every expectation is derived from the inline payload — a label, a count or a lane the fixture
 *   states — and no figure is typed into a case.
 * - P-8: the ends of the zoom range are asserted through the stated reason the disabled control carries.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  Atlas,
  Chokepoint,
  Evidence,
  PinCounts,
  PinState,
  Topology,
  TopologyNode,
  TopologyNodeKind,
} from '../../types';
import { SIM_LABELS } from '../../types';
import type { SiteIntelligenceService } from '../../services/site-intelligence-service';
import {
  MAP_CANVAS_TEXT,
  MAP_VIEW_PRESETS,
  MAP_VIEW_PRESET_LABELS,
  MAP_ZOOM_LEVELS,
} from '../../components/map-canvas';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import { MAP_LENS_TEXT, MapLens } from './map-lens';
import type { MapLensProps } from './map-lens';

/**
 * The service the evidence drawer reads through, replaced because this suite is about the framing lens.
 *
 * The stub carries the one member the drawer calls, typed against the port so a renamed method fails
 * here instead of opening an empty drawer at run time, and it resolves a record rather than a request:
 * the drawer therefore opens and settles inside this suite, and no origin is asked for anything
 * (rule B-1). The record is a placeholder — a value, a provenance and the label the drawer prints, read
 * from `SIM_LABELS` because the factory runs before this module's own declarations exist — and no field
 * of it is asserted, because what a drawer does with an answer belongs to its own suite.
 */
vi.mock('../../services/service-provider', async () => {
  const { SIM_LABELS: labels } = await import('../../types');

  const evidence: Evidence = {
    value: 'A reading the record states',
    provenance: 'computed',
    label: labels[1],
    formula: 'A rule the record states',
    inputs: [],
    upstream: [],
    downstream: [],
    confidence: { level: 'medium', reason: 'A reason the record states' },
    missingInputs: [],
    documents: [],
  };

  const service: Pick<SiteIntelligenceService, 'getEvidence'> = {
    getEvidence: () =>
      Promise.resolve({
        data: evidence,
        meta: { freshness: [], simulated: true, traceId: 'trace-one' },
      }),
  };

  return { useService: () => service };
});

/* ---------------------------------------------------------------------------------------------
 * The fixtures — the payload, its nodes and the atlas overlay
 * ------------------------------------------------------------------------------------------- */

/** The six pin states every count record declares, in the order the canvas announces them. */
const PIN_STATE_ORDER: readonly PinState[] = [
  'fail',
  'stale',
  'pending',
  'review',
  'pass',
  'empty',
];

/**
 * The words the drawing announces each pin state with.
 *
 * Restated here rather than imported, because the drawing keeps them private and this suite asserts the
 * sentence a reader actually hears; a reworded summary must fail here rather than pass silently.
 */
const PIN_STATE_WORDS = {
  fail: 'failed',
  stale: 'stale',
  pending: 'awaiting review',
  review: 'needing review',
  pass: 'passed',
  empty: 'with no record',
} as const satisfies Record<PinState, string>;

/** The family name each node kind is announced and printed with, as the drawing states it. */
const FAMILY_OF_KIND = {
  plant: 'Plant',
  supplier: 'Supplier',
  material: 'Material',
  origin: 'Tier-2 origin',
  customer: 'Customer',
} as const satisfies Record<TopologyNodeKind, string>;

/** One empty count record: every one of the six states, zero included, as `PinCounts` requires. */
const NO_PINS: PinCounts = { empty: 0, pending: 0, pass: 0, fail: 0, stale: 0, review: 0 };

/**
 * One node's counts: a complete record with the given states set and the rest left at zero.
 *
 * @param stated The counts this node carries.
 * @returns The complete six-state record.
 */
function pinCounts(stated: Partial<PinCounts>): PinCounts {
  return { ...NO_PINS, ...stated };
}

/**
 * A nine-node network: two nodes of every family, one material at the site it is bought from, one lane
 * chain from a tier-2 origin through a supplier, that material and a plant to a customer, and pin counts
 * that between them cover each of the six `PinState` members.
 *
 * The coordinates sit across Europe, the Gulf of Mexico and Japan so every node lands inside the world
 * view at every zoom level. One plant carries counts of zero in every state and one supplier is absent
 * from `pinsByNode` altogether, so both readings of "no evidence pins" are exercised; the material is
 * absent from it too, because no evidence pin is attached to a material record. The lanes are a single
 * chain whose direction is stated upstream to downstream, which is what lets the table view's neighbour
 * column be asserted from the fixture rather than from the drawing.
 */
const TOPOLOGY: Topology = {
  plants: [
    {
      id: 'node-plant',
      kind: 'plant',
      label: 'Northgate plant',
      latitude: 49.02,
      longitude: 12.1,
      productIds: ['product-one'],
    },
    {
      id: 'node-plant-second',
      kind: 'plant',
      label: 'Vltava plant',
      latitude: 49.19,
      longitude: 16.61,
      productIds: ['product-two'],
    },
  ],
  suppliers: [
    {
      id: 'node-supplier',
      kind: 'supplier',
      label: 'Halvard Components',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
    {
      id: 'node-supplier-second',
      kind: 'supplier',
      label: 'Sundvik Parts',
      latitude: 57.7,
      longitude: 11.97,
      productIds: ['product-two'],
    },
  ],
  materials: [
    {
      id: 'node-material',
      kind: 'material',
      label: 'Cold-rolled coil',
      latitude: 48.14,
      longitude: 11.58,
      productIds: ['product-one'],
    },
  ],
  origins: [
    {
      id: 'node-origin',
      kind: 'origin',
      label: 'Ordival Metals',
      latitude: 21.5,
      longitude: -101.5,
      productIds: [],
    },
    {
      id: 'node-origin-second',
      kind: 'origin',
      label: 'Kazeyama Alloys',
      latitude: 34.7,
      longitude: 135.5,
      productIds: ['product-two'],
    },
  ],
  customers: [
    {
      id: 'node-customer',
      kind: 'customer',
      label: 'Harbourgate Fleetworks',
      latitude: 53.55,
      longitude: 9.99,
      productIds: [],
    },
    {
      id: 'node-customer-second',
      kind: 'customer',
      label: 'Alpenrand Haulage',
      latitude: 45.46,
      longitude: 9.19,
      productIds: [],
    },
  ],
  lanes: [
    { fromId: 'node-origin', toId: 'node-supplier' },
    { fromId: 'node-supplier', toId: 'node-material' },
    { fromId: 'node-material', toId: 'node-plant' },
    { fromId: 'node-plant', toId: 'node-customer' },
  ],
  pinsByNode: {
    'node-supplier': pinCounts({ fail: 1, pass: 2 }),
    'node-plant': pinCounts({ stale: 1 }),
    'node-origin-second': pinCounts({ pending: 1, review: 2, empty: 1 }),
    'node-plant-second': NO_PINS,
  },
};

/**
 * Every node of the payload in the order both representations state it: the plants the network serves,
 * then the suppliers that feed them, the materials those suppliers sell, the tier-2 origins behind those
 * suppliers, and the customers.
 */
const NODES: readonly TopologyNode[] = [
  ...TOPOLOGY.plants,
  ...TOPOLOGY.suppliers,
  ...TOPOLOGY.materials,
  ...TOPOLOGY.origins,
  ...TOPOLOGY.customers,
];

/** One shared crossing, stated with the market pack's own members and nothing else. */
const CROSSING: Chokepoint = {
  id: 'crossing-one',
  label: 'Southern sea crossing',
  overlap: 67,
  competitorBufferDays: { 'competitor-one': 12 },
  contentionNote: 'Three networks use the crossing and the buffer each holds differs.',
  provenance: 'market_intelligence',
};

/**
 * A market-intelligence payload: one competitor network of two sites whose lane names the crossing.
 *
 * The recorded series and axes are empty because this suite asserts nothing about the radar: the atlas
 * shape allows empty lists and the fields the drawing reads for the overlay are the networks and the
 * crossings.
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

/** The market-intelligence label, read from its single owner so this suite never retypes it (P-1). */
const MARKET_INTELLIGENCE_LABEL = SIM_LABELS[5];

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/* ---------------------------------------------------------------------------------------------
 * Rendering and queries
 * ------------------------------------------------------------------------------------------- */

/** The props every case starts from, so a case states only what it changes. */
const BASE_PROPS: MapLensProps = {
  topology: TOPOLOGY,
  selectedNodeId: null,
  onSelectNode: () => undefined,
};

/**
 * Renders the lens inside the query cache the evidence drawer reads through.
 *
 * @param overrides The props this case changes.
 * @returns The render result, so a case can unmount before rendering again.
 */
function renderLens(overrides: Partial<MapLensProps> = {}): RenderResult {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MapLens {...BASE_PROPS} {...overrides} />
    </QueryClientProvider>,
  );
}

/** The group the drawing puts its zoom steps in. */
function zoomGroup(): HTMLElement {
  return screen.getByRole('group', { name: MAP_CANVAS_TEXT.zoomGroupLabel });
}

/** The group the drawing puts its five view presets in. */
function presetGroup(): HTMLElement {
  return screen.getByRole('group', { name: MAP_CANVAS_TEXT.presetGroupLabel });
}

/**
 * The caption that states which of the drawn zoom levels is on screen.
 *
 * Read by the wording the drawing owns, so a reworded caption fails here, and by a pattern rather than
 * a string because the numerals in it are the lens's state rather than a fixture value.
 */
function zoomCaption(): string {
  const pattern = new RegExp(`^${MAP_CANVAS_TEXT.zoomCaption} \\d+ / \\d+$`, 'u');

  return within(zoomGroup()).getByText(pattern).textContent?.trim() ?? '';
}

/** The state a case expects the caption to state. */
function captionAt(level: number): string {
  return `${MAP_CANVAS_TEXT.zoomCaption} ${level} / ${MAP_ZOOM_LEVELS.length}`;
}

/**
 * One node's control on the drawing, found by the label its accessible name opens with.
 *
 * @param label The node's own label, as the payload states it.
 * @returns The focusable node group.
 */
function nodeControl(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${label},`, 'u') });
}

/**
 * The ring the drawing paints on the node the screen holds as selected.
 *
 * Found by the role utilities the drawing composes rather than by any colour value: the selected ring
 * is the one circle in the focus-ring role that is neither the keyboard ring (hidden until the node is
 * focused) nor the pointer ring (painted in the accent role). Rule B-3 is honoured by asserting the
 * presence of a state, never a hex value or a contrast ratio.
 *
 * @param node The node group to inspect.
 * @returns The selection ring, or `undefined` when this node is not the selected one.
 */
function selectionRingIn(node: Element): Element | undefined {
  return [...node.querySelectorAll('circle')].find((circle) => {
    const utilities = circle.classList;

    return (
      utilities.contains('stroke-focus-ring') &&
      !utilities.contains('opacity-0') &&
      !utilities.contains('stroke-accent')
    );
  });
}

/**
 * The pin-state summary a node's accessible name carries, as the drawing announces it.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none for it.
 * @returns The summary sentence.
 */
function announcementOf(counts: PinCounts | undefined): string {
  const present = counts === undefined ? [] : PIN_STATE_ORDER.filter((state) => counts[state] > 0);

  if (counts === undefined || present.length === 0) {
    return MAP_CANVAS_TEXT.noPins;
  }

  const stated = present.map((state) => `${counts[state]} ${PIN_STATE_WORDS[state]}`).join(', ');

  return `${MAP_CANVAS_TEXT.pinsPrefix}: ${stated}`;
}

/**
 * One node's full accessible name: what the place is called, which family it belongs to and what
 * evidence it carries, in the sentence the drawing builds.
 *
 * @param node The node to name.
 * @returns The accessible name.
 */
function nodeNameOf(node: TopologyNode): string {
  return `${node.label}, ${FAMILY_OF_KIND[node.kind]}. ${announcementOf(TOPOLOGY.pinsByNode[node.id])}.`;
}

/**
 * The pin cell the table view prints for one node's counts.
 *
 * The lens states each state a node carries a pin in, in the fixed order the whole canvas prints them,
 * with the payload's own count: no total and no zero. A node the payload holds no counts for, or one
 * whose counts are all zero, takes the no-pins sentence the drawing owns.
 *
 * @param counts The node's counts, or `undefined`.
 * @returns The cell text.
 */
function pinsCellOf(counts: PinCounts | undefined): string {
  const present = counts === undefined ? [] : PIN_STATE_ORDER.filter((state) => counts[state] > 0);

  if (counts === undefined || present.length === 0) {
    return MAP_CANVAS_TEXT.noPins;
  }

  return present.map((state) => `${counts[state]} ${state}`).join(', ');
}

/**
 * The neighbour cell the table view prints for one node: the labels of the nodes the payload's lanes
 * join it to, read in both directions and in the order the lanes are stated.
 *
 * @param nodeId The node whose neighbours to name.
 * @returns The cell text.
 */
function connectionsCellOf(nodeId: string): string {
  const labels = new Map(NODES.map((node) => [node.id, node.label]));
  const neighbours: string[] = [];

  for (const lane of TOPOLOGY.lanes) {
    const joined = lane.fromId === nodeId ? lane.toId : lane.toId === nodeId ? lane.fromId : undefined;

    if (joined === undefined) {
      continue;
    }

    const label = labels.get(joined);

    if (label !== undefined && !neighbours.includes(label)) {
      neighbours.push(label);
    }
  }

  return neighbours.length === 0 ? MAP_LENS_TEXT.noConnections : neighbours.join(', ');
}

/** The accessible name of the control that switches the frame's two representations. */
function toggleName(label: string): string {
  return `${label}: ${MAP_LENS_TEXT.title}`;
}

/** Every control in the frame that switches representations, in either direction. */
const TOGGLE_PATTERN = new RegExp(
  `^(${VIEW_AS_TABLE_LABELS.showTable}|${VIEW_AS_TABLE_LABELS.showChart}): `,
  'u',
);

/**
 * The drawing's own surface: the group named for the frame's title, which the table view unmounts.
 *
 * @returns The query for that group.
 */
function mapSurfaceQuery(): HTMLElement | null {
  return screen.queryByRole('group', { name: MAP_LENS_TEXT.title });
}

/**
 * The frame the lens composes: the `<figure>` whose caption states the title, the simulation label
 * and the control that switches the two representations.
 *
 * @param container The rendered container.
 * @returns The frame element.
 * @throws When the lens was composed without a frame, which its contract forbids.
 */
function frameOf(container: HTMLElement): HTMLElement {
  const frame = container.querySelector('figure');

  if (frame === null) {
    throw new Error('The lens rendered without the frame its table view and label are supplied by.');
  }

  return frame;
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('MapLens', () => {
  it('steps through the three zoom levels the drawing declares and states which one is shown', async () => {
    const user = userEvent.setup();
    renderLens();

    /* One zoom group, holding one control either way: the level space is the three the drawing
       declares and no third control jumps straight to a level. */
    expect(screen.getAllByRole('group', { name: MAP_CANVAS_TEXT.zoomGroupLabel })).toHaveLength(1);

    const steps = within(zoomGroup()).getAllByRole('button');

    expect(steps).toHaveLength(2);
    for (const step of steps) {
      expect(step.tagName).toBe('BUTTON');
      expect(step).not.toHaveAttribute('tabindex', '-1');
    }

    expect(zoomCaption()).toBe(captionAt(1));

    /* At the widest level the wider step cannot act, and says why rather than failing silently
       (rule P-8). */
    const zoomOut = (): HTMLElement =>
      within(zoomGroup()).getByRole('button', { name: MAP_CANVAS_TEXT.zoomOutLabel });
    const zoomIn = (): HTMLElement =>
      within(zoomGroup()).getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel });

    expect(zoomOut()).toHaveAttribute('aria-disabled', 'true');
    expect(within(zoomGroup()).getByText(MAP_CANVAS_TEXT.zoomAtWidestReason)).toBeInTheDocument();

    /* Each step is driven from the keyboard, and the caption is the lens's own state rather than the
       control's: the drawing reports the level and the lens holds it. */
    zoomIn().focus();
    expect(document.activeElement).toBe(zoomIn());

    await user.keyboard('{Enter}');
    expect(zoomCaption()).toBe(captionAt(2));

    zoomIn().focus();
    await user.keyboard(' ');
    expect(zoomCaption()).toBe(captionAt(MAP_ZOOM_LEVELS.length));

    /* The level space ends where the drawing says it does, with the reason stated at that end too. */
    expect(zoomIn()).toHaveAttribute('aria-disabled', 'true');
    expect(within(zoomGroup()).getByText(MAP_CANVAS_TEXT.zoomAtClosestReason)).toBeInTheDocument();

    zoomOut().focus();
    await user.keyboard('{Enter}');
    expect(zoomCaption()).toBe(captionAt(2));
  });

  it('offers the five view presets, and the pressed one follows the preset the reader chose', async () => {
    const user = userEvent.setup();
    renderLens();

    const presets = within(presetGroup()).getAllByRole('button');

    expect(presets).toHaveLength(MAP_VIEW_PRESETS.length);

    const controlFor = (preset: (typeof MAP_VIEW_PRESETS)[number]): HTMLElement =>
      within(presetGroup()).getByRole('button', { name: MAP_VIEW_PRESET_LABELS[preset] });

    /* Exactly one preset is pressed at any time, and the lens opens on the world view. */
    const pressed = (): readonly string[] =>
      MAP_VIEW_PRESETS.filter(
        (preset) => controlFor(preset).getAttribute('aria-pressed') === 'true',
      );

    expect(pressed()).toStrictEqual(['world']);

    /* Each preset is reached and activated from the keyboard, and the pressed state the drawing
       carries is the lens's state after that activation. */
    for (const preset of MAP_VIEW_PRESETS) {
      const control = controlFor(preset);

      expect(control.tagName).toBe('BUTTON');
      control.focus();
      expect(document.activeElement).toBe(control);

      await user.keyboard('{Enter}');

      expect(pressed()).toStrictEqual([preset]);
    }
  });

  it('names every node with its label, its family and its pin summary, whichever state it carries', () => {
    renderLens();

    /* The fixture covers all six states, so a lens that announced one and dropped the rest fails. */
    for (const state of PIN_STATE_ORDER) {
      const covered = NODES.some((node) => (TOPOLOGY.pinsByNode[node.id]?.[state] ?? 0) > 0);

      expect(covered).toBe(true);
    }

    for (const node of NODES) {
      const control = nodeControl(node.label);

      expect(control).toHaveAccessibleName(nodeNameOf(node));
      expect(control).toHaveAttribute('tabindex', '0');
    }
  });

  it('badges each state a node carries a pin in, so no count rests on a hue alone', () => {
    renderLens();

    for (const node of NODES) {
      const counts = TOPOLOGY.pinsByNode[node.id];
      const badges = [...nodeControl(node.label).querySelectorAll('g[aria-hidden="true"] text')].map(
        (numeral) => numeral.textContent,
      );
      /* One numbered badge per state present, printing the payload's own count: the meaning is the
         numeral read out of the accessible name as well as the badge painted beside the mark
         (rule B-3). */
      expect(badges).toStrictEqual(
        counts === undefined
          ? []
          : PIN_STATE_ORDER.filter((state) => counts[state] > 0).map((state) =>
              String(counts[state]),
            ),
      );
    }
  });

  it('reports each activated node and rings only the node the screen holds as selected', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];

    const unselected = renderLens();

    expect(selectionRingIn(nodeControl('Northgate plant'))).toBeUndefined();
    expect(selectionRingIn(nodeControl('Halvard Components'))).toBeUndefined();

    unselected.unmount();

    renderLens({
      selectedNodeId: 'node-supplier',
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
    });

    const supplier = nodeControl('Halvard Components');
    const plant = nodeControl('Northgate plant');

    /* The screen's selection is the one the drawing rings before anything is activated. */
    expect(selectionRingIn(supplier)).toBeDefined();
    expect(selectionRingIn(plant)).toBeUndefined();

    /* Activating another node reports it once and leaves the ring where the prop put it, so the lens
       keeps no selection of its own to disagree with the graph lens beside it. */
    plant.focus();
    await user.keyboard('{Enter}');

    expect(selected).toStrictEqual(['node-plant']);
    expect(selectionRingIn(supplier)).toBeDefined();
    expect(selectionRingIn(plant)).toBeUndefined();

    /* A second node reports again — nothing is swallowed as already chosen. */
    supplier.focus();
    await user.keyboard(' ');

    expect(selected).toStrictEqual(['node-plant', 'node-supplier']);
  });

  it('turns the drawing into a table of the same nodes and back, with one control between the two', async () => {
    const user = userEvent.setup();
    renderLens();

    /* One control switches the representations, and its name states the action it performs. */
    expect(screen.getAllByRole('button', { name: TOGGLE_PATTERN })).toHaveLength(1);

    const toTable = screen.getByRole('button', { name: toggleName(VIEW_AS_TABLE_LABELS.showTable) });

    toTable.focus();
    expect(document.activeElement).toBe(toTable);

    await user.keyboard('{Enter}');

    const table = screen.getByRole('table', { name: MAP_LENS_TEXT.tableCaption });

    /* The drawing is unmounted rather than hidden, so no focus stop survives inside a surface that is
       no longer shown, and still only one control switches the two. */
    expect(mapSurfaceQuery()).toBeNull();
    expect(screen.getAllByRole('button', { name: TOGGLE_PATTERN })).toHaveLength(1);

    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((header) => header.textContent),
    ).toStrictEqual([
      MAP_LENS_TEXT.nodeColumn,
      MAP_LENS_TEXT.familyColumn,
      MAP_LENS_TEXT.connectionsColumn,
      MAP_CANVAS_TEXT.pinsPrefix,
    ]);

    const bodyRows = within(table).getAllByRole('row').slice(1);

    expect(bodyRows).toHaveLength(NODES.length);

    /* Cell by cell rather than by row count: the node's own label, its family, the neighbours the
       payload's lanes state and the payload's own counts per state. */
    NODES.forEach((node, position) => {
      const row = bodyRows[position];

      expect(row).toBeDefined();

      if (row === undefined) {
        return;
      }

      expect(
        within(row)
          .getAllByRole('cell')
          .map((cell) => cell.textContent),
      ).toStrictEqual([
        node.label,
        FAMILY_OF_KIND[node.kind],
        connectionsCellOf(node.id),
        pinsCellOf(TOPOLOGY.pinsByNode[node.id]),
      ]);
    });

    const toChart = screen.getByRole('button', { name: toggleName(VIEW_AS_TABLE_LABELS.showChart) });

    toChart.focus();
    await user.keyboard('{Enter}');

    expect(
      screen.queryByRole('table', { name: MAP_LENS_TEXT.tableCaption }),
    ).not.toBeInTheDocument();
    expect(mapSurfaceQuery()).not.toBeNull();
    expect(screen.getAllByRole('button', { name: TOGGLE_PATTERN })).toHaveLength(1);
  });

  it('asks no origin for anything while it draws, zooms, re-frames, reports a node and turns into a table', async () => {
    const user = userEvent.setup();
    const fetched = vi.spyOn(globalThis, 'fetch');
    const opened = vi.spyOn(XMLHttpRequest.prototype, 'open');
    const sent = vi.spyOn(XMLHttpRequest.prototype, 'send');

    renderLens({ atlas: ATLAS, onSelectNode: () => undefined });

    within(zoomGroup()).getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel }).focus();
    await user.keyboard('{Enter}');

    within(presetGroup()).getByRole('button', { name: MAP_VIEW_PRESET_LABELS.europe }).focus();
    await user.keyboard('{Enter}');

    nodeControl('Northgate plant').focus();
    await user.keyboard('{Enter}');

    screen.getByRole('button', { name: toggleName(VIEW_AS_TABLE_LABELS.showTable) }).focus();
    await user.keyboard('{Enter}');
    screen.getByRole('button', { name: toggleName(VIEW_AS_TABLE_LABELS.showChart) }).focus();
    await user.keyboard('{Enter}');

    /* The bundled boundary module is compiled into the page (rule B-1): no request of either kind is
       made at any point in that sequence. */
    expect(fetched).not.toHaveBeenCalled();
    expect(opened).not.toHaveBeenCalled();
    expect(sent).not.toHaveBeenCalled();

    /* And nothing the lens renders addresses a host or embeds a resource that would. */
    const addresses = [
      ...document.body.querySelectorAll('[href],[xlink\\:href],[src],[srcset],[action]'),
    ]
      .map(
        (element) =>
          element.getAttribute('href') ??
          element.getAttribute('xlink:href') ??
          element.getAttribute('src') ??
          element.getAttribute('srcset') ??
          element.getAttribute('action') ??
          '',
      )
      .filter((address) => address.trim() !== '');

    expect(addresses).toStrictEqual([]);
    expect(document.body.querySelectorAll('img, image, iframe, object, embed')).toHaveLength(0);
  });

  it('draws the chokepoint halos under the market-intelligence label only when the atlas arrives', () => {
    const withoutAtlas = renderLens();

    /* The client's own network alone: no halo, no competitor mark, no label and no error of the
       lens's own. */
    expect(
      screen.queryByRole('group', { name: MARKET_INTELLIGENCE_LABEL }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(MARKET_INTELLIGENCE_LABEL)).not.toBeInTheDocument();
    expect(withoutAtlas.container.querySelectorAll('circle[stroke-dasharray]')).toHaveLength(0);

    withoutAtlas.unmount();

    const { container } = renderLens({ atlas: ATLAS });
    const halos = screen.getByRole('group', { name: MARKET_INTELLIGENCE_LABEL });

    /* Every crossing is haloed, and each halo prints the fixed label itself instead of leaving one
       page-level statement to speak for it (rules P-1, P-5). */
    expect(within(halos).getAllByText(MARKET_INTELLIGENCE_LABEL)).toHaveLength(
      ATLAS.chokepoints.length,
    );
    expect(within(halos).getByText(CROSSING.label)).toBeInTheDocument();
    expect(container.querySelectorAll('circle[stroke-dasharray]')).toHaveLength(
      ATLAS.chokepoints.length,
    );

    /* The competitor marks state the same provenance in their own group's name. */
    expect(
      screen.getByRole('group', {
        name: `${MARKET_INTELLIGENCE_LABEL}: ${MAP_CANVAS_TEXT.competitorGroupSuffix}`,
      }),
    ).toBeInTheDocument();
  });

  it('keeps the market-intelligence overlay out of the table view it frames', async () => {
    const user = userEvent.setup();
    renderLens({ atlas: ATLAS });

    screen.getByRole('button', { name: toggleName(VIEW_AS_TABLE_LABELS.showTable) }).focus();
    await user.keyboard('{Enter}');

    const table = screen.getByRole('table', { name: MAP_LENS_TEXT.tableCaption });

    /* The table states the client's own nodes and nothing else: a competitor row beside a first-party
       one would invite exactly the blended reading rule P-5 forbids. */
    expect(within(table).getAllByRole('row').slice(1)).toHaveLength(NODES.length);
    expect(within(table).queryByText(CROSSING.label)).not.toBeInTheDocument();

    for (const network of ATLAS.competitors) {
      expect(within(table).queryByText(network.label)).not.toBeInTheDocument();

      for (const site of network.sites) {
        expect(within(table).queryByText(site.label)).not.toBeInTheDocument();
      }
    }
  });

  it('labels the frame it owns, so the pin counts are labelled without a page-level badge', () => {
    const { container } = renderLens();
    const frame = frameOf(container);
    const caption = frame.querySelector('figcaption');

    expect(caption).not.toBeNull();

    if (caption === null) {
      return;
    }

    /* The label sits inside the frame that carries the computed figures (rule P-1). */
    expect(within(caption).getByText(MAP_LENS_TEXT.title)).toBeInTheDocument();
    expect(within(caption).getByText(SIM_LABELS[1])).toBeInTheDocument();
  });

  it('opens the record the screen resolved for a node, and nothing for a node it resolved none for', async () => {
    const user = userEvent.setup();
    const selected: string[] = [];

    renderLens({
      onSelectNode: (nodeId) => {
        selected.push(nodeId);
      },
      evidenceRefForNode: (node) => (node.kind === 'plant' ? `evidence-${node.id}` : undefined),
    });

    const plant = nodeControl('Northgate plant');
    const supplier = nodeControl('Halvard Components');

    /* A node whose record the screen named says what activating it opens; a node it did not declares
       no dialog and opens none (rule P-8). */
    expect(plant).toHaveAttribute('aria-haspopup', 'dialog');
    expect(supplier).not.toHaveAttribute('aria-haspopup');

    supplier.focus();
    await user.keyboard('{Enter}');

    expect(selected).toStrictEqual(['node-supplier']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    plant.focus();
    await user.keyboard('{Enter}');

    expect(selected).toStrictEqual(['node-supplier', 'node-plant']);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('holds under both themes', async () => {
    const user = userEvent.setup();

    for (const theme of THEMES) {
      document.documentElement.dataset.theme = theme;

      const rendered = renderLens({ atlas: ATLAS });

      /* The zoom steps, the five presets, the node names, the overlay's label, the frame's label and
         the table view are the surface's contract rather than its colouring, so each of them holds in
         both themes. The selection and the request scan are asserted once above: neither reads a
         colour, so neither can differ between the themes. */
      expect(zoomCaption()).toBe(captionAt(1));

      within(zoomGroup()).getByRole('button', { name: MAP_CANVAS_TEXT.zoomInLabel }).focus();
      await user.keyboard('{Enter}');
      expect(zoomCaption()).toBe(captionAt(2));

      within(presetGroup()).getByRole('button', { name: MAP_VIEW_PRESET_LABELS.europe }).focus();
      await user.keyboard('{Enter}');
      expect(
        within(presetGroup())
          .getByRole('button', { name: MAP_VIEW_PRESET_LABELS.europe })
          .getAttribute('aria-pressed'),
      ).toBe('true');

      expect(within(presetGroup()).getAllByRole('button')).toHaveLength(MAP_VIEW_PRESETS.length);

      for (const node of NODES) {
        expect(nodeControl(node.label)).toHaveAccessibleName(nodeNameOf(node));
      }

      expect(
        within(screen.getByRole('group', { name: MARKET_INTELLIGENCE_LABEL })).getAllByText(
          MARKET_INTELLIGENCE_LABEL,
        ),
      ).toHaveLength(ATLAS.chokepoints.length);

      expect(within(frameOf(rendered.container)).getByText(SIM_LABELS[1])).toBeInTheDocument();

      screen.getByRole('button', { name: toggleName(VIEW_AS_TABLE_LABELS.showTable) }).focus();
      await user.keyboard('{Enter}');

      expect(
        within(screen.getByRole('table', { name: MAP_LENS_TEXT.tableCaption })).getAllByRole('row'),
      ).toHaveLength(NODES.length + 1);

      rendered.unmount();
    }

    expect(document.documentElement.dataset.theme).toBe(THEMES[THEMES.length - 1]);
  });
});

