/**
 * Component suite for `graph-lens.tsx`, the framed graph lens of the FileMap canvas (SCR-12, stage S2).
 *
 * WHAT IS UNDER TEST. `GraphLens` composes the six-lane drawing in `src/components/dependency-graph.tsx`
 * inside `src/components/chart-frame.tsx`, derives the emphasis the shared selection gives it and hands
 * the frame the rows its table view prints. This suite is about those rows, which nothing else covers:
 * the table states one row per node of the payload and one row for every lane the drawing shows with no
 * node in it, in the lane order `DEPENDENCY_GRAPH_LANES` fixes, so a reader who cannot see the drawing is
 * told that the Lines lane exists and holds nothing instead of counting the lanes and finding one missing
 * (success criterion 9). The empty lane's own sentence is the drawing's, imported rather than retyped, and
 * the two columns the drawing has no vocabulary for — the family a lane without nodes has none of, and the
 * path a node no lane reaches is not on — are this lens's own words, asserted here so a blank cell or an
 * em dash cannot take their place (rule B-3). One further case reads the path column back against a
 * selection, because the row's last cell is the only place the emphasis the drawing paints in weight and
 * boundary is stated in words.
 *
 * THE FIXTURE IS SYNTHETIC AND DELIBERATELY PLAIN. Its identifiers carry no domain prefix, because rule
 * P-6 keeps domain identifiers out of `src/features` — tests included — and the suite needs one node per
 * family, one lane chain and two pin tallies: one node with several pin states and one with a single pin.
 * The narrowed payload removes the customer family outright, which is the case where a lane the drawing
 * fills today is emptied by a scope the service resolved before the lens saw it.
 *
 * NO SERVICE IS REACHED. The drawing mounts `EvidenceDrawer` only for a node whose evidence reference the
 * caller resolved, and this suite supplies no mapper, so the lens opens no drawer and asks the port for
 * nothing (rule P-2). Nothing here hashes, reads the clock or touches the network; the suite runs in the
 * jsdom environment `vite.config.ts` sets by default.
 *
 * Rules this suite is written to hold to:
 * - B-3: every cell of every row states something, and the path column names each node's place on the
 *   traced path in words rather than leaving it to the drawing's emphasis.
 * - P-1: the only simulation label the suite could meet is the frame's, and it is not asserted here; the
 *   empty-lane sentence is read from the drawing's own text object instead of being copied in.
 * - P-6: every expectation is derived from the inline payload — a label, a lane or a count the fixture
 *   states — and no figure is typed into a case.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { PinCounts, Topology, TopologyNode, TopologyNodeKind } from '../../types';
import {
  DEPENDENCY_GRAPH_LANES,
  DEPENDENCY_GRAPH_TEXT,
} from '../../components/dependency-graph';
import { NODE_FAMILY_WORDS, PIN_STATE_ORDER } from '../../components/graph-vocabulary';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import { GRAPH_LENS_TEXT, GraphLens } from './graph-lens';
import type { GraphLensProps } from './graph-lens';

/* ---------------------------------------------------------------------------------------------
 * The fixture — one node per family, one lane chain and two pin tallies
 * ------------------------------------------------------------------------------------------- */

/** One node of the payload, with the coordinates and reach a case does not vary. */
function makeNode(id: string, kind: TopologyNode['kind'], label: string): TopologyNode {
  return { id, kind, label, latitude: 0, longitude: 0, productIds: [] };
}

const ORIGIN = makeNode('origin-north', 'origin', 'Northern mine');
const SUPPLIER = makeNode('supplier-one', 'supplier', 'First tier partner');
const MATERIAL = makeNode('material-sheet', 'material', 'Rolled sheet');
const PLANT = makeNode('plant-main', 'plant', 'Main assembly site');
const CUSTOMER = makeNode('customer-harbour', 'customer', 'Harbour works');

/**
 * Two pin tallies: one node carrying several states and one carrying a single pin, so the row's pin cell
 * is asserted for both the plural and the singular noun the drawing owns. The rest carry none.
 */
