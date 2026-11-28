// @vitest-environment node

/**
 * Rule P-6 source check: no currency amount, no record identifier and no bare magnitude is typed
 * into a screen, a component or a shell module, and the assistant's builders hold no figure,
 * sentence or question of their own.
 *
 * WHAT THIS PROVES. Rule P-6 requires every number shown to be computed by the solver module or from
 * a seed record by the contracts' rules, and forbids a number typed into "a component, a text
 * template or a test hook". The screen-side proof is structural — a figure reaches a screen through
 * the service, from `src/domain/solver` or `src/domain/aggregation` — and this module is the
 * mechanical proof beside it: it reads the text of every screen, component and shell module and fails
 * when a currency amount, a record identifier or a bare magnitude has been typed into one. AAP 0.9
 * fixes this row and three of the subjects it reads; rule P-6, which the plan ranks below the rules,
 * adds the shell to them. AAP 0.8 fixes the two facts that depend on it — the expected results of the
 * seed document live only in `tests/fixtures/`, so a displayed figure is never a fixture, and the
 * canvas's default exception is resolved from service data rather than written into the screen
 * precisely because this check reads that screen.
 *
 * The assistant's builders are held to their design as well. `src/services/mock/assistant-script.ts`
 * owns the arithmetic that fills the seeded sentences and nothing else: every question, every
 * sentence and every figure belongs to `src/seed/assistant-questions.ts` or arrives from a
 * computation at call time, so a three-digit literal, a string mixing digits with letters, or a
 * string holding a question mark in that module is an injected figure, an invented sentence or a
 * typed question, and a bare magnitude there is the same defect as a bare magnitude on a screen — so
 * the magnitude family below is applied to the builders as well.
 *
 * WHAT THIS READS. Every application module a reader can see rendered — `src/features/**` (the
 * screens), `src/components/**` (the shared components) and `src/app/**` (the shell: the top bar, the
 * simulation controls, the role switcher, the search field, the freshness strip, the scope filters,
 * the sovereignty pill and the stage-notice and not-found pages) — plus
 * `src/services/mock/assistant-script.ts`, the builders, named as one path rather than globbed as a
 * folder. The shell is read because rule P-6's subject is "a component, a text template or a test
 * hook" and the shell is the component a reader sees on every route, composing sentences and figures
 * of its own. `src/seed/` is deliberately not read: it is where the records and their text belong
 * (AAP 0.8).
 *
 * WHAT IS DELIBERATELY NOT A HIT. A ratio, a percentage used as a scale, a pixel size, a `viewBox`, a
 * stroke width, a radius, a row height, a timeout, an array index, a step count and a bare currency
 * *code* are all legal: the components carry geometry, widths and scale maxima of their own, and the
 * one money formatter's options name the currency code rather than an amount. The check therefore
 * matches the three shapes a typed amount takes — the euro symbol, a currency code touching digits, a
 * thousands-grouped digit run — the twelve record-identifier patterns the contracts fix, and the
 * three shapes a typed bare magnitude takes, and leaves every other number alone.
 *
 * WHERE THE SUBJECT IS NARROWED, AND WHY. Two narrowings, each of them the rule's own subject rather
 * than a list of files permitted to break the rule:
 *
 * - **Test modules are not scanned.** P-6 forbids a number typed into "a component, a text template
 *   or a test hook"; a test's expected output is none of the three, and `mono-value.test.tsx` cannot
 *   prove the money formatter without asserting a formatted amount. The folder globs drop any path
 *   ending in `.test.ts` or `.test.tsx` for that reason. No application module a reader can see
 *   rendered is exempt, and no allowlist of files exists here.
 * - **Comments are not scanned.** A comment reaches no reader, so it cannot present a typed figure as
 *   a computed one, and this project's style asks a comment to cite the input that fixes a value — a
 *   citation such as the number of competitor networks the market pack holds is documentation, not a
 *   displayed figure. Code and string literals are both scanned in full, which is the whole of the
 *   path a figure must travel to appear on a screen.
 *
 * WHY THE TEXT IS READ WITH A SMALL SCANNER RATHER THAN A PATTERN OVER THE RAW TEXT. Comments in
 * these modules are prose: they carry apostrophes, backticks and whole quoted sentences. A pattern
 * that treated every quote as a literal delimiter would read a comment's apostrophe as the start of a
 * string and swallow the code after it, and a pattern that scanned comments would report the prose it
 * swallowed. `scanSource` below therefore walks each module once, in order, keeping comments (which no
 * rule scans) apart from string literals and code (which every rule does), and the separation is
 * asserted: a module whose strings and block comments are not all closed fails a guard below instead
 * of quietly weakening every rule in the file.
 *
 * HOW THE RULES ARE APPLIED. A rule is a regular expression plus the kinds of text it judges, so the
 * same machinery states a currency shape, a bare-magnitude shape, an identifier shape and the
 * builders' own constraints. A hit is reported as `<repository path>:<line> — <matched text>`, every
 * hit is collected rather than the first, and each category has its own case so a red gate names the
 * category that broke.
 *
 * NO FILE SYSTEM, NO IMPORT OF `src/`. `import.meta.glob(..., { query: '?raw' })` hands over each
 * module's bytes without evaluating it, so this suite needs no DOM, keeps `@types/node` out of the
 * project, imports no seed record (rule P-2's boundary is untouched), registers no test hook and
 * writes no snapshot or coverage artefact.
 *
 * RULES THIS MODULE IS BUILT TO SATISFY.
 * - P-6: it is the mechanical proof of the rule, and its own text types no figure and no record
 *   identifier beyond the patterns it matches and the plainly synthetic samples that prove they fire.
 * - P-7: it names no company, product or person of its own; every sample is synthetic, and the
 *   vocabulary the rule bars appears nowhere in the file.
 * - P-4: it claims nothing about the application's posture; it reports what the source text holds.
 * - P-2: it imports nothing from `src/` — a module's bytes arrive through `?raw`, so no seed record,
 *   no service and no component is ever reached.
 * - B-1, B-2: it reads no address, makes no request, declares no configuration and holds no credential.
 */

