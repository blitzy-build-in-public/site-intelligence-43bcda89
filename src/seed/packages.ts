/**
 * PPAP packages and their evidence elements — `platform-contracts.md` §8.
 *
 * The record set the package map reads: the eighteen elements a part approval package carries, each
 * with its state, the evidence rule that decided the state and that rule's wording, the threshold the
 * rule applies and the reading the extraction produced, the extraction's confidence, whether a person
 * reviewed the value, and the document behind it. The seven evidence rules are re-run after every
 * accept or correct of an extracted value (contracts §8), and the states below are what the last run
 * produced.
 *
 * Readiness is derived, never stored. A package's figure is the elements whose state is `pass`
 * divided by the package's own element count, handed to `wholePercent` — the readiness rule, and the
 * only rounding rule the codebase holds (AAP 0.8, 0.12.1). No figure is written here:
 * `readinessPercent` is a required member of `PpapPackage`, so each package's value is counted from
 * the authored states at module initialisation and the count exists only in those states (rule P-6).
 * Four of PPAP-0219's eighteen elements are not in the pass state, so PPAP-0219 reads fourteen
 * passing elements over eighteen as 78 — the figure the assistant answers with (AAP 0.8).
 *
 * Each package covers one supplier's part for one material, and the three cover three different
 * materials. The chain is set out once here so a reader can follow it without opening three files:
 *
 * | Product | Package | Material | Supplier | Assembly |
 * |---|---|---|---|---|
 * | `PRD-R75` | `PPAP-0204` | `MAT-CAST-IRON-HOUSING` | `SUP-VLTAVA-GUSS` | `ASM-R75-01` |
 * | `PRD-A200` | `PPAP-0219` | `MAT-ALUMINIUM-DIE-CAST-COVER` | `SUP-VLTAVA-GUSS` | `ASM-A200-01` |
 * | `PRD-V40` | `PPAP-0237` | `MAT-ALUMINIUM-SHEET` | `SUP-BAJIO-METALES` | `ASM-V40-01` |
 *
 * A package's `supplierId` is exactly its material's `primarySupplierId`, because the package is
 * that supplier's part approval for that material; the material is one of `MATERIALS` and one the
 * named product is built from, and it appears in that product's assembly bill of materials. The
 * `documentId` each element carries names the record that evidences it: the elements decided by
 * RULE-DOC and RULE-18-PSW name DOC-0035, the part approval submission cover note that states the
 * drawing revision the elements were produced against and carries the part submission warrant; the
 * control-plan, measurement and appearance elements name DOC-0034, the customer notification whose
 * surface-finish measurements are the measurement evidence; the material, capability and laboratory
 * elements name DOC-0038; and the customer-specific requirement names DOC-0031, the framework supply
 * agreement the customer's requirements come from. The same element kind names the same document in
 * all three packages, so the three element sets stay parallel.
 *
 * DERIVATION — the seed document is not on disk. The package and element records belong to
 * `platform-seed-data.md`, which is not part of this repository, so no element name, rule wording,
 * threshold, reading or extraction confidence below is transcribed from it. What the inputs fix is
 * the shape and the two readings the demonstration quotes: AAP 0.2.3's three packages, the eighteen
 * elements AAP 0.12.2's readiness rule divides by, and AAP 0.8's 78 for `PPAP-0219`, which is that
 * rule applied to its fourteen passing elements. If the seed document is supplied later, its table
 * transcribes over these records and supersedes them with no change to any consumer, because every
 * consumer reads a package through the service.
 *
 * Element names, rule wording, thresholds and readings are synthetic record content (rule P-7), and
 * no stage S1-S3 screen shows them: the package map belongs to stage S4, which this run does not
 * build (AAP 0.14.2). `src/services/mock/seed-loader.ts` is the only module that imports this folder
 * (rule P-2). Documents are records of `src/seed/documents.ts` and are referenced by identifier only.
 */

import type { EvidenceRule, PpapElement, PpapPackage } from '../types';
import { wholePercent } from '../domain/solver/rounding';