const PINS_BY_NODE: Record<string, PinCounts> = {
  'plant-main': { pass: 2, fail: 1, review: 0, pending: 0, stale: 0, empty: 0 },
  'supplier-one': { pass: 0, fail: 0, review: 0, pending: 1, stale: 0, empty: 0 },
};

/** The lane chain every case draws, upstream to downstream. */
const LANES: Topology['lanes'] = [
  { fromId: 'origin-north', toId: 'supplier-one' },
  { fromId: 'supplier-one', toId: 'material-sheet' },
  { fromId: 'material-sheet', toId: 'plant-main' },
  { fromId: 'plant-main', toId: 'customer-harbour' },
];

/** The payload every case draws: one node in each of the five families the topology carries. */
const TOPOLOGY: Topology = {
  origins: [ORIGIN],
  suppliers: [SUPPLIER],
  materials: [MATERIAL],
  plants: [PLANT],
  customers: [CUSTOMER],
  lanes: LANES,
  pinsByNode: PINS_BY_NODE,
};

/** The same payload with the customer family emptied, as a narrowed scope leaves it. */
const NARROWED_TOPOLOGY: Topology = { ...TOPOLOGY, customers: [] };

/**
 * The nodes one lane draws, in the payload's own order.
 *
 * The `switch` is exhaustive over `TopologyNodeKind` and carries no `default` arm, so a family added to
 * that union fails to compile here instead of silently emptying a lane the assertion walks.
 *
 * @param topology The payload to read.
 * @param kind The node family the lane draws.
 * @returns The nodes of that family.
 */
function nodesOfFamily(topology: Topology, kind: TopologyNodeKind): readonly TopologyNode[] {
  switch (kind) {
    case 'origin':
      return topology.origins;
    case 'supplier':
      return topology.suppliers;
    case 'material':
      return topology.materials;
    case 'plant':
      return topology.plants;
    case 'customer':
      return topology.customers;
  }
}

/**
 * Every node of the payload in the order the drawing places it: lane order, then the payload's own order
 * within a lane.
 *
 * @param topology The payload to read.
 * @returns The nodes, in the order the table states them.
 */
function nodesInLaneOrder(topology: Topology): readonly TopologyNode[] {
  return DEPENDENCY_GRAPH_LANES.flatMap((lane) =>
    lane.kind === null ? [] : nodesOfFamily(topology, lane.kind),
  );
}

/** The props every case starts from, so a case states only what it changes. */
const BASE_PROPS: GraphLensProps = {
  topology: TOPOLOGY,
  selectedNodeId: null,
  onSelectNode: () => undefined,
};

/* ---------------------------------------------------------------------------------------------
 * Rendering and queries
 * ------------------------------------------------------------------------------------------- */

/**
 * Renders the lens with the props a case does not vary.
 *
 * @param overrides The props this case changes.
 * @returns The render result, so a case can unmount before rendering again.
 */
function renderLens(overrides: Partial<GraphLensProps> = {}): ReturnType<typeof render> {
  return render(<GraphLens {...BASE_PROPS} {...overrides} />);
}

/** The control that switches the frame's two representations, named by the frame's title. */
function tableToggleName(label: string): string {
  return `${label}: ${GRAPH_LENS_TEXT.title}`;
}

/**
 * Opens the lens's table view from the keyboard, as a reader without a pointer would.
 *
 * @returns The table element.
 */
async function openTable(): Promise<HTMLElement> {
  const user = userEvent.setup();

  screen.getByRole('button', { name: tableToggleName(VIEW_AS_TABLE_LABELS.showTable) }).focus();
  await user.keyboard('{Enter}');

  return screen.getByRole('table', { name: GRAPH_LENS_TEXT.tableCaption });
}

/**
 * One row's cells, as a reader reads them left to right.
 *
 * @param row The row to read.
 * @returns The text of each cell.
 */
function cellsOf(row: HTMLElement): readonly (string | null)[] {
  return within(row).getAllByRole('cell').map((cell) => cell.textContent);
}

