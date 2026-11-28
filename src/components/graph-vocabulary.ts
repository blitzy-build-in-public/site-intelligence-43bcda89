/**
 * The one owner of the vocabulary the graph surfaces share: the order a node's pin states are listed
 * in, and the word each node family is named by.
 *
 * The canvas and the dependency graph draw the same payload — `src/types/topology.ts` — and each of
 * them states the same two things about it: every mark's accessible name and every table row name a
 * node's family in one word, and every summary lists the six pin states in one order. Both were
 * restated in four modules apiece, byte for byte, so a reader comparing the drawing with its table was
 * relying on four copies staying equal. They are one statement now, here, and each surface imports it.
 *
 * What is deliberately not here. The words a count is *announced* with are per-surface wording rather
 * than shared vocabulary — the canvas says a state "passed", the lenses count it as "pass" — so each
 * module keeps its own `PIN_STATE_WORDS` map and only the order is shared. Nothing else about a pin is
 * shared either: `./status-indicator.tsx` owns what a state looks like, and the geometry, the markers
 * and the badges stay with the component that draws them.
 *
 * Rules this module is built to satisfy:
 * - P-6: no figure, no currency amount and no record identifier is typed here. Both exports are closed
 *   vocabularies the payload's own types fix, and the two maps are exhaustive by type so a seventh pin
 *   state or a sixth node family fails this file's compilation rather than vanishing from a surface.
 * - P-2 and AAP §0.18.1: it imports the shared types and nothing else — no service, no seed record, no
 *   screen — so the component layer keeps its place in the dependency direction.
 * - P-1: neither export labels a figure. A family word names the kind of place a node is; the
 *   simulation labels a figure carries belong to the component that renders that figure.
 */
import type { PinState, TopologyNodeKind } from '../types';

/**
 * The five node families' names, one word each, wherever a node's family is spoken or printed.
 *
 * A family is meaning rather than decoration, so it is both spoken and shown: a reader who hears
 * "Riedberg, plant node" knows what kind of place the mark is without seeing the lane it sits in, and
 * the table view's family column reads the same word for the same node. `Tier-2 origin` rather than
 * `origin` because the tier is what distinguishes an origin from the supplier drawn beside it, and a
 * material is a family of its own because several of them are bought from one supplier.
 */
export const NODE_FAMILY_WORDS = {
  plant: 'Plant',
  supplier: 'Supplier',
  material: 'Material',
  origin: 'Tier-2 origin',
  customer: 'Customer',
} as const satisfies Record<TopologyNodeKind, string>;

/**
 * The six pin states in the order a summary lists them: the states that ask something of a reader
 * first, the states that ask nothing last.
 *
 * The order is presentation only. `PinCounts` is keyed by the six `PinState` members the contracts fix,
 * so this list decides which of them a reader meets first and never which of them exist; it is fixed
 * here rather than taken from a payload's key order, so two nodes, two renders and every lens list the
 * same states in the same sequence. It is exhaustive by type, so a seventh state fails to compile here
 * rather than disappearing from a summary.
 */
export const PIN_STATE_ORDER = [
  'fail',
  'stale',
  'pending',
  'review',
  'pass',
  'empty',
] as const satisfies readonly PinState[];
