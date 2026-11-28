// @vitest-environment node

/**
 * Success criterion 5 source check: the contracts' own surface uses no `any` as a type and carries no
 * TypeScript suppression directive.
 *
 * `src/services/site-intelligence-service.ts` declares the one typed service interface and
 * `src/types/*` declares the entity types every record and screen DTO is built from, so an `any` in
 * either folder dissolves the only typed boundary the product has (rule P-2). This module reads both
 * folders as raw text and fails when it meets one — AAP 0.9's source-check row for this file, which is
 * how success criterion 5 ("`tsc` reports zero errors and no `any` in `src/services` and `src/types`")
 * and AAP 0.11.2's "barred from `any` by a source check" are proven rather than asserted.
 *
 * Two mechanisms, because the two categories need different text.
 *
 * An `any` used as a type is matched on comment-stripped text and only where the token sits in a type
 * position. The sources document themselves heavily and their prose says "for any call still in
 * flight"; `Company`, `many` and `anything` carry the same three letters inside a longer word; and a
 * TSDoc block explaining this very rule necessarily spells the word it forbids in code. A bare search
 * would therefore fail on text that is correct, so the stripper is a requirement rather than a
 * refinement, and the pattern asks what surrounds the token rather than what the token is.
 *
 * A suppression directive is the mirror image: `@ts-ignore`, `@ts-expect-error` and `@ts-nocheck` are
 * only ever written in a comment, so they are matched on the raw text. Stripping comments first would
 * hide every one of them, which is exactly the failure this half of the check exists to prevent.
 *
 * No file in either folder is exempt, and none may be made exempt: a `.test.ts` module beside an
 * adapter switches the checker off just as effectively as production code, so the ones inside these
 * folders are in scope, and the coverage suite fails when a file appears that the raw glob does not
 * read rather than letting it pass unseen.
 *
 * Limits, recorded rather than hidden. A regex literal is not modelled, so a `/*` sequence inside one
 * would be read as the start of a block comment; a type annotation cannot occur inside a regex
 * literal, and the trade-off is stated here rather than hidden behind a parser this project does not
 * carry. A string literal is not comment text and stays visible to the detector, which is why the
 * type-position tests below carry sample strings that hold the word in ordinary prose.
 *
 * Node environment: the check reads source text and asserts on it, so it needs no DOM. Vite's
 * `import.meta.glob` is the only build facility it uses, and `@types/node` stays out of the project —
 * no file-system module is imported. Nothing here reads the environment or holds a credential key
 * (rule B-2), types a figure or a domain identifier (rule P-6), names a third-party host (rule B-1) or
 * claims a deployment property the demonstration does not have (rule P-4).
 */

import { describe, expect, it } from 'vitest';

/* ---------------------------------------------------------------------------------------------
 * The sources this check reads
 * ------------------------------------------------------------------------------------------- */

/**
 * Every module under `src/services/`, read as raw text at collection time.
 *
 * `?raw` reads a file's bytes without evaluating it, so the check sees the source exactly as a
 * reviewer does, comments included. The folder holds the port, both adapters, the handlers, the
 * exports and the tests beside them — all of it part of the typed boundary rule P-2 fixes.
 */
const SERVICE_MODULES: Record<string, string> = import.meta.glob<string>(
  '../../src/services/**/*.{ts,tsx}',
  { query: '?raw', import: 'default', eager: true },
);

/** Every module under `src/types/`, which is the contracts' own type surface. */
const TYPE_MODULES: Record<string, string> = import.meta.glob<string>(
  '../../src/types/**/*.{ts,tsx}',
  { query: '?raw', import: 'default', eager: true },
);

/** Both folders in one record, so every mechanism below scans exactly the same set. */
const SCANNED_MODULES: Record<string, string> = { ...SERVICE_MODULES, ...TYPE_MODULES };

/**
 * Every path under both folders, read for its path alone.
 *
 * The coverage suite compares what the scanners read against what the tree holds, so a module added
 * later in an extension the glob does not cover fails there instead of escaping the scan.
 */
