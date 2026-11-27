// @vitest-environment node

/**
 * Rules P-7, P-4 and P-1 source check: nothing under `src/` carries the barred product name, a real
 * company or cloud product name, placeholder Latin text, or the vocabulary of an unimplemented claim.
 *
 * AAP §0.9 owns this row: the check reads every TypeScript, TSX and CSS file under `src/` as raw text
 * and runs inside `npm test`. The built output is the other half of the same rule and is owned by
 * `e2e/bundle-checks.spec.ts`, which defines its own word lists over `dist/`; this file neither
 * imports it nor reads `dist/`, so the two halves can neither duplicate nor weaken each other.
 *
 * What each category is for:
 *  - rule P-7 fixes the product and the workspace names, bars one product name outright, and admits
 *    only the synthetic companies, people and figures of the seed data — so a real vendor, carmaker or
 *    cloud product name, and any placeholder Latin text, fail here;
 *  - rule P-4 forbids the application from stating or implying that it establishes sovereignty,
 *    prevents copying or resists tampering, so the adjectival vocabulary of such a claim fails here;
 *  - rule P-1 forbids presenting a synthetic outcome as a real production result, whose shortest form
 *    on screen is one of those claims.
 *
 * No file, folder, line or extension under `src/` is exempt, and none may be made exempt. A
 * prohibited name would land in `src/seed` (the company data), in `src/features` (the prose a reader
 * sees) or in a stylesheet comment before it landed anywhere else, so a location exemption would hide
 * exactly the occurrence the rule exists to catch. Every pattern is word-bounded, and the
 * discrimination suite at the end of this file proves that each one still fires: a scan that has
 * silently stopped matching is the failure mode these tests exist to prevent.
 *
 * A file under `src/` that wants to assert the absence of this vocabulary must not embed it, because
 * the test file would then sit inside the tree this check reads and the scan would report its own
 * prover. The suites that already assert it (`src/app/app.test.tsx`, `src/app/role-switcher.test.tsx`,
 * `src/domain/policy/policy.test.ts` and
 * `src/features/scr-05-approvals-and-audit/audit-screen.test.tsx`) therefore assemble each phrase from
 * fragments at run time. Keep doing that rather than retyping a phrase, and never widen a pattern to
 * let a test file through.
 *
 * Node environment: the check reads source text and asserts on it, so it needs no DOM. The file system
 * is never imported — `@types/node` is absent from the project and `tsconfig.json` declares
 * `vite/client` alone — so Vite's `import.meta.glob` with the `?raw` query is the one reading facility
 * used, and `repositoryPathOf` below resolves a glob key into a repository path by hand.
 */

import { describe, expect, it } from 'vitest';

/* ---------------------------------------------------------------------------------------------
 * The sources this check reads
 * ------------------------------------------------------------------------------------------- */

/**
 * Every TypeScript, TSX and stylesheet file under `src/`, read as raw text at collection time.
 *
 * `?raw` reads a file's bytes without evaluating it, so the scan sees a comment, a string literal and
 * a JSX text node exactly as a reader does. A stylesheet contributes its path to the guards below even
 * though Vitest hands back an empty string for its text here: `test.css` is off in `vite.config.ts`, so
 * stylesheet text is stubbed out in this environment. That gap is closed where the same rule has real
 * text to read — the compiled stylesheets inside `dist/`, which `e2e/bundle-checks.spec.ts` scans
 * (AAP §0.9). The scan below reads whatever text it is handed, so it starts covering a stylesheet's
 * prose the moment that prose arrives, and no pattern is narrowed to suit the stubbed value.
 */
const SOURCE_TEXT_FILES: Record<string, string> = import.meta.glob<string>(
  '../../src/**/*.{ts,tsx,css}',
  { query: '?raw', import: 'default', eager: true },
);

/** The collected files as repository-relative paths, sorted so a failure message reads in tree order. */
const SOURCE_PATHS: readonly string[] = Object.keys(SOURCE_TEXT_FILES)
  .map(repositoryPathOf)
  .sort();

