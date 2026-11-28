/**
 * The shipped artefact's own half of the rule checks: every file `npm run build` writes into `dist/`,
 * every text response the preview server serves, and every route as it renders, carry no barred product
 * name, no real vendor name, no placeholder Latin, no claim of a mechanism this build does not have,
 * and no credential (rules B-1, B-2, P-1, P-4 and P-7).
 *
 * WHY THE CORPUS IS BOTH `dist/` ON DISK AND WHAT THE SERVER SERVES. AAP 0.9 makes this file the built
 * half of the forbidden-string and no-secret checks and says it reads the built files from disk during
 * `npm run test:e2e`, and success criterion 8 asks for zero matches in `dist` — so the artefact is read
 * from the file system: every file `npm run build` wrote, recursively, a source map or an unreferenced
 * asset included, which is exactly the class of artefact a response sweep cannot see. The served sweep
 * runs beside it rather than instead of it: one pass of the interface collects every text response
 * through the page's own origin — the served document, the hashed script and stylesheet, any text
 * payload — and the rendered `outerHTML` of each route, which is what proves rule B-1's statement about
 * the bytes a reader's browser actually receives. Read together, the two halves describe one artefact
 * from both ends, and the coverage test asserts that they do.
 *
 * HOW THE FILE SYSTEM IS REACHED WITHOUT NODE TYPES. `tsconfig` includes `e2e` with
 * `types: ["vite/client"]` and the project installs no Node type package, so a static import of
 * `node:fs/promises` fails the gate's first step. The two calls this file needs are therefore declared
 * as the small structural interface below, and the module is loaded through a dynamic import of a
 * variable specifier: its module type is untyped, so the cast names the only surface this scan uses.
 *
 * WHICH RULES THIS FILE OWNS. The source halves of the same rules run inside `npm test` over `src/`
 * (`tests/source-checks/forbidden-strings.test.ts` and `no-secrets.test.ts`); this file is the half
 * that only exists after `npm run build`, and it neither imports those modules nor reads `src/` — the
 * word lists below are its own, so the two halves can neither duplicate nor weaken each other.
 * - B-1: the served document references no origin but its own, and at least one `.woff2` arrives from
 *   that origin, proving the typefaces are bundled rather than fetched from a font host.
 * - B-2: no credential sits in the artefact `dist/` holds or in what the server serves, and nothing in
 *   it reads a build-time environment value.
 * - P-4: the interface never states or implies that it establishes sovereignty, prevents copying or
 *   resists tampering, so the adjectival vocabulary of such a claim fails here.
 * - P-7: no barred product name, no real vendor, customer, carmaker or cloud product name, and no
 *   placeholder Latin text ship in the interface.
 * - P-1: the `Simulated data` badge is visible on every route the sweep visits, which is also how a
 *   route that failed to render is noticed here rather than only in the labelling suite.
 * - B-3: every route and every row is reached by role and accessible name — the navigation links by
 *   their own names, the detail route by focusing a data row and pressing Enter — so no locator here
 *   depends on a class, a colour or a geometry, and no lever of the suite's own is added to the build.
 *
 * WHY THE SCRIPT IS SCANNED WITH THE SAME WHOLE-WORD LIST AND NO BROADER RULE. The interface is what
 * rule P-7 governs, and the interface text of a single-page application is compiled into its script, so
 * the names have to be looked for there too. A broader rule cannot be used: a generic base64 or long-hex
 * scan would fire on the audit chain's own hashes and on the minified bundle's every literal, which
 * would fail the gate for reasons the rule does not name. If a name in the list does appear in a built
 * file or a served asset, this file fails and names the file and the string — there is no exemption list
 * to widen and no silent exception to add.
 *
 * WHY TWO PRECISION TIERS FOR THE VENDOR NAMES, MEASURED RATHER THAN GUESSED. A case-insensitive
 * whole-word match on every name in the list fires on the built bundle today: `meta` occurs 58 times as
 * HTML's `<meta>` element, as React DOM's element switch and as the `Meta` keyboard key, and `password`
 * occurs twice as React DOM's input-type table. Neither is the company or a credential. So the names
 * whose spelling is also an ordinary English word, a unit, a colour, a short acronym or the browser's own
 * vocabulary are matched in their branded capitalisation only, and the one name that is HTML vocabulary
 * in every capitalisation is matched where it names the company. The credential shapes follow the same
 * principle and the repository's own precedent in `tests/source-checks/no-secrets.test.ts`: a stored
 * credential is a key assigned a value, an `Authorization` header assigned a value, a bearer credential
 * or a private-key block, never the bare word that also names a design token.
 *
 * WHAT IT DOES NOT DO. It asserts no business figure, types no record identifier and imports no seed
 * record or fixture (rule P-6 — the corpus counts reported below are the scan's own bookkeeping, not the
 * application's data). It does not assert which origins were contacted: that is the request-origin
 * spec's subject, and this file asserts only what the built and served text contains and which origin
 * the served document declares. It writes no storage, sets no timeout by sleeping, adds no test hook to
 * the application, and never skips: a violation is reported, never absorbed.
 */
import { expect, test } from '@playwright/test';
import type { BrowserContext, Locator, Page, Response } from '@playwright/test';

import { switchRole } from './helpers/role';
import { setTheme } from './helpers/theme';

/* ---------------------------------------------------------------------------------------------
 * What the sweep drives, and the fixed strings it recognises
 * ------------------------------------------------------------------------------------------- */

/**
 * The two themes, in the order they are swept. Command is the default `src/theme/theme-provider.tsx`
 * applies, so the first pass asserts the theme the application starts in and the second the other one.
 */
const THEMES = ['command', 'paper'] as const;

/**
 * The exact label specification §5.3 fixes for the demonstration-wide badge, and the one rule P-1
 * requires on every route. It is a label rather than a figure, so naming it here types no data.
 */
const SIMULATED_DATA_LABEL = 'Simulated data';

/**
 * The entry document, fetched again through the request context so rule B-1 can be asserted on the
 * document the server serves for the application's own address.
 */
const SERVED_DOCUMENT_PATH = '/';

/**
 * A path no route of `src/app/router.tsx` declares, driven so the sweep covers the not-found page: the
 * preview server answers it with the single-page fallback document, and the shell then renders the
 * not-found page inside itself, which is what a reader who mistypes an address sees.
 */
const UNKNOWN_ROUTE = '/unknown-workspace-route';

/**
 * The persona whose entry route is the S4 stage notice (AAP 0.12.4), so a stage-notice page is reached
 * the way its owner reaches it rather than by typing a path.
 */
const STAGE_NOTICE_PERSONA = 'USR-08';

/**
 * The route the exception queue is declared at, used to identify which navigation entry the detail drill
 * starts from. It is a path, not a record identifier, so naming it types no data.
 */
const EXCEPTION_QUEUE_PATH = '/exceptions';

/** How long a route is given to render its own level-one heading before the sweep reports it. */
const SCREEN_READY_TIMEOUT_MS = 20_000;

/**
 * How long a route's own reads are given to leave their busy state. The bound adapter answers with an
 * injected latency, so this is a ceiling on a web-first wait, never a sleep.
 */
const SETTLE_TIMEOUT_MS = 10_000;

/**
 * The media types whose bodies are text this check can scan. A font or an image is bytes rather than
 * interface text, so it is counted separately and never matched against a word list.
 */
const TEXT_CONTENT_TYPE =
  /^(?:text\/html|text\/css|text\/javascript|application\/javascript|application\/json)$/;

/** The extension of the bundled typefaces, asserted so rule B-1's font half is observed, not assumed. */
const FONT_EXTENSION = '.woff2';

/* ---------------------------------------------------------------------------------------------
 * Rule P-7 — the barred product name, placeholder Latin, and real vendor names
 * ------------------------------------------------------------------------------------------- */

/**
 * One prohibited string, named so a failure says what it found rather than only where.
 *
 * Every pattern carries the `g` flag: the scanner iterates it, and a pattern without the flag reports
 * one occurrence and then repeats it forever. The scanner rebuilds each pattern from its own source for
 * every target, so a `lastIndex` left behind by an earlier scan cannot make a later one skip a match.
 */
