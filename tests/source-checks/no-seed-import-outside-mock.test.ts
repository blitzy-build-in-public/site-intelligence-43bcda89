// @vitest-environment node

/**
 * Rule P-2 source check: seed records are reachable only through the mock adapter.
 *
 * WHAT IT PROVES. `src/seed/` holds the demonstration's synthetic records, and rule P-2 allows them to
 * be read by the in-browser mock adapter and by nothing else — "Components and screens never import
 * seed data". AAP 0.13.2 makes `src/services/mock/seed-loader.ts` the one door, and AAP 0.8 states the
 * property this module exists to keep: "`seed-loader.ts` is the only module that imports from
 * `src/seed/` ... nothing else in the application can reach a record". A screen that reached a record
 * directly would still pass every type check and every rendering test, so the boundary needs a
 * mechanical check rather than a convention: this module reads every TypeScript source under `src/`,
 * extracts every module specifier it references, resolves each one lexically, and fails on any import
 * of `src/seed` that the two permitted importers below do not own. It is the static half of AAP 0.9's
 * source-check table and the whole of T-18, which AAP 0.7 assigns to "Static source check and type
 * check" with no browser test; success criterion 8 is what reads it.
 *
 * HOW IT READS THE SOURCES. `import.meta.glob` with `?raw` collects each file's text at collection
 * time, so the scan sees a file exactly as a reader does, comment and all, and needs no file system
 * access: `tsconfig.json` declares `types: ["vite/client"]` and no `@types/node`, so `node:fs` is not
 * available and is not wanted (rules B-1 and B-2 — nothing here reads a file over a boundary or a
 * configuration value). The keys the glob yields are relative to this module, and the one pure helper
 * below turns them into repository paths.
 *
 * WHY EXACTLY TWO PERMITTED IMPORTERS, AND NO THIRD. `src/seed/` itself must import its siblings, and
 * `src/services/mock/` is the adapter rule P-2 names as the one reader — AAP 0.12.1 and AAP 0.13.2 put
 * the loader there. Every other module, a test module included, is a violation, and the set is
 * exhaustive rather than a starting point: `src/services/service-conformance.test.ts` needs the
 * seeded audit count, and it obtains it through `./mock/seed-loader` instead of importing the seed, so
 * no test suite has to be added to keep the gate honest. Adding a third importer would let a screen
 * reach a record through an intermediate module, which is the shortcut this check exists to catch.
 *
 * WHY THE SPECIFIERS ARE RESOLVED RATHER THAN MATCHED. Imports are written extensionless under
 * `moduleResolution: "bundler"`, the project declares no path alias, and a seed record can therefore
 * be named as `'../seed/plants'`, `'../../seed'`, `'../../seed/index'` or `'./exceptions'` from inside
 * the folder. Matching text would miss half of those and would flag a comment that merely quotes one,
 * so the check extracts the quoted specifier from every import and re-export form, masks comments
 * first, and resolves the relative path against the importing file's directory with the extension
 * candidates a bundler would try. A bare specifier such as `'react'` cannot name the folder, so it is
 * left alone.
 *
 * WHAT IT DOES NOT DO. It types no figure and no record identifier — the only literals are the folder
 * paths, the module extensions and the patterns themselves (rule P-6). It reads text only: it imports
 * no application module, reads no seed record and holds no state between cases. It names no company,
 * product or person (rule P-7), claims nothing about what the demonstration establishes (rule P-4),
 * and carries no commented-out code (AAP 0.18.1). Every failure message names the file, the line and
 * the specifier, because a scan that reports its first offender only hides the rest of them.
 */

import { describe, expect, it } from 'vitest';

/* ---------------------------------------------------------------------------------------------
 * The sources this check reads
 * ------------------------------------------------------------------------------------------- */

/**
 * Every TypeScript module under `src/`, read as raw text at collection time.
 *
 * `?raw` reads a module's bytes without evaluating it, so the check sees the source rather than its
 * exports — which is the whole point, because an import that a screen should not have is still an
 * import after the type checker has accepted it. Keys are relative to this module
 * (`'../../src/app/app.tsx'`).
 */
