/**
 * The twelve current operational exceptions of the demonstration: what changed, where it hurts, who
 * owns it and how far it can travel.
 *
 * Fixing inputs. `platform-contracts.md` §3 declares `OperationalException` and `AffectedLine`;
 * `platform-specification.md` §7 defines screens SCR-02 and SCR-03 over them; AAP 0.12.2's
 * `OperationalException` row fixes the members and AAP 0.2.3's scale row fixes the count at
 * twelve current exceptions. The record shape lives in `src/types/entities.ts` and is transcribed
 * from there rather than restated, so this module holds values only.
 *
 * Who reads it. `src/services/mock/seed-loader.ts` is the only importer, and the mock adapter
 * serves these records to the exception queue (SCR-02), the investigation (SCR-03) and the canvas
 * ribbon (SCR-12). Rule P-2 forbids any other importer: a component or a screen reads an exception
 * through the service interface, never from here.
 *
 * What it must not hold. No revenue figure, no units-late figure and no aggregate (rule P-6). The
 * revenue an exception places at risk is computed from `affectedLines` by
 * `src/domain/aggregation/exceptions.ts`, and for `EXC-2026-1184` the lines themselves come from
 * the baseline solve of `CASE-1184`. `daysToImpact` and `unitsAtRisk` are seeded record fields the
 * aggregates read; no screen restates either as a figure of its own.
 *
 * The record set. Twelve identifiers, `EXC-2026-1184` to `EXC-2026-1195`. Two are fixed by the
 * inputs: `EXC-2026-1184`, the supply delay at `PLT-BRN` that `CASE-1184` measures on the delayed
 * purchase order `PO-45011884`, and `EXC-2026-1190`, a quality hold whose `whatChanged` states the
 * housings on hold (AAP 0.8). The other ten are synthetic records spread over the four plants, with
 * severities and statuses drawn from the closed vocabularies and the second plant an exception
 * reaches named in `alsoAffectsPlantIds`. `EXC-2026-1185`, `EXC-2026-1187` and `EXC-2026-1195` are
 * the exceptions whose options are seeded scenarios in `src/seed/exception-scenarios.ts`, which is
 * why those columns carry `Simulated data` rather than `Simulated calculation` in the comparison
 * matrix (AAP 0.10).
 *
 * Where `src/seed/exception-history.ts` holds the activity of an exception, this record agrees with
 * it without either being derived from the other: `detectedAt` is the instant that history's
 * `opened` record states, and `status` is the state its last record leaves. `EXC-2026-1187` is
 * therefore resolved, because the containment of its deviation was confirmed and closed, while the
 * exceptions the history leaves open stay open here.
 *
 * Every open exception names at least one customer order whose own status is `at-risk`, which is the
 * state `src/seed/customer-orders.ts` defines as being named by an open exception's affected lines.
 *
 * DERIVATION - identifier keys. Every reference in this module resolves against another seed record:
 * a `lineId` is one of the six lines `src/seed/plants.ts` declares for that plant, an affected line
 * is one of the fifteen named orders of `src/seed/customer-orders.ts` carrying that record's own
 * product, plant and promise date, and each material, supplier and purchase order is a record of
 * `src/seed/materials.ts`, `src/seed/suppliers.ts` and `src/seed/purchase-orders.ts`, restated here
 * exactly as its purchase order states them. The inputs do not enumerate them for this module, and
 * no consumer may restate one, because a screen reads its references from the service.
 *
 * Rules served:
 * - P-6: record content only. `whatChanged` describes what changed in words, and the one figure it
 *   states - the housings on hold - is the record's own content rather than a computation.
 * - P-1: nothing here presents a synthetic exception as a production result, and no simulation
 *   label is paraphrased into this text; the interface carries the labels of specification §5.3.
 * - P-4: no text here claims a deployment property, asserts that copying is prevented, or claims
 *   that the audit records are protected from alteration.
 * - P-7: every supplier, site and part here is a synthetic record; no real vendor, customer,
 *   carmaker or cloud product is named, and no text is filler prose.
 * - P-2: the only import is `src/types`, so this module cannot become a second data boundary.
 * - B-1, B-2: no address of any kind and no credential-shaped member, and nothing here reads
 *   configuration.
 *
 * Optional members are omitted rather than set to `undefined`, as `exactOptionalPropertyTypes`
 * requires: `solverCaseId` appears on `EXC-2026-1184` alone, the only exception with a solver case
 * in this run.
 */

