/**
 * The write-back preview: the ordered list of the steps a plan would write to the systems of
 * record, shown before an approval commits to them and again wherever the same records are read.
 *
 * Its input is the contracts §3 `WriteBack` entity, and it derives nothing from it. Each step is one
 * record rendered in the order the array supplies: what the step does, the system class it writes to
 * with that system's own reference, and where the step stands. `sequence` is not printed, because the
 * ordered list already announces each step's position — printing both would read as two competing
 * counts — and it is never used to re-sort, so the order a reader sees is the order the record holds
 * (rule P-6: no ordering, no counting and no progress arithmetic belongs to this component; the
 * post-approval tracker is where a step count and the retry rule live).
 *
 * Every step carries the fixed specification §5.3 label `Simulated write-back` (AAP 0.10), rendered
 * through `StatusIndicator` with `meaning="simulated"` so the icon, the word and the colour arrive
 * together. The string is declared once, in {@link WRITE_BACK_SIM_LABEL}, and nothing here
 * paraphrases, shortens or localises it (rule P-1). The label states what the step is; it never
 * claims that a write executed, and no wording in this file asserts that an approval's side effects
 * reached a live system (rule P-4).
 *
 * The component is presentational and reusable from props alone: it imports no service, reads no
 * seed record, holds no state and publishes no action (rule P-2). That is what lets the approval
 * detail of stage S1 render the same records in its own mirrored component without either feature
 * importing the other. A step that cannot proceed therefore shows its state and its label as text
 * rather than an inert control (rule P-8); `WriteBack` carries no message member, so the state's own
 * word is the whole explanation the record supports, and nothing inside a step is focusable.
 *
 * The steps are an `<ol>` of `<li>` elements so the sequence is announced as a sequence, and each
 * state pairs an icon with a visible label in its status colour, so no meaning rests on colour alone
 * (rule B-3). Every value comes from a role token of `src/theme/tokens.css`, so the surface, its
 * hairline and the text roles resolve per theme and no raw palette value, inline style or shadow is
 * reachable from here (specification §4.3). Nothing in a step is fetched: the status icon is a bundled
 * Phosphor component and everything else is text, so the preview adds no request to another origin
 * (rule B-1).
 *
 * An empty array renders nothing at all — no sentence, no placeholder — because the screen that
 * holds the query owns the wording of that state.
 */
import type { ReactElement } from 'react';

import { MonoValue } from '../../components/mono-value';
import { Panel } from '../../components/panel';
import { PENDING_CLOCK_ICON, StatusIndicator } from '../../components/status-indicator';
import type { StatusMeaning } from '../../components/status-indicator';
import { SOURCE_LABELS } from '../../types';
import type { SimLabel, WriteBack, WriteBackState } from '../../types';

/** Props of {@link WriteBackPreview}. */
export interface WriteBackPreviewProps {
  /**
   * The write-back steps to present, exactly as the service supplied them.
   *
   * Order is the record's order and is never re-sorted here, and no member is added, dropped or
   * recalculated: the array is the whole input, so a screen that filters or reorders the steps does
   * so before handing them over rather than relying on this component to interpret them.
   */
  readonly writeBacks: readonly WriteBack[];
}

/**
 * The one simulation label this component carries, character for character as specification §5.3
 * fixes it and as AAP 0.10 assigns it to the write-back preview, the post-approval tracker and each
 * write-back row of the approval detail.
 *
 * Typed `SimLabel` rather than `string` so the union rejects a paraphrase at compile time, and
 * declared once so the two steps that render it cannot drift apart. It is deliberately not exported:
 * the label has one owner, and a second module that needs it declares its own copy of this exact
 * string from the type (rule P-1).
 */
const WRITE_BACK_SIM_LABEL: SimLabel = 'Simulated write-back';

/**
 * How one write-back state is presented: the shared status meaning it is drawn as, the word shown
 * beside the icon, and whether the pending clock replaces that meaning's own icon.
 *
 * `label` is required because a status is never a colour alone (rule B-3). The words name what the
 * record's `WriteBackState` already says and add no claim about a live system: a `succeeded` step
 * records that the demonstration's write did not fail, not that a production system was updated.
 */
interface WriteBackPresentation {
  /** The shared status meaning, selecting the icon and the status colour role. */
  readonly meaning: StatusMeaning;
  /** The visible word beside the icon, and the status's accessible name. */
  readonly label: string;
  /** Whether the pending clock replaces the meaning's own icon. Absent means the meaning's icon. */
  readonly showPendingClock?: boolean;
}

