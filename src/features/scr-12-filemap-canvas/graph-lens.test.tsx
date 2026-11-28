/**
 * Component suite for `graph-lens.tsx`, the framed graph lens of the FileMap canvas (SCR-12, stage S2).
 *
 * WHAT IS UNDER TEST, AND WHY IT IS THIS FILE'S. `GraphLens` composes the drawing in
 * `src/components/dependency-graph.tsx` inside `src/components/chart-frame.tsx`, holds the reader's
 * emphasis choices and hands the frame the rows its table view prints. The drawing's own suite covers
 * its controls one at a time; what only the lens can own is the reading those controls produce — which
 * nodes the direction emphasises, which it pushes back, whether anything is dimmed at all, and whether
 * the caption and the table view say the same thing as the drawing. Each case below asserts one
 * clause of that: the lens opens on the reading it gave before the controls existed (both directions,
 * dimming on, and the caption sentence the browser checks quote); choosing upstream or downstream
 * changes the emphasised set, the dimmed set and the table view's path column together, so one walk
 * of the payload is applied to both representations; turning the dimming off keeps the path and dims
 * nothing while the caption states that; and with no node selected the four controls are disabled
 * with the drawing's own reason, which is the state rule P-8 requires them to explain rather than sit
 * inert in.
 *
 * THE FIXTURE IS SYNTHETIC AND BUILT HERE. One chain — origin, supplier, material, plant, customer —
 * plus a second supplier that joins nothing, so every direction has nodes on it and off it, and one
 * node the payload states no pins for. No seed module, no `src/services/mock` and nothing from
 * `tests/fixtures` is imported (rule P-2), no identifier is shaped like a domain record (rule P-6), and
 * no label is a real party (rule P-7). The evidence mapper resolves nothing for every node, so
 * activation reports a selection and mounts no drawer: the suite therefore needs no service provider,
 * and nothing here reaches any origin (rule B-1).
 *
 * Rules this suite is written to hold to:
 * - B-3: the emphasis is read twice — as the drawing's boundary weight and surface, and as the table
 *   view's path column — so a reader who cannot see the drawing reads the same distinction as text,
 *   and every interaction is driven from the keyboard or the pointer through `@testing-library`.
 * - P-1: no simulation label is spelled here; the frame's label belongs to its own suite.
 * - P-6: every expectation is derived from the payload the fixture states or from the wording the lens
 *   exports; no count, figure or identifier is typed into a case.
 * - P-8: the disabled controls are asserted through the reason the drawing states, not only through
 *   `aria-disabled`.
 *
 * Renders under the jsdom environment `vite.config.ts` configures; nothing here hashes, reads the clock
 * or shows a computed figure (rule P-6).
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Topology, TopologyNode } from '../../types';
import { DEPENDENCY_GRAPH_TEXT } from '../../components/dependency-graph';
import { VIEW_AS_TABLE_LABELS } from '../../components/view-as-table-toggle';
import { GRAPH_LENS_TEXT, GraphLens } from './graph-lens';
import type { GraphLensProps } from './graph-lens';

/* ---------------------------------------------------------------------------------------------
 * The fixture — one chain, one node off it, and no pins anywhere
 * ------------------------------------------------------------------------------------------- */

/** A node of the payload, with the fields a case does not vary. */
function makeNode(id: string, kind: TopologyNode['kind'], label: string): TopologyNode {
  return { id, kind, label, latitude: 0, longitude: 0, productIds: [] };
}

const ORIGIN = makeNode('origin-one', 'origin', 'Northern mine');
const SUPPLIER = makeNode('supplier-one', 'supplier', 'First tier partner');
const SUPPLIER_OFF_PATH = makeNode('supplier-two', 'supplier', 'Second tier partner');
const MATERIAL = makeNode('material-one', 'material', 'Rolled sheet');
const PLANT = makeNode('plant-one', 'plant', 'Main assembly site');
const CUSTOMER = makeNode('customer-one', 'customer', 'Harbour works');

/**
 * The payload every case draws: origin → supplier → material → plant → customer, stated as lanes that
 * run upstream to downstream, plus a supplier no lane names.
 *
 * The plant is the selection every case starts from, which is what makes the two directions distinct:
 * one material, one supplier and one origin lie upstream of it and one customer lies downstream, while
 * the unnamed supplier lies on neither path and is therefore the node a dimming lens always pushes back.
 */
