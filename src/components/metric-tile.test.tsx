/**
 * Component suite for `metric-tile.tsx`, the tile the overview and the FileMap canvas ribbon show a
 * computed figure in.
 *
 * Every case asserts a duty the tile exists for rather than its markup: the caller's caption as the
 * card's own heading; the figure inside the evidence trigger; the trigger's accessible name starting
 * with the figure a sighted reader sees (WCAG 2.2 SC 2.5.3); the caller's §5.3 label painted as text
 * beside its status icon — whichever of the seven fixed strings arrives, so the tile labels its own
 * figure rather than leaning on the demonstration badge (rule P-1, AAP §0.10); the evidence dialog
 * opening from the trigger, by pointer and by keyboard, on the reference the tile was given; the
 * qualifier that appears only when the caller supplies one; the value routed through the module's
 * presentation rules when the caller names a `kind` — grouped and code-labelled by the money rule for
 * an amount, presented as whole hours by the duration rule for a duration, and the raw figure
 * otherwise; one control and no second; no elevation, since the token layer exposes no
 * shadow; and both themes rendering the same three lines.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary a component is allowed to read
 * through (rule P-2), so no adapter, seed module or seeded record is involved and the suite observes
 * exactly the read the trigger causes. Every string below is the caller's own caption, an opaque
 * placeholder or the one §5.3 label read from `SIM_LABELS`: no figure, amount or record identifier is
 * typed here (rule P-6), and the label is never retyped, so a reworded §5.3 string cannot leave this
 * suite asserting text the interface no longer shows (rule P-1).
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock or touches the network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS } from '../types';
import type { Evidence, Result, SimLabel } from '../types';
import { MetricTile } from './metric-tile';
import { formatHours } from './mono-value';
import type { FigureFormat } from './mono-value';

/**
 * The port member the evidence drawer reads through, replaced before the component under test is
 * imported so the real provider — and with it the in-browser adapter — is never reached from a
 * component test (rule P-2).
 */
const getEvidence = vi.hoisted(() => vi.fn());

vi.mock('../services/service-provider', () => ({
  useService: () => ({ getEvidence }),
}));

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/**
 * One of the seven fixed §5.3 labels, read from `SIM_LABELS` rather than retyped, so this suite can
 * never assert a string the interface does not carry. Index 1 is the label a computed figure takes and
 * index 0 the label a record shipped with the dataset carries, which are the two the tile is shown
 * with here.
 */
function simLabelAt(index: number): SimLabel {
  const label = SIM_LABELS[index];
  if (label === undefined) {
    throw new Error(`no fixed label is defined at index ${index}`);
  }
  return label;
}

/** The label the caller hands the tile for a computed figure. */
const SIM_LABEL = simLabelAt(1);

/** The tile's caption, supplied by the screen that owns the wording. */
const LABEL = 'Open exceptions by plant';

/** The qualifier a caller may add beneath the figure. */
const HINT = 'across every plant in scope';

/** The figure as the service computed it: a plain count, so no formatting rule is involved. */
const COUNT = 42;

/**
 * A generic amount, shaped like a contract amount — one digit group and one decimal — so the money
 * rule has a group separator to place and a decimal separator to convert. It belongs to no record.
 */
const AMOUNT = 1234.5;

/**
 * A duration as an aggregate measures it: a fraction of an hour that no reader can scan, shaped like
 * the median the overview computes. It belongs to no record.
 */
const FRACTIONAL_HOURS = 26.666666666666668;

/** The reference the figure carries, an opaque placeholder rather than a record-identifier shape. */
const EVIDENCE_REF = 'evidence-under-test';

/** An identifier-shaped value, used only to prove a named `kind` reaches the mono formatter. */
const IDENTIFIER = 'node-under-test';

/** A record the drawer can render in full, so the dialog opens on real content rather than a failure. */
const EVIDENCE: Evidence = {
  value: 'a figure the drawer prints',
  provenance: 'computed',
  label: SIM_LABEL,
  formula: 'the count of one thing in another',
  inputs: ['input alpha'],
  upstream: ['upstream alpha'],
  downstream: ['downstream alpha'],
  confidence: { level: 'high', reason: 'every input was read in full' },
  missingInputs: [],
  documents: ['document-alpha'],
};

/**
 * The response the port returns: a payload with the metadata every call carries, including the
 * literal `simulated` marker the `Result` type requires and the six sources' freshness.
 */
const EVIDENCE_RESULT: Result<Evidence> = {
  data: EVIDENCE,
  meta: {
    freshness: [{ source: 'erp', asOf: DEMO_CLOCK, state: 'fresh' }],
    simulated: true,
    traceId: 'trace-under-test',
  },
};

/**
 * Renders the tile inside a query cache of its own.
 *
 * The drawer reads through `useQuery`, so a cache is part of the tile's real environment; a fresh one
 * per render keeps retries and cached evidence out of the next case.
 */
