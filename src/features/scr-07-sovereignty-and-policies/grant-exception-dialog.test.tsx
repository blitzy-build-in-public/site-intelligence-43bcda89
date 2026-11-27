/**
 * Component suite for `grant-exception-dialog.tsx`, SCR-07's "Grant time-boxed exception" flow.
 *
 * Every case asserts a contract the dialog is relied on for rather than its markup: the three terms
 * SCR-07 fixes each reached through its own programmatic label; a modal dialog named by its own
 * heading; focus moving into the first field on open, staying inside the dialog in both directions and
 * returning to the element that opened it; `Esc` and Cancel closing it without a call; the exact
 * request the port receives, once, with the reason trimmed and the expiry as the instant the port's
 * signature takes; the disabled submit naming each blocker in turn (rule P-8); the failed call keeping
 * the dialog open with the `Problem`'s own message and the members it carries; the in-flight state
 * refusing a second send and a withdrawal; `Enter` inside the reason field inserting a line break
 * rather than sending; and both themes rendering the same dialog.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary the component is allowed to read
 * through (rule P-2), so no seed module, adapter or query cache is involved and the suite observes
 * exactly the call the dialog makes. Every identifier below is an opaque placeholder rather than a
 * record shape, and every date is derived from the imported `DEMO_CLOCK` constant rather than typed,
 * because the `no-typed-figures` source check reads this folder (rule P-6); the permission and role
 * vocabulary is the contracts' own and is typed as such, which is what makes the fixture valid data.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock or touches the network.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK } from '../../types';
import type { Permission, PolicyException, Problem, Result, Role } from '../../types';
import { GRANT_EXCEPTION_DIALOG_TEXT as TEXT, GrantExceptionDialog } from './grant-exception-dialog';
import type { GrantExceptionApprover } from './grant-exception-dialog';

/**
 * The port member the dialog sends its request through, replaced before the component module is
 * imported so the real provider — and with it the in-browser adapter and its seeded records — is never
 * reached in a component test (rule P-2).
 */
const requestPolicyException = vi.hoisted(() => vi.fn());

vi.mock('../../services/service-provider', () => ({
  useService: () => ({ requestPolicyException }),
}));

/** Both themes of specification §4.1, as the `data-theme` values the theme layer keys on. */
const THEMES = ['command', 'paper'] as const;

/** The policy the request is made against: an opaque placeholder, not a record-identifier shape. */
const POLICY_ID = 'policy-under-test';

/** The policy's display label, which the caller supplies from the record (rule P-6). */
const POLICY_LABEL = 'Model routing policy';

/** One persona the caller offers as the second approver; identifiers stay opaque for the figure scan. */
const APPROVER_ALPHA: GrantExceptionApprover = { id: 'approver-alpha', name: 'Approver Alpha' };

/** A second offered persona, so the select is exercised with more than one option. */
const APPROVER_BETA: GrantExceptionApprover = { id: 'approver-beta', name: 'Approver Beta' };

/** The candidates a caller supplies by default. */
const APPROVERS: readonly GrantExceptionApprover[] = [APPROVER_ALPHA, APPROVER_BETA];

/** The reason as a reader types it, with the padding the dialog must trim before sending it. */
const REASON = '  The pack holds a release the deployment cannot read.  ';

/** The reason as the port must receive it: the same sentence without its padding. */
const TRIMMED_REASON = REASON.trim();

/**
 * A date later than the demonstration clock's date, derived from the clock rather than typed: the same
 * month and day one year on, which no calendar can place before the clock.
 */
const LATER_DATE = `${Number(DEMO_CLOCK.slice(0, 4)) + 1}${DEMO_CLOCK.slice(4, 10)}`;

/** The instant the port must receive for {@link LATER_DATE}: the start of that date, in the clock's offset. */
const LATER_INSTANT = `${LATER_DATE}T00:00:00${DEMO_CLOCK.slice(-6)}`;

/** The demonstration clock's own date, which is not *after* the clock and must be refused. */
const CLOCK_DATE = DEMO_CLOCK.slice(0, 10);

/** The permission a `'permission'` refusal names, from the contracts §7.1 vocabulary. */
const REQUIRED_PERMISSION: Permission = 'policy.exception.request';

/** The roles that hold it, which the refusal carries so the dialog can name them. */
const ROLES_WITH_PERMISSION: Role[] = ['platform-administrator'];

