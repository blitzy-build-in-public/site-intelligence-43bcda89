// @vitest-environment node

/**
 * Source check: the README publishes every documentation topic this work must carry.
 *
 * It reads `README.md` as text and fails when any of the eleven required topics is missing as its own
 * level-two section. That is the mechanical proof that the README covers how to run, test and build
 * the Site Intelligence demonstration, the role switcher, the simulation controls, how the in-browser
 * backend maps to the HTTP client, what is simulated, what a real deployment must supply, the licences
 * of the bundled assets, the packages, and configuration (AAP §0.7 success criterion 10, AAP §0.9).
 *
 * It runs inside `npm test`, which is ahead of `npm run build` in the gate, so it may depend on nothing
 * but the README: there is no `dist/` yet and no other check's subject is in scope here.
 *
 * The text arrives through Vite's `?raw` glob rather than a file-system read, because this project
 * declares no Node type declarations and its type check covers this folder, so `node:fs` and
 * `node:path` are not available to it. The pattern is resolved at transform time against the module
 * that contains it, which is why it climbs the two directories from `tests/source-checks/` to the
 * repository root.
 *
 * Every guard here fails rather than passes when it cannot see its subject: an absent README, a glob
 * that yields no matching key, a placeholder document and any single missing heading all fail the
 * suite. A check that went green on a README it never read would report documentation coverage it had
 * not established.
 */

import { describe, expect, it } from 'vitest';

/* ---------------------------------------------------------------------------------------------
 * The document under check
 * ------------------------------------------------------------------------------------------- */

/** The file this check reads, named once so the key selection and the assertions cannot drift. */
const README_FILE = 'README.md';

/**
 * The README itself, read as raw text at collection time.
 *
 * `?raw` reads the bytes without evaluating them, so what is asserted on here is the document a
 * reader opens. The pattern is a literal because Vite resolves glob patterns statically; a pattern
 * held in a variable cannot be analysed and is rejected at transform time.
 */