interface NamedPattern {
  /** What the pattern forbids, in words a failure message can print. */
  readonly label: string;

  /** The prohibited string as a global `RegExp`. */
  readonly pattern: RegExp;
}

/**
 * The barred product name rule P-7 forbids, held as two fragments so that no line of this file
 * writes it as one word. Rule P-7 bars the name itself, so the file that most needs to match it must
 * not spell it out: `src/app/app.test.tsx` joins the same two fragments, and
 * `tests/source-checks/forbidden-strings.test.ts` splits the name inside its own pattern. Neither
 * writes it contiguously, and assembling it here leaves the check as strict as the literal would.
 */
const BARRED_PRODUCT_NAME = ['plumb', 'line'].join('');

/**
 * The product names rule P-7 bars outright, written as one word in any casing.
 *
 * The pattern is assembled from the fragments above rather than written as a literal, because rule P-7
 * forbids the name itself and this file would otherwise be the one place that writes it. The word
 * boundary at each end keeps a longer word from matching, and this is deliberately the single word rather
 * than its two-word form: the shipped bundle is scanned, and a two-word match would be the pattern's
 * business only if the interface ever carried one. `SAMPLES_THAT_MUST_MATCH` keeps the contiguous
 * spellings caught and `SAMPLES_THAT_MUST_NOT_MATCH` keeps the two-word spelling out of reach.
 */
const BARRED_PRODUCT_NAMES: readonly NamedPattern[] = [
  { label: 'the barred product name', pattern: new RegExp(`\\b${BARRED_PRODUCT_NAME}\\b`, 'gi') },
];

/**
 * The placeholder Latin that stands in for copy nobody wrote (rule P-7's "use no lorem ipsum").
 *
 * Both markers are word-bounded, so neither can match inside an ordinary word of the interface.
 */
const PLACEHOLDER_LATIN: readonly NamedPattern[] = [
  { label: 'placeholder Latin text', pattern: /\blorem ipsum\b/gi },
  { label: 'placeholder Latin text', pattern: /\bdolor sit amet\b/gi },
];

/**
 * The real company, carmaker and cloud product names rule P-7 forbids, in the tier where the spelling
 * cannot occur innocently: each is a coined name with no ordinary English homograph and no presence in
 * the browser's own vocabulary, so a case-insensitive whole-word match is safe and catches every casing
 * a source could use. Every name is plain ASCII letters, which is why the pattern needs no escaping.
 */
const COINED_VENDOR_NAMES: readonly string[] = [
  'Amazon',
  'Anthropic',
  'Bosch',
  'Cloudflare',
  'Databricks',
  'Google',
  'Mercedes',
  'Microsoft',
  'Nvidia',
  'OpenAI',
  'Salesforce',
  'Siemens',
  'Stellantis',
  'Toyota',
  'Volkswagen',
];

/**
 * The names whose spelling is also an ordinary word, a unit, a colour or the browser's own vocabulary —
 * `slack` is a planner's word for spare capacity, `azure` a colour, `snowflake` a noun, `tesla` a unit of
 * magnetic flux density, and `aws`, `sap`, `ibm` and `bmw` are three-letter lower-case identifiers a
 * minifier could emit for a variable. Each is matched in its branded capitalisation only, which is the
 * form a name in the interface actually takes, and which the lower-case word cannot reach.
 */
const BRANDED_VENDOR_NAMES: readonly string[] = [
  'AWS',
  'Azure',
  'BMW',
  'Ford',
  'IBM',
  'Oracle',
  'SAP',
  'Slack',
  'Snowflake',
  'Tesla',
];

/**
 * The one name in the list that no whole-word match can separate from the platform it ships on: `meta` is
 * HTML's element name, React DOM's element switch, the `Meta` keyboard key's label and this application's
 * own `Result.meta` field, so a bare match reports the platform rather than the company. It is therefore
 * matched where the company names itself, which is the only form a prohibition could reach anyway.
 */
const META_AS_ENTITY = /\bMeta\s+(?:Platforms|Inc\.?|Quest|AI)\b/gi;

/**
 * Every prohibited string of rule P-7, assembled once so the scan, the failure messages and the
 * discrimination test all read one list.
 */
const FORBIDDEN_STRINGS: readonly NamedPattern[] = [
  ...BARRED_PRODUCT_NAMES,
  ...PLACEHOLDER_LATIN,
  ...COINED_VENDOR_NAMES.map(
    (name): NamedPattern => ({
      label: `the real vendor name "${name}"`,
      pattern: new RegExp(`\\b${name}\\b`, 'gi'),
    }),
  ),
  ...BRANDED_VENDOR_NAMES.map(
    (name): NamedPattern => ({
      label: `the real vendor name "${name}"`,
      pattern: new RegExp(`\\b${name}\\b`, 'g'),
    }),
  ),
  { label: 'the real vendor name "Meta"', pattern: META_AS_ENTITY },
];

/* ---------------------------------------------------------------------------------------------
 * Rule P-4 — the vocabulary of an unimplemented claim
 * ------------------------------------------------------------------------------------------- */

/**
 * The adjectives a claim about a mechanism this build does not have would need, exactly as AAP 0.10
 * names them and adjectival only, for two reasons that are not negotiable: the noun phrase in
 * `tamper resistance` is required interface text — the audit screen's mandated note reads "Simulated
 * control: this shows the mechanism, not production tamper resistance." — so a pattern matching the stem
 * would forbid the very sentence rule P-4 requires; and `certificate` is a legitimate domain noun for a
 * package document, so only the adjective form is matched.
 */
const CLAIM_VOCABULARY: readonly NamedPattern[] = [
  { label: 'a claim that the build resists tampering', pattern: /\btamper[\s-]?proof\b/gi },
  { label: 'a claim that the build resists tampering', pattern: /\btamper[\s-]?resistant\b/gi },
  { label: 'a claim that the build establishes a security posture', pattern: /\bzero[\s-]?trust\b/gi },
  { label: 'a guarantee the build cannot make', pattern: /\bguaranteed\b/gi },
  { label: 'a certification the build does not hold', pattern: /\bcertified\b/gi },
];

/* ---------------------------------------------------------------------------------------------
 * Rule B-2 — a credential, in the shape a credential takes rather than the word for it
 * ------------------------------------------------------------------------------------------- */

/**
 * The forms a stored credential takes in shipped code: a named key or a header assigned a quoted value,
 * a bearer credential's token, a PEM private-key header, and a read of a build-time environment value.
 *
 * These are shapes rather than bare words, and the reason is measured rather than theoretical: the built
 * bundle contains `password:!0` and `type===`password`` as React DOM's input-type vocabulary, so a match
 * on the word would fail the gate on the browser's own code while no credential exists anywhere. The
 * quoted value is exactly what separates a stored credential from a type member, a form label or a design
 * token — `apiKey: string` describes a field, `apiKey: '<value>'` carries one — which is the same
 * distinction `tests/source-checks/no-secrets.test.ts` draws for the source half of this rule.
 *
 * No generic base64 or long-hex scan appears here on purpose: the audit chain's hashes and the minified
 * bundle legitimately hold long runs of that alphabet, so such a pattern would fire on the product's own
 * evidence rather than on a finding.
 */
