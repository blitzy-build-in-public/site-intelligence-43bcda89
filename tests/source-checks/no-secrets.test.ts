// @vitest-environment node

/**
 * Rule B-2 source check: no credential sits under `src/`, and nothing there reads configuration.
 *
 * The check scans every file under `src/` and runs inside `npm test` (AAP §0.9); the built bundle is
 * scanned by `e2e/bundle-checks.spec.ts`, which repeats the same shapes over `dist/`. It matches
 * credential **shapes**, never bare words, and that is a deliberate and recorded decision: rule B-2's
 * own vocabulary ("apiKey", "token", "secret", "password") is also this project's design-token
 * vocabulary — "role token", `tokens.css`, "the density token" appear in the theme, component and
 * stylesheet sources because they describe the design system — so a literal substring match would fail
 * the gate on prose while no credential exists anywhere in the tree.
 *
 * No file, folder or comment line is exempt from the scan, and none may be made exempt: `src/theme`,
 * `src/components` and `src/app` are the likeliest places a credential would be planted, so a location
 * exemption would hide a real one. All the discrimination lives in the shapes themselves, each of which
 * matches the form a credential takes in code rather than the word for it: a credential key assigned a
 * value, an `Authorization` header, a bearer credential, a private-key block, or a long base64-like
 * literal. They are narrow enough that design-token prose cannot trip them and broad enough that a real
 * credential in any of those files still does. Do not narrow the scan back to a bare-word match — it
 * cannot pass — and do not add a prose exemption in its place, which would only hide the next credential.
 *
 * The same scan asserts that nothing under `src/` reads `import.meta.env` or `process.env` (AAP §0.9),
 * which is the form in which this plan meets the configuration half of rule B-2: it declares no
 * environment variable at all, so nothing may read one.
 *
 * Node environment: the check reads source text and asserts on it, so it needs no DOM. Vite's
 * `import.meta.glob` is the only build facility it uses, and `@types/node` stays out of the project —
 * the file system is never imported directly.
 */

import { describe, expect, it } from 'vitest';

/* ---------------------------------------------------------------------------------------------
 * The sources this check reads
 * ------------------------------------------------------------------------------------------- */

/**
 * Every file under `src/` that can hold a credential, read as raw text at collection time.
 *
 * `?raw` reads a file's bytes without evaluating it, so the check sees the source exactly as a reader
 * does — a comment and a JSON record alike. The one exception is a stylesheet, whose text Vitest stubs
 * to an empty string in this environment; `STYLESHEET_EXTENSION` below records why that is allowed.
 */
const SOURCE_TEXT_FILES: Record<string, string> = import.meta.glob<string>(
  '../../src/**/*.{ts,tsx,css,json,txt,svg}',
  { query: '?raw', import: 'default', eager: true },
);

/**
 * Every path under `src/`, read for its path alone.
 *
 * The set exists so the coverage assertion can compare what the scanner reads against what the tree
 * actually holds: a file added later in an extension the glob does not cover has to fail here rather
 * than escape the scan silently.
 */
const ALL_SOURCE_FILES: readonly string[] = Object.keys(import.meta.glob('../../src/**/*'));

/** Extensions whose text the scan reads: source, data and licence text. */
const TEXT_EXTENSIONS: readonly string[] = ['.ts', '.tsx', '.json', '.txt', '.svg'];

/**
 * The stylesheet extension, read for coverage but not for content.
 *
 * Vitest stubs a CSS module's text to an empty string in this environment (Vitest 5.1.2 offers no
 * `--css` flag for a `node` suite), so the coverage assertion allows exactly these files to come back
 * empty. The stylesheet half of the credential scan is not dropped by that: the compiled CSS ships in
 * the bundle, which `e2e/bundle-checks.spec.ts` scans as built text.
 */
const STYLESHEET_EXTENSION = '.css';

/**
 * The asset formats the scan cannot read as text, listed so the coverage assertion below allows them.
 *
 * Every non-binary file type under `src/` is read as text, SVG included: an SVG is markup, so an
 * element in one can carry an inline credential assignment, and the raw-text glob above reads
 * `*.svg` with `TEXT_EXTENSIONS` listing it, so a credential planted in an icon file is reported
 * like any other. What is left here is binary data the scan cannot decode as text: the font and
 * raster formats Vite emits into `dist/assets/` as bytes and a browser never parses as
 * configuration.
 */
