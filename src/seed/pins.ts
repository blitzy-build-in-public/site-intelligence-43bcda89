/**
 * The evidence pins of the FileMap canvas: the reviewable claims attached to its nodes, and the
 * per-node counts the canvas badges from.
 *
 * Fixing inputs:
 * - AAP 0.2.1 requires "pin counts per node, because the graph lens and the canvas node badges in S2
 *   need both before the pin screens exist in S4".
 * - `src/types/topology.ts` types those counts as `PinCounts` — `Record<PinState, number>`, every one
 *   of the six states a key — and carries them on `Topology.pinsByNode`, keyed by the same node id
 *   the nodes of the plant, supplier, origin and customer families carry. That module also fixes the
 *   reading of an absent key: a node missing from the map has no pins and renders no badge, which is
 *   why a node that carries no evidence appears in neither export — a material node is the one family
 *   no pin is attached to, because a material is bought rather than reviewed.
 * - `src/types/entities.ts` fixes the record itself: `id`, `nodeRef`, `state` and an optional
 *   `vendorId`, with `PinState`'s six values `empty`, `pending`, `pass`, `fail`, `stale` and `review`.
 *   The record deliberately has no label, text or message member, so a pin cannot describe itself.
 * - AAP 0.6.2 and 0.12.2 leave the USR-08 restriction ("sees only its own-vendor pins") to the mock
 *   adapter, which can only apply it to data that attributes a pin to its vendor. Every pin on a
 *   supplier node therefore names that supplier in `vendorId`. Pins on plants, origins and customers
 *   name none: the evidence they carry concerns the site itself rather than one supplier's
 *   submission, and an origin feeding several suppliers (see `./origins.ts`) has no single vendor to
 *   name. That attribution is what keeps a vendor's pins findable by the vendor and invisible to
 *   every other one.
 *
 * The six states are all present across the four node families that carry pins — plants, suppliers,
 * origins and customers — because the canvas badge and the
 * mapping in `src/components/status-indicator.tsx` (pass to pass, fail to fail, stale to warning,
 * pending to warning with the clock, review to review, empty to empty) exist for exactly that spread.
 *
 * DERIVATION — the seed document is not on disk. The evidence pins belong to
 * `platform-seed-data.md`, which is not part of this repository, so every pin below is authored
 * rather than transcribed: no input fixes which node carries evidence, or which of the six states
 * a pin reports. What the inputs fix is the covering shape — AAP 0.2.1's per-node counts, because
 * the canvas badges them before the pin screens exist, and that section's rule that USR-08 sees
 * only its own vendor's pins, which is why a pin on a supplier node names that supplier. If the
 * seed document is supplied later, its table transcribes over these records and supersedes them
 * with no change to any consumer, because every consumer reads a pin through the service.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `../types` and nothing else, and only `src/services/mock/seed-loader.ts` imports
 *   this folder, so a pin reaches a screen through the typed service interface alone.
 * - P-6: the counts in `PINS_BY_NODE` are record-keyed tallies of the pins declared above them — for
 *   every node, each count is the number of pins of that state naming that node. No percentage,
 *   ratio, sum across nodes or other figure appears here; every further figure belongs to the
 *   service or to `src/domain`. Both exports are literal data: nothing below is declared as a
 *   callable, a class or a default export, because a tally computed here would be a computed figure
 *   of its own, and one that could drift from the records it counts.
 * - P-1: a state is a synthetic record of a review, not the outcome of a live production check, and
 *   the interface supplies the labels that say so. The record carries no wording of its own, which is
 *   also how P-4 is kept: a pin has no place in which to overstate what a control does.
 * - P-5: no competitor, chokepoint or other market-intelligence value — this is first-party network
 *   evidence only.
 * - P-7: every identifier is synthetic and belongs to the demonstration's own vocabulary; no real
 *   vendor, customer or product name, and no placeholder text.
 * - B-1: no address, tile reference or other URL. B-2: no credential and no environment read.
 */

import type { EvidencePin, PinCounts } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Pins — `platform-contracts.md` §3 `EvidencePin`, AAP 0.12.2
 * ------------------------------------------------------------------------------------------- */

/**
 * Every evidence pin of the demonstration, grouped by the node it is attached to.
 *
 * Within a group the states are listed so that they can be counted against the matching entry of
 * `PINS_BY_NODE` by reading the two side by side; the comment above each group states the tally the
 * entry repeats.
 */