/* ---------------------------------------------------------------------------------------------
 * Evidence rules — platform-contracts.md §8
 *
 * One constant per rule identifier so the wording has a single owner: an element carries the
 * identifier and the wording together, and neither is spelled out again in a component (rule P-6).
 * ------------------------------------------------------------------------------------------- */

const RULE_08_AGE: EvidenceRule = {
  id: 'RULE-08-AGE',
  text: 'A measurement-system study stands as evidence only while it is no more than twelve months old at the submission date.',
};

const RULE_09_DIM: EvidenceRule = {
  id: 'RULE-09-DIM',
  text: 'Every characteristic the drawing dimensions carries its own measured value and its own tolerance.',
};

const RULE_10_POR: EvidenceRule = {
  id: 'RULE-10-POR',
  text: 'Each casting lot reports its void fraction against the limit the material specification states.',
};

const RULE_11_CPK: EvidenceRule = {
  id: 'RULE-11-CPK',
  text: 'Every special characteristic reaches the initial process capability index the control plan requires.',
};

const RULE_12_LAB: EvidenceRule = {
  id: 'RULE-12-LAB',
  text: 'Every test the control plan names is covered by the scope of a qualified laboratory.',
};

const RULE_18_PSW: EvidenceRule = {
  id: 'RULE-18-PSW',
  text: 'The part submission warrant is signed only after every element above it is complete.',
};

const RULE_DOC: EvidenceRule = {
  id: 'RULE-DOC',
  text: 'A document stands as evidence only for the part revision it names.',
};

/* ---------------------------------------------------------------------------------------------
 * PPAP-0219 — the package the assistant's readiness figure is stated for (AAP 0.8)
 * ------------------------------------------------------------------------------------------- */

/**
 * The eighteen elements of PPAP-0219, in the order the package lists them, numbered 1 to 18.
 *
 * Fourteen are in the `pass` state and four are not: the measurement-system study is `stale`, the
 * casting lot's void fraction failed its limit, the appearance report awaits a disposition, and one
 * part-specific requirement awaits the customer's answer. The aggregation turns that arrangement
 * into the package's readiness figure; nothing here states it.
 *
 * No element of the three packages carries a `pinId`. The member is optional and states the
 * document-and-pin association where one is attached: the package map and the pins it opens are the
 * package surface of stage S4, which this run does not build (AAP 0.12.2), and the record that
 * attaches a pin to an element belongs to the seed document's pins section, which declares none for
 * these elements. What each element does name stands: its `documentId` carries the evidence document
 * behind the reading that decided its state, as this module's header sets out.
 */