function renderTile(element: ReactElement): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

/** The props a case varies. An optional prop left off stays absent rather than becoming `undefined`. */
interface TileOverrides {
  readonly hint?: string;
  readonly kind?: FigureFormat;
  readonly value?: string | number;
  readonly simLabel?: SimLabel;
}

/**
 * The tile the caller renders, with the props a case does not vary left out entirely.
 *
 * The figure defaults to the plain count, and to the identifier-shaped value when a case names a
 * `kind`, so that the mono rule has a string to set rather than a number it would leave alone.
 */
function tileElement(overrides: TileOverrides = {}): ReactElement {
  const value = overrides.value ?? (overrides.kind === undefined ? COUNT : IDENTIFIER);

  return (
    <MetricTile
      label={LABEL}
      value={value}
      evidenceRef={EVIDENCE_REF}
      simLabel={overrides.simLabel ?? SIM_LABEL}
      {...(overrides.hint === undefined ? {} : { hint: overrides.hint })}
      {...(overrides.kind === undefined ? {} : { kind: overrides.kind })}
    />
  );
}

/** The card the tile renders, named by the caption the caller gave it. */
function tileRegion(): HTMLElement {
  return screen.getByRole('region', { name: LABEL });
}

/** The one evidence trigger, which is also the tile's only control, whichever figure it wraps. */
function evidenceTrigger(): HTMLElement {
  return within(tileRegion()).getByRole('button');
}

/**
 * Escapes a string for use inside a regular expression, so an assertion on text that carries a full
 * stop, a digit group separator or a hyphen compares the characters rather than a pattern.
 */
function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * The shape the one money formatter prints, stated without pinning any amount: digit groups separated
 * by a full stop, a decimal comma, and the currency code after the amount (AAP §0.5.3). The separator
 * before the code is written here as a plain space because the query's normaliser collapses
 * whitespace, while the formatter emits a no-break space in that position.
 */
const MONEY_SHAPE = /^-?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})? EUR$/u;

/**
 * The figure as a sighted reader sees it inside the trigger: everything the trigger paints except
 * the icon and the visually hidden completion of its accessible name.
 */
function visibleFigure(element: HTMLElement): string {
  const copy = element.cloneNode(true);
  if (!(copy instanceof HTMLElement)) {
    throw new Error('the trigger could not be copied for its visible text');
  }
  for (const hidden of Array.from(copy.querySelectorAll('.sr-only, svg'))) {
    hidden.remove();
  }
  return (copy.textContent ?? '').trim();
}

beforeEach(() => {
  getEvidence.mockResolvedValue(EVIDENCE_RESULT);
});

/** Leaves `<html>` on the default theme, and the port unconfigured, for whichever suite runs next. */
afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
  getEvidence.mockReset();
});

