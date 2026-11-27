/**
 * Shared primitive vocabulary of Site Intelligence: the identifier shapes and the money, time and
 * calendar conventions of `platform-contracts.md` §1, the constant demonstration clock, the seven
 * exact simulation labels of `platform-specification.md` §5.3 with their three companion strings
 * and the wording a refused computation carries (AAP §0.2.2, §0.8), the theme and density values of
 * §4.3, the six data sources of `platform-seed-data.md` §7 and the permission names of the
 * contracts §7.1 matrix.
 *
 * This is the leaf module of `src/types`: it imports nothing, so every other module in the folder
 * can depend on it without creating a cycle.
 */

/* ---------------------------------------------------------------------------------------------
 * Record identifiers — platform-contracts.md §1
 * ------------------------------------------------------------------------------------------- */

/** Operational exception identifier, `EXC-2026-nnnn`. */
export type ExceptionId = string;

/** Purchase order identifier, `PO-nnnnnnnn`. */
export type PurchaseOrderId = string;

/** Customer order identifier, `CO-nnnnnn`. */
export type CustomerOrderId = string;

/** Scenario identifier, `SCN-nnnn-x`, where the suffix is the scenario's letter. */
export type ScenarioId = string;

/** Approval identifier, `APR-2026-nnn`. */
export type ApprovalId = string;

/** Audit event identifier, `AUD-nnnnnn`. */
export type AuditEventId = string;

/** Policy identifier, `POL-nnn`. */
export type PolicyId = string;

/** Document identifier, `DOC-nnnn`. */
export type DocumentId = string;

/** Evidence pin identifier, the `PIN-` prefix followed by the pin's own key. */
export type EvidencePinId = string;

/** Part approval package identifier, `PPAP-nnnn`. */
export type PackageId = string;

/** Competitor identifier, `CMP-nn`, ranging over `CMP-01` to `CMP-03`. */
export type CompetitorId = string;

/** Chokepoint identifier, `CHK-nn`. */
export type ChokepointId = string;

/* ---------------------------------------------------------------------------------------------
 * Entity identifiers — AAP 0.12.2 entity table and specification §5.1 filter values
 * ------------------------------------------------------------------------------------------- */

/** Plant identifier, one of `PLT-RGB`, `PLT-BRN`, `PLT-QRO` or `PLT-RAK`. */
export type PlantId = string;

/** Production line identifier, `LN-` followed by the line's own key. */
export type LineId = string;

/** Product identifier, one of `PRD-R75`, `PRD-A200` or `PRD-V40`. */
export type ProductId = string;

/** Material identifier, `MAT-` followed by the material's own key. */
export type MaterialId = string;

/** Supplier identifier, `SUP-` followed by the supplier's own key. */
export type SupplierId = string;

/** Customer identifier, `CUS-` followed by the customer's own key. */
export type CustomerId = string;

/** Tier-2 origin identifier, `ORG-` followed by the origin's own key. */
export type OriginId = string;

/** Persona identifier, `USR-01` through `USR-08`. */
export type UserId = string;

/* ---------------------------------------------------------------------------------------------
 * Conventions — platform-contracts.md §1
 * ------------------------------------------------------------------------------------------- */

/**
 * A EUR amount, carrying at most two decimals. Grouping and the currency marker are presentation
 * and belong to `src/components/mono-value.tsx`, never to a domain module.
 */
export type Money = number;

/**
 * An instant as ISO 8601 with an offset in the application's time zone. Business logic reads the
 * demonstration clock below rather than the system clock.
 */
export type Timestamp = string;

/** A calendar date, `YYYY-MM-DD`, read in the application's time zone. */
export type IsoDate = string;

/**
 * The constant demonstration clock fixed by contracts §1. Every "now" in the application derives
 * from it, so the same input always yields the same output.
 */
export const DEMO_CLOCK = '2026-12-03T08:00:00+01:00';

/** The only time zone the application formats in. */
export const APP_TIME_ZONE = 'Europe/Berlin';

/* ---------------------------------------------------------------------------------------------
 * Simulation labels — specification §5.3, AAP 0.10
 * ------------------------------------------------------------------------------------------- */

