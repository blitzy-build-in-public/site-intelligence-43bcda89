/**
 * The assistant's refusal, rendered as data: the policy that blocked a question, the reason that
 * policy gave, the model it does permit, the policy event the refusal recorded, and the single
 * control that takes the permitted model.
 *
 * This component reports an outcome and decides nothing. `src/services/mock/mock-backend.ts`
 * evaluates `src/domain/policy/evaluate.ts` before it composes any answer and throws a `Problem`
 * whose `type` is `'policy'`, carrying `policyId`, `message`, `permittedAlternative` and
 * `auditEventId` (AAP 0.6.3, AAP 0.12.3 `POST /assistant/queries`). Every value on this card
 * therefore arrives as a prop and is rendered exactly as the service supplied it, so the card cannot
 * disagree with the decision that was taken, and no policy identifier, model identifier, event
 * identifier, amount or date is typed into this file (rule P-6). The switch is a callback the
 * holding panel performs through the service; nothing here contacts a model, holds an address or
 * reads a record (rules B-1, B-2, P-2).
 *
 * The `permission` cause is delegated whole to `ForbiddenCard`, so the folder has one renderer for a
 * denial and the two explanations cannot drift apart. Every remaining cause shares one compact
 * failure region: the reason the service gave, the correlation identifier a reader can quote, and a
 * retry the caller supplies. A retry the caller did not supply is not rendered at all, and the
 * switch is not rendered when the failing policy names no alternative, because a control that can
 * never act must not exist (rule P-8).
 *
 * Wording. The card speaks only of what the policy declares: the rule that denied the question, the
 * model the rule permits, and the event the denial recorded. A denial decided in a browser page is a
 * demonstration of the declared policy set rather than production authorisation (rules P-1, P-3), so
 * no sentence here states a capability the demonstration does not implement (rule P-4).
 *
 * Both controls are `ActionButton`s, so each is keyboard operable, carries the theme's focus ring and
 * meets the 24x24 px minimum target (rule B-3). Colours are role utilities of
 * `src/theme/tokens.css` alone, which is what lets both themes paint the values the specification
 * measured, and the card declares no transition, leaving the reduced-motion clause of rule B-3 with
 * nothing to opt out of.
 */
import type { ReactElement } from 'react';

import { Card } from '../../components/card';
import { ForbiddenCard } from '../../components/forbidden-card';
import { MonoValue } from '../../components/mono-value';
import { StatusIndicator } from '../../components/status-indicator';
import { ActionButton } from '../../components/tooltip';
import type { Problem } from '../../services/site-intelligence-service';

/**
 * What the assistant panel hands the refusal card: the `Problem` the service threw, and the two
 * handlers a cause may offer — the one-click switch to the model the policy permits, and a retry. The
 * card reads the cause from the `Problem` itself rather than being told it, so a caller cannot render
 * one that disagrees with the decision taken; the retry is the handler a caller may omit, and its
 * absence removes that control rather than leaving one that cannot act (rule P-8).
 */
export interface PolicyBlockCardProps {
  /**
   * The refusal exactly as the service threw it. Its `type` selects the rendering, its `message` is
   * always shown, and the optional evidence members are shown when the failing cause carries them.
   */
  readonly problem: Problem;

  /**
   * What the one-click switch does: select the in-boundary model the denying policy permits, so the
   * question can be asked again within the boundary the policy allows. The holding panel performs
   * that change through the service; this component only reports the activation.
   */
  readonly onSwitchToInBoundary: () => void;

  /**
   * What a retry does, for the causes that are neither a policy block nor a permission denial.
   * Optional: when it is absent the retry control is not rendered, because a control that can never
   * act must not exist (rule P-8).
   */
  readonly onRetry?: (() => void) | undefined;
}

/** The policy card's heading, and the one place its wording is written. */
const POLICY_TITLE = 'Blocked by policy';

/** The heading of the region that reports every cause other than a policy block or a denial. */
const FAILURE_TITLE = 'Request not completed';

/**
 * The status label when the denying policy permits another model: the question can still be answered
 * once that model is selected, so the block is a warning with a control beside it.
 */
const ALTERNATIVE_PERMITTED_LABEL = 'Blocked; the policy permits another model';

/** The status label when the policy permits no alternative: nothing here can be acted on. */
const NO_ALTERNATIVE_LABEL = 'Blocked; the policy permits no alternative';

