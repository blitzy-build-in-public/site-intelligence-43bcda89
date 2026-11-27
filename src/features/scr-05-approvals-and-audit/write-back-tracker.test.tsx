/**
 * Component suite for `write-back-tracker.tsx`, the ordered simulated write-back steps of SCR-05.
 *
 * Every case asserts a contract the tracker is relied on for rather than its markup: one ordered
 * list holding one item per step in the record's own order (the component-level half of T-08, "the
 * five write-backs appear in the seed's order"); the fixed `WRITE_BACK_TAG` inside every step,
 * because rule P-1 labels an individual write-back and a page-level badge does not; a status that
 * always shows an icon and a visible label together, so no step carries its meaning by colour alone
 * (rule B-3); every system and reference rendered character for character through the one formatter
 * (rule P-6); the failed step's own text with the tag inside the same step, and a retry control that
 * exists only where the caller can handle one (rule P-8); the retry's keyboard contract, which is
 * what the three T-16 assertions name; an approval with no steps stated in words rather than as an
 * empty list; and a re-render that duplicates nothing, so a step that succeeds on retry keeps the one
 * row it had.
 *
 * The fixtures are built here from `WriteBack` and `WriteBackState` alone, and every reference in
 * them is an opaque placeholder. That is the constraint rule P-6 puts on this folder: the
 * `no-typed-figures` source check reads `src/features/**` — this file included — for currency
 * literals and domain-identifier literals, so no reference here is shaped like a record identifier
 * and no amount appears anywhere in the suite. The plain integers are sequences and positions, which
 * a component test cannot avoid and which no reader can mistake for a computed figure; the check does
 * not flag them, so there is no collision to report. The tag itself is never re-spelled: it is
 * imported from the component, so a reworded tag fails here instead of being silently accepted.
 *
 * `WriteBack` declares `sequence`, `system`, `recordRef`, `description` and `state`, and no timestamp
 * member, so there is no instant for this suite to read through the formatter. The two values that do
 * pass through it — the system class and the record reference — are what the formatter case asserts,
 * and a timestamp added to the record is asserted on the day it exists.
 *
 * The tracker is props-only and reaches no service, so nothing here mocks `service-provider.tsx`,
 * imports the seed or reads a fixture: the steps arrive as props exactly as the approval detail
 * screen hands them over. Runs under the jsdom environment `vite.config.ts` sets by default; nothing
 * here hashes, reads the clock or touches the network.
 */

import { render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SourceId, WriteBack, WriteBackState } from '../../types';
import { WRITE_BACK_TAG, WriteBackTracker } from './write-back-tracker';
import type { WriteBackTrackerProps } from './write-back-tracker';

/**
 * The mono face `MonoValue` owns.
 *
 * Named here because the face is part of what this suite verifies — an identifier that reached the
 * screen as ordinary body text would have skipped the one formatter — and because the component
 * module is not imported by a test that must read its output rather than its class constants.
 */
const MONO_FACE_CLASS = 'font-mono';

/** The tabular numerals that sit with the mono face so digits align down a column. */
const TABULAR_FIGURES_CLASS = 'tabular-nums';

/** The utility that hides a label visually, which a status label must never carry (rule B-3). */
const SCREEN_READER_ONLY_CLASS = 'sr-only';

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** One step of the fixture, before its `sequence` is derived from its position in the list. */
interface StepSpec {
  /** The step's opaque reference: no record-identifier shape, so no figure scan reads one. */
  readonly recordRef: string;
  /** The system class the step writes to, from the contract's own union. */
  readonly system: SourceId;
  /** What the step does, in words that carry no amount and no identifier. */
  readonly description: string;
  /** Where the step stands. */
  readonly state: WriteBackState;
}

/**
 * The five steps that give the tracker the seeded approval's shape.
 *
 * The states are mixed on purpose — one `pending` among the successes — so the status vocabulary is
 * exercised from one rendering, and no description repeats another's words or contains a system name
 * that a text query could confuse with the slug beside it.
 */
