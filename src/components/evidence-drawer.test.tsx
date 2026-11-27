/**
 * Component suite for `evidence-drawer.tsx`: the trigger every displayed figure reaches its evidence
 * through, and the drawer that evidence opens in (functional requirement F12, principle PR-6;
 * rule P-6 governs the figures it explains, and this suite types none of them).
 *
 * Every case asserts a contract the pair is relied on for rather than its markup. The trigger's
 * accessible name starts with the figure the reader sees and ends by saying what activating it does,
 * so a speech-input user can name the figure and a screen-reader user is told the control opens
 * something (WCAG 2.2 SC 2.5.3, rule B-3); it carries `aria-haspopup="dialog"` and is reached and
 * operated from the keyboard alone. Activation renders a `role="dialog"` element named by its own
 * heading and portalled out of the element that holds the trigger, because a fixed-position container
 * nested in a paragraph is markup a browser reparses. Its modality claim follows its presentation
 * (AAP §0.12.4): jsdom implements no media query at all, so every case here renders the overlay that
 * covers the viewport and claims `aria-modal`, and the one case that stubs the docked media query
 * renders the panel docked beside a page that stays readable, which claims none. The record's four
 * sections are asserted as named regions with the record's own value, formula,
 * provenance, freshness, links, confidence, missing inputs and documents inside them, and a record
 * that carries no content for a section is asserted to render no region at all rather than an empty
 * one — the drawer substitutes nothing for a field the record does not support. The instant a source
 * last answered is compared character for character, offset included, because an instant that was
 * reformatted would name a different moment from the one the stale banner and the disabled controls
 * quote (AAP §0.2.1, T-13). Focus moves into the dialog on open, `Tab` and `Shift+Tab` cycle inside
 * it in both directions, `Escape` closes it through the caller and returns focus to the triggering
 * figure, and the failure path shows the service's own message with a retry that repeats the read
 * instead of substituting a figure. The 420 px dock from the 1280 px breakpoint and the full-viewport
 * overlay below it are read from the dialog's class list and resolved there — jsdom has no layout, so
 * that case asserts the geometry the classes ask a browser for rather than a utility's spelling — and
 * the role-token surfaces are asserted the same way: no palette value, colour function or elevation
 * appears in the markup, and both themes render the same four sections.
 *
 * THE SERVICE IS MOCKED AT THE PROVIDER, the one boundary the component layer is allowed to read
 * through (rule P-2). The specifier below is exactly the one `evidence-drawer.tsx` imports, because
 * Vitest keys a mock on the resolved module rather than on a path spelling: from `src/components` the
 * drawer's own import is `../services/service-provider`. The stub is created through `vi.hoisted`
 * so it exists before that module is loaded, and with it the real provider — and through it the
 * in-browser adapter and its seeded records — is never reached in a component test. The stub member
 * is typed from the port itself (`SiteIntelligenceService['getEvidence']`), so it cannot drift from
 * the signature the drawer calls and no cast is needed anywhere in this file.
 *
 * FIXTURES ARE BUILT HERE FROM THE CONTRACT TYPES, never imported from a record. Every reference is
 * an opaque placeholder rather than a record-identifier shape and no amount appears, because the
 * `no-typed-figures` source check reads `src/components/**` for currency and identifier literals
 * (rule P-6), and the one instant is derived from the demonstration clock rather than typed, so it
 * carries the same offset every record does. The simulation label is the fixed vocabulary's own
 * member (rule P-1): the record carries it and the drawer prints it beside the value, so the label a
 * case asserts is the record's own rather than one this suite or the component chose.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default. Nothing here hashes, reads the
 * system clock or touches the network, and the only third-party module involved beyond the testing
 * libraries is the query cache the drawer reads through, supplied by the wrapper below with retries
 * off so a failing read settles in one call.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS, SOURCE_LABELS } from '../types';
import type {
  Evidence,
  Freshness,
  Problem,
  Provenance,
  Result,
  SimLabel,
  ThemeName,
} from '../types';
import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { EVIDENCE_DRAWER_TEXT as TEXT, EvidenceDrawer, EvidenceRef } from './evidence-drawer';
import { MONO_VALUE_CLASSES } from './mono-value';
import { STATE_BOUNDARY_TEXT } from './state-boundary';

/* ---------------------------------------------------------------------------------------------
 * The port, replaced
 * ------------------------------------------------------------------------------------------- */

/**
 * The port member this suite replaces, named from the port itself rather than restated here, so the
 * stub answers with exactly the envelope and the record `EvidenceDrawer` calls it for.
 */
type EvidenceRead = SiteIntelligenceService['getEvidence'];

/**
 * The one service call the drawer makes, replaced before its module is imported.
 *
 * A call that succeeds resolves the envelope below; a call that fails rejects the service's own
 * `Problem`, which is how contracts §2 has every call fail and what the drawer's failure region
 * prints. Both cases are set per test, because a read that failed once and succeeded on the retry is
 * one of the contracts being verified.
 */
