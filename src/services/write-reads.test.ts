// @vitest-environment node

/**
 * The write-reads map and the channel that reports a resolved write: the two halves of the invalidation
 * `src/app/providers.tsx` performs on the cache's behalf (AAP 0.6.2, AAP 0.3.2).
 *
 * WHAT THIS PROVES, AND WHAT IT CANNOT. The map's completeness and its members are proven at compile
 * time — `WRITING_MEMBERS` is a `satisfies` tuple over the port's own keys and `WRITE_READS` is a
 * `satisfies` record keyed by it, so a write without a row, or a row naming a member the port does not
 * declare, fails `tsc --noEmit` rather than failing here. What a type cannot show is that the rows hold
 * the reads a reader actually needs, so the runtime cases below check the properties the table claims
 * about itself: every write has at least one read, every write's row carries the trail, which every
 * audited action appends to (contracts §6), and every row closes with `getEvidence` and
 * `searchIdentifiers`, because a write's payload and the identifier index both report the event it
 * appends. Membership is checked a second time against the mock adapter's own prototype, because the port
 * is a type and an adapter is the only runtime surface that shows which members exist.
 *
 * The channel and the wrapper are proven together, because they are useless apart: a report no observer
 * hears changes nothing, and a write the wrapper does not report is heard by nobody. The cases cover the
 * four outcomes the wrapper distinguishes — a resolved write, a refusal that recorded nothing, a refusal
 * that recorded itself without naming the event it appended, and a policy block, which names it — plus
 * the two behaviours the cache depends on, an unsubscribe that stops delivery and a throwing observer
 * that starves no later one.
 *
 * The adapter these cases drive is a stub of the six members they exercise rather than the real mock
 * backend: the wrapper's contract is about what it *does* with a call, not about what a handler answers,
 * and the mock adapter's own suite covers the answers (`src/services/mock/mock-backend.test.ts`). The
 * stub is asserted against the port by the same cast a double of a 46-member interface needs, which is
 * stated once, in `stubAdapter` below.
 */

import { describe, expect, it, vi } from 'vitest';

import type { SiteIntelligenceService } from './site-intelligence-service';
import { MockBackend } from './mock/mock-backend';
import { WRITE_READS, WRITING_MEMBERS, observeWriteReads, withWriteReporting } from './write-reads';
import type { CachedRead } from './write-reads';

/* ---------------------------------------------------------------------------------------------
 * The adapter the wrapper is driven through
 * ------------------------------------------------------------------------------------------- */

/** How one stubbed call answers: with an answer, with a bare failure, or with a recorded refusal. */
type StubOutcome = 'resolve' | 'reject' | 'block';

/** The outcomes the five writes of this suite answer with, supplied per case. */
interface StubOutcomes {
  readonly assign: StubOutcome;
  readonly note: StubOutcome;
  readonly ask: StubOutcome;
  readonly decide: StubOutcome;
  readonly retry: StubOutcome;
}

/** What a resolving stub call answers with: a value the wrapper must hand back untouched. */
const RESOLVED_ANSWER = 'the adapter answer';

/** The failure a rejecting stub call throws, so a case can assert the wrapper rethrew it. */
const REFUSAL = 'the adapter refused';

/**
 * The `Problem` a policy block throws: the shape `handlers/assistant.ts` and `handlers/approvals.ts`
 * produce, naming the rule, the alternative it permits and the event they appended before throwing.
 */
const RECORDED_REFUSAL = {
  type: 'policy',
  message: 'the policy refused this call',
  traceId: 'TRC-20261203-000001',
  policyId: 'POL-007',
  auditEventId: 'AUD-000201',
};

/** The reads every recorded refusal moves beside the write's own row: the two policy reads. */
const POLICY_READS: readonly CachedRead[] = ['listPolicies', 'getPolicy'];

/** A question the assistant stub accepts, shaped as the port declares it. */
const A_QUESTION = { question: 'a question', modelId: 'MDL-LOCAL-L', contextRefs: [] };

/** The approval the two write-back paths are driven with, and the step a retry addresses. */
const AN_APPROVAL = 'APR-2026-042';

/** The write-back reference a retry addresses, in the `PO-nnnnnnnn` shape the steps carry. */
const A_WRITE_BACK = 'PO-4500012345';

/** A decision shaped as the port declares it, which a stub call never reads. */
const A_DECISION = { action: 'approve', comment: 'a comment' } as const;