const ALL_FOLDER_PATHS: readonly string[] = [
  ...Object.keys(import.meta.glob('../../src/services/**/*')),
  ...Object.keys(import.meta.glob('../../src/types/**/*')),
];

/** The extensions the scanners read. */
const READABLE_EXTENSIONS: readonly string[] = ['.ts', '.tsx'];

/**
 * The two paths whose presence proves the scan reached the surface it exists to protect.
 *
 * A moved or renamed folder leaves the globs matching nothing, and a check that passes over an empty
 * set is worse than no check at all, so these anchors turn that state into a failure.
 */
const ANCHOR_PATHS: readonly string[] = [
  'src/services/site-intelligence-service.ts',
  'src/types/index.ts',
];

/* ---------------------------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------------------------- */

/**
 * A glob key turned into the repository-relative path a reviewer can open.
 *
 * The keys carry `../../` prefixes and may carry `.` or `..` segments. Node's path module is imported
 * nowhere in this project, so the normalisation is the three lines below.
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

/** Whether a path is a module the scanners read, which the coverage suite asserts of both folders. */
function isReadableModule(path: string): boolean {
  return READABLE_EXTENSIONS.some((extension) => path.endsWith(extension));
}

/** The one-based line number of an offset, so a failure points at the line to open. */
function lineOf(text: string, offset: number): number {
  return text.slice(0, offset).split('\n').length;
}

/** The longest excerpt a failure message carries. */
const EXCERPT_LENGTH = 120;

/** The line the given offset sits on, trimmed and capped for a failure message. */
function lineExcerptOf(text: string, offset: number): string {
  const start = text.lastIndexOf('\n', offset - 1) + 1;
  const end = text.indexOf('\n', offset);
  const line = text.slice(start, end === -1 ? text.length : end).trim();

  return line.length > EXCERPT_LENGTH ? `${line.slice(0, EXCERPT_LENGTH)}…` : line;
}

/** One occurrence of a forbidden form, with the line it sits on. */
interface SourceHit {
  /** One-based line number in the file the hit was found in. */
  readonly line: number;
  /** The source line the hit sits on, so a failure message shows the code itself. */
  readonly text: string;
}

/* ---------------------------------------------------------------------------------------------
 * The comment stripper
 * ------------------------------------------------------------------------------------------- */

/** What the stripper is currently inside. */
type ScanKind = 'code' | 'line-comment' | 'block-comment' | 'string' | 'template';

/**
 * One open context on the stripper's stack.
 *
 * `braceDepth` is meaningful only for a `code` frame a template interpolation opened: it counts the
 * braces that interpolation has opened, so the frame is popped on the brace that closes it rather than
 * on the first `}` it meets. `quote` is the delimiter a `string` frame closes on.
 */
interface ScanFrame {
  readonly kind: ScanKind;
  readonly braceDepth: number;
  readonly quote: string;
}

/** The file-level context every scan starts in and never pops. */
const CODE_FRAME: ScanFrame = { kind: 'code', braceDepth: 0, quote: '' };

/**
 * The source with its comments blanked and every other character left exactly where it was.
 *
 * A removed character is replaced by a space and a removed newline stays a newline, so a line number
 * taken from the result is the line number in the file. Quoted and template spans are tracked rather
 * than ignored, which is what keeps a `//` inside a string from being read as the start of a comment:
 * without that, `const label = 'a // b'; const row: <forbidden type> = null;` would blank the second
 * statement and silently hide it. A template's `${…}` is tracked as code, so a comment written inside
 * an interpolation is stripped like any other while the template's own text is left alone, and an
 * unterminated block comment runs to the end of the text instead of throwing, so a malformed sample
 * cannot break the check.
 */
