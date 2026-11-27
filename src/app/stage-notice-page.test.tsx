/**
 * Suite for `stage-notice-page.tsx`, the page the S4 and S5 routes render.
 *
 * The behaviour under test is the sentence's casing. The notice is built from a navigation label,
 * and the label must read as the continuation of a sentence without the product's own names being
 * re-cased: rule P-7 fixes the workspace as the "FileMap canvas", so a whole-label lower-casing
 * transform - which would write "filemap canvas" - is exactly what these cases rule out. The first
 * row of the table is the sentence AAP section 0.12.4 fixes for the evidence route, word for word.
 *
 * The page's own contract is checked beside it: one level-one heading and no other heading level
 * (rule B-3, since `PageHeader` is the only owner of the `h1`, and the `Card` beneath it is
 * untitled), and a working router link back to the exception queue whose accessible name and href
 * are the application's own exported constants (rule P-8). The link's appearance is the two class lists
 * `src/components/tooltip.tsx` exports, composed rather than restated, so its hover, pressed and
 * focus states are the ones the application's buttons and the not-found page share.
 *
 * The page renders inside `MemoryRouter`, which stands in for the shell's router so `useLocation`
 * and the link have the routing context they need, and it starts at the path under test so the
 * navigation table supplies the name exactly as it does in the shell. Renders under the default
 * jsdom environment; nothing here hashes, reads the clock or reaches the service layer.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

import { CONTROL_STRUCTURE_CLASSES, SECONDARY_CONTROL_CLASSES } from '../components/tooltip';
import { EXCEPTION_QUEUE_PATH } from '../types';
import type { StageNoticePageProps } from './stage-notice-page';
import {
  STAGE_NOTICE_LINK_LABEL,
  StageNoticePage,
  stageNoticeSentence,
} from './stage-notice-page';

/** The sentence AAP section 0.12.4 fixes for the evidence route, word for word. */
const EVIDENCE_SENTENCE = 'The evidence workspace arrives in stage S4.';

/** The address the evidence workspace answers at, which is USR-08's entry route. */
const EVIDENCE_PATH = '/evidence';

/** One case: a stage, a navigation label, and the sentence that label must produce. */
interface SentenceCase {
  /** The stage that owns the route the label belongs to. */
  readonly stage: StageNoticePageProps['stage'];
  /** The label the navigation table carries, verbatim. */
  readonly name: string;
  /** The sentence the page must state for it. */
  readonly sentence: string;
}

/**
 * The labels whose casing the sentence decides.
 *
 * The evidence and further-route labels are the ones the application reaches today; "FileMap
 * canvas" is the name rule P-7 fixes, and it is the case a whole-label transform misspells. The
 * other three carry no capital past their first letter, so they prove the first character is still
 * lowered and the notice reads as a sentence rather than as a title.
 */
const SENTENCE_CASES: readonly SentenceCase[] = [
  { stage: 4, name: 'Evidence workspace', sentence: EVIDENCE_SENTENCE },
  {
    stage: 4,
    name: 'FileMap canvas',
    sentence: 'The FileMap canvas workspace arrives in stage S4.',
  },
  { stage: 5, name: 'data sources', sentence: 'The data sources workspace arrives in stage S5.' },
  { stage: 4, name: 'Suppliers', sentence: 'The suppliers workspace arrives in stage S4.' },
  {
    stage: 5,
    name: 'Production plan',
    sentence: 'The production plan workspace arrives in stage S5.',
  },
];

/**
 * The names that leave the sentence without a workspace name.
 *
 * A path outside both navigation tables answers `null`, and a label that is blank answers nothing
 * once trimmed, so the sentence keeps its shape and the heading is never empty.
 */
const UNNAMED_INPUTS: readonly (string | null)[] = [null, '', '   '];

/** Renders the page for one address, inside a memory router that starts there. */
function renderPage(path: string): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <StageNoticePage stage={4} />
    </MemoryRouter>,
  );
}

describe('stageNoticeSentence', () => {
  it.each(SENTENCE_CASES)(
    'states "$sentence" for the label "$name"',
    ({ stage, name, sentence }) => {
      expect(stageNoticeSentence(stage, name)).toBe(sentence);
    },
  );

  it.each(UNNAMED_INPUTS)(
    'leaves the sentence unnamed for %j while keeping its shape',
    (name) => {
      expect(stageNoticeSentence(5, name)).toBe('The workspace on this route arrives in stage S5.');
    },
  );
});

describe('StageNoticePage', () => {
  it("renders the evidence notice as the page's only heading, at level one", () => {
    renderPage(EVIDENCE_PATH);

    const headings = screen.getAllByRole('heading');

    expect(headings).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: EVIDENCE_SENTENCE })).toBeInTheDocument();
  });

  it('offers the way back to the exception queue as a router link', () => {
    renderPage(EVIDENCE_PATH);

    const link = screen.getByRole('link', { name: STAGE_NOTICE_LINK_LABEL });

    expect(link).toHaveAttribute('href', EXCEPTION_QUEUE_PATH);
    expect(link).toHaveTextContent(STAGE_NOTICE_LINK_LABEL);
  });

  it('composes the shared control lists rather than restating the secondary appearance', () => {
    renderPage(EVIDENCE_PATH);

    const link = screen.getByRole('link', { name: STAGE_NOTICE_LINK_LABEL });
    const shared = [
      ...CONTROL_STRUCTURE_CLASSES.split(' '),
      ...SECONDARY_CONTROL_CLASSES.split(' '),
    ];

    /* The anti-drift guard: the link's shape, colours and hover and pressed states come from the two
       lists `src/components/tooltip.tsx` exports, which is also what the secondary `ActionButton`
       and the not-found page's link compose, so one token change reaches all three. */
    expect(shared.length).toBeGreaterThan(0);
    for (const utility of shared) {
      expect(link).toHaveClass(utility);
    }
  });
});
