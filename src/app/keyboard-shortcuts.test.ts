/**
 * Suite for `keyboard-shortcuts.ts`: the keyboard model of the shell (rule B-3), the one key this
 * module registers, and the search field it focuses.
 *
 * WHAT IS ASSERTED, AND WHY EACH CASE IS RELIED ON. `KEYBOARD_SHORTCUTS` is the single place the whole
 * model is described, so the five keys it carries and the module that registers each are pinned here:
 * `/` belongs to the shell, `J`, `K` and `Enter` to the data table, `Esc` to the overlays that close
 * themselves — the module's own spelling of each `KeyboardEvent.key` value, which is what a screen or
 * a test reads instead of restating the model. `focusSearchField()` finds its field through
 * `SEARCH_FIELD_SELECTOR` rather than through a ref, and reports whether focus actually moved, so a
 * route whose top bar renders no search field is told apart from a focused one. `useGlobalShortcuts()`
 * registers `/` and nothing else: pressing `J`, `K`, `Enter` or `Esc` on the document moves nothing of
 * this module, because each belongs to the module that implements it and a second registration would
 * implement it twice. The key is left to the element that owns typed characters — a text input, a
 * textarea, a `contenteditable` host and a child inside one — and to the operating system when
 * Ctrl, Meta or Alt is held, so a browser shortcut and a typed character both survive. The listener is
 * bound on the document for exactly as long as the calling component is mounted and is removed when it
 * unmounts, which is asserted against a search field that stays mounted across the unmount.
 *
 * HOW THE HOOK IS RENDERED IN A `.ts` FILE. A suite beside a `.ts` subject carries no JSX, so the two
 * probe components below are built with `createElement`. The probe that calls the hook renders the
 * surfaces the guards are about; the search field is rendered by a probe of its own, in its own tree,
 * so a case can unmount the hook without taking the field with it.
 *
 * THE FIXTURES CARRY NO PRODUCT WORDING. The search field's attribute is the whole contract between
 * this module and `src/app/search-field.tsx`, and it is asserted against `SEARCH_FIELD_SELECTOR` rather
 * than trusted: the case that presses the key first proves the probe's element is the one the selector
 * names, so a selector that moved would fail here instead of focusing nothing. The keys pressed are
 * read from the model itself; only the model case names them, because pinning them is what that case
 * is for. No figure, amount, date or record identifier appears anywhere in this file (rule P-6).
 *
 * No axe assertion runs here: rule B-3's axe pass belongs to the browser suite on every route (AAP
 * §0.7, T-16), and this suite proves keyboard operability rather than auditing it.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';

import {
  KEYBOARD_SHORTCUTS,
  SEARCH_FIELD_SELECTOR,
  focusSearchField,
  useGlobalShortcuts,
} from './keyboard-shortcuts';
import type { KeyboardShortcut } from './keyboard-shortcuts';

/* ---------------------------------------------------------------------------------------------
 * The fixtures — nothing here is product wording
 * ------------------------------------------------------------------------------------------- */

/** The accessible name of the probe's search field, which is the field the shortcut focuses. */
const SEARCH_FIELD_LABEL = 'The identifier search of the probe';

/**
 * The five keys the model fixes, in the order the module documents them, each with the module that
 * registers its handler.
 *
 * A table rather than a string: the assertion a case makes is about one key's owner, and a case per
 * key names the key that went wrong instead of reporting the model as a whole.
 */
const KEY_OWNERS: readonly (readonly [string, KeyboardShortcut['owner']])[] = [
  ['/', 'shell'],
  ['J', 'data-table'],
  ['K', 'data-table'],
  ['Enter', 'data-table'],
  ['Esc', 'overlay'],
];

/**
 * The key this module registers, taken from the model rather than typed again.
 *
 * The model and the listener have to agree — a model that named another key for the shell, or a
 * listener bound to another key, fails the cases below — so the key a case presses is the one the model
 * says the shell owns.
 */
const SHELL_KEYS = KEYBOARD_SHORTCUTS.filter((entry) => entry.owner === 'shell').flatMap(
  (entry) => entry.keys,
);

/** The one key the shell owns. */
const SHELL_KEY = atIndex(SHELL_KEYS, 0);

/** Every key the model gives to another module, which this one must therefore never act on. */
const OTHER_KEYS = KEYBOARD_SHORTCUTS.filter((entry) => entry.owner !== 'shell').flatMap(
  (entry) => entry.keys,
);

/** The three modifiers a browser or the operating system may hold while a key is pressed. */
const MODIFIERS: readonly (readonly [string, 'ctrlKey' | 'metaKey' | 'altKey'])[] = [
  ['Ctrl', 'ctrlKey'],
  ['Meta', 'metaKey'],
  ['Alt', 'altKey'],
];

/** One surface that owns the characters typed into it, and the label a case reaches it by. */
interface TypingHost {
  /** How the case's title names the surface. */
  readonly title: string;

  /** The accessible name the probe gives it. */
  readonly label: string;
}

/** The four surfaces whose typing must survive the global shortcut. */
const TYPING_HOSTS: readonly TypingHost[] = [
  { title: 'a text input', label: 'Typing host: a text input' },
  { title: 'a text area', label: 'Typing host: a text area' },
  { title: 'a contenteditable host', label: 'Typing host: a contenteditable host' },
  {
    title: 'a child element inside a contenteditable host',
    label: 'Typing host: a child inside a contenteditable host',
  },
];

/* ---------------------------------------------------------------------------------------------
 * The probes
 * ------------------------------------------------------------------------------------------- */

/** One member of a list a case indexes, with the miss reported rather than surfacing as `undefined`. */
function atIndex<Item>(items: readonly Item[], index: number): Item {
  const item = items[index];

  if (item === undefined) {
    throw new Error(`The model declares nothing at position ${index}.`);
  }

  return item;
}

