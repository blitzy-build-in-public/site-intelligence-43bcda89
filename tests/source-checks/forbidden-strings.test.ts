// @vitest-environment node

/**
 * Rules P-7, P-4 and P-1 source check: nothing under `src/` carries the barred product name, a real
 * company or cloud product name, placeholder Latin text, the reviewing platform's own name, or the
 * vocabulary of an unimplemented claim.
 *
 * AAP §0.9 owns this row: the check reads every TypeScript, TSX and CSS file under `src/` as raw text
 * and runs inside `npm test`. The stylesheet half of that scan is vacuous in this environment by
 * construction — Vitest hands back an empty string for a stylesheet's raw text — and the coverage case
 * below asserts that premise over every collected stylesheet instead of assuming it, so a runner that
 * starts returning text fails there rather than silently changing what the scan means. The stylesheet
 * half of the same rule is covered over the compiled stylesheets in `dist/` by
 * `e2e/bundle-checks.spec.ts` (AAP §0.9), which defines its own word lists over the build the browser
 * is served; this file neither imports it nor reads `dist/`, so the two halves can neither duplicate
 * nor weaken each other.
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
 * discrimination suite at the end of this file proves that each one still fires on a sample of its own
 * shape, on a lower-case spelling of it and on an upper-case spelling of it: a scan that has silently
 * stopped matching, or one that only ever matched one casing of a brand's name, is the failure mode
 * these tests exist to prevent.
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
 * a JSX text node exactly as a reader does. A stylesheet contributes its path but no text: Vitest's
 * `test.css` option is off — the default `vite.config.ts` leaves alone — so raw stylesheet text is
 * stubbed to an empty string here. The stylesheet half of the scan is therefore vacuous by
 * construction in this environment, and the coverage case asserts exactly that, stylesheet by
 * stylesheet, so no reader mistakes the empty result for a clean one. That half of the same rule is
 * covered where the stylesheet is real text: the compiled CSS inside `dist/`, which
 * `e2e/bundle-checks.spec.ts` scans (AAP §0.9). The scan below reads whatever text it is handed, so it
 * starts covering a stylesheet's prose the moment that prose arrives, and no pattern is narrowed to
 * suit the stubbed value.
 */
const SOURCE_TEXT_FILES: Record<string, string> = import.meta.glob<string>(
  '../../src/**/*.{ts,tsx,css}',
  { query: '?raw', import: 'default', eager: true },
);

/** The collected files as repository-relative paths, sorted so a failure message reads in tree order. */
const SOURCE_PATHS: readonly string[] = Object.keys(SOURCE_TEXT_FILES)
  .map(repositoryPathOf)
  .sort();

/**
 * Each collected file's text, keyed by the repository path a failure message names.
 *
 * The scan walks the glob result directly; the coverage case needs one specific path's text — to prove
 * a stylesheet came back empty and a script did not — so the same collection is keyed once here rather
 * than re-deriving `repositoryPathOf` at every lookup.
 */
const SOURCE_TEXT_BY_PATH: ReadonlyMap<string, string> = new Map(
  Object.entries(SOURCE_TEXT_FILES).map(([globKey, text]) => [repositoryPathOf(globKey), text]),
);

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

/** One prohibited string, with a sample of its own shape and the lower-case spellings it must catch. */
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
  /**
   * The lower-case spellings a source could use for this string, assembled when they are called.
   *
   * Rule P-7 bars the name, not the typography it is written in, so a pattern that matches only the
   * branded capitalisation would leave every lower-case occurrence of a real vendor or cloud product
   * name unscanned. Each spelling here is entirely lower case, is assembled from fragments for the same
   * reason `sample` is, and must match this pattern, and so must its upper-cased form — the
   * discrimination suite proves both, per pattern, so a pattern sensitive to either casing cannot pass.
   */
  readonly caseVariants: () => readonly string[];
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
 * 1. The barred names: the one rule P-7 fixes, and the reviewing platform's own
 * ------------------------------------------------------------------------------------------- */

/**
 * The reviewing platform's own name, in the fragments its pattern and sample are assembled from.
 *
 * It is never written as one string in this file, for the same reason the product name's pattern never
 * is: a literal copy would sit beside the pattern that matches it, as a second spelling a later edit
 * could change without changing the first.
 */
const REVIEWING_PLATFORM_NAME: readonly string[] = ['BLIT', 'ZY'];