const STEPS: readonly StepSpec[] = [
  {
    recordRef: 'write-back-one',
    system: 'erp',
    description: 'Post the revised receipt date to the shortage list',
    state: 'succeeded',
  },
  {
    recordRef: 'write-back-two',
    system: 'mes',
    description: 'Release the held line item for collection',
    state: 'succeeded',
  },
  {
    recordRef: 'write-back-three',
    system: 'scheduling',
    description: 'Publish the updated delivery window to the buyer',
    state: 'pending',
  },
  {
    recordRef: 'write-back-four',
    system: 'plm-qms',
    description: 'Record the transfer instruction against the supplying plant',
    state: 'succeeded',
  },
  {
    recordRef: 'write-back-five',
    system: 'transport',
    description: 'Confirm the shipping priority with the carrier desk',
    state: 'succeeded',
  },
];

/**
 * Which step the failure fixture breaks.
 *
 * Neither the first nor the last, so a case that reads the step's neighbours cannot pass by reading
 * the wrong item, and the neighbouring successes stay in the rendering that carries the failure.
 */
const FAILED_STEP_INDEX = 2;

/**
 * The failed step's own text.
 *
 * `WriteBack` declares no failure-message member, so the record's `description` is the message the
 * reader is given and the only text the component can print for a failure (AAP 0.2.2 places the
 * fixed tag beside exactly that message).
 */
const FAILURE_DESCRIPTION =
  'The receiving system refused the transfer instruction and held the release';

/**
 * Derives the record's `sequence` from each step's position, so the fixture states positions once and
 * the rendered order can only come from the array.
 */
function toWriteBacks(steps: readonly StepSpec[]): readonly WriteBack[] {
  return steps.map((step, index) => ({
    sequence: index + 1,
    system: step.system,
    recordRef: step.recordRef,
    description: step.description,
    state: step.state,
  }));
}

/** The five-step fixture: the seeded approval's shape, every step in a state it can be read from. */
function makeWriteBacks(): readonly WriteBack[] {
  return toWriteBacks(STEPS);
}

/** The same five steps with one failed, to drive the failure path and its retry. */
function makeFailedWriteBacks(): readonly WriteBack[] {
  return toWriteBacks(
    STEPS.map((step, index): StepSpec => {
      if (index !== FAILED_STEP_INDEX) {
        return step;
      }
      return { ...step, description: FAILURE_DESCRIPTION, state: 'failed' };
    }),
  );
}

/** The reference of the step the failure fixture breaks: what a retry has to report. */
function failedRecordRef(): string {
  const step = STEPS[FAILED_STEP_INDEX];
  if (step === undefined) {
    throw new Error('the fixture defines no step at the failed position');
  }
  return step.recordRef;
}

/** What one case hands the tracker. An absent member is the member the case leaves unsupplied. */
interface TrackerRenderOptions {
  /** The steps to render, exactly as the service returned them. */
  readonly writeBacks: readonly WriteBack[];
  /** The caller's retry handler, for the cases that exercise the retry control. */
  readonly onRetry?: (writeBackId: string) => void;
  /** The reference of a step whose retry is running, for the disabled-retry case. */
  readonly retryingWriteBackId?: string | null;
}

/**
 * Builds the props of one rendering.
 *
 * The members are added branch by branch rather than passed as `undefined`, because under
 * `exactOptionalPropertyTypes` an explicit `undefined` and an absent member are different states, and
 * a case should say which one it exercises: the tracker renders no retry control at all when the
 * handler is absent, and treats a `null` retrying reference as "no step is being retried".
 */