const ASSET_EXTENSIONS: readonly string[] = [
  '.woff2',
  '.woff',
  '.ttf',
  '.otf',
  '.png',
  '.jpg',
  '.jpeg',
  '.ico',
  '.webp',
];

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

/** The lower-case extension of a path, or an empty string when it carries none. */
function extensionOf(path: string): string {
  const lastDot = path.lastIndexOf('.');
  const lastSeparator = path.lastIndexOf('/');

  return lastDot > lastSeparator ? path.slice(lastDot).toLowerCase() : '';
}

/** A glob key turned into the repository-relative path a reader can open. */
function sourcePathOf(globKey: string): string {
  return globKey.replace(/^(?:\.\.\/)+/, '');
}

/** One occurrence of a shape in a file's text. */
interface ShapeMatch {
  /** One-based line number of the match, so a failure points at the line to open. */
  readonly line: number;
  /** The matched text, truncated to stay readable in a failure message. */
  readonly text: string;
}

/** The longest excerpt of a match a failure message carries. */
const EXCERPT_LENGTH = 60;

/**
 * Every match of one shape in one text, with the line each sits on.
 *
 * The pattern is rebuilt from its own source and flags for every call, so a `lastIndex` left behind by
 * an earlier scan of a shared RegExp cannot make a later one skip matches — the failure mode that turns
 * a credential scan into a check that reports nothing.
 */
function findMatches(pattern: RegExp, text: string): ShapeMatch[] {
  const matches: ShapeMatch[] = [];
  const scan = new RegExp(pattern.source, pattern.flags);
  let match = scan.exec(text);

  while (match !== null) {
    if (match[0].length === 0) {
      // No shape below can match an empty string, but a zero-length match would spin the loop
      // forever, so it is stepped over rather than trusted not to occur.
      scan.lastIndex += 1;
    } else {
      matches.push({
        line: text.slice(0, match.index).split('\n').length,
        text: match[0].slice(0, EXCERPT_LENGTH),
      });
    }
    match = scan.exec(text);
  }

  return matches;
}

/* ---------------------------------------------------------------------------------------------
 * The credential shapes
 * ------------------------------------------------------------------------------------------- */

/** One thing the scan looks for, and a sample proving the shape still fires. */
interface CredentialShape {
  /** What the shape is, named in every failure message it produces. */
  readonly label: string;
  /**
   * The shape itself. Every pattern carries the `g` flag: `findMatches` iterates it, and a pattern
   * without it matches the same spot forever rather than advancing.
   */
  readonly pattern: RegExp;
  /**
   * A string of the shape's own form, assembled when it is called so that this file never holds a
   * credential-shaped literal of its own and no real value appears in it.
   */
  readonly sample: () => string;
}

/**
 * The eight credential shapes rule B-2 forbids under `src/` (AAP §0.9).
 *
 * Each one is a form a credential takes in code. None of them is the bare word, which is why the
 * design-token vocabulary the sources are full of cannot reach them.
 */