/**
 * A stand-in adapter carrying the six members these cases use: the read the wrapper must report nothing
 * for, the three writes whose outcomes it distinguishes, and the two write-back paths whose refusals
 * record themselves.
 *
 * The double cast is the whole of the stub's dishonesty and is deliberate: the port declares 46 members
 * and this file drives six, so the object is written as what it is and handed over as the port. Nothing
 * here is a product code path — the double exists only to observe the wrapper — which is why the cast
 * stands in a test rather than being avoided by implementing 40 members that would never be called.
 *
 * @param outcomes - How each of the five writes answers.
 * @returns The stub, typed as the port.
 */
function stubAdapter(outcomes: StubOutcomes): SiteIntelligenceService {
  const settle = (outcome: StubOutcome): Promise<string> => {
    if (outcome === 'resolve') {
      return Promise.resolve(RESOLVED_ANSWER);
    }

    return Promise.reject(outcome === 'block' ? RECORDED_REFUSAL : new Error(REFUSAL));
  };

  const adapter = {
    getAtlas: () => Promise.resolve(RESOLVED_ANSWER),
    assignException: () => settle(outcomes.assign),
    noteException: () => settle(outcomes.note),
    askAssistant: () => settle(outcomes.ask),
    decideApproval: () => settle(outcomes.decide),
    retryWriteBack: () => settle(outcomes.retry),
  };

  return adapter as unknown as SiteIntelligenceService;
}

/** The outcomes a case wants when it is not about a refusal at all. */
const ALL_RESOLVE: StubOutcomes = {
  assign: 'resolve',
  note: 'resolve',
  ask: 'resolve',
  decide: 'resolve',
  retry: 'resolve',
};

/**
 * The two writes whose handler records what it did and then refuses, each driven to that refusal.
 *
 * Both run `advanceWriteBacks` (`handlers/approvals.ts`), which sets the step's state and appends its
 * audit event through `recordStep` before the failing step throws `writeBackProblem` — a `Problem`
 * carrying `simulated-write-back` and no `auditEventId`. The member, its outcome, its call and its row
 * are the only things that differ between the two, which is why they are one parameterised case.
 */
const REFUSALS_THAT_RECORDED_THEMSELVES = [
  {
    member: 'decideApproval',
    outcomes: { ...ALL_RESOLVE, decide: 'reject' } satisfies StubOutcomes,
    call: (service: SiteIntelligenceService): Promise<unknown> =>
      service.decideApproval(AN_APPROVAL, A_DECISION),
    row: WRITE_READS.decideApproval,
  },
  {
    member: 'retryWriteBack',
    outcomes: { ...ALL_RESOLVE, retry: 'reject' } satisfies StubOutcomes,
    call: (service: SiteIntelligenceService): Promise<unknown> =>
      service.retryWriteBack(AN_APPROVAL, A_WRITE_BACK),
    row: WRITE_READS.retryWriteBack,
  },
];

/* ---------------------------------------------------------------------------------------------
 * The map — AAP 0.6.2, contracts §6
 * ------------------------------------------------------------------------------------------- */