const getEvidence = vi.hoisted(() => vi.fn<EvidenceRead>());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/* ---------------------------------------------------------------------------------------------
 * Fixtures — the record a read returns, and the failure it can end in
 * ------------------------------------------------------------------------------------------- */

/** Both themes of specification §4.1, as the `data-theme` values the token layer keys on. */
const THEMES: readonly ThemeName[] = ['command', 'paper'];

/** The reference the figure carries: an opaque placeholder, not a record-identifier shape. */
const REFERENCE = 'figure-under-test';

/** The figure as the screen displays it, which is also the start of the trigger's name. */
const FIGURE = 'a figure under test';

/** The rule that produced the figure, as the record states it. */
const FORMULA = 'a rule under test produced this figure';

/** One record value that fed the formula. */
const INPUT = 'an input record';

/** One record the figure depends on. */
const UPSTREAM = 'an upstream record';

/** One record that depends on the figure. */
const DOWNSTREAM = 'a downstream record';

/** One input the read could not obtain, which the drawer names rather than hides. */
const MISSING_INPUT = 'a line rate the read could not obtain';

/** One document behind the figure. */
const DOCUMENT = 'document-under-test';

/** The sentence the record gives for its confidence level. */
const CONFIDENCE_REASON = 'the records behind it were read in full';

/** The fixed §5.3 label a computed figure carries (rule P-1), never paraphrased. */
const COMPUTED_LABEL: SimLabel = 'Simulated calculation';

/** The correlation identifier every `Result` and every `Problem` of one call carries. */
const TRACE_ID = 'trace-evidence-drawer';

/** The demonstration clock's date, which the fixture's instant shares so it carries the same day. */
const CLOCK_DATE = DEMO_CLOCK.slice(0, 10);

/** The demonstration clock's offset, taken from the clock so the fixture is in the app's own zone. */
const CLOCK_OFFSET = DEMO_CLOCK.slice(-6);

/**
 * When the source behind the figure last answered: earlier the same day, in the same offset.
 *
 * Derived rather than typed, so the fixture cannot drift from the time zone the records are written
 * in, and asserted character for character below — offset included — because the drawer must print
 * the instant the service reported rather than a reformatted one.
 */
const AS_OF = `${CLOCK_DATE}T06:15:00${CLOCK_OFFSET}`;

/** One source's contribution, shaped like one entry of `Result.meta.freshness`. */
const FRESHNESS: Freshness = { source: 'erp', asOf: AS_OF, state: 'stale' };

/** A record that fills all four sections. */
const FULL_EVIDENCE: Evidence = {
  value: FIGURE,
  provenance: 'computed',
  label: COMPUTED_LABEL,
  formula: FORMULA,
  inputs: [INPUT],
  upstream: [UPSTREAM],
  downstream: [DOWNSTREAM],
  confidence: { level: 'high', reason: CONFIDENCE_REASON },
  missingInputs: [MISSING_INPUT],
  documents: [DOCUMENT],
};

/**
 * A record that fills only the two sections that are always present.
 *
 * Its value and formula are empty, its three link lists are empty, it names no missing input and no
 * document, so the drawer must render the source and judgement sections alone. Empty strings and
 * empty arrays are what the record actually carries for an absent field; the drawer is what turns
 * that into no section rather than into a heading over nothing.
 */
const SPARSE_EVIDENCE: Evidence = {
  value: '',
  provenance: 'first_party',
  label: COMPUTED_LABEL,
  formula: '',
  inputs: [],
  upstream: [],
  downstream: [],
  confidence: { level: 'low', reason: CONFIDENCE_REASON },
  missingInputs: [],
  documents: [],
};

/**
 * One entry of the label table: the provenance a record reports, and the §5.3 label it carries.
 *
 * The two are separate members because the drawer must print the label the record states rather than
 * one derived from its provenance, and a table is how an `it.each` below states both for a case.
 */
interface LabelledRecord {
  /** The provenance the record reports, as `Evidence.provenance`. */
  readonly provenance: Provenance;

  /** The exact §5.3 label the record carries, as `Evidence.label`. */
  readonly label: SimLabel;
}

/**
 * Records whose label the drawer must take from the record rather than derive from its provenance.
 *
 * The first two report the same `computed` provenance and carry different labels, so a label table
 * keyed on provenance inside the component would print one text for both and one of the two cases
 * would fail; the third is the market-intelligence reading, which answers with its own label. Each
 * label is one of the seven fixed §5.3 strings (rule P-1, AAP §0.10).
 */
const LABELLED_RECORDS: readonly LabelledRecord[] = [
  { provenance: 'computed', label: 'Simulated calculation' },
  { provenance: 'computed', label: 'Simulated recommendation' },
  { provenance: 'market_intelligence', label: 'Simulated market intelligence' },
];

