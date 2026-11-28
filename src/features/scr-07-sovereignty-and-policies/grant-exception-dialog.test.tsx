/**
 * Component suite for `grant-exception-dialog.tsx`, SCR-07's "Grant time-boxed exception" flow.
 *
 * Every case asserts a contract the dialog is relied on for rather than its markup: the three terms
 * SCR-07 fixes each reached through its own programmatic label; a modal dialog named by its own
 * heading; focus moving into the first field on open, staying inside the dialog in both directions and
 * returning to the element that opened it; `Esc` and Cancel closing it without a call; the exact
 * request the port receives, once, with the reason trimmed and the expiry as the instant the port's
 * signature takes; the disabled submit naming every term still unmet, in the order the fields appear
 * (rule P-8); the failed call keeping
 * the dialog open with the `Problem`'s own message and the members it carries; the in-flight state
 * refusing a second send and a withdrawal; `Enter` inside the reason field inserting a line break
 * rather than sending; both themes rendering the same dialog; and, once a request is recorded, the
 * cache entries of the reads that write touched invalidated while an unrelated entry is not.
 *
 * The service is mocked at `service-provider.tsx`, the one boundary the component is allowed to read
 * through (rule P-2), so no seed module and no adapter is involved and the suite observes exactly the
 * call the dialog makes. Every render sits inside a `QueryClientProvider` holding a fresh client,
 * because the dialog invalidates the entries a recorded request moved (AAP 0.6.2): a case seeds the
 * keys it will inspect, acts, and then reads each entry's state off the client it rendered with. Every
 * identifier below is an opaque placeholder rather than a record shape, and every date is derived from
 * the imported `DEMO_CLOCK` constant rather than typed, because the `no-typed-figures` source check
 * reads this folder (rule P-6); the permission and role vocabulary is the contracts' own and is typed
 * as such, which is what makes the fixture valid data.
 *
 * WHAT EACH CASE WOULD CATCH. Every case is written to fail on one specific regression rather than to
 * describe the markup: a dropped `label` association fails the labelled-field queries; one generic
 * sentence standing in for the three blocker sentences fails the disabled-submit case, which reads the
 * explanation at each partial fill and asserts every outstanding sentence in it; a second
 * `requestPolicyException` call, or a reformatted term, fails the exact once-only payload assertions on
 * both the pointer and the keyboard path; a swallowed `Problem`
 * fails the failure case, which also keeps the dialog open with the submit usable again; a trap that
 * closes in one direction only, or a focus return that lands nowhere, fails the `Tab` and `Esc` cases;
 * an explanation that lives only under the pointer fails the focus case, which reads the reason off
 * the hint the keyboard brings up; and a sentence the component does not own — a claim, or a name the
 * fixture never supplied — fails the rendered-text case.
 *
 * WHAT THE CLAIM-VOCABULARY ASSERTION DOES NOT TYPE. This suite's checklist asks for an assertion
 * that the banned claim phrases of rule P-4 appear nowhere, and those phrases are deliberately not
 * written into this file: `tests/source-checks/forbidden-strings.test.ts` rejects them anywhere under
 * `src/` (AAP §0.9) and this folder sits inside that scan, so typing them here would turn the
 * project's own gate red to prove the dialog does not say them. The rendered-text case proves the
 * same property structurally — nothing is rendered that the component's own wording and the caller's
 * supplied values do not account for — and the banned vocabulary stays owned by the source check.
 *
 * Runs under the jsdom environment `vite.config.ts` sets by default; nothing here hashes, reads the
 * system clock or touches the network.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { QueryKey } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEMO_CLOCK, SIM_LABELS } from '../../types';
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

/**
 * The `Simulated control` label of specification §5.3, named once because the component holds it as a
 * private constant typed `SimLabel` and does not export it. The case below also ties the rendered tag
 * back to the fixed list, so a reworded label fails here too (rule P-1).
 */
const SIMULATED_CONTROL_LABEL = 'Simulated control';

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

/** The `Problem` a refused request throws, in the shape the port fails with (AAP 0.2.2). */
const REFUSAL: Problem = {
  type: 'permission',
  message: 'Requesting a time-boxed exception needs a permission the acting persona does not hold.',
  traceId: TRACE_ID,
  requiredPermission: REQUIRED_PERMISSION,
  rolesWithPermission: ROLES_WITH_PERMISSION,
};

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

/* ---------------------------------------------------------------------------------------------
 * The cache a recorded request invalidates — AAP 0.6.2
 * ------------------------------------------------------------------------------------------- */

/**
 * The reads a recorded request moves, each with the port member its cache key begins with.
 *
 * `getPolicy` for the policy the request was recorded against, `getSovereigntyStatus` for the ledger
 * counts the appended audit event moves, and `listAuditEvents` for that event itself.
 */