/**
 * The seven simulation labels, character for character as specification §5.3 fixes them. An
 * element whose figures, options, writes or configuration are simulated carries the matching
 * member, so paraphrasing one is a labelling defect rather than a wording choice.
 */
export const SIM_LABELS = [
  'Simulated data',
  'Simulated calculation',
  'Simulated recommendation',
  'Simulated write-back',
  'Simulated control',
  'Simulated market intelligence',
  'Declared, not verified',
] as const;

/** One of the seven fixed simulation labels. */
export type SimLabel = (typeof SIM_LABELS)[number];

/**
 * The tag every competitor name carries, fixed character for character by rule P-5, which ranks
 * first among the project's inputs (AAP 0.1) and therefore sets this literal. The companion-string
 * row in AAP 0.10 and the competitor row in AAP 0.14.2 pair the tag with a different company word
 * and are superseded here by that rule. The tag sits alongside the seven labels rather than inside
 * them, because it is a separate string fixed for competitor names alone (AAP 0.10, rule P-1).
 */
export const COMPETITOR_NAME_TAG = 'Synthetic company';

/**
 * The tag on the client's own radar series, which records that the series is a self-assessment
 * rather than a competitor estimate. Companion to the seven labels, not one of them.
 */
export const CLIENT_SELF_ASSESSMENT_LABEL = 'Simulated data: client self-assessment';

/**
 * The banner naming the simulated market-intelligence pack the competitive atlas draws on.
 * Companion to the seven labels, not one of them.
 */
export const ATLAS_PACK_BANNER =
  'Simulated market intelligence pack v2026.11. No first-party record is used in any competitor figure.';

/**
 * What a measure shows when its option's computation could not complete: `Cannot compute`.
 *
 * The wording is AAP §0.2.2's and §0.8's own — "the interface shows 'Cannot compute' with that
 * reason" — so it is stated here once, character for character, and a paraphrase is a wording
 * change to a string the plan fixes rather than a choice of words. Two surfaces state it and this
 * is their single copy: the comparison matrix's measure cells, and the comparison CSV's measure
 * cells in a column whose constraint check failed. The CSV builder has to reach it and is a service
 * module, which may not import a feature module (AAP §0.18.1 boundary discipline), so the string
 * lives in this leaf module beside the seven labels and the companion tags — the place both surfaces
 * already read their fixed vocabulary from.
 */
export const CANNOT_COMPUTE_LABEL = 'Cannot compute';

/* ---------------------------------------------------------------------------------------------
 * Theme and density — specification §4.3
 * ------------------------------------------------------------------------------------------- */

/** The value of the `data-theme` attribute; `command` is the default theme. */
export type ThemeName = 'command' | 'paper';

/** The value of the `data-density` attribute, selecting 32 px or 44 px table rows. */
export type Density = 'compact' | 'comfortable';

/* ---------------------------------------------------------------------------------------------
 * Data sources — platform-seed-data.md §7
 * ------------------------------------------------------------------------------------------- */

/**
 * The six data sources whose freshness the application reports. The keys are generic category
 * names; their display labels live beside the source records rather than here.
 */
export const SOURCE_IDS = [
  'erp',
  'mes',
  'scheduling',
  'plm-qms',
  'transport',
  'market-pack',
] as const;

/** One of the six data sources. */
export type SourceId = (typeof SOURCE_IDS)[number];

/* ---------------------------------------------------------------------------------------------
 * Permissions — platform-contracts.md §7.1
 * ------------------------------------------------------------------------------------------- */

/** The permission names of the contracts §7.1 matrix, in the order the matrix lists them. */
export const PERMISSIONS = [
  'exception.read',
  'exception.work',
  'scenario.create',
  'approval.request',
  'approval.decide',
  'audit.read',
  'sovereignty.read',
  'policy.read',
  'policy.exception.request',
  'document.confidential.read',
  'evidence.read',
  'evidence.review',
  'competitive.read',
  'admin.read',
] as const;

/** One permission name from the contracts §7.1 matrix. */
export type Permission = (typeof PERMISSIONS)[number];