/**
 * The failure a read ends in when the records hold nothing for the reference: a cause the state
 * boundary does not own, so the drawer reports it through its own failure region.
 */
const PROBLEM: Problem = {
  type: 'not-found',
  message: 'The records hold no evidence for this figure.',
  traceId: TRACE_ID,
};

/** A class list naming a palette value, a colour function or an elevation, none of which may appear. */
const PALETTE_CLASS_PATTERN = /#[0-9a-fA-F]{3,8}|rgba?\(|shadow/i;

/* ---------------------------------------------------------------------------------------------
 * The two helpers every case renders through
 * ------------------------------------------------------------------------------------------- */

/** Wraps one surface in the query cache the drawer reads through, with retries off. */
function withQueryCache(ui: ReactElement): ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

/** The envelope a successful read resolves: the record, its freshness and the simulated marker. */
function envelope(evidence: Evidence): Result<Evidence> {
  return {
    data: evidence,
    meta: { freshness: [FRESHNESS], simulated: true, traceId: TRACE_ID },
  };
}

/** Makes the next read fail with the service's own `Problem`, as contracts §2 has a call fail. */
function failWith(problem: Problem): void {
  getEvidence.mockImplementation(async () => {
    throw problem;
  });
}

/**
 * Makes `window.matchMedia` report a viewport at or above the docked breakpoint.
 *
 * jsdom implements no media query at all, so `window.matchMedia` is absent and the drawer takes its
 * overlay presentation in every other case here; this stub is what makes the docked one reachable. Its
 * `media` member repeats the query the drawer asked it about rather than carrying a second copy of
 * that text, so the stub cannot drift from the module's own query, and the queries it was asked are
 * returned so a case can state that text. It carries the remaining members `matchMedia` returns —
 * `matches`, `onchange` and both listener pairs, the deprecated pair as no-ops — and the suite's
 * `afterEach` unstubs it, so it cannot colour a case that runs after it.
 */
function stubDockedViewport(): readonly string[] {
  const queries: string[] = [];

  vi.stubGlobal('matchMedia', (query: string) => {
    queries.push(query);

    return {
      matches: true,
      media: query,
      onchange: null,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
      dispatchEvent: (): boolean => true,
    };
  });

  return queries;
}

/* ---------------------------------------------------------------------------------------------
 * The dock geometry contract
 * ------------------------------------------------------------------------------------------- */

/**
 * jsdom implements no layout: it resolves no Tailwind utility and no computed width, so the panel's
 * geometry cannot be read off a box model here. What it can read is the class list the component
 * applies, so the helpers below resolve that list into the geometry it asks a browser for — a width in
 * pixels or as the whole viewport, the vertical span, and the inline edges — and the docked case
 * asserts those resolved values instead of a utility's spelling. A restyle that keeps the geometry (an
 * equivalent length unit, a regrouped or reordered class list, an extra component class beside the
 * utilities) then leaves the case green, while a change to the geometry itself fails it.
 */