const CREDENTIAL_SHAPES: readonly NamedPattern[] = [
  {
    label: 'a credential key assigned a quoted value',
    pattern:
      /\b(?:api[_-]?key|apikey|access[_-]?key|client[_-]?secret|secret[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|id[_-]?token|bearer[_-]?token|private[_-]?key)\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
  },
  {
    label: 'a token assigned a quoted value',
    pattern: /\btoken\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
  },
  {
    label: 'a secret assigned a quoted value',
    pattern: /\bsecret\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
  },
  {
    label: 'a password assigned a quoted value',
    pattern: /\b(?:passw(?:or)?d|pwd)\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
  },
  {
    label: 'an authorization header assigned a quoted value',
    pattern: /\bauthorization\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
  },
  {
    label: 'a bearer credential',
    pattern: /\bbearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi,
  },
  {
    label: 'a private key block',
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g,
  },
  {
    label: 'a build-time environment read',
    pattern: /\b(?:process\.env|import\.meta\.env)\b/g,
  },
];

/* ---------------------------------------------------------------------------------------------
 * The corpus
 * ------------------------------------------------------------------------------------------- */

/**
 * One text asset the preview server answered during the sweep.
 *
 * The body is held as text because every use of it is a text scan: a binary response is never collected,
 * so nothing here has to guess whether a body can be decoded.
 */
interface ServedAsset {
  /** The path the asset was served at — what a failure message names so a reader can open it. */
  readonly path: string;

  /** The media type without its parameters, such as `text/javascript`. */
  readonly mediaType: string;

  /** The body, as the server sent it. */
  readonly text: string;
}

/**
 * One file `npm run build` wrote into `dist/`, read from the file system.
 *
 * This is the corpus no response sweep can reach: a source map, an asset the page never requests, or
 * anything else only the build writes still ships inside the artefact, so rule P-7's and rule B-2's
 * shipped halves are asserted over these files as well as over what the server hands out (AAP 0.9,
 * success criterion 8).
 */
interface BuiltFile {
  /** The path relative to the project root, such as `dist/assets/index-XfupDZaF.js`. */
  readonly path: string;

  /** The file's bytes decoded as UTF-8 text; a binary decodes lossily and its ASCII survives. */
  readonly text: string;
}

/**
 * One route as the interface rendered it.
 *
 * The rendered `outerHTML` is what rule P-7 governs: it is the interface a reader reads, and it carries
 * the labels, prose and attribute values the served script and stylesheet only describe.
 */
interface RenderedRoute {
  /** The navigation entry's accessible name, or the sweep step's own description. */
  readonly label: string;

  /** The theme the route was captured in, one of `THEMES`. */
  readonly theme: string;

  /** The path the document sat at when it was captured. */
  readonly path: string;

  /** The rendered document, outermost element included. */
  readonly html: string;

  /** Whether the demonstration-wide badge was visible, which is what rule P-1 requires of the route. */
  readonly badgeVisible: boolean;

  /**
   * How many elements the shell's badge locator matched on this route.
   *
   * The shell mounts the badge once, so one is the number a correct route reports; the count travels
   * with the capture so a route that rendered without it says so instead of only failing.
   */
  readonly badgeMatches: number;
}

/** Everything the tests assert over: what the build wrote, and what the single sweep observed. */
interface ServedCorpus {
  /** The application's own origin; every foreign reference in a served document is a finding. */
  readonly origin: string;

  /** Every file `npm run build` wrote into `dist/`, read from disk before the sweep began. */
  readonly builtFiles: readonly BuiltFile[];

  /** Every text asset the server answered, one entry per path. */
  readonly assets: readonly ServedAsset[];

  /** Every route the sweep captured, in visit order. */
  readonly routes: readonly RenderedRoute[];

  /** The paths of the bundled typefaces that arrived from the application's own origin. */
  readonly fontPaths: readonly string[];

  /** The routes whose own reads had not left their busy state when the document was captured. */
  readonly unsettledRoutes: readonly string[];

  /** The text responses whose body could not be read, so a gap cannot pass as a clean scan. */
  readonly unreadableAssets: readonly string[];

  /** The document the server serves for the application's own address, fetched for rule B-1. */
  readonly servedDocument: { readonly path: string; readonly status: number; readonly html: string };

  /** Every enabled navigation entry's path, so the sweep can prove it visited all of them. */
  readonly navigationPaths: readonly string[];

  /** The themes swept, one pass each. */
  readonly themes: readonly string[];

  /** The parameterised detail route the row drill reached. */
  readonly detailRoute: string;

  /** The stage-notice route the S4 persona's entry route rendered. */
  readonly stageNoticeRoute: string;

  /** The address no route declares, whose document rendered the not-found page. */
  readonly unknownRoute: string;
}

/**
 * The collector the sweep fills while it runs.
 *
 * A draft rather than a `ServedCorpus` because the parts are written out of order — a response arrives
 * whenever the browser asks for it — and because a `Map` is what makes one entry per path true when a
 * theme change re-requests nothing and a reload re-requests the whole document.
 */
interface CorpusDraft {
  readonly assets: Map<string, ServedAsset>;
  readonly routes: RenderedRoute[];
  readonly fontPaths: Set<string>;
  readonly requestedPaths: Set<string>;
  readonly unsettledRoutes: string[];
  readonly unreadableAssets: string[];
}

/** One link of the shell's navigation, as the document renders it. */
interface NavigationEntry {
  /** The link's accessible name, which is how the sweep activates it. */
  readonly label: string;

  /** The path its `href` declares. */
  readonly path: string;
}

/* ---------------------------------------------------------------------------------------------
 * The built files on disk
 * ------------------------------------------------------------------------------------------- */

/**
 * The directory `npm run build` writes, relative to the project root.
 *
 * `vite build` is configured with no `build.outDir`, so the artefact lands here, beside
 * `playwright.config.ts` and the `package.json` the gate's scripts live in.
 */
const BUILT_DIRECTORY = 'dist';

/**
 * The Node module this scan loads for its two file-system calls.
 *
 * Annotated as `string` so the specifier is a variable rather than a literal: a literal specifier makes
 * TypeScript resolve `node:fs/promises`'s declarations, and the project installs no Node type package —
 * `tsconfig` includes `e2e` with `types: ["vite/client"]` — so that resolution fails the gate's type
 * check. A variable specifier imports untyped, and the cast in `loadFileSystem` is then the only surface
 * the scan is allowed to use.
 */
const FILE_SYSTEM_MODULE: string = 'node:fs/promises';

/**
 * One directory entry, as much of Node's `Dirent` as the walk below reads.
 *
 * Declared structurally for the reason above `FILE_SYSTEM_MODULE`: naming `Dirent` would need the same
 * declarations the module specifier avoids. A directory is descended into and a regular file is read;
 * anything else — a symbolic link, a socket — is reported rather than skipped, because it cannot be read
 * as text and a scan with a hole in it is worse than one that says where it stopped.
 */
interface DirectoryEntry {
  /** The entry's name within its directory, never a path. */
  readonly name: string;

  /** Whether the entry is a directory whose own entries the walk descends into. */
  isDirectory(): boolean;

  /** Whether the entry is a regular file whose bytes the scan reads. */
  isFile(): boolean;
}

/**
 * The two calls this file makes on Node's file system, as one structural interface.
 *
 * `readdir` carries `withFileTypes: true` because the walk asks each entry what it is rather than
 * guessing from its name, and `readFile` carries the `utf8` encoding because every use of a built file's
 * bytes here is a text scan.
 */
interface FileSystem {
  /** The entries of the directory at `path`. */
  readdir(
    path: string,
    options: { readonly withFileTypes: true },
  ): Promise<readonly DirectoryEntry[]>;

  /** The whole of the file at `path`, decoded as UTF-8 text. */
  readFile(path: string, encoding: 'utf8'): Promise<string>;
}

/**
 * Loads Node's file-system promises API behind the interface above.
 *
 * The import is dynamic and its specifier a variable, so it resolves when the first built-file scan runs
 * rather than when this file loads, and the type check sees an untyped module the cast makes explicit.
 *
 * @returns The two calls the built-file scan makes.
 */
async function loadFileSystem(): Promise<FileSystem> {
  const fileSystem: unknown = await import(FILE_SYSTEM_MODULE);

  return fileSystem as FileSystem;
}

/**
 * The directory holding `path`, tolerating either platform's separators and any trailing one.
 *
 * Written out rather than imported, because `node:path` needs the same Node declarations the file-system
 * module does and the one operation needed is a string slice.
 *
 * @param path An absolute path.
 * @returns The path without the separator and its last segment.
 * @throws Error when the path has no parent segment, since no artefact could then be read beside it.
 */
function parentDirectoryOf(path: string): string {
  const trimmed = path.replace(/[\\/]+$/, '');
  const separator = Math.max(trimmed.lastIndexOf('/'), trimmed.lastIndexOf('\\'));

  if (separator <= 0) {
    throw new Error(`"${path}" has no parent directory, so no built artefact can be read beside it.`);
  }

  return trimmed.slice(0, separator);
}

/**
 * The project's root directory: the directory the loaded configuration file sits in.
 *
 * The artefact is located from the configuration rather than from the process's working directory, so
 * the scan reads the bundle the build wrote however `playwright test` was invoked. `configFile` is
 * `playwright.config.ts`, which sits beside `dist/`, `package.json` and the `check` script — that is the
 * project root. `config.rootDir` is deliberately not used: this configuration declares
 * `testDir: './e2e'`, and Playwright resolves `rootDir` to that test directory (`<project>/e2e`), one
 * level below the artefact.
 *
 * @returns The absolute path of the project root.
 * @throws Error when this run loaded no configuration file, because then no project root is known.
 */
function projectRoot(): string {
  const { configFile } = test.info().config;

  if (configFile === undefined || configFile === '') {
    throw new Error(
      'this run loaded no Playwright configuration file, so the directory holding `dist/` is unknown: run the gate as `npm run test:e2e`, which loads `playwright.config.ts` from the project root.',
    );
  }

  return parentDirectoryOf(configFile);
}

/**
 * Every regular file under `directory`, recursively, added to `into` as paths carrying `prefix`.
 *
 * @param fileSystem The file system to walk.
 * @param directory The absolute path to walk.
 * @param prefix The path the walk's result is labelled with, which starts as `dist` so every finding
 *   names a file relative to the project root.
 * @param into The list the paths are added to, in the order the platform lists their directories.
 * @throws Error when an entry is neither a directory nor a regular file, since it could not be read.
 */
async function collectBuiltFilePaths(
  fileSystem: FileSystem,
  directory: string,
  prefix: string,
  into: string[],
): Promise<void> {
  const entries = await fileSystem.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const path = `${prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      await collectBuiltFilePaths(fileSystem, `${directory}/${entry.name}`, path, into);
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(
        `"${path}" is neither a directory nor a regular file, so its bytes cannot be read: this scan reads every file \`npm run build\` writes, and skipping one would leave a hole in it.`,
      );
    }

    into.push(path);
  }
}

