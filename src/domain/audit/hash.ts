/**
 * The two SHA-256 hashes of the audit chain and the canonical serialisation the payload hash
 * covers.
 *
 * Implements `platform-contracts.md` §6 as AAP 0.8 and AAP 0.12.1 restate it:
 *
 * - `payloadHash` is the lowercase-hex SHA-256 of the canonical JSON of `{ before, after }`, with
 *   the keys sorted at every level, no whitespace, and a missing value written as `null`.
 * - `eventHash` is the lowercase-hex SHA-256 of the UTF-8 concatenation
 *   `sequence|id|timestamp|actorType|actorId|action|objectRef|result|policyId|payloadHash|previousHash`,
 *   with an empty string in the `policyId` position when the event carries no policy.
 *
 * Three properties hold for every function below, and the chain's behaviour rests on all three:
 *
 * - Deterministic. The same input yields the same digest in every call and in every process. No
 *   clock, no random source and no module-level value is read; the only platform global used is
 *   `globalThis.crypto`, whose digest is a function of its input alone.
 * - Canonical. Two payloads holding the same members serialise to the identical string, whatever
 *   order the members were written in, because object keys are sorted at every level.
 * - Unformatted. This module computes and never presents: a digest is lowercase hex and a payload
 *   is JSON, so no rounding, locale or grouping enters `src/domain` (rule P-6, AAP 0.8).
 *
 * Linking one event to its predecessor, appending a draft and verifying the chain belong to
 * `chain.ts` and `verify.ts`; this module hashes and stores nothing.
 *
 * Rules this module is built to satisfy:
 * - P-2: it imports `src/types` and nothing else, and only with `import type`, so it cannot reach a
 *   seed record, the service layer, React or a screen.
 * - P-4: the computation below is a hash chain and nothing more. A digest over a payload and a
 *   predecessor's hash is what the arithmetic gives; no wording here claims a property the
 *   mechanism does not have.
 * - B-1: the digest comes from the platform's own Web Crypto, so hashing adds no request to any
 *   host.
 * - B-2: nothing here reads configuration, and the 64-zero value the chain starts from is declared
 *   once in `src/types/audit.ts` rather than written again below.
 * - P-7: nothing here names a product, a company or a person; the identifiers quoted in these
 *   comments are the synthetic `AUD-nnnnnn` and `POL-nnn` patterns of contracts §1.
 *
 * `crypto.subtle.digest` exists in a secure browser context and in Node from version 22, so one
 * code path serves both realms. The test module declares the Node environment because hashing is a
 * platform call rather than a DOM one: under Vitest's jsdom default `globalThis.crypto` and
 * `window.crypto` are already the platform's own Web Crypto — the object `node:crypto.webcrypto`
 * exports — so jsdom contributes no `SubtleCrypto` of its own and the digest resolves through the
 * platform. Stated on the module, the requirement travels with the arithmetic that has it rather
 * than resting on the shared configuration.
 */

import type { AuditEvent, AuditPayload } from '../../types';

/* ---------------------------------------------------------------------------------------------
 * The digest both hashes share
 * ------------------------------------------------------------------------------------------- */

/**
 * SHA-256 of a UTF-8 string, as lowercase hex.
 *
 * `TextEncoder` and `globalThis.crypto.subtle` are standard globals in the browser and in Node, so
 * one implementation is measured by the tests and shipped unaltered to the browser. The digest is
 * not cached: a cache would make this module hold state where a hash of an input needs none.
 *
 * @param input The text to hash, already in the canonical form its caller fixes.
 * @returns The digest as 64 lowercase hex characters, two per byte of the SHA-256 output.
 */
async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/* ---------------------------------------------------------------------------------------------
 * Canonical serialisation
 * ------------------------------------------------------------------------------------------- */

/**
 * Narrows a value to an array without introducing `any`.
 *
 * @param value Any value from a payload.
 * @returns Whether the value is an array.
 */
function isArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value);
}

/**
 * Narrows a value to an object whose own enumerable keys canonicalisation sorts.
 *
 * Arrays are excluded because an order is part of a list's meaning. An object that carries its own
 * `toJSON` method is excluded as well and left to `JSON.stringify`, because JSON gives such a value
 * a representation of its own — a date becomes an ISO 8601 string, for instance — where sorting its
 * keys would render it as an empty object and lose the value.
 *
 * @param value Any value from a payload.
 * @returns Whether the value is an object canonicalisation sorts by key.
 */
function isSortableRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || isArray(value)) {
    return false;
  }
  const toJson: unknown = Reflect.get(value, 'toJSON');
  return typeof toJson !== 'function';
}