describe('the write-reads map', () => {
  /**
   * The three reads no row may omit: the trail every audited write appends to (contracts §6), the
   * payload composed over the record it moves and over that trail, and the identifier index that lists
   * every event's identifier — the reason the module docblock holds for `getEvidence` and
   * `searchIdentifiers` being named in every row rather than in the few a reader would expect.
   */
  const EVERY_ROW_CLOSES_WITH: readonly CachedRead[] = [
    'listAuditEvents',
    'getEvidence',
    'searchIdentifiers',
  ];

  it('names at least one read for every audited write the port carries', () => {
    for (const member of WRITING_MEMBERS) {
      expect(WRITE_READS[member].length, `${member} has no reads`).toBeGreaterThan(0);
    }
  });

  it('names only members the mock adapter declares, and closes every row with the trail, the payload and the index', () => {
    const declared = new Set<string>(Object.getOwnPropertyNames(MockBackend.prototype));
    const rows = WRITING_MEMBERS.map((member) => [...WRITE_READS[member]] as CachedRead[]);

    for (const [index, reads] of rows.entries()) {
      for (const read of EVERY_ROW_CLOSES_WITH) {
        expect(reads, `${String(WRITING_MEMBERS[index])} omits ${read}`).toContain(read);
      }

      for (const read of reads) {
        expect(declared.has(read), `${read} is not a port member`).toBe(true);
      }
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The channel — AAP 0.3.2
 * ------------------------------------------------------------------------------------------- */

describe('the write-observation channel', () => {
  it('delivers the row of the member that wrote, and stops once the observer unsubscribes', async () => {
    const service = withWriteReporting(stubAdapter(ALL_RESOLVE));
    const heard: (readonly CachedRead[])[] = [];
    const unsubscribe = observeWriteReads((reads) => {
      heard.push(reads);
    });

    try {
      await service.assignException('EXC-2026-1184', 'USR-01');

      expect(heard).toEqual([WRITE_READS.assignException]);

      unsubscribe();

      await service.noteException('EXC-2026-1184', 'a note');

      expect(heard).toHaveLength(1);
    } finally {
      unsubscribe();
    }
  });

  it('keeps calling the observers after one of them throws', async () => {
    const service = withWriteReporting(stubAdapter(ALL_RESOLVE));
    const heard: (readonly CachedRead[])[] = [];
    const stopThrowing = observeWriteReads(() => {
      throw new Error('this observer cannot invalidate anything');
    });
    const stopRecording = observeWriteReads((reads) => {
      heard.push(reads);
    });

    try {
      await service.assignException('EXC-2026-1184', 'USR-01');

      expect(heard).toEqual([WRITE_READS.assignException]);
    } finally {
      stopThrowing();
      stopRecording();
    }
  });
});

/* ---------------------------------------------------------------------------------------------
 * The wrapper — AAP 0.6.2, AAP 0.12.1
 * ------------------------------------------------------------------------------------------- */

describe('the reporting wrapper', () => {
  it('answers with the adapter own value and reports the row of a resolved write', async () => {
    const service = withWriteReporting(stubAdapter(ALL_RESOLVE));
    const listener = vi.fn();
    const unsubscribe = observeWriteReads(listener);

    try {
      const answered = await service.assignException('EXC-2026-1184', 'USR-01');

      expect(answered).toBe(RESOLVED_ANSWER);
      expect(listener).toHaveBeenCalledWith(WRITE_READS.assignException);
    } finally {
      unsubscribe();
    }
  });

  /*
   * The member here is one whose handler records nothing before it refuses: an assignment that the
   * permission matrix, a validation or the conflicting-update state refuses appends no event, so it is
   * outside the two write-back paths that record themselves (`handlers/approvals.ts`'s
   * `advanceWriteBacks`). That is why a bare refusal from it still reports nothing, and why the case
   * stays on it rather than moving to a write-back path: the rule those paths needed must not turn every
   * refusal into a report.
   */
  it('reports nothing for a read, and nothing when a refusal recorded no event', async () => {
    const service = withWriteReporting(stubAdapter({ ...ALL_RESOLVE, assign: 'reject' }));
    const listener = vi.fn();
    const unsubscribe = observeWriteReads(listener);

    try {
      await service.getAtlas();
      await expect(service.assignException('EXC-2026-1184', 'USR-01')).rejects.toThrow(REFUSAL);

      expect(listener).not.toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it('reports a question the model boundary blocked, because the block records itself', async () => {
    const service = withWriteReporting(stubAdapter({ ...ALL_RESOLVE, ask: 'block' }));
    const listener = vi.fn();
    const unsubscribe = observeWriteReads(listener);

    try {
      await expect(service.askAssistant(A_QUESTION)).rejects.toEqual(RECORDED_REFUSAL);

      expect(listener).toHaveBeenCalledWith([...WRITE_READS.askAssistant, ...POLICY_READS]);
    } finally {
      unsubscribe();
    }
  });

  it('reports any write a policy blocked, because the block names the event it appended', async () => {
    const service = withWriteReporting(stubAdapter({ ...ALL_RESOLVE, assign: 'block' }));
    const listener = vi.fn();
    const unsubscribe = observeWriteReads(listener);

    try {
      await expect(service.assignException('EXC-2026-1184', 'USR-01')).rejects.toEqual(
        RECORDED_REFUSAL,
      );

      expect(listener).toHaveBeenCalledWith([...WRITE_READS.assignException, ...POLICY_READS]);
    } finally {
      unsubscribe();
    }
  });

  /*
   * The refusal that records itself without naming an event: a write-back step that did not complete is
   * written to the record and to the trail by `recordStep` before `advanceWriteBacks` throws, and the
   * `Problem` it throws carries no `auditEventId`. Reporting nothing here is what left a failed
   * write-back's moved approval and queue row behind the cache whenever the screen that started it had
   * unmounted, so both members that run that path have to report on the rejection alone.
   */
  it.each(REFUSALS_THAT_RECORDED_THEMSELVES)(
    'reports the $member row for a refusal that recorded itself and named no event',
    async ({ outcomes, call, row }) => {
      const service = withWriteReporting(stubAdapter(outcomes));
      const listener = vi.fn();
      const unsubscribe = observeWriteReads(listener);

      try {
        await expect(call(service)).rejects.toThrow(REFUSAL);

        expect(listener).toHaveBeenCalledTimes(1);
        expect(listener).toHaveBeenCalledWith(row);
      } finally {
        unsubscribe();
      }
    },
  );
});