const TOPOLOGY: Topology = {
  origins: [ORIGIN],
  suppliers: [SUPPLIER, SUPPLIER_OFF_PATH],
  materials: [MATERIAL],
  plants: [PLANT],
  customers: [CUSTOMER],
  lanes: [
    { fromId: ORIGIN.id, toId: SUPPLIER.id },
    { fromId: SUPPLIER.id, toId: MATERIAL.id },
    { fromId: MATERIAL.id, toId: PLANT.id },
    { fromId: PLANT.id, toId: CUSTOMER.id },
  ],
  pinsByNode: {},
};

/** The selection every case starts from: a node with something on each side of it. */
const SELECTED_NODE_ID = PLANT.id;

const noop = (): void => {};

/**
 * The mapping the lens is given: no record stands behind any node, so activating one reports the
 * selection and opens nothing.
 *
 * It is what keeps this suite free of the service provider the evidence drawer would read through, and
 * it is the honest answer this lens is composed with when the screen names no evidence of its own.
 */
const NO_NODE_EVIDENCE = (): undefined => undefined;

/** Renders the lens with the payload above and the props a case does not vary. */
function renderLens(overrides: Partial<GraphLensProps> = {}): ReturnType<typeof render> {
  return render(
    <GraphLens
      topology={overrides.topology ?? TOPOLOGY}
      onSelectNode={overrides.onSelectNode ?? noop}
      evidenceRefForNode={NO_NODE_EVIDENCE}
      {...(overrides.selectedNodeId === undefined
        ? {}
        : { selectedNodeId: overrides.selectedNodeId })}
    />,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The controls, the drawing and the table view — read the way a reader meets them
 * ------------------------------------------------------------------------------------------- */

/** The group holding the three direction controls, named by the caption the drawing gives it. */
function directionGroup(): HTMLElement {
  return screen.getByRole('group', { name: DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabel });
}

/** One direction control, found by the label it prints. */
function directionControl(
  direction: keyof typeof DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabels,
): HTMLElement {
  return within(directionGroup()).getByRole('button', {
    name: DEPENDENCY_GRAPH_TEXT.emphasisDirectionLabels[direction],
  });
}

/** The dimming switch, found by the label it prints. */
function dimmingSwitch(): HTMLElement {
  return screen.getByRole('switch', { name: DEPENDENCY_GRAPH_TEXT.dimmingLabel });
}

/** One node of the drawing, found by the label its accessible name starts with. */
function nodeButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${label}, `, 'u') });
}

/** The classes one node's boundary carries, as tokens, so a variant prefix cannot satisfy a match. */
function nodeBoxTokens(label: string): readonly string[] {
  const box = nodeButton(label).querySelector('rect');

  if (box === null) {
    throw new Error(`The node named ${label} draws no boundary.`);
  }

  return (box.getAttribute('class') ?? '').split(' ');
}

/** The control that switches the frame's two representations, named for the figure it belongs to. */
function tableToggle(): HTMLElement {
  return screen.getByRole('button', {
    name: `${VIEW_AS_TABLE_LABELS.showTable}: ${GRAPH_LENS_TEXT.title}`,
  });
}

/**
 * The word the table view prints in the path column for one node.
 *
 * The column is read from the row rather than by position in the table, so a lane that gains or loses
 * a node does not move the value this case is about; the path column is the row's last cell, which is
 * the order `graph-lens.tsx` declares its columns in.
 *
 * @param table The table view's table, as the frame renders it.
 * @param label The node's own label, which is the row's second cell.
 * @returns The path word of that row.
 * @throws When the table holds no row for the label, which would mean the view omitted a mark.
 */
function pathWordOf(table: HTMLElement, label: string): string {
  const row = within(table).getByRole('cell', { name: label }).closest('tr');

  if (row === null) {
    throw new Error(`The table view printed no row for ${label}.`);
  }

  const cells = within(row).getAllByRole('cell');

  return cells[cells.length - 1]?.textContent ?? '';
}

/** Leaves `<html>` on the default theme for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

/* ---------------------------------------------------------------------------------------------
 * The reading the lens opens on
 * ------------------------------------------------------------------------------------------- */

describe('GraphLens default emphasis', () => {
  it('opens on both directions with dimming on, and states that reading in words', () => {
    renderLens({ selectedNodeId: SELECTED_NODE_ID });

    expect(directionControl('both')).toHaveAttribute('aria-pressed', 'true');
    expect(directionControl('upstream')).toHaveAttribute('aria-pressed', 'false');
    expect(directionControl('downstream')).toHaveAttribute('aria-pressed', 'false');
    expect(dimmingSwitch()).toHaveAttribute('aria-checked', 'true');

    /* The sentence the lens stated before the controls existed, character for character: a reader who
       never touches them reads exactly what they read then. */
    expect(
      screen.getByText(
        'Emphasis traces the upstream and downstream path of Main assembly site; ' +
          'every other node is dimmed.',
      ),
    ).toBeInTheDocument();

    /* And the drawing applies it: the nodes on both sides of the selection are emphasised and the one
       no lane names is pushed back. */
    expect(nodeBoxTokens(SUPPLIER.label)).toContain('stroke-accent');
    expect(nodeBoxTokens(CUSTOMER.label)).toContain('stroke-accent');
    expect(nodeBoxTokens(SUPPLIER_OFF_PATH.label)).toContain('stroke-hairline');
  });

  it('names the drawing it frames with the lens’s own title', () => {
    renderLens({ selectedNodeId: SELECTED_NODE_ID });

    /* The lens supplies the title and the drawing states it as its accessible name, so the figure and
       the graphic inside it are announced by the words a reader sees above them (rule B-3). */
    expect(screen.getByRole('group', { name: GRAPH_LENS_TEXT.title })).toHaveAttribute(
      'aria-label',
      GRAPH_LENS_TEXT.title,
    );
  });
});

/* ---------------------------------------------------------------------------------------------
 * The direction the reader chooses
 * ------------------------------------------------------------------------------------------- */

describe('GraphLens emphasis direction', () => {
  it.each([
    {
      direction: 'upstream',
      onPath: [ORIGIN.label, SUPPLIER.label, MATERIAL.label],
      offPath: [CUSTOMER.label],
      onPathWord: GRAPH_LENS_TEXT.path.upstream,
      caption:
        'Emphasis traces the upstream path of Main assembly site; every other node is dimmed.',
    },
    {
      direction: 'downstream',
      onPath: [CUSTOMER.label],
      offPath: [ORIGIN.label, SUPPLIER.label, MATERIAL.label],
      onPathWord: GRAPH_LENS_TEXT.path.downstream,
      caption:
        'Emphasis traces the downstream path of Main assembly site; every other node is dimmed.',
    },
  ] as const)(
    'traces only the $direction half of the path through the drawing, the caption and the table',
    async ({ direction, onPath, offPath, onPathWord, caption }) => {
      const user = userEvent.setup();
      renderLens({ selectedNodeId: SELECTED_NODE_ID });

      await user.click(directionControl(direction));

      expect(directionControl(direction)).toHaveAttribute('aria-pressed', 'true');
      expect(directionControl('both')).toHaveAttribute('aria-pressed', 'false');
      expect(screen.getByText(caption)).toBeInTheDocument();

      /* The drawing states the choice on every node: the ones the direction reached are traced, the
         ones it did not are pushed back with a thinner boundary and a lighter label (rule B-3). */
      for (const label of onPath) {
        expect(nodeBoxTokens(label)).toContain('stroke-accent');
      }

      for (const label of offPath) {
        expect(nodeBoxTokens(label)).toContain('stroke-hairline');
      }

      /* The table view is the same walk in words: every node outside the chosen direction reads as
         off the path rather than as belonging to the half nobody traced. */
      await user.click(tableToggle());

      const table = screen.getByRole('table', { name: GRAPH_LENS_TEXT.tableCaption });

      expect(pathWordOf(table, PLANT.label)).toBe(GRAPH_LENS_TEXT.path.selected);

      for (const label of onPath) {
        expect(pathWordOf(table, label)).toBe(onPathWord);
      }

      for (const label of offPath) {
        expect(pathWordOf(table, label)).toBe(GRAPH_LENS_TEXT.path.none);
      }
    },
  );

  it('traces both halves at once when the reader returns to both directions', async () => {
    const user = userEvent.setup();

    renderLens({ selectedNodeId: SELECTED_NODE_ID });

    await user.click(directionControl('upstream'));
    await user.click(directionControl('both'));

    expect(directionControl('both')).toHaveAttribute('aria-pressed', 'true');
    expect(nodeBoxTokens(ORIGIN.label)).toContain('stroke-accent');
    expect(nodeBoxTokens(CUSTOMER.label)).toContain('stroke-accent');
    expect(
      screen.getByText(
        'Emphasis traces the upstream and downstream path of Main assembly site; ' +
          'every other node is dimmed.',
      ),
    ).toBeInTheDocument();
  });
});

/* ---------------------------------------------------------------------------------------------
 * The dimming the reader turns off
 * ------------------------------------------------------------------------------------------- */

describe('GraphLens dimming', () => {
  it('keeps the path emphasised and pushes nothing back once dimming is off, and says so', async () => {
    const user = userEvent.setup();

    renderLens({ selectedNodeId: SELECTED_NODE_ID });

    expect(nodeBoxTokens(SUPPLIER_OFF_PATH.label)).toContain('stroke-hairline');

    await user.click(dimmingSwitch());

    expect(dimmingSwitch()).toHaveAttribute('aria-checked', 'false');

    /* The path is still traced, and the node the dimming pushed back is now drawn at the resting
       emphasis it shares with every other node off the path. */
    expect(nodeBoxTokens(SUPPLIER.label)).toContain('stroke-accent');
    expect(nodeBoxTokens(SUPPLIER_OFF_PATH.label)).not.toContain('stroke-hairline');
    expect(nodeBoxTokens(SUPPLIER_OFF_PATH.label)).toContain('stroke-control-boundary');

    /* Rule B-3: the caption states the state that is actually applied, not the default. */
    expect(
      screen.getByText(
        'Emphasis traces the upstream and downstream path of Main assembly site; ' +
          'no other node is dimmed.',
      ),
    ).toBeInTheDocument();
  });

  it('dims again when the reader turns it back on', async () => {
    const user = userEvent.setup();

    renderLens({ selectedNodeId: SELECTED_NODE_ID });

    await user.click(dimmingSwitch());
    await user.click(dimmingSwitch());

    expect(dimmingSwitch()).toHaveAttribute('aria-checked', 'true');
    expect(nodeBoxTokens(SUPPLIER_OFF_PATH.label)).toContain('stroke-hairline');
  });
});

/* ---------------------------------------------------------------------------------------------
 * Nothing selected: the state every control has to explain
 * ------------------------------------------------------------------------------------------- */

describe('GraphLens with no selection', () => {
  it('disables all four controls with the drawing’s own reason and states what selecting does', () => {
    renderLens();

    const controls = [...within(directionGroup()).getAllByRole('button'), dimmingSwitch()];

    expect(controls).toHaveLength(4);

    for (const control of controls) {
      expect(control).toHaveAttribute('aria-disabled', 'true');

      const describedBy = control.getAttribute('aria-describedby');
      const reason = document.getElementById(describedBy ?? '');

      /* The reason is the drawing's, imported rather than restated, so the lens and the control that
         states it cannot describe the missing selection in two ways (rule P-8). */
      expect(reason?.textContent).toBe(DEPENDENCY_GRAPH_TEXT.emphasisUnavailable);
    }

    /* The caption states what the lens shows while nothing is selected, which is the sentence that
       tells a reader the controls above it are waiting for a selection. */
    expect(screen.getByText(GRAPH_LENS_TEXT.description)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp('^Emphasis traces', 'u'))).toBeNull();
  });

  it('dims nothing and traces nothing while nothing is selected', () => {
    renderLens();

    for (const label of [ORIGIN.label, SUPPLIER.label, SUPPLIER_OFF_PATH.label, CUSTOMER.label]) {
      expect(nodeBoxTokens(label)).not.toContain('stroke-hairline');
      expect(nodeBoxTokens(label)).toContain('stroke-control-boundary');
    }
  });
});