const README_MODULES: Record<string, string> = import.meta.glob<string>('../../README.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/**
 * The same text read through a wildcard pattern.
 *
 * Some Vite versions warn about a glob with no magic character and hand back an empty object, so this
 * second, wildcard form is kept as the only fallback. It is also a literal for the reason above, and
 * it matches the README alone: `README.md` is the repository root's only Markdown file. The guard
 * below still fails loudly when neither form yields text, so the fallback can never turn a missing
 * README into a passing check.
 */
const MARKDOWN_MODULES: Record<string, string> = import.meta.glob<string>('../../*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/* ---------------------------------------------------------------------------------------------
 * What the README must publish
 * ------------------------------------------------------------------------------------------- */

/**
 * A structural lower bound, not a business figure: a document shorter than this is a placeholder or a
 * title page, so the non-triviality guard treats it as absent rather than as documentation. It is
 * deliberately well below the length of any README that carries eleven sections.
 */
const MINIMUM_DOCUMENT_LENGTH = 400;

/** The heading line of a level-two section: the marker, then at least one non-space character. */
const LEVEL_TWO_SECTION = /^##\s+\S/;

/**
 * The two topic titles that have a plausible near-miss, held as constants so the required list and the
 * wording assertions are built from the same strings.
 */
const MAPPING_TOPIC = 'How the mock backend maps to the API client';
const LICENCES_TOPIC = 'Licences for bundled map data and fonts';

/**
 * The eleven topics the README must publish, each as its own level-two section, in the order the
 * specification and the plan list them (AAP §0.7, AAP §0.9).
 */
const REQUIRED_TOPICS: readonly string[] = [
  'Run',
  'Test',
  'Build',
  'The role switcher',
  'The simulation controls',
  MAPPING_TOPIC,
  'What is simulated',
  'What a real deployment must supply',
  LICENCES_TOPIC,
  'Packages',
  'Configuration',
];

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

/**
 * A glob key turned into a repository-relative path.
 *
 * `'../../README.md'` becomes `'README.md'`. Built from `split` and a stack rather than a path module,
 * because this check has no Node built-ins available: an empty segment and `'.'` are skipped, and `'..'`
 * pops the segment before it.
 */
function normaliseGlobKey(globKey: string): string {
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

/** The file name at the end of a glob key, used beside the normalised path to identify the README. */
function basenameOfGlobKey(globKey: string): string {
  const segments = globKey.split('/');

  return segments[segments.length - 1] ?? '';
}

/**
 * The README's text from one set of globbed modules, or `undefined` when the set holds no README.
 *
 * A key qualifies only when it both normalises to the README and ends in its file name, so neither a
 * same-named file nested elsewhere nor an absolute key can be mistaken for the document under check.
 * An entry that read back blank is treated as absent, which is what a globbed file missing from disk
 * looks like.
 */
function documentFrom(modules: Record<string, string>): string | undefined {
  const readmeKey = Object.keys(modules)
    .sort()
    .find((key) => normaliseGlobKey(key) === README_FILE && basenameOfGlobKey(key) === README_FILE);

  if (readmeKey === undefined) {
    return undefined;
  }

  const text = modules[readmeKey];

  return text === undefined || text.trim() === '' ? undefined : text;
}

/** The README's text, or an empty string when neither glob form could produce it. */
const README_TEXT: string = documentFrom(README_MODULES) ?? documentFrom(MARKDOWN_MODULES) ?? '';

/** A document split into its lines, with a trailing carriage return tolerated on every one. */
function linesOf(text: string): string[] {
  return text.split(/\r?\n/);
}

/** Text made literal for a regular expression, so a title carrying punctuation stays exact. */
function escapeForRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The pattern a topic's own section must match: `## `, then the exact title, then nothing but
 * whitespace. Matching ignores case, so a heading written in sentence case still counts as the section;
 * everything else is exact, so `# Run`, `### Run` and a longer heading that merely begins with the title
 * are all rejected — the topic must be its own top-level section.
 */
function sectionPattern(topic: string): RegExp {
  return new RegExp(`^##\\s+${escapeForRegExp(topic)}\\s*$`, 'i');
}

/** Whether the document carries the topic as one of its own level-two sections. */
function hasSectionHeading(text: string, topic: string): boolean {
  const pattern = sectionPattern(topic);

  return linesOf(text).some((line) => pattern.test(line));
}

/** Every required topic the document does not carry, in the list's order, so one run reports them all. */
function missingTopics(text: string): string[] {
  return REQUIRED_TOPICS.filter((topic) => !hasSectionHeading(text, topic));
}

/**
 * Whether the document is substantial enough to have its topics checked at all: at least the guard's
 * length, and at least one level-two section. A placeholder that fails either half is reported by the
 * first test rather than sliding through the topic assertion on the strength of its length alone.
 */
function isSubstantial(text: string): boolean {
  return (
    text.length >= MINIMUM_DOCUMENT_LENGTH &&
    linesOf(text).some((line) => LEVEL_TWO_SECTION.test(line))
  );
}

/* ---------------------------------------------------------------------------------------------
 * The assertions
 * ------------------------------------------------------------------------------------------- */

/** One synthetic document, and whether the topic `Run` is a section in it. */
interface SectionSample {
  /** A single line of a candidate document. */
  readonly document: string;
  /** Whether `Run` must be recognised as one of its sections. */
  readonly counts: boolean;
  /** The case the sample pins down, interpolated into the test title. */
  readonly why: string;
}

/** The heading forms the level-two rule must accept and refuse. */
const SECTION_SAMPLES: readonly SectionSample[] = [
  { document: '## Run', counts: true, why: 'a level-two heading carrying the title alone' },
  { document: '##   Run   ', counts: true, why: 'the same heading with slack around the title' },
  { document: '## run', counts: true, why: 'the same heading in sentence case, since case is ignored' },
  { document: '# Run', counts: false, why: 'a level-one heading' },
  { document: '### Run', counts: false, why: 'a level-three heading nested under another section' },
  { document: 'Run', counts: false, why: 'body text with no heading marker at all' },
  {
    document: '## Running the demonstration',
    counts: false,
    why: 'a longer heading that merely begins with the title',
  },
];

/** One synthetic document, and whether one topic's exact wording is a section in it. */
interface WordingSample {
  /** A single line of a candidate document. */
  readonly document: string;
  /** The topic whose exact wording the sample tests. */
  readonly topic: string;
  /** Whether the sample must satisfy that topic. */
  readonly accepted: boolean;
  /** The near-miss the sample pins down, interpolated into the test title. */
  readonly why: string;
}

/** The two titles with a plausible near-miss, and the variants that must not satisfy them. */
const WORDING_SAMPLES: readonly WordingSample[] = [
  {
    document: `## ${MAPPING_TOPIC}`,
    topic: MAPPING_TOPIC,
    accepted: true,
    why: 'the mapping heading in the exact wording the topic list fixes',
  },
  {
    document: '## How the mock backend maps to the API',
    topic: MAPPING_TOPIC,
    accepted: false,
    why: 'a shortened variant that drops the client',
  },
  {
    document: `## ${LICENCES_TOPIC}`,
    topic: LICENCES_TOPIC,
    accepted: true,
    why: 'the licences heading in the exact wording the topic list fixes',
  },
  {
    document: '## Licenses for bundled map data and fonts',
    topic: LICENCES_TOPIC,
    accepted: false,
    why: 'the other spelling of the noun',
  },
  {
    document: '## Licence for bundled map data and fonts',
    topic: LICENCES_TOPIC,
    accepted: false,
    why: 'the singular form of the noun',
  },
];

/** A document shaped like the placeholder a README starts as: a title and a line or two of prose. */
const PLACEHOLDER_DOCUMENT = [
  '# Site Intelligence',
  '',
  'A browser-only demonstration workspace.',
  'by Gracious Intelligence',
].join('\n');

describe('the README documentation topics', () => {
  it('reads the README and finds a substantial document', () => {
    expect(
      README_TEXT,
      'No text was read from README.md. The file is absent from the repository root, or neither glob form resolved a README key.',
    ).not.toBe('');

    expect(
      isSubstantial(README_TEXT),
      `The README reads as a placeholder rather than as documentation: it is shorter than ${MINIMUM_DOCUMENT_LENGTH} characters or carries no level-two section.`,
    ).toBe(true);
  });

  it('publishes every required topic as its own level-two section', () => {
    const missing = missingTopics(README_TEXT);

    expect(
      missing,
      `README.md is missing ${missing.length} required level-two section(s): ${missing.join(' | ')}`,
    ).toEqual([]);
  });

  it.each(SECTION_SAMPLES)('recognises a topic only as its own level-two heading: $why', (sample) => {
    expect(hasSectionHeading(sample.document, 'Run')).toBe(sample.counts);
  });

  it.each(WORDING_SAMPLES)('requires the exact wording of the topic: $why', (sample) => {
    expect(hasSectionHeading(sample.document, sample.topic)).toBe(sample.accepted);
  });

  it('rejects a placeholder document instead of reporting coverage it never found', () => {
    expect(
      isSubstantial(PLACEHOLDER_DOCUMENT),
      'A title and a line of prose must not pass the non-triviality guard.',
    ).toBe(false);

    expect(
      missingTopics(PLACEHOLDER_DOCUMENT),
      'A placeholder must report every required topic as missing, in one run.',
    ).toEqual([...REQUIRED_TOPICS]);
  });
});