function trackerProps(options: TrackerRenderOptions): WriteBackTrackerProps {
  const { writeBacks, onRetry, retryingWriteBackId } = options;

  if (onRetry === undefined) {
    return retryingWriteBackId === undefined
      ? { writeBacks }
      : { writeBacks, retryingWriteBackId };
  }

  return retryingWriteBackId === undefined
    ? { writeBacks, onRetry }
    : { writeBacks, onRetry, retryingWriteBackId };
}

/** Renders the tracker and hands back the result, so a case can re-render the same container. */
function renderTracker(options: TrackerRenderOptions): RenderResult {
  return render(<WriteBackTracker {...trackerProps(options)} />);
}

/** An element's rendered text, with the empty case handled rather than narrowed at every call. */
function textOf(element: HTMLElement): string {
  return element.textContent ?? '';
}

/**
 * The one ordered list the tracker renders, or a failure naming what stood there instead.
 *
 * The count is asserted first so a second list — a nested one, or a caller's — fails here rather
 * than quietly changing what "one item per step" means for the cases that follow.
 */
function orderedListOf(container: HTMLElement): HTMLOListElement {
  const lists = container.querySelectorAll('ol');
  expect(lists).toHaveLength(1);

  const list = lists[0];
  if (!(list instanceof HTMLOListElement)) {
    throw new Error('the tracker rendered no ordered list of steps to read');
  }

  return list;
}

/** The list's items, in document order. */
function stepsOf(container: HTMLElement): HTMLElement[] {
  return within(orderedListOf(container)).getAllByRole('listitem');
}

/** The step at the position the failure fixture breaks, or a failure naming the absence. */
function failedStepOf(container: HTMLElement): HTMLElement {
  const step = stepsOf(container)[FAILED_STEP_INDEX];
  if (step === undefined) {
    throw new Error('the tracker rendered no step at the failed position');
  }
  return step;
}

/** One fixture step, or a failure naming the position that has none. */
function writeBackAt(writeBacks: readonly WriteBack[], index: number): WriteBack {
  const writeBack = writeBacks[index];
  if (writeBack === undefined) {
    throw new Error(`the fixture defines no step at position ${String(index)}`);
  }
  return writeBack;
}

/** Every element in a subtree that carries the mono face. */
function monoElementsOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`.${MONO_FACE_CLASS}`));
}

/**
 * The values a step renders through `MonoValue`, in document order, ignoring the copy a retry
 * control's own accessible name carries: that control repeats the step's reference to name itself,
 * and the record's own rows are the values this reads.
 */
function monoTextsOf(step: HTMLElement): string[] {
  return monoElementsOf(step)
    .filter((element) => element.closest('button') === null)
    .map(textOf);
}

/**
 * The reference a step renders as its own record, read out of the step rather than assumed.
 *
 * Exactly one of the record's references has to appear, which is also what rules out a step printing
 * another record's identifier: a step with two or with none fails here.
 */
function recordRefOf(step: HTMLElement, writeBacks: readonly WriteBack[]): string {
  const references = new Set(writeBacks.map((writeBack) => writeBack.recordRef));
  const rendered = monoTextsOf(step).filter((text) => references.has(text));

  const reference = rendered[0];
  if (rendered.length !== 1 || reference === undefined) {
    throw new Error(
      `a step rendered ${String(rendered.length)} of the record's own references; expected exactly one`,
    );
  }

  return reference;
}

/**
 * The retry control of one step, found by the accessible name the tracker gives it — the retry
 * action followed by the step's own reference, which is what a screen reader announces.
 */
function retryButtonOf(container: HTMLElement, recordRef: string): HTMLElement {
  const matching = within(container)
    .getAllByRole('button')
    .filter((button) => textOf(button).trim().endsWith(recordRef));

  const button = matching[0];
  if (matching.length !== 1 || button === undefined) {
    throw new Error(
      `the tracker rendered ${String(matching.length)} retry controls naming ${recordRef}; expected one`,
    );
  }

  return button;
}

