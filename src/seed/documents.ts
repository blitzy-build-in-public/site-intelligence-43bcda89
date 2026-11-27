/**
 * The eight seeded documents and the bodies a permitted caller reads from them (AAP 0.12.2's
 * `DocumentBody` row, `platform-seed-data.md` §7).
 *
 * Each record carries the fixed content a screen or the evidence assistant quotes: the title, the
 * classification that decides who may read the body, the residency the document carries, the
 * attachments the record lists, and the body text itself. Two records are
 * `customer-confidential` — DOC-0031, the supply agreement, and DOC-0034, the customer's own
 * quality notification — because the mock adapter withholds a customer-confidential body before it
 * crosses the service boundary for the platform administrator (USR-04, AAP 0.2.1), and a single
 * such record would leave that path as a special case rather than a rule. DOC-0031 is also the
 * document whose presence in the assistant's context makes POL-007 deny the external reasoning
 * model and offer the in-boundary model instead (AAP 0.12.4, SCR-06).
 *
 * The figures these bodies state — the service charge of EUR 2,500 per day and the 48-hour notice
 * in DOC-0031 above all — are record content the interface quotes, not computed results, so rule
 * P-6 leaves them in the record and forbids this module deriving any charge, total or aggregate
 * from them. No body asserts a security property the demonstration does not implement (rule P-4);
 * DOC-0038 records contractual obligations and closes by stating that it describes no technical
 * measure. Every name, place and particular here is synthetic and belongs to the seed records
 * alone (rule P-7). Each attachment is described by name, type and size and by nothing else — no
 * URL, no hosted link and no embedded asset (rule B-1), and no record carries a credential field
 * (rule B-2). Body text is plain prose: it holds no markup, so the drawer and the assistant that
 * render a body keep control of the semantics, the reading order and the contrast the theme sets
 * (rule B-3).
 *
 * The module holds data only: no logic, no class, no module-level mutable state. Only
 * `src/services/mock/seed-loader.ts` imports this folder (rule P-2), which clones the records so a
 * consumer never holds the arrays above.
 */

import type { DocumentBody } from '../types';

/**
 * The eight seeded documents, in identifier order.
 *
 * `DOC-0031` is the record the assistant holds in context, the customer redaction path and the
 * POL-007 policy block all name; the rest are the supplier, quality and contractual records the
 * evidence drawer and the assistant's citations resolve. Classification values are the three the
 * inputs allow this module to state — `customer-confidential`, `supplier-confidential` and
 * `internal` — because contracts §3 fixes the type without fixing its members. Residency is
 * `eu-only` throughout, the only value the inputs quote and the one the deployment declares.
 */