export const PPAP_ELEMENTS: readonly PpapElement[] = [
  {
    number: 1,
    name: 'Design records of saleable product',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'The drawing at the revision the purchase order names',
    actual: 'Drawing revision C, 14 sheets, dated 2026-02-11',
    extractionConfidence: 0.97,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 2,
    name: 'Authorised engineering change documents',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One change notice per deviation from the drawing revision',
    actual: 'Two change notices, both authorised 2026-06-30',
    extractionConfidence: 0.94,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 3,
    name: 'Customer engineering approval',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Written approval where the drawing marks a controlled characteristic',
    actual: 'Approval recorded 2026-07-08, no open condition',
    extractionConfidence: 0.92,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 4,
    name: 'Design failure mode and effects analysis',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One study per part family, reissued at each design change',
    actual: 'Study revised 2026-09-18, three risks carried forward',
    extractionConfidence: 0.88,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 5,
    name: 'Process flow diagram',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every operation from goods receipt to despatch on one diagram',
    actual: 'Eleven operations, each with a process owner',
    extractionConfidence: 0.91,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 6,
    name: 'Process failure mode and effects analysis',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'An action for every risk the study rates nine or above',
    actual: 'Three actions open, none rated nine or above',
    extractionConfidence: 0.86,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 7,
    name: 'Control plan',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One control row per characteristic on the inspection plan',
    actual: '26 control rows, 12 of them marked special',
    extractionConfidence: 0.93,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 8,
    name: 'Measurement system study',
    state: 'stale',
    ruleId: RULE_08_AGE.id,
    ruleText: RULE_08_AGE.text,
    threshold: 'A study no more than twelve months old at the submission date',
    actual: 'Study dated 2025-08-14, revalidation booked for 2026-08-14',
    extractionConfidence: 0.95,
    humanReviewed: false,
    documentId: 'DOC-0034',
  },
  {
    number: 9,
    name: 'Dimensional results',
    state: 'pass',
    ruleId: RULE_09_DIM.id,
    ruleText: RULE_09_DIM.text,
    threshold: 'Every dimensioned characteristic with its own measured value',
    actual: '34 of 34 characteristics reported, all inside tolerance',
    extractionConfidence: 0.98,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 10,
    name: 'Material and performance test results',
    state: 'fail',
    ruleId: RULE_10_POR.id,
    ruleText: RULE_10_POR.text,
    threshold: 'Void fraction at or below 0.015 of the tested section',
    actual: 'Void fraction 0.021 on casting lot 44',
    extractionConfidence: 0.96,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 11,
    name: 'Initial process study',
    state: 'pass',
    ruleId: RULE_11_CPK.id,
    ruleText: RULE_11_CPK.text,
    threshold: 'A capability index of at least 1.67 on every special characteristic',
    actual: '1.82 on the bore diameter, 1.71 on the face run-out',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 12,
    name: 'Qualified laboratory documentation',
    state: 'pass',
    ruleId: RULE_12_LAB.id,
    ruleText: RULE_12_LAB.text,
    threshold: 'Scope covering every test the control plan names',
    actual: 'Scope dated 2026-03-31, all nine tests covered',
    extractionConfidence: 0.87,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 13,
    name: 'Appearance approval report',
    state: 'review',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One report for a part finished in a colour or grain the drawing states',
    actual: 'Report submitted 2026-11-20, disposition not yet returned',
    extractionConfidence: 0.84,
    humanReviewed: false,
    documentId: 'DOC-0034',
  },
  {
    number: 14,
    name: 'Sample production parts',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Three parts taken from the production run',
    actual: 'Three parts received 2026-11-12, all from run 1184',
    extractionConfidence: 0.89,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 15,
    name: 'Master sample',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One master sample signed by the supplier and by the customer',
    actual: 'Master sample signed 2026-11-13, held at the supplier',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 16,
    name: 'Checking aids',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every gauge listed with its identifier and its calibration due date',
    actual: 'Nine gauges listed, all in calibration to 2027-03-31',
    extractionConfidence: 0.85,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 17,
    name: 'Customer-specific requirements',
    state: 'pending',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every requirement on the part-specific list answered',
    actual: 'Packaging requirement awaiting the customer answer',
    extractionConfidence: 0.8,
    humanReviewed: false,
    documentId: 'DOC-0031',
  },
  {
    number: 18,
    name: 'Part submission warrant',
    state: 'pass',
    ruleId: RULE_18_PSW.id,
    ruleText: RULE_18_PSW.text,
    threshold: 'Warrant signed only once every element above it is complete',
    actual: 'Warrant drafted 2026-11-25, signature fields complete',
    extractionConfidence: 0.82,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
];

/**
 * The passing elements of PPAP-0219, counted from the authored states once, at module
 * initialisation, so that no number reaches the record by hand (rule P-6). The count becomes the
 * package's readiness through `wholePercent`, the same rule the aggregation applies to it — the only
 * rounding rule in the codebase (AAP 0.8, 0.12.1) — and the dependency runs one way: this seed module
 * reads that pure helper, and nothing under `src/domain` reads `src/seed`.
 */
let ppap0219Passed = 0;
for (const element of PPAP_ELEMENTS) {
  if (element.state === 'pass') {
    ppap0219Passed += 1;
  }
}

/* ---------------------------------------------------------------------------------------------
 * PPAP-0204 — the second package, on a part the same eighteen elements cover
 * ------------------------------------------------------------------------------------------- */

const PPAP_0204_ELEMENTS: readonly PpapElement[] = [
  {
    number: 1,
    name: 'Design records of saleable product',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'The drawing at the revision the purchase order names',
    actual: 'Drawing revision B, 11 sheets, dated 2025-10-02',
    extractionConfidence: 0.96,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 2,
    name: 'Authorised engineering change documents',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One change notice per deviation from the drawing revision',
    actual: 'One change notice, authorised 2026-04-17',
    extractionConfidence: 0.93,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 3,
    name: 'Customer engineering approval',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Written approval where the drawing marks a controlled characteristic',
    actual: 'Approval recorded 2026-05-06, one condition closed 2026-07-01',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 4,
    name: 'Design failure mode and effects analysis',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One study per part family, reissued at each design change',
    actual: 'Study revised 2026-06-22, one risk carried forward',
    extractionConfidence: 0.89,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 5,
    name: 'Process flow diagram',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every operation from goods receipt to despatch on one diagram',
    actual: 'Nine operations, each with a process owner',
    extractionConfidence: 0.92,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 6,
    name: 'Process failure mode and effects analysis',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'An action for every risk the study rates nine or above',
    actual: 'Two actions open, neither rated nine or above',
    extractionConfidence: 0.87,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 7,
    name: 'Control plan',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One control row per characteristic on the inspection plan',
    actual: '19 control rows, eight of them marked special',
    extractionConfidence: 0.94,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 8,
    name: 'Measurement system study',
    state: 'pass',
    ruleId: RULE_08_AGE.id,
    ruleText: RULE_08_AGE.text,
    threshold: 'A study no more than twelve months old at the submission date',
    actual: 'Study dated 2026-04-09, inside the twelve-month window',
    extractionConfidence: 0.95,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 9,
    name: 'Dimensional results',
    state: 'review',
    ruleId: RULE_09_DIM.id,
    ruleText: RULE_09_DIM.text,
    threshold: 'Every dimensioned characteristic with its own measured value',
    actual: '31 of 33 characteristics reported, two awaiting a rework measurement',
    extractionConfidence: 0.81,
    humanReviewed: false,
    documentId: 'DOC-0034',
  },
  {
    number: 10,
    name: 'Material and performance test results',
    state: 'pass',
    ruleId: RULE_10_POR.id,
    ruleText: RULE_10_POR.text,
    threshold: 'Void fraction at or below 0.015 of the tested section',
    actual: 'Void fraction 0.011 on casting lot 27',
    extractionConfidence: 0.97,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 11,
    name: 'Initial process study',
    state: 'fail',
    ruleId: RULE_11_CPK.id,
    ruleText: RULE_11_CPK.text,
    threshold: 'A capability index of at least 1.67 on every special characteristic',
    actual: 'Capability index 1.42 on the shoulder radius',
    extractionConfidence: 0.93,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 12,
    name: 'Qualified laboratory documentation',
    state: 'pass',
    ruleId: RULE_12_LAB.id,
    ruleText: RULE_12_LAB.text,
    threshold: 'Scope covering every test the control plan names',
    actual: 'Scope dated 2026-01-15, all seven tests covered',
    extractionConfidence: 0.88,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 13,
    name: 'Appearance approval report',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One report for a part finished in a colour or grain the drawing states',
    actual: 'Report returned 2026-10-02, finish approved',
    extractionConfidence: 0.86,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 14,
    name: 'Sample production parts',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Three parts taken from the production run',
    actual: 'Three parts received 2026-10-05, all from run 1092',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 15,
    name: 'Master sample',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One master sample signed by the supplier and by the customer',
    actual: 'Master sample signed 2026-10-06, held at the supplier',
    extractionConfidence: 0.91,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 16,
    name: 'Checking aids',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every gauge listed with its identifier and its calibration due date',
    actual: 'Seven gauges listed, all in calibration to 2027-01-31',
    extractionConfidence: 0.87,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 17,
    name: 'Customer-specific requirements',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every requirement on the part-specific list answered',
    actual: 'Every requirement answered 2026-09-30, no open item',
    extractionConfidence: 0.85,
    humanReviewed: true,
    documentId: 'DOC-0031',
  },
  {
    number: 18,
    name: 'Part submission warrant',
    state: 'pending',
    ruleId: RULE_18_PSW.id,
    ruleText: RULE_18_PSW.text,
    threshold: 'Warrant signed only once every element above it is complete',
    actual: 'Warrant drafted 2026-10-20, awaiting the customer answer',
    extractionConfidence: 0.79,
    humanReviewed: false,
    documentId: 'DOC-0035',
  },
];

/** Passing elements of PPAP-0204, counted from the authored states for the reason above. */
let ppap0204Passed = 0;
for (const element of PPAP_0204_ELEMENTS) {
  if (element.state === 'pass') {
    ppap0204Passed += 1;
  }
}

/* ---------------------------------------------------------------------------------------------
 * PPAP-0237 — the third package, whose evidence is the least complete of the three
 * ------------------------------------------------------------------------------------------- */

const PPAP_0237_ELEMENTS: readonly PpapElement[] = [
  {
    number: 1,
    name: 'Design records of saleable product',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'The drawing at the revision the purchase order names',
    actual: 'Drawing revision A, nine sheets, dated 2024-12-04',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 2,
    name: 'Authorised engineering change documents',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One change notice per deviation from the drawing revision',
    actual: 'Three change notices, all authorised by 2026-09-30',
    extractionConfidence: 0.88,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 3,
    name: 'Customer engineering approval',
    state: 'empty',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Written approval where the drawing marks a controlled characteristic',
    actual: 'No approval record on file',
    extractionConfidence: 0.62,
    humanReviewed: false,
    documentId: 'DOC-0035',
  },
  {
    number: 4,
    name: 'Design failure mode and effects analysis',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One study per part family, reissued at each design change',
    actual: 'Study revised 2025-11-08, two risks carried forward',
    extractionConfidence: 0.85,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 5,
    name: 'Process flow diagram',
    state: 'review',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every operation from goods receipt to despatch on one diagram',
    actual: 'Six operations shown, despatch not yet drawn',
    extractionConfidence: 0.78,
    humanReviewed: false,
    documentId: 'DOC-0035',
  },
  {
    number: 6,
    name: 'Process failure mode and effects analysis',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'An action for every risk the study rates nine or above',
    actual: 'One action open, rated seven',
    extractionConfidence: 0.83,
    humanReviewed: true,
    documentId: 'DOC-0035',
  },
  {
    number: 7,
    name: 'Control plan',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One control row per characteristic on the inspection plan',
    actual: '14 control rows, five of them marked special',
    extractionConfidence: 0.89,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 8,
    name: 'Measurement system study',
    state: 'stale',
    ruleId: RULE_08_AGE.id,
    ruleText: RULE_08_AGE.text,
    threshold: 'A study no more than twelve months old at the submission date',
    actual: 'Study dated 2024-06-19, revalidation not booked',
    extractionConfidence: 0.91,
    humanReviewed: false,
    documentId: 'DOC-0034',
  },
  {
    number: 9,
    name: 'Dimensional results',
    state: 'pass',
    ruleId: RULE_09_DIM.id,
    ruleText: RULE_09_DIM.text,
    threshold: 'Every dimensioned characteristic with its own measured value',
    actual: '21 of 21 characteristics reported, all inside tolerance',
    extractionConfidence: 0.95,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 10,
    name: 'Material and performance test results',
    state: 'fail',
    ruleId: RULE_10_POR.id,
    ruleText: RULE_10_POR.text,
    threshold: 'Void fraction at or below 0.015 of the tested section',
    actual: 'Void fraction 0.024 on casting lot 18',
    extractionConfidence: 0.94,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 11,
    name: 'Initial process study',
    state: 'pass',
    ruleId: RULE_11_CPK.id,
    ruleText: RULE_11_CPK.text,
    threshold: 'A capability index of at least 1.67 on every special characteristic',
    actual: 'Capability index 1.74 on the bore diameter',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0038',
  },
  {
    number: 12,
    name: 'Qualified laboratory documentation',
    state: 'stale',
    ruleId: RULE_12_LAB.id,
    ruleText: RULE_12_LAB.text,
    threshold: 'Scope covering every test the control plan names',
    actual: 'Scope lapsed 2025-02-28, renewal request sent 2026-10-09',
    extractionConfidence: 0.86,
    humanReviewed: false,
    documentId: 'DOC-0038',
  },
  {
    number: 13,
    name: 'Appearance approval report',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One report for a part finished in a colour or grain the drawing states',
    actual: 'Report returned 2026-08-14, finish approved',
    extractionConfidence: 0.87,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 14,
    name: 'Sample production parts',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Three parts taken from the production run',
    actual: 'Three parts received 2026-08-20, all from run 0977',
    extractionConfidence: 0.88,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 15,
    name: 'Master sample',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'One master sample signed by the supplier and by the customer',
    actual: 'Master sample signed 2026-08-21, held at the supplier',
    extractionConfidence: 0.9,
    humanReviewed: true,
    documentId: 'DOC-0034',
  },
  {
    number: 16,
    name: 'Checking aids',
    state: 'pending',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every gauge listed with its identifier and its calibration due date',
    actual: 'Gauge list incomplete, two gauges without a calibration date',
    extractionConfidence: 0.74,
    humanReviewed: false,
    documentId: 'DOC-0034',
  },
  {
    number: 17,
    name: 'Customer-specific requirements',
    state: 'pass',
    ruleId: RULE_DOC.id,
    ruleText: RULE_DOC.text,
    threshold: 'Every requirement on the part-specific list answered',
    actual: 'Every requirement answered 2026-07-30, no open item',
    extractionConfidence: 0.82,
    humanReviewed: true,
    documentId: 'DOC-0031',
  },
  {
    number: 18,
    name: 'Part submission warrant',
    state: 'empty',
    ruleId: RULE_18_PSW.id,
    ruleText: RULE_18_PSW.text,
    threshold: 'Warrant signed only once every element above it is complete',
    actual: 'No warrant on file, the elements above it are open',
    extractionConfidence: 0.6,
    humanReviewed: false,
    documentId: 'DOC-0035',
  },
];

/** Passing elements of PPAP-0237, counted from the authored states for the reason above. */
let ppap0237Passed = 0;
for (const element of PPAP_0237_ELEMENTS) {
  if (element.state === 'pass') {
    ppap0237Passed += 1;
  }
}

/* ---------------------------------------------------------------------------------------------
 * The three packages
 * ------------------------------------------------------------------------------------------- */

/**
 * The three part approval packages the seed carries, each covering one supplier's part for one
 * material and carrying all eighteen elements.
 *
 * `readinessPercent` is that count over the package's element count handed to `wholePercent`, so the
 * figure is stated by the one rounding rule the codebase holds (AAP 0.8, 0.12.1) and cannot disagree
 * with the element states a review leaves behind (rule P-6). `elements` is a copy because a
 * package's elements are the mutable records the service holds, while the exported element lists are
 * read-only. Each record's `materialId` is one of `MATERIALS` and its `supplierId` that material's
 * `primarySupplierId`; the product, package, material and supplier each one states are tabled in
 * this module's header.
 */
export const PPAP_PACKAGES: readonly PpapPackage[] = [
  {
    id: 'PPAP-0219',
    supplierId: 'SUP-VLTAVA-GUSS',
    materialId: 'MAT-ALUMINIUM-DIE-CAST-COVER',
    elements: [...PPAP_ELEMENTS],
    readinessPercent: wholePercent(ppap0219Passed / PPAP_ELEMENTS.length),
  },
  {
    id: 'PPAP-0204',
    supplierId: 'SUP-VLTAVA-GUSS',
    materialId: 'MAT-CAST-IRON-HOUSING',
    elements: [...PPAP_0204_ELEMENTS],
    readinessPercent: wholePercent(ppap0204Passed / PPAP_0204_ELEMENTS.length),
  },
  {
    id: 'PPAP-0237',
    supplierId: 'SUP-BAJIO-METALES',
    materialId: 'MAT-ALUMINIUM-SHEET',
    elements: [...PPAP_0237_ELEMENTS],
    readinessPercent: wholePercent(ppap0237Passed / PPAP_0237_ELEMENTS.length),
  },
];