function stripComments(text: string): string {
  const output: string[] = [];
  const stack: ScanFrame[] = [CODE_FRAME];
  let index = 0;

  const mask = (character: string): void => {
    output.push(character === '\n' ? '\n' : ' ');
  };
  const keep = (characters: number): void => {
    output.push(text.slice(index, index + characters));
    index += characters;
  };

  while (index < text.length) {
    const frame = stack[stack.length - 1] ?? CODE_FRAME;
    const character = text[index] ?? '';
    const following = text[index + 1] ?? '';

    switch (frame.kind) {
      case 'line-comment': {
        mask(character);
        index += 1;
        if (character === '\n') {
          stack.pop();
        }
        break;
      }
      case 'block-comment': {
        if (character === '*' && following === '/') {
          mask(character);
          mask(following);
          index += 2;
          stack.pop();
        } else {
          mask(character);
          index += 1;
        }
        break;
      }
      case 'string': {
        if (character === '\\') {
          keep(2);
        } else {
          keep(1);
          if (character === frame.quote || character === '\n') {
            // A newline inside a quoted span was never closed, so the string ends here rather than
            // swallowing the rest of the file.
            stack.pop();
          }
        }
        break;
      }
      case 'template': {
        if (character === '\\') {
          keep(2);
        } else if (character === '`') {
          keep(1);
          stack.pop();
        } else if (character === '$' && following === '{') {
          keep(2);
          stack.push({ kind: 'code', braceDepth: 1, quote: '' });
        } else {
          keep(1);
        }
        break;
      }
      case 'code': {
        if (character === '/' && following === '/') {
          mask(character);
          mask(following);
          index += 2;
          stack.push({ kind: 'line-comment', braceDepth: 0, quote: '' });
        } else if (character === '/' && following === '*') {
          mask(character);
          mask(following);
          index += 2;
          stack.push({ kind: 'block-comment', braceDepth: 0, quote: '' });
        } else if (character === "'" || character === '"') {
          keep(1);
          stack.push({ kind: 'string', braceDepth: 0, quote: character });
        } else if (character === '`') {
          keep(1);
          stack.push({ kind: 'template', braceDepth: 0, quote: '`' });
        } else if (character === '{' && frame.braceDepth > 0) {
          keep(1);
          stack[stack.length - 1] = { ...frame, braceDepth: frame.braceDepth + 1 };
        } else if (character === '}' && frame.braceDepth > 0) {
          keep(1);
          if (frame.braceDepth === 1) {
            stack.pop();
          } else {
            stack[stack.length - 1] = { ...frame, braceDepth: frame.braceDepth - 1 };
          }
        } else {
          keep(1);
        }
        break;
      }
    }
  }

  return output.join('');
}

/* ---------------------------------------------------------------------------------------------
 * Mechanism A: an `any` used as a type
 * ------------------------------------------------------------------------------------------- */

/** The characters a longer identifier is built from, which the `any` token must not touch. */
const IDENTIFIER_CHARACTER = /[A-Za-z0-9_$]/;

/** The `any` token, matched case-sensitively so `Any` and `ANY` are not the type. */
const ANY_TOKEN = /any/g;

/**
 * Context that only ever sits immediately before a type expression.
 *
 * `:` and `=>` are annotations, `<` and `,` are generic arguments, `(` starts a parenthesised type and
 * `=` introduces a type alias. None of them sits directly before the English word in the prose these
 * sources carry, which is what keeps the detector off its own documentation.
 */
const TYPE_LEADING_CONTEXT = /(?::|<|\||,|\(|=>|=)\s*$/;

/**
 * Context that introduces a type but also occurs in prose, so it needs a second signal.
 *
 * `as` writes a type assertion and also compares two things in an English sentence — "the same as any
 * other order" — so on its own it proves nothing. Paired with a trailing boundary or the end of the
 * line it does, which keeps both a real assertion and that sentence on the right side of the check.
 */
const TYPE_LEADING_KEYWORD = /\b(?:as|keyof|readonly|satisfies)\s*$/;

/** Context that only ever follows a completed type expression. */
const TYPE_TRAILING_CONTEXT = /^\s*[>[\])|,;}]/;

