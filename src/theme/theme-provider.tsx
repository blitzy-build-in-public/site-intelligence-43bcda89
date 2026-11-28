/**
 * The single owner of the `data-theme` and `data-density` attributes on `<html>`, and of the only
 * two preferences the application persists.
 *
 * Fixed by specification §4.1-§4.3 (the two themes and the 32 px / 44 px density scale), contracts
 * §1 (state lives in memory, with theme and density the only values written to browser storage),
 * AAP 0.5.3 (Command is the default theme) and AAP 0.12.4 (the density each persona starts on).
 *
 * Both attributes are applied while this module is first evaluated, before any component renders, and
 * this module stays their only writer: `index.html` and `src/main.tsx` set nothing, and
 * `src/theme/command.css`, `paper.css` and `tokens.css` select on `[data-theme="command"|"paper"]`
 * and `[data-density="compact"|"comfortable"]`. A module script is deferred until its bundle has been
 * fetched and parsed, so the first painted frame is the stylesheet's doing rather than this module's:
 * `command.css` declares the Command palette on `:root` and `tokens.css` declares `--row-height`
 * there, which is why that frame already carries a theme and a density — and the density it carries is
 * the compact row the seeded persona, USR-01 the material planner, starts on (AAP 0.12.4), so a session
 * that persisted no density is not corrected after paint. A session that persisted Paper, or a density
 * other than that one, repaints when this module is evaluated, so a stored choice lands at the first
 * repaint rather than at the first frame.
 *
 * The `data-theme` and `data-density` vocabularies are declared once, in `src/types/primitives.ts`,
 * as `ThemeName` and `Density`. This module imports them and re-exports them under the names the
 * theme switch, the density switch and this module's own API use, so the provider and both theme
 * files read one declaration: a value added to the vocabulary reaches all of them from that single
 * place instead of leaving one of them out of step.
 *
 * Rules served: B-1 (this module reaches only `document` and `localStorage` and fetches nothing),
 * B-2 (it reads no environment value and holds no configuration; the two storage keys are code
 * constants), B-3 (it renders no control, sets no `tabIndex` and touches no focus styling, so the
 * switches it serves stay keyboard-operable with their focus ring intact), P-2 (it imports no seed
 * record — its only repository imports are the type vocabulary of `src/types`: the `Role` it maps
 * to a density, and the theme and density names it re-exports) and P-6 (the only values stated here
 * are the design defaults `command` and `compact`).
 */
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement, ReactNode } from 'react';

import type { Role } from '../types/entities';
import type { Density, ThemeName as Theme } from '../types/primitives';

/* ---------------------------------------------------------------------------------------------
 * Attribute values
 * ------------------------------------------------------------------------------------------- */

/**
 * The value of the `data-theme` attribute on `<html>`: the dark Command theme a first-time visitor
 * sees, or the light Paper theme that matches the public website and is the one screenshots and
 * print use (AAP 0.5.3).
 *
 * `src/theme/command.css` and `src/theme/paper.css` each select on one of these exact values, so a
 * value added to the vocabulary without a matching block would leave the page on the Command palette
 * `command.css` declares for the document instead of the theme the value names.
 */
export type { Theme };

/**
 * The value of the `data-density` attribute on `<html>`, selecting the 32 px (`compact`) or 44 px
 * (`comfortable`) row height that `src/theme/tokens.css` derives `--row-height` from.
 */
export type { Density };

/**
 * Browser-storage key of the chosen theme: one of the only two keys the application ever writes
 * (contracts §1). No seed record, role, scope, selection or audit state is persisted.
 */
export const THEME_STORAGE_KEY = 'site-intelligence:theme';

/**
 * Browser-storage key of the chosen density: the second and last key the application writes
 * (contracts §1).
 */
export const DENSITY_STORAGE_KEY = 'site-intelligence:density';

/**
 * The name each theme is offered under in the theme switch, in the product's own words.
 */
export const THEME_LABELS: Readonly<Record<Theme, string>> = {
  command: 'Command',
  paper: 'Paper',
};