/**
 * The switch's label: it states that it selects the in-boundary model, which is the alternative such
 * a policy permits (AAP 0.12.4). The identifier of that model is shown in the field row above rather
 * than repeated in the label, so the record value appears once on the card.
 */
const SWITCH_LABEL = 'Switch to the in-boundary model';

/** The retry control's label, rendered only when the caller supplied a handler for it. */
const RETRY_LABEL = 'Retry';

/** The caption of the denying policy's identifier. */
const POLICY_CAPTION = 'Policy';

/** The caption of the model the denying policy permits. */
const ALTERNATIVE_CAPTION = 'Permitted alternative';

/** The caption of the policy event the refusal itself appended. */
const AUDIT_EVENT_CAPTION = 'Recorded policy event';

/** The caption of the correlation identifier a reader quotes when reporting the refusal. */
const TRACE_ID_CAPTION = 'Trace ID';

/** The card's content column: one vertical stack, so no child needs a margin of its own. */
const BODY_CLASSES = 'flex min-w-0 flex-col gap-3';

/** The reason in the primary text role at body size, wrapping rather than overflowing its card. */
const REASON_CLASSES = 'min-w-0 break-words text-14 text-text-primary';

/**
 * The field block: one row per member the failure carries. A `<dl>` rather than a list of
 * paragraphs, because every row is a name and its value, which is the pairing that element exists to
 * express and the pairing a screen reader announces as such.
 */
const FIELD_LIST_CLASSES = 'flex min-w-0 flex-col gap-1 text-13';

/**
 * One field row. Each row is a `div` grouping its own term and description, which is the grouping
 * HTML allows inside a `<dl>`; caption and value share a baseline where they fit and wrap onto two
 * lines where they do not.
 */
const FIELD_ROW_CLASSES = 'flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1';

/** The caption sits one size below the value and in the caption text role. */
const FIELD_CAPTION_CLASSES = 'text-12 text-text-caption';

/** The description keeps the primary text role, so the value is the most legible thing in the row. */
const FIELD_VALUE_CLASSES = 'min-w-0 text-text-primary';

/** A value meant to be quoted selects as a whole, so one double click takes the identifier. */
const FIELD_VALUE_SELECT_CLASSES = 'select-all break-words';

/** The row that holds a control, which this component places and does not draw itself. */
const ACTION_ROW_CLASSES = 'flex flex-wrap items-center gap-2';

/** The two strings one {@link Field} row renders. */
interface FieldProps {
  /** The name the row is filed under, in the caption text role. */
  readonly caption: string;
  /** The record value the service supplied, rendered in the mono face with tabular numerals. */
  readonly value: string;
}

/**
 * Renders one caption-and-value row of the field block.
 *
 * The value passes through `MonoValue` with `kind="id"`, which is the application's single
 * presentation formatter, so an identifier reads in the same face here as in a table cell and is
 * never reformatted on its way to the screen (rule P-6). Nothing here is interactive.
 */
function Field({ caption, value }: FieldProps): ReactElement {
  return (
    <div className={FIELD_ROW_CLASSES}>
      <dt className={FIELD_CAPTION_CLASSES}>{caption}</dt>
      <dd className={FIELD_VALUE_CLASSES}>
        <MonoValue value={value} kind="id" className={FIELD_VALUE_SELECT_CLASSES} />
      </dd>
    </div>
  );
}

/** The members {@link PolicyDenialCard} renders, all of them read from the `Problem`. */
interface PolicyDenialCardProps {
  /** The `'policy'` refusal. Only its policy members are read here. */
  readonly problem: Problem;
  /** The one-click switch to the in-boundary model, forwarded from {@link PolicyBlockCardProps}. */
  readonly onSwitchToInBoundary: () => void;
}

/**
 * Renders the policy block: what denied the question, why, the model it permits, the event it
 * recorded, and the switch to that model.
 *
 * A policy failure that arrived without one of its optional evidence members renders the rows it
 * carries and nothing for the rest, rather than an invented value or a blank placeholder: the two
 * identifiers and the alternative are evidence the service either supplied or did not (rule P-6).
 */