/**
 * The two names barred outright under `src/`, in any casing and with or without a separator.
 *
 * The first is the product name rule P-7 forbids. The pattern describes it as two fragments around an
 * optional whitespace, underscore or hyphen, which covers every spelling a source could carry, and a
 * `\b` at each end keeps a longer word that merely contains the fragments from matching. Tolerating
 * the separator is what stops the hyphenated and spaced spellings from slipping past a rule whose
 * whole purpose is to keep the name out of the product.
 *
 * The second is the reviewing platform's own name, which a shipped file may not carry either: it is
 * no part of this product, names nothing in the domain, and a comment opening with it states a
 * process marker no reader of the product can resolve. The name itself is barred rather than a
 * marker built around it, because whatever a later pass writes begins with the name. It is coined
 * and shares no spelling with this domain's vocabulary or with a design token, so a word-bounded
 * case-insensitive match reports it and nothing else.
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
      caseVariants: () => [['plumb', 'line'].join('')],
    },
    {
      pattern: new RegExp(`\\b${REVIEWING_PLATFORM_NAME.join('')}\\b`, 'gi'),
      sample: () => REVIEWING_PLATFORM_NAME.join(''),
      caseVariants: () => [REVIEWING_PLATFORM_NAME.join('').toLowerCase()],
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
 * its sample, and again in the lower-case spelling its pattern must catch, for the same reason as every
 * other sample here.
 */
