// @vitest-environment node

/**
 * Rule B-2 source check: no credential sits in the repository's source trees, and nothing under `src/`
 * reads configuration.
 *
 * The credential half reads every file under `src/` and every file under `tests/` that can hold a
 * credential, and runs inside `npm test` (AAP §0.9); the built bundle is scanned by
 * `e2e/bundle-checks.spec.ts`, which repeats the same shapes over `dist/`. `tests/` is scanned beside
 * the application because rule B-2's subject is the repository rather than the application: a fixture
 * or a source check is exactly where a credential copied from a sample would be pasted, and one there
 * sits in the repository as much as one in `src/` does. One rule set covers both trees — the same
 * shapes, the same acceptance predicates and the same exclusion lists — so there is no second, weaker
 * scan to keep in step and no tree judged by a different standard. It matches credential **shapes**,
 * never bare words, and that is a deliberate and recorded decision: rule B-2's own vocabulary
 * ("apiKey", "token", "secret", "password") is also this project's design-token vocabulary — "role
 * token", `tokens.css`, "the density token" appear in the theme, component and stylesheet sources
 * because they describe the design system — so a literal substring match would fail the gate on prose
 * while no credential exists anywhere in the repository.
 *
 * No file, folder or comment line is exempt from the scan in either tree, and none may be made exempt:
 * `src/theme`, `src/components` and `src/app` are the likeliest places a credential would be planted,
 * and `tests/` holds the fixtures a sample gets copied into, so a location exemption would hide a real
 * one. This file is scanned like any other, because it sits under `tests/source-checks/` — which is why
 * every sample in it is assembled from fragments at call time and why its prose describes the shapes
 * without writing one. All the discrimination lives in the shapes themselves, each of which matches the
 * form a credential takes in code rather than the word for it: a credential key assigned a quoted
 * value, an `Authorization` header assigned a quoted value, a bearer token, a private-key block, or a
 * long base64-like literal. They are narrow enough that design-token prose cannot trip them and broad
 * enough that a real credential in any of those files still does. Do not narrow the scan back to a
 * bare-word match — it cannot pass — and do not add a prose exemption in its place, which would only
 * hide the next credential. The quoted value is what separates a stored credential from a type
 * declaration: `apiKey` beside a type describes a field, while the same name with a quoted value
 * carries one.
 *
 * Three guards keep the scan from passing vacuously, because a scan over an empty set reports nothing
 * and so proves nothing: each tree's collected set must be non-empty, `src/` must hold at least one
 * stylesheet, and no tree may carry a file type the scan passes over in silence. The stylesheet guard is
 * about the path rather than the text, because Vitest returns a stylesheet's text as an empty string in
 * this environment — the path is the only evidence that the glob's `css` branch ran, and without it the
 * stylesheet half of the pattern could stop being exercised with no failure to show it. `tests/` holds
 * no stylesheet today, so its collected and empty stylesheet sets are both empty and the canary rests on
 * `src/`; the compiled CSS is scanned as built text by `e2e/bundle-checks.spec.ts` (AAP §0.9).
 *
 * The same scan asserts that nothing under `src/` reads `import.meta.env` or `process.env` (AAP §0.9),
 * which is the form in which this plan meets the configuration half of rule B-2: it declares no
 * environment variable at all, so nothing may read one. That half covers `src/` alone, for the reason
 * recorded with the case itself: AAP §0.9 fixes the property of the application, and a test harness's
 * own environment read is not the application's configuration.
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

/**
 * Every file under `tests/` that can hold a credential, read the same way and with the same options.
 *
 * The second tree is here because rule B-2 forbids a secret in the repository, not only in the
 * application: `tests/fixtures` and `tests/source-checks` are where a value copied out of a sample
 * lands, and this file sits among them. The shapes, their acceptance predicates and their exclusion
 * lists are shared with the `src/` half — one rule set, two trees.
 */