import { describe, expect, it } from 'vitest';

/* ---------------------------------------------------------------------------------------------
 * A. The modules this check reads — AAP 0.9 fixes three of the subjects, rule P-6 the fourth
 * ------------------------------------------------------------------------------------------- */

/**
 * Every screen module's text, keyed by the path the glob hands back and read at collection time.
 *
 * `?raw` returns the bytes without evaluating the module: no component is rendered, no import runs
 * and the check sees a comment exactly as a reader of the source does.
 */
const FEATURE_SOURCE_TEXT: Record<string, string> = import.meta.glob<string>(
  '../../src/features/**/*.{ts,tsx}',
  { query: '?raw', import: 'default', eager: true },
);

/** Every shared component module's text, read the same way. */
const COMPONENT_SOURCE_TEXT: Record<string, string> = import.meta.glob<string>(
  '../../src/components/**/*.{ts,tsx}',
  { query: '?raw', import: 'default', eager: true },
);

/**
 * Every shell module's text: the top bar, the simulation controls, the role switcher, the search
 * field and the rest of the shell under `src/app`, read the same way.
 *
 * The shell is where a reader meets the application on every route, so it composes text as a screen
 * does — the freshness strip states a source and its as-of time, the stage-notice pages say when a
 * workspace arrives, and the simulation controls name the states they trigger. Rule P-6's subject is
 * "a component, a text template or a test hook", which covers these modules exactly as it covers a
 * screen, so they are read here rather than left to the suites that render them.
 */
const SHELL_SOURCE_TEXT: Record<string, string> = import.meta.glob<string>(
  '../../src/app/**/*.{ts,tsx}',
  { query: '?raw', import: 'default', eager: true },
);

/**
 * The assistant's builders, named as one path rather than globbed as a folder.
 *
 * The module is where the demonstration's one prose answer is composed, so it is scanned on its own
 * terms, and the guard below asserts the glob finds it exactly once: a rename turns that guard red
 * rather than leaving the builders' rules with nothing to read.
 */
const ASSISTANT_BUILDER_TEXT: Record<string, string> = import.meta.glob<string>(
  '../../src/services/mock/assistant-script.ts',
  { query: '?raw', import: 'default', eager: true },
);

/** Where the assistant's builders live: the path the guard asserts and a hit reports. */
const ASSISTANT_BUILDER_PATH = 'src/services/mock/assistant-script.ts';

/** One module under scan: the path a hit names, and the text the rules read. */
interface ScannedFile {
  readonly path: string;
  readonly text: string;
}

/**
 * Turns a glob key into the repository-relative path a hit reports.
 *
 * `import.meta.glob` hands back keys relative to this module, and Node's path module is closed to the
 * project — `tsconfig.json` types `vite/client` alone, so `node:path` would need `@types/node`. The
 * keys hold nothing but `..` segments, plain names and one extension, so resolving them is the short
 * walk below rather than a second path module.
 *
 * @param globKey - A key as `import.meta.glob` returned it, such as `../../src/components/card.tsx`.
 * @returns The same path relative to the repository root, such as `src/components/card.tsx`.
 */