const WRITTEN_READ_KEYS: readonly { readonly member: string; readonly key: QueryKey }[] = [
  { member: 'getPolicy', key: ['getPolicy', POLICY_ID] },
  { member: 'getSovereigntyStatus', key: ['getSovereigntyStatus'] },
  { member: 'listAuditEvents', key: ['listAuditEvents'] },
];

/** A cached read the request does not touch, so an over-broad invalidation cannot pass as correct. */
const UNRELATED_KEY: QueryKey = ['getException', 'unrelated-ref'];

/** Every entry a request case seeds, so the same render can be asked what moved and what did not. */
const SEEDED_KEYS: readonly QueryKey[] = [
  ...WRITTEN_READ_KEYS.map((entry) => entry.key),
  UNRELATED_KEY,
];

/**
 * A fresh cache for one case, holding an entry under each key the case will inspect.
 *
 * The entries are seeded before the render because the dialog itself reads nothing: what a case asks
 * is the state of the entries the shell's screens had already cached, which is exactly what the
 * invalidation is for. Retries are off, as every sibling suite sets them, so no entry can be retried
 * behind a case.
 */
function seededQueryClient(keys: readonly QueryKey[] = []): QueryClient {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  for (const key of keys) {
    client.setQueryData(key, null);
  }

  return client;
}

/**
 * Renders one surface inside a fresh cache and hands that client back, so the case can read the
 * entries it seeded.
 */
function renderInCache(ui: ReactElement, keys: readonly QueryKey[] = []): QueryClient {
  const client = seededQueryClient(keys);

  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);

  return client;
}