const CREDENTIAL_SHAPES: readonly CredentialShape[] = [
  {
    label: 'credential key assignment',
    // A named credential key followed by `:` or `=`, which is how every adapter, client config and
    // constant holds one. The key name is the signal: prose says "token", code that carries a
    // credential says `apiKey`.
    pattern:
      /(?:api[_-]?key|apikey|access[_-]?key|client[_-]?secret|secret[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|id[_-]?token|bearer[_-]?token|private[_-]?key)\s*[:=]/gi,
    sample: () => [['api', 'Key'].join(''), '=', ['placeholder', 'value'].join('-')].join(' '),
  },
  {
    label: 'token assignment',
    // A bare `token` key given a value. The word boundary plus the assignment operator is the whole
    // distinction from the design-token prose: "the role token, and ..." carries no operator, while
    // `token: "<value>"` in code does.
    pattern: /\btoken\s*[:=]/gi,
    sample: () => [['tok', 'en'].join(''), ':', ['placeholder', 'value'].join('-')].join(' '),
  },
  {
    label: 'secret assignment',
    // A `secret` key given a value — the same assignment form, for the name B-2 lists second.
    pattern: /\bsecret\s*[:=]/gi,
    sample: () => [['sec', 'ret'].join(''), '=', ['placeholder', 'value'].join('-')].join(' '),
  },
  {
    label: 'password assignment',
    // `password` or `passwd` with an assignment operator; the word alone is a label on a form field,
    // the assignment is a stored credential.
    pattern: /\bpassw(?:or)?d\s*[:=]/gi,
    sample: () => [['passw', 'ord'].join(''), ':', ['placeholder', 'value'].join('-')].join(' '),
  },
  {
    label: 'authorization header',
    // An `Authorization` header being set or documented with a value — the shape a token reaches the
    // network in, and the reason the word "authorization" alone is not enough: the permission matrix
    // discusses authorization in prose throughout `src/domain` and `src/services`.
    pattern: /\bauthorization\s*[:=]/gi,
    sample: () => [['Author', 'ization'].join(''), ':', ['place', 'holder'].join('')].join(' '),
  },
  {
    label: 'bearer credential',
    // `Bearer` followed by eight or more credential characters: the token itself, not the scheme
    // name. "bearer " as a bare word appears in prose; `Bearer <credential>` never does.
    pattern: /\bbearer\s+[A-Za-z0-9._~+/-]{8,}=*/gi,
    sample: () =>
      [['Bea', 'rer'].join(''), ['AbCd', '1234', 'EfGh', '5678'].join('')].join(' '),
  },
  {
    label: 'private key block',
    // A PEM private-key header, which has no innocent occurrence in a frontend repository.
    pattern: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/g,
    sample: () => `${['-----BEGIN', ['RSA', 'PRIVATE', 'KEY'].join(' ')].join(' ')}-----`,
  },
  {
    label: 'long base64-like literal',
    // Forty or more characters of the base64 alphabet carrying mixed case *and* a digit. The two
    // conditions are what keep the shape a credential signal rather than a length test: a lowercase
    // hex SHA-256 digest (the audit chain is full of them) and a long digit run (identifier and
    // checksum constants) are neither mixed-case nor letter-bearing in the way an encoded key is, and
    // both appear in this codebase by design.
    pattern: /(?=[A-Za-z0-9+/]*[a-z])(?=[A-Za-z0-9+/]*[A-Z])(?=[A-Za-z0-9+/]*\d)[A-Za-z0-9+/]{40,}=*/g,
    sample: () => ['Ab3dEf6g', 'Hi9jKl2m', 'No5pQr8s', 'Tu1vWx4y', 'Za7bCd8e'].join(''),
  },
];

/** One thing the scan looks for that proves configuration is not read from the environment. */
interface ConfigurationRead {
  /** What the read is, named in every failure message it produces. */
  readonly label: string;
  /** The read itself, with the `g` flag so every occurrence is reported. */
  readonly pattern: RegExp;
}

/** The environment reads rule B-2's configuration half forbids under `src/` (AAP §0.9). */
const CONFIGURATION_READS: readonly ConfigurationRead[] = [
  { label: 'import.meta.env read', pattern: /import\.meta\.env/g },
  { label: 'process.env read', pattern: /process\.env/g },
];

/* ---------------------------------------------------------------------------------------------
 * The design-token vocabulary, which the scan must leave alone
 * ------------------------------------------------------------------------------------------- */

/**
 * Prose from the sources that uses rule B-2's words for the design system.
 *
 * Every one of these is why the scan matches shapes rather than words: passed through the detector
 * they must produce no match, or the scan would have to exempt the files that hold them.
 */
const DESIGN_TOKEN_PROSE: readonly string[] = [
  'the role token, and raw palette values stay in the theme files',
  '@import "../theme/tokens.css";',
  'the density token (`--row-height`) rather than a pixel value',
  'The 24x24 px target and focus-ring tokens',
];

/**
 * Long strings that are not credentials, for the same reason.
 *
 * Both are the kind of content that appears in this codebase by design and both fail the base64
 * shape's mixed-case-and-digit requirement: a lowercase hex digest and a run of decimal digits.
 */
const NON_CREDENTIAL_LONG_STRINGS: readonly string[] = [
  '9f2c4a6b8d0e1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a',
  '1'.repeat(64),
];

/* ---------------------------------------------------------------------------------------------
 * Suites
 * ------------------------------------------------------------------------------------------- */

describe('no-secrets source check (rule B-2)', () => {
  it('reads every source file that can hold a credential', () => {
    const readablePaths = Object.keys(SOURCE_TEXT_FILES);
    const stylesheetPaths = ALL_SOURCE_FILES.filter(
      (path) => extensionOf(path) === STYLESHEET_EXTENSION,
    );
    const unreadTextFiles = ALL_SOURCE_FILES.filter(
      (path) => TEXT_EXTENSIONS.includes(extensionOf(path)) && !readablePaths.includes(path),
    );
    const emptyTextFiles = Object.entries(SOURCE_TEXT_FILES)
      .filter(([path, text]) => extensionOf(path) !== STYLESHEET_EXTENSION && text.trim() === '')
      .map(([path]) => sourcePathOf(path));
    const emptyStylesheets = Object.entries(SOURCE_TEXT_FILES)
      .filter(([path, text]) => extensionOf(path) === STYLESHEET_EXTENSION && text === '')
      .map(([path]) => sourcePathOf(path));
    const unknownExtensions = ALL_SOURCE_FILES.filter((path) => {
      const extension = extensionOf(path);

      return (
        !TEXT_EXTENSIONS.includes(extension) &&
        extension !== STYLESHEET_EXTENSION &&
        !ASSET_EXTENSIONS.includes(extension)
      );
    });

    expect(
      unreadTextFiles.map(sourcePathOf),
      'a source file was not read as text, so a credential in it could not be found',
    ).toEqual([]);
    expect(emptyTextFiles, 'a source file was read as text but came back empty').toEqual([]);
    expect(
      emptyStylesheets,
      'only a stylesheet may come back empty here; Vitest stubs CSS module text to an empty string',
    ).toEqual(stylesheetPaths.map(sourcePathOf));
    expect(
      unknownExtensions.map(sourcePathOf),
      'new file type in src/: extend this scan to read it, or record why it cannot hold a credential',
    ).toEqual([]);
  });

  it('reports no credential shape anywhere under src/', () => {
    const findings: string[] = [];

    for (const [path, text] of Object.entries(SOURCE_TEXT_FILES)) {
      for (const shape of CREDENTIAL_SHAPES) {
        for (const match of findMatches(shape.pattern, text)) {
          findings.push(`${sourcePathOf(path)}:${match.line} [${shape.label}] ${match.text}`);
        }
      }
    }

    expect(
      findings,
      'rule B-2 forbids a credential under src/: each line above names the file, the line and the shape',
    ).toEqual([]);
  });

  it('finds no configuration read anywhere under src/', () => {
    const findings: string[] = [];

    for (const [path, text] of Object.entries(SOURCE_TEXT_FILES)) {
      for (const read of CONFIGURATION_READS) {
        for (const match of findMatches(read.pattern, text)) {
          findings.push(`${sourcePathOf(path)}:${match.line} [${read.label}] ${match.text}`);
        }
      }
    }

    expect(
      findings,
      'the plan declares no environment variable, so nothing under src/ may read one (AAP §0.9)',
    ).toEqual([]);
  });

  describe('shape discrimination', () => {
    it.each(CREDENTIAL_SHAPES)(
      'flags the $label shape in a sample credential',
      ({ pattern, sample }) => {
        expect(pattern.global, 'a shape without the `g` flag cannot be scanned').toBe(true);

        const credential = sample();
        const matches = findMatches(pattern, credential);

        expect(
          matches.length,
          `the shape did not fire on ${JSON.stringify(credential)}`,
        ).toBeGreaterThan(0);
        expect(matches[0]?.line).toBe(1);
      },
    );

    it('leaves design-token prose and other non-credential strings alone', () => {
      const uncleared = [...DESIGN_TOKEN_PROSE, ...NON_CREDENTIAL_LONG_STRINGS].flatMap((sample) =>
        CREDENTIAL_SHAPES.filter((shape) => findMatches(shape.pattern, sample).length > 0).map(
          (shape) => `${JSON.stringify(sample)} flagged as ${shape.label}`,
        ),
      );

      expect(
        uncleared,
        'a shape matched a non-credential string, so it is too broad to keep the gate honest',
      ).toEqual([]);
    });
  });
});
