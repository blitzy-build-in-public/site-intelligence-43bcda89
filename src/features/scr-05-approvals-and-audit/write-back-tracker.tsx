/**
 * The simulated write-back tracker of SCR-05: the ordered steps an approval's write-back would
 * perform, each labelled with the fixed write-back tag (AAP 0.12.4, AAP 0.10).
 *
 * Props-only and presentational. It renders exactly the steps the service returned, in the order the
 * record states them — which is what acceptance test T-08 asserts ("The five write-backs appear in
 * the seed's order") — and it sorts, filters, slices, counts, formats and fetches nothing: every
 * identifier, state and sentence on screen arrives through {@link WriteBackTrackerProps.writeBacks}
 * (rule P-6). The retry is reported upward and never performed here, so the component reaches no
 * service and needs no service to be tested (rule P-2).
 *
 * Rule P-1 is why {@link WRITE_BACK_TAG} sits on every step rather than once for the list: a
 * page-level badge does not label an individual write-back. The tag is the exact `Simulated
 * write-back` string of specification §5.3 followed by the sentence the SCR-05 row of AAP 0.12.4
 * fixes for this tracker. It is exported so the detail screen and the component suite import it
 * instead of re-spelling it, and it is deliberately not one of the seven `SimLabel` values of
 * `src/types/primitives.ts`: it is a longer string the tracker carries, not a label of its own.
 *
 * Rule P-8 is why the retry is an {@link ActionButton}: a step whose retry is already running is
 * disabled with the sentence that says so, a step that is not failed carries no retry control at
 * all rather than a dead one, and a caller that supplies no handler gets no control.
 *
 * WHAT `WriteBack` DOES NOT CARRY (contracts §3). The record declares `sequence`, `system`, `recordRef`,
 * `description` and `state` — no failure-message member and no timestamp member — so on a failed step
 * the record's own `description` is the only text there is, and that description is what is shown with
 * {@link WRITE_BACK_TAG} in the same step, which is what AAP 0.2.2 requires of a failed write-back. No
 * failure message and no instant is printed that the record does not hold.
 *
 * WHAT THE STEP IS KEYED BY. The record carries no identifier beyond `recordRef`, so that reference is
 * the value the caller's retry handler receives as its `writeBackId`, and the step's own `sequence` —
 * its declared position in the write-back — is the reconciliation key rather than the array index, so a
 * step that changes state after a retry re-renders the same list item in place instead of appending a
 * second row (AAP 0.2.2: a retry never duplicates a success record).
 */

import type { ReactElement, ReactNode } from 'react';