import type { OperationalException } from '../types';

/**
 * The twelve current operational exceptions, in identifier order.
 *
 * The order is the seed's own rather than the queue's: the queue's default ordering - severity,
 * then days to impact, then revenue at risk descending - is applied by the service, so reordering
 * this array changes no screen and would only obscure which records a reader is comparing.
 */
export const EXCEPTIONS: readonly OperationalException[] = [
  // The one exception with a solver case: CASE-1184 measures it on the delayed purchase order
  // PO-45011884, and its affected lines are the baseline solve's two orders.
  {
    id: 'EXC-2026-1184',
    title: 'Seal-kit consignment slips past its confirmed arrival date',
    type: 'supply-delay',
    severity: 'critical',
    status: 'open',
    plantId: 'PLT-BRN',
    alsoAffectsPlantIds: ['PLT-RGB'],
    materialId: 'MAT-SEAL-KIT',
    supplierId: 'SUP-DONAU-DICHTUNG',
    purchaseOrderId: 'PO-45011884',
    lineId: 'LN-BRN-1',
    ownerId: 'USR-01',
    daysToImpact: 4,
    affectedLines: [
      {
        orderId: 'CO-770233',
        productId: 'PRD-R75',
        plantId: 'PLT-RGB',
        dueDate: '2026-12-09',
        unitsAtRisk: 580,
      },
      {
        orderId: 'CO-770251',
        productId: 'PRD-R75',
        plantId: 'PLT-RGB',
        dueDate: '2026-12-16',
        unitsAtRisk: 640,
      },
    ],
    solverCaseId: 'CASE-1184',
    missingInputs: ['Transport: revised arrival date for PO-45011884'],
    confidence: {
      level: 'medium',
      reason:
        'The supplier confirmed the dispatch slip in writing, but the date the replacement consignment leaves is still unconfirmed.',
    },
    whatChanged:
      'The supplier has moved the dispatch of the EPDM seal kit the Brno assembly line draws on, and the arrival date the open purchase order carries is no longer one the supplier will hold. The same seal kit is fitted on the Riga build, so the consignment reaches the R75 orders promised there as well, and the stock at neither plant carries the build past its first promise date.',
    detectedAt: '2026-11-27T06:55:00+01:00',
  },
  {
    id: 'EXC-2026-1185',
    title: 'Late-shift station loading outruns the short-term schedule',
    type: 'capacity-shortage',
    severity: 'high',
    status: 'open',
    plantId: 'PLT-QRO',
    alsoAffectsPlantIds: [],
    materialId: 'MAT-CONTROL-PCBA',
    supplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    purchaseOrderId: 'PO-45011946',
    lineId: 'LN-QRO-1',
    ownerId: 'USR-05',
    daysToImpact: 2,
    affectedLines: [
      {
        orderId: 'CO-770227',
        productId: 'PRD-A200',
        plantId: 'PLT-QRO',
        dueDate: '2026-12-07',
        unitsAtRisk: 275,
      },
    ],
    missingInputs: ['MES: station loading on LN-QRO-1 for the late shift'],
    confidence: {
      level: 'medium',
      reason:
        'The clash is read from the short-term schedule, while the loading the late shift actually carries is not readable, so the output the plant can still reach is an estimate.',
    },
    whatChanged:
      'The short-term schedule moved the control-board build onto the late shift, and the station that places the boards is already the busiest on the line at that hour, so the plant cannot build the resequenced orders at the rate the plan assumes. The clash reaches the first order the resequenced plan covers, and the plant has to choose which orders to move again.',
    detectedAt: '2026-11-30T06:20:00+01:00',
  },
  {
    id: 'EXC-2026-1186',
    title: 'Extra machining passes outrun the shift pattern at the Rakovník plant',
    type: 'capacity-shortage',
    severity: 'medium',
    status: 'open',
    plantId: 'PLT-RAK',
    alsoAffectsPlantIds: ['PLT-RGB'],
    materialId: 'MAT-STAINLESS-BAR',
    supplierId: 'SUP-HANSA-METALL',
    purchaseOrderId: 'PO-45011924',
    lineId: 'LN-RAK-1',
    ownerId: 'USR-05',
    daysToImpact: 4,
    affectedLines: [
      {
        orderId: 'CO-770233',
        productId: 'PRD-R75',
        plantId: 'PLT-RGB',
        dueDate: '2026-12-09',
        unitsAtRisk: 580,
      },
    ],
    missingInputs: ['Scheduling: shift pattern in force at the Rakovník plant'],
    confidence: {
      level: 'low',
      reason:
        'The conversion rate is read from the standard routing, while the shift pattern the plant actually runs is not readable, so the output the extra passes leave is an estimate.',
    },
    whatChanged:
      'The stainless bar now arriving needs two additional machining passes that the standard routing did not carry, so the component line cannot convert the bar at the rate the plan assumes. The same bar is bought for the Riga build as well, so the shortfall reaches the order promised from there before the shift pattern can be changed.',
    detectedAt: '2026-11-30T09:05:00+01:00',
  },
  {
    id: 'EXC-2026-1187',
    title: 'Control-board deviation closed after containment',
    type: 'quality-hold',
    severity: 'high',
    status: 'resolved',
    plantId: 'PLT-QRO',
    alsoAffectsPlantIds: [],
    materialId: 'MAT-CONTROL-PCBA',
    supplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    purchaseOrderId: 'PO-45011946',
    lineId: 'LN-QRO-1',
    ownerId: 'USR-07',
    daysToImpact: 0,
    affectedLines: [
      {
        orderId: 'CO-770227',
        productId: 'PRD-A200',
        plantId: 'PLT-QRO',
        dueDate: '2026-12-07',
        unitsAtRisk: 275,
      },
    ],
    missingInputs: [],
    confidence: {
      level: 'high',
      reason:
        'Containment was confirmed on the follow-up inspection, so the deviation is recorded against the lot rather than left open.',
    },
    whatChanged:
      'The control-board lot delivered against the purchase order carried a deviation on the incoming inspection record, and the lot was held while the deviation was contained. The follow-up inspection confirmed the containment, the deviation stays recorded against the lot, and the exception was closed before the first order it touched fell due.',
    detectedAt: '2026-12-01T08:40:00+01:00',
  },
  {
    id: 'EXC-2026-1188',
    title: 'Aluminium-sheet replenishment runs behind its confirmed schedule',
    type: 'supply-delay',
    severity: 'low',
    status: 'dismissed',
    plantId: 'PLT-RGB',
    alsoAffectsPlantIds: ['PLT-BRN'],
    materialId: 'MAT-ALUMINIUM-SHEET',
    supplierId: 'SUP-BAJIO-METALES',
    purchaseOrderId: 'PO-45011963',
    lineId: 'LN-RGB-1',
    ownerId: 'USR-01',
    daysToImpact: 1,
    affectedLines: [
      {
        orderId: 'CO-770219',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2026-12-04',
        unitsAtRisk: 300,
      },
    ],
    missingInputs: [],
    confidence: {
      level: 'high',
      reason:
        'The next receipt slot is on the purchase order and the plant holds enough of the sheet to cover the plan until that slot arrives.',
    },
    whatChanged:
      'The aluminium-sheet replenishment is running behind the schedule the purchase order confirmed, and the plant holds enough of the sheet to cover the plan until the next receipt lands. The Brno build draws the same sheet, so the order promised there follows the same receipt, and nothing on either line changes before it unless the buyer moves the slot again.',
    detectedAt: '2026-11-19T08:20:00+01:00',
  },
  {
    id: 'EXC-2026-1189',
    title: 'Control-board lot quarantined at goods-in',
    type: 'quality-hold',
    severity: 'medium',
    status: 'open',
    plantId: 'PLT-QRO',
    alsoAffectsPlantIds: [],
    materialId: 'MAT-CONTROL-PCBA',
    supplierId: 'SUP-RHEINSTERN-ELEKTRONIK',
    purchaseOrderId: 'PO-45011946',
    lineId: 'LN-QRO-1',
    ownerId: 'USR-07',
    daysToImpact: 6,
    affectedLines: [
      {
        orderId: 'CO-770244',
        productId: 'PRD-A200',
        plantId: 'PLT-QRO',
        dueDate: '2026-12-11',
        unitsAtRisk: 300,
      },
    ],
    missingInputs: ['PLM and QMS: containment report for the quarantined control-board lot'],
    confidence: {
      level: 'medium',
      reason:
        'The lot is held on the incoming check, and the containment report that would say how much of it can be released is still outstanding.',
    },
    whatChanged:
      'The control-board lot delivered against the purchase order failed the incoming check at the Querétaro plant, so the whole lot is held in the goods-in area and the line cannot draw from it. The line keeps building from the previous lot while the hold stands, and the supplier has been asked for a containment report and a date for the replacement lot.',
    detectedAt: '2026-11-26T10:35:00+01:00',
  },
  // Fixed by the inputs: its whatChanged states the housings on hold (AAP 0.8).
  {
    id: 'EXC-2026-1190',
    title: 'Housing lot held at goods-in after a dimensional failure',
    type: 'quality-hold',
    severity: 'high',
    status: 'open',
    plantId: 'PLT-BRN',
    alsoAffectsPlantIds: ['PLT-RGB'],
    materialId: 'MAT-CAST-IRON-HOUSING',
    supplierId: 'SUP-VLTAVA-GUSS',
    purchaseOrderId: 'PO-45011907',
    lineId: 'LN-BRN-1',
    ownerId: 'USR-07',
    daysToImpact: 4,
    affectedLines: [
      {
        orderId: 'CO-770233',
        productId: 'PRD-R75',
        plantId: 'PLT-RGB',
        dueDate: '2026-12-09',
        unitsAtRisk: 400,
      },
      {
        orderId: 'CO-770251',
        productId: 'PRD-R75',
        plantId: 'PLT-RGB',
        dueDate: '2026-12-16',
        unitsAtRisk: 500,
      },
    ],
    missingInputs: ['PLM and QMS: supplier measurement report for the held housing lot'],
    confidence: {
      level: 'medium',
      reason:
        'The hold is read at goods-in against the drawing limit, and the supplier measurement report that would show whether the lot can be reworked is not on file.',
    },
    whatChanged:
      'Housings from the latest incoming lot failed the dimensional check at goods-in, and 380 housings are on hold in the quarantine area until the supplier measurement report is reviewed. The line at the Brno plant keeps building from the previous lot while the hold stands, and the same housing is fitted on the Riga build, so the hold reaches the orders promised from there as well.',
    detectedAt: '2026-12-01T10:12:00+01:00',
  },
  {
    id: 'EXC-2026-1191',
    title: 'Seal-press station on the service-kit line cannot keep pace',
    type: 'capacity-shortage',
    severity: 'high',
    status: 'open',
    plantId: 'PLT-BRN',
    alsoAffectsPlantIds: [],
    materialId: 'MAT-SEAL-KIT',
    supplierId: 'SUP-DONAU-DICHTUNG',
    purchaseOrderId: 'PO-45011884',
    lineId: 'LN-BRN-2',
    ownerId: 'USR-05',
    daysToImpact: 1,
    affectedLines: [
      {
        orderId: 'CO-770219',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2026-12-04',
        unitsAtRisk: 900,
      },
      {
        orderId: 'CO-770238',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2026-12-10',
        unitsAtRisk: 720,
      },
    ],
    missingInputs: ['MES: seal-press station availability on LN-BRN-2'],
    confidence: {
      level: 'low',
      reason:
        'The station the kits need is not readable from MES, so the output the second line can still reach is an estimate rather than a reading.',
    },
    whatChanged:
      'Only one press on the service-kit line can seat the EPDM seal kit, and that press is already committed to the current build, so the line cannot fit the kits at the rate the service-kit orders call for. The Brno plant therefore falls behind on the kits themselves, and the gap widens over the following shifts instead of closing on its own.',
    detectedAt: '2026-12-02T14:25:00+01:00',
  },
  {
    id: 'EXC-2026-1192',
    title: 'Stainless-bar material evidence is missing from the supplier file',
    type: 'documentation-hold',
    severity: 'medium',
    status: 'open',
    plantId: 'PLT-RAK',
    alsoAffectsPlantIds: ['PLT-BRN'],
    materialId: 'MAT-STAINLESS-BAR',
    supplierId: 'SUP-HANSA-METALL',
    purchaseOrderId: 'PO-45011924',
    lineId: 'LN-RAK-1',
    ownerId: 'USR-07',
    daysToImpact: 5,
    affectedLines: [
      {
        orderId: 'CO-770238',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2026-12-10',
        unitsAtRisk: 720,
      },
    ],
    missingInputs: ['PLM and QMS: material and dimensional evidence for the stainless-bar lot'],
    confidence: {
      level: 'medium',
      reason:
        'The release decision is read against the evidence on file, and the material and dimensional sections are the ones the supplier file is missing.',
    },
    whatChanged:
      'The stainless bar on the purchase order may be released for production only once the supplier file carries material and dimensional evidence for that bar, and the file on hand is short of both. The component line can build only from the bar already in stock until that evidence is reviewed, and the Brno service-kit build draws from the same release, so the order promised from there waits on the same evidence.',
    detectedAt: '2026-11-25T13:00:00+01:00',
  },
  {
    id: 'EXC-2026-1193',
    title: 'Sheet supplier halts its rolling line',
    type: 'supply-delay',
    severity: 'critical',
    status: 'open',
    plantId: 'PLT-RGB',
    alsoAffectsPlantIds: ['PLT-BRN'],
    materialId: 'MAT-ALUMINIUM-SHEET',
    supplierId: 'SUP-BAJIO-METALES',
    purchaseOrderId: 'PO-45011963',
    lineId: 'LN-RGB-1',
    ownerId: 'USR-01',
    daysToImpact: 4,
    affectedLines: [
      {
        orderId: 'CO-770257',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2026-12-18',
        unitsAtRisk: 480,
      },
      {
        orderId: 'CO-770238',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2026-12-10',
        unitsAtRisk: 720,
      },
    ],
    missingInputs: ['ERP: alternative supply date for the aluminium sheet'],
    confidence: {
      level: 'low',
      reason:
        'The supplier has stopped the rolling line without giving a dispatch date, so the position rests on the stock held at the two plants rather than on a confirmed receipt.',
    },
    whatChanged:
      'The supplier that rolls the aluminium sheet has stopped the line that makes it, and the open purchase order has no confirmed dispatch date at all. The same sheet is used on the Brno service-kit build as well as at the Riga plant, so the shortage reaches two plants and the first order it touches is already promised for the coming week.',
    detectedAt: '2026-12-03T06:30:00+01:00',
  },
  {
    id: 'EXC-2026-1194',
    title: 'Seal-kit shortfall closed from the approved second source',
    type: 'supply-delay',
    severity: 'low',
    status: 'resolved',
    plantId: 'PLT-BRN',
    alsoAffectsPlantIds: [],
    materialId: 'MAT-SEAL-KIT',
    supplierId: 'SUP-DONAU-DICHTUNG',
    purchaseOrderId: 'PO-45011884',
    lineId: 'LN-BRN-2',
    ownerId: 'USR-02',
    daysToImpact: 0,
    affectedLines: [
      {
        orderId: 'CO-770294',
        productId: 'PRD-V40',
        plantId: 'PLT-BRN',
        dueDate: '2027-01-15',
        unitsAtRisk: 0,
      },
    ],
    missingInputs: [],
    confidence: {
      level: 'high',
      reason:
        'The second-source kits were confirmed in stock by the line before the exception was closed.',
    },
    whatChanged:
      'The seal kit arrived short of the quantity the purchase order ordered, and the plant drew the difference from the alternate supplier the material record names rather than waiting for a top-up. The line confirmed the kits were in stock, so no customer order moved and the exception was closed.',
    detectedAt: '2026-11-21T09:45:00+01:00',
  },
  {
    id: 'EXC-2026-1195',
    title: 'Inbound sailing slips with no confirmed arrival',
    type: 'transport-disruption',
    severity: 'medium',
    status: 'open',
    plantId: 'PLT-RGB',
    alsoAffectsPlantIds: ['PLT-QRO'],
    materialId: 'MAT-ALUMINIUM-SHEET',
    supplierId: 'SUP-BAJIO-METALES',
    purchaseOrderId: 'PO-45011963',
    lineId: 'LN-RGB-2',
    ownerId: 'USR-01',
    daysToImpact: 6,
    affectedLines: [
      {
        orderId: 'CO-770244',
        productId: 'PRD-A200',
        plantId: 'PLT-QRO',
        dueDate: '2026-12-11',
        unitsAtRisk: 300,
      },
    ],
    missingInputs: ['Transport: confirmed arrival for the next inbound sailing'],
    confidence: {
      level: 'medium',
      reason:
        'The sailing is read from the carrier booking, and the date the carrier will confirm for it is not yet posted back to the transport feed.',
    },
    whatChanged:
      'The inbound sailing that carries the aluminium sheet slipped out of its window, and the plant has no confirmed arrival for the delivery the open purchase order covers. The same sheet is booked for the Querétaro build, so the order promised from there waits on the same arrival until the alternate routing is settled.',
    detectedAt: '2026-12-02T07:15:00+01:00',
  },
];