export const EVIDENCE_PINS: readonly EvidencePin[] = [
  // PLT-RGB — 4 pins: pass 2, pending 1, review 1.
  { id: 'PIN-PLT-RGB-01', nodeRef: 'PLT-RGB', state: 'pass' },
  { id: 'PIN-PLT-RGB-02', nodeRef: 'PLT-RGB', state: 'pass' },
  { id: 'PIN-PLT-RGB-03', nodeRef: 'PLT-RGB', state: 'review' },
  { id: 'PIN-PLT-RGB-04', nodeRef: 'PLT-RGB', state: 'pending' },

  // PLT-BRN — 5 pins: pass 1, fail 2, stale 1, review 1.
  { id: 'PIN-PLT-BRN-01', nodeRef: 'PLT-BRN', state: 'fail' },
  { id: 'PIN-PLT-BRN-02', nodeRef: 'PLT-BRN', state: 'fail' },
  { id: 'PIN-PLT-BRN-03', nodeRef: 'PLT-BRN', state: 'stale' },
  { id: 'PIN-PLT-BRN-04', nodeRef: 'PLT-BRN', state: 'review' },
  { id: 'PIN-PLT-BRN-05', nodeRef: 'PLT-BRN', state: 'pass' },

  // PLT-QRO — 3 pins: pass 1, review 1, empty 1.
  { id: 'PIN-PLT-QRO-01', nodeRef: 'PLT-QRO', state: 'pass' },
  { id: 'PIN-PLT-QRO-02', nodeRef: 'PLT-QRO', state: 'review' },
  { id: 'PIN-PLT-QRO-03', nodeRef: 'PLT-QRO', state: 'empty' },

  // PLT-RAK — 2 pins: pass 2.
  { id: 'PIN-PLT-RAK-01', nodeRef: 'PLT-RAK', state: 'pass' },
  { id: 'PIN-PLT-RAK-02', nodeRef: 'PLT-RAK', state: 'pass' },

  // SUP-HANSA-METALL — 3 pins: pass 2, stale 1.
  { id: 'PIN-SUP-HANSA-METALL-01', nodeRef: 'SUP-HANSA-METALL', state: 'pass', vendorId: 'SUP-HANSA-METALL' },
  { id: 'PIN-SUP-HANSA-METALL-02', nodeRef: 'SUP-HANSA-METALL', state: 'pass', vendorId: 'SUP-HANSA-METALL' },
  { id: 'PIN-SUP-HANSA-METALL-03', nodeRef: 'SUP-HANSA-METALL', state: 'stale', vendorId: 'SUP-HANSA-METALL' },

  // SUP-BAJIO-METALES — 2 pins: pass 1, review 1.
  { id: 'PIN-SUP-BAJIO-METALES-01', nodeRef: 'SUP-BAJIO-METALES', state: 'pass', vendorId: 'SUP-BAJIO-METALES' },
  { id: 'PIN-SUP-BAJIO-METALES-02', nodeRef: 'SUP-BAJIO-METALES', state: 'review', vendorId: 'SUP-BAJIO-METALES' },

  // SUP-VLTAVA-GUSS — 2 pins: pass 1, review 1.
  { id: 'PIN-SUP-VLTAVA-GUSS-01', nodeRef: 'SUP-VLTAVA-GUSS', state: 'pass', vendorId: 'SUP-VLTAVA-GUSS' },
  { id: 'PIN-SUP-VLTAVA-GUSS-02', nodeRef: 'SUP-VLTAVA-GUSS', state: 'review', vendorId: 'SUP-VLTAVA-GUSS' },

  // SUP-RHEINSTERN-ELEKTRONIK — 5 pins: pass 1, fail 2, stale 1, pending 1.
  { id: 'PIN-SUP-RHEINSTERN-ELEKTRONIK-01', nodeRef: 'SUP-RHEINSTERN-ELEKTRONIK', state: 'pass', vendorId: 'SUP-RHEINSTERN-ELEKTRONIK' },
  { id: 'PIN-SUP-RHEINSTERN-ELEKTRONIK-02', nodeRef: 'SUP-RHEINSTERN-ELEKTRONIK', state: 'fail', vendorId: 'SUP-RHEINSTERN-ELEKTRONIK' },
  { id: 'PIN-SUP-RHEINSTERN-ELEKTRONIK-03', nodeRef: 'SUP-RHEINSTERN-ELEKTRONIK', state: 'fail', vendorId: 'SUP-RHEINSTERN-ELEKTRONIK' },
  { id: 'PIN-SUP-RHEINSTERN-ELEKTRONIK-04', nodeRef: 'SUP-RHEINSTERN-ELEKTRONIK', state: 'stale', vendorId: 'SUP-RHEINSTERN-ELEKTRONIK' },
  { id: 'PIN-SUP-RHEINSTERN-ELEKTRONIK-05', nodeRef: 'SUP-RHEINSTERN-ELEKTRONIK', state: 'pending', vendorId: 'SUP-RHEINSTERN-ELEKTRONIK' },

  // SUP-NORDWERK-ANTRIEB — 3 pins: pass 1, stale 1, review 1.
  { id: 'PIN-SUP-NORDWERK-ANTRIEB-01', nodeRef: 'SUP-NORDWERK-ANTRIEB', state: 'pass', vendorId: 'SUP-NORDWERK-ANTRIEB' },
  { id: 'PIN-SUP-NORDWERK-ANTRIEB-02', nodeRef: 'SUP-NORDWERK-ANTRIEB', state: 'stale', vendorId: 'SUP-NORDWERK-ANTRIEB' },
  { id: 'PIN-SUP-NORDWERK-ANTRIEB-03', nodeRef: 'SUP-NORDWERK-ANTRIEB', state: 'review', vendorId: 'SUP-NORDWERK-ANTRIEB' },

  // SUP-DONAU-DICHTUNG — 3 pins: pass 2, review 1.
  { id: 'PIN-SUP-DONAU-DICHTUNG-01', nodeRef: 'SUP-DONAU-DICHTUNG', state: 'pass', vendorId: 'SUP-DONAU-DICHTUNG' },
  { id: 'PIN-SUP-DONAU-DICHTUNG-02', nodeRef: 'SUP-DONAU-DICHTUNG', state: 'pass', vendorId: 'SUP-DONAU-DICHTUNG' },
  { id: 'PIN-SUP-DONAU-DICHTUNG-03', nodeRef: 'SUP-DONAU-DICHTUNG', state: 'review', vendorId: 'SUP-DONAU-DICHTUNG' },

  // SUP-MERIDIAN-INDUSTRIAL — 3 pins: pass 2, empty 1.
  { id: 'PIN-SUP-MERIDIAN-INDUSTRIAL-01', nodeRef: 'SUP-MERIDIAN-INDUSTRIAL', state: 'pass', vendorId: 'SUP-MERIDIAN-INDUSTRIAL' },
  { id: 'PIN-SUP-MERIDIAN-INDUSTRIAL-02', nodeRef: 'SUP-MERIDIAN-INDUSTRIAL', state: 'pass', vendorId: 'SUP-MERIDIAN-INDUSTRIAL' },
  { id: 'PIN-SUP-MERIDIAN-INDUSTRIAL-03', nodeRef: 'SUP-MERIDIAN-INDUSTRIAL', state: 'empty', vendorId: 'SUP-MERIDIAN-INDUSTRIAL' },

  // ORG-ALU — 2 pins: pass 1, review 1.
  { id: 'PIN-ORG-ALU-01', nodeRef: 'ORG-ALU', state: 'pass' },
  { id: 'PIN-ORG-ALU-02', nodeRef: 'ORG-ALU', state: 'review' },

  // ORG-CU — 2 pins: pass 1, stale 1.
  { id: 'PIN-ORG-CU-01', nodeRef: 'ORG-CU', state: 'pass' },
  { id: 'PIN-ORG-CU-02', nodeRef: 'ORG-CU', state: 'stale' },

  // ORG-RE — 2 pins: fail 1, pending 1.
  { id: 'PIN-ORG-RE-01', nodeRef: 'ORG-RE', state: 'fail' },
  { id: 'PIN-ORG-RE-02', nodeRef: 'ORG-RE', state: 'pending' },

  // ORG-CO — 1 pin: review 1.
  { id: 'PIN-ORG-CO-01', nodeRef: 'ORG-CO', state: 'review' },

  // ORG-FE — 1 pin: pass 1.
  { id: 'PIN-ORG-FE-01', nodeRef: 'ORG-FE', state: 'pass' },

  // ORG-POL — 1 pin: empty 1.
  { id: 'PIN-ORG-POL-01', nodeRef: 'ORG-POL', state: 'empty' },

  // ORG-SEMI — 2 pins: fail 1, review 1.
  { id: 'PIN-ORG-SEMI-01', nodeRef: 'ORG-SEMI', state: 'fail' },
  { id: 'PIN-ORG-SEMI-02', nodeRef: 'ORG-SEMI', state: 'review' },

  // CUS-001 — 2 pins: pass 1, review 1.
  { id: 'PIN-CUS-001-01', nodeRef: 'CUS-001', state: 'pass' },
  { id: 'PIN-CUS-001-02', nodeRef: 'CUS-001', state: 'review' },

  // CUS-003 — 1 pin: pass 1.
  { id: 'PIN-CUS-003-01', nodeRef: 'CUS-003', state: 'pass' },

  // CUS-005 — 1 pin: stale 1.
  { id: 'PIN-CUS-005-01', nodeRef: 'CUS-005', state: 'stale' },

  // CUS-013 — 2 pins: fail 1, pending 1.
  { id: 'PIN-CUS-013-01', nodeRef: 'CUS-013', state: 'fail' },
  { id: 'PIN-CUS-013-02', nodeRef: 'CUS-013', state: 'pending' },
];