/**
 * Every file `npm run build` writes into `dist/`, read as text for the three scans.
 *
 * AAP 0.9 makes this file the built half of the forbidden-string and no-secret checks and states that
 * it reads the built files from disk; success criterion 8 asks for zero matches in `dist`. A response
 * sweep cannot see a `dist`-only artefact — a source map, an asset the page never requests — so the
 * artefact itself is read here, and the served sweep stays beside it as the proof of what a browser is
 * actually handed.
 *
 * Every file is read as UTF-8, the bundled typefaces included: a `.woff2`'s bytes below 0x80 decode
 * unchanged and the rest decode lossily, so the ASCII a font table carries — a family name, a foundry
 * name — is still found, which is all a text scan of a font can be asked for. Nothing is skipped, so an
 * artefact added to the build is covered by the next run of the gate.
 *
 * @param projectDirectory The absolute path of the project root.
 * @returns One entry per file, sorted by path, each labelled with the path a failure names.
 * @throws Error when `dist/` is absent or unreadable, naming the build that produces it.
 */
async function readBuiltFiles(projectDirectory: string): Promise<readonly BuiltFile[]> {
  const directory = `${projectDirectory}/${BUILT_DIRECTORY}`;
  const fileSystem = await loadFileSystem();
  const paths: string[] = [];

  try {
    await collectBuiltFilePaths(fileSystem, directory, BUILT_DIRECTORY, paths);
  } catch (cause) {
    throw new Error(
      `the built artefact at ${directory} could not be read (${String(cause)}): \`npm run build\` writes it and precedes \`npm run test:e2e\` in the \`check\` chain, so build first or run the whole gate with \`npm run check\` (AAP 0.7).`,
    );
  }

  const files: BuiltFile[] = [];

  for (const path of paths.sort()) {
    try {
      files.push({ path, text: await fileSystem.readFile(`${projectDirectory}/${path}`, 'utf8') });
    } catch (cause) {
      throw new Error(`the built file ${path} could not be read: ${String(cause)}`);
    }
  }

  return files;
}

/**
 * The path of the built file a served asset's path names.
 *
 * The preview server answers every route with the single-page fallback document, so a served HTML body
 * is the one `dist/index.html` however the address that asked for it was spelled — the entry document
 * and an address no route declares are the same file. Every other served text asset — the hashed script,
 * the stylesheet, any text payload — sits at the same path inside the artefact.
 *
 * @param asset The asset the sweep collected.
 * @returns Its path relative to the project root.
 */
function builtPathOf(asset: ServedAsset): string {
  return asset.mediaType === 'text/html'
    ? `${BUILT_DIRECTORY}/index.html`
    : `${BUILT_DIRECTORY}${asset.path}`;
}

/* ---------------------------------------------------------------------------------------------
 * Scanning
 * ------------------------------------------------------------------------------------------- */

/** One place a prohibited pattern matched, with enough of the surrounding text to act on. */
interface Finding {
  /** The asset or document the match sits in. */
  readonly target: string;

  /** What the pattern forbids, in words the failure message prints. */
  readonly label: string;

  /** The matched text and a little of what surrounds it, on one line. */
  readonly excerpt: string;
}

/** How much text on each side of a match a failure message carries. */
const EXCERPT_RADIUS = 60;

/** Collapses runs of whitespace so an excerpt from a one-line bundle stays readable on one line. */
function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The text around a match, collapsed and bounded, so a failure quotes what it found. */
function excerptAt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - EXCERPT_RADIUS);
  const end = Math.min(text.length, index + length + EXCERPT_RADIUS);

  return collapseWhitespace(text.slice(start, end));
}

/**
 * Every match of `patterns` in one text, with the target named so a failure points at the asset.
 *
 * Each pattern is rebuilt from its own source and flags for every call, so a `lastIndex` left behind by
 * an earlier target cannot make a later scan start somewhere other than the beginning.
 */
function scanText(
  target: string,
  text: string,
  patterns: readonly NamedPattern[],
): readonly Finding[] {
  const findings: Finding[] = [];

  for (const { label, pattern } of patterns) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const scan = new RegExp(pattern.source, flags);
    let match = scan.exec(text);

    while (match !== null) {
      if (match[0].length === 0) {
        // No pattern here can match an empty string, but a zero-length match would spin this loop, so
        // it is stepped over rather than trusted not to occur.
        scan.lastIndex += 1;
      } else {
        findings.push({ target, label, excerpt: excerptAt(text, match.index, match[0].length) });
      }
      match = scan.exec(text);
    }
  }

  return findings;
}

/**
 * Every text rule P-7, P-4 or B-2 governs, as one list: each rendered route's document, then each served
 * text asset, then each file the build wrote into `dist/`.
 *
 * The rendered documents come first because they are the interface itself, so a failure a reader could
 * see is reported before one buried in a bundle. The built files come last because they are the widest
 * corpus — the whole artefact — and each is labelled with its own path, so a failure names the file to
 * open. Nothing is filtered out of any of the three: a `dist`-only artefact has no served twin.
 */
function scanTargets(corpus: ServedCorpus): readonly { target: string; text: string }[] {
  const documents = corpus.routes.map((route) => ({
    target: `the rendered document at ${route.path} (${route.theme} theme, visited as "${route.label}")`,
    text: route.html,
  }));

  const assets = corpus.assets.map((asset) => ({
    target: `the served asset ${asset.path} (${asset.mediaType})`,
    text: asset.text,
  }));

  const built = corpus.builtFiles.map((file) => ({
    target: `the built file ${file.path}`,
    text: file.text,
  }));

  return [...documents, ...assets, ...built];
}

/** Every finding for one rule's patterns across the whole corpus. */
function scanCorpus(corpus: ServedCorpus, patterns: readonly NamedPattern[]): readonly Finding[] {
  return scanTargets(corpus).flatMap(({ target, text }) => scanText(target, text, patterns));
}

/** One finding as a line of a failure message: where, what, and the text it matched. */
function describeFinding(finding: Finding): string {
  return `${finding.target}: ${finding.label} — matched "${finding.excerpt}"`;
}

/** Whether one pattern matches a text, from a fresh `RegExp` so no previous scan's position leaks in. */
function matchesPattern(pattern: RegExp, text: string): boolean {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;

  return new RegExp(pattern.source, flags).test(text);
}