/**
 * The presentation of every `WriteBackState`, and the only place one is chosen.
 *
 * `pending` takes the warning meaning with the pending clock, which is the treatment
 * `meaningOf` gives a pending evidence pin: a step not yet written shares that meaning's colour so
 * "still to come" reads in the application's one status vocabulary, while the clock keeps it
 * distinct from a degraded state. `succeeded` and `failed` take the pass and fail meanings, so a
 * step's outcome reads the same here as it does in a table cell or a legend.
 *
 * The type is exhaustive over `WriteBackState` and has no index signature, so a fourth state added
 * to that union fails to compile until its meaning, its word and its icon are decided here rather
 * than falling back to whatever happened to be listed first.
 */
const WRITE_BACK_STATE_PRESENTATION: Record<WriteBackState, WriteBackPresentation> = {
  pending: { meaning: 'warning', label: 'Pending', showPendingClock: true },
  succeeded: { meaning: 'pass', label: 'Succeeded' },
  failed: { meaning: 'fail', label: 'Failed' },
};

/**
 * The list itself: decimal markers keep the sequence visible and `ps-*` reserves the space the
 * marker sits in, since the application's reset removes both from an `<ol>`.
 *
 * The list is not a flex or grid container: those blockify their items, and a blockified `<li>` loses
 * the marker that states the step's position. Its type and colour are inherited by every step, so a
 * step declares neither.
 */
const LIST_CLASSES = 'list-decimal ps-4 text-13 text-text-primary';

/**
 * One step's own spacing: padding rather than a margin between siblings, so the rhythm between steps
 * is the same whether or not a neighbour is present, and the first and last steps sit flush with the
 * panel's own padding instead of doubling it.
 */
const STEP_CLASSES = 'ps-2 py-2 first:pt-0 last:pb-0';

/**
 * Renders one plan's write-back as an ordered list, or nothing when there is nothing to write.
 *
 * @param props The write-back steps, in the order the service supplied them. See
 *   {@link WriteBackPreviewProps}.
 * @returns The panel holding the ordered steps, or `null` for an empty array.
 */
export function WriteBackPreview({ writeBacks }: WriteBackPreviewProps): ReactElement | null {
  /* Nothing to preview. The screen owns the wording of an empty plan's state, so this component adds
     no sentence of its own and no empty list to the accessibility tree. */
  if (writeBacks.length === 0) {
    return null;
  }

  return (
    /* An unnamed grouping container rather than the panel's default `<section>`: this component
       carries no caption of its own, and a `<section>` with no accessible name is a generic
       container anyway, so the `<div>` states what the element actually is. The calling screen names
       the block with its own card heading. */
    <Panel as="div">
      <ol className={LIST_CLASSES}>
        {writeBacks.map((writeBack) => {
          const presentation = WRITE_BACK_STATE_PRESENTATION[writeBack.state];

          return (
            <li key={`${writeBack.sequence}-${writeBack.recordRef}`} className={STEP_CLASSES}>
              {/* The description and its reference stay a flexible column that may shrink, while the
                  two statuses keep their intrinsic width and wrap beneath them on a narrow screen
                  rather than squeezing a word the reader needs. */}
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="break-words text-text-primary">{writeBack.description}</p>
                  {/* The source name is the display name the source vocabulary fixes for this key,
                      and the reference is the identifier the record states, rendered by the one
                      formatter in the application (rule P-6). The comma is real text, so a screen
                      reader pauses between the two rather than running them together. */}
                  <p className="break-words text-12 text-text-secondary">
                    {SOURCE_LABELS[writeBack.system]}
                    {', '}
                    <MonoValue kind="id" value={writeBack.recordRef} />
                  </p>
                </div>
                {/* The state, then the fixed label every step carries: icon, word and colour together,
                    and no focus stop anywhere inside the step. */}
                <div className="flex shrink-0 flex-col items-start gap-1">
                  <StatusIndicator
                    meaning={presentation.meaning}
                    label={presentation.label}
                    icon={
                      presentation.showPendingClock === true ? PENDING_CLOCK_ICON : undefined
                    }
                  />
                  <StatusIndicator meaning="simulated" label={WRITE_BACK_SIM_LABEL} />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}