const PLACEHOLDER_TEXT: ProhibitedCategory = {
  label: 'placeholder Latin text',
  strings: [
    {
      pattern: /\blorem ipsum\b/gi,
      sample: () => [['lo', 'rem'].join(''), ['ip', 'sum'].join('')].join(' '),
      caseVariants: () => [[['lo', 'rem'].join(''), ['ip', 'sum'].join('')].join(' ')],
    },
    {
      pattern: /\bdolor sit amet\b/gi,
      sample: () => [['do', 'lor'].join(''), ['sit', 'amet'].join(' ')].join(' '),
      caseVariants: () => [[['do', 'lor'].join(''), ['sit', 'amet'].join(' ')].join(' ')],
    },
    {
      pattern: /\bconsectetur\b/gi,
      sample: () => ['consec', 'tetur'].join(''),
      caseVariants: () => [['consec', 'tetur'].join('')],
    },
    {
      pattern: /\badipiscing\b/gi,
      sample: () => ['adip', 'iscing'].join(''),
      caseVariants: () => [['adip', 'iscing'].join('')],
    },
    {
      pattern: /\bsed do eiusmod\b/gi,
      sample: () => [['sed', 'do'].join(' '), ['eius', 'mod'].join('')].join(' '),
      caseVariants: () => [[['sed', 'do'].join(' '), ['eius', 'mod'].join('')].join(' ')],
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
 * in this domain's vocabulary or in a design token — a distinctive coined company name qualifies, and
 * so does a name whose only other use is a scientific unit this interface never writes, which is why
 * the enterprise-software group matches every one of its names in any casing.
 *
 * A token that is also an ordinary English word, a unit, a colour or a weather noun, or a short acronym
 * whose lower-case letters end an ordinary word, needs more than a flag. Each of those carries the
 * branded capitalisation as one alternative and, as a second, the name in any casing matched only when
 * the product or service noun that makes it a brand reference follows it — so the brand is caught in
 * whichever casing a source writes it, while "azure sky", "snowflake pattern" and "laws of motion" stay
 * untouched. The discrimination suite below proves both directions.
 *
 * Whatever a name's shape, its pattern declares at least one entirely lower-case spelling and the same
 * suite proves the pattern matches it, in that casing and again in its upper-cased form. A pattern that
 * only ever sees one casing of a brand's name leaves every other casing of a real vendor or cloud
 * product name unscanned, and rule P-7 bars the name rather than its typography, so no pattern here
 * relies on capitalisation.
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
  {
    pattern: /\btoyota\b/gi,
    sample: () => ['Toy', 'ota'].join(''),
    caseVariants: () => [['toy', 'ota'].join('')],
  },
  {
    pattern: /\bvolkswagen\b/gi,
    sample: () => ['Volks', 'wagen'].join(''),
    caseVariants: () => [['volks', 'wagen'].join('')],
  },
  {
    pattern: /\bhyundai\b/gi,
    sample: () => ['Hyun', 'dai'].join(''),
    caseVariants: () => [['hyun', 'dai'].join('')],
  },
  {
    pattern: /\bporsche\b/gi,
    sample: () => ['Por', 'sche'].join(''),
    caseVariants: () => [['por', 'sche'].join('')],
  },
];

/**
 * Enterprise-software vendor names, the category a manufacturing workspace is likeliest to inherit.
 *
 * Every name here is coined, and none has an ordinary homograph in this project's vocabulary — the one
 * unit of measurement among them is a surname before it is a unit, and no prose in the interface writes
 * it — so each is matched in every casing. `e2e/bundle-checks.spec.ts` places the same names in its
 * case-insensitive tier for the same reason, so the two halves of rule P-7 agree about their shape.
 */
const ENTERPRISE_SOFTWARE_NAMES: readonly ProhibitedString[] = [
  {
    pattern: /\bmicrosoft\b/gi,
    sample: () => ['Micro', 'soft'].join(''),
    caseVariants: () => [['micro', 'soft'].join('')],
  },
  {
    pattern: /\bsalesforce\b/gi,
    sample: () => ['Sales', 'force'].join(''),
    caseVariants: () => [['sales', 'force'].join('')],
  },
  {
    pattern: /\bnetsuite\b/gi,
    sample: () => ['Net', 'Suite'].join(''),
    caseVariants: () => [['net', 'suite'].join('')],
  },
  {
    pattern: /\bservicenow\b/gi,
    sample: () => ['Service', 'Now'].join(''),
    caseVariants: () => [['service', 'now'].join('')],
  },
  {
    pattern: /\bsiemens\b/gi,
    sample: () => ['Sie', 'mens'].join(''),
    caseVariants: () => [['sie', 'mens'].join('')],
  },
  {
    pattern: /\bdassault\b/gi,
    sample: () => ['Das', 'sault'].join(''),
    caseVariants: () => [['das', 'sault'].join('')],
  },
];

/**
 * One name or noun written so that a pattern built from it matches every casing of that text.
 *
 * Each letter becomes its own two-character class — `[aA]`, `[wW]`, `[sS]` — instead of the finished
 * pattern carrying the `i` flag, because that flag widens every alternative the pattern holds,
 * including the branded bare word whose exact capitalisation is what keeps an ordinary word writable.
 * Non-letters are passed through unchanged, and a backslash together with the character it escapes is
 * copied as one unit, so a noun written as a regex fragment (`active\s+directory`) keeps its own escape
 * rather than having the letter inside it turned into a character class.
 */
function fragmentInAnyCasing(fragment: string): string {
  let pattern = '';

  for (let index = 0; index < fragment.length; index += 1) {
    const character = fragment.charAt(index);
    const escapedCharacter = fragment.charAt(index + 1);
    const lower = character.toLowerCase();
    const upper = character.toUpperCase();

    if (character === '\\' && escapedCharacter !== '') {
      pattern += `${character}${escapedCharacter}`;
      index += 1;
    } else if (lower !== upper) {
      pattern += `[${lower}${upper}]`;
    } else {
      pattern += character;
    }
  }

  return pattern;
}

/**
 * A pattern for a cloud product name whose own spelling is also an ordinary word.
 *
 * Rule P-7 bars the name rather than the typography it is written in, so the branded capitalisation
 * alone cannot be the whole match. The pattern carries two alternatives, and each one carries the casing
 * its job allows:
 *
 *  - the branded spelling exactly as the vendor publishes it, matched wherever it appears on its own,
 *    because that is the form a name in an interface actually takes. It cannot be widened to every
 *    casing: a bare `azure` is a colour, a bare `snowflake` is a crystal and a bare `aws` ends the
 *    ordinary words "laws" and "draws", so a case-insensitive bare match would report prose the
 *    application has every right to write;
 *  - the same name in any casing — `aws cloud`, `Azure tenant`, `AZURE TENANT`,
 *    `Snowflake warehouse`, `SNOWFLAKE WAREHOUSE` — matched only when one of that name's own product or
 *    service nouns follows it, because that noun is what makes the word a reference to the product
 *    instead of prose about a colour, a crystal or a law. Any casing is the point here: a title-case or
 *    all-caps reference is still the brand, and the discrimination suite's upper-cased samples prove the
 *    pattern reaches it. The casing comes from `fragmentInAnyCasing` rather than the `i` flag, which
 *    would widen the branded alternative above and forfeit the false-positive guard.
 *
 * Both alternatives are word-bounded, and the pattern carries the `g` flag the discrimination suite
 * requires of every pattern.
 *
 * The nouns arrive as a parameter rather than from one shared list, so each name carries the vocabulary
 * of its own product family and no name's list decides another's. They are written in any casing too, so
 * an upper-case `WAREHOUSE` still anchors the name that belongs to it.
 */
function productReferencePattern(branded: string, productNouns: readonly string[]): RegExp {
  const productNoun = productNouns.map(fragmentInAnyCasing).join('|');

  return new RegExp(
    `\\b${branded}\\b|\\b${fragmentInAnyCasing(branded)}\\b(?=[\\s-]+(?:${productNoun}))`,
    'g',
  );
}

/** The product and service nouns that make a lower-case `aws` a reference to that cloud provider. */
const AWS_PRODUCT_NOUNS: readonly string[] = [
  'account',
  'cli',
  'cloud',
  'console',
  'ec2',
  'iam',
  'lambda',
  'region',
  's3',
  'sdk',
];

/**
 * The same for `azure`: its own tenancy and service vocabulary, not another product's.
 *
 * One entry, the directory service, is a two-word name written as a regex fragment so the space
 * between its words may be any run of whitespace.
 */
const AZURE_PRODUCT_NOUNS: readonly string[] = [
  'active\\s+directory',
  'blob',
  'cloud',
  'devops',
  'functions',
  'kubernetes',
  'openai',
  'region',
  'sql',
  'storage',
  'subscription',
  'tenant',
];

/** The same for `snowflake`: the data-platform vocabulary its product names are drawn from. */
const SNOWFLAKE_PRODUCT_NOUNS: readonly string[] = [
  'account',
  'cloud',
  'data',
  'database',
  'schema',
  'snowpark',
  'stream',
  'task',
  'warehouse',
];

/**
 * Cloud product names.
 *
 * The three names above the coined ones are also ordinary words, or a short acronym whose lower-case
 * letters end an ordinary word, so each carries the two alternatives `productReferencePattern` builds:
 * its branded spelling wherever it appears, and that same name in any casing directly before one of its
 * own product or service nouns. `aws` in "the laws of motion", `azure` in "an azure sky" and `snowflake`
 * in "a snowflake pattern" therefore stay unmatched, which the must-not-fire suite below proves. The
 * coined product names below them need none of that and are matched case-insensitively outright,
 * because no ordinary word shares their spelling.
 */
const CLOUD_PRODUCT_NAMES: readonly ProhibitedString[] = [
  {
    pattern: productReferencePattern('AWS', AWS_PRODUCT_NOUNS),
    sample: () => ['A', 'W', 'S'].join(''),
    caseVariants: () => [['aws', 'cloud'].join(' ')],
  },
  {
    pattern: productReferencePattern('Azure', AZURE_PRODUCT_NOUNS),
    sample: () => ['Az', 'ure'].join(''),
    caseVariants: () => [['azure', 'tenant'].join(' ')],
  },
  {
    pattern: productReferencePattern('Snowflake', SNOWFLAKE_PRODUCT_NOUNS),
    sample: () => ['Snow', 'flake'].join(''),
    caseVariants: () => [['snowflake', 'warehouse'].join(' ')],
  },
  {
    pattern: /\bbigquery\b/gi,
    sample: () => ['Big', 'Query'].join(''),
    caseVariants: () => [['big', 'query'].join('')],
  },
  {
    pattern: /\bgoogle\s+cloud\b/gi,
    sample: () => ['Google', ' Cloud'].join(''),
    caseVariants: () => [['google', ' cloud'].join('')],
  },
  {
    pattern: /\bamazon\s+web\s+services\b/gi,
    sample: () => ['Amazon', ' Web Services'].join(''),
    caseVariants: () => [['amazon', ' web services'].join('')],
  },
];

/**
 * Model-vendor names.
 *
 * The assistant answers from the seed's script and no model is connected (rules P-1 and P-4), so a
 * real model vendor's name in the interface would name an integration the demonstration does not have.
 */
const MODEL_VENDOR_NAMES: readonly ProhibitedString[] = [
  {
    pattern: /\bopenai\b/gi,
    sample: () => ['Open', 'AI'].join(''),
    caseVariants: () => [['open', 'ai'].join('')],
  },
  {
    pattern: /\banthropic\b/gi,
    sample: () => ['Anthrop', 'ic'].join(''),
    caseVariants: () => [['anthrop', 'ic'].join('')],
  },
  {
    pattern: /\bchatgpt\b/gi,
    sample: () => ['Chat', 'GPT'].join(''),
    caseVariants: () => [['chat', 'gpt'].join('')],
  },
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
      caseVariants: () => [['tamper', 'proof'].join('-')],
    },
    {
      pattern: /\btamper[\s-]?resistant\b/gi,
      sample: () =>
        [
          ['tamper', 'resistant'].join(''),
          ['tamper', 'resistant'].join('-'),
          ['tamper', 'resistant'].join(' '),
        ].join(' / '),
      caseVariants: () => [['tamper', 'resistant'].join('-')],
    },
    {
      pattern: /\bzero[\s-]?trust\b/gi,
      sample: () =>
        [['zero', 'trust'].join(''), ['zero', 'trust'].join('-'), ['zero', 'trust'].join(' ')].join(
          ' / ',
        ),
      caseVariants: () => [['zero', 'trust'].join('-')],
    },
    {
      pattern: /\bguaranteed\b/gi,
      sample: () => ['guarant', 'eed'].join(''),
      caseVariants: () => [['guarant', 'eed'].join('')],
    },
    {
      pattern: /\bcertified\b/gi,
      sample: () => ['certif', 'ied'].join(''),
      caseVariants: () => [['certif', 'ied'].join('')],
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
 *
 * The competitor tag is rule P-5's own wording, `Synthetic company`, character for character: the
 * rule ranks above every other input (AAP §0.16), so the companion-string row of AAP §0.10, which
 * pairs the tag with a different company word, is superseded by it — the same precedence
 * `COMPETITOR_NAME_TAG` records where the string is shipped. The superseded wording is deliberately
 * absent: a must-not-fire list that carried it would document a string the application must not use.
 */
const REQUIRED_INTERFACE_TEXT: readonly string[] = [
  'Simulated control: this shows the mechanism, not production tamper resistance.',
  'Declared, not verified',
  'Simulated data',
  'Simulated calculation',
  'Simulated recommendation',
  'Simulated write-back',
  'Simulated market intelligence',
  // Rule P-5 fixes this tag and supersedes the plan's earlier companion-string wording for it.
  'Synthetic company',
  'Simulated data: client self-assessment',
  'certificate of analysis',
];

/**
 * Ordinary prose that shares letters or a whole spelling with a name in the third category.
 *
 * Each sample is the reason the widening above is anchored rather than bare: a word ending in a short
 * acronym's letters, a lower-case colour word and a lower-case weather noun, each followed by a noun
 * that is not the product's. Passed through the scan they must produce no match, or the patterns would
 * have to exempt the files that hold such prose.
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
    const emptyStylesheets = stylesheets.filter(
      (path) => (SOURCE_TEXT_BY_PATH.get(path) ?? '') === '',
    );
    const silentScripts = scripts.filter(
      (path) => (SOURCE_TEXT_BY_PATH.get(path) ?? '').trim() === '',
    );

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
    expect(
      emptyStylesheets,
      'the stylesheet half of this scan is vacuous only because Vitest hands back an empty string for a stylesheet: one collected stylesheet came back with text, so the patterns below would scan it for the first time, or a stylesheet the glob used to return is gone, so the half the header describes is not the half being scanned',
    ).toEqual(stylesheets);
    expect(
      silentScripts,
      'a collected TypeScript or TSX file came back with no text, so a prohibited string inside it would pass the scan above unnoticed',
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

    it('matches a lower-case and an upper-case spelling of every prohibited string', () => {
      const casingGaps = PROHIBITED_CATEGORIES.flatMap((category) =>
        category.strings.flatMap((string, index) => {
          const where = `${category.label}: pattern ${index + 1} of ${category.strings.length}`;
          const variants = string.caseVariants();

          if (variants.length === 0) {
            return [`${where} declares no lower-case spelling, so its casing is never proven`];
          }

          return variants.flatMap((variant) => {
            const gaps: string[] = [];
            const upperCaseVariant = variant.toUpperCase();

            if (variant !== variant.toLowerCase()) {
              gaps.push(`${where} declares ${JSON.stringify(variant)}, which is not all lower case`);
            }
            if (findMatches(string.pattern, variant).length === 0) {
              gaps.push(
                `${where} does not match its own lower-case spelling ${JSON.stringify(variant)}`,
              );
            }
            if (findMatches(string.pattern, upperCaseVariant).length === 0) {
              gaps.push(
                `${where} does not match the upper-case spelling ${JSON.stringify(upperCaseVariant)}`,
              );
            }

            return gaps;
          });
        }),
      );

      expect(
        casingGaps,
        'a pattern that matches only the branded capitalisation of a name leaves its lower-case occurrences unscanned, and one that stops at the lower-case spelling leaves the title-case and all-caps forms unscanned: rule P-7 bars the name rather than the typography it is written in',
      ).toEqual([]);
    });

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

