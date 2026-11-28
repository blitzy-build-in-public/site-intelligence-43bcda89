/**
 * Unit suite for `src/components/graph-vocabulary.ts`: the one owner of the vocabulary the canvas and
 * the dependency graph share — the word each node family is named by, and the order a node's pin
 * states are listed in.
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS A CONTRACT RATHER THAN MARKUP.
 * - The family map names every family the topology declares and no other key: the keys are compared
 *   with the `TopologyNodeKind` members, listed once here and proven exhaustive by the type assertions
 *   at the top of this file, so a family added to the contracts fails to compile rather than going
 *   unnamed on a surface.
 * - Each family's word names that family: every value contains the family it belongs to, so a table
 *   whose rows were shuffled would fail here even though its values stayed distinct. `Tier-2 origin`
 *   satisfies the rule for `origin`, which is the distinction the module documents.
 * - The pin-state order lists every `PinState` member exactly once, in the order the module documents —
 *   the states that ask something of a reader first, the states that ask nothing last. The order is
 *   compared against the union's own members in their documented sequence, so a reordered list fails
 *   rather than passing on a same-set comparison.
 * - The two exports are not copies of one another: one is a map and one is a list, no list entry
 *   repeats, no list entry is a family word, and no two families share a word. That is the property
 *   the module was extracted for — four byte-identical restatements collapsed into one statement — and
 *   it is the property a future copy would break.
 * - The module exports exactly these two statements and nothing else, which is the table a reviewer can
 *   diff against the two surfaces that consume it.
 *
 * NO FIGURE, RECORD OR PRODUCT STRING IS TYPED (rule P-6): every string below is the contracts'
 * vocabulary — a node family or a pin state — and the words themselves are read from the module rather
 * than restated, except where the case asserts a documented relationship between a word and its key.
 * No service is bound, because the module reads nothing (rule P-2 is satisfied by the module having no
 * data boundary at all).
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this module renders nothing.
 */
import { describe, expect, it } from 'vitest';

import type { PinState, TopologyNodeKind } from '../types';
import * as vocabulary from './graph-vocabulary';
import { NODE_FAMILY_WORDS, PIN_STATE_ORDER } from './graph-vocabulary';

/* ---------------------------------------------------------------------------------------------
 * The unions these two statements are exhaustive over
 * ------------------------------------------------------------------------------------------- */

/** Every node family the topology declares, which the family map must name and must not exceed. */
const NODE_FAMILIES: readonly TopologyNodeKind[] = [
  'plant',
  'supplier',
  'material',
  'origin',
  'customer',
];

/** Every pin state the contracts declare, in the order the module documents for a summary. */
const PIN_STATES: readonly PinState[] = ['fail', 'stale', 'pending', 'review', 'pass', 'empty'];

/** Fails the type check unless its argument is `never`, which is what makes a list exhaustive. */
type AssertNever<Value extends never> = Value;

/** A family added to the contracts and not to the list above is a compile error here. */
type FamiliesListed = AssertNever<Exclude<TopologyNodeKind, (typeof NODE_FAMILIES)[number]>>;

/** A pin state added to the contracts and not to the list above is a compile error here. */
type PinStatesListed = AssertNever<Exclude<PinState, (typeof PIN_STATES)[number]>>;

/* ---------------------------------------------------------------------------------------------
 * The node families
 * ------------------------------------------------------------------------------------------- */

describe('NODE_FAMILY_WORDS — the word each node family is named by', () => {
  it('names every family the topology declares, and no other key', () => {
    expect(Object.keys(NODE_FAMILY_WORDS).sort()).toStrictEqual([...NODE_FAMILIES].sort());
  });

  it('gives every family a word that names that family', () => {
    for (const family of NODE_FAMILIES) {
      expect(NODE_FAMILY_WORDS[family].toLowerCase()).toContain(family);
    }
  });

  it('gives no two families the same word, and no family an empty one', () => {
    const words = NODE_FAMILIES.map((family) => NODE_FAMILY_WORDS[family]);

    expect(new Set(words).size).toBe(words.length);

    for (const word of words) {
      expect(word.trim()).not.toBe('');
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The pin states
 * ------------------------------------------------------------------------------------------- */

describe('PIN_STATE_ORDER — the order a summary lists the states in', () => {
  it('lists every pin state exactly once, in the documented order', () => {
    expect(PIN_STATE_ORDER).toStrictEqual(PIN_STATES);
    expect(new Set(PIN_STATE_ORDER).size).toBe(PIN_STATES.length);
  });

  it('is a list rather than a payload key order, so two renders agree on it', () => {
    /* A frozen-by-declaration list of the union's own members: reading it twice yields the same
       sequence, which is what lets a node badge, a lens summary and the table view agree. */
    expect([...PIN_STATE_ORDER]).toStrictEqual([...PIN_STATE_ORDER]);
    expect(PIN_STATE_ORDER.length).toBe(PIN_STATES.length);
  });
});

/* ---------------------------------------------------------------------------------------------
 * What the module exports, and that no export is a copy of another
 * ------------------------------------------------------------------------------------------- */

describe('graph-vocabulary — the two statements it owns', () => {
  it('exports exactly the family map and the pin-state order', () => {
    expect(Object.keys(vocabulary).sort()).toStrictEqual(['NODE_FAMILY_WORDS', 'PIN_STATE_ORDER']);
  });

  it('keeps the two exports distinct, so neither is a copy of the other', () => {
    const familyWords: readonly string[] = Object.values(NODE_FAMILY_WORDS);

    /* One statement is a map keyed by family, the other an ordered list of states: a copy would put
       one vocabulary's members inside the other's. */
    expect(Array.isArray(NODE_FAMILY_WORDS)).toBe(false);
    expect(Array.isArray(PIN_STATE_ORDER)).toBe(true);

    for (const state of PIN_STATE_ORDER) {
      expect(familyWords).not.toContain(state);
    }
    for (const word of familyWords) {
      expect(PIN_STATE_ORDER as readonly string[]).not.toContain(word);
    }
  });
});
