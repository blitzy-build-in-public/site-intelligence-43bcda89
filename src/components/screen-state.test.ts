/**
 * Suite for `screen-state.ts`: the one derivation that turns a read's outcome into one of
 * `platform-specification.md` §8's seven screen states.
 *
 * Every case here is about the precedence, not about a screen. The twelve feature modules that used to
 * carry their own copy of this mapping now hand it the same facts and their own few flags, so the
 * answers this suite proves are the answers every screen receives: a `'validation'` refusal is
 * `'conflict'` and a `'not-found'` refusal is `'empty'` whichever screen asked, an unanswered source is
 * `'offline'`, an aged one is `'stale'`, an incomplete one is `'partial'`, and a current and complete
 * read is `undefined`.
 *
 * The suite is written as tables because the interesting content is which input wins, and one case per
 * member of a closed vocabulary is the shortest way to say that every member was considered: the five
 * causes a `Problem` names, the four states a source reports, the twelve screens' input shapes. A case
 * that only re-tested the arm above it would add nothing.
 *
 * The failure, the freshness and the permission below are this suite's own caller-level input,
 * standing for values a service `Problem` and a `Result.meta` supply at run time: the module types none
 * of them itself (rule P-6). Nothing here imports a seed record (rule P-2), hashes anything or reads
 * the clock, so the jsdom environment `vite.config.ts` sets by default applies.
 */
import { describe, expect, it } from 'vitest';

import { APPROVAL_GATE_SOURCE } from '../types';
import type {
  Freshness,
  FreshnessState,
  Permission,
  Problem,
  ProblemType,
  Role,
  ScreenState,
  SourceId,
} from '../types';
import {
  deriveScreenState,
  forbiddenOf,
  isProblem,
  reportsState,
  staleSourceOf,
} from './screen-state';
import type { ScreenStateInput } from './screen-state';

/* ---------------------------------------------------------------------------------------------
 * The fixtures: one failure, one source report, one screen input
 * ------------------------------------------------------------------------------------------- */

/** The correlation identifier every failure carries, as a `Result.meta` and a `Problem` do. */
const TRACE_ID = 'trace-1a2b3c4d';

/** The instant a source reports having last answered; a record value, never a computed age. */
const AS_OF = '2026-12-03T07:52:00+01:00';

/** The permission a denial names. */
const REQUIRED_PERMISSION: Permission = 'exception.read';

/** The roles that hold it, so the denial carries the evidence the forbidden card prints. */
const HOLDING_ROLES: readonly Role[] = ['plant-manager', 'head-of-supply-chain'];

/**
 * A source other than the approval gate, so a case can prove that the gate is preferred when it is
 * aged and named only when it is not.
 */
const OTHER_SOURCE: SourceId = 'transport';

/** The source the atlas is read from, which prefers itself the way the approval screens prefer ERP. */
const ATLAS_SOURCE: SourceId = 'market-pack';

/** One `Freshness` record, as `Result.meta.freshness` carries six of. */
function sourceReport(state: FreshnessState, source: SourceId = APPROVAL_GATE_SOURCE): Freshness {
  return { source, asOf: AS_OF, state };
}

/** A freshness report in which one source answered in the state given. */
function freshnessOf(state: FreshnessState, source: SourceId = APPROVAL_GATE_SOURCE): Freshness[] {
  return [sourceReport(state, source)];
}

/** A report in which nothing is wrong: the healthy session the demonstration opens on. */
const FRESH: readonly Freshness[] = freshnessOf('fresh');

/** A `Problem` of one cause, carrying the evidence a permission refusal needs. */
/** The sentence a `'permission'` refusal carries, which the forbidden card prints above its roles. */
const DENIAL_MESSAGE = 'Reading this record needs a permission the acting role does not hold.';

function problemOf(type: ProblemType): Problem {
  if (type === 'permission') {
    return {
      type,
      message: DENIAL_MESSAGE,
      traceId: TRACE_ID,
      requiredPermission: REQUIRED_PERMISSION,
      rolesWithPermission: [...HOLDING_ROLES],
    };
  }

  return { type, message: `The call was refused: ${type}.`, traceId: TRACE_ID };
}

/** A rejection that did not arrive in the port's `Problem` shape: the read stopped without answering. */
const UNTYPED_FAILURE = new Error('the read stopped without answering');

/**
 * A settled, current and complete read of a screen whose payload holds something to show — the input
 * every case below starts from before it changes one fact.
 */
const HEALTHY: ScreenStateInput = {
  isPending: false,
  error: null,
  freshness: FRESH,
};

/** The five causes a `Problem` names, walked so no cause is left without an expected state. */
const CAUSES: ReadonlyArray<readonly [ProblemType, ScreenState]> = [
  ['permission', 'forbidden'],
  ['validation', 'conflict'],
  ['not-found', 'empty'],
  ['policy', 'offline'],
  ['simulated-write-back', 'offline'],
];