/**
 * The name each density is offered under in the density switch.
 */
export const DENSITY_LABELS: Readonly<Record<Density, string>> = {
  compact: 'Compact',
  comfortable: 'Comfortable',
};

/* ---------------------------------------------------------------------------------------------
 * Defaults
 * ------------------------------------------------------------------------------------------- */

/** Command is the theme a first-time visitor sees (AAP 0.5.3). */
const DEFAULT_THEME: Theme = 'command';

/**
 * The density in force while no persona is, which is the density the seeded persona starts on.
 *
 * The provider reads it from its first render until the service boundary's start-up read reports the
 * persona in force, and that persona is USR-01, the material planner, who starts on compact rows
 * (AAP 0.12.4). The pre-persona frame therefore already carries the row height the session keeps, and
 * is not corrected after paint. A density the reader has chosen always outranks it, and once a persona
 * is known `defaultDensityForRole` decides.
 */
const DEFAULT_DENSITY: Density = 'compact';

/**
 * The density each persona starts on (AAP 0.12.4: compact rows for planners and the supplier
 * quality engineer, comfortable rows otherwise; specification §3 for the personas themselves).
 *
 * Exhaustive by construction: a `Role` member added to `src/types/entities.ts` without an entry
 * here fails the type check instead of silently falling through to a default.
 */
const DENSITY_BY_ROLE: Record<Role, Density> = {
  /** USR-01, material planner: works a long exception queue. */
  'material-planner': 'compact',
  /** USR-02, plant manager. */
  'plant-manager': 'comfortable',
  /** USR-03, head of supply chain. */
  'head-of-supply-chain': 'comfortable',
  /** USR-04, platform administrator. */
  'platform-administrator': 'comfortable',
  /** USR-05, production planner: works a long exception queue. */
  'production-planner': 'compact',
  /** USR-06, auditor. */
  auditor: 'comfortable',
  /** USR-07, supplier quality engineer: works a long exception queue. */
  'supplier-quality-engineer': 'compact',
  /** USR-08, external supplier engineer. */
  'external-supplier-engineer': 'comfortable',
};

/* ---------------------------------------------------------------------------------------------
 * Persistence and attribute application — private to this module
 * ------------------------------------------------------------------------------------------- */

/**
 * The pair of attributes this module owns, kept together so a setter always reads the value
 * currently on screen rather than a stale half of it.
 */
interface Preferences {
  readonly theme: Theme;
  readonly density: Density;
}

/**
 * Reads one stored string, or `null` when there is none.
 *
 * Storage is wrapped rather than trusted: `localStorage` throws in a locked-down browser (blocked
 * cookies, an exhausted quota, private-mode policies), and a preference that cannot be read has to
 * leave the default in place instead of breaking the render.
 */
function readStored(storageKey: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

/**
 * Persists one preference.
 *
 * A write that fails leaves the choice in effect for the session and only loses the persisted copy,
 * so the failure is swallowed: there is nothing the reader could do about it, and nothing on screen
 * depends on the write having succeeded.
 */
function writeStored(storageKey: string, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    // The preference still applies to this session; only the persisted copy is lost.
  }
}

/**
 * The stored theme, or `null` when nothing valid is stored.
 *
 * A value outside the union is discarded rather than applied, so a hand-edited or abandoned entry
 * cannot put a garbage attribute on `<html>` and leave both palette blocks unmatched.
 */
function readStoredTheme(): Theme | null {
  const stored = readStored(THEME_STORAGE_KEY);
  return stored === 'command' || stored === 'paper' ? stored : null;
}

/** The stored density, or `null` when nothing valid is stored, on the same rule as the theme. */
function readStoredDensity(): Density | null {
  const stored = readStored(DENSITY_STORAGE_KEY);
  return stored === 'compact' || stored === 'comfortable' ? stored : null;
}

/**
 * Puts both attributes on `<html>` together.
 *
 * They are written as a pair because each theme file sets the other's `color-scheme` and the
 * density decides every row height, so changing one without the other for a frame repaints a table
 * at the wrong height. An environment without a DOM — a `node` test suite importing this module —
 * is left untouched rather than given a document global it did not ask for.
 */