const SOURCE_MODULES: Record<string, string> = import.meta.glob<string>('../../src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * The two modules the check cannot work without, so a rename fails here rather than passing silently.
 *
 * `src/services/mock/seed-loader.ts` is the permitted importer (AAP 0.8, AAP 0.12.1) and
 * `src/seed/index.ts` is the folder's barrel, the module the loader names. If either path changes,
 * the guards below report the missing anchor instead of the scan finding nothing to judge and
 * reporting success.
 */
const ANCHOR_MODULES: readonly string[] = [
  'src/services/mock/seed-loader.ts',
  'src/seed/index.ts',
];

/* ---------------------------------------------------------------------------------------------
 * The vocabulary: the folder under guard, the permitted importers, the extensions to try
 * ------------------------------------------------------------------------------------------- */

/** The one folder rule P-2 keeps behind the adapter, as a repository path. */
const SEED_FOLDER = 'src/seed';

/**
 * The importers a seed import is permitted from, and the whole of the permitted set.
 *
 * These are the two cases AAP 0.9 fixes: a seed module reaching its siblings, and the mock adapter
 * reaching the record set through the loader. They are exhaustive by design — see the module header.
 */
const PERMITTED_IMPORTER_FOLDERS: readonly string[] = [SEED_FOLDER, 'src/services/mock'];

/** The extensions a bundler appends to an extensionless specifier, in the order it tries them. */
const MODULE_EXTENSIONS: readonly string[] = ['.ts', '.tsx'];

/** The barrel files a bundler falls back to when a specifier names a directory. */
const BARREL_FILES: readonly string[] = ['index.ts', 'index.tsx'];

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

/**
 * One module specifier a file references, with the line it sits on.
 *
 * The line is one-based so a failure message points at the line a reader opens.
 */
interface Specifier {
  /** The specifier as written, without its quotes. */
  readonly specifier: string;
  /** One-based line number of the specifier, so a failure names the line to open. */
  readonly line: number;
}

/**
 * A path with `.` segments dropped and `..` segments applied, in repository-relative form.
 *
 * The helper does the two jobs this check needs from one place, and neither of them through a Node
 * path module (see the module header on why none is available): it turns a glob key such as
 * `'../../src/app/app.tsx'` into `'src/app/app.tsx'`, and it collapses a specifier joined onto its
 * importing directory into the path a reader would open. A `..` above the repository root is dropped
 * rather than allowed to escape it.
 *
 * @param path The path to normalise, relative or glob-key form.
 * @returns The normalised, repository-relative path, without a leading `./`, `/` or `../`.
 */
function normalisePath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return segments.join('/');
}

/**
 * The directory a file sits in, as a repository-relative path; empty for a file at the root.
 *
 * @param path The file's repository-relative path.
 * @returns Its directory, or an empty string when the file sits at the repository root.
 */
function directoryOf(path: string): string {
  const lastSeparator = path.lastIndexOf('/');

  return lastSeparator === -1 ? '' : path.slice(0, lastSeparator);
}

/**
 * A source text with its comments blanked out, character for character.
 *
 * WHY THE MASK EXISTS. The sources discuss their own imports in prose — this file does it, the adapter
 * does it, `src/seed/index.ts` does it — and prose that quotes `from '../seed/plants'` is not an
 * import. Without the mask a comment recommending the wrong import would fail the gate, and the
 * pressure would then be to exempt the file rather than fix the comment. Masking is length- and
 * line-preserving (a newline stays a newline, every other masked character becomes a space), so a
 * specifier's reported line number is the line it is written on. A `//` inside a string literal is
 * masked with the rest of its line, which can only hide an import sharing that line — never the
 * statement it sits in, which a formatted source keeps on its own line.
 *
 * @param text The source text to mask.
 * @returns The same text with comment content replaced by spaces.
 */
function maskComments(text: string): string {
  const masked: string[] = [];
  let index = 0;

  while (index < text.length) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '/' && next === '/') {
      while (index < text.length && text[index] !== '\n') {
        masked.push(' ');
        index += 1;
      }
    } else if (character === '/' && next === '*') {
      masked.push(' ', ' ');
      index += 2;
      while (index < text.length && !(text[index] === '*' && text[index + 1] === '/')) {
        masked.push(text[index] === '\n' ? '\n' : ' ');
        index += 1;
      }
      if (index < text.length) {
        masked.push(' ', ' ');
        index += 2;
      }
    } else {
      masked.push(character ?? '');
      index += 1;
    }
  }

  return masked.join('');
}