/* ---------------------------------------------------------------------------------------------
 * Per-node counts — `src/types/topology.ts` `PinCounts`, AAP 0.2.1
 * ------------------------------------------------------------------------------------------- */

/**
 * How many pins each node carries, by state, for the canvas badge and for
 * `Topology.pinsByNode`.
 *
 * Every entry repeats the tally stated above its group in `EVIDENCE_PINS`, and all six states are
 * keys of every entry — zero included — so a badge renders a state without an existence check. The
 * keys are in `PinState` order. Only nodes that carry at least one pin appear: the topology treats a
 * missing key as no pins at all, so listing an all-zero node would badge it with nothing to show.
 */
export const PINS_BY_NODE: Readonly<Record<string, PinCounts>> = {
  'PLT-RGB': { empty: 0, pending: 1, pass: 2, fail: 0, stale: 0, review: 1 },
  'PLT-BRN': { empty: 0, pending: 0, pass: 1, fail: 2, stale: 1, review: 1 },
  'PLT-QRO': { empty: 1, pending: 0, pass: 1, fail: 0, stale: 0, review: 1 },
  'PLT-RAK': { empty: 0, pending: 0, pass: 2, fail: 0, stale: 0, review: 0 },

  'SUP-HANSA-METALL': { empty: 0, pending: 0, pass: 2, fail: 0, stale: 1, review: 0 },
  'SUP-BAJIO-METALES': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 0, review: 1 },
  'SUP-VLTAVA-GUSS': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 0, review: 1 },
  'SUP-RHEINSTERN-ELEKTRONIK': { empty: 0, pending: 1, pass: 1, fail: 2, stale: 1, review: 0 },
  'SUP-NORDWERK-ANTRIEB': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 1, review: 1 },
  'SUP-DONAU-DICHTUNG': { empty: 0, pending: 0, pass: 2, fail: 0, stale: 0, review: 1 },
  'SUP-MERIDIAN-INDUSTRIAL': { empty: 1, pending: 0, pass: 2, fail: 0, stale: 0, review: 0 },

  'ORG-ALU': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 0, review: 1 },
  'ORG-CU': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 1, review: 0 },
  'ORG-RE': { empty: 0, pending: 1, pass: 0, fail: 1, stale: 0, review: 0 },
  'ORG-CO': { empty: 0, pending: 0, pass: 0, fail: 0, stale: 0, review: 1 },
  'ORG-FE': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 0, review: 0 },
  'ORG-POL': { empty: 1, pending: 0, pass: 0, fail: 0, stale: 0, review: 0 },
  'ORG-SEMI': { empty: 0, pending: 0, pass: 0, fail: 1, stale: 0, review: 1 },

  'CUS-001': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 0, review: 1 },
  'CUS-003': { empty: 0, pending: 0, pass: 1, fail: 0, stale: 0, review: 0 },
  'CUS-005': { empty: 0, pending: 0, pass: 0, fail: 0, stale: 1, review: 0 },
  'CUS-013': { empty: 0, pending: 1, pass: 0, fail: 1, stale: 0, review: 0 },
};