function applyPreferences(theme: Theme, density: Density): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.density = density;
}

/*
 * Module initialisation, before the first component renders: the persisted preference when it is
 * valid, the defaults otherwise. Importing this module is what puts the chosen preference on the page
 * over the stylesheet's document default, so no entry point has to remember to do it.
 */
applyPreferences(readStoredTheme() ?? DEFAULT_THEME, readStoredDensity() ?? DEFAULT_DENSITY);

/* ---------------------------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------------------------- */

/**
 * The density a persona starts on when the reader has chosen no density of their own
 * (AAP 0.12.4).
 *
 * `compact` for the material planner, the production planner and the supplier quality engineer, who
 * work a long exception queue; `comfortable` for the other five personas.
 */
export function defaultDensityForRole(role: Role): Density {
  const recorded: Density | undefined = DENSITY_BY_ROLE[role];
  return recorded ?? DEFAULT_DENSITY;
}

/**
 * What `useTheme` hands a consumer: the two attribute values currently in effect and the setters
 * that change them.
 */
interface ThemeContextValue {
  readonly theme: Theme;
  readonly density: Density;
  readonly setTheme: (next: Theme) => void;
  readonly setDensity: (next: Density) => void;
}

/** A `null` default: a consumer outside the provider is a mistake, and `useTheme` says so. */
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * What the shell wraps in the theme: the content rendered under it, and the density the persona in
 * force starts on (AAP 0.12.4).
 *
 * `defaultDensity` is a starting point rather than an instruction, because a density the reader has
 * chosen always outranks it, and it is optional because a shell with no persona yet has none to hand
 * over: a caller omits it rather than passing `undefined`, which `exactOptionalPropertyTypes` keeps
 * distinct. This provider is the only reader of the two persisted preferences, so no caller passes
 * them (contracts §1).
 */
interface ThemeProviderProps {
  readonly children: ReactNode;
  /**
   * The density the active persona starts on, normally `defaultDensityForRole(activeRole)`.
   * A density the reader has chosen always takes precedence over it.
   */
  readonly defaultDensity?: Density;
}

/**
 * Supplies the theme and density to the shell and keeps `<html>` in step with them.
 *
 * State is read from storage on mount, the density follows the persona while the reader has chosen
 * none, and the single layout effect applies the pair before the browser paints — which is what
 * puts a persona-derived density on screen without a frame at the previous row height.
 */
export function ThemeProvider({ children, defaultDensity }: ThemeProviderProps): ReactElement {
  const [theme, setThemeState] = useState<Theme>(() => readStoredTheme() ?? DEFAULT_THEME);
  const [chosenDensity, setChosenDensity] = useState<Density | null>(() => readStoredDensity());

  const density: Density = chosenDensity ?? defaultDensity ?? DEFAULT_DENSITY;

  /*
   * The pair last applied. A setter called between two renders updates the half that did not change
   * from the value on screen, so switching theme never reverts the density and vice versa.
   */
  const applied = useRef<Preferences>({ theme, density });

  useLayoutEffect(() => {
    applied.current = { theme, density };
    applyPreferences(theme, density);
  }, [theme, density]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    writeStored(THEME_STORAGE_KEY, next);
    applyPreferences(next, applied.current.density);
  }, []);

  const setDensity = useCallback((next: Density) => {
    setChosenDensity(next);
    writeStored(DENSITY_STORAGE_KEY, next);
    applyPreferences(applied.current.theme, next);
  }, []);

  /*
   * One stable context object per state change, so a consumer re-renders on a new theme or density
   * and not on an unrelated render of the shell above it.
   */
  const value = useMemo<ThemeContextValue>(
    () => ({ theme, density, setTheme, setDensity }),
    [theme, density, setTheme, setDensity],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * The theme and density in effect, with the setters that change them.
 *
 * Called outside `ThemeProvider` it throws instead of returning a default, because a silent default
 * would wire a theme switch to nothing and leave the reader clicking a control that does nothing.
 */
export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }
  return value;
}
