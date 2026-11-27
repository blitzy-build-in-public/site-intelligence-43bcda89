/**
 * The assistant's model selector: the control that names which catalogue model an answer to a
 * question would be composed for.
 *
 * It presents the `ModelCatalogue` the service supplies and reports the entry the reader chose
 * upward through `onSelect`. It evaluates no policy, reads no record, holds no copy of the selection
 * and contacts no model: whether an answer may be composed for the chosen entry is decided by the
 * service before any answer exists, which is why the assistant's block card can offer the
 * in-boundary entry as a one-click switch — this control only makes that entry selectable.
 *
 * `src/types/models.ts` owns the whole vocabulary. `ModelBoundary` supplies the two boundary words
 * this control renders verbatim rather than paraphrasing, and `ModelEntry` supplies the identifier,
 * the label and the version. Nothing of that vocabulary is typed here, so a catalogue record that
 * changes reaches the interface unchanged (rule P-6).
 *
 * The boundary is declared configuration: it is the value the service's policy check reads, and it
 * says where an answer would be composed rather than that one was. The control therefore renders
 * no connection state, no endpoint and no provider — the external entry is a catalogue entry, not a
 * destination.
 *
 * The catalogue carries no per-entry availability member (recorded as an open item in
 * `src/types/models.ts`), so an individually unavailable entry is not expressible by the current
 * contract. The only disabling this control expresses is its `disabled` prop, and the field's
 * explanation of that state is rendered as text beside the control rather than as a hint that only
 * a pointer reveals.
 */
import { useId } from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { ModelCatalogue, ModelEntry } from '../../types';

/** The props of {@link ModelSelector}. */
export interface ModelSelectorProps {
  /**
   * The catalogue to present, in the order the service serves it. Every option is one of its
   * entries; the component adds, removes and reorders none of them.
   */
  readonly catalogue: ModelCatalogue;
  /**
   * Identifier of the entry currently selected. The control is fully controlled: it renders this
   * value and applies no default of its own, so the caller owns the selection and the answer that
   * follows from it.
   */
  readonly selectedModelId: string;
  /**
   * Called with the identifier of the entry the reader chose. The component does nothing else on a
   * change — no local copy of the selection and no optimistic state.
   */
  readonly onSelect: (modelId: string) => void;
  /**
   * Whether the reader may choose at all. `true` disables every option and paints the explanation
   * from {@link ModelSelectorProps.disabledReason}.
   */
  readonly disabled?: boolean | undefined;
  /**
   * The reason the control cannot act, in the words the calling screen owes the reader (rule P-8).
   * Required whenever `disabled` is `true`: a control that cannot act carries a text explanation or
   * is not rendered at all. Ignored while the control can act.
   */
  readonly disabledReason?: string | undefined;
}

/**
 * The name of the group, and of the control inside it. One constant, because the `<legend>` paints
 * it and the `<select>` takes its accessible name from that same element.
 */
const CONTROL_NAME = 'Answer model';

/** The fieldset is the control's box in the calling screen's layout; it adds no surface of its own. */
const FIELD_SET_CLASSES = 'min-w-0';

/** The legend names the group and sits in the caption text role, above the control. */
const LEGEND_CLASSES = 'mb-1 p-0 text-12 font-medium text-text-secondary';

/**
 * The control itself: role tokens only — `rounded-control` for the 2 px radius,
 * `--color-control-boundary` for its edge, the first raised surface behind it, and the type scale's
 * 13 px in the primary text role. `min-h-6` is the 24x24 px target rule B-3 sets, and `w-full` lets
 * it fill the panel it sits in. No raw palette value, no arbitrary value and no opacity appears
 * here, because dimming a label is exactly how contrast falls below the ratio the rule requires.
 *
 * The focus ring is the 2 px `--color-focus-ring` role, drawn on `focus-visible` so a pointer click
 * leaves none behind while a keyboard user never loses the indicator. The pointer is answered as
 * well: `hover:` lifts the boundary to the accent role, the state the secondary control and the
 * simulated-data badge carry, and the resting boundary and surface are untouched, so the picker looks
 * exactly as it did until a pointer reaches it. A control that cannot act answers neither state:
 * `disabled:hover:` re-asserts the resting boundary over the hover, the same stacking the disabled
 * action uses with `aria-disabled:`, so pointing at a picker that cannot act leaves it looking inert.
 * `motion-safe:` gates the colour transition, so a reduced-motion session gets the same hover with no
 * transition (rule B-3).
 */