function repositoryPath(globKey: string): string {
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

/**
 * Resolves one glob result into the modules it found.
 *
 * @param globbed - A `?raw` glob result: each key a path, each value that module's text.
 * @returns Every module, with the path a hit reports.
 */
function scannedFilesOf(globbed: Readonly<Record<string, string>>): readonly ScannedFile[] {
  return Object.entries(globbed).map(([globKey, text]) => ({ path: repositoryPath(globKey), text }));
}

/** Every screen, component and shell module, test modules included. */
const APPLICATION_MODULE_FILES: readonly ScannedFile[] = [
  ...scannedFilesOf(FEATURE_SOURCE_TEXT),
  ...scannedFilesOf(COMPONENT_SOURCE_TEXT),
  ...scannedFilesOf(SHELL_SOURCE_TEXT),
];

/**
 * The paths this check sets aside as test modules.
 *
 * P-6's subject is a component, a text template or a test hook, and a test's own expected output is
 * none of them: `mono-value.test.tsx` has to assert a formatted amount or it cannot prove the money
 * formatter. The filter therefore removes a kind of module, never an application file.
 */
const TEST_MODULE_PATH = /\.test\.tsx?$/;

/** The application modules a reader can see rendered, and so the ones P-6 governs. */
const RENDERED_APPLICATION_MODULE_FILES: readonly ScannedFile[] =
  APPLICATION_MODULE_FILES.filter((file) => !TEST_MODULE_PATH.test(file.path));

/** The assistant's builders, resolved from the single-path glob. */
const ASSISTANT_BUILDER_FILES: readonly ScannedFile[] = scannedFilesOf(ASSISTANT_BUILDER_TEXT);

/* ---------------------------------------------------------------------------------------------
 * B. Reading one module's text — comments apart from literals and code
 * ------------------------------------------------------------------------------------------- */

/** A run of text, and where that run starts in its module. */
interface TextSegment {
  readonly value: string;
  readonly index: number;
}

/** One module's text, separated into the parts a rule judges and the part it sets aside. */
interface SourceSegments {
  /** The contents of every string literal, escapes kept as written. */
  readonly literals: readonly TextSegment[];
  /** Everything that is neither a comment nor a string literal: code, JSX markup and JSX text. */
  readonly code: readonly TextSegment[];
  /** The text nodes between JSX tags, which no other rule can tell apart from code. */
  readonly jsxText: readonly TextSegment[];
  /** Whether every string and block comment reached its end, so the separation can be trusted. */
  readonly closed: boolean;
}

/** The characters that open a string literal. */
const QUOTE_CHARACTERS: readonly string[] = ["'", '"', '`'];

/** A letter or a digit: the characters a JSX text apostrophe sits between. */
const WORD_CHARACTER = /[A-Za-z0-9]/;

/** The comment openers this language has, as the two-character pairs a scan looks for. */
const LINE_COMMENT_OPENER = '//';
const BLOCK_COMMENT_OPENER = '/*';
const BLOCK_COMMENT_CLOSER = '*/';
const LINE_BREAK = '\n';

/**
 * Whether a single quote is an apostrophe in JSX text rather than the start of a literal.
 *
 * A screen writes its copy as JSX text, so a possessive puts a single quote directly after a letter
 * ("the plan's figures") where nothing separates the two. JavaScript never opens a string literal
 * that way — a literal follows an operator, a bracket, a comma, a colon, a brace or whitespace — so a
 * quote directly after a letter or a digit belongs to the text, and reading it as a delimiter would
 * let one apostrophe in prose swallow the code after it.
 *
 * @param text - The module's text.
 * @param index - Where the quote sits.
 * @returns True when the quote continues a word rather than opening a literal.
 */
function isApostropheInProse(text: string, index: number): boolean {
  return index > 0 && WORD_CHARACTER.test(text.charAt(index - 1));
}

/** What one literal scan found: its contents, where it ended and whether it was closed. */
interface LiteralScan {
  readonly value: string;
  readonly end: number;
  readonly terminated: boolean;
}

/**
 * Reads one string literal, starting at its opening quote.
 *
 * A backslash escapes the character after it, so an escaped quote never ends the literal. A template
 * literal may span lines and any other literal stops at the end of its line: a single-quoted or
 * double-quoted string that reaches a line break is unterminated, and the scan says so rather than
 * running on into the code that follows.
 *
 * @param text - The module's text.
 * @param start - The index of the opening quote.
 * @returns The literal's contents, the index after its closing quote and whether it closed.
 */
function scanLiteral(text: string, start: number): LiteralScan {
  const delimiter = text.charAt(start);
  const spansLines = delimiter === '`';
  let cursor = start + 1;
  let value = '';
  while (cursor < text.length) {
    const character = text.charAt(cursor);
    if (character === '\\') {
      value += text.slice(cursor, cursor + 2);
      cursor += 2;
      continue;
    }
    if (character === delimiter) {
      return { value, end: cursor + 1, terminated: true };
    }
    if (!spansLines && character === LINE_BREAK) {
      break;
    }
    value += character;
    cursor += 1;
  }
  return { value, end: cursor, terminated: false };
}

/** Matches a JSX text node: the run between a closing angle bracket and the next opening one. */
const JSX_TEXT_NODE = />([^<>{}]+)</g;

/**
 * Collects the JSX text nodes out of the code segments.
 *
 * JSX text is neither code nor a literal to the scan above, and a currency amount typed into screen
 * copy sits there. The run between a `>` and the next `<` is the only place it can be, and a code
 * segment carries those angle brackets apart from the literals already separated out.
 *
 * @param code - The module's code segments.
 * @returns Every JSX text node, with the index its first character sits at.
 */
function jsxTextSegments(code: readonly TextSegment[]): readonly TextSegment[] {
  const segments: TextSegment[] = [];
  for (const segment of code) {
    for (const match of segment.value.matchAll(JSX_TEXT_NODE)) {
      const value = match[1];
      if (value === undefined) {
        continue;
      }
      segments.push({ value, index: segment.index + (match.index ?? 0) + 1 });
    }
  }
  return segments;
}

/**
 * Splits one module's text into comments, string literals and code.
 *
 * One left-to-right walk, in the order a reader takes it, is what keeps each of the three from being
 * mistaken for another: a comment is skipped before any quote inside it is seen, a literal is read to
 * its closing quote before any comment opener inside it is seen, and what is left is code. Nothing is
 * parsed beyond that — the check needs to know where a literal starts and ends, not what it means.
 *
 * @param text - The module's text, exactly as the glob returned it.
 * @returns The module's literals, code, JSX text and whether every string and block comment closed.
 */
function scanSource(text: string): SourceSegments {
  const literals: TextSegment[] = [];
  const code: TextSegment[] = [];
  let closed = true;
  let index = 0;
  let run = '';
  let runStart = 0;

  const flushRun = (): void => {
    if (run === '') {
      return;
    }
    code.push({ value: run, index: runStart });
    run = '';
  };

  while (index < text.length) {
    const character = text.charAt(index);
    const pair = text.slice(index, index + 2);

    if (pair === LINE_COMMENT_OPENER) {
      flushRun();
      const lineEnd = text.indexOf(LINE_BREAK, index);
      index = lineEnd === -1 ? text.length : lineEnd;
      continue;
    }

    if (pair === BLOCK_COMMENT_OPENER) {
      flushRun();
      const commentEnd = text.indexOf(BLOCK_COMMENT_CLOSER, index + 2);
      if (commentEnd === -1) {
        closed = false;
        index = text.length;
        continue;
      }
      index = commentEnd + 2;
      continue;
    }

    if (QUOTE_CHARACTERS.includes(character) && !isApostropheInProse(text, index)) {
      flushRun();
      const literal = scanLiteral(text, index);
      literals.push({ value: literal.value, index: index + 1 });
      if (!literal.terminated) {
        closed = false;
      }
      index = literal.end;
      continue;
    }

    if (run === '') {
      runStart = index;
    }
    run += character;
    index += 1;
  }

  flushRun();

  return { literals, code, jsxText: jsxTextSegments(code), closed };
}

/**
 * The 1-based line a character index sits on.
 *
 * @param text - The module's text.
 * @param index - A character index within it.
 * @returns The line number a reader's editor would show for that index.
 */
function lineNumberAt(text: string, index: number): number {
  const limit = Math.min(index, text.length);
  let line = 1;
  for (let cursor = 0; cursor < limit; cursor += 1) {
    if (text.charAt(cursor) === LINE_BREAK) {
      line += 1;
    }
  }
  return line;
}

/* ---------------------------------------------------------------------------------------------
 * C. The rules — three currency shapes, three bare-magnitude shapes, twelve identifier shapes and
 *    four builder constraints
 * ------------------------------------------------------------------------------------------- */

/**
 * The kinds of text a rule judges.
 *
 * `nonComment` is code and string literals together: everything a reader of the running application
 * could be shown, which is the subject a record identifier and a currency code are judged over. The
 * other three name one kind of text each, for a shape that only means something there.
 */
type SegmentSubject = 'literals' | 'code' | 'jsxText' | 'nonComment';

/** One thing to look for, and the kinds of text it is looked for in. */
interface SourcePattern {
  readonly pattern: RegExp;
  readonly subjects: readonly SegmentSubject[];
}

/**
 * The segments one subject names.
 *
 * @param segments - One module's separated text.
 * @param subject - The kinds of text to return.
 * @returns The segments a rule scans, in the order the module holds them.
 */
function segmentsOf(segments: SourceSegments, subject: SegmentSubject): readonly TextSegment[] {
  switch (subject) {
    case 'literals':
      return segments.literals;
    case 'code':
      return segments.code;
    case 'jsxText':
      return segments.jsxText;
    case 'nonComment':
      return [...segments.code, ...segments.literals];
  }
}

/**
 * The three shapes a currency amount takes when it is typed rather than rendered.
 *
 * The euro symbol is matched through its escape so this file holds the character only as a pattern.
 * The bare code is deliberately not a shape: the one money formatter's options name the currency the
 * interface renders in, and naming it is not stating an amount — so only a code touching digits, in
 * either order, counts. A thousands-grouped run is an amount wherever it appears in copy, and the
 * grouping is what distinguishes it from the geometry, the counts and the step numbers a component
 * legitimately carries.
 */
const CURRENCY_PATTERNS: readonly SourcePattern[] = [
  { pattern: /\u20AC/g, subjects: ['literals', 'jsxText'] },
  { pattern: /(?:EUR\s?[0-9]|[0-9]\s?EUR)/gi, subjects: ['nonComment'] },
  { pattern: /\d{1,3}(?:,\d{3})+/g, subjects: ['literals', 'jsxText'] },
];

/**
 * The words a component names a business measure with.
 *
 * A constant that states one of them holds a figure the application must compute: units late, kits
 * delayed, days late, revenue at risk, a percentage ready. The list is vocabulary rather than a set
 * of names, because the qualification after the measure word is the screen's own — `UNITS_LATE`,
 * `KITS_DELAYED` and `REVENUE_AT_RISK` are one shape.
 */
const MEASURE_NAME_WORDS =
  'UNITS|KITS|ORDERS|LINES|DAYS|HOURS|COST|PRICE|REVENUE|AMOUNT|MARGIN|READINESS|PERCENT|SCORE' +
  '|QTY|QUANTITY|IDLE|DELAYED';

/**
 * The suffixes a component legitimately qualifies a layout or a scale with.
 *
 * Each one names a pixel, a duration, a rounding or a class list rather than a business figure, so a
 * measure word carrying one of them is a geometry or presentation constant: `SCORE_MAX = 100` is the
 * top of a scale, not a score, and `READINESS_MAX` is the same shape.
 */
const LAYOUT_AND_SCALE_SUFFIXES =
  'WIDTH|HEIGHT|RADIUS|OFFSET|MAX|MIN|STEP|SIZE|LENGTH|DURATION|PRECISION|CLASSES|FORMAT|HEADER' +
  '|LABEL|TOP|LEFT|PADDING';

/**
 * A numeric literal bound to a constant whose name states a domain measure: `const UNITS_LATE = 580;`.
 *
 * This is the shape a typed figure most often takes, and no currency pattern sees it — there is no
 * euro sign, no currency code and no thousands separator in it. The shape is the name, not the size:
 * `const DAYS_LATE = 3;` states a business figure as plainly as `const UNITS_LATE = 580;`, while a
 * width of 760 and a radius of 120 are geometry whatever their magnitude. A digit-count threshold
 * would therefore let the first through and report the second, so the rule reads the name instead:
 * it must lead with a measure word, and the exclusions below then release the constants that qualify
 * a measure with a layout or a scale. A name whose measure word does not lead it is not read at all,
 * which is why the vocabulary can hold MARGIN while `X_LABEL_EDGE_MARGIN` and `HINT_VIEWPORT_MARGIN`
 * — the two offsets the tree names with it — stay out of the report. An optional type annotation is
 * allowed between the name and the `=`, so an annotated declaration is read like an inferred one, and
 * the whole value is matched so a report shows the figure that has to go.
 */
const MEASURE_ASSIGNMENT_PATTERN: SourcePattern = {
  pattern: new RegExp(
    `(?<![A-Za-z0-9_])(?:${MEASURE_NAME_WORDS})(?:_(?!${LAYOUT_AND_SCALE_SUFFIXES}\\b)[A-Z0-9]+)*` +
      '(?:\\s*:[^=;{}()\\n]*)?\\s*=\\s*\\d+(?:\\.\\d+)?',
    'g',
  ),
  subjects: ['code'],
};

/**
 * A bare magnitude of three or more digits typed straight into visible markup: `580` between tags.
 *
 * P-6 catches a number typed into "a component"; a number between two tags is the one way one
 * appears as visible content, with no literal, no attribute and no formatter around it. Three digits
 * is a shape rather than a threshold: the geometry a component writes into markup lives in
 * attributes — `x={420}`, `viewBox="0 0 420 240"`, `width="120"` — and never in a JSX text node,
 * while a step, an index or a rotation the markup could carry is one or two digits. The lookbehind
 * leaves a decimal fraction alone, so a fragment such as `0.500` is not read as a magnitude.
 */
const BARE_MARKUP_MAGNITUDE_PATTERN: SourcePattern = {
  pattern: /(?<![\d.])\d{3,}/g,
  subjects: ['jsxText'],
};

/**
 * A bare magnitude of three or more digits followed by whitespace and a letter, in a literal or in
 * JSX text: the figure a copy sentence is written around, such as `'defers 900 service kits'`.
 *
 * A currency amount in copy is already caught by the euro symbol or the grouped run; this is the
 * amount a sentence states with no currency marker at all, and it is the hardest of the three to
 * separate from the text a component legitimately holds. The separator is what does it: a figure a
 * sentence states is followed by a space and a word, while the digit runs the tree carries in its
 * literals are joined to what names them — `'text-13'`, `'motion-safe:duration-150'`,
 * `'group-hover:opacity-100 group-active:opacity-100'` — so the lookbehind refuses a run that
 * continues a word, a dotted path or a hyphenated token, and a `viewBox` such as `'0 0 420 240'`
 * stays out because its numbers are separated by more numbers rather than by a word. Three digits is
 * again a shape and not a threshold: a two-digit figure in copy cannot be told from a day count, a
 * step or a percentage of a scale, and a measure that is really two digits is caught by the
 * assignment shape above, which reads the name.
 */
const MAGNITUDE_IN_COPY_PATTERN: SourcePattern = {
  pattern: /(?<![\w.-])\d{3,}(?=\s+[A-Za-z])/g,
  subjects: ['literals', 'jsxText'],
};

/**
 * The three shapes a bare business magnitude takes when it is typed rather than computed.
 *
 * A currency amount is not the only figure a component must not type. `const UNITS_LATE = 580;`
 * states a domain measure with no euro sign, no code and no separator, and rule P-6 forbids it
 * exactly as it forbids a typed amount — so this family sits beside `CURRENCY_PATTERNS` and is
 * applied wherever they are. Each shape is defined by what it looks like rather than by a size at
 * which a number becomes suspicious, because the geometry a component carries is as large as a
 * magnitude and a business figure can be as small as three days.
 */
const BARE_MAGNITUDE_PATTERNS: readonly SourcePattern[] = [
  MEASURE_ASSIGNMENT_PATTERN,
  BARE_MARKUP_MAGNITUDE_PATTERN,
  MAGNITUDE_IN_COPY_PATTERN,
];

/**
 * The twelve record-identifier patterns the contracts fix, each word-bounded so a longer token
 * cannot match.
 *
 * A screen or a component receives every record it names from the service: an exception, a purchase
 * order, a customer order, a scenario, an approval, an audit event, a policy, a document, an
 * evidence pin, a package, a competitor network and a chokepoint all arrive as data. A typed one is
 * the same fault as a typed figure — the screen would keep naming a record after the record set
 * changed — which is why these patterns sit beside the currency shapes. The scenario pattern accepts
 * the trailing segment written in either case, because the contracts fix the identifier in lower case
 * while the seeded scenarios may spell it in upper case; both are one identifier.
 */
const IDENTIFIER_PATTERNS: readonly SourcePattern[] = [
  { pattern: /\bEXC-2026-\d{4}\b/g, subjects: ['nonComment'] },
  { pattern: /\bPO-\d{8}\b/g, subjects: ['nonComment'] },
  { pattern: /\bCO-\d{6}\b/g, subjects: ['nonComment'] },
  { pattern: /\bSCN-\d{4}-[A-Za-z0-9]\b/g, subjects: ['nonComment'] },
  { pattern: /\bAPR-2026-\d{3}\b/g, subjects: ['nonComment'] },
  { pattern: /\bAUD-\d{6}\b/g, subjects: ['nonComment'] },
  { pattern: /\bPOL-\d{3}\b/g, subjects: ['nonComment'] },
  { pattern: /\bDOC-\d{4}\b/g, subjects: ['nonComment'] },
  { pattern: /\bPIN-[A-Za-z0-9-]+/g, subjects: ['nonComment'] },
  { pattern: /\bPPAP-\d{4}\b/g, subjects: ['nonComment'] },
  { pattern: /\bCMP-\d{2}\b/g, subjects: ['nonComment'] },
  { pattern: /\bCHK-\d{2}\b/g, subjects: ['nonComment'] },
];

/**
 * A numeric literal of three or more digits in the assistant's builders.
 *
 * The builders' own literals are structural and all of them are smaller than this: a lever left
 * undeployed is zero, a separator is a string, and every measure comes back from the solver. A
 * three-digit number in the module is therefore a magnitude typed into a builder, or a percentage the
 * module re-derived instead of taking `wholePercent` from `src/domain/solver/rounding.ts`, which is
 * the only rounding the codebase applies. A single dot rules out a decimal fraction, so a ratio such
 * as the one-number-of-one-hundred form stays legal while a whole magnitude does not.
 */
const ASSISTANT_MAGNITUDE_PATTERN: SourcePattern = {
  pattern: /(?<![\d.])\d{3,}/g,
  subjects: ['code'],
};

/**
 * A string literal that mixes digits with letters in the assistant's builders.
 *
 * This is how a figure injected into prose is caught: the builders hold no sentence of their own, so
 * a literal carrying both a letter and a digit is the shape of a number typed into an answer rather
 * than a value filled into a template. The match is the whole literal, so the report shows the text
 * that has to go.
 */
const ASSISTANT_MIXED_CONTENT_PATTERN: SourcePattern = {
  pattern: /^(?=[\s\S]*[A-Za-z])(?=[\s\S]*\d)[\s\S]+$/g,
  subjects: ['literals'],
};

/**
 * A string literal holding a question mark in the assistant's builders.
 *
 * The six suggested questions belong to `src/seed/assistant-questions.ts`, so a question mark in a
 * builder's own text means a question was typed into the module that is supposed to receive one. The
 * fixed notice a builder returns for anything outside its script carries none, which is why this rule
 * leaves it alone.
 */
const ASSISTANT_QUESTION_PATTERN: SourcePattern = {
  pattern: /^[\s\S]*\?[\s\S]*$/g,
  subjects: ['literals'],
};

/** Every assistant-builder constraint, in the order the module's rules are stated. */
const ASSISTANT_PATTERNS: readonly SourcePattern[] = [
  ...CURRENCY_PATTERNS,
  ...IDENTIFIER_PATTERNS,
  ...BARE_MAGNITUDE_PATTERNS,
  ASSISTANT_MAGNITUDE_PATTERN,
  ASSISTANT_MIXED_CONTENT_PATTERN,
  ASSISTANT_QUESTION_PATTERN,
];

/** The separator a hit puts between its position and the text it matched. */
const HIT_SEPARATOR = ' — ';

/** Whitespace inside a matched run, collapsed so one hit is one report line. */
const WHITESPACE_RUN = /\s+/g;

/**
 * Runs every rule over every module and reports each match as `<path>:<line> — <matched text>`.
 *
 * Every hit is collected rather than the first, because one repaired injection usually sits beside
 * another and a gate that named them one per run would cost a run each. Collapsing a match's
 * whitespace keeps a multi-line literal on one line of the report without hiding what it holds.
 *
 * @param files - The modules to scan.
 * @param patterns - The rules to apply, in the order they should be reported.
 * @returns The hits, formatted as a reader can act on them; empty when every rule was honoured.
 */
function collectHits(files: readonly ScannedFile[], patterns: readonly SourcePattern[]): readonly string[] {
  const hits: string[] = [];
  for (const file of files) {
    const segments = scanSource(file.text);
    for (const sourcePattern of patterns) {
      for (const subject of sourcePattern.subjects) {
        for (const segment of segmentsOf(segments, subject)) {
          for (const match of segment.value.matchAll(sourcePattern.pattern)) {
            const position = lineNumberAt(file.text, segment.index + (match.index ?? 0));
            const matchedText = match[0].replace(WHITESPACE_RUN, ' ').trim();
            hits.push(`${file.path}:${position}${HIT_SEPARATOR}${matchedText}`);
          }
        }
      }
    }
  }
  return hits;
}

/* ---------------------------------------------------------------------------------------------
 * D. The guards — proof that the checks above cannot pass by scanning nothing
 * ------------------------------------------------------------------------------------------- */

describe('the check reads every module it claims to cover', () => {
  it('finds screen, component and shell modules once the test modules are set aside', () => {
    const paths = RENDERED_APPLICATION_MODULE_FILES.map((file) => file.path);
    const screens = paths.filter((path) => path.startsWith('src/features/'));
    const components = paths.filter((path) => path.startsWith('src/components/'));
    const shell = paths.filter((path) => path.startsWith('src/app/'));
    expect(screens.length, 'no screen module was found, so the screen rules would scan nothing').toBeGreaterThan(0);
    expect(
      components.length,
      'no component module was found, so the component rules would scan nothing',
    ).toBeGreaterThan(0);
    expect(shell.length, 'no shell module was found, so the shell rules would scan nothing').toBeGreaterThan(0);
    expect(paths.filter((path) => TEST_MODULE_PATH.test(path))).toEqual([]);
  });

  it('finds the assistant builders exactly once', () => {
    expect(ASSISTANT_BUILDER_FILES.map((file) => file.path)).toEqual([ASSISTANT_BUILDER_PATH]);
  });

  it('reads every scanned module to its end with every string and block comment closed', () => {
    const unterminated = [...APPLICATION_MODULE_FILES, ...ASSISTANT_BUILDER_FILES]
      .filter((file) => !scanSource(file.text).closed)
      .map((file) => file.path);
    expect(
      unterminated,
      'a module was not read to its end intact, so the separation of comments from literals is unsound',
    ).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * E. Screens, components and the shell — currency amounts, record identifiers and bare magnitudes
 * ------------------------------------------------------------------------------------------- */

describe('a currency amount is never typed into a screen, a component or a shell module', () => {
  it('reports every amount, currency code or grouped figure written there', () => {
    const hits = collectHits(RENDERED_APPLICATION_MODULE_FILES, CURRENCY_PATTERNS);
    expect(
      hits,
      'an amount is typed into a screen, a component or a shell module; a computed value belongs on screen through MonoValue',
    ).toEqual([]);
  });
});

describe('a record identifier is never typed into a screen, a component or a shell module', () => {
  it('reports every record identifier written there', () => {
    const hits = collectHits(RENDERED_APPLICATION_MODULE_FILES, IDENTIFIER_PATTERNS);
    expect(
      hits,
      'a record identifier is typed into a screen, a component or a shell module; every record it names arrives from the service',
    ).toEqual([]);
  });
});

describe('a bare magnitude is never typed into a screen, a component or a shell module', () => {
  it('reports a measure bound to a literal, and a figure written into markup or into a sentence', () => {
    const hits = collectHits(RENDERED_APPLICATION_MODULE_FILES, BARE_MAGNITUDE_PATTERNS);
    expect(
      hits,
      'a magnitude is typed into a screen, a component or a shell module; every figure shown is computed by the solver or computed from a seed record by the contracts rules',
    ).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * F. The assistant's builders — no question, no sentence and no figure of their own
 * ------------------------------------------------------------------------------------------- */

describe("the assistant's builders hold no figure, sentence or question of their own", () => {
  it('reports a currency amount or a record identifier written there', () => {
    const hits = collectHits(ASSISTANT_BUILDER_FILES, [...CURRENCY_PATTERNS, ...IDENTIFIER_PATTERNS]);
    expect(
      hits,
      'an amount or a record identifier is typed into the builders; both belong to the records they are filled from',
    ).toEqual([]);
  });

  it('reports a bare magnitude written there as a measure, in markup or in a sentence', () => {
    const hits = collectHits(ASSISTANT_BUILDER_FILES, BARE_MAGNITUDE_PATTERNS);
    expect(
      hits,
      'a magnitude is typed into the builders as a measure, into markup or into a sentence they are supposed to receive',
    ).toEqual([]);
  });

  it('reports a numeric literal of three or more digits written there', () => {
    const hits = collectHits(ASSISTANT_BUILDER_FILES, [ASSISTANT_MAGNITUDE_PATTERN]);
    expect(
      hits,
      'a magnitude is typed into the builders instead of being computed, or a percentage is re-derived instead of rounded',
    ).toEqual([]);
  });

  it('reports a string literal that mixes digits with letters written there', () => {
    const hits = collectHits(ASSISTANT_BUILDER_FILES, [ASSISTANT_MIXED_CONTENT_PATTERN]);
    expect(hits, 'a figure is typed inside a sentence the builders are supposed to receive').toEqual([]);
  });

  it('reports a string literal holding a question mark written there', () => {
    const hits = collectHits(ASSISTANT_BUILDER_FILES, [ASSISTANT_QUESTION_PATTERN]);
    expect(hits, 'a question is typed into the builders instead of being read from the seeded questions').toEqual([]);
  });
});

/* ---------------------------------------------------------------------------------------------
 * G. Synthetic modules — proof that each rule still fires, and that a legal figure passes
 * ------------------------------------------------------------------------------------------- */

/** A path no file holds: the synthetic modules below are the only modules reported against it. */
const SYNTHETIC_COMPONENT_PATH = 'src/components/synthetic-sample.tsx';

/** A second synthetic path, for the builders' own samples. */
const SYNTHETIC_BUILDER_PATH = 'src/services/mock/synthetic-builder.ts';

/**
 * Wraps sample text as the module a rule would see.
 *
 * @param path - The path the sample is reported against.
 * @param text - The sample's text.
 * @returns One module under scan holding the sample alone.
 */
function syntheticModule(path: string, text: string): readonly ScannedFile[] {
  return [{ path, text }];
}

/**
 * A synthetic screen snippet carrying an amount two ways: after the euro symbol, and as a bare code
 * touching its number with the thousands grouped.
 */
const SYNTHETIC_TYPED_AMOUNT = [
  "const TYPED_TOTAL = 'Total \u20AC 9,999 due';",
  'const TYPED_CODE_FIRST = "EUR 1,250.00 committed";',
].join('\n');

/** A synthetic screen snippet carrying a record identifier, spelled so it matches no real record. */
const SYNTHETIC_TYPED_IDENTIFIER = "const TYPED_REFERENCE = 'EXC-2026-0000';";

/**
 * A synthetic screen snippet carrying a bare business magnitude: a large measure, a small one and a
 * measure bound to a literal with a type annotation. None carries a currency marker, so only the
 * magnitude family can report them, and the small one is what proves the rule reads the name rather
 * than a size.
 */
const SYNTHETIC_TYPED_MAGNITUDE = [
  'const UNITS_LATE = 580;',
  'const DAYS_LATE = 3;',
  'const PERCENT_READY: number = 78;',
].join('\n');

/**
 * A synthetic screen snippet carrying a figure where no assignment reveals it: straight into visible
 * markup, and into the text of a copy sentence.
 */
const SYNTHETIC_TYPED_FIGURE_IN_COPY = [
  'const LATE_UNITS = <span>580</span>;',
  "const NOTICE = 'defers 900 service units by 10 days';",
].join('\n');

/**
 * A synthetic component snippet holding every figure a component may legitimately carry: a ratio, a
 * percentage of a scale, a width, a `viewBox`, the geometry and scale names the magnitude family has
 * to leave alone, and the money formatter's options naming the currency code it renders in without
 * stating an amount.
 */
const SYNTHETIC_LEGAL_FIGURES = [
  'const SHARE = 0.42;',
  'const SHARE_PERCENT = 42;',
  'const WIDTH = 420;',
  'const VIEW_WIDTH = 760;',
  'const RADIUS = 120;',
  'const SCORE_MAX = 100;',
  "const VIEW_BOX = '0 0 420 240';",
  "const MONEY_FORMAT = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });",
  'const SHIFTED = ROW_HEIGHT + 2;',
].join('\n');

/** A synthetic builder snippet holding each of the three things a builder may not write itself. */
const SYNTHETIC_BUILDER_BREACHES = [
  'const SAMPLE_MAGNITUDE = 999;',
  "const SAMPLE_SENTENCE = 'synthetic 999 inside prose';",
  "const SAMPLE_QUESTION = 'does this cite a record?';",
].join('\n');

/**
 * A synthetic builder snippet holding only what a builder may hold: the fixed notice it returns
 * outside its script, and a call that fills a placeholder from a value it was handed.
 */
const SYNTHETIC_BUILDER_FILL = [
  "const FIXED_NOTICE = 'This demonstration has no model behind it. Try one of the suggested questions.';",
  'function fillTemplate(template: string, values: Readonly<Record<string, string>>): string {',
  "  return template.replace('{placeholder}', values['placeholder'] ?? '');",
  '}',
].join('\n');

describe('each rule fires on a synthetic breach', () => {
  it('catches an amount typed into a synthetic screen', () => {
    const hits = collectHits(syntheticModule(SYNTHETIC_COMPONENT_PATH, SYNTHETIC_TYPED_AMOUNT), CURRENCY_PATTERNS);
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:1${HIT_SEPARATOR}\u20AC`);
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:1${HIT_SEPARATOR}9,999`);
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:2${HIT_SEPARATOR}1,250`);
  });

  it('catches an identifier typed into a synthetic screen', () => {
    const hits = collectHits(syntheticModule(SYNTHETIC_COMPONENT_PATH, SYNTHETIC_TYPED_IDENTIFIER), IDENTIFIER_PATTERNS);
    expect(hits).toEqual([`${SYNTHETIC_COMPONENT_PATH}:1${HIT_SEPARATOR}EXC-2026-0000`]);
  });

  it('catches a bare magnitude typed into a synthetic screen', () => {
    const hits = collectHits(
      syntheticModule(SYNTHETIC_COMPONENT_PATH, SYNTHETIC_TYPED_MAGNITUDE),
      BARE_MAGNITUDE_PATTERNS,
    );
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:1${HIT_SEPARATOR}UNITS_LATE = 580`);
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:2${HIT_SEPARATOR}DAYS_LATE = 3`);
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:3${HIT_SEPARATOR}PERCENT_READY: number = 78`);
  });

  it('catches a figure typed into synthetic markup and into a synthetic sentence', () => {
    const hits = collectHits(
      syntheticModule(SYNTHETIC_COMPONENT_PATH, SYNTHETIC_TYPED_FIGURE_IN_COPY),
      BARE_MAGNITUDE_PATTERNS,
    );
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:1${HIT_SEPARATOR}580`);
    expect(hits).toContain(`${SYNTHETIC_COMPONENT_PATH}:2${HIT_SEPARATOR}900`);
  });

  it('passes a synthetic screen holding only figures a component may carry', () => {
    const hits = collectHits(
      syntheticModule(SYNTHETIC_COMPONENT_PATH, SYNTHETIC_LEGAL_FIGURES),
      [...CURRENCY_PATTERNS, ...IDENTIFIER_PATTERNS, ...BARE_MAGNITUDE_PATTERNS],
    );
    expect(hits).toEqual([]);
  });

  it('catches each way a figure is typed into a synthetic builder', () => {
    const builder = syntheticModule(SYNTHETIC_BUILDER_PATH, SYNTHETIC_BUILDER_BREACHES);
    expect(collectHits(builder, [ASSISTANT_MAGNITUDE_PATTERN]).length).toBeGreaterThan(0);
    expect(collectHits(builder, [ASSISTANT_MIXED_CONTENT_PATTERN]).length).toBeGreaterThan(0);
    expect(collectHits(builder, [ASSISTANT_QUESTION_PATTERN]).length).toBeGreaterThan(0);
  });

  it('passes a synthetic builder holding only the fixed notice and a placeholder fill', () => {
    const hits = collectHits(
      syntheticModule(SYNTHETIC_BUILDER_PATH, SYNTHETIC_BUILDER_FILL),
      ASSISTANT_PATTERNS,
    );
    expect(hits).toEqual([]);
  });
});