/** The end of the line or of the file, which closes a type expression written without a delimiter. */
const TYPE_TRAILING_LINE_END = /^\s*(?:\n|$)/;

/**
 * Whether the token at the given offsets sits where TypeScript expects a type.
 *
 * The token is the same three letters in `input: any` and in "for any call still in flight", so the
 * question is asked of the surroundings rather than of the token.
 */
function isTypePosition(text: string, start: number, end: number): boolean {
  const before = text.slice(0, start);
  const after = text.slice(end);

  if (TYPE_LEADING_CONTEXT.test(before) || TYPE_TRAILING_CONTEXT.test(after)) {
    return true;
  }

  return TYPE_LEADING_KEYWORD.test(before) && TYPE_TRAILING_LINE_END.test(after);
}

/** Every `any` used as a type in one file's text. */
function findAnyTypeUses(text: string): SourceHit[] {
  const stripped = stripComments(text);
  const hits: SourceHit[] = [];
  const scan = new RegExp(ANY_TOKEN.source, ANY_TOKEN.flags);
  let match = scan.exec(stripped);

  while (match !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const before = start > 0 ? stripped[start - 1] ?? '' : '';
    const after = stripped[end] ?? '';
    const wholeWord = !IDENTIFIER_CHARACTER.test(before) && !IDENTIFIER_CHARACTER.test(after);

    if (wholeWord && isTypePosition(stripped, start, end)) {
      hits.push({ line: lineOf(stripped, start), text: lineExcerptOf(stripped, start) });
    }

    match = scan.exec(stripped);
  }

  return hits;
}

/* ---------------------------------------------------------------------------------------------
 * Mechanism B: a TypeScript suppression directive
 * ------------------------------------------------------------------------------------------- */

/**
 * The directives that switch TypeScript's own checking off.
 *
 * They are matched on the raw text for a reason: each one is only ever written inside a comment, so
 * the stripped text the `any` half reads would contain none of them at all.
 */
const SUPPRESSION_DIRECTIVE = /@ts-(?:ignore|expect-error|nocheck)\b/g;

/** Every suppression directive in one file's text, comments and all. */
function findSuppressionDirectives(text: string): SourceHit[] {
  const hits: SourceHit[] = [];
  const scan = new RegExp(SUPPRESSION_DIRECTIVE.source, SUPPRESSION_DIRECTIVE.flags);
  let match = scan.exec(text);

  while (match !== null) {
    hits.push({ line: lineOf(text, match.index), text: match[0] });
    match = scan.exec(text);
  }

  return hits;
}

/* ---------------------------------------------------------------------------------------------
 * Running a mechanism over both folders
 * ------------------------------------------------------------------------------------------- */

/**
 * Every hit one mechanism makes across both folders, as `<path>:<line> — <text>`.
 *
 * The paths are sorted so a failure lists its findings in the same order on every run, and the text is
 * the offending line itself, so a reviewer can open the file at the reported line and see the code
 * rather than a fragment of it.
 */
function collectFindings(find: (text: string) => SourceHit[]): string[] {
  const findings: string[] = [];

  for (const globKey of Object.keys(SCANNED_MODULES).sort()) {
    for (const hit of find(SCANNED_MODULES[globKey] ?? '')) {
      findings.push(`${repositoryPathOf(globKey)}:${hit.line} — ${hit.text}`);
    }
  }

  return findings;
}

/* ---------------------------------------------------------------------------------------------
 * Samples that prove neither mechanism passes vacuously
 * ------------------------------------------------------------------------------------------- */

/*
 * The samples below are string literals rather than code on purpose: an annotation written as code
 * would put an `any` in this file, and a directive written as a comment would switch the checker off
 * over it — so the check would be enforced by the very constructs it forbids, and a `@ts-nocheck` here
 * would silence the module that reports it. As data they exercise the detectors and bind nothing.
 */