/**
 * The pin cell the table prints for one node's counts, in the drawing's own vocabulary.
 *
 * Restated here rather than imported, because the lens keeps its own summary and this suite asserts the
 * sentence a reader actually reads: a reworded summary must fail here rather than pass silently.
 *
 * @param counts The node's counts, or `undefined` when the payload holds none for it.
 * @returns The cell text.
 */
function pinsCellOf(counts: PinCounts | undefined): string {
  if (counts === undefined) {
    return DEPENDENCY_GRAPH_TEXT.noPins;
  }

  const stated = PIN_STATE_ORDER.filter((state) => counts[state] > 0).map(
    (state) => `${counts[state]} ${state}`,
  );

  if (stated.length === 0) {
    return DEPENDENCY_GRAPH_TEXT.noPins;
  }

  const total = PIN_STATE_ORDER.reduce((sum, state) => sum + counts[state], 0);
  const noun = total === 1 ? DEPENDENCY_GRAPH_TEXT.pinNounSingular : DEPENDENCY_GRAPH_TEXT.pinNoun;

  return `${total} ${noun}${DEPENDENCY_GRAPH_TEXT.pinBreakdownSeparator} ${stated.join(', ')}`;
}

/**
 * The whole of one empty lane's row, as the table states it: the lane's own heading, the sentence the
 * drawing prints inside that lane, and the three cells the drawing has no wording for.
 */
const EMPTY_LANE_CELLS: readonly string[] = [
  DEPENDENCY_GRAPH_TEXT.emptyLane,
  GRAPH_LENS_TEXT.emptyLane.family,
  DEPENDENCY_GRAPH_TEXT.noPins,
  GRAPH_LENS_TEXT.emptyLane.path,
];

/* ---------------------------------------------------------------------------------------------
 * The cases
 * ------------------------------------------------------------------------------------------- */