/* -------------------------------------------------------------------------------------------
 * Assertions shared between the single-purpose cases and the both-themes cases, so one contract is
 * stated once and the theme cases replay it rather than restating it.
 * ----------------------------------------------------------------------------------------- */

/** Assertion 1: one ordered list, one item per step, the references in the record's own order. */
function expectStepsInRecordOrder(
  container: HTMLElement,
  writeBacks: readonly WriteBack[],
): void {
  const steps = stepsOf(container);

  expect(steps).toHaveLength(writeBacks.length);
  expect(steps.map((step) => recordRefOf(step, writeBacks))).toEqual(
    writeBacks.map((writeBack) => writeBack.recordRef),
  );
}

/** Assertion 2: the fixed tag inside every step, not once for the list (rule P-1). */
function expectTagOnEveryStep(container: HTMLElement, writeBacks: readonly WriteBack[]): void {
  const steps = stepsOf(container);
  expect(steps).toHaveLength(writeBacks.length);

  for (const step of steps) {
    expect(within(step).getAllByText(WRITE_BACK_TAG)).toHaveLength(1);
  }
}

/** Assertion 3: each step's state as an icon and a visible label, never colour alone (rule B-3). */
function expectStatusOnEveryStep(container: HTMLElement, writeBacks: readonly WriteBack[]): void {
  const steps = stepsOf(container);
  expect(steps).toHaveLength(writeBacks.length);

  for (const [index, step] of steps.entries()) {
    const { state } = writeBackAt(writeBacks, index);

    const label = within(step).getByText(state);
    expect(label).not.toHaveClass(SCREEN_READER_ONLY_CLASS);
    expect(label.closest('[aria-hidden="true"]')).toBeNull();

    const icon = label.parentElement?.querySelector('svg') ?? null;
    if (!(icon instanceof SVGElement)) {
      throw new Error(`the ${state} status rendered no icon beside its label`);
    }

    const iconWrapper = icon.parentElement;
    if (iconWrapper === null) {
      throw new Error(`the ${state} status rendered its icon inside no element`);
    }
    expect(iconWrapper).toHaveAttribute('aria-hidden', 'true');
  }
}

/**
 * Assertion 4: both values the record carries, rendered character for character through the
 * formatter, with the tabular numerals that go with its face.
 */
function expectMonoValuesOfEveryStep(
  container: HTMLElement,
  writeBacks: readonly WriteBack[],
): void {
  const steps = stepsOf(container);
  expect(steps).toHaveLength(writeBacks.length);

  for (const [index, step] of steps.entries()) {
    const writeBack = writeBackAt(writeBacks, index);
    const ownValues: readonly string[] = [writeBack.system, writeBack.recordRef];

    expect(monoTextsOf(step)).toEqual(expect.arrayContaining([...ownValues]));

    for (const element of monoElementsOf(step)) {
      expect(element).toHaveClass(TABULAR_FIGURES_CLASS);
      expect(ownValues).toContain(textOf(element));
    }
  }
}