function PolicyDenialCard({ problem, onSwitchToInBoundary }: PolicyDenialCardProps): ReactElement {
  const { message, traceId, policyId, auditEventId } = problem;
  const alternative = problem.permittedAlternative?.trim() ?? '';
  const hasAlternative = alternative.length > 0;

  return (
    <Card title={POLICY_TITLE}>
      <div className={BODY_CLASSES}>
        {/* A permitted alternative makes the block a warning, because the question is answerable on
            the model the policy allows; with no alternative there is nothing left to switch to, so
            the same block is a fail. */}
        <StatusIndicator
          meaning={hasAlternative ? 'warning' : 'fail'}
          label={hasAlternative ? ALTERNATIVE_PERMITTED_LABEL : NO_ALTERNATIVE_LABEL}
        />
        <p className={REASON_CLASSES}>{message}</p>
        <dl className={FIELD_LIST_CLASSES}>
          {policyId === undefined ? null : <Field caption={POLICY_CAPTION} value={policyId} />}
          {hasAlternative ? <Field caption={ALTERNATIVE_CAPTION} value={alternative} /> : null}
          {auditEventId === undefined ? null : (
            <Field caption={AUDIT_EVENT_CAPTION} value={auditEventId} />
          )}
          <Field caption={TRACE_ID_CAPTION} value={traceId} />
        </dl>
        {hasAlternative ? (
          <div className={ACTION_ROW_CLASSES}>
            <ActionButton variant="primary" onClick={onSwitchToInBoundary}>
              {SWITCH_LABEL}
            </ActionButton>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

/** The members {@link FailureRegion} renders. */
interface FailureRegionProps {
  /** The refusal. Only the reason and the correlation identifier are read here. */
  readonly problem: Problem;
  /** The caller's retry, or `undefined` when the caller offers none. */
  readonly onRetry: (() => void) | undefined;
}

/**
 * Renders every cause other than a policy block or a permission denial: a request refused on the
 * state of the records, a failed simulated write-back, or an identifier with no record behind it.
 *
 * The region shows the reason the service gave and the identifier a reader quotes, both of which
 * every `Problem` carries, and the caller's retry when there is one. It also carries the permission
 * denial whose `requiredPermission` or `rolesWithPermission` is missing, which `ForbiddenCard`
 * cannot render: the reason still names what was refused, so the reader is told something true
 * rather than shown a card with a hole where the permission belongs.
 */
function FailureRegion({ problem, onRetry }: FailureRegionProps): ReactElement {
  return (
    <Card title={FAILURE_TITLE}>
      <div className={BODY_CLASSES}>
        <p className={REASON_CLASSES}>{problem.message}</p>
        <dl className={FIELD_LIST_CLASSES}>
          <Field caption={TRACE_ID_CAPTION} value={problem.traceId} />
        </dl>
        {onRetry === undefined ? null : (
          <div className={ACTION_ROW_CLASSES}>
            <ActionButton onClick={onRetry}>{RETRY_LABEL}</ActionButton>
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Renders one service refusal as the card that explains it.
 *
 * The `switch` below has no `default` arm on purpose. Its five cases are the five causes
 * `ProblemType` declares, and the function's return type is `ReactElement`, so a sixth cause added
 * to that union makes this component fail to type-check instead of falling into a region that was
 * never designed for it.
 *
 * @param props The refusal, the switch to the model a policy permits, and an optional retry. See
 *   {@link PolicyBlockCardProps}.
 * @returns The forbidden card for a permission denial, the policy block for a policy denial, and the
 *   compact failure region for every other cause.
 */
export function PolicyBlockCard({
  problem,
  onSwitchToInBoundary,
  onRetry,
}: PolicyBlockCardProps): ReactElement {
  switch (problem.type) {
    case 'permission': {
      const { requiredPermission, rolesWithPermission } = problem;

      /* Both members are optional on `Problem`, and `ForbiddenCard` cannot render a denial without
         them. A denial that carries both is delegated whole, and nothing is rendered beside it
         because that card already names the permission, the roles that hold it and the trace id. */
      if (requiredPermission !== undefined && rolesWithPermission !== undefined) {
        return (
          <ForbiddenCard
            permission={requiredPermission}
            roles={rolesWithPermission}
            reason={problem.message}
            traceId={problem.traceId}
          />
        );
      }

      return <FailureRegion problem={problem} onRetry={onRetry} />;
    }

    case 'policy':
      return <PolicyDenialCard problem={problem} onSwitchToInBoundary={onSwitchToInBoundary} />;

    case 'validation':
    case 'simulated-write-back':
    case 'not-found':
      return <FailureRegion problem={problem} onRetry={onRetry} />;
  }
}