/**
 * Serialises a value to the canonical JSON that `platform-contracts.md` §6 hashes.
 *
 * The form is JSON with two differences, both of which make two semantically equal payloads
 * serialise identically: the keys of every object are sorted, at every depth, by the default
 * `Object.keys(...).sort()` ordering rather than by any locale-aware comparator; and no whitespace
 * is emitted, so no space follows a colon or a comma. Array elements keep their order and are
 * canonicalised in place, because an order is part of a list's meaning while a member's position in
 * a record is not.
 *
 * A member whose value is `undefined` is written as `null`, and a top-level `undefined` returns
 * `"null"`, so a payload side that an action left absent hashes the same either way. Scalars are
 * serialised by `JSON.stringify`, which is what makes string escaping follow JSON exactly and
 * `NaN`/`Infinity` come out as `null`.
 *
 * @param value The payload side to serialise: a record, an array, a scalar, `null` or `undefined`.
 * @returns The canonical JSON text, with no whitespace anywhere.
 */
export function canonicalJson(value: unknown): string {
  if (isArray(value)) {
    const elements: string[] = [];
    for (const element of value) {
      elements.push(canonicalJson(element));
    }
    return `[${elements.join(',')}]`;
  }
  if (isSortableRecord(value)) {
    const keys = Object.keys(value).sort();
    const members: string[] = [];
    for (const key of keys) {
      members.push(`${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    }
    return `{${members.join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Hashes the `{ before, after }` payload of one audit event, per `platform-contracts.md` §6.
 *
 * The payload hash is the lowercase-hex SHA-256 of `canonicalJson({ before, after })`, and it is
 * the only serialisation of a payload that a hash covers: sorting lives in `canonicalJson`, so the
 * order the two sides are supplied in cannot change the digest.
 *
 * A side is `null` rather than absent when the action created or removed the record, which is why
 * both parameters accept `null` explicitly instead of being optional.
 *
 * @param before The affected record's values before the action, or `null` when it created them.
 * @param after The affected record's values after the action, or `null` when it removed them.
 * @returns The payload hash as 64 lowercase hex characters.
 */
export async function payloadHash(
  before: AuditPayload | null,
  after: AuditPayload | null,
): Promise<string> {
  return sha256Hex(canonicalJson({ before, after }));
}

/* ---------------------------------------------------------------------------------------------
 * The event hash
 * ------------------------------------------------------------------------------------------- */

/**
 * The positions of an event that `eventHash` reads, plus the two hashes it chains.
 *
 * Declared here rather than imported because the value being hashed is not yet an `AuditEvent`: the
 * event hash is one of the last members `chain.ts` fills in, so the assembly value it passes has no
 * `eventHash` yet. `Pick<AuditEvent, ...>` keeps each position's declared type, and the two hashes
 * are added, so a missing position or a wrongly typed one is a compile error rather than a digest
 * over an empty field. A finished `AuditEvent` satisfies this type without a cast, and this type is
 * not exported: no consumer needs to name it.
 */
type HashableEvent = Pick<
  AuditEvent,
  | 'sequence'
  | 'id'
  | 'timestamp'
  | 'actorType'
  | 'actorId'
  | 'action'
  | 'objectRef'
  | 'result'
  | 'policyId'
> & {
  /** The hash of this event's own `{ before, after }` payload. */
  payloadHash: string;

  /** The predecessor's `eventHash`, or the genesis value for the first event in the chain. */
  previousHash: string;
};

/**
 * Hashes one event's identity, per `platform-contracts.md` §6.
 *
 * The digest covers the UTF-8 concatenation of eleven positions joined by a single `|`, in the
 * order the contracts fix: `sequence`, `id`, `timestamp`, `actorType`, `actorId`, `action`,
 * `objectRef`, `result`, `policyId`, `payloadHash`, `previousHash`. No position is escaped,
 * because the contracts fix a plain concatenation: a `|` inside a value is part of that value.
 * `sequence` is a number on the record and is stringified before joining so the same event always
 * produces the same text.
 *
 * An event carrying no policy contributes an empty string in the `policyId` position, so an absent
 * `policyId` and an explicitly empty one hash identically — the chain's linkage depends on that
 * being a single rule rather than on how a caller happens to spell the absence.
 *
 * @param event The event's hash input: its eleven hashed positions, which a finished `AuditEvent`
 *   itself provides.
 * @returns The event hash as 64 lowercase hex characters.
 */
export async function eventHash(event: HashableEvent): Promise<string> {
  const positions: string[] = [
    String(event.sequence),
    event.id,
    event.timestamp,
    event.actorType,
    event.actorId,
    event.action,
    event.objectRef,
    event.result,
    event.policyId ?? '',
    event.payloadHash,
    event.previousHash,
  ];
  return sha256Hex(positions.join('|'));
}