/** The persona the request is recorded as made by, which the adapter supplies in the real flow. */
const REQUESTER = 'requester-alpha';

/** The correlation identifier every `Result` and `Problem` carries. */
const TRACE_ID = 'trace-grant-exception';

/** What the dialog shows when a call did not record the request. */
type SubmitFailureShape = Problem;

/** A promise a case settles by hand, so the in-flight state can be observed while it is true. */
interface Deferred<T> {
  /** What the call returns until it is settled. */
  readonly promise: Promise<T>;
  /** Settles the call with a value. */
  readonly resolve: (value: T) => void;
  /** Settles the call with a failure. */
  readonly reject: (reason: unknown) => void;
}

/** Builds one hand-settled promise. */
function deferred<T>(): Deferred<T> {
  let resolve: (value: T) => void = () => {
    /* replaced by the executor below before this value can be observed */
  };
  let reject: (reason: unknown) => void = () => {
    /* replaced by the executor below before this value can be observed */
  };
  const promise = new Promise<T>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });

  return { promise, resolve, reject };
}

/** The envelope every port call resolves to. */
function envelope<T>(data: T): Result<T> {
  return { data, meta: { freshness: [], simulated: true, traceId: TRACE_ID } };
}

/** The pending request the adapter returns for the terms this suite submits. */
function recordedException(): PolicyException {
  return {
    policyId: POLICY_ID,
    reason: TRIMMED_REASON,
    expiresAt: LATER_INSTANT,
    requestedBy: REQUESTER,
    secondApproverId: APPROVER_ALPHA.id,
    status: 'pending',
  };
}

/** The props a case may vary. */
interface DialogOptions {
  /** What closing the dialog does; a spy by default. */
  readonly onClose?: () => void;
  /** What a recorded request is handed to. */
  readonly onSubmitted?: (created: PolicyException) => void;
  /** The personas the caller offers as the second approver. */
  readonly secondApprovers?: readonly GrantExceptionApprover[];
}

/** Renders the dialog with the defaults a case does not override. */
function renderDialog(options: DialogOptions = {}): void {
  render(
    <GrantExceptionDialog
      policyId={POLICY_ID}
      policyLabel={POLICY_LABEL}
      onClose={options.onClose ?? (() => undefined)}
      onSubmitted={options.onSubmitted}
      secondApprovers={options.secondApprovers ?? APPROVERS}
    />,
  );
}

/**
 * A host that opens the dialog from its own control, which is what makes the focus-return case
 * observable: the opener only exists while the dialog is closed.
 */
function DialogHarness({
  onClose,
  onSubmitted,
}: {
  readonly onClose: () => void;
  readonly onSubmitted: (created: PolicyException) => void;
}): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Open the grant dialog
      </button>
      {isOpen ? (
        <GrantExceptionDialog
          policyId={POLICY_ID}
          policyLabel={POLICY_LABEL}
          secondApprovers={APPROVERS}
          onClose={() => {
            setIsOpen(false);
            onClose();
          }}
          onSubmitted={onSubmitted}
        />
      ) : null}
    </div>
  );
}

/** Fills the three terms so the submit can act. */
async function completeTerms(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText(TEXT.reasonLabel), REASON);
  fireEvent.change(screen.getByLabelText(TEXT.expiryLabel), { target: { value: LATER_DATE } });
  await user.selectOptions(screen.getByLabelText(TEXT.approverLabel), APPROVER_ALPHA.id);
}

/**
 * The text of every element a control's `aria-describedby` points at.
 *
 * `ActionButton` hands a disabled control's reason to the `Tooltip` around it, which appends its own
 * hint id to whatever description the button already carried; reading the referenced elements is how
 * the suite proves the reason is in the accessibility tree rather than only in the hint that shows on
 * hover or focus.
 */
function describedText(element: HTMLElement): string {
  const ids = element.getAttribute('aria-describedby') ?? '';

  return ids
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ');
}

beforeEach(() => {
  requestPolicyException.mockReset();
  requestPolicyException.mockResolvedValue(envelope(recordedException()));
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});