/** The syntactic forms a type-position `any` takes, each written as code that uses it. */
const TYPE_POSITION_SAMPLES: readonly { readonly form: string; readonly sample: string }[] = [
  { form: 'a parameter annotation', sample: 'function read(input: any): void {}' },
  { form: 'a return annotation', sample: 'function read(): any { return null; }' },
  { form: 'a type alias', sample: 'type Loose = any;' },
  { form: 'a union member', sample: 'type Maybe = string | any;' },
  { form: 'an array type', sample: 'const rows: any[] = [];' },
  { form: 'a generic argument', sample: 'const box: Array<any> = [];' },
  { form: 'a promise result', sample: 'type Pending = Promise<any>;' },
  { form: 'a record value', sample: 'type Bag = Record<string, any>;' },
  { form: 'a type assertion', sample: 'const value = input as any;' },
  { form: 'a type assertion that ends its line', sample: 'const value = input as any\n' },
];

/** Text that holds the same three letters without using the type. */
const NOT_A_TYPE_SAMPLES: readonly { readonly reason: string; readonly sample: string }[] = [
  {
    reason: 'longer identifiers that contain the letters',
    sample: 'const company = createCompany(); const many = quantity + miscellaneous;',
  },
  {
    reason: 'a capitalised, upper-case or suffixed spelling',
    sample: 'const Any = 1; const ANY = 2; const anyValue = 3; const any_of = 4;',
  },
  {
    reason: 'a line comment mentioning the word',
    sample: '// A planner may read any record in scope.\nconst value = 1;',
  },
  {
    reason: 'a block comment mentioning the word',
    sample: '/**\n * The drawer opens for any figure.\n */\nconst value = 1;',
  },
  {
    reason: 'ordinary prose in a string literal',
    sample: "const note = 'the same as any other order in the queue';",
  },
];

/** A comment-shaped sample written by joining lines, so a multi-line case stays readable. */
function linesOf(...lines: readonly string[]): string {
  return lines.join('\n');
}

/* ---------------------------------------------------------------------------------------------
 * Suites
 * ------------------------------------------------------------------------------------------- */

describe('an `any` used as a type in src/services or src/types (success criterion 5)', () => {
  it('reports none in either folder', () => {
    expect(
      collectFindings(findAnyTypeUses),
      'rule P-2 keeps these two folders as the typed boundary: replace each `any` above with the type the record actually has',
    ).toEqual([]);
  });

  it.each(TYPE_POSITION_SAMPLES)('flags a type-position `any` in $form', ({ sample }) => {
    expect(
      findAnyTypeUses(sample),
      `the detector did not fire on ${JSON.stringify(sample)}, so a real one could pass unseen`,
    ).not.toEqual([]);
  });

  it.each(NOT_A_TYPE_SAMPLES)('leaves the word alone in $reason', ({ sample }) => {
    expect(
      findAnyTypeUses(sample),
      `the detector flagged ${JSON.stringify(sample)}, so it is too broad to keep the gate honest`,
    ).toEqual([]);
  });

  it('blanks comments without moving a line', () => {
    const sample = linesOf('/* one', '   two */', '// three', 'const row: any = null;');
    const stripped = stripComments(sample);

    expect(stripped).toHaveLength(sample.length);
    expect(stripped.split('\n')).toHaveLength(sample.split('\n').length);
    expect(stripped).not.toContain('two');
    expect(stripped).not.toContain('three');
    expect(stripped).toContain('const row: any = null;');
  });

  it('keeps the line number of a hit that follows a multi-line block comment', () => {
    const sample = linesOf(
      '/* the drawer opens',
      '   for any figure on the canvas */',
      'const row: any = null;',
    );
    const hits = findAnyTypeUses(sample);

    expect(hits).toHaveLength(1);
    expect(hits[0]?.line).toBe(3);
  });

  it('reports only the code hit when a file also mentions the word in prose', () => {
    const sample = linesOf(
      '/**',
      ' * The drawer opens for any figure under the cursor.',
      ' */',
      'const row: any = null;',
    );
    const hits = findAnyTypeUses(sample);

    expect(hits).toHaveLength(1);
    expect(hits[0]?.line).toBe(4);
  });

  it('keeps a comment marker inside a string from hiding the annotation after it', () => {
    const sample = "const label = 'path // not a comment'; const row: any = null;";
    const hits = findAnyTypeUses(sample);

    expect(hits).toHaveLength(1);
    expect(hits[0]?.line).toBe(1);
  });

  it('does not throw on a comment that is never closed', () => {
    const sample = linesOf(
      'const row: any = null;',
      '/* the note never closes on a forbidden : any',
    );

    expect(() => stripComments(sample)).not.toThrow();
    expect(stripComments(sample)).toHaveLength(sample.length);
    expect(findAnyTypeUses(sample)).toHaveLength(1);
    expect(findAnyTypeUses(sample)[0]?.line).toBe(1);
  });
});