/** Whether any pattern of `patterns` matches `text`, which is what the discrimination samples assert. */
function matchesAny(patterns: readonly NamedPattern[], text: string): boolean {
  return patterns.some(({ pattern }) => matchesPattern(pattern, text));
}

/* ---------------------------------------------------------------------------------------------
 * The sweep
 * ------------------------------------------------------------------------------------------- */

/** The shell's navigation landmark, reached by role rather than by a class or a position. */
function shellNavigation(page: Page): Locator {
  return page.getByRole('navigation').first();
}

/**
 * Waits for the browser's next two paint opportunities.
 *
 * A client-side navigation is a React update rather than a document load, so a heading that is still on
 * screen the instant a link is activated may be the screen the reader is leaving: the router has changed
 * the address and the outlet has not committed the new route yet. Two animation frames pass the commit
 * and the paint that follows it, which is what makes the heading read afterwards belong to the route the
 * address names. It is a wait on the browser's own frame clock, not a fixed delay.
 *
 * @param page The Playwright page showing the application.
 */
async function drainPaint(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            resolve();
          });
        });
      }),
  );
}

/**
 * Waits for the route to render its own level-one heading, then — bounded — for its own reads to leave
 * their busy state.
 *
 * Every screen of this build renders exactly one `<h1>` inside the shell's `<main>`, so the heading is
 * the signal that a route mounted and that the client-side navigation actually happened. The busy wait
 * afterwards is best effort and its outcome is recorded rather than failed: the adapter answers each read
 * with an injected latency, a slow screen is not a bundle defect, and the text the route had rendered by
 * then is still what the server served.
 *
 * @param page The Playwright page showing the application.
 * @returns `true` when the route's reads had left their busy state, `false` when they outlasted the bound.
 */