/** The breakpoints a Tailwind variant scopes a utility to, with the min-width each one opens at. */
const BREAKPOINT_MIN_WIDTHS_PX = {
  base: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/** One breakpoint of that scale. `base` is where the list's own unscoped utilities apply. */
type Breakpoint = keyof typeof BREAKPOINT_MIN_WIDTHS_PX;

/** The width AAP §0.12.4 fixes for the docked panel, which the docked case has to fail on. */
const DOCKED_WIDTH_PX = 420;

/** The root font size in a browser's default, which a `rem` length resolves against. */
const ROOT_FONT_SIZE_PX = 16;

/** The step a bare Tailwind length counts in: its `0.25rem` spacing unit. */
const SPACING_STEP_PX = 4;

/** The width one `w-*` utility asks for: a number of pixels, or the whole viewport. */
type WidthAsk = number | 'viewport';

/** One class of a class list, split into the breakpoint it is scoped to and the utility itself. */
interface ScopedUtility {
  readonly breakpoint: Breakpoint;
  readonly utility: string;
}

/** Whether a variant name is one of the breakpoints above. */
function isBreakpoint(value: string): value is Breakpoint {
  return value in BREAKPOINT_MIN_WIDTHS_PX;
}

/**
 * Splits a class list into its scoped utilities, dropping every class that has no place in that scale:
 * a non-breakpoint variant (`hover:`, `focus-visible:`) styles an interaction rather than the panel's
 * resting geometry, a stacked variant scopes to more than the scale states, and a bare component class
 * names styling the token layer owns. Ignoring them is what lets an extra component class sit beside
 * the utilities without changing what a case resolves.
 */
function scopedUtilities(classList: string): ScopedUtility[] {
  const scoped: ScopedUtility[] = [];

  for (const entry of classList.split(/\s+/)) {
    if (entry === '') {
      continue;
    }

    const [first = '', ...rest] = entry.split(':');
    if (rest.length === 0) {
      scoped.push({ breakpoint: 'base', utility: first });
      continue;
    }

    const [utility = ''] = rest;
    if (rest.length > 1 || utility === '' || !isBreakpoint(first)) {
      continue;
    }

    scoped.push({ breakpoint: first, utility });
  }

  return scoped;
}

/**
 * The utility that wins at `breakpoint` for one family of utilities, or `undefined` when the class list
 * states none there: of those in effect, the one scoped to the widest breakpoint, and the last listed
 * where two at that width both apply — the order a browser's own cascade gives them. A family the list
 * does not state stays `undefined` so the caller fails on it rather than assuming a value.
 */
function winningUtility(
  classList: string,
  breakpoint: Breakpoint,
  matches: (utility: string) => boolean,
): string | undefined {
  const width = BREAKPOINT_MIN_WIDTHS_PX[breakpoint];

  let winner: ScopedUtility | undefined;
  for (const entry of scopedUtilities(classList)) {
    const entryWidth = BREAKPOINT_MIN_WIDTHS_PX[entry.breakpoint];
    if (!matches(entry.utility) || entryWidth > width) {
      continue;
    }
    if (winner === undefined || entryWidth >= BREAKPOINT_MIN_WIDTHS_PX[winner.breakpoint]) {
      winner = entry;
    }
  }

  return winner?.utility;
}

/**
 * Resolves the value of one `w-*` utility to the width a browser would apply: `full` and `screen` both
 * mean the whole viewport for a panel laid over the page, `[<n>px]` and `[<n>rem]` are the absolute
 * lengths one width can be stated in, and a bare number is a step of Tailwind's spacing scale. Anything
 * else — `auto`, `min`, a fraction, a keyword this suite cannot resolve — is `undefined`, so an
 * unfamiliar width fails the case instead of passing it unread.
 */
function resolveWidthValue(value: string): WidthAsk | undefined {
  if (value === 'full' || value === 'screen') {
    return 'viewport';
  }

  const arbitrary = /^\[(\d+(?:\.\d+)?)(px|rem)\]$/.exec(value);
  if (arbitrary !== null) {
    const [, magnitude = '0', unit = 'px'] = arbitrary;
    return Number(magnitude) * (unit === 'rem' ? ROOT_FONT_SIZE_PX : 1);
  }

  if (/^\d+$/.test(value)) {
    return Number(value) * SPACING_STEP_PX;
  }

  return undefined;
}

/** The panel's width at one breakpoint, resolved from the width utilities in effect there. */
function dockWidthAt(classList: string, breakpoint: Breakpoint): WidthAsk | undefined {
  const utility = winningUtility(classList, breakpoint, (entry) => entry.startsWith('w-'));
  return utility === undefined ? undefined : resolveWidthValue(utility.slice('w-'.length));
}

/** The breakpoints at which the class list states a width utility at all, narrowest first. */
function widthBreakpoints(classList: string): Breakpoint[] {
  const stated = new Set<Breakpoint>();

  for (const entry of scopedUtilities(classList)) {
    if (entry.utility.startsWith('w-')) {
      stated.add(entry.breakpoint);
    }
  }

  return [...stated].sort(
    (left, right) => BREAKPOINT_MIN_WIDTHS_PX[left] - BREAKPOINT_MIN_WIDTHS_PX[right],
  );
}

/**
 * Whether the panel asks to span the viewport vertically at `breakpoint`: `inset-y-0` or `inset-0`, or
 * a zero `top` and a zero `bottom` together. Those are Tailwind's spellings for "no inset above or
 * below", which is what makes the overlay cover the viewport rather than sit at a height of its own.
 */
function spansViewportVertically(classList: string, breakpoint: Breakpoint): boolean {
  const winning = (family: string): string | undefined =>
    winningUtility(classList, breakpoint, (entry) => entry.startsWith(`${family}-`));

  return (
    winning('inset-y') === 'inset-y-0' ||
    winning('inset') === 'inset-0' ||
    (winning('top') === 'top-0' && winning('bottom') === 'bottom-0')
  );
}

/**
 * The inline edges the panel asks for at `breakpoint`, each as the value its utility states, and
 * `undefined` where the list states none. The logical pair is read with its physical equivalents
 * accepted, because `end-0` and `right-0` both stop the panel at the inline end and `start-auto` and
 * `left-auto` both release it from the inline start.
 */
function inlineEdgesAt(
  classList: string,
  breakpoint: Breakpoint,
): { readonly start: string | undefined; readonly end: string | undefined } {
  const edge = (families: readonly string[]): string | undefined => {
    const utility = winningUtility(classList, breakpoint, (entry) =>
      families.some((family) => entry.startsWith(`${family}-`)),
    );

    return utility === undefined ? undefined : utility.slice(utility.indexOf('-') + 1);
  };

  return { start: edge(['start', 'left']), end: edge(['end', 'right']) };
}

/**
 * Every case starts from a read that succeeds with the full record and from no theme attribute, so
 * a case that fails a call or sets a theme states that itself and leaves nothing behind for the
 * next one. The resolved value is set here rather than at module scope because `restoreMocks` resets
 * every mock's implementation between cases.
 */
beforeEach(() => {
  getEvidence.mockResolvedValue(envelope(FULL_EVIDENCE));
});

/**
 * Takes the theme attribute off `<html>` again, so one theme case cannot colour the next, and removes
 * any stubbed global — the docked case's `matchMedia` — so it cannot colour a case either.
 */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  vi.unstubAllGlobals();
});