/**
 * The forms a module specifier is written in, each capturing the quote and the specifier.
 *
 * Every pattern is a source-text scan rather than an AST walk, because no parser is a dependency of
 * this project and a scan is enough to see a specifier that the type checker would accept. The four
 * cover the whole vocabulary a module uses: an import or re-export clause (static, `import type`,
 * `export type`, `export *`, and a clause broken across lines), a side-effect import, a dynamic
 * import, and a test double — `vi.mock`, its deferred `vi.doMock` form and `vi.importMock`. Each
 * captures the specifier in group 2, accepts `'`, `"` or a substitution-free `` ` ``, and requires the
 * closing quote to match the one that opened it. The clause pattern's middle class excludes the
 * semicolon and every quote character, so it cannot run past the statement it belongs to.
 */
const SPECIFIER_PATTERNS: readonly RegExp[] = [
  /(?<![\w$.])(?:import|export)\s+(?:type\s+)?[^;'"`]*?from\s*(['"`])([^'"`\r\n]+)\1/g,
  /(?<![\w$.])import\s*(['"`])([^'"`\r\n]+)\1/g,
  /(?<![\w$.])import\s*\(\s*(['"`])([^'"`\r\n]+)\1/g,
  /\bvi\s*\.\s*(?:mock|doMock|importMock)\s*\(\s*(['"`])([^'"`\r\n]+)\1/g,
];

/** The capture-group index of the specifier in every pattern above. */
const SPECIFIER_GROUP = 2;

/**
 * Every module specifier one source text references, in line order and without duplicates.
 *
 * The patterns are rebuilt from their own source and flags for every call, so a `lastIndex` left
 * behind by an earlier scan of a shared `RegExp` cannot make a later one skip matches — the failure
 * mode that would turn this check into one that reports nothing.
 *
 * @param text The source text to scan.
 * @returns Each specifier the text references, with the line it sits on.
 */
function specifiersOf(text: string): Specifier[] {
  const masked = maskComments(text);
  const found = new Map<string, Specifier>();

  for (const pattern of SPECIFIER_PATTERNS) {
    const scan = new RegExp(pattern.source, pattern.flags);
    let match = scan.exec(masked);

    while (match !== null) {
      const specifier = match[SPECIFIER_GROUP];

      if (specifier !== undefined && specifier !== '') {
        const offset = match.index + match[0].indexOf(specifier);
        const line = masked.slice(0, offset).split('\n').length;
        const key = `${line}:${specifier}`;

        if (!found.has(key)) {
          found.set(key, { specifier, line });
        }
      }

      if (match[0] === '') {
        // No pattern above can match an empty string, but a zero-length match would spin the loop
        // forever, so it is stepped over rather than trusted not to occur.
        scan.lastIndex += 1;
      }
      match = scan.exec(masked);
    }
  }

  return [...found.values()].sort((left, right) =>
    left.line === right.line
      ? left.specifier.localeCompare(right.specifier)
      : left.line - right.line,
  );
}

/* ---------------------------------------------------------------------------------------------
 * Resolution and the decision
 * ------------------------------------------------------------------------------------------- */

/**
 * The path a relative specifier names, resolved the way a bundler resolves it.
 *
 * The importer's directory is joined with the specifier and normalised, then the candidates are tried
 * in the order `moduleResolution: "bundler"` tries them: the path as written, the path with each
 * module extension, then the directory's barrel file. The set of paths the collection actually holds
 * decides which candidate exists, because this check reads text and never the file system; when none
 * of them is present the normalised path is returned, which still lets the decision below recognise a
 * specifier that names the seed folder even if the collection is incomplete.
 *
 * @param importerPath Repository path of the file holding the specifier.
 * @param specifier The specifier as written, without its quotes.
 * @param knownPaths Every repository path the collection holds.
 * @returns The resolved repository path.
 */
function resolveModulePath(
  importerPath: string,
  specifier: string,
  knownPaths: ReadonlySet<string>,
): string {
  const directory = directoryOf(importerPath);
  const base = normalisePath(`${directory}/${specifier}`);
  const candidates: string[] = [
    base,
    ...MODULE_EXTENSIONS.map((extension) => base + extension),
    ...BARREL_FILES.map((barrel) => `${base}/${barrel}`),
  ];

  return candidates.find((candidate) => knownPaths.has(candidate)) ?? base;
}

/**
 * Whether a path is a folder itself or sits inside it.
 *
 * The separator is part of the comparison, so `src/seedling.ts` is not mistaken for a member of
 * `src/seed`.
 *
 * @param path The repository path to test.
 * @param folder The folder to test it against.
 * @returns True when the path is the folder or sits beneath it.
 */
function isInFolder(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}

/**
 * The seed specifiers one file references, and only those.
 *
 * Two conditions are applied before anything is reported. Only a relative specifier can name the
 * folder — the project declares no path alias — so a bare specifier such as `'react'` or `'vitest'` is
 * dropped without being resolved. The rest are resolved and kept when the result is `src/seed` or a
 * module inside it.
 *
 * @param importerPath Repository path of the file holding the specifiers.
 * @param text That file's source text.
 * @param knownPaths Every repository path the collection holds.
 * @returns The seed specifiers the file references, with their lines.
 */
function seedSpecifiersOf(
  importerPath: string,
  text: string,
  knownPaths: ReadonlySet<string>,
): Specifier[] {
  return specifiersOf(text).filter(
    (entry) =>
      entry.specifier.startsWith('.') &&
      isInFolder(resolveModulePath(importerPath, entry.specifier, knownPaths), SEED_FOLDER),
  );
}

/**
 * Whether a file is one of the two permitted importers of the seed folder.
 *
 * @param importerPath Repository path of the importing file.
 * @returns True when the file sits in `src/seed` or in `src/services/mock`.
 */
function isPermittedImporter(importerPath: string): boolean {
  return PERMITTED_IMPORTER_FOLDERS.some((folder) => isInFolder(importerPath, folder));
}

/**
 * The seed imports one file is not permitted to make, as reportable lines.
 *
 * A permitted importer produces none. Every other file produces one line per seed specifier, of the
 * shape `<path>:<line> imports <specifier>`, so one run names every offender in the tree rather than
 * only the first — a scan that stops at the first is a scan an author fixes one push at a time.
 *
 * @param importerPath Repository path of the importing file.
 * @param text That file's source text.
 * @param knownPaths Every repository path the collection holds.
 * @returns One line per violating import; empty when the file is compliant.
 */
function violationsOf(
  importerPath: string,
  text: string,
  knownPaths: ReadonlySet<string>,
): string[] {
  if (isPermittedImporter(importerPath)) {
    return [];
  }

  return seedSpecifiersOf(importerPath, text, knownPaths).map(
    (entry) => `${importerPath}:${entry.line} imports ${entry.specifier}`,
  );
}

/* ---------------------------------------------------------------------------------------------
 * The collected tree
 * ------------------------------------------------------------------------------------------- */

/** Every source the check reads, keyed by repository path. */
const SOURCES_BY_PATH: ReadonlyMap<string, string> = new Map(
  Object.entries(SOURCE_MODULES).map(([globKey, text]) => [normalisePath(globKey), text]),
);

/** Every repository path under `src/`, which is what specifiers are resolved against. */
const TREE_PATHS: ReadonlySet<string> = new Set(SOURCES_BY_PATH.keys());

/**
 * One collected source, or a failure naming the path when the collection does not hold it.
 *
 * @param repositoryPath The repository path to read.
 * @returns That module's source text.
 * @throws Error when the collection holds no module at that path, because a renamed anchor has to
 *   fail the guard that names it rather than quietly leaving the scan with nothing to judge.
 */
function textOf(repositoryPath: string): string {
  const text = SOURCES_BY_PATH.get(repositoryPath);

  if (text === undefined) {
    throw new Error(`The scan did not read ${repositoryPath}, so the guard for it cannot run.`);
  }

  return text;
}

/**
 * Every violation under `src/`, in path order.
 *
 * @returns One line per seed import no permitted importer owns; empty when the boundary holds.
 */
function violationsInTree(): string[] {
  const violations: string[] = [];

  for (const [repositoryPath, text] of SOURCES_BY_PATH) {
    violations.push(...violationsOf(repositoryPath, text, TREE_PATHS));
  }

  return violations.sort((left, right) => left.localeCompare(right));
}

/* ---------------------------------------------------------------------------------------------
 * Synthetic inputs — plain strings and paths, never repository files
 *
 * The cases below prove the check cannot pass vacuously: that it recognises every form a seed import
 * is written in, that it resolves the extensionless specifiers a bundler accepts, and that it
 * distinguishes the two permitted importers from everything else. They name no repository file, read
 * no record and hold no figure beyond the patterns themselves.
 * ------------------------------------------------------------------------------------------- */

/** The paths the resolution and decision cases are resolved against. */
const SYNTHETIC_TREE: ReadonlySet<string> = new Set([
  'src/seed/exceptions.ts',
  'src/seed/index.ts',
  'src/seed/plants.ts',
  'src/types/primitives.ts',
]);

/** One form a specifier is written in, and the specifier it must yield. */
interface ExtractionCase {
  /** What the form is, used as the case's title. */
  readonly label: string;
  /** The source text the form is written in. */
  readonly source: string;
  /** The specifier that text references. */
  readonly expected: string;
}

/** Every form an import of a seed module is written in, one case each (see `SPECIFIER_PATTERNS`). */
const EXTRACTION_CASES: readonly ExtractionCase[] = [
  {
    label: 'a static named import',
    source: "import { plants } from '../seed/plants';",
    expected: '../seed/plants',
  },
  {
    label: 'a type-only import',
    source: "import type { Plant } from '../../seed';",
    expected: '../../seed',
  },
  {
    label: 'a type-only re-export',
    source: "export type { Plant } from '../../seed';",
    expected: '../../seed',
  },
  {
    label: 'a star re-export',
    source: "export * from '../../seed/index';",
    expected: '../../seed/index',
  },
  {
    label: 'an import clause broken across lines',
    source: "import {\n  PLANTS,\n  LINES,\n} from '../seed/plants';",
    expected: '../seed/plants',
  },
  {
    label: 'a side-effect import',
    source: "import '../seed/plants';",
    expected: '../seed/plants',
  },
  {
    label: 'an awaited dynamic import',
    source: "const records = await import('../../seed/plants');",
    expected: '../../seed/plants',
  },
  {
    label: 'a mocked module',
    source: "vi.mock('../../seed/plants');",
    expected: '../../seed/plants',
  },
  {
    label: 'a deferred mock',
    source: "vi.doMock(\"../../seed/plants\");",
    expected: '../../seed/plants',
  },
  {
    label: 'an import-mock',
    source: 'const mocked = await vi.importMock(`../../seed/plants`);',
    expected: '../../seed/plants',
  },
];

/** One specifier and the path it must resolve to. */
interface ResolutionCase {
  /** What the resolution proves, used as the case's title. */
  readonly label: string;
  /** Repository path of the importing file. */
  readonly importer: string;
  /** The specifier as written. */
  readonly specifier: string;
  /** The repository path it must resolve to. */
  readonly expected: string;
}

/** The extensionless forms a bundler accepts, and the module each names. */
const RESOLUTION_CASES: readonly ResolutionCase[] = [
  {
    label: 'an extensionless sibling module resolves to its .ts file',
    importer: 'src/domain/probe.test.ts',
    specifier: '../seed/plants',
    expected: 'src/seed/plants.ts',
  },
  {
    label: 'the adapter loader’s own specifier resolves to the folder’s barrel',
    importer: 'src/services/mock/seed-loader.ts',
    specifier: '../../seed',
    expected: 'src/seed/index.ts',
  },
  {
    label: 'a folder specifier resolves to its index.ts barrel',
    importer: 'src/main.tsx',
    specifier: './seed',
    expected: 'src/seed/index.ts',
  },
  {
    label: 'a sibling module inside the folder resolves to its .ts file',
    importer: 'src/seed/index.ts',
    specifier: './plants',
    expected: 'src/seed/plants.ts',
  },
  {
    label: 'a specifier outside the folder resolves to its own module',
    importer: 'src/app/app.tsx',
    specifier: '../types/primitives',
    expected: 'src/types/primitives.ts',
  },
];

/** One importing file, one source text, and the violations the pair must produce. */
interface ImporterCase {
  /** What the case proves, used as the case's title. */
  readonly label: string;
  /** Repository path of the importing file. */
  readonly importer: string;
  /** That file's source text, as a plain string. */
  readonly source: string;
  /** The violation lines expected; empty when the import is permitted. */
  readonly expected: readonly string[];
}

/** The permitted importers, the loader route and the violations, side by side. */
const IMPORTER_CASES: readonly ImporterCase[] = [
  {
    label: 'the mock adapter loading the record set through its loader',
    importer: 'src/services/mock/seed-loader.ts',
    source: "import { SEED } from '../../seed';",
    expected: [],
  },
  {
    label: 'a seed module reaching its own sibling',
    importer: 'src/seed/exceptions.ts',
    source: "import { PLANTS } from './plants';",
    expected: [],
  },
  {
    label: 'a mock-adapter handler importing a record by name',
    importer: 'src/services/mock/handlers/exceptions.ts',
    source: "import { EXCEPTIONS } from '../../../seed/exceptions';",
    expected: [],
  },
  {
    label: 'a suite reaching the record set through the loader',
    importer: 'src/services/service-conformance.test.ts',
    source: "import { loadSeed } from './mock/seed-loader';",
    expected: [],
  },
  {
    label: 'a screen importing a seed record directly',
    importer: 'src/features/scr-01-overview/overview-screen.tsx',
    source: "import { EXCEPTIONS } from '../../seed/exceptions';",
    expected: [
      'src/features/scr-01-overview/overview-screen.tsx:1 imports ../../seed/exceptions',
    ],
  },
  {
    label: 'an unconnected API client importing the seed barrel for a type',
    importer: 'src/services/api-client/paths.ts',
    source: "import type { Plant } from '../../seed';",
    expected: ['src/services/api-client/paths.ts:1 imports ../../seed'],
  },
  {
    label: 'the shell importing a seed record on its second line',
    importer: 'src/app/app.tsx',
    source: "import { Fragment } from 'react';\nimport { PLANTS } from '../seed/plants';",
    expected: ['src/app/app.tsx:2 imports ../seed/plants'],
  },
];

/* ---------------------------------------------------------------------------------------------
 * Suites
 * ------------------------------------------------------------------------------------------- */

describe('the scan covers the sources it judges (rule P-2, AAP 0.9)', () => {
  it('reads every TypeScript module under src/, including both anchor modules', () => {
    const collected = [...TREE_PATHS];

    expect(
      collected.length,
      'the scan collected no module, so every assertion below would pass without judging anything',
    ).toBeGreaterThan(0);
    expect(
      collected,
      'the collection must hold both modules this check is anchored on; a rename has to fail here',
    ).toEqual(expect.arrayContaining([...ANCHOR_MODULES]));
  });

  it('reads each collected module as non-empty text', () => {
    const emptyModules = [...SOURCES_BY_PATH]
      .filter(([, text]) => text.trim() === '')
      .map(([repositoryPath]) => repositoryPath);

    expect(
      emptyModules,
      'a module came back empty, so an import in it could not be found',
    ).toEqual([]);
  });

  it('sees the seed import the mock adapter makes in this tree', () => {
    const loaderPath = 'src/services/mock/seed-loader.ts';
    const loaderSeedImports = seedSpecifiersOf(loaderPath, textOf(loaderPath), TREE_PATHS);

    expect(
      loaderSeedImports.length,
      'the extractor found no seed import in the adapter loader, so it would find none anywhere',
    ).toBeGreaterThan(0);
  });
});

describe('no seed import outside the mock adapter (rule P-2)', () => {
  it('imports seed records only from the mock adapter and from the seed folder itself', () => {
    expect(
      violationsInTree(),
      'rule P-2 and AAP 0.9: seed records are read only through src/services/mock/seed-loader.ts, ' +
        'so each line above names a file, a line and the import that has to go through the adapter',
    ).toEqual([]);
  });
});

describe('specifier extraction', () => {
  it.each(EXTRACTION_CASES)('finds $label', ({ source, expected }) => {
    const specifiers = specifiersOf(source).map((entry) => entry.specifier);

    expect(specifiers, `the extractor read no specifier from ${JSON.stringify(source)}`).toContain(
      expected,
    );
  });

  it('reports the line each specifier is written on', () => {
    const source = "import { describe } from 'vitest';\n\nimport { plants } from '../seed/plants';\n";

    expect(specifiersOf(source)).toEqual([
      { specifier: 'vitest', line: 1 },
      { specifier: '../seed/plants', line: 3 },
    ]);
  });

  it('reads no specifier from a comment that quotes one', () => {
    const commented =
      "// import { plants } from '../seed/plants';\n/* export * from '../../seed'; */\n";

    expect(
      specifiersOf(commented),
      'a specifier quoted in prose is not an import, so the scan must not report one',
    ).toEqual([]);
  });
});

describe('path resolution', () => {
  it.each(RESOLUTION_CASES)('$label', ({ importer, specifier, expected }) => {
    expect(resolveModulePath(importer, specifier, SYNTHETIC_TREE)).toBe(expected);
  });

  it('leaves a bare package specifier out of the seed decision', () => {
    expect(
      seedSpecifiersOf('src/app/app.tsx', "import { useState } from 'react';", SYNTHETIC_TREE),
    ).toEqual([]);
  });
});

describe('the permitted importers and the violations they leave', () => {
  it.each(IMPORTER_CASES)('judges $label', ({ importer, source, expected }) => {
    expect(violationsOf(importer, source, SYNTHETIC_TREE)).toEqual(expected);
  });

  it('permits exactly the two folders rule P-2 names', () => {
    expect([...PERMITTED_IMPORTER_FOLDERS]).toEqual(['src/seed', 'src/services/mock']);
  });
});