async function settleRoute(page: Page): Promise<boolean> {
  await drainPaint(page);

  await page
    .getByRole('main')
    .getByRole('heading', { level: 1 })
    .first()
    .waitFor({ state: 'visible', timeout: SCREEN_READY_TIMEOUT_MS });

  try {
    await page
      .locator('[aria-busy="true"]')
      .first()
      .waitFor({ state: 'hidden', timeout: SETTLE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/**
 * Every enabled navigation entry, read from the shell's own landmark.
 *
 * The entries are read rather than typed: the sweep drives whatever the navigation offers, by each
 * link's accessible name and declared path, so it cannot go stale when a screen is renamed and cannot
 * claim coverage of an entry the build does not publish. A disabled entry renders as a button rather
 * than a link (rule P-8), so the links are exactly the entries that navigate.
 *
 * @param page The Playwright page showing the shell.
 * @returns Each entry's accessible name and path, in render order.
 * @throws Error when an entry renders without a name or an href, or when the shell offers no link.
 */
async function navigationEntries(page: Page): Promise<readonly NavigationEntry[]> {
  const links = shellNavigation(page).getByRole('link');
  const count = await links.count();
  const entries: NavigationEntry[] = [];

  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    const label = collapseWhitespace((await link.textContent()) ?? '');
    const path = collapseWhitespace((await link.getAttribute('href')) ?? '');

    if (label === '' || path === '') {
      throw new Error(
        `navigation entry ${index + 1} of ${count} renders ${label === '' ? 'no accessible name' : `the name "${label}"`} and ${path === '' ? 'no href' : `the href "${path}"`}, so the sweep cannot drive it the way a reader does.`,
      );
    }

    entries.push({ label, path });
  }

  if (entries.length === 0) {
    throw new Error(
      'the shell renders no navigation link at all, so no enabled entry could be swept: the shell is expected to offer the stages this run builds and to disable the others with an explanation (rule P-8).',
    );
  }

  return entries;
}

/**
 * Captures one route: its settled rendered document, its badge, and the theme it was rendered in.
 *
 * The theme is passed rather than read back because the sweep knows which pass it is on when a route it
 * navigated to is captured; the entry route is the one exception and reads the attribute the theme
 * provider applied.
 *
 * @param page The Playwright page showing the application.
 * @param label How the sweep reached the route, printed in every failure the corpus produces.
 * @param theme The theme the pass is in.
 * @param draft The collector to add the capture to.
 */
async function captureRoute(
  page: Page,
  label: string,
  theme: string,
  draft: CorpusDraft,
): Promise<void> {
  const settled = await settleRoute(page);

  if (!settled) {
    draft.unsettledRoutes.push(`${theme} · ${label}`);
  }

  /*
   * The badge is located as the shell's own control, never by a document-wide text match. It renders as
   * the one button inside the page's `banner` landmark — the shell's `<header>` — whose accessible name
   * begins with the label followed by the demonstration clock: `src/components/simulated-data-badge.tsx`
   * renders `<label> at <clock>`, so the name is "Simulated data at 2026-12-03T08:00:00+01:00". Both
   * halves of that are what let the assertion fail. A match on the label anywhere in the document passes
   * on `/competitive` with the badge removed, because the atlas carries the companion label
   * "Simulated data: client self-assessment" (AAP 0.10) inside `main`; scoping the search to the banner
   * puts that text out of reach, and anchoring the name at the label keeps a control whose name merely
   * ends in the same words from standing in for the badge. The label is fixed text of specification
   * §5.3 and holds no regular-expression metacharacter.
   */
  const badge = page
    .getByRole('banner')
    .getByRole('button', { name: new RegExp(`^${SIMULATED_DATA_LABEL}\\b`) });
  const badgeMatches = await badge.count();
  const badgeVisible = badgeMatches > 0 && (await badge.first().isVisible());
  const html = await page.evaluate(() => document.documentElement.outerHTML);

  draft.routes.push({
    label,
    theme,
    path: new URL(page.url()).pathname,
    html,
    badgeVisible,
    badgeMatches,
  });
}

/**
 * Records one response: the typefaces it proves are bundled, and the text bodies every scan reads.
 *
 * Only the application's own origin is recorded, and only for a media type whose body is text. A font or
 * an image is counted by its extension and never matched against a word list, because bytes are not
 * interface text. A body that cannot be read is recorded as unreadable, so a hole in the corpus fails the
 * coverage test instead of quietly shrinking the scan.
 *
 * @param response The response the browser received.
 * @param origin The application's own origin.
 * @param draft The collector to add the response to.
 * @param reads The pending body reads, awaited before the corpus is asserted over.
 */
function collectResponse(
  response: Response,
  origin: string,
  draft: CorpusDraft,
  reads: Promise<void>[],
): void {
  const url = response.url();

  if (!/^https?:/i.test(url)) {
    // A `data:` or `blob:` URL is not a network response; the favicon is a data URI by design.
    return;
  }

  const parsed = new URL(url);

  if (parsed.origin !== origin) {
    // Which origins were contacted is the request-origin spec's subject; this file asserts what the
    // served text contains, so a foreign response is not part of its corpus.
    return;
  }

  if (parsed.pathname.endsWith(FONT_EXTENSION)) {
    draft.fontPaths.add(parsed.pathname);
    return;
  }

  const mediaType = (response.headers()['content-type'] ?? '').split(';')[0]?.trim().toLowerCase() ?? '';

  if (!TEXT_CONTENT_TYPE.test(mediaType)) {
    return;
  }

  if (draft.requestedPaths.has(parsed.pathname)) {
    return;
  }
  draft.requestedPaths.add(parsed.pathname);

  reads.push(
    response.text().then(
      (text) => {
        draft.assets.set(parsed.pathname, { path: parsed.pathname, mediaType, text });
      },
      (cause: unknown) => {
        draft.unreadableAssets.push(`${parsed.pathname}: ${String(cause)}`);
      },
    ),
  );
}

/**
 * Sweeps the application once and returns everything the browser side of the corpus holds.
 *
 * The order is the order a reader moves in: the entry route, then every enabled navigation entry in both
 * themes, then the parameterised detail route a queue row opens, then the stage-notice page the S4 persona
 * lands on, then an address no route declares. Each navigation is the application's own, so no test hook
 * is needed and none exists; the only levers used are the theme switch and the role switcher, both of
 * which are product features.
 *
 * The built files are absent from the result on purpose: a sweep sees only what the server hands out, and
 * the artefact on disk is read by {@link readBuiltFiles} before the sweep begins, so the caller joins the
 * two halves into one {@link ServedCorpus}.
 *
 * @param context The browser context the sweep runs in, watched for responses.
 * @param page The page the sweep drives.
 * @param origin The application's own origin.
 * @returns Everything the sweep observed, ready to be joined with the built files.
 */
async function collectServedCorpus(
  context: BrowserContext,
  page: Page,
  origin: string,
): Promise<Omit<ServedCorpus, 'builtFiles'>> {
  const draft: CorpusDraft = {
    assets: new Map<string, ServedAsset>(),
    routes: [],
    fontPaths: new Set<string>(),
    requestedPaths: new Set<string>(),
    unsettledRoutes: [],
    unreadableAssets: [],
  };
  const reads: Promise<void>[] = [];

  context.on('response', (response: Response) => {
    collectResponse(response, origin, draft, reads);
  });

  await page.goto(SERVED_DOCUMENT_PATH);

  const entryTheme = (await page.locator('html').getAttribute('data-theme')) ?? 'unknown';
  await captureRoute(page, 'the entry route', entryTheme, draft);

  const entries = await navigationEntries(page);
  let theme = entryTheme;

  for (const sweptTheme of THEMES) {
    await setTheme(page, sweptTheme);
    theme = sweptTheme;

    for (const entry of entries) {
      await shellNavigation(page)
        .getByRole('link', { name: entry.label, exact: true })
        .click();
      // The address is the router's own statement that the navigation happened; the heading read after
      // it then belongs to the new route rather than to the screen the reader is leaving.
      await page.waitForURL((url) => url.pathname === entry.path, {
        timeout: SCREEN_READY_TIMEOUT_MS,
      });
      await captureRoute(page, entry.label, theme, draft);
    }
  }

  const queue = entries.find((entry) => entry.path === EXCEPTION_QUEUE_PATH);

  if (queue === undefined) {
    throw new Error(
      `the navigation offers no entry at ${EXCEPTION_QUEUE_PATH}, so the parameterised detail route could not be reached from a row and the sweep would not cover one.`,
    );
  }

  await shellNavigation(page)
    .getByRole('link', { name: queue.label, exact: true })
    .click();
  await page.waitForURL((url) => url.pathname === queue.path, {
    timeout: SCREEN_READY_TIMEOUT_MS,
  });
  await settleRoute(page);

  const queuePath = new URL(page.url()).pathname;
  const firstRow = page.getByRole('main').getByRole('row').nth(1);
  await expect(
    firstRow,
    'the exception queue renders no data row to open, so no parameterised detail route could be swept',
  ).toBeVisible();

  /*
   * The row is opened the way a keyboard reader opens it: the data row carries the roving cursor's
   * `tabIndex`, so focusing it and pressing Enter is the interface's own activation rather than a click
   * at a position, and it cannot land on a control inside the row instead.
   */
  await firstRow.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(
    (url) => url.pathname !== queuePath && url.pathname.startsWith(`${queuePath}/`),
    { timeout: SCREEN_READY_TIMEOUT_MS },
  );
  await captureRoute(page, 'the exception a queue row opens', theme, draft);
  const detailRoute = new URL(page.url()).pathname;

  await switchRole(page, STAGE_NOTICE_PERSONA);
  await captureRoute(page, `the route ${STAGE_NOTICE_PERSONA} lands on`, theme, draft);
  const stageNoticeRoute = new URL(page.url()).pathname;

  await page.goto(UNKNOWN_ROUTE);
  expect(
    new URL(page.url()).pathname,
    'an address no route declares must render the not-found page in place rather than being redirected to a built route',
  ).toBe(UNKNOWN_ROUTE);
  await captureRoute(page, 'the not-found page', theme, draft);

  // The typefaces are requested when the text that uses them is laid out, so the sweep waits for the
  // document's own font set before it stops watching responses.
  await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.size;
  });

  await Promise.all(reads);

  const documentResponse = await context.request.get(SERVED_DOCUMENT_PATH);

  return {
    origin,
    assets: [...draft.assets.values()],
    routes: draft.routes,
    fontPaths: [...draft.fontPaths],
    unsettledRoutes: draft.unsettledRoutes,
    unreadableAssets: draft.unreadableAssets,
    servedDocument: {
      path: SERVED_DOCUMENT_PATH,
      status: documentResponse.status(),
      html: await documentResponse.text(),
    },
    navigationPaths: entries.map((entry) => entry.path),
    themes: [...THEMES],
    detailRoute,
    stageNoticeRoute,
    unknownRoute: UNKNOWN_ROUTE,
  };
}

/* ---------------------------------------------------------------------------------------------
 * URLs in a served document
 * ------------------------------------------------------------------------------------------- */

/**
 * The origin of an absolute `http` or `https` URL, or `null` when the value is relative, a `data:` URI
 * or not a URL at all — which is exactly the set of values that cannot make the browser contact a third
 * party on their own.
 */
function originOfUrl(value: string): string | null {
  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch {
    return null;
  }
}

/** Every absolute `http` or `https` URL the document contains, wherever it sits. */
function absoluteUrlsIn(html: string): readonly string[] {
  return html.match(/https?:\/\/[^\s"'<>()]+/g) ?? [];
}

/**
 * The `src` of every `<script>` and the `href` of every `<link>` in the document.
 *
 * These are the two attributes through which a page loads another origin without a reader clicking
 * anything, so they are asserted separately from the document-wide URL scan: the failure names the
 * element the reference sits on.
 */
function attributeUrlsIn(html: string): readonly string[] {
  const values: string[] = [];
  const pattern = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*"([^"]*)"/gi;

  for (const match of html.matchAll(pattern)) {
    const value = match[1];

    if (value !== undefined) {
      values.push(value);
    }
  }

  return values;
}

/* ---------------------------------------------------------------------------------------------
 * The suite
 * ------------------------------------------------------------------------------------------- */

/*
 * Serial, so one worker builds the corpus once and every test asserts over it: a corpus collected per
 * test would sweep the application once per assertion, and the suite runs beside every other spec on a
 * shared host. A failure stops the rest of the file, which is the honest order — the first violation is
 * the finding, and later assertions describe a bundle this one has already rejected.
 */
test.describe.configure({ mode: 'serial', timeout: 240_000 });

/**
 * A rendered document shorter than this is a shell that failed to render rather than a screen: the
 * observed screens range from about 27 000 characters upward, and a crashed tree leaves roughly 1 700,
 * which is the empty shell plus the router's fallback markup.
 */
const EMPTY_DOCUMENT_LENGTH = 2_000;

/** The corpus the single sweep built, or `undefined` while the sweep has not finished. */
let corpus: ServedCorpus | undefined;

/**
 * The corpus, or a failure naming why there is none.
 *
 * A test that reaches an empty corpus would otherwise assert over nothing and pass vacuously, which is
 * the one failure mode a scan like this must not have.
 */
function servedCorpus(): ServedCorpus {
  if (corpus === undefined) {
    throw new Error(
      'the sweep did not finish, so there is no served corpus to assert over: the failure that stopped it is reported before this one.',
    );
  }

  return corpus;
}

/**
 * Builds the corpus once: the artefact read from disk, then one sweep in a context of this file's own.
 *
 * The disk read comes first so an absent or unreadable `dist/` fails before the browser starts, rather
 * than after a two-minute sweep has run for nothing. The context is created from the browser fixture
 * rather than taken from the page fixture because the sweep belongs to the whole file, and its `baseURL`
 * is read from the resolved project configuration so the port stays the one `playwright.config.ts`
 * derived for this checkout. Nothing else runs here: no storage state, no global setup, and no
 * dependency on another spec having gone first.
 */
test.beforeAll(async ({ browser }) => {
  const configuredBaseURL = test.info().project.use.baseURL;

  if (configuredBaseURL === undefined || configuredBaseURL === '') {
    throw new Error(
      'playwright.config.ts declares no use.baseURL, so the sweep has no address to drive: this whole file is about what the application\'s own origin serves (rule B-1).',
    );
  }

  const origin = originOfUrl(configuredBaseURL);

  if (origin === null) {
    throw new Error(
      `playwright.config.ts sets use.baseURL to "${configuredBaseURL}", which is not an absolute http(s) URL the sweep can drive.`,
    );
  }

  const builtFiles = await readBuiltFiles(projectRoot());

  const context = await browser.newContext({
    baseURL: origin,
    // The application registers no service worker. Blocking them keeps the corpus exactly the requests
    // the page itself makes, which is how the rest of the suite runs.
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 900 },
  });

  try {
    corpus = {
      ...(await collectServedCorpus(context, await context.newPage(), origin)),
      builtFiles,
    };
  } finally {
    await context.close();
  }
});