/** The extensions the glob must reach for each half of the scan; the guards below prove both. */
const SCRIPT_EXTENSIONS: readonly string[] = ['.ts', '.tsx'];
const STYLESHEET_EXTENSION = '.css';

/** The data-asset extension the glob deliberately leaves out; the coverage guard proves it is excluded. */
const DATA_ASSET_EXTENSION = '.json';

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

/**
 * A glob key turned into the repository-relative path a failure message should name.
 *
 * The key arrives relative to this test file (`../../src/app/app.tsx`), so it is resolved segment by
 * segment — `.` dropped, `..` popping the segment above it — rather than with `node:path`, which this
 * project does not install.
 */
function repositoryPathOf(globKey: string): string {
  const segments: string[] = [];

  for (const segment of globKey.split('/')) {
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

/** One occurrence of a prohibited string in a text. */
interface SourceMatch {
  /** One-based line number of the match, so a failure points at the line to open. */
  readonly line: number;
  /** The matched text, truncated to stay readable in a failure message. */
  readonly text: string;
}

/** The longest excerpt of a match a failure message carries. */
const EXCERPT_LENGTH = 60;

/** The one-based line a character index sits on. */
function lineNumberAt(text: string, index: number): number {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }

  return line;
}

/**
 * Every match of one pattern in one text, with the line each sits on.
 *
 * The pattern is rebuilt from its own source and flags for every call, so a `lastIndex` left behind by
 * an earlier scan of a shared `RegExp` cannot make a later one skip matches. The `g` flag is added if
 * the pattern lacks it, because `exec` without it returns the same match forever; the discrimination
 * suite asserts every pattern carries the flag anyway, so the fallback is a guard rather than a habit.
 */
function findMatches(pattern: RegExp, text: string): SourceMatch[] {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const scan = new RegExp(pattern.source, flags);
  const matches: SourceMatch[] = [];
  let match = scan.exec(text);

  while (match !== null) {
    if (match[0].length === 0) {
      // No pattern below can match an empty string, but a zero-length match would spin this loop
      // forever, so it is stepped over rather than trusted not to occur.
      scan.lastIndex += 1;
    } else {
      matches.push({
        line: lineNumberAt(text, match.index),
        text: match[0].slice(0, EXCERPT_LENGTH),
      });
    }
    match = scan.exec(text);
  }

  return matches;
}

/* ---------------------------------------------------------------------------------------------
 * One prohibited string and its category
 * ------------------------------------------------------------------------------------------- */

/** One prohibited string, with a way to build a sample of its own shape. */
interface ProhibitedString {
  /** The prohibited string as a word-bounded global `RegExp`. */
  readonly pattern: RegExp;
  /**
   * A string of this pattern's own shape, assembled when it is called.
   *
   * Every sample is built from fragments rather than written as one literal, so this file never holds
   * a second, freely copyable copy of the name or phrase beside the pattern that matches it — the same
   * device `src/app/app.test.tsx` and its siblings use for their own assertions.
   */
  readonly sample: () => string;
}

/** One category of prohibited string, scanned and proven as a unit. */
interface ProhibitedCategory {
  /** What the category forbids, in words that name none of its members. */
  readonly label: string;
  readonly strings: readonly ProhibitedString[];
}

/** Every hit for a set of prohibited strings in one text. */
function matchesIn(strings: readonly ProhibitedString[], text: string): SourceMatch[] {
  return strings.flatMap(({ pattern }) => findMatches(pattern, text));
}

/**
 * Every hit for a category across the scanned tree, as `'<repo path>:<line> — <matched text>'`.
 *
 * The hits are collected in full before the assertion runs, so one failure names every occurrence
 * rather than the first, and the category is named by the title of the test that reports them.
 */
function scanRepository(category: ProhibitedCategory): string[] {
  const hits: string[] = [];

  for (const [globKey, text] of Object.entries(SOURCE_TEXT_FILES)) {
    const path = repositoryPathOf(globKey);

    for (const { pattern } of category.strings) {
      for (const match of findMatches(pattern, text)) {
        hits.push(`${path}:${match.line} — ${match.text}`);
      }
    }
  }

  return hits;
}

/* ---------------------------------------------------------------------------------------------
 * 1. The barred product name (rule P-7)
 * ------------------------------------------------------------------------------------------- */

/**
 * The product name rule P-7 bars, in any casing and with or without a separator.
 *
 * The pattern describes the name as two fragments around an optional whitespace, underscore or
 * hyphen, which covers every spelling a source could carry, and a `\b` at each end keeps a longer word
 * that merely contains the fragments from matching. Tolerating the separator is what stops the
 * hyphenated and spaced spellings from slipping past a rule whose whole purpose is to keep the name
 * out of the product, and the name is never written as one string anywhere in this file.
 */
const BARRED_PRODUCT_NAME: ProhibitedCategory = {
  label: 'barred product name',
  strings: [
    {
      pattern: /\bplumb[\s_-]?line\b/gi,
      sample: () =>
        [
          ['Plumb', 'line'].join(''),
          ['plumb', 'line'].join(' '),
          ['plumb', 'line'].join('-'),
          ['plumb', 'line'].join('_'),
        ].join(' / '),
    },
  ],
};

/* ---------------------------------------------------------------------------------------------
 * 2. Placeholder Latin text (rule P-7 forbids filler copy in place of real content)
 * ------------------------------------------------------------------------------------------- */

/**
 * The placeholder Latin a mock-up carries when nobody wrote the copy.
 *
 * The phrases themselves sit in the pattern array alone, so no other line of this file carries filler
 * text a reader could mistake for content.
 *
 * These tokens cannot occur in the application's own vocabulary in any language it uses, so a
 * word-bounded match on them reports filler text and nothing else. Each is assembled from fragments in
 * its sample for the same reason as every other sample here.
 */
const PLACEHOLDER_TEXT: ProhibitedCategory = {
  label: 'placeholder Latin text',
  strings: [
    {
      pattern: /\blorem ipsum\b/gi,
      sample: () => [['lo', 'rem'].join(''), ['ip', 'sum'].join('')].join(' '),
    },
    {
      pattern: /\bdolor sit amet\b/gi,
      sample: () => [['do', 'lor'].join(''), ['sit', 'amet'].join(' ')].join(' '),
    },
    {
      pattern: /\bconsectetur\b/gi,
      sample: () => ['consec', 'tetur'].join(''),
    },
    {
      pattern: /\badipiscing\b/gi,
      sample: () => ['adip', 'iscing'].join(''),
    },
    {
      pattern: /\bsed do eiusmod\b/gi,
      sample: () => [['sed', 'do'].join(' '), ['eius', 'mod'].join('')].join(' '),
    },
  ],
};

/* ---------------------------------------------------------------------------------------------
 * 3. Real company and cloud product names (rule P-7)
 * ------------------------------------------------------------------------------------------- */

/**
 * How a name in this group is matched, and why the choice is per name rather than per group.
 *
 * A word-bounded case-insensitive match is safe only where the token cannot occur in ordinary prose,
 * in this domain's vocabulary or in a design token — a distinctive coined company name qualifies. A
 * token that is also an ordinary English word, a unit, a colour or a weather noun is matched
 * case-sensitively in its branded capitalisation, and so is a short acronym, because its lower-case
 * letters end ordinary words. That distinction is the whole false-positive protection: the
 * discrimination suite at the end of this file proves that an ordinary lower-case word sharing a short
 * acronym's last letters, and a lower-case colour word, produce no match.
 *
 * Candidates whose own spelling is an ordinary English word or this domain's vocabulary are
 * deliberately absent: a workplace product named after a day of the week, business suites named after
 * a common noun, and consumer brands named after a fruit, a foundation or a river. Each would either
 * fire on prose the application may legitimately write or force an exemption, and an exemption is the
 * one thing this check must never grow. The project's own stack — its UI framework, bundler, test
 * runners, styling layer, icon set, typefaces and map source — is absent for a different reason: that
 * vocabulary is a bundled dependency's, not a third-party product being named in the interface.
 */

/** Carmaker names (rule P-7 names carmakers explicitly). */
const CARMAKER_NAMES: readonly ProhibitedString[] = [
  { pattern: /\btoyota\b/gi, sample: () => ['Toy', 'ota'].join('') },
  { pattern: /\bvolkswagen\b/gi, sample: () => ['Volks', 'wagen'].join('') },
  { pattern: /\bhyundai\b/gi, sample: () => ['Hyun', 'dai'].join('') },
  { pattern: /\bporsche\b/gi, sample: () => ['Por', 'sche'].join('') },
];

/** Enterprise-software vendor names, the category a manufacturing workspace is likeliest to inherit. */
const ENTERPRISE_SOFTWARE_NAMES: readonly ProhibitedString[] = [
  { pattern: /\bmicrosoft\b/gi, sample: () => ['Micro', 'soft'].join('') },
  { pattern: /\bsalesforce\b/gi, sample: () => ['Sales', 'force'].join('') },
  { pattern: /\bnetsuite\b/gi, sample: () => ['Net', 'Suite'].join('') },
  { pattern: /\bservicenow\b/gi, sample: () => ['Service', 'Now'].join('') },
  { pattern: /\bSiemens\b/g, sample: () => ['Sie', 'mens'].join('') },
  { pattern: /\bdassault\b/gi, sample: () => ['Das', 'sault'].join('') },
];

/**
 * Cloud product names.
 *
 * The short acronym and the two ordinary nouns carry no `i` flag and are written in their branded
 * capitalisation, so the lower-case word a source may legitimately contain cannot reach them; the
 * coined product names below them are matched case-insensitively because no ordinary word shares them.
 * The enterprise-software group above follows the same rule for the one name that is also a unit of
 * measurement, and follows the looser one for every coined name that has no ordinary homograph.
 */
const CLOUD_PRODUCT_NAMES: readonly ProhibitedString[] = [
  { pattern: /\bAWS\b/g, sample: () => ['A', 'W', 'S'].join('') },
  { pattern: /\bAzure\b/g, sample: () => ['Az', 'ure'].join('') },
  { pattern: /\bSnowflake\b/g, sample: () => ['Snow', 'flake'].join('') },
  { pattern: /\bbigquery\b/gi, sample: () => ['Big', 'Query'].join('') },
  { pattern: /\bgoogle\s+cloud\b/gi, sample: () => ['Google', ' Cloud'].join('') },
  { pattern: /\bamazon\s+web\s+services\b/gi, sample: () => ['Amazon', ' Web Services'].join('') },
];

/**
 * Model-vendor names.
 *
 * The assistant answers from the seed's script and no model is connected (rules P-1 and P-4), so a
 * real model vendor's name in the interface would name an integration the demonstration does not have.
 */
const MODEL_VENDOR_NAMES: readonly ProhibitedString[] = [
  { pattern: /\bopenai\b/gi, sample: () => ['Open', 'AI'].join('') },
  { pattern: /\banthropic\b/gi, sample: () => ['Anthrop', 'ic'].join('') },
  { pattern: /\bchatgpt\b/gi, sample: () => ['Chat', 'GPT'].join('') },
];

/** The third category: any real company, carmaker or cloud product name under `src/`. */
const REAL_PRODUCT_NAMES: ProhibitedCategory = {
  label: 'real company or cloud product name',
  strings: [
    ...CARMAKER_NAMES,
    ...ENTERPRISE_SOFTWARE_NAMES,
    ...CLOUD_PRODUCT_NAMES,
    ...MODEL_VENDOR_NAMES,
  ],
};

/* ---------------------------------------------------------------------------------------------
 * 4. The vocabulary of an unimplemented claim (rules P-4 and P-1)
 * ------------------------------------------------------------------------------------------- */

/**
 * The adjectives a claim about a mechanism this build does not have would need.
 *
 * These are exactly the forms AAP §0.10 names, and they are deliberately adjectival only, for two
 * reasons that are not negotiable:
 *  - the noun in `tamper resistance` is required text — the audit screen's mandated note reads
 *    "Simulated control: this shows the mechanism, not production tamper resistance." — so a pattern
 *    matching the stem would forbid the very sentence rule P-4 requires;
 *  - the nouns `certificate` and `certification` are legitimate domain words, because a PPAP or
 *    material document may carry a certificate of analysis, so only the adjective form is matched.
 * Narrowing further, or exempting the files that hold those sentences, is not an option: an exemption
 * would hide the next real claim, and a pattern that cannot pass without one is the wrong pattern.
 */
const UNIMPLEMENTED_CLAIM_VOCABULARY: ProhibitedCategory = {
  label: 'vocabulary of an unimplemented claim',
  strings: [
    {
      pattern: /\btamper[\s-]?proof\b/gi,
      sample: () =>
        [
          ['tamper', 'proof'].join(''),
          ['tamper', 'proof'].join('-'),
          ['tamper', 'proof'].join(' '),
        ].join(' / '),
    },
    {
      pattern: /\btamper[\s-]?resistant\b/gi,
      sample: () =>
        [
          ['tamper', 'resistant'].join(''),
          ['tamper', 'resistant'].join('-'),
          ['tamper', 'resistant'].join(' '),
        ].join(' / '),
    },
    {
      pattern: /\bzero[\s-]?trust\b/gi,
      sample: () =>
        [['zero', 'trust'].join(''), ['zero', 'trust'].join('-'), ['zero', 'trust'].join(' ')].join(
          ' / ',
        ),
    },
    {
      pattern: /\bguaranteed\b/gi,
      sample: () => ['guarant', 'eed'].join(''),
    },
    {
      pattern: /\bcertified\b/gi,
      sample: () => ['certif', 'ied'].join(''),
    },
  ],
};

/** The four categories this check scans, in the order the rules list them. */
const PROHIBITED_CATEGORIES: readonly ProhibitedCategory[] = [
  BARRED_PRODUCT_NAME,
  PLACEHOLDER_TEXT,
  REAL_PRODUCT_NAMES,
  UNIMPLEMENTED_CLAIM_VOCABULARY,
];

/* ---------------------------------------------------------------------------------------------
 * Text the patterns must leave alone
 * ------------------------------------------------------------------------------------------- */

/**
 * Interface text the specification requires the build to render.
 *
 * Every string here is one the plan fixes verbatim, so a pattern that fires on one of them would
 * forbid the build from meeting the rule it is checking. The audit note and the sovereignty label are
 * the two that a claim pattern could plausibly overreach; `certificate of analysis` is the domain
 * noun a package document may legitimately carry.
 */
const REQUIRED_INTERFACE_TEXT: readonly string[] = [
  'Simulated control: this shows the mechanism, not production tamper resistance.',
  'Declared, not verified',
  'Simulated data',
  'Simulated calculation',
  'Simulated recommendation',
  'Simulated write-back',
  'Simulated market intelligence',
  'Simulated company',
  'Simulated data: client self-assessment',
  'certificate of analysis',
];

/**
 * Ordinary prose that shares letters with a name in the third category.
 *
 * Each sample is the reason the case-sensitivity rule exists: a word ending in a short acronym's
 * letters, a lower-case colour word and a lower-case weather noun. Passed through the scan they must
 * produce no match, or the patterns would have to exempt the files that hold such prose.
 */
const ORDINARY_VOCABULARY: readonly string[] = [
  'the laws of motion and the draws of a schedule',
  'an azure sky above the plant',
  'a snowflake pattern on the packing label',
];

/** Two groups of text that must pass the scan untouched, each named for its own reason. */
const MUST_NOT_FIRE: readonly { readonly why: string; readonly samples: readonly string[] }[] = [
  { why: 'the specification requires this text', samples: REQUIRED_INTERFACE_TEXT },
  { why: 'ordinary vocabulary, not a brand', samples: ORDINARY_VOCABULARY },
];

/* ---------------------------------------------------------------------------------------------
 * Suites
 * ------------------------------------------------------------------------------------------- */

describe('forbidden-strings source check (rules P-7, P-4, P-1)', () => {
  it('reads every TypeScript, TSX and stylesheet file under src/', () => {
    const scripts = SOURCE_PATHS.filter((path) =>
      SCRIPT_EXTENSIONS.some((extension) => path.endsWith(extension)),
    );
    const stylesheets = SOURCE_PATHS.filter((path) => path.endsWith(STYLESHEET_EXTENSION));
    const outsideSource = SOURCE_PATHS.filter((path) => !path.startsWith('src/'));
    const dataAssets = SOURCE_PATHS.filter((path) => path.endsWith(DATA_ASSET_EXTENSION));

    expect(
      SOURCE_PATHS.length,
      'the glob collected no file, so every scan below would pass vacuously',
    ).toBeGreaterThan(0);
    expect(
      scripts.length,
      'the glob collected no TypeScript file, so its brace pattern is not reaching the script half',
    ).toBeGreaterThan(0);
    expect(
      stylesheets.length,
      'the glob collected no stylesheet, so it is not reaching the CSS half of the tree',
    ).toBeGreaterThan(0);
    expect(
      outsideSource,
      'a collected path did not resolve under src/, so repositoryPathOf is resolving keys wrongly',
    ).toEqual([]);
    expect(
      dataAssets,
      'this check reads authored script and stylesheet text, not a data asset: a place name in the bundled boundary file is not a product name, so widening the glob to it would report noise instead of a defect',
    ).toEqual([]);
  });

  for (const category of PROHIBITED_CATEGORIES) {
    it(`reports no ${category.label} under src/`, () => {
      expect(
        scanRepository(category),
        `each line above names the file, the line and the matched text: ${category.label} may not appear under src/`,
      ).toEqual([]);
    });
  }

  describe('discrimination', () => {
    for (const category of PROHIBITED_CATEGORIES) {
      it(`still detects ${category.label} in a sample of its own shape`, () => {
        const silent = category.strings
          .map((string, index) => ({ index, matches: findMatches(string.pattern, string.sample()) }))
          .filter(({ matches }) => matches.length === 0)
          .map(({ index }) => `${category.label}: pattern ${index + 1} of ${category.strings.length}`);

        expect(
          silent,
          'a pattern stopped matching a sample of its own shape, so the scan above would pass vacuously',
        ).toEqual([]);
      });
    }

    it('carries the global flag on every pattern', () => {
      const unflagged = PROHIBITED_CATEGORIES.flatMap((category) =>
        category.strings
          .filter(({ pattern }) => !pattern.global)
          .map(({ pattern }) => `${category.label}: /${pattern.source}/`),
      );

      expect(
        unflagged,
        'a pattern without the `g` flag reports one occurrence and then repeats it',
      ).toEqual([]);
    });

    it('never fires on text the rules require or on ordinary vocabulary', () => {
      const spurious = MUST_NOT_FIRE.flatMap(({ why, samples }) =>
        samples.flatMap((sample) =>
          PROHIBITED_CATEGORIES.filter(
            (category) => matchesIn(category.strings, sample).length > 0,
          ).map((category) => `${JSON.stringify(sample)} (${why}) flagged as ${category.label}`),
        ),
      );

      expect(
        spurious,
        'a pattern is too broad to keep the gate honest, because it fires on text the build must render or on ordinary prose',
      ).toEqual([]);
    });
  });
});