/**
 * The search field, mounted in a tree of its own: the element `SEARCH_FIELD_SELECTOR` names.
 *
 * Its own tree so a case can unmount the hook's probe while this field stays on the page, which is what
 * makes "the listener was removed" observable rather than indistinguishable from "the field went away".
 */
function SearchFieldProbe(): ReactElement {
  return createElement('input', {
    type: 'search',
    'aria-label': SEARCH_FIELD_LABEL,
    'data-shortcut': 'search',
  });
}

/**
 * The component that registers the shortcuts, over the four surfaces whose typed characters must win.
 *
 * It renders the hosts rather than nothing, because the guard is about an event's own target: a case
 * dispatches the key on one of these elements and asserts where focus stayed.
 */
function ShortcutProbe(): ReactElement {
  useGlobalShortcuts();

  return createElement(
    'div',
    null,
    createElement('input', {
      type: 'text',
      'aria-label': atIndex(TYPING_HOSTS, 0).label,
    }),
    createElement('textarea', { 'aria-label': atIndex(TYPING_HOSTS, 1).label }),
    createElement(
      'div',
      {
        contentEditable: true,
        suppressContentEditableWarning: true,
        tabIndex: -1,
        'aria-label': atIndex(TYPING_HOSTS, 2).label,
      },
      createElement(
        'span',
        { tabIndex: -1, 'aria-label': atIndex(TYPING_HOSTS, 3).label },
        'editable text',
      ),
    ),
  );
}

/** The search field the shortcut focuses, read by its own label. */
function searchField(): HTMLElement {
  return screen.getByLabelText(SEARCH_FIELD_LABEL);
}

/* ---------------------------------------------------------------------------------------------
 * The model — rule B-3
 * --------------------------------------------------------------------------------------------- */

describe('KEYBOARD_SHORTCUTS — the keyboard model', () => {
  it('describes the five keys of the model in the order the module documents them', () => {
    expect(KEYBOARD_SHORTCUTS.flatMap((entry) => entry.keys)).toEqual(
      KEY_OWNERS.map(([key]) => key),
    );
    expect(KEYBOARD_SHORTCUTS).toHaveLength(4);
    expect(SHELL_KEYS).toHaveLength(1);
    expect(OTHER_KEYS).toHaveLength(4);
  });

  it.each(KEY_OWNERS)('gives %s to the module that registers it', (key, owner) => {
    const declaring = KEYBOARD_SHORTCUTS.filter((entry) => entry.keys.includes(key));

    expect(declaring).toHaveLength(1);
    expect(atIndex(declaring, 0).owner).toBe(owner);
    expect(atIndex(declaring, 0).action.length).toBeGreaterThan(0);
  });

  it('describes no key twice, so no key is bound by two modules', () => {
    const keys = KEYBOARD_SHORTCUTS.flatMap((entry) => entry.keys);

    expect(new Set(keys).size).toBe(keys.length);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The search field the shortcut reaches — rule B-3
 * --------------------------------------------------------------------------------------------- */

describe('focusSearchField', () => {
  it('focuses the field the selector names and reports that focus moved', () => {
    render(createElement(SearchFieldProbe));

    const field = searchField();

    expect(document.querySelector(SEARCH_FIELD_SELECTOR)).toBe(field);
    expect(focusSearchField()).toBe(true);
    expect(field).toHaveFocus();
  });

  it('reports that nothing was focused when no field carries the selector', () => {
    render(createElement(ShortcutProbe));

    expect(document.querySelector(SEARCH_FIELD_SELECTOR)).toBeNull();
    expect(focusSearchField()).toBe(false);
  });
});

/* ---------------------------------------------------------------------------------------------
 * The one key this module registers — rule B-3, rule P-8
 * --------------------------------------------------------------------------------------------- */

describe('useGlobalShortcuts', () => {
  it('focuses the identifier search when the shell key is pressed on the document', () => {
    render(createElement(SearchFieldProbe));
    render(createElement(ShortcutProbe));

    fireEvent.keyDown(document, { key: SHELL_KEY });

    expect(searchField()).toHaveFocus();
  });

  it.each(OTHER_KEYS)(
    'leaves the identifier search alone when %s is pressed on the document',
    (key) => {
      render(createElement(SearchFieldProbe));
      render(createElement(ShortcutProbe));

      fireEvent.keyDown(document, { key });

      expect(searchField()).not.toHaveFocus();
    },
  );

  it.each(TYPING_HOSTS)('leaves the character to the surface it was typed in: $title', ({ label }) => {
    render(createElement(SearchFieldProbe));
    render(createElement(ShortcutProbe));

    const host = screen.getByLabelText(label);

    host.focus();
    fireEvent.keyDown(host, { key: SHELL_KEY });

    expect(host).toHaveFocus();
    expect(searchField()).not.toHaveFocus();
  });

  it.each(MODIFIERS)('leaves the identifier search alone while %s is held', (_title, modifier) => {
    render(createElement(SearchFieldProbe));
    render(createElement(ShortcutProbe));

    const init: KeyboardEventInit = { key: SHELL_KEY };
    init[modifier] = true;

    fireEvent.keyDown(document, init);

    expect(searchField()).not.toHaveFocus();
  });

  it('removes its listener when the calling component unmounts', () => {
    render(createElement(SearchFieldProbe));
    const probe = render(createElement(ShortcutProbe));

    fireEvent.keyDown(document, { key: SHELL_KEY });

    expect(searchField()).toHaveFocus();

    searchField().blur();

    expect(searchField()).not.toHaveFocus();

    probe.unmount();
    fireEvent.keyDown(document, { key: SHELL_KEY });

    expect(searchField()).not.toHaveFocus();
  });
});