test('collects the built artefact from disk and a non-trivial served corpus', () => {
  const served = servedCorpus();
  const scripts = served.assets.filter(
    (asset) => asset.mediaType === 'text/javascript' || asset.mediaType === 'application/javascript',
  );
  const stylesheets = served.assets.filter((asset) => asset.mediaType === 'text/css');
  const documents = served.assets.filter((asset) => asset.mediaType === 'text/html');
  const builtPaths = new Set(served.builtFiles.map((file) => file.path));
  const builtScripts = served.builtFiles.filter((file) => file.path.endsWith('.js'));
  const builtStylesheets = served.builtFiles.filter((file) => file.path.endsWith('.css'));
  const builtFonts = served.builtFiles.filter((file) => file.path.endsWith(FONT_EXTENSION));
  const otherBuilt =
    served.builtFiles.length - builtScripts.length - builtStylesheets.length - builtFonts.length;

  console.log(
    `bundle-checks: scanned ${served.builtFiles.length} built file(s) read from ${BUILT_DIRECTORY}/ on disk — ${builtFonts.length} woff2, ${builtStylesheets.length} css, ${builtScripts.length} javascript, ${otherBuilt} other — and ${served.assets.length} served text asset(s) — ${documents.length} html, ${stylesheets.length} css, ${scripts.length} javascript — and ${served.routes.length} rendered document(s) over ${served.themes.length} theme(s) (${served.themes.join(', ')}), with ${served.fontPaths.length} bundled typeface(s) fetched from ${served.origin}.`,
  );
  if (served.unsettledRoutes.length > 0) {
    console.log(
      `bundle-checks: ${served.unsettledRoutes.length} route capture(s) were still reading when they were taken: ${served.unsettledRoutes.join('; ')}.`,
    );
  }

  expect(
    served.unreadableAssets,
    'a text response whose body could not be read leaves a hole in every scan below, so it must fail here rather than pass silently',
  ).toEqual([]);
  expect(
    scripts.length,
    'no script was collected, so the interface text compiled into the bundle was never scanned (rule P-7)',
  ).toBeGreaterThan(0);
  expect(
    stylesheets.length,
    'no stylesheet was collected, so the served CSS was never scanned',
  ).toBeGreaterThan(0);
  expect(
    documents.length,
    'no document was collected, so the served HTML was never scanned',
  ).toBeGreaterThan(0);
  expect(
    served.fontPaths.length,
    'no .woff2 arrived from the application\'s own origin, so nothing here proves the typefaces are bundled rather than fetched from a font host (rule B-1)',
  ).toBeGreaterThan(0);
  expect(
    served.servedDocument.status,
    `the server answered ${served.servedDocument.status} for ${SERVED_DOCUMENT_PATH}, so the document asserted below is not the application's entry document`,
  ).toBe(200);

  expect(
    served.builtFiles.length,
    `no file was read from the built artefact, so the ${BUILT_DIRECTORY} half of every scan below covered nothing (AAP 0.9, success criterion 8)`,
  ).toBeGreaterThan(0);
  expect(
    builtPaths.has(`${BUILT_DIRECTORY}/index.html`),
    `the built artefact holds no ${BUILT_DIRECTORY}/index.html, so what was read is not the document the preview server serves`,
  ).toBe(true);
  expect(
    builtScripts.length,
    'the built artefact holds no script, so the interface text compiled into the bundle was never scanned on disk (rule P-7)',
  ).toBeGreaterThan(0);
  expect(
    builtStylesheets.length,
    'the built artefact holds no stylesheet, so the emitted CSS was never scanned on disk',
  ).toBeGreaterThan(0);
  expect(
    builtFonts.length,
    `the built artefact holds no ${FONT_EXTENSION} file, so the bundled typefaces were never scanned on disk (rule B-1)`,
  ).toBeGreaterThan(0);

  /*
   * The two halves have to describe one artefact: every text asset the server answered, and every
   * typeface it delivered, has to be a file the build wrote. A served path that is not on disk would
   * mean the response sweep read something other than `dist/`, leaving the disk half to prove a
   * different bundle from the one a browser is handed.
   */
  const servedButNotBuilt = [
    ...new Set([
      ...served.assets.map((asset) => builtPathOf(asset)),
      ...served.fontPaths.map((path) => `${BUILT_DIRECTORY}${path}`),
    ]),
  ]
    .filter((path) => !builtPaths.has(path))
    .sort();

  expect(
    servedButNotBuilt,
    'the server handed out a file the built artefact does not hold, so the served half and the disk half are describing two different artefacts',
  ).toEqual([]);

  const thin = served.routes
    .filter((route) => route.html.length <= EMPTY_DOCUMENT_LENGTH)
    .map((route) => `${route.theme} theme, "${route.label}" at ${route.path}: ${route.html.length} characters`);

  expect(
    thin,
    'a rendered document this short is a shell that failed to render rather than a screen, and every scan below would then pass over an empty page',
  ).toEqual([]);

  expect(
    served.navigationPaths.length,
    'the shell offered a single navigation entry, so the sweep cannot claim it visited the application',
  ).toBeGreaterThan(1);

  const unvisited = served.themes.flatMap((theme) =>
    served.navigationPaths
      .filter(
        (path) => !served.routes.some((route) => route.theme === theme && route.path === path),
      )
      .map((path) => `${theme} theme: ${path}`),
  );

  expect(
    unvisited,
    'every enabled navigation entry has to be swept in both themes, or the scan covers a route set the reader does not get',
  ).toEqual([]);

  expect(
    served.detailRoute.startsWith(`${EXCEPTION_QUEUE_PATH}/`),
    `the row drill landed on ${served.detailRoute}, which is not a parameterised route below ${EXCEPTION_QUEUE_PATH}, so no detail screen was swept`,
  ).toBe(true);
  expect(
    served.stageNoticeRoute,
    'the S4 persona\'s entry route rendered the same address the not-found page does, so no stage-notice page was swept',
  ).not.toBe(served.unknownRoute);
});

test('serves no barred product name, no placeholder Latin text and no real vendor name', () => {
  const findings = scanCorpus(servedCorpus(), FORBIDDEN_STRINGS).map(describeFinding);

  expect(
    findings,
    'each line names the document or asset, what was forbidden and the text that matched it: rule P-7 bars the product name, placeholder Latin text, and every real vendor, carmaker and cloud product name from the interface',
  ).toEqual([]);
});

test('ships no claim of sovereignty, of copy prevention or of resistance to tampering', () => {
  const findings = scanCorpus(servedCorpus(), CLAIM_VOCABULARY).map(describeFinding);

  expect(
    findings,
    'rule P-4 forbids the interface from stating or implying a mechanism this demonstration does not have; the noun phrase the audit screen is required to carry is deliberately not matched',
  ).toEqual([]);
});

test('ships no credential and no build-time environment read', () => {
  const findings = scanCorpus(servedCorpus(), CREDENTIAL_SHAPES).map(describeFinding);

  expect(
    findings,
    'each line names the document or asset, the credential shape and the text that matched it: rule B-2 allows no key, token, password or other secret in the client bundle, and nothing in it may read a build-time environment value',
  ).toEqual([]);
});