const TEST_TEXT_FILES: Record<string, string> = import.meta.glob<string>(
  '../../tests/**/*.{ts,tsx,css,json,txt,svg}',
  { query: '?raw', import: 'default', eager: true },
);

/**
 * Every path under `tests/`, read for its path alone, so the coverage assertion can hold the tests tree
 * to the same comparison `ALL_SOURCE_FILES` allows for `src/`: a file added there in an extension the
 * text glob does not cover has to fail rather than escape the scan silently.
 */
const ALL_TEST_FILES: readonly string[] = Object.keys(import.meta.glob('../../tests/**/*'));

/** One tree the credential half of the check reads, with what it collected from it. */
interface CheckedTree {
  /** The tree's repository-relative directory, so a message that has to name the tree can. */
  readonly label: string;
  /** The raw text of every file the text glob matched, keyed by the glob path. */
  readonly textFiles: Record<string, string>;
  /** The path of every file the path-only glob matched, which coverage is measured against. */
  readonly allFiles: readonly string[];
}

/**
 * The two trees the credential half reads: `src/` and `tests/`, in that order so a failure lists the
 * application's own files first. The configuration half reads the first of them alone, and records why
 * where it scans.
 */
const CHECKED_TREES: readonly CheckedTree[] = [
  { label: 'src/', textFiles: SOURCE_TEXT_FILES, allFiles: ALL_SOURCE_FILES },
  { label: 'tests/', textFiles: TEST_TEXT_FILES, allFiles: ALL_TEST_FILES },
];

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
 * Every non-binary file type under a checked tree is read as text, SVG included: an SVG is markup, so
 * an element in one can carry an inline credential assignment, and the raw-text glob reads `*.svg`
 * with `TEXT_EXTENSIONS` listing it, so a credential planted in an icon file is reported like any
 * other. What is left here is binary data the scan cannot decode as text: the font and raster formats
 * Vite emits into `dist/assets/` as bytes and a browser never parses as configuration.
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

/**
 * This suite's own directory, relative to the repository root.
 *
 * `import.meta.glob` returns its keys relative to the importing module, so every key is written from
 * here: `../../src/app/app.tsx` for the application tree, `../fixtures/solver-expected-results.ts` for
 * a sibling folder, and `./forbidden-strings.test.ts` for a file in this directory. Anchoring a key at
 * this constant is what turns it into the repository-relative path a reader can open, and it is what
 * makes a finding in the tests tree name `tests/…` rather than a path written from inside that tree.
 */
const SUITE_DIRECTORY = 'tests/source-checks';