/** Renders the dialog with the defaults a case does not override, inside a fresh cache. */
function renderDialog(options: DialogOptions = {}, keys: readonly QueryKey[] = []): QueryClient {
  return renderInCache(
    <GrantExceptionDialog
      policyId={POLICY_ID}
      policyLabel={POLICY_LABEL}
      onClose={options.onClose ?? (() => undefined)}
      onSubmitted={options.onSubmitted}
      secondApprovers={options.secondApprovers ?? APPROVERS}
    />,
    keys,
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
 * The explanation the disabled submit carries when `sentences` are the requirements still unmet: the
 * dialog's own sentences, adjacent and in the order the fields appear, separated by one space.
 *
 * Composed from `GRANT_EXCEPTION_DIALOG_TEXT` here rather than typed out, because the dialog owns every
 * one of these sentences (rule P-8) and a second copy would let the two drift apart.
 */
function unmetExplanation(...sentences: readonly string[]): string {
  return sentences.join(' ');
}

/** One state a partial fill leaves the form in, and what the submit's explanation must say about it. */
interface SubmitGateCase {
  /** What has been entered, phrased as the clause the case title ends with. */
  readonly gate: string;
  /** Enters the terms this gate has answered. */
  readonly fill: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
  /** The sentences the explanation must carry, adjacent and in the order the fields appear. */
  readonly named: readonly string[];
  /** The sentences of the terms this gate has answered, which the explanation must have dropped. */
  readonly cleared: readonly string[];
}

/**
 * The gates a partial fill leaves behind, one per combination of answered and outstanding terms.
 *
 * The cases differ only in which terms are entered, which is why they are one parameterised case. What
 * rule P-8 asks of the disabled submit is the same at each of them: the explanation names everything
 * still outstanding, in the order the fields appear, and nothing that has already been answered.
 */
const SUBMIT_GATE_CASES: readonly SubmitGateCase[] = [
  {
    gate: 'no term is entered',
    fill: async () => undefined,
    named: [TEXT.reasonRequired, TEXT.expiryRequired, TEXT.approverRequired],
    cleared: [],
  },
  {
    gate: 'only the reason is entered',
    fill: async (user) => {
      await user.type(screen.getByLabelText(TEXT.reasonLabel), REASON);
    },
    named: [TEXT.expiryRequired, TEXT.approverRequired],
    cleared: [TEXT.reasonRequired],
  },
  {
    gate: 'the reason and an expiry that is not after the clock are entered',
    fill: async (user) => {
      await user.type(screen.getByLabelText(TEXT.reasonLabel), REASON);
      fireEvent.change(screen.getByLabelText(TEXT.expiryLabel), { target: { value: CLOCK_DATE } });
    },
    named: [TEXT.expiryNotAfterClock, TEXT.approverRequired],
    cleared: [TEXT.reasonRequired, TEXT.expiryRequired],
  },
  {
    gate: 'the reason and an expiry after the clock are entered',
    fill: async (user) => {
      await user.type(screen.getByLabelText(TEXT.reasonLabel), REASON);
      fireEvent.change(screen.getByLabelText(TEXT.expiryLabel), { target: { value: LATER_DATE } });
    },
    named: [TEXT.approverRequired],
    cleared: [TEXT.reasonRequired, TEXT.expiryRequired],
  },
];

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

/**
 * Every line the dialog renders, one entry per element that holds text and no child element.
 *
 * Reading the leaves rather than the panel's whole `textContent` is what makes the rendered-text case
 * able to name a sentence: a claim, or a name the fixture never supplied, sits on a leaf of its own
 * and is therefore reported rather than merged into a paragraph.
 */
function leafTexts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll<HTMLElement>('*'))
    .filter((element) => element.children.length === 0)
    .map((element) => (element.textContent ?? '').trim())
    .filter((text) => text.length > 0);
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

  it('answers the pointer on every field, keeping the resting boundary and the focus ring', () => {
    renderDialog();

    const fields = [
      screen.getByLabelText(TEXT.reasonLabel),
      screen.getByLabelText(TEXT.expiryLabel),
      screen.getByLabelText(TEXT.approverLabel),
    ];

    for (const field of fields) {
      const utilities = (field.getAttribute('class') ?? '').split(' ');
      const pointerStates = utilities.filter(
        (utility) => utility.startsWith('hover:') || utility.startsWith('active:'),
      );

      expect(pointerStates.some((utility) => utility.startsWith('hover:'))).toBe(true);
      for (const utility of pointerStates) {
        /* The state names a role-token property: no palette literal, no arbitrary value, no shadow. */
        expect(utility.slice(utility.lastIndexOf(':') + 1)).toMatch(/^(bg|text|border)-[a-z]/u);
        expect(utility).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(|\[.+\]/iu);
        expect(utility).not.toContain('shadow');
      }

      /* Nothing is added at rest, the keyboard ring is untouched, and the transition is guarded. */
      expect(field.getAttribute('class')).toContain('border-control-boundary');
      expect(field.getAttribute('class')).toContain('focus-visible:outline-focus-ring');
      expect(field.getAttribute('class')).toContain('motion-safe:transition-colors');
    }
  });

  it('carries the fixed simulated-control label, because the flow is a demonstration control', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });
    const tag = within(dialog).getByText(SIMULATED_CONTROL_LABEL);

    /* The tag is one of the seven strings specification §5.3 fixes, character for character, so a
       label that drifts from the fixed list fails here and not only at the component's own constant. */
    expect(SIM_LABELS).toContain(tag.textContent);
  });

  it('renders only its own wording and the values its caller supplied', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });

    /* Every sentence the dialog owns, the seven fixed labels, and the three values the caller supplied:
       the policy label and the two personas. A claim about the deployment (rule P-4) or a persona the
       fixture never supplied leaves a residue here, which is how the absence of that vocabulary is
       proved without typing it — see this file's opening comment on why it is not typed. */
    const owned = [
      ...Object.values(TEXT),
      ...SIM_LABELS,
      POLICY_LABEL,
      ...APPROVERS.map((candidate) => `${candidate.name} (${candidate.id})`),
    ];

    const rendered = leafTexts(dialog);

    expect(rendered.length).toBeGreaterThan(0);
    for (const line of rendered) {
      const residue = owned.reduce((rest, fragment) => rest.split(fragment).join(''), line);

      expect(residue.trim()).toBe('');
    }
  });

  it('moves focus into the first field as it opens', () => {
    renderDialog();

    const dialog = screen.getByRole('dialog', { name: TEXT.heading });
    const reason = screen.getByLabelText(TEXT.reasonLabel);

    /* Asserted against `document.activeElement` as well as the matcher, because rule B-3 is about
       where focus actually is: a field that merely carries the focus class would pass the matcher and
       leave a keyboard user at the top of the document. */
    expect(reason).toHaveFocus();
    expect(document.activeElement).toBe(reason);
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('keeps Tab inside the dialog in both directions', async () => {
    const user = userEvent.setup();
    renderDialog();

    const reason = screen.getByLabelText(TEXT.reasonLabel);
    const submit = screen.getByRole('button', { name: TEXT.submit });

    expect(reason).toHaveFocus();

    await user.tab({ shift: true });
    expect(submit).toHaveFocus();

    /* The disabled control's explanation is painted on focus and not only under the pointer, which is
       what makes rule P-8's reason reachable from the keyboard (rule B-3) — and what it paints is the
       whole explanation, every requirement still unmet, not only the first. */
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      unmetExplanation(TEXT.reasonRequired, TEXT.expiryRequired, TEXT.approverRequired),
    );

    await user.tab();
    expect(reason).toHaveFocus();
  });

  it('records the request when the submit is activated from the keyboard alone', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmitted = vi.fn();
    renderDialog({ onClose, onSubmitted });

    await completeTerms(user);

    const submit = screen.getByRole('button', { name: TEXT.submit });

    submit.focus();
    expect(submit).toHaveFocus();

    await user.keyboard('{Enter}');

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

  it('sends one request with the three terms, then hands the record on and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSubmitted = vi.fn();
    renderDialog({ onClose, onSubmitted });

    await completeTerms(user);
    await user.click(screen.getByRole('button', { name: TEXT.submit }));

    /* One call, with the three terms and nothing else: the mocked service exposes
       `requestPolicyException` alone, so a call to any other port member has no target and a second
       send of this one is what the count catches. */
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

  it.each(WRITTEN_READ_KEYS)(
    'invalidates the $member read a recorded request touched, and leaves an unrelated entry alone',
    async ({ key }) => {
      const user = userEvent.setup();
      const client = renderDialog({}, SEEDED_KEYS);

      await completeTerms(user);
      await user.click(screen.getByRole('button', { name: TEXT.submit }));

      expect(client.getQueryState(key)?.isInvalidated).toBe(true);
      expect(client.getQueryState(UNRELATED_KEY)?.isInvalidated).toBe(false);
    },
  );

  it('invalidates nothing when the request was refused, because the write did not happen', async () => {
    const user = userEvent.setup();
    requestPolicyException.mockRejectedValue(REFUSAL);
    const client = renderDialog({}, SEEDED_KEYS);

    await completeTerms(user);
    await user.click(screen.getByRole('button', { name: TEXT.submit }));
    await screen.findByRole('alert');

    for (const { key } of WRITTEN_READ_KEYS) {
      expect(client.getQueryState(key)?.isInvalidated).toBe(false);
    }

    expect(client.getQueryState(UNRELATED_KEY)?.isInvalidated).toBe(false);
  });

  it('closes on Escape without sending anything and returns focus to the element that opened it', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderInCache(<DialogHarness onClose={onClose} onSubmitted={vi.fn()} />);

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

  it.each(SUBMIT_GATE_CASES)(
    'names every requirement still unmet, in the order the fields appear, when $gate',
    async ({ fill, named, cleared }) => {
      const user = userEvent.setup();
      renderDialog();

      await fill(user);

      const submit = screen.getByRole('button', { name: TEXT.submit });
      const description = describedText(submit);

      expect(submit).toHaveAttribute('aria-disabled', 'true');

      /* Every outstanding sentence, adjacent and in field order: an explanation that stopped at the
         first unmet term cannot carry the pair this asserts. */
      expect(description).toContain(unmetExplanation(...named));

      /* A term the reader has answered leaves the explanation, which then speaks about what is left. */
      for (const sentence of cleared) {
        expect(description).not.toContain(sentence);
      }
    },
  );

  it('refuses an activation of the disabled submit without sending a request, and answers it', async () => {
    const user = userEvent.setup();
    renderDialog();

    const submit = screen.getByRole('button', { name: TEXT.submit });

    await user.click(submit);

    expect(requestPolicyException).not.toHaveBeenCalled();
    /* The refused attempt is answered rather than ignored: the same explanation arrives as an
       announcement, so a reader who clicks and moves on is not left with nothing (rule P-8). */
    expect(screen.getByRole('alert')).toHaveTextContent(
      unmetExplanation(TEXT.reasonRequired, TEXT.expiryRequired, TEXT.approverRequired),
    );
  });

  it('drops the explanation and lets the submit act once every requirement is met', async () => {
    const user = userEvent.setup();
    renderDialog();

    await completeTerms(user);

    /* Re-queried rather than read from a node captured earlier: a disabled `ActionButton` is wrapped
       in the hint that carries its reason and an enabled one is not, so the element that can act is a
       new element. */
    const submit = screen.getByRole('button', { name: TEXT.submit });

    expect(submit).not.toHaveAttribute('aria-disabled');
    expect(describedText(submit)).toBe('');
    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('marks the expiry invalid only for a date that was entered and cannot be accepted', async () => {
    renderDialog();

    const expiry = screen.getByLabelText(TEXT.expiryLabel);

    expect(expiry).not.toHaveAttribute('aria-invalid');

    fireEvent.change(expiry, { target: { value: CLOCK_DATE } });
    expect(expiry).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(expiry, { target: { value: LATER_DATE } });
    expect(expiry).not.toHaveAttribute('aria-invalid');
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
    requestPolicyException.mockRejectedValue(REFUSAL);
    const onClose = vi.fn();
    renderDialog({ onClose });

    await completeTerms(user);
    const submit = screen.getByRole('button', { name: TEXT.submit });
    await user.click(submit);

    const alert = await screen.findByRole('alert');

    expect(requestPolicyException).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog', { name: TEXT.heading })).toBeInTheDocument();
    expect(alert).toHaveTextContent(TEXT.failureTitle);
    expect(alert).toHaveTextContent(REFUSAL.message);
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