import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { PENDING_CLOCK_ICON, StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';
import { SOURCE_LABELS } from '../../types';
import type { WriteBack, WriteBackState } from '../../types';

/**
 * The fixed label every write-back step carries, character for character as AAP 0.12.4's SCR-05 row
 * and rule P-1 fix it.
 *
 * Typed as the literal it is, because a widened `string` would let a call site pass something else
 * and read as though it were the fixed text.
 */
export const WRITE_BACK_TAG = 'Simulated write-back. Not demonstrated on a live system.';

/** The props of {@link WriteBackTracker}. */
export interface WriteBackTrackerProps {
  /**
   * The approval's write-back steps, exactly as the service returned them.
   *
   * Rendered one list item each, in this array's own order. Nothing is sorted, filtered, deduped,
   * sliced or counted, so the tracker and the record cannot disagree about what the write-back does
   * or in which order it does it.
   */
  readonly writeBacks: readonly WriteBack[];

  /**
   * Called with the reference of the step whose retry the reader asked for.
   *
   * `writeBackId` is the step's own `recordRef` — the record's reference for what the step writes —
   * because `WriteBack` declares no other identifier. Absent, no retry control is rendered at all
   * (rule P-8): a control that could never act must not reach the reader, and this component
   * performs no write of its own.
   */
  readonly onRetry?: (writeBackId: string) => void;

  /**
   * The reference of the step whose retry is running, if any.
   *
   * While this equals a step's `recordRef`, that step's retry control is disabled with the reason
   * that a retry is already in progress. The caller owns the flag because the caller owns the
   * request; the component keeps no state of its own.
   */
  readonly retryingWriteBackId?: string | null;
}

/**
 * The name of the region and of the list inside it.
 *
 * One constant for both, so the region a reader lands in and the ordered list filling it are
 * announced as the same thing rather than as two subjects.
 */
const REGION_LABEL = 'Simulated write-back steps';

/**
 * What an approval with no write-back steps shows instead of an empty list.
 *
 * The state is the calling screen's to paint in general, but an empty `<ol>` announces "list, zero
 * items" and a zero-valued row would be a figure the record does not carry, so this component states
 * the absence in words (rule P-6).
 */
const EMPTY_CAPTION = 'No simulated write-back steps are recorded for this plan.';

/** The retry control's own label, before the reference of the step it retries. */
const RETRY_LABEL = 'Retry write-back';

/** Why a retry control cannot act while its own step is already being retried (rule P-8). */
const RETRY_IN_PROGRESS_REASON = 'A retry of this step is already in progress.';

/** The caption naming the field that follows it, in the caption text role. */
const SYSTEM_LABEL = 'Target system';

/** The caption naming the reference of the record the step writes. */
const RECORD_LABEL = 'Record';

/**
 * The list: a column with the 4 px grid's 12 px between steps, and no row height of its own so the
 * comfortable and compact densities both keep the steps at their content's height.
 */
const LIST_CLASSES = 'flex flex-col gap-3';

/** One step: its rows stacked on the same grid step, each breakable rather than overflowing (UI8). */
const STEP_CLASSES = 'flex min-w-0 flex-col gap-1';

/** The step's own description: the type scale's 14 px in the primary text role, wrapped. */
const DESCRIPTION_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/** A caption-and-value row: the caption text role, wrapping when a reference is long. */
const DETAIL_CLASSES = 'flex min-w-0 flex-wrap items-center gap-2 text-12 text-text-caption';

/** The tag's own row, and the empty caption, in the same caption role. */
const CAPTION_CLASSES = 'w-max max-w-full break-words text-12 text-text-caption';

/** The retry control keeps to its own box rather than filling the step's width. */
const RETRY_CLASSES = 'self-start';

/**
 * What one write-back state amounts to in the shared status vocabulary, plus the icon that reads
 * differently from its meaning's own.
 *
 * The shape mirrors `StatusDescriptor` in `src/components/status-indicator.tsx`, which maps
 * `PinState` rather than this record's own union; the mapping itself has to live beside the union it
 * exhausts, because a pin is not a write-back and the two vocabularies only start out similar.
 */
interface StepStatus {
  /** The meaning the state is rendered as. */
  readonly meaning: StatusMeaning;

  /** The icon to show instead of the meaning's own. Present only for the state that waits. */
  readonly icon?: ReactNode;
}

/**
 * The write-back states mapped onto the shared status meanings by what each one means rather than by
 * which colour it happens to get.
 *
 * The `switch` is exhaustive over `WriteBackState` and its `default` arm assigns to `never`, so a
 * fourth state added to that union fails compilation here rather than rendering as whichever branch
 * happened to be last. `pending` takes the warning meaning with `StatusIndicator`'s clock, the same
 * way `meaningOf` marks a pending evidence pin: awaiting a write is not the same thing as a degraded
 * one, and the clock is what tells them apart.
 */
function statusOfState(state: WriteBackState): StepStatus {
  switch (state) {
    case 'succeeded':
      return { meaning: 'pass' };
    case 'failed':
      return { meaning: 'fail' };
    case 'pending':
      return { meaning: 'warning', icon: PENDING_CLOCK_ICON };
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

/** The props of {@link RetryControl}. */
interface RetryControlProps {
  /** The step's own reference, passed back to the caller when the reader retries. */
  readonly recordRef: string;

  /** The caller's retry handler. Required here: the caller renders no control without one. */
  readonly onRetry: (writeBackId: string) => void;

  /** Whether this step's retry is already running. */
  readonly isRetrying: boolean;
}

/**
 * The retry of one failed step, as an {@link ActionButton} in the secondary flavour.
 *
 * The button's accessible name carries the step's reference as well as its action, so a screen reader
 * reading a list of retries says which step each one belongs to; the reference is rendered through
 * {@link MonoValue} rather than concatenated into a sentence this file would have to format.
 *
 * The disabled state is expressed by `ActionButton` itself — `aria-disabled` plus the reason as both
 * a painted hint and the control's description — so the explanation is reachable by keyboard and not
 * only by pointer (rules P-8 and B-3).
 */
function RetryControl({ recordRef, onRetry, isRetrying }: RetryControlProps): ReactElement {
  const label = (
    <>
      {RETRY_LABEL} <MonoValue value={recordRef} kind="id" />
    </>
  );

  if (isRetrying) {
    return (
      <ActionButton
        variant="secondary"
        disabled={true}
        disabledReason={RETRY_IN_PROGRESS_REASON}
        className={RETRY_CLASSES}
      >
        {label}
      </ActionButton>
    );
  }

  const handleClick = (): void => {
    onRetry(recordRef);
  };

  return (
    <ActionButton variant="secondary" onClick={handleClick} className={RETRY_CLASSES}>
      {label}
    </ActionButton>
  );
}

/** The props of {@link WriteBackStep}. */
interface WriteBackStepProps {
  /** The step record, unmodified. */
  readonly writeBack: WriteBack;

  /** The caller's retry handler, or `undefined` when the caller supplied none. */
  readonly onRetry: ((writeBackId: string) => void) | undefined;

  /** Whether this step's retry is already running. */
  readonly isRetrying: boolean;
}

/**
 * One write-back step: the record's own description, the system and record it writes, its state, the
 * fixed tag and — on a failed step — the retry.
 *
 * The state's label is the record's own state member rather than a sentence about it: `WriteBack`
 * carries no state text of its own, and a reworded status would be this component inventing wording
 * the service never sent (rule P-6). The status is an icon, that label and a colour together, so the
 * meaning never rests on colour alone (rule B-3).
 */
function WriteBackStep({ writeBack, onRetry, isRetrying }: WriteBackStepProps): ReactElement {
  const status = statusOfState(writeBack.state);
  const isFailed = writeBack.state === 'failed';

  return (
    <li className={STEP_CLASSES}>
      <p className={DESCRIPTION_CLASSES}>{writeBack.description}</p>

      <p className={DETAIL_CLASSES}>
        <span>{SYSTEM_LABEL}</span>
        {/* The source is printed by its display name from `SOURCE_LABELS`, so the tracker and the
            comparison screen's write-back preview read one record value one way. */}
        {SOURCE_LABELS[writeBack.system]}
      </p>

      <p className={DETAIL_CLASSES}>
        <StatusIndicator meaning={status.meaning} label={writeBack.state} icon={status.icon} />
      </p>

      <p className={DETAIL_CLASSES}>
        <span>{RECORD_LABEL}</span>
        <MonoValue value={writeBack.recordRef} kind="id" />
      </p>

      {/* Every step carries the fixed tag. On a failed step it sits in the same step as the record's
          own description, below the rows that name the target system, the state and the record it
          writes — the same step as the failure's own message, which is where AAP 0.2.2 places it. */}
      <p className={CAPTION_CLASSES}>{WRITE_BACK_TAG}</p>

      {isFailed && onRetry !== undefined ? (
        <RetryControl recordRef={writeBack.recordRef} onRetry={onRetry} isRetrying={isRetrying} />
      ) : null}
    </li>
  );
}

/**
 * Renders an approval's simulated write-back steps as one ordered list, in the record's own order.
 *
 * The root is a {@link Panel}, so the steps sit in a named region of the second raised surface
 * inside whatever card the detail screen places them in, and the list inside it is an `<ol>` because
 * the order is part of what the record says: a planner reading a write-back needs to know which step
 * follows which, and only an ordered list carries that to assistive technology.
 *
 * The return type is `ReactElement`: `@types/react` 19 declares no global `JSX` namespace under this
 * project's `types` setting, and every sibling component annotates its own return the same way.
 *
 * @param props The steps, the optional retry handler and the reference of a running retry. See
 *   {@link WriteBackTrackerProps}.
 * @returns The named region with the ordered list, one item per step, or — when the approval has no
 *   steps — the region with a caption saying so.
 */
export function WriteBackTracker({
  writeBacks,
  onRetry,
  retryingWriteBackId,
}: WriteBackTrackerProps): ReactElement {
  /* An approval with no steps states the absence in words rather than rendering an empty `<ol>`. The
     test is on emptiness alone; nothing here counts the steps for display (rule P-6). */
  if (writeBacks.length === 0) {
    return (
      <Panel label={REGION_LABEL}>
        <p className={CAPTION_CLASSES}>{EMPTY_CAPTION}</p>
      </Panel>
    );
  }

  return (
    <Panel label={REGION_LABEL}>
      <ol aria-label={REGION_LABEL} className={LIST_CLASSES}>
        {writeBacks.map((writeBack) => (
          <WriteBackStep
            key={writeBack.sequence}
            writeBack={writeBack}
            onRetry={onRetry}
            isRetrying={retryingWriteBackId === writeBack.recordRef}
          />
        ))}
      </ol>
    </Panel>
  );
}