test('serves an entry document that references no origin but its own', () => {
  const served = servedCorpus();
  const html = served.servedDocument.html;

  const foreignReferences = absoluteUrlsIn(html)
    .filter((url) => originOfUrl(url) !== served.origin)
    .map((url) => `${SERVED_DOCUMENT_PATH} references ${url}`);

  expect(
    foreignReferences,
    'rule B-1 allows no third-party host in the built output: no CDN script or style, no hosted font, no analytics or tag manager, no tile server and no embedded media may be referenced from the served document',
  ).toEqual([]);

  const foreignAttributes = attributeUrlsIn(html)
    .filter((value) => {
      const origin = originOfUrl(value);

      return origin !== null && origin !== served.origin;
    })
    .map((value) => `${SERVED_DOCUMENT_PATH} loads ${value} through a script or link element`);

  expect(
    foreignAttributes,
    'a <script src> or <link href> resolving away from the application\'s own origin would make the built page contact a third party as soon as it loads (rule B-1)',
  ).toEqual([]);

  const thirdPartyHosts = [
    'googletagmanager',
    'google-analytics',
    'fonts.googleapis',
    'fonts.gstatic',
    'cdn.jsdelivr',
    'unpkg.com',
    'cdnjs.cloudflare.com',
    'clarity.ms',
    'hotjar',
    'segment.com',
  ];
  const named = thirdPartyHosts
    .filter((host) => html.toLowerCase().includes(host))
    .map((host) => `${SERVED_DOCUMENT_PATH} names the third-party host "${host}"`);

  expect(
    named,
    'the served document names an analytics, tag-manager or font host, which rule B-1 excludes however the reference is spelled',
  ).toEqual([]);
});

test('labels every route it swept with the simulated-data badge', () => {
  const unlabelled = servedCorpus()
    .routes.filter((route) => !route.badgeVisible)
    .map(
      (route) =>
        `${route.theme} theme, "${route.label}" at ${route.path}: the banner-scoped badge control matched ${route.badgeMatches} element(s)`,
    );

  expect(
    unlabelled,
    'rule P-1 requires the "Simulated data" badge to be visible on every route — the stage-notice and not-found pages included — and a route that renders without it is also the first sign that the screen failed to mount; the count beside each route says whether nothing matched the badge or the match was not visible',
  ).toEqual([]);
});

/* ---------------------------------------------------------------------------------------------
 * Discrimination — the scans must still be able to fail
 * ------------------------------------------------------------------------------------------- */

/**
 * Samples each scan must match, so a pattern that has silently stopped matching is reported here rather
 * than by passing every scan above. The barred product name is assembled from fragments, so this file
 * never holds a second, freely copyable copy of the one word rule P-7 forbids.
 */
const SAMPLES_THAT_MUST_MATCH: readonly {
  readonly text: string;
  readonly patterns: readonly NamedPattern[];
  readonly why: string;
}[] = [
  {
    text: ['Plumb', 'line'].join(''),
    patterns: BARRED_PRODUCT_NAMES,
    why: 'the barred product name in its branded spelling',
  },
  {
    text: ['plumb', 'line'].join(''),
    patterns: BARRED_PRODUCT_NAMES,
    why: 'the barred product name in lower case',
  },
  {
    text: ['lorem', 'ipsum'].join(' '),
    patterns: PLACEHOLDER_LATIN,
    why: 'the placeholder Latin marker',
  },
  ...COINED_VENDOR_NAMES.map((name) => ({
    text: `the ${name.toLowerCase()} contract`,
    patterns: FORBIDDEN_STRINGS,
    why: `the real vendor name "${name}" in lower case, which the case-insensitive tier has to catch`,
  })),
  ...BRANDED_VENDOR_NAMES.map((name) => ({
    text: `the ${name} deployment`,
    patterns: FORBIDDEN_STRINGS,
    why: `the real vendor name "${name}" in its branded spelling`,
  })),
  {
    text: ['Meta', 'Platforms'].join(' '),
    patterns: FORBIDDEN_STRINGS,
    why: 'the vendor that names itself',
  },
  { text: ['tamper', 'proof'].join('-'), patterns: CLAIM_VOCABULARY, why: 'a tamper claim' },
  { text: ['tamper', 'resistant'].join(' '), patterns: CLAIM_VOCABULARY, why: 'a tamper claim' },
  { text: ['zero', 'trust'].join('-'), patterns: CLAIM_VOCABULARY, why: 'a security-posture claim' },
  { text: ['guarant', 'eed'].join(''), patterns: CLAIM_VOCABULARY, why: 'a guarantee' },
  { text: ['certif', 'ied'].join(''), patterns: CLAIM_VOCABULARY, why: 'a certification' },
  {
    text: `${['api', 'Key'].join('')}: '${['placeholder', 'value'].join('-')}'`,
    patterns: CREDENTIAL_SHAPES,
    why: 'a credential key assigned a value',
  },
  {
    text: `${['passw', 'ord'].join('')}: "${['placeholder', 'value'].join('-')}"`,
    patterns: CREDENTIAL_SHAPES,
    why: 'a password assigned a value',
  },
  {
    text: `${['Bea', 'rer'].join('')} ${['AbCd', '1234', 'EfGh', '5678'].join('')}`,
    patterns: CREDENTIAL_SHAPES,
    why: 'a bearer credential',
  },
  {
    text: `-----BEGIN ${['RSA', 'PRIVATE', 'KEY'].join(' ')}-----`,
    patterns: CREDENTIAL_SHAPES,
    why: 'a private key block',
  },
  {
    text: `const value = ${['import', 'meta', 'env'].join('.')};`,
    patterns: CREDENTIAL_SHAPES,
    why: 'a build-time environment read',
  },
];

/**
 * Text the scans must leave alone, each with the reason it is legitimate. These are the false positives
 * the patterns are shaped to avoid, measured on the built bundle: the browser's own `meta` element and
 * module metadata, React DOM's input-type vocabulary, the noun phrase rule P-4 requires the audit screen
 * to carry, a domain noun a package document may hold, and the design-token prose this project writes
 * everywhere.
 */
const SAMPLES_THAT_MUST_NOT_MATCH: readonly {
  readonly text: string;
  readonly patterns: readonly NamedPattern[];
  readonly why: string;
}[] = [
  {
    text: ['plumb', 'line'].join(' '),
    patterns: BARRED_PRODUCT_NAMES,
    why: 'two ordinary words are not the barred name',
  },
  {
    text: '<meta charset="utf-8" />',
    patterns: FORBIDDEN_STRINGS,
    why: 'the document element every page carries is not the company',
  },
  {
    text: ['import', 'meta', 'url'].join('.'),
    patterns: FORBIDDEN_STRINGS,
    why: 'the module metadata the build emits is not the company',
  },
  {
    text: 'Simulated control: this shows the mechanism, not production tamper resistance.',
    patterns: CLAIM_VOCABULARY,
    why: 'rule P-4 requires this exact sentence, so the noun form must not be matched',
  },
  {
    text: 'a certificate of analysis',
    patterns: CLAIM_VOCABULARY,
    why: 'a package document may legitimately carry one',
  },
  {
    text: `${['passw', 'ord'].join('')}:!0`,
    patterns: CREDENTIAL_SHAPES,
    why: 'the browser\'s input-type table names the type, not a credential',
  },
  {
    text: `e.type===\`${['passw', 'ord'].join('')}\``,
    patterns: CREDENTIAL_SHAPES,
    why: 'the same table again',
  },
  {
    text: 'the role token and the density token',
    patterns: CREDENTIAL_SHAPES,
    why: 'design-token prose names the design system, not a credential',
  },
];

test('still detects each prohibited shape and leaves legitimate interface text alone', () => {
  const missed = SAMPLES_THAT_MUST_MATCH.filter(
    (sample) => !matchesAny(sample.patterns, sample.text),
  ).map((sample) => `${sample.why} — no pattern matched ${JSON.stringify(sample.text)}`);

  expect(
    missed,
    'a pattern that has stopped matching a sample of its own shape would make every scan above pass vacuously',
  ).toEqual([]);

  const spurious = SAMPLES_THAT_MUST_NOT_MATCH.filter((sample) =>
    matchesAny(sample.patterns, sample.text),
  ).map((sample) => `${sample.why} — a pattern matched ${JSON.stringify(sample.text)}`);

  expect(
    spurious,
    'a pattern too broad to keep the gate honest fires on text the build must render or on the browser\'s own vocabulary, and would have to grow an exemption to pass',
  ).toEqual([]);
});