describe('EvidenceRef', () => {
  it('names the trigger with the visible figure and says what activating it opens', () => {
    render(withQueryCache(<EvidenceRef ref={REFERENCE}>{FIGURE}</EvidenceRef>));

    const trigger = screen.getByRole('button');

    /* The visible value comes first, so a speech-input user can still name the figure they point at
       (SC 2.5.3), and the hidden completion of the name says what the control does. */
    expect(trigger).toHaveAccessibleName(new RegExp(`^${FIGURE}`));
    expect(trigger).toHaveAccessibleName(new RegExp(`${TEXT.openSuffix}$`));
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    /* The relationship to the dialog is exposed exactly while the dialog exists. */
    expect(trigger).not.toHaveAttribute('aria-controls');
  });

  it('opens a modal dialog named by its own heading from the keyboard alone', async () => {
    const user = userEvent.setup();
    const { container } = render(
      withQueryCache(<EvidenceRef ref={REFERENCE}>{FIGURE}</EvidenceRef>),
    );
    const trigger = screen.getByRole('button');

    await user.tab();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');

    const dialog = await screen.findByRole('dialog', { name: TEXT.title });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-controls', dialog.id);
    /* Portalled out of the calling cell, so a fixed-position container never lands inside a
       paragraph or a table cell that a browser would reparse. */
    expect(container.contains(dialog)).toBe(false);
    expect(await screen.findByText(FORMULA)).toBeVisible();
  });

  it('asks the port for the reference the figure carries, once', async () => {
    render(withQueryCache(<EvidenceRef ref={REFERENCE}>{FIGURE}</EvidenceRef>));

    await userEvent.setup().click(screen.getByRole('button'));

    expect(await screen.findByRole('dialog', { name: TEXT.title })).toBeVisible();
    expect(getEvidence).toHaveBeenCalledTimes(1);
    expect(getEvidence).toHaveBeenCalledWith(REFERENCE);
  });

  it('closes on Escape and returns focus to the triggering figure', async () => {
    const user = userEvent.setup();
    render(withQueryCache(<EvidenceRef ref={REFERENCE}>{FIGURE}</EvidenceRef>));
    const trigger = screen.getByRole('button');

    await user.tab();
    await user.keyboard('{Enter}');
    await screen.findByRole('dialog', { name: TEXT.title });
    await screen.findByText(FORMULA);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    /* Focus return is the half of the contract a visual check cannot see: a modal that closed and
       left focus on the body would drop a keyboard user at the top of the page. */
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('EvidenceDrawer', () => {
  /** Renders the drawer directly, as a screen that owns the open flag would. */
  function renderDrawer(onClose: () => void = () => undefined): void {
    render(withQueryCache(<EvidenceDrawer evidenceRef={REFERENCE} onClose={onClose} />));
  }

  it("renders the record's four sections with the record's own content", async () => {
    renderDrawer();

    await screen.findByText(FORMULA);

    const value = screen.getByRole('region', { name: TEXT.valueSection });
    const source = screen.getByRole('region', { name: TEXT.sourceSection });
    const links = screen.getByRole('region', { name: TEXT.linksSection });
    const judgement = screen.getByRole('region', { name: TEXT.judgementSection });

    expect(screen.getAllByRole('region')).toHaveLength(4);

    expect(within(value).getByText(FIGURE)).toBeVisible();
    expect(within(value).getByText(FORMULA)).toBeVisible();

    expect(within(source).getByText(REFERENCE)).toBeVisible();
    expect(within(source).getByText(FULL_EVIDENCE.provenance)).toBeVisible();
    expect(within(source).getByText(SOURCE_LABELS[FRESHNESS.source])).toBeVisible();
    expect(within(source).getByText(FRESHNESS.state)).toBeVisible();

    expect(within(links).getByText(TEXT.inputsLabel)).toBeVisible();
    expect(within(links).getByText(INPUT)).toBeVisible();
    expect(within(links).getByText(TEXT.upstreamLabel)).toBeVisible();
    expect(within(links).getByText(UPSTREAM)).toBeVisible();
    expect(within(links).getByText(TEXT.downstreamLabel)).toBeVisible();
    expect(within(links).getByText(DOWNSTREAM)).toBeVisible();

    expect(within(judgement).getByText(FULL_EVIDENCE.confidence.level)).toBeVisible();
    expect(within(judgement).getByText(CONFIDENCE_REASON)).toBeVisible();
    expect(within(judgement).getByText(TEXT.missingInputsLabel)).toBeVisible();
    expect(within(judgement).getByText(MISSING_INPUT)).toBeVisible();
    expect(within(judgement).getByText(TEXT.documentsLabel)).toBeVisible();
    expect(within(judgement).getByText(DOCUMENT)).toBeVisible();
  });

  it("prints the record's own §5.3 label beside the value it belongs to", async () => {
    renderDrawer();

    const value = await screen.findByRole('region', { name: TEXT.valueSection });
    const label = within(value).getByText(FULL_EVIDENCE.label);

    /* The drawer carries the figure it was opened for, so it states that figure's exact label
       (rule P-1) rather than leaving the one place a reader inspects a figure unlabelled. */
    expect(label).toBeVisible();
    expect(label.textContent).toBe(FULL_EVIDENCE.label);
    expect(SIM_LABELS).toContain(FULL_EVIDENCE.label);
    /* The raw provenance token is what the source section reports; it never stands in for the label. */
    expect(within(value).queryByText(FULL_EVIDENCE.provenance)).toBeNull();
  });

  it.each(LABELLED_RECORDS)(
    "shows the label a $provenance record carries rather than one derived from its provenance",
    async ({ provenance, label }) => {
      getEvidence.mockResolvedValue(envelope({ ...FULL_EVIDENCE, provenance, label }));
      renderDrawer();

      const value = await screen.findByRole('region', { name: TEXT.valueSection });

      expect(within(value).getByText(label)).toBeVisible();
    },
  );

  it('prints the instant a source last answered character for character, offset included', async () => {
    renderDrawer();

    const source = await screen.findByRole('region', { name: TEXT.sourceSection });
    const asOf = within(source).getByText(AS_OF);

    expect(asOf.textContent).toBe(AS_OF);
    /* The instant is a `MonoValue` timestamp, so it carries that component's whole base token — the
       mono face and the tabular numerals AAP §0.5.3 fixes — named from the module that owns it rather
       than respelled here, so a restyle of the token reaches this case instead of breaking it. */
    expect(asOf).toHaveClass(...MONO_VALUE_CLASSES.base.split(' '));
    /* A reformatted instant would name a different moment from the one the stale banner and the
       disabled approval controls quote, so a locale rendering is a defect rather than a style. */
    expect(asOf.textContent).not.toMatch(/GMT|UTC|CET|CEST/);
  });

  it('omits a section whose record carries no content for it', async () => {
    getEvidence.mockResolvedValue(envelope(SPARSE_EVIDENCE));
    renderDrawer();

    const source = await screen.findByRole('region', { name: TEXT.sourceSection });
    const judgement = screen.getByRole('region', { name: TEXT.judgementSection });

    /* The record's provenance and confidence are always reported, so those two sections stand. */
    expect(within(source).getByText(SPARSE_EVIDENCE.provenance)).toBeVisible();
    expect(within(judgement).getByText(SPARSE_EVIDENCE.confidence.level)).toBeVisible();

    /* Nothing is rendered for a field the record does not carry — no heading over an empty body,
       and no empty region standing in for the value section or the link lists. */
    expect(screen.queryByRole('region', { name: TEXT.valueSection })).toBeNull();
    expect(screen.queryByRole('region', { name: TEXT.linksSection })).toBeNull();
    expect(screen.queryByText(TEXT.missingInputsLabel)).toBeNull();
    expect(screen.queryByText(TEXT.documentsLabel)).toBeNull();
    expect(screen.getAllByRole('region')).toHaveLength(2);
  });

  it('moves focus into the dialog and keeps Tab inside it', async () => {
    const user = userEvent.setup();
    renderDrawer();

    const dialog = await screen.findByRole('dialog', { name: TEXT.title });

    expect(dialog).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);

    /* Four moves is more than the drawer has stops, so the assertion covers the wrap back to the
       first control as well as every step in between. */
    for (let step = 1; step <= 4; step += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement), `Tab ${step} left the dialog`).toBe(true);
    }
  });

  it('wraps Shift+Tab from the first control to the last, and Tab back again', async () => {
    const user = userEvent.setup();
    failWith(PROBLEM);
    renderDrawer();

    /* The failure region is the variant with two stops — its close control and its retry — so the
       wrap is observable in both directions rather than against a single control. */
    const retry = await screen.findByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel });
    const close = screen.getByRole('button', { name: TEXT.closeLabel });

    close.focus();
    await user.tab({ shift: true });
    expect(retry).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();
  });

  it('calls onClose on Escape and never closes itself', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDrawer(onClose);

    await screen.findByRole('dialog', { name: TEXT.title });
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    /* The component that mounted the drawer owns the open flag, so a standalone drawer that called
       onClose keeps rendering until its caller unmounts it. */
    expect(screen.getByRole('dialog', { name: TEXT.title })).toBeVisible();
  });

  it('closes from the close control and returns focus to the element that opened it', async () => {
    const user = userEvent.setup();
    render(withQueryCache(<EvidenceRef ref={REFERENCE}>{FIGURE}</EvidenceRef>));
    const trigger = screen.getByRole('button');

    await user.click(trigger);
    await screen.findByRole('dialog', { name: TEXT.title });

    await user.click(screen.getByRole('button', { name: TEXT.closeLabel }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(trigger).toHaveFocus();
  });

  it("shows the service's own message when the read fails, and repeats the read on retry", async () => {
    const user = userEvent.setup();
    failWith(PROBLEM);
    renderDrawer();

    await screen.findByText(TEXT.failureHeadline);

    const region = screen.getByRole('status');

    expect(within(region).getByText(TEXT.failureHeadline)).toBeVisible();
    expect(within(region).getByText(PROBLEM.message)).toBeVisible();
    expect(within(region).getByText(TRACE_ID)).toBeVisible();
    expect(getEvidence).toHaveBeenCalledTimes(1);
    /* A failed read substitutes no figure: the sections the record would fill are absent. */
    expect(screen.queryByRole('region', { name: TEXT.valueSection })).toBeNull();

    getEvidence.mockResolvedValueOnce(envelope(FULL_EVIDENCE));
    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }));

    expect(await screen.findByText(FORMULA)).toBeVisible();
    expect(getEvidence).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(TEXT.failureHeadline)).toBeNull();
  });

  it('docks at 420 px from the 1280 px breakpoint and covers the viewport below it', async () => {
    renderDrawer();

    const dialog = await screen.findByRole('dialog', { name: TEXT.title });
    const classes = dialog.className;

    /* Below the breakpoint the drawer is the overlay the plan requires: it covers the viewport, so it
       is the full viewport wide and inset from top and bottom, with no sliver of page beside it. From
       Tailwind's `xl` (1280 px) up it is docked 420 px against the inline end, which AAP §0.12.4
       fixes. jsdom has no layout, so the geometry is read from the class list the component applies
       and resolved there — lengths in px or rem, `full` as the viewport — rather than compared to a
       utility's spelling. */
    for (const below of ['base', 'sm', 'md', 'lg'] as const) {
      expect(dockWidthAt(classes, below), `the width at ${below}`).toBe('viewport');
      expect(spansViewportVertically(classes, below), `the vertical span at ${below}`).toBe(true);
    }

    /* One width from the docked breakpoint up, and it is AAP §0.12.4's 420 px: any other width, in any
       unit, fails here. */
    expect(dockWidthAt(classes, 'xl')).toBe(DOCKED_WIDTH_PX);
    expect(dockWidthAt(classes, '2xl')).toBe(DOCKED_WIDTH_PX);

    /* The two shapes the plan fixes and nothing between them: a width utility scoped to `sm`, `md`,
       `lg` or `2xl` would give the panel a third width where it should have none. */
    expect(widthBreakpoints(classes)).toEqual(['base', 'xl']);

    /* Docked means anchored to the inline end rather than the inline start: below the breakpoint the
       panel starts at the inline start, and from `xl` up it is released there and stopped at the end,
       which is the edge it is 420 px wide against. */
    expect(inlineEdgesAt(classes, 'base').start).toBe('0');
    expect(inlineEdgesAt(classes, 'base').end).toBeUndefined();
    expect(inlineEdgesAt(classes, 'xl').start).toBe('auto');
    expect(inlineEdgesAt(classes, 'xl').end).toBe('0');
  });

  /* The dock case reads the geometry instead of its spelling, so the reading is pinned to both halves
     of what that buys: the same 420 px written in another unit, in another order or beside a component
     class resolves alike, and any other width resolves to itself so the docked assertion can fail on
     it. A width the reader cannot resolve is reported, never silently accepted. */
  it('resolves the docked width from the length a class states, not from the utility spelling it', () => {
    const dockedAt = (docked: string): WidthAsk | undefined => dockWidthAt(`w-full ${docked}`, 'xl');

    expect(dockedAt('xl:w-[420px]')).toBe(DOCKED_WIDTH_PX);
    expect(dockedAt('xl:w-[26.25rem]')).toBe(DOCKED_WIDTH_PX);
    expect(dockedAt('xl:w-105')).toBe(DOCKED_WIDTH_PX);
    expect(dockedAt('xl:w-[400px]')).toBe(400);
    expect(dockedAt('xl:w-[400px]')).not.toBe(DOCKED_WIDTH_PX);

    /* Regrouped, reordered and with a component class beside the utilities: the resolution is the
       same, because none of that changes the width any breakpoint applies. */
    expect(dockWidthAt('drawer-panel xl:w-[26.25rem]  w-full', 'lg')).toBe('viewport');
    expect(dockWidthAt('drawer-panel xl:w-[26.25rem]  w-full', 'xl')).toBe(DOCKED_WIDTH_PX);

    expect(dockedAt('xl:w-auto')).toBeUndefined();
  });

  it('claims no modality for the docked panel and keeps its role, name, focus and Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const queries = stubDockedViewport();
    renderDrawer(onClose);

    const dialog = await screen.findByRole('dialog', { name: TEXT.title });

    /* The query is stated in the unit the class list's `xl:` variants resolve against — Tailwind's
       `80rem` — so the modality claim and the panel's shape break at the same font-relative width. A
       pixel query would part company with those classes at any default font size but 16 px. */
    expect(queries.length).toBeGreaterThan(0);
    expect([...new Set(queries)]).toEqual(['(min-width: 80rem)']);

    /* At the docked breakpoint the panel sits inside a host that takes no pointer events, so the
       page beside it stays readable and operable. The attribute is absent — not `"false"`, which
       would still make a modality distinction — so nothing tells assistive technology that the
       rest of the page is inert (AAP §0.12.4, rule B-3). */
    expect(dialog).not.toHaveAttribute('aria-modal');

    /* The docked presentation keeps everything the keyboard contract rests on: the dialog takes focus
       on open, Tab stays inside it, and Escape releases it through the caller. */
    expect(dialog).toHaveFocus();
    for (let step = 1; step <= 4; step += 1) {
      await user.tab();
      expect(dialog.contains(document.activeElement), `Tab ${step} left the dialog`).toBe(true);
    }

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it.each(THEMES)('renders the same four sections under the %s theme', async (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    renderDrawer();

    const dialog = await screen.findByRole('dialog', { name: TEXT.title });

    expect(document.documentElement).toHaveAttribute('data-theme', theme);
    /* The read is awaited, so the four sections are counted once the record has replaced the
       skeleton rather than while the call is still pending. */
    await screen.findByRole('region', { name: TEXT.valueSection });
    expect(screen.getAllByRole('region')).toHaveLength(4);
    /* Both themes resolve the same role tokens, so a palette value, a colour function or an
       elevation in the markup would be a component colouring itself rather than a token. */
    expect(dialog.className).not.toMatch(PALETTE_CLASS_PATTERN);
  });

  it("says the read stopped when the failure carries no shape the service defines, and repeats the read on retry", async () => {
    const user = userEvent.setup();
    /* A rejection that carries none of the members a `Problem` has: a defect in the read rather than
       a refusal the service shaped. `asProblem` answers `null` for it, so the drawer has no cause,
       no permission, no roles and no trace id to print — and must still say what happened rather
       than leave the dialog's header and close control over an empty body. */
    getEvidence.mockImplementation(async () => {
      throw new Error('the read ended for a reason it did not describe');
    });
    renderDrawer();

    /* The region is waited for by its own sentence: while the call is pending the boundary shows a
       busy region of its own, so the failure is what the status role is read from once it arrives. */
    await screen.findByText(TEXT.unreportedFailure);

    const region = screen.getByRole('status');

    expect(within(region).getByText(TEXT.failureHeadline)).toBeVisible();
    expect(within(region).getByText(TEXT.unreportedFailure)).toBeVisible();
    /* Nothing is fabricated for a failure that reported nothing: no trace label over no identifier,
       no borrowed trace id, and no `Problem` message the read never raised (rule P-6). */
    expect(within(region).queryByText(TEXT.traceLabel)).toBeNull();
    expect(within(region).queryByText(TRACE_ID)).toBeNull();
    expect(screen.queryByText(PROBLEM.message)).toBeNull();
    expect(getEvidence).toHaveBeenCalledTimes(1);
    /* A failed read substitutes no figure: the sections the record would fill are absent. */
    expect(screen.queryByRole('region', { name: TEXT.valueSection })).toBeNull();

    /* The control that exists acts (rule P-8): activating it repeats the read, and the record's four
       sections replace the failure region once the retry answers. */
    getEvidence.mockResolvedValueOnce(envelope(FULL_EVIDENCE));
    await user.click(screen.getByRole('button', { name: STATE_BOUNDARY_TEXT.retryLabel }));

    expect(await screen.findByText(FORMULA)).toBeVisible();
    expect(getEvidence).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(TEXT.unreportedFailure)).toBeNull();
    expect(screen.getAllByRole('region')).toHaveLength(4);
  });
});