/* ---------------------------------------------------------------------------------------------
 * The twelve screens' input shapes — every per-screen difference, as an input
 * ------------------------------------------------------------------------------------------- */

/**
 * The facts one screen passes beside the read's own, exactly as that screen passes them.
 *
 * `namedNoRecord` is the route's own answer about whether it named a record at all, `refusals` are the
 * rejections of the calls a screen makes beside its record read, `staleSourcePreference` is the source
 * its stale notice names first, and `payloadReportsPartial` and `hasContent` are its own readings of a
 * payload. Two screens pass no preference because their figures come from several sources; the rest
 * prefer the source their next action depends on.
 */
interface ScreenShape {
  /** The screen, named so a failure says which one disagreed. */
  readonly name: string;

  /**
   * Whether this screen passes the route's own answer — the four detail screens do, because their
   * routes name a record, and the six collection screens have no such fact to pass.
   */
  readonly passesRouteFlag: boolean;

  /** What the screen's other calls rejected with, as the screen passes them. */
  readonly refusals: readonly unknown[];

  /** The source the screen's stale notice names first, or `undefined` when it names none. */
  readonly staleSourcePreference: SourceId | undefined;

  /** Whether the screen's payload reports itself incomplete. */
  readonly payloadReportsPartial: boolean;

  /** Whether the screen's payload holds anything to show. */
  readonly hasContent: boolean;
}

/** The facts a screen passes when nothing about it is exceptional. */
const NO_REFUSALS: readonly unknown[] = [];

/**
 * One shape per screen that calls the derivation, in screen order.
 *
 * A shape says only what the screen passes; every case below hands it the same failure or the same
 * source report, which is what proves that the twelve now answer one question one way.
 */