describe('GrantExceptionDialog', () => {
  it('renders a modal dialog named by its own heading, with the policy it is requested against', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(within(dialog).getByRole('heading', { name: TEXT.heading })).toBeInTheDocument();
    expect(within(dialog).getByText(POLICY_LABEL, { exact: false })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(TEXT.summary);
  });

  it('labels the three terms the flow requires and hangs a message on each of them', () => {
    renderDialog();

    const reason = screen.getByLabelText(TEXT.reasonLabel);
    const expiry = screen.getByLabelText(TEXT.expiryLabel);
    const approver = screen.getByLabelText(TEXT.approverLabel);

    expect(reason.tagName).toBe('TEXTAREA');
    expect(expiry).toHaveAttribute('type', 'date');
    expect(approver.tagName).toBe('SELECT');

    for (const field of [reason, expiry, approver]) {
      expect(field).toHaveAttribute('aria-required', 'true');
      expect(describedText(field).length).toBeGreaterThan(0);
    }

    expect(approver).toHaveAccessibleDescription(TEXT.approverRequired);
    expect(within(approver).getByRole('option', { name: TEXT.approverPlaceholder })).toBeInTheDocument();
    for (const candidate of APPROVERS) {
      const label = `${candidate.name} (${candidate.id})`;

      expect(within(approver).getByRole('option', { name: label })).toBeInTheDocument();
    }
  });

  it('carries the fixed simulated-control label, because the flow is a demonstration control', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });

    expect(within(dialog).getByText('Simulated control')).toBeInTheDocument();
  });

  it('moves focus into the first field as it opens', () => {
    renderDialog();

    expect(screen.getByLabelText(TEXT.reasonLabel)).toHaveFocus();
  });

  it('keeps Tab inside the dialog in both directions', async () => {
    const user = userEvent.setup();
    renderDialog();

    const reason = screen.getByLabelText(TEXT.reasonLabel);
    const submit = screen.getByRole('button', { name: TEXT.submit });

    expect(reason).toHaveFocus();

    await user.tab({ shift: true });
    expect(submit).toHaveFocus();

    await user.tab();
    expect(reason).toHaveFocus();
  });

  it('sends one request with the three terms, then hands the record on and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmitted = vi.fn();
    renderDialog({ onClose, onSubmitted });

    await completeTerms(user);
    await user.click(screen.getByRole('button', { name: TEXT.submit }));

    expect(requestPolicyException).toHaveBeenCalledTimes(1);
    expect(requestPolicyException).toHaveBeenCalledWith({
      policyId: POLICY_ID,
      reason: TRIMMED_REASON,
      expiresAt: LATER_INSTANT,
      secondApproverId: APPROVER_ALPHA.id,
    });
    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(onSubmitted).toHaveBeenCalledWith(recordedException());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on Escape without sending anything and returns focus to the element that opened it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<DialogHarness onClose={onClose} onSubmitted={vi.fn()} />);

    const opener = screen.getByRole('button', { name: 'Open the grant dialog' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: TEXT.heading })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(requestPolicyException).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(opener).toHaveFocus();
  });

  it('closes on Cancel without sending anything', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });

    await completeTerms(user);
    await user.click(screen.getByRole('button', { name: TEXT.cancel }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(requestPolicyException).not.toHaveBeenCalled();
  });

  it('does not send when Enter is pressed inside the reason field', async () => {
    const user = userEvent.setup();
    renderDialog();

    await completeTerms(user);

    const reason = screen.getByLabelText(TEXT.reasonLabel);
    await user.type(reason, '{Enter}');

    expect(requestPolicyException).not.toHaveBeenCalled();
    expect(reason).toHaveValue(`${REASON}\n`);
  });

  it('disables the submit with the sentence for the first term still missing, and each next one after it', async () => {
    const user = userEvent.setup();
    renderDialog();

    const submit = screen.getByRole('button', { name: TEXT.submit });

    expect(submit).toHaveAttribute('aria-disabled', 'true');
    expect(describedText(submit)).toContain(TEXT.reasonRequired);

    await user.click(submit);
    expect(requestPolicyException).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText(TEXT.reasonLabel), REASON);
    expect(describedText(submit)).toContain(TEXT.expiryRequired);

    fireEvent.change(screen.getByLabelText(TEXT.expiryLabel), { target: { value: CLOCK_DATE } });
    expect(describedText(submit)).toContain(TEXT.expiryNotAfterClock);
    expect(screen.getByLabelText(TEXT.expiryLabel)).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(screen.getByLabelText(TEXT.expiryLabel), { target: { value: LATER_DATE } });
    expect(describedText(submit)).toContain(TEXT.approverRequired);

    await user.selectOptions(screen.getByLabelText(TEXT.approverLabel), APPROVER_BETA.id);

    /* Re-queried rather than read from the node above: a disabled `ActionButton` is wrapped in the
       hint that carries its reason and an enabled one is not, so the element that can act is a new
       element and the captured one is the node that was just replaced. */
    expect(screen.getByRole('button', { name: TEXT.submit })).not.toHaveAttribute('aria-disabled');
  });

  it('names the missing capability rather than leaving a dead submit when no approver is offered', async () => {
    const user = userEvent.setup();
    renderDialog({ secondApprovers: [] });

    const approver = screen.getByLabelText(TEXT.approverLabel);

    expect(approver).toHaveAccessibleDescription(TEXT.noApproverOffered);
    expect(within(approver).queryAllByRole('option')).toHaveLength(1);

    await user.type(screen.getByLabelText(TEXT.reasonLabel), REASON);
    fireEvent.change(screen.getByLabelText(TEXT.expiryLabel), { target: { value: LATER_DATE } });

    /* With the two terms a reader can fill in filled in, the submit's own reason is the missing read,
       which is what rule P-8 requires of a control that cannot act. */
    const submit = screen.getByRole('button', { name: TEXT.submit });

    expect(submit).toHaveAttribute('aria-disabled', 'true');
    expect(describedText(submit)).toContain(TEXT.noApproverOffered);
  });

  it('keeps the dialog open with the Problem it caught, and lets the submit act again', async () => {
    const user = userEvent.setup();
    const refusal: SubmitFailureShape = {
      type: 'permission',
      message: 'Requesting a time-boxed exception needs a permission the acting persona does not hold.',
      traceId: TRACE_ID,
      requiredPermission: REQUIRED_PERMISSION,
      rolesWithPermission: ROLES_WITH_PERMISSION,
    };
    requestPolicyException.mockRejectedValue(refusal);
    const onClose = vi.fn();
    renderDialog({ onClose });

    await completeTerms(user);
    const submit = screen.getByRole('button', { name: TEXT.submit });
    await user.click(submit);

    const alert = await screen.findByRole('alert');

    expect(screen.getByRole('dialog', { name: TEXT.heading })).toBeInTheDocument();
    expect(alert).toHaveTextContent(TEXT.failureTitle);
    expect(alert).toHaveTextContent(refusal.message);
    expect(alert).toHaveTextContent(REQUIRED_PERMISSION);
    expect(alert).toHaveTextContent(ROLES_WITH_PERMISSION.join(', '));
    expect(alert).toHaveTextContent(TRACE_ID);
    expect(onClose).not.toHaveBeenCalled();
    expect(submit).not.toHaveAttribute('aria-disabled');
  });

  it('reports a throw that is not the service Problem shape rather than swallowing it', async () => {
    const user = userEvent.setup();
    requestPolicyException.mockRejectedValue(new Error('the adapter stopped'));
    renderDialog();

    await completeTerms(user);
    await user.click(screen.getByRole('button', { name: TEXT.submit }));

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent(TEXT.unreportedFailure);
    expect(alert).not.toHaveTextContent('the adapter stopped');
  });

  it('holds the request open while it is in flight and refuses to withdraw it', async () => {
    const user = userEvent.setup();
    const pending = deferred<Result<PolicyException>>();
    requestPolicyException.mockReturnValue(pending.promise);
    const onClose = vi.fn();
    renderDialog({ onClose });

    await completeTerms(user);
    await user.click(screen.getByRole('button', { name: TEXT.submit }));

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });
    const submit = screen.getByRole('button', { name: TEXT.submit });
    const cancel = screen.getByRole('button', { name: TEXT.cancel });

    expect(dialog).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(TEXT.busy);
    expect(submit).toHaveAttribute('aria-disabled', 'true');
    expect(describedText(submit)).toContain(TEXT.submitInFlight);
    expect(cancel).toHaveAttribute('aria-disabled', 'true');
    expect(describedText(cancel)).toContain(TEXT.cancelInFlight);

    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
    expect(requestPolicyException).toHaveBeenCalledTimes(1);

    pending.resolve(envelope(recordedException()));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it.each(THEMES)('renders the same dialog under the %s theme', (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });

    expect(within(dialog).getByLabelText(TEXT.reasonLabel)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: TEXT.submit })).toBeInTheDocument();
  });
});