/** Everything a rendering of the tracker must present, for the both-themes cases to replay. */
function expectTrackerStructure(
  container: HTMLElement,
  writeBacks: readonly WriteBack[],
): void {
  expectStepsInRecordOrder(container, writeBacks);
  expectTagOnEveryStep(container, writeBacks);
  expectStatusOnEveryStep(container, writeBacks);
  expectMonoValuesOfEveryStep(container, writeBacks);
}

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('WriteBackTracker', () => {
  describe('the steps it renders', () => {
    it("renders one ordered list holding one item per step, in the record's own order", () => {
      const writeBacks = makeWriteBacks();
      const container = renderTracker({ writeBacks }).container;

      expectStepsInRecordOrder(container, writeBacks);
    });

    it('carries the fixed write-back tag inside every step', () => {
      const writeBacks = makeWriteBacks();
      const container = renderTracker({ writeBacks }).container;

      expectTagOnEveryStep(container, writeBacks);
    });

    it("shows each step's state as an icon and a visible label together", () => {
      const writeBacks = makeWriteBacks();
      const container = renderTracker({ writeBacks }).container;

      /* More than one state is on screen at once, so a status that dropped its label or its icon
         fails on the step that carries it rather than passing on an all-succeeded list. */
      expect(new Set(writeBacks.map((writeBack) => writeBack.state)).size).toBeGreaterThan(1);

      expectStatusOnEveryStep(container, writeBacks);
    });

    it('renders every system and reference through the mono face, character for character', () => {
      const writeBacks = makeWriteBacks();
      const container = renderTracker({ writeBacks }).container;

      expectMonoValuesOfEveryStep(container, writeBacks);

      /* Exactly the record's two values per step: no third value the record does not carry, and no
         reformatted or truncated duplicate of either. */
      for (const step of stepsOf(container)) {
        expect(monoElementsOf(step)).toHaveLength(2);
      }
    });
  });

  describe('a failed step', () => {
    it("shows the failed step's own text with the fixed tag inside the same step", () => {
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({ writeBacks }).container;
      const failed = failedStepOf(container);

      const message = within(failed).getByText(FAILURE_DESCRIPTION);
      const tag = within(failed).getByText(WRITE_BACK_TAG);

      /* The label and the failure's own message are read together, and neither stands in for the
         other (rule P-1, AAP 0.2.2). */
      expect(tag).not.toBe(message);
      const tagFollowsMessage =
        (message.compareDocumentPosition(tag) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      expect(tagFollowsMessage).toBe(true);
    });

    it('offers no retry control when the caller supplies no handler', () => {
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({ writeBacks }).container;

      expect(within(container).queryAllByRole('button')).toHaveLength(0);

      /* The absence of a handler removes the control, not the news: the failure and its tag stay on
         screen (rule P-8 — no dead control, and no silent failure either). */
      const failed = failedStepOf(container);
      expect(within(failed).getByText(FAILURE_DESCRIPTION)).toBeInTheDocument();
      expect(within(failed).getByText(WRITE_BACK_TAG)).toBeInTheDocument();
    });

    it('offers a retry control on the failed step alone', () => {
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({ writeBacks, onRetry: vi.fn() }).container;
      const steps = stepsOf(container);

      expect(within(container).getAllByRole('button')).toHaveLength(1);
      expect(within(failedStepOf(container)).getAllByRole('button')).toHaveLength(1);

      for (const [index, step] of steps.entries()) {
        if (index !== FAILED_STEP_INDEX) {
          expect(within(step).queryAllByRole('button')).toHaveLength(0);
        }
      }
    });
  });

  describe('the retry it reports', () => {
    it("reports the failed step's own reference once per pointer activation", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({ writeBacks, onRetry }).container;

      await user.click(retryButtonOf(container, failedRecordRef()));

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(failedRecordRef());
    });

    it('T-16 reports the retry once when it is activated from Enter', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({ writeBacks, onRetry }).container;
      const retry = retryButtonOf(container, failedRecordRef());

      await user.tab();
      expect(retry).toHaveFocus();

      await user.keyboard('{Enter}');

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(failedRecordRef());
    });

    it('T-16 reports the retry once when it is activated from Space', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({ writeBacks, onRetry }).container;
      const retry = retryButtonOf(container, failedRecordRef());

      await user.tab();
      expect(retry).toHaveFocus();

      await user.keyboard(' ');

      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(failedRecordRef());
    });

    it('T-16 disables the retry of the step already being retried, keeping its reason reachable by keyboard', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const writeBacks = makeFailedWriteBacks();
      const container = renderTracker({
        writeBacks,
        onRetry,
        retryingWriteBackId: failedRecordRef(),
      }).container;
      const retry = retryButtonOf(container, failedRecordRef());

      /* `aria-disabled` rather than the `disabled` attribute: the control stays in the tab order, so
         the explanation rule P-8 requires is reachable without a pointer (rule B-3). */
      expect(retry).not.toHaveAttribute('disabled');
      expect(retry).toHaveAttribute('aria-disabled', 'true');

      await user.tab();
      expect(retry).toHaveFocus();

      const reason = textOf(screen.getByRole('tooltip'));
      expect(reason).toMatch(/retry/i);
      expect(retry).toHaveAccessibleDescription(reason);

      await user.keyboard('{Enter}');
      await user.click(retry);

      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('an approval with no write-back steps', () => {
    it('states the absence in words instead of rendering an empty list', () => {
      const container = renderTracker({ writeBacks: [] }).container;

      expect(container.querySelector('ol')).toBeNull();
      expect(within(container).queryAllByRole('listitem')).toHaveLength(0);

      /* No zero-valued row and no placeholder value: nothing reaches the formatter at all. */
      expect(monoElementsOf(container)).toHaveLength(0);

      /* One caption of its own beside the region's name, so the reader is told why the list is
         missing rather than being left with an unlabelled blank (rule P-8). */
      const region = screen.getByRole('region');
      const nameId = region.getAttribute('aria-labelledby');
      const regionName = nameId === null ? '' : textOf(document.getElementById(nameId) ?? region);
      const message = Array.from(region.querySelectorAll('p'))
        .map(textOf)
        .filter((text) => text.length > 0 && text !== regionName);

      expect(message).toHaveLength(1);
      expect(message[0]).not.toBe('');
    });
  });

  describe('re-rendering', () => {
    it('duplicates nothing when it renders the same steps again', () => {
      const writeBacks = makeFailedWriteBacks();
      const onRetry = vi.fn();
      const { container, rerender } = renderTracker({ writeBacks, onRetry });
      const order = stepsOf(container).map((step) => recordRefOf(step, writeBacks));

      rerender(<WriteBackTracker writeBacks={writeBacks} onRetry={onRetry} />);

      expect(stepsOf(container)).toHaveLength(writeBacks.length);
      expect(stepsOf(container).map((step) => recordRefOf(step, writeBacks))).toEqual(order);
      expect(within(container).getAllByRole('button')).toHaveLength(1);
    });

    it('keeps one row per step when the failed step succeeds on retry', () => {
      const failedWriteBacks = makeFailedWriteBacks();
      const retriedWriteBacks = makeWriteBacks();
      const onRetry = vi.fn();
      const { container, rerender } = renderTracker({ writeBacks: failedWriteBacks, onRetry });

      expect(within(container).getAllByRole('button')).toHaveLength(1);

      rerender(<WriteBackTracker writeBacks={retriedWriteBacks} onRetry={onRetry} />);

      /* The step is the same row in its new state rather than a second success row beside the
         failure (AAP 0.2.2: a retry never duplicates a success record). */
      const steps = stepsOf(container);
      expect(steps).toHaveLength(failedWriteBacks.length);
      expect(steps.map((step) => recordRefOf(step, retriedWriteBacks))).toEqual(
        failedWriteBacks.map((writeBack) => writeBack.recordRef),
      );

      /* No step is failed any more, so no retry control survives the update. */
      expect(within(container).queryAllByRole('button')).toHaveLength(0);
      expectTagOnEveryStep(container, retriedWriteBacks);
    });
  });

  describe('both themes', () => {
    for (const theme of THEMES) {
      it(`renders the same steps, labels and tags under the ${theme} theme`, () => {
        document.documentElement.setAttribute('data-theme', theme);
        const writeBacks = makeFailedWriteBacks();
        const container = renderTracker({ writeBacks, onRetry: vi.fn() }).container;

        /* The tokens differ between the two themes; nothing the content says does. */
        expectTrackerStructure(container, writeBacks);
        expect(within(container).getAllByRole('button')).toHaveLength(1);
      });
    }
  });
});

