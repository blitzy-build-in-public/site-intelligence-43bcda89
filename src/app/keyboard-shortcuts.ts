/**
 * The keyboard model of the Site Intelligence shell.
 *
 * One shortcut belongs to the shell itself — `/` focuses the identifier search — and this module
 * registers it. The other four keys are owned where the behaviour lives: the data table owns the
 * roving row cursor and activation, and each overlay closes itself and returns focus to its
 * trigger. Registering them here would implement each of them twice, so `KEYBOARD_SHORTCUTS` is the
 * single place the whole model is described and this module registers only its own key.
 *
 * Rules served: B-3 (every interactive element is reachable and operable by keyboard with a visible
 * focus indicator), P-8 (this module adds no control, so it adds no disabled state and must never
 * swallow a key that an `ActionButton`, a dialog or the data table needs).
 */
import { useEffect } from 'react';

/**
 * Marks the identifier search input that `/` focuses.
 *
 * The contract is shared with `src/app/search-field.tsx`, which puts `data-shortcut="search"` on
 * the input it renders. Querying the document for that attribute keeps the shortcut out of the
 * search field's private refs and keeps working when the top bar re-renders, so neither module has
 * to tell the other when it mounts.
 */
export const SEARCH_FIELD_SELECTOR = '[data-shortcut="search"]';

/**
 * One entry of the keyboard model: the keys that trigger it, what it does, and the module that
 * registers the handler for it.
 */
export interface KeyboardShortcut {
  /** The triggering keys, as `KeyboardEvent.key` values. */
  readonly keys: readonly string[];
  /** What the shortcut does, in the product's own words. */
  readonly action: string;
  /**
   * The module that registers this shortcut's handler.
   *
   * - `'shell'` — registered by this module, once per mounted shell.
   * - `'data-table'` — registered by `src/components/data-table.tsx`, which owns the roving row
   *   cursor and the control the cursor sits on.
   * - `'overlay'` — registered by the overlay itself: the evidence drawer, the tooltip and the
   *   simulation popover each close on `Esc` and restore focus to the element that opened them.
   */
  readonly owner: 'shell' | 'data-table' | 'overlay';
}

/**
 * Every shortcut in the keyboard model and the module that implements it.
 *
 * A screen or a test reads this list instead of restating the model, so a shortcut cannot be
 * documented in one place and bound in another.
 */
export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = [
  {
    keys: ['/'],
    action: 'Focus the identifier search',
    owner: 'shell',
  },
  {
    keys: ['J', 'K'],
    action: 'Move the row cursor down/up',
    owner: 'data-table',
  },
  {
    keys: ['Enter'],
    action: 'Open the focused row or control',
    owner: 'data-table',
  },
  {
    keys: ['Esc'],
    action: 'Close a drawer or dialog and return focus to the trigger',
    owner: 'overlay',
  },
];

/**
 * The key this module registers. `Space` and `Enter` are deliberately absent: both activate the
 * focused control, and a global handler that intercepted either would break every button in the
 * application.
 */
const SEARCH_SHORTCUT_KEY = '/';

/**
 * The elements that receive typed characters, and whose own content therefore has to win over a
 * global shortcut. `closest` also matches an element that is inside one, so a `/` typed into a rich
 * text surface stays a character too.
 */
const TYPING_TARGET_SELECTOR =
  'input, textarea, select, [contenteditable="true"]';

/**
 * Whether the event happened in a place that owns the characters the user types.
 */
function ownsTypedCharacters(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(TYPING_TARGET_SELECTOR) !== null
  );
}

/**
 * Focuses the identifier search field.
 *
 * Returns whether focus actually moved, so a caller can tell the difference between a focused field
 * and a route whose top bar renders no search field. The element is found in the document rather
 * than held as a ref, because the shell replaces the top bar between roles and a stale ref would
 * focus nothing.
 */
export function focusSearchField(): boolean {
  const field = document.querySelector(SEARCH_FIELD_SELECTOR);
  if (!(field instanceof HTMLElement)) {
    return false;
  }
  field.focus();
  return document.activeElement === field;
}

/**
 * Registers the shell's own keyboard shortcuts for as long as the calling component is mounted, and
 * removes them when it unmounts.
 *
 * Only `/` is registered here; see `KEYBOARD_SHORTCUTS` for the keys the data table and the
 * overlays own. The listener sits on `document` in the bubble phase, so a control that handles a
 * key itself has already run before this handler sees the event.
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== SEARCH_SHORTCUT_KEY) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (ownsTypedCharacters(event.target)) {
        return;
      }
      event.preventDefault();
      focusSearchField();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