const SCREEN_SHAPES: readonly ScreenShape[] = [
  {
    name: 'overview',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'exception queue',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'investigation',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: undefined,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'scenario comparison',
    passesRouteFlag: true,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'approval detail',
    passesRouteFlag: true,
    refusals: [null, null],
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'approvals inbox',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'audit trail',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'assistant panel',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: undefined,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'policy detail',
    passesRouteFlag: true,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'sovereignty',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'filemap canvas',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: APPROVAL_GATE_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
  {
    name: 'competitive atlas',
    passesRouteFlag: false,
    refusals: NO_REFUSALS,
    staleSourcePreference: ATLAS_SOURCE,
    payloadReportsPartial: false,
    hasContent: true,
  },
];

/** The read's own facts a case changes when it walks every screen's shape. */
interface ReadOverrides {
  /** Whether a read the screen needs is still pending. */
  readonly isPending?: boolean | undefined;

  /** What the screen's read rejected with. */
  readonly error?: unknown;

  /** The freshness report the settled read carries. */
  readonly freshness?: readonly Freshness[] | undefined;
}

/** One screen's shape, with the read's own facts a case changes laid over it. */
function inputFor(shape: ScreenShape, overrides: ReadOverrides = {}): ScreenStateInput {
  return {
    isPending: overrides.isPending ?? false,
    error: 'error' in overrides ? overrides.error : null,
    freshness: 'freshness' in overrides ? overrides.freshness : FRESH,
    refusals: shape.refusals,
    staleSourcePreference: shape.staleSourcePreference,
    payloadReportsPartial: shape.payloadReportsPartial,
    hasContent: shape.hasContent,
    namedNoRecord: false,
  };
}

/* ---------------------------------------------------------------------------------------------
 * a. The route named no record
 * ------------------------------------------------------------------------------------------- */

describe('the route named no record', () => {
  it('is empty, whatever else the screen could have reported', () => {
    expect(
      deriveScreenState({ ...HEALTHY, namedNoRecord: true, error: problemOf('permission') }),
    ).toBe('empty');
    expect(deriveScreenState({ ...HEALTHY, namedNoRecord: true, isPending: true })).toBe('empty');
    expect(deriveScreenState({ ...HEALTHY, namedNoRecord: true, freshness: undefined })).toBe('empty');
  });

  it('is not the state of a route that named one', () => {
    expect(deriveScreenState({ ...HEALTHY, namedNoRecord: false })).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------------------------
 * a. A permission refusal from another call
 * ------------------------------------------------------------------------------------------- */

describe('a refusal from a call the screen makes beside its record read', () => {
  it('is forbidden when it is a permission refusal', () => {
    expect(
      deriveScreenState({ ...HEALTHY, refusals: [null, problemOf('permission')] }),
    ).toBe('forbidden');
  });

  it('is not a screen state for any other cause, and the record read still decides', () => {
    expect(deriveScreenState({ ...HEALTHY, refusals: [problemOf('validation')] })).toBeUndefined();
    expect(
      deriveScreenState({ ...HEALTHY, refusals: [problemOf('not-found'), UNTYPED_FAILURE] }),
    ).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------------------------
 * b. A `Problem`, by the cause it names — and c. any other rejection
 * ------------------------------------------------------------------------------------------- */

describe('a rejection', () => {
  it.each(CAUSES)('maps a %s refusal to %s', (cause, expected) => {
    expect(deriveScreenState({ ...HEALTHY, error: problemOf(cause) })).toBe(expected);
  });

  it('is offline for a rejection that did not arrive in the port’s shape', () => {
    expect(deriveScreenState({ ...HEALTHY, error: UNTYPED_FAILURE })).toBe('offline');
  });

  it('outranks every fact about the sources and the payload', () => {
    expect(
      deriveScreenState({
        ...HEALTHY,
        error: problemOf('validation'),
        isPending: true,
        freshness: freshnessOf('unavailable'),
        hasContent: false,
      }),
    ).toBe('conflict');
  });
});

/* ---------------------------------------------------------------------------------------------
 * d. The pending read
 * --------------------------------------------------------------------------------------------- */

describe('a read that has not settled', () => {
  it('is loading while it is pending', () => {
    expect(deriveScreenState({ ...HEALTHY, isPending: true })).toBe('loading');
  });

  it('is loading while it carries no freshness report', () => {
    expect(deriveScreenState({ ...HEALTHY, freshness: undefined })).toBe('loading');
  });

  it('outranks a source report and the payload’s emptiness', () => {
    expect(
      deriveScreenState({
        ...HEALTHY,
        isPending: true,
        freshness: freshnessOf('stale'),
        hasContent: false,
      }),
    ).toBe('loading');
  });
});

/* ---------------------------------------------------------------------------------------------
 * e. A source that did not answer — and f. a source that aged
 * ------------------------------------------------------------------------------------------- */

describe('the freshness report', () => {
  it('is offline when a source reported unavailable', () => {
    expect(deriveScreenState({ ...HEALTHY, freshness: freshnessOf('unavailable') })).toBe('offline');
  });

  it('outranks a stale or partial source and an empty payload', () => {
    expect(
      deriveScreenState({
        ...HEALTHY,
        freshness: [...freshnessOf('unavailable'), ...freshnessOf('stale', OTHER_SOURCE)],
        hasContent: false,
      }),
    ).toBe('offline');
  });

  it('is stale when a source aged', () => {
    expect(deriveScreenState({ ...HEALTHY, freshness: freshnessOf('stale', OTHER_SOURCE) })).toBe(
      'stale',
    );
  });

  it('outranks a partial source and the payload’s emptiness', () => {
    expect(
      deriveScreenState({
        ...HEALTHY,
        freshness: [...freshnessOf('stale', OTHER_SOURCE), ...freshnessOf('partial')],
        payloadReportsPartial: true,
        hasContent: false,
      }),
    ).toBe('stale');
  });

  it('is partial when a source answered incompletely', () => {
    expect(deriveScreenState({ ...HEALTHY, freshness: freshnessOf('partial') })).toBe('partial');
  });

  it('is not an exceptional state when every source reported fresh', () => {
    expect(deriveScreenState({ ...HEALTHY, freshness: FRESH })).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------------------------
 * g. A payload that reports itself incomplete — i. an empty one
 * ------------------------------------------------------------------------------------------- */

describe('the payload', () => {
  it('is partial when the payload reports an input missing', () => {
    expect(deriveScreenState({ ...HEALTHY, payloadReportsPartial: true })).toBe('partial');
  });

  it('is partial before it is empty, so an incomplete answer is never reported as nothing to show', () => {
    expect(
      deriveScreenState({ ...HEALTHY, payloadReportsPartial: true, hasContent: false }),
    ).toBe('partial');
  });

  it('is empty when the caller says there is nothing to show', () => {
    expect(deriveScreenState({ ...HEALTHY, hasContent: false })).toBe('empty');
  });

  /* i. and j.: the boundary's documented "no exceptional state holds". */
  it('is no exceptional state when the payload has something to show and nothing else is wrong', () => {
    expect(deriveScreenState({ ...HEALTHY, hasContent: true })).toBeUndefined();
    expect(deriveScreenState(HEALTHY)).toBeUndefined();
  });
});

/* ---------------------------------------------------------------------------------------------
 * Every screen's shape answers one question one way
 * ------------------------------------------------------------------------------------------- */

describe('every screen’s input shape', () => {
  it.each(SCREEN_SHAPES)('derives no exceptional state for a healthy $name read', (shape) => {
    expect(deriveScreenState(inputFor(shape))).toBeUndefined();
  });

  it.each(SCREEN_SHAPES)('derives conflict for a validation refusal on $name', (shape) => {
    expect(deriveScreenState(inputFor(shape, { error: problemOf('validation') }))).toBe('conflict');
  });

  it.each(SCREEN_SHAPES)('derives empty for a not-found refusal on $name', (shape) => {
    expect(deriveScreenState(inputFor(shape, { error: problemOf('not-found') }))).toBe('empty');
  });

  it.each(SCREEN_SHAPES)('derives forbidden for a permission refusal on $name', (shape) => {
    expect(deriveScreenState(inputFor(shape, { error: problemOf('permission') }))).toBe('forbidden');
  });

  it.each(SCREEN_SHAPES)('derives offline for an unanswered source on $name', (shape) => {
    expect(deriveScreenState(inputFor(shape, { freshness: freshnessOf('unavailable') }))).toBe(
      'offline',
    );
  });

  it.each(SCREEN_SHAPES)('derives stale for an aged source on $name', (shape) => {
    expect(deriveScreenState(inputFor(shape, { freshness: freshnessOf('stale') }))).toBe('stale');
  });

  it.each(SCREEN_SHAPES.filter((shape) => shape.passesRouteFlag))(
    'derives empty for a route that named no record on $name',
    (shape) => {
      expect(deriveScreenState({ ...inputFor(shape), namedNoRecord: true })).toBe('empty');
    },
  );
});

/* ---------------------------------------------------------------------------------------------
 * The helpers a screen calls beside the derivation
 * ------------------------------------------------------------------------------------------- */

describe('isProblem', () => {
  it.each(CAUSES.map(([cause]) => cause))('accepts a failure of the %s cause', (cause) => {
    expect(isProblem(problemOf(cause))).toBe(true);
  });

  it('rejects a value that is not the port’s failure', () => {
    expect(isProblem(UNTYPED_FAILURE)).toBe(false);
    expect(isProblem(null)).toBe(false);
    expect(isProblem(undefined)).toBe(false);
    expect(isProblem('a refusal')).toBe(false);
    expect(isProblem({ type: 'permission', message: 'no trace identifier' })).toBe(false);
    expect(isProblem({ type: 'not-a-cause', message: 'a message', traceId: TRACE_ID })).toBe(false);
  });
});

describe('forbiddenOf', () => {
  it("carries the permission, the holding roles, the refusal's own sentence and the trace identifier", () => {
    expect(forbiddenOf(problemOf('permission'))).toEqual({
      permission: REQUIRED_PERMISSION,
      roles: [...HOLDING_ROLES],
      reason: DENIAL_MESSAGE,
      traceId: TRACE_ID,
    });
  });

  it('supplies no record when the refusal named no permission', () => {
    expect(
      forbiddenOf({
        type: 'permission',
        message: 'A refusal that named no permission.',
        traceId: TRACE_ID,
      }),
    ).toBeUndefined();
  });

  it('supplies no record for another cause, or for a rejection that is not the port’s', () => {
    expect(forbiddenOf(problemOf('validation'))).toBeUndefined();
    expect(forbiddenOf(UNTYPED_FAILURE)).toBeUndefined();
  });
});

describe('reportsState', () => {
  it('reports the state a source answered in', () => {
    expect(reportsState(freshnessOf('partial'), 'partial')).toBe(true);
    expect(reportsState(freshnessOf('partial'), 'unavailable')).toBe(false);
    expect(reportsState([], 'stale')).toBe(false);
  });
});

describe('staleSourceOf', () => {
  it('names no source when none is stale', () => {
    expect(staleSourceOf(FRESH)).toBeUndefined();
    expect(staleSourceOf(freshnessOf('unavailable'))).toBeUndefined();
  });

  it('names the source the screen prefers, whatever order the report lists', () => {
    const report = [
      sourceReport('stale', OTHER_SOURCE),
      sourceReport('stale', APPROVAL_GATE_SOURCE),
    ];

    expect(staleSourceOf(report, APPROVAL_GATE_SOURCE)?.source).toBe(APPROVAL_GATE_SOURCE);
  });

  it('names the first aged source when the preferred one is current', () => {
    const report = [
      sourceReport('fresh', APPROVAL_GATE_SOURCE),
      sourceReport('stale', OTHER_SOURCE),
    ];

    expect(staleSourceOf(report, APPROVAL_GATE_SOURCE)?.source).toBe(OTHER_SOURCE);
  });

  it('names the first aged source when the screen prefers none', () => {
    const report = [
      sourceReport('stale', OTHER_SOURCE),
      sourceReport('stale', APPROVAL_GATE_SOURCE),
    ];

    expect(staleSourceOf(report)?.source).toBe(OTHER_SOURCE);
  });

  it('carries the source’s display name and the instant it last answered, unaltered', () => {
    const stale = staleSourceOf(freshnessOf('stale', OTHER_SOURCE));

    expect(stale).toEqual({ source: OTHER_SOURCE, label: 'Transport', asOf: AS_OF });
  });
});