describe('GraphLens table view', () => {
  it('prints a row for the lane the drawing fills with its empty-lane sentence', async () => {
    renderLens();

    /* The drawing states the lane itself, so the case is about the table matching a sentence a reader
       can already see rather than about a sentence invented here. */
    expect(screen.getAllByText(DEPENDENCY_GRAPH_TEXT.emptyLane)).toHaveLength(1);

    const table = await openTable();
    const rows = within(table).getAllByRole('row').slice(1);
    const emptyLanes = DEPENDENCY_GRAPH_LANES.filter((lane) => lane.kind === null);

    expect(emptyLanes.length).toBeGreaterThan(0);
    expect(rows).toHaveLength(nodesInLaneOrder(TOPOLOGY).length + emptyLanes.length);

    /* The lane column runs the drawing's own lanes, in the drawing's own order, so the table and the
       picture list the same six columns. */
    const laneCells: (string | null)[] = [];

    for (const row of rows) {
      laneCells.push(cellsOf(row)[0] ?? null);
    }

    expect([...new Set(laneCells)]).toStrictEqual(
      DEPENDENCY_GRAPH_LANES.map((lane) => lane.label),
    );

    /* The lane with no node family takes exactly one row, and every one of its cells says something
       true about it: the drawing's sentence, no family, no pins and no node to trace. */
    for (const lane of emptyLanes) {
      const stated = rows.filter((row) => cellsOf(row)[0] === lane.label);

      expect(stated).toHaveLength(1);

      const row = stated[0];

      expect(row).toBeDefined();

      if (row === undefined) {
        continue;
      }

      expect(cellsOf(row)).toStrictEqual([lane.label, ...EMPTY_LANE_CELLS]);
      expect(within(row).getByText(DEPENDENCY_GRAPH_TEXT.emptyLane)).toBeInTheDocument();
    }
  });

  it('states every node of the payload in its own lane, in the payload’s own words', async () => {
    renderLens();

    const table = await openTable();
    const rows = within(table).getAllByRole('row').slice(1);
    const emptyLanes = DEPENDENCY_GRAPH_LANES.filter((lane) => lane.kind === null);

    expect(rows).toHaveLength(nodesInLaneOrder(TOPOLOGY).length + emptyLanes.length);

    /* Each node's row is found by the label it prints for that node, so the assertion reads the row a
       reader would point at and the empty lane's row between two families cannot shift it. */
    for (const lane of DEPENDENCY_GRAPH_LANES) {
      if (lane.kind === null) {
        continue;
      }

      for (const node of nodesOfFamily(TOPOLOGY, lane.kind)) {
        const row = rows.find((candidate) => cellsOf(candidate)[1] === node.label);

        expect(row).toBeDefined();

        if (row === undefined) {
          continue;
        }

        expect(cellsOf(row)).toStrictEqual([
          lane.label,
          node.label,
          NODE_FAMILY_WORDS[node.kind],
          pinsCellOf(TOPOLOGY.pinsByNode[node.id]),
          GRAPH_LENS_TEXT.path.noSelection,
        ]);
      }
    }
  });

  it('prints an empty-lane row for a lane a narrowed payload empties as well', async () => {
    renderLens({ topology: NARROWED_TOPOLOGY });

    const table = await openTable();
    const rows = within(table).getAllByRole('row').slice(1);
    const customerLane = DEPENDENCY_GRAPH_LANES.find((lane) => lane.kind === 'customer');

    expect(customerLane).toBeDefined();

    if (customerLane === undefined) {
      return;
    }

    /* One row fewer than the full payload, and the customer lane keeps its place with the drawing's own
       sentence instead of disappearing from the table. The lanes shown empty are the one the drawing never
       fills — every `kind: null` lane — plus the customer lane this payload empties. */
    const lanesShownEmpty =
      DEPENDENCY_GRAPH_LANES.filter((lane) => lane.kind === null).length + 1;

    expect(rows).toHaveLength(nodesInLaneOrder(NARROWED_TOPOLOGY).length + lanesShownEmpty);

    const stated = rows.filter((row) => cellsOf(row)[0] === customerLane.label);

    expect(stated).toHaveLength(1);

    const row = stated[0];

    expect(row).toBeDefined();

    if (row === undefined) {
      return;
    }

    expect(cellsOf(row)).toStrictEqual([customerLane.label, ...EMPTY_LANE_CELLS]);
  });

  it('states each node’s place on the traced path, and no path for a lane that holds no node', async () => {
    renderLens({ selectedNodeId: PLANT.id });

    const table = await openTable();
    const rows = within(table).getAllByRole('row').slice(1);

    /**
     * The path word one node's row prints, found by the label the row states for it.
     *
     * @param label The node's own label, as the payload spells it.
     * @returns The last cell of that row.
     */
    function pathWordOf(label: string): string | null {
      const row = rows.find((candidate) => cellsOf(candidate)[1] === label);

      if (row === undefined) {
        throw new Error(`the table printed no row for ${label}`);
      }

      const cells = cellsOf(row);

      return cells[cells.length - 1] ?? null;
    }

    expect(pathWordOf(PLANT.label)).toBe(GRAPH_LENS_TEXT.path.selected);
    expect(pathWordOf(SUPPLIER.label)).toBe(GRAPH_LENS_TEXT.path.upstream);
    expect(pathWordOf(ORIGIN.label)).toBe(GRAPH_LENS_TEXT.path.upstream);
    expect(pathWordOf(CUSTOMER.label)).toBe(GRAPH_LENS_TEXT.path.downstream);

    /* An empty lane holds no node, so it is on no path: the column says so rather than borrowing a node's
       word for it. */
    const emptyLane = DEPENDENCY_GRAPH_LANES.filter((lane) => lane.kind === null).map(
      (lane) => lane.label,
    );

    expect(emptyLane.length).toBeGreaterThan(0);

    for (const label of emptyLane) {
      const row = rows.find((candidate) => cellsOf(candidate)[0] === label);

      expect(row).toBeDefined();

      if (row === undefined) {
        continue;
      }

      const cells = cellsOf(row);

      expect(cells[cells.length - 1]).toBe(GRAPH_LENS_TEXT.emptyLane.path);
    }
  });
});