describe('a TypeScript suppression directive in src/services or src/types (success criterion 5)', () => {
  it('reports none in either folder', () => {
    expect(
      collectFindings(findSuppressionDirectives),
      'each directive above turns the checker off over the typed boundary: fix the type rather than silencing it',
    ).toEqual([]);
  });

  it.each([
    {
      name: 'the ignore directive',
      sample: linesOf('// @ts-ignore the value above is checked elsewhere', 'const value = 1;'),
    },
    {
      name: 'the expect-error directive',
      sample: linesOf('// @ts-expect-error the library type is wrong here', 'const value = 1;'),
    },
    {
      name: 'the no-check directive',
      sample: linesOf('// @ts-nocheck', 'const value = 1;'),
    },
    {
      name: 'a directive written inside a block comment',
      sample: linesOf('/**', ' * @ts-expect-error see the note above', ' */', 'const value = 1;'),
    },
  ])('flags $name', ({ sample }) => {
    expect(
      findSuppressionDirectives(sample),
      `the detector did not fire on ${JSON.stringify(sample)}`,
    ).toHaveLength(1);
  });

  it('leaves the ordinary words alone', () => {
    const sample = linesOf(
      '// ignore the previous line',
      'const ignored = 1;',
      "const note = 'expect error handling on the retry';",
    );

    expect(findSuppressionDirectives(sample)).toEqual([]);
  });
});

describe('the scan reaches the surface it protects', () => {
  it('reads at least one module from each folder', () => {
    expect(Object.keys(SERVICE_MODULES).length).toBeGreaterThan(0);
    expect(Object.keys(TYPE_MODULES).length).toBeGreaterThan(0);
  });

  it('reaches both anchored contract modules', () => {
    const scanned = new Set(Object.keys(SCANNED_MODULES).map(repositoryPathOf));

    expect(
      ANCHOR_PATHS.filter((path) => !scanned.has(path)),
      'the globs no longer reach these modules, so the check would pass over the folders it exists to protect',
    ).toEqual([]);
  });

  it('reads every module in both folders, the tests beside them included', () => {
    const scanned = new Set(Object.keys(SCANNED_MODULES).map(repositoryPathOf));
    const folderPaths = ALL_FOLDER_PATHS.map(repositoryPathOf);
    const modules = folderPaths.filter(isReadableModule);

    expect(
      modules.filter((path) => !scanned.has(path)),
      'a module in these folders was not read as text, so an `any` or a directive in it could not be found',
    ).toEqual([]);
    expect(
      folderPaths.filter((path) => !isReadableModule(path)),
      'a file type the scan does not read appeared in these folders: extend the glob, or record why it cannot hold a type',
    ).toEqual([]);
    expect(
      modules.filter((path) => path.endsWith('.test.ts')),
      'no test module in these folders was scanned, which would let the checker be disabled beside the code it checks',
    ).not.toEqual([]);
  });
});