export const DOCUMENTS: readonly DocumentBody[] = [
  {
    id: 'DOC-0031',
    title: 'Framework supply agreement: aluminium housings for line 2 at PLT-BRN',
    classification: 'customer-confidential',
    residency: 'eu-only',
    attachments: [
      { id: 'ATT-0031-1', name: 'framework-supply-agreement-2026.pdf (PDF, 412 KB)' },
      { id: 'ATT-0031-2', name: 'capacity-reservation-schedule.xlsx (XLSX, 96 KB)' },
    ],
    body: 'Framework supply agreement between the two signatories for the aluminium housings consumed on production line 2 at PLT-BRN. Clause 7 reserves two shifts per working day and reviews the reservation each quarter against the rolling forecast. Clause 9 requires 48-hour written notice before a confirmed call-off is cancelled, and a call-off cancelled inside that window stays payable in full. Clause 12 sets a service charge of EUR 2,500 per day where a line stop caused by a missed delivery runs beyond one shift, payable against a stoppage record both parties sign. Clause 14 keeps the tooling in the ownership of the buyer and clause 16 sets the annual price review.',
  },
  {
    id: 'DOC-0032',
    title: 'Sub-tier capacity declaration: extrusion press restart for the delayed call-off',
    classification: 'supplier-confidential',
    residency: 'eu-only',
    attachments: [{ id: 'ATT-0032-1', name: 'restart-declaration-2026-11-25.pdf (PDF, 188 KB)' }],
    body: 'Declaration from the sub-tier origin that feeds the delayed purchase order behind EXC-2026-1184. The extrusion press that supplies the housing blank stopped on 21 November 2026 for a die repair, and the origin declares a restart on 27 November 2026 with a first-pass yield below its usual level for the first two shifts. Recovery to the committed weekly volume is declared for the week beginning 7 December 2026. The declaration names the press, the die and the two affected part numbers, and it records that no second origin is qualified for the blank at this drawing revision. The origin reports weekly until the arrears are cleared.',
  },
  {
    id: 'DOC-0033',
    title: 'Internal planning note: response options for EXC-2026-1184',
    classification: 'internal',
    residency: 'eu-only',
    attachments: [{ id: 'ATT-0033-1', name: 'constraint-set-case-1184.csv (CSV, 4 KB)' }],
    body: 'Internal note recording the response options a planner may compare for EXC-2026-1184. Two levers sit in scope: air freight of the delayed sets from the tier-2 origin, and an inter-plant transfer from the finished-goods stock held at PLT-QRO. The note states what each lever changes, which constraints bound it, and who may request approval of the resulting plan. Every measure shown against a lever is produced by the solver at the moment the planner opens the comparison, so the note records the options and their constraints and quotes no measure of its own. A lever that breaches a constraint stays visible with the breaching constraint named and cannot be sent for approval.',
  },
  {
    id: 'DOC-0034',
    title: 'Customer quality notification: housing surface finish at PLT-BRN',
    classification: 'customer-confidential',
    residency: 'eu-only',
    attachments: [
      { id: 'ATT-0034-1', name: 'customer-quality-notification-2026-11-25.pdf (PDF, 240 KB)' },
      { id: 'ATT-0034-2', name: 'surface-finish-measurements.xlsx (XLSX, 132 KB)' },
    ],
    body: 'Quality notification raised against the housing batch held at PLT-BRN after the surface-finish deviation found on 24 November 2026. The notification records the drawing characteristic, the measured departure from it, and the containment the customer asks for within five working days. It records the customer request that no further shipment leave the plant until the containment report is accepted, and it names the quality contact at each party. The notification closes with the batch reference that EXC-2026-1190 carries, so the quality hold and this record read as one thread.',
  },
  {
    id: 'DOC-0035',
    title: 'Part approval submission cover note: PPAP-0219',
    classification: 'supplier-confidential',
    residency: 'eu-only',
    attachments: [
      { id: 'ATT-0035-1', name: 'part-submission-warrant-2026-11.pdf (PDF, 120 KB)' },
      { id: 'ATT-0035-2', name: 'element-index.csv (CSV, 6 KB)' },
    ],
    body: 'Cover note of the part approval submission recorded as PPAP-0219. The submission carries all eighteen elements of the approval package, from the design records and the process flow through to the measurement system study and the part submission warrant. The note names the drawing revision the elements were produced against and lists the two elements whose records were re-issued after the previous submission. Element states and package readiness are derived from the element records each time the package is opened, so the note quotes neither.',
  },
  {
    id: 'DOC-0036',
    title: 'Quality hold procedure: non-conforming material disposition',
    classification: 'internal',
    residency: 'eu-only',
    attachments: [{ id: 'ATT-0036-1', name: 'hold-and-disposition-procedure-v4.pdf (PDF, 356 KB)' }],
    body: 'Procedure for placing non-conforming material on hold and disposing of it. A hold is raised against a material, a batch and a plant, and it stops the material being issued to a line until a material review board records a disposition. The board may release, rework, sort or scrap, and it records the reason for the disposition it chooses. The procedure sets the review within three working days of the hold and names the roles that may sit on the board. Each disposition is recorded against the hold record, so a later review reads what was decided and why.',
  },
  {
    id: 'DOC-0037',
    title: 'Transport booking instruction: sea-freight recovery shipment',
    classification: 'supplier-confidential',
    residency: 'eu-only',
    attachments: [{ id: 'ATT-0037-1', name: 'booking-instruction-2026-11-26.pdf (PDF, 88 KB)' }],
    body: 'Booking instruction for the sea-freight recovery shipment that follows the expedited consignment. The instruction names the port of loading, the port of discharge, the container count and the sailing the booking is held against. It records the delivered-duty-paid terms and the party that files the customs entry, and it states that the booking may move to a later sailing without a new instruction. The forwarder confirms each container by booking reference, and the plant records the confirmed reference against the purchase order it covers.',
  },
  {
    id: 'DOC-0038',
    title: 'Confidentiality and data-handling annex: supplier records',
    classification: 'supplier-confidential',
    residency: 'eu-only',
    attachments: [
      { id: 'ATT-0038-1', name: 'data-handling-annex-2026.pdf (PDF, 164 KB)' },
      { id: 'ATT-0038-2', name: 'declared-processing-locations.csv (CSV, 3 KB)' },
    ],
    body: 'Annex to the framework agreement recording how each party handles the other party records. It lists the record classes each party receives, the places where each party declares it processes them, and the notice each party gives before a new sub-processor touches them. The annex obliges each party to report its declared processing location once a year and to answer a written question about a record within ten working days. It states obligations between the signatories only, and it describes no technical measure and no check that either party performs.',
  },
];