/** A glob key turned into the repository-relative path a reader can open. */
function sourcePathOf(globKey: string): string {
  const segments: string[] = [];

  for (const segment of `${SUITE_DIRECTORY}/${globKey}`.split('/')) {
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
 *
 * `accepts` lets one shape reject a candidate its pattern had to match, for a discrimination a regular
 * expression states less legibly than a named rule can. A rejected candidate is consumed like any other
 * match, so the scan moves past it instead of retrying a fragment of it.
 */
function findMatches(
  pattern: RegExp,
  text: string,
  accepts: (candidate: string) => boolean = () => true,
): ShapeMatch[] {
  const matches: ShapeMatch[] = [];
  const scan = new RegExp(pattern.source, pattern.flags);
  let match = scan.exec(text);

  while (match !== null) {
    if (match[0].length === 0) {
      // No shape below can match an empty string, but a zero-length match would spin the loop
      // forever, so it is stepped over rather than trusted not to occur.
      scan.lastIndex += 1;
    } else if (accepts(match[0])) {
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
  /**
   * An optional second test a candidate from this shape must also pass, for a rule that names
   * exclusions in words rather than in syntax.
   */
  readonly accepts?: (candidate: string) => boolean;
}

/**
 * The eight credential shapes rule B-2 forbids in the repository — `src/` and `tests/` alike
 * (AAP §0.9).
 *
 * Each one is a form a credential takes in code. None of them is the bare word, which is why the
 * design-token vocabulary the sources are full of cannot reach them.
 */
const CREDENTIAL_SHAPES: readonly CredentialShape[] = [
  {
    label: 'credential key assignment',
    // A named credential key followed by `:` or `=` and a quoted non-empty value, which is how every
    // adapter, client config and constant holds one. Both halves are needed: the key name is what makes
    // the line interesting, and the quoted value is what makes it a stored credential rather than a type
    // declaration — `apiKey: string` names a field and holds nothing.
    pattern:
      /(?:api[_-]?key|apikey|access[_-]?key|client[_-]?secret|secret[_-]?key|auth[_-]?token|access[_-]?token|refresh[_-]?token|id[_-]?token|bearer[_-]?token|private[_-]?key)\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
    sample: () => [['api', 'Key'].join(''), ':', `'${['placeholder', 'value'].join('-')}'`].join(' '),
  },
  {
    label: 'token assignment',
    // A bare `token` key given a quoted value. The word boundary plus the assignment operator plus the
    // value is the whole distinction from the design-token prose: "the role token, and ..." carries no
    // operator, and `--text-12` style declarations carry no quoted value.
    pattern: /\btoken\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
    sample: () => [['tok', 'en'].join(''), ':', `'${['placeholder', 'value'].join('-')}'`].join(' '),
  },
  {
    label: 'secret assignment',
    // A `secret` key given a quoted value — the same assignment form, for the name rule B-2 lists second.
    pattern: /\bsecret\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
    sample: () => [['sec', 'ret'].join(''), '=', `'${['placeholder', 'value'].join('-')}'`].join(' '),
  },
  {
    label: 'password assignment',
    // `password`, `passwd` or `pwd` with an assignment and a quoted value; the word alone is a label on a
    // form field or a type member, the assignment is a stored credential.
    pattern: /\b(?:passw(?:or)?d|pwd)\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
    sample: () => [['passw', 'ord'].join(''), ':', `'${['placeholder', 'value'].join('-')}'`].join(' '),
  },
  {
    label: 'authorization header',
    // An `Authorization` header being set or documented with a quoted value — the shape a token reaches
    // the network in, and the reason the word "authorization" alone is not enough: the permission matrix
    // discusses authorisation in prose throughout `src/domain` and `src/services`, and the role switcher's
    // note says the checks are not production authorisation.
    pattern: /\bauthorization\s*[:=]\s*(['"`])[^'"`\n]+\1/gi,
    sample: () =>
      [['Author', 'ization'].join(''), ':', `'${['place', 'holder'].join('')}'`].join(' '),
  },
  {
    label: 'bearer token',
    // `Bearer` followed by eight or more credential characters: the token itself, not the scheme name.
    // "bearer" as a bare word appears in prose; `Bearer <credential>` never does.
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
    // Forty or more characters of the base64 alphabet, delimited on both sides so the match is the whole
    // token and never a fragment of a longer run — a fragment would be reported at a line where the run
    // does not start, and the caller could not find it.
    //
    // Three candidate classes are excluded by `accepts` below, each for its own reason, because they are
    // long base64-alphabet runs this codebase holds by design and none of them encodes a credential.
    pattern: /(?<![A-Za-z0-9+/=])[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/=])/g,
    sample: () => ['Ab3dEf6g', 'Hi9jKl2m', 'No5pQr8s', 'Tu1vWx4y', 'Za7bCd8e'].join(''),
    accepts: (candidate) => {
      const encoded = candidate.replace(/=+$/, '');

      // A pure hexadecimal run is a digest or an identifier, not an encoded key: the audit chain's
      // hashes, the genesis `previousHash` of 64 zeros and every seed identifier are all of this form.
      if (/^[0-9a-f]+$/i.test(encoded)) {
        return false;
      }

      // A run with no digit is a word, a slug or a permission name in a long camel-case list.
      if (!/\d/.test(encoded)) {
        return false;
      }

      // A run with no letter is a count, a version or a checksum constant.
      return /[A-Za-z]/.test(encoded);
    },
  },
];

/** One thing the scan looks for that proves configuration is not read from the environment. */
interface ConfigurationRead {
  /** What the read is, named in every failure message it produces. */
  readonly label: string;
  /** The read itself, with the `g` flag so every occurrence is reported. */
  readonly pattern: RegExp;
}

/**
 * A Vite build-time configuration read, matched against raw text so a comment cannot hide one:
 * AAP §0.9 records that the plan declares no environment variable at all, which makes any mention of
 * this form a finding wherever it sits — code, comment or prose.
 *
 * Both patterns are written with escaped dots, so the file that forbids these reads carries neither of
 * them as a readable expression: writing a read inside a pattern is not reading one, and the escaping is
 * what keeps a reader from mistaking this line for one.
 */
const IMPORT_META_ENV_READ: ConfigurationRead = {
  label: 'import.meta.env read',
  pattern: /\bimport\.meta\.env\b/g,
};

/** A Node process configuration read, forbidden for the same reason as the Vite form above. */
const PROCESS_ENV_READ: ConfigurationRead = {
  label: 'process.env read',
  pattern: /\bprocess\.env\b/g,
};

/** The environment reads rule B-2's configuration half forbids under `src/` (AAP §0.9). */
const CONFIGURATION_READS: readonly ConfigurationRead[] = [IMPORT_META_ENV_READ, PROCESS_ENV_READ];

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
 * Prose from the sources that must pass for a second reason: it names one of the forbidden things
 * without ever assigning a value to it.
 *
 * The first is the role switcher's statement that browser-side permission checks are not production
 * authorisation (rule P-3), which is why the authorisation shape needs an assigned quoted value rather
 * than the word. The second states the absence rule B-2 requires. The third is ordinary record content
 * whose words sit next to the forbidden vocabulary with nothing to match.
 */
const NON_CREDENTIAL_PROSE: readonly string[] = [
  'Browser-side permission checks are not production authorisation.',
  'This module reads no secret, no token and no password.',
  'Certificate of analysis: the supplier declares the alloy and the heat number.',
];

/**
 * Long strings that are not credentials, for the same reason.
 *
 * Each is content this codebase holds by design, and each is excluded by one of the base64 shape's
 * stated exclusions: a lowercase hex digest by the pure-hexadecimal exclusion, and a run of decimal
 * digits — the form the audit chain's 64-zero genesis `previousHash` takes — by the no-letter exclusion.
 */
const NON_CREDENTIAL_LONG_STRINGS: readonly string[] = [
  '9f2c4a6b8d0e1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f1a',
  '0'.repeat(64),
  '1'.repeat(64),
];

/* ---------------------------------------------------------------------------------------------
 * Suites
 * ------------------------------------------------------------------------------------------- */

/**
 * Every shape one sample matches, decided by the same rules the tree scan applies.
 *
 * The non-credential samples prove the scan's discrimination only if they are measured against the
 * acceptance rule as well as the pattern, so this routes through `findMatches` exactly as the tree scan
 * does rather than testing the patterns alone.
 */
function shapesMatching(sample: string): CredentialShape[] {
  return CREDENTIAL_SHAPES.filter(
    (shape) => findMatches(shape.pattern, sample, shape.accepts).length > 0,
  );
}

describe('no-secrets source check (rule B-2)', () => {
  /**
   * The guard the rest of the suite rests on: a scan whose input set is empty reports no finding and so
   * passes every assertion below for the wrong reason. Each tree is asserted here rather than left to
   * the coverage check, because that check compares two lists that are both empty on an empty tree.
   *
   * The stylesheet leaf stays with `src/`, the one tree that holds stylesheets today: its presence is
   * what proves the glob's `css` branch ran, and `tests/` cannot carry that proof while it holds none.
   */
  it('collects a non-empty file set from both trees, including a stylesheet under src/', () => {
    const emptyTrees = CHECKED_TREES.filter(
      (tree) => tree.allFiles.length === 0 || Object.keys(tree.textFiles).length === 0,
    ).map((tree) => tree.label);
    const stylesheetPaths = Object.keys(SOURCE_TEXT_FILES).filter(
      (path) => extensionOf(path) === STYLESHEET_EXTENSION,
    );

    expect(
      emptyTrees,
      'a glob collected nothing from a tree, so every scan over it would pass without reading a file',
    ).toEqual([]);
    expect(
      stylesheetPaths.length,
      "no stylesheet was collected under src/, so the glob's css branch never ran",
    ).toBeGreaterThan(0);
  });

  it('reads every file under src/ and tests/ that can hold a credential', () => {
    const coverage = CHECKED_TREES.map((tree) => {
      const readablePaths = Object.keys(tree.textFiles);

      return {
        label: tree.label,
        stylesheetPaths: tree.allFiles
          .filter((path) => extensionOf(path) === STYLESHEET_EXTENSION)
          .map(sourcePathOf)
          .sort(),
        unreadTextFiles: tree.allFiles
          .filter(
            (path) => TEXT_EXTENSIONS.includes(extensionOf(path)) && !readablePaths.includes(path),
          )
          .map(sourcePathOf),
        emptyTextFiles: Object.entries(tree.textFiles)
          .filter(([path, text]) => extensionOf(path) !== STYLESHEET_EXTENSION && text.trim() === '')
          .map(([path]) => sourcePathOf(path)),
        emptyStylesheets: Object.entries(tree.textFiles)
          .filter(([path, text]) => extensionOf(path) === STYLESHEET_EXTENSION && text === '')
          .map(([path]) => sourcePathOf(path))
          .sort(),
        unknownExtensions: tree.allFiles
          .filter((path) => {
            const extension = extensionOf(path);

            return (
              !TEXT_EXTENSIONS.includes(extension) &&
              extension !== STYLESHEET_EXTENSION &&
              !ASSET_EXTENSIONS.includes(extension)
            );
          })
          .map(sourcePathOf),
      };
    });

    expect(
      coverage.flatMap((entry) => entry.unreadTextFiles),
      'a source file was not read as text, so a credential in it could not be found',
    ).toEqual([]);
    expect(
      coverage.flatMap((entry) => entry.emptyTextFiles),
      'a source file was read as text but came back empty',
    ).toEqual([]);
    for (const entry of coverage) {
      expect(
        entry.emptyStylesheets,
        `only a stylesheet may come back empty under ${entry.label}; Vitest stubs CSS module text to an empty string`,
      ).toEqual(entry.stylesheetPaths);
    }
    expect(
      coverage.flatMap((entry) => entry.unknownExtensions),
      'new file type in a checked tree: extend this scan to read it, or record why it cannot hold a credential',
    ).toEqual([]);
  });

  it('reports no credential shape under src/ or tests/', () => {
    const findings: string[] = [];

    for (const tree of CHECKED_TREES) {
      for (const [path, text] of Object.entries(tree.textFiles)) {
        for (const shape of CREDENTIAL_SHAPES) {
          for (const match of findMatches(shape.pattern, text, shape.accepts)) {
            findings.push(`${sourcePathOf(path)}:${match.line} — ${match.text} [${shape.label}]`);
          }
        }
      }
    }

    expect(
      findings,
      'rule B-2 forbids a credential anywhere in the repository: each line above names the file, the line and the shape',
    ).toEqual([]);
  });

  /**
   * Scoped to `src/` deliberately: this is the one place the two trees are not judged alike, and the
   * difference is the subject rather than the rule.
   *
   * AAP §0.9 fixes the property of the **application** — "Nothing in `src/` reads `import.meta.env` or
   * `process.env`" — because the application is what runs in a browser against a deployment's
   * configuration. A test harness is a different thing: reading the environment a runner was started
   * with is how a harness does its job, so a scan of `tests/` for this form would assert a property no
   * source of truth sets and would report a legitimate read as a finding. The credential half above
   * carries rule B-2's repository-wide guarantee; only this half is `src/`.
   */
  it('finds no configuration read anywhere under src/', () => {
    const findings: string[] = [];

    for (const [path, text] of Object.entries(SOURCE_TEXT_FILES)) {
      for (const read of CONFIGURATION_READS) {
        for (const match of findMatches(read.pattern, text)) {
          findings.push(`${sourcePathOf(path)}:${match.line} — ${match.text} [${read.label}]`);
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
      ({ pattern, sample, accepts }) => {
        expect(pattern.global, 'a shape without the `g` flag cannot be scanned').toBe(true);

        const credential = sample();
        const matches = findMatches(pattern, credential, accepts);

        expect(
          matches.length,
          `the shape did not fire on ${JSON.stringify(credential)}`,
        ).toBeGreaterThan(0);
        expect(matches[0]?.line).toBe(1);
      },
    );

    it('leaves design-token prose, disclaimers and other non-credential strings alone', () => {
      const uncleared = [
        ...DESIGN_TOKEN_PROSE,
        ...NON_CREDENTIAL_PROSE,
        ...NON_CREDENTIAL_LONG_STRINGS,
      ].flatMap((sample) =>
        shapesMatching(sample).map(
          (shape) => `${JSON.stringify(sample)} flagged as ${shape.label}`,
        ),
      );

      expect(
        uncleared,
        'a shape matched a non-credential string, so it is too broad to keep the gate honest',
      ).toEqual([]);
    });
  });

  describe('configuration-read discrimination', () => {
    /**
     * Both reads are assembled from fragments at call time rather than typed, so this file carries no
     * environment read of its own while still proving the patterns fire on one.
     */
    const IMPORT_META_ENV = ['import', 'meta', 'env'].join('.');
    const PROCESS_ENV = ['process', 'env'].join('.');

    it('flags the Vite form in code and in a comment alike', () => {
      const code = `const fallback = ${IMPORT_META_ENV}.apiBase;`;
      const comment = [
        '/**',
        ` * The build supplies nothing, so ${IMPORT_META_ENV} is never read.`,
        ' */',
      ];

      expect(
        findMatches(IMPORT_META_ENV_READ.pattern, code).map((match) => match.line),
      ).toEqual([1]);
      expect(
        findMatches(IMPORT_META_ENV_READ.pattern, comment.join('\n')).map((match) => match.line),
        'a mention inside a comment is a finding too: nothing under src/ may name this form',
      ).toEqual([2]);
    });

    it('flags the Node form in code and in a comment alike', () => {
      const code = `const mode = ${PROCESS_ENV}.MODE;`;
      const comment = `// ${PROCESS_ENV} is never read in this application`;

      expect(findMatches(PROCESS_ENV_READ.pattern, code).map((match) => match.line)).toEqual([1]);
      expect(
        findMatches(PROCESS_ENV_READ.pattern, comment).map((match) => match.line),
        'a mention inside a comment is a finding too: nothing under src/ may name this form',
      ).toEqual([1]);
    });

    it('leaves prose about configuration alone', () => {
      const prose = [
        'The application reads no configuration from the environment and declares no variable.',
        'A deployment supplies the service implementation, not a key.',
      ];
      const found = prose.flatMap((sample) =>
        CONFIGURATION_READS.flatMap((read) => findMatches(read.pattern, sample)),
      );

      expect(found, 'prose about configuration is not a configuration read').toEqual([]);
    });
  });
});