const SELECT_CLASSES = [
  'block w-full min-h-6 rounded-control border border-control-boundary px-2 py-1',
  'bg-surface-1 text-13 text-text-primary hover:border-accent',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
  'motion-safe:transition-colors motion-safe:duration-150',
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-text-secondary',
  'disabled:hover:border-control-boundary',
].join(' ');

/** The explanation of a control that cannot act: plain text, not a hint behind a hover. */
const REASON_CLASSES = 'mt-1 text-12 text-text-caption';

/**
 * The entry's printable designation: its record label, followed by the version the record declares
 * when the label does not already end with it.
 *
 * Both strings come from the record, never from this file (rule P-6). The repetition is skipped
 * because the seeded catalogue sets `label` to the whole designation and `version` to that
 * designation's trailing suffix, so appending unconditionally would print the suffix twice in every
 * option. A record whose label omits the version gets it appended, which is what `ModelEntry`
 * documents `version` for.
 */
function designationOf(entry: ModelEntry): string {
  const label = entry.label.trim();
  const version = entry.version.trim();

  if (version.length === 0 || label.endsWith(version)) {
    return label;
  }

  return `${label} ${version}`;
}

/**
 * The text one option carries: the entry's designation and its boundary, both as the record
 * supplies them.
 *
 * The boundary is rendered verbatim (`in-boundary` or `external`) rather than mapped to friendlier
 * prose, so the word a reader sees is the word the type declares and the value the service's policy
 * check reads. It sits inside the option text, which is the one place a reader comparing catalogue
 * entries can see which of them leaves the boundary without opening anything else.
 */
function optionTextOf(entry: ModelEntry): string {
  return `${designationOf(entry)} — ${entry.boundary}`;
}

/**
 * Renders the model catalogue as one labelled list, and reports the chosen entry upward.
 *
 * A `<fieldset>` with a `<legend>` names the group, and a single native `<select>` inside it offers
 * the entries. The native control is chosen over the application's `ActionButton` pattern for the
 * reason that pattern exists: a button commits one action, while this control offers a list, and the
 * browser's own list keeps every entry reachable by keyboard and by a screen reader's forms mode.
 *
 * A disabled `<select>` takes the native `disabled` attribute rather than the `aria-disabled`
 * treatment `ActionButton` uses, because a select's popup cannot be made inert by an attribute:
 * leaving the element operable and discarding the change would announce a control that lies about
 * its state. Rule P-8's explanation is therefore painted as visible text beside the control for as
 * long as it cannot act, and bound to it with `aria-describedby` so it is the field's description in
 * the accessibility tree rather than a hint that only a pointer reveals.
 *
 * @param props The catalogue, the selected identifier, the change handler and the disabled state
 *   with its reason. See {@link ModelSelectorProps}.
 * @returns The named field, or `null` when there is nothing this control could act on: an empty
 *   catalogue, and a disabled field whose explanation was left out — rule P-8 forbids rendering a
 *   control that can never act, and forbids rendering a disabled one without its explanation.
 */
export function ModelSelector({
  catalogue,
  selectedModelId,
  onSelect,
  disabled,
  disabledReason,
}: ModelSelectorProps): ReactElement | null {
  const legendId = useId();
  const reasonId = useId();

  const cannotAct = disabled === true;
  const reason = disabledReason?.trim() ?? '';
  const explainsItself = reason.length > 0;

  /* Nothing to choose from. The calling panel owns the states of the query that fills the
     catalogue, so an empty catalogue is not this component's state to paint; it renders no control
     rather than a list with no entries (rule P-8). */
  if (catalogue.models.length === 0) {
    return null;
  }

  /* Disabled without an explanation: the caller left out the sentence rule P-8 requires, and an
     unexplained dead control must not reach the reader, so neither does this one. */
  if (cannotAct && !explainsItself) {
    return null;
  }

  const handleChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    onSelect(event.currentTarget.value);
  };

  return (
    <fieldset className={FIELD_SET_CLASSES}>
      <legend id={legendId} className={LEGEND_CLASSES}>
        {CONTROL_NAME}
      </legend>
      <select
        className={SELECT_CLASSES}
        aria-labelledby={legendId}
        aria-describedby={cannotAct ? reasonId : undefined}
        value={selectedModelId}
        disabled={cannotAct}
        onChange={handleChange}
      >
        {catalogue.models.map((entry) => (
          <option key={entry.id} value={entry.id}>
            {optionTextOf(entry)}
          </option>
        ))}
      </select>
      {cannotAct ? (
        <p id={reasonId} className={REASON_CLASSES}>
          {reason}
        </p>
      ) : null}
    </fieldset>
  );
}