describe('MetricTile', () => {
  it('names the tile from its caption, which is the card heading', () => {
    renderTile(tileElement());

    const region = tileRegion();
    expect(within(region).getByRole('heading', { level: 2, name: LABEL })).toBeVisible();
    // Specification §4.3 exposes no shadow token, so no tile can add elevation of its own.
    expect(region.className).not.toMatch(/\bshadow-/);
  });

  it('renders the figure inside the evidence trigger, in the tile value step', () => {
    renderTile(tileElement());

    const figure = evidenceTrigger();
    expect(within(figure).getByText(String(COUNT))).toBeVisible();
    // The 28 px step and the primary role sit on the wrapper the trigger keeps its figure in.
    expect(figure.parentElement).toHaveClass('text-28', 'text-text-primary');
    // One control and no second: the tile adds no focus stop of its own beyond the trigger (B-3).
    expect(within(tileRegion()).getAllByRole('button')).toHaveLength(1);
  });

  it('starts the trigger accessible name with the figure a reader sees', () => {
    renderTile(tileElement());

    const figure = evidenceTrigger();
    const visible = visibleFigure(figure);

    expect(visible).toBe(String(COUNT));
    expect(figure).toHaveAccessibleName(new RegExp(escapeForPattern(visible)));
  });

  it('paints the supplied label as text beside its status icon', () => {
    renderTile(tileElement());

    const label = within(tileRegion()).getByText(SIM_LABEL);
    expect(label).toBeVisible();
    // The label is text, never colour alone, and the icon sits beside it in the same row (rule B-3).
    const row = label.parentElement;
    expect(row).not.toBeNull();
    expect(row?.querySelector('svg')).not.toBeNull();
  });

  /*
   * The tile paints the label it is handed and no other, whichever of the seven fixed strings that is:
   * a computed figure and a scenario shipped as a seed record do not carry the same one (AAP §0.10),
   * so a string baked into the component would be wrong for one of them. Both members are read from
   * `SIM_LABELS`, and each case also proves the member it did not receive is absent from the tile.
   */
  it.each([
    { index: 1, otherIndex: 0, reading: 'a computed figure' },
    { index: 0, otherIndex: 1, reading: 'a record shipped with the dataset' },
  ])('paints the fixed label it is handed for $reading', ({ index, otherIndex }) => {
    const label = simLabelAt(index);
    const other = simLabelAt(otherIndex);
    renderTile(tileElement({ simLabel: label }));

    const region = tileRegion();
    expect(within(region).getByText(label)).toBeVisible();
    expect(within(region).queryByText(other)).toBeNull();
  });

  it('opens the evidence dialog from the trigger, on the reference the tile was given', async () => {
    const user = userEvent.setup();
    renderTile(tileElement());

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(evidenceTrigger());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(getEvidence).toHaveBeenCalledTimes(1);
    expect(getEvidence).toHaveBeenCalledWith(EVIDENCE_REF);
  });

  it('opens the evidence dialog from the keyboard alone', async () => {
    const user = userEvent.setup();
    renderTile(tileElement());

    await user.tab();
    expect(evidenceTrigger()).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders the qualifier in the caption role when the caller supplies one', () => {
    renderTile(tileElement({ hint: HINT }));

    const hint = within(tileRegion()).getByText(HINT);
    expect(hint).toBeVisible();
    expect(hint).toHaveClass('text-13', 'text-text-caption');
  });

  it('renders no qualifier line when the caller supplies none', () => {
    renderTile(tileElement());

    expect(screen.queryByText(HINT)).toBeNull();
    // The figure and its label are all a tile without a qualifier renders beneath its heading.
    expect(within(tileRegion()).getByText(SIM_LABEL)).toBeVisible();
    expect(within(tileRegion()).getByText(String(COUNT))).toBeVisible();
  });

  it('routes a named kind through the mono formatter with tabular numerals', () => {
    renderTile(tileElement({ kind: 'id' }));

    const figure = evidenceTrigger();
    const formatted = within(figure).getByText(IDENTIFIER);
    expect(formatted).toHaveClass('font-mono', 'tabular-nums');
    // The visible identifier is still the start of the accessible name (SC 2.5.3).
    expect(figure).toHaveAccessibleName(new RegExp(escapeForPattern(visibleFigure(figure))));
  });

  /*
   * An amount reaches the one money formatter, which groups the digit runs, prints the decimal comma
   * and labels the code; the tile itself formats nothing (AAP §0.5.3, rule P-6). The case reads the
   * shape and the digits rather than one hard-coded rendering, so a re-worded separator or a changed
   * magnitude moves with the formatter, and no amount any record carries is asserted here.
   */
  it('groups and code-labels a money figure through the one formatter', () => {
    renderTile(tileElement({ kind: 'money', value: AMOUNT }));

    const formatted = within(evidenceTrigger()).getByText(MONEY_SHAPE);
    const text = (formatted.textContent ?? '').replace(/\s/g, ' ');

    // The raw number the caller passed is not what a reader is shown.
    expect(text).not.toBe(String(AMOUNT));
    // Grouping and the decimal comma move no digit: the digits read back as the value that arrived.
    expect(text.replace(/[^\d]/g, '')).toBe(String(AMOUNT).replace('.', ''));
  });

  /*
   * A duration reaches the one duration formatter, which presents the nearest whole hour as text in
   * the tile's own type step. AAP §0.5.3 fixes the mono face for money, identifiers, timestamps and
   * hashes only, so this figure carries neither of those utilities; the value is fractional on
   * purpose, because the raw aggregate is what must never reach the reader (rule P-6).
   */
  it('presents an hours figure as whole hours rather than the raw aggregate', () => {
    renderTile(tileElement({ kind: 'hours', value: FRACTIONAL_HOURS }));

    const figure = evidenceTrigger();
    const formatted = within(figure).getByText(formatHours(FRACTIONAL_HOURS));

    // No mono face and no tabular numerals: a duration is not one of the four values that take them.
    expect(formatted.className).not.toMatch(/font-mono|tabular-nums/);
    // The float the aggregate measured is not on screen, and the whole hour is.
    expect(within(figure).queryByText(String(FRACTIONAL_HOURS))).toBeNull();
    expect(formatted).toBeVisible();
    // The figure still starts the trigger's accessible name, and the label is still on the tile.
    expect(figure).toHaveAccessibleName(new RegExp(escapeForPattern(visibleFigure(figure))));
    expect(within(tileRegion()).getByText(SIM_LABEL)).toBeVisible();
  });

  it.each(THEMES)('renders its caption, figure and label under the %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    renderTile(tileElement({ hint: HINT }));

    const region = tileRegion();
    expect(within(region).getByRole('heading', { level: 2, name: LABEL })).toBeVisible();
    expect(within(region).getByText(String(COUNT))).toBeVisible();
    expect(within(region).getByText(SIM_LABEL)).toBeVisible();
    expect(within(region).getByText(HINT)).toBeVisible();
  });
});
