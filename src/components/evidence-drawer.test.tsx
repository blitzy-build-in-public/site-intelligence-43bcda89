/**
 * Component suite for `evidence-drawer.tsx`: the trigger every displayed figure reaches its evidence
 * through, and the modal drawer that evidence opens in (functional requirement F12, principle PR-6;
 * rule P-6 governs the figures it explains, and this suite types none of them).
 *
 * Every case asserts a contract the pair is relied on for rather than its markup. The trigger's
 * accessible name starts with the figure the reader sees and ends by saying what activating it does,
 * so a speech-input user can name the figure and a screen-reader user is told the control opens
 * something (WCAG 2.2 SC 2.5.3, rule B-3); it carries `aria-haspopup="dialog"` and is reached and
 * operated from the keyboard alone. Activation renders a `role="dialog"` element marked
 * `aria-modal`, named by its own heading and portalled out of the element that holds the trigger,
 * because a fixed-position container nested in a paragraph is markup a browser reparses. The
 * record's four sections are asserted as named regions with the record's own value, formula,
 * provenance, freshness, links, confidence, missing inputs and documents inside them, and a record
 * that carries no content for a section is asserted to render no region at all rather than an empty
 * one — the drawer substitutes nothing for a field the record does not support. The instant a source
 * last answered is compared character for character, offset included, because an instant that was
 * reformatted would name a different moment from the one the stale banner and the disabled controls
 * quote (AAP §0.2.1, T-13). Focus moves into the dialog on open, `Tab` and `Shift+Tab` cycle inside
 * it in both directions, `Escape` closes it through the caller and returns focus to the triggering
 * figure, and the failure path shows the service's own message with a retry that repeats the read
 * instead of substituting a figure. The 420 px dock from the 1280 px breakpoint and the full-viewport
 * overlay below it are asserted on the dialog's class list, as are the role-token surfaces: no
 * palette value, colour function or elevation appears in the markup, and both themes render the same
 * four sections.
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
 * member (rule P-1): the record carries it and the drawer deliberately does not print it, because
 * the figure that opened the drawer already carries its label where the figure is displayed.
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

import { DEMO_CLOCK, SOURCE_LABELS } from '../types';
import type { Evidence, Freshness, Problem, Result, SimLabel, ThemeName } from '../types';
import type { SiteIntelligenceService } from '../services/site-intelligence-service';
import { EVIDENCE_DRAWER_TEXT as TEXT, EvidenceDrawer, EvidenceRef } from './evidence-drawer';
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
 * Every case starts from a read that succeeds with the full record and from no theme attribute, so
 * a case that fails a call or sets a theme states that itself and leaves nothing behind for the
 * next one. The resolved value is set here rather than at module scope because `restoreMocks` resets
 * every mock's implementation between cases.
 */
beforeEach(() => {
  getEvidence.mockResolvedValue(envelope(FULL_EVIDENCE));
});

/** Takes the theme attribute off `<html>` again, so one theme case cannot colour the next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('EvidenceRef', () => {
  it('names the trigger with the visible figure and says what activating it opens', () => {
    render(withQueryCache(<EvidenceRef evidenceRef={REFERENCE}>{FIGURE}</EvidenceRef>));

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
      withQueryCache(<EvidenceRef evidenceRef={REFERENCE}>{FIGURE}</EvidenceRef>),
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
    render(withQueryCache(<EvidenceRef evidenceRef={REFERENCE}>{FIGURE}</EvidenceRef>));

    await userEvent.setup().click(screen.getByRole('button'));

    expect(await screen.findByRole('dialog', { name: TEXT.title })).toBeVisible();
    expect(getEvidence).toHaveBeenCalledTimes(1);
    expect(getEvidence).toHaveBeenCalledWith(REFERENCE);
  });

  it('closes on Escape and returns focus to the triggering figure', async () => {
    const user = userEvent.setup();
    render(withQueryCache(<EvidenceRef evidenceRef={REFERENCE}>{FIGURE}</EvidenceRef>));
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

  it('prints the instant a source last answered character for character, offset included', async () => {
    renderDrawer();

    const source = await screen.findByRole('region', { name: TEXT.sourceSection });
    const asOf = within(source).getByText(AS_OF);

    expect(asOf.textContent).toBe(AS_OF);
    expect(asOf).toHaveClass('font-mono');
    expect(asOf).toHaveClass('tabular-nums');
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
    render(withQueryCache(<EvidenceRef evidenceRef={REFERENCE}>{FIGURE}</EvidenceRef>));
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

    /* Below the breakpoint the drawer is the overlay the plan requires; from Tailwind's `xl`
       (1280 px) up it is docked 420 px against the inline end, which AAP §0.12.4 fixes. */
    expect(dialog).toHaveClass('w-full');
    expect(dialog).toHaveClass('inset-y-0');
    expect(dialog).toHaveClass('xl:w-[420px]');
    expect(dialog).toHaveClass('xl:end-0');
    expect(dialog).toHaveClass('xl:start-auto');
    expect(dialog.className).not.toMatch(/\b(?:sm|md|lg|2xl):w-/);
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
});
