/**
 * The assembly behind each part approval package: the product it builds and the parts its package
 * covers.
 *
 * Fixing inputs:
 * - AAP 0.12.2 and 0.13.1 name this module among the seed records, and AAP 0.2.1 records why the
 *   structure exists before a screen reads it: the S4 part lens opens a product's parts from its
 *   package. AAP 0.14.2 keeps stage S4 out of this run, so the records sit here for interface
 *   completeness and no S1-S3 screen shows them.
 * - AAP 0.12.2 fixes the PPAP relation this module mirrors: a package names the supplier and the
 *   material it covers, and the seed holds three packages, one per product. Each assembly below
 *   carries exactly one of those package identifiers, so the two record sets align one to one.
 *
 * The chain each assembly states — product, package, material and supplier — as
 * `src/seed/packages.ts` and `src/seed/materials.ts` record it:
 *
 * | Product | Assembly | Package | Material | Supplier |
 * |---|---|---|---|---|
 * | `PRD-R75` | `ASM-R75-01` | `PPAP-0204` | `MAT-CAST-IRON-HOUSING` | `SUP-VLTAVA-GUSS` |
 * | `PRD-A200` | `ASM-A200-01` | `PPAP-0219` | `MAT-ALUMINIUM-DIE-CAST-COVER` | `SUP-VLTAVA-GUSS` |
 * | `PRD-V40` | `ASM-V40-01` | `PPAP-0237` | `MAT-ALUMINIUM-SHEET` | `SUP-BAJIO-METALES` |
 *
 * Each assembly's package covers a material its product is built from, and that material is one of
 * the parts the assembly lists below, so the package, the bill of materials and the supplier's part
 * approval cannot disagree about which part the assembly is.
 *
 * The shape is seed-local. `src/types` owns no assembly vocabulary — it types what the service port
 * and the S1-S4 screens exchange, and an assembly is neither — so `Assembly` and `AssemblyPart` are
 * declared here and are deliberately absent from the barrel. Nothing reaches an assembly except
 * through `src/services/mock/seed-loader.ts`.
 *
 * Identifier schemes. `packageId` is a `PPAP-nnnn` identifier of `src/seed/packages.ts`,
 * `productId` one of the three products, `materialId` a record of `src/seed/materials.ts` and
 * `documentId` a record of `src/seed/documents.ts`. Two forms are this module's own, because
 * `platform-contracts.md` §1 defines no pattern for either: the assembly identifier reads
 * `ASM-<product key>-<two digits>` and a part number reads `PN-<product key>-<two digits>`. Both are
 * seed-local labels, not contract identifiers, and a consumer must not parse them.
 *
 * `documentIds` names the one document each package's part structure is recorded against: the
 * supply agreement covering the housings the assembly is built from, the part approval submission
 * cover note that names the package, or the procedure governing disposition of its non-conforming
 * parts. A package's paperwork is not a property of its parts, so a part carries no document of its
 * own and the citation sits on the assembly.
 *
 * Every part is one of the materials that names the product, and its `quantity` is that material's
 * own quantity per finished unit, so the bill of materials has one author and this module repeats no
 * figure it does not also cite. Part order follows the bill-of-materials order of
 * `src/seed/materials.ts`.
 *
 * Rules served:
 * - P-6: every number here is record content — a count of pieces against a part or the per-unit
 *   usage the material record already states. No cost, mass, tolerance stack-up or readiness figure
 *   appears, because no rule of `platform-contracts.md` computes one for an assembly.
 * - P-7: parts carry generic manufacturing descriptions and no real company, carmaker, vehicle model
 *   or cloud product is named. Every identifier, name and company in the joined records is synthetic.
 * - P-4: nothing here states a quality or approval standing for a part. Element states belong to the
 *   package records, and this module neither repeats nor anticipates them.
 * - P-2: the only import is the shared type barrel, and only `src/services/mock/seed-loader.ts` may
 *   import this module.
 * - B-1 and B-2: no address, URL, credential or environment read appears.
 *
 * OPEN ITEM: no input fixes an assembly count, so the set is sized to the three packages it mirrors
 * and grows only with them. A package without a product in this portfolio would have no part
 * structure to state.
 * OPEN ITEM: `documentIds` names the document a package's part structure is recorded against and
 * holds no document record, because the body, classification and residency of a document belong to
 * `src/seed/documents.ts`.
 */

import type { DocumentId, MaterialId, PackageId, ProductId } from '../types';

/* ---------------------------------------------------------------------------------------------
 * Record — AAP 0.12.2, seed-local vocabulary
 * ------------------------------------------------------------------------------------------- */

/**
 * One part of an assembly: the purchased material it is made from and how much of that material one
 * finished unit consumes.
 *
 * A part is not a package element. A `PpapElement` is a piece of evidence a package reports on; a
 * part is a line of the product's bill of materials, and the two are counted differently: a part
 * carries no state, no rule and no reading.
 */
export interface AssemblyPart {
  /** The part's number within its assembly, seed-local: `PN-<product key>-<two digits>`. */
  partNumber: string;

  /** The generic manufacturing description the part lens and the tables print. */
  name: string;

  /** The material the part is made from, as `src/seed/materials.ts` records it. */
  materialId: MaterialId;

  /** How much of that material one finished unit consumes, in the material's purchasing unit. */
  quantity: number;
}

/**
 * One assembly: the product, the part approval package that covers it, the document its structure is
 * recorded against and the parts themselves.
 *
 * The relation is one to one in both directions in this run — one assembly per product and per
 * package — because each of the three products has exactly one package. A second package for the
 * same product would add an assembly rather than widen one, since the parts a package covers are a
 * property of that package.
 */
export interface Assembly {
  /** The assembly's identifier, seed-local: `ASM-<product key>-<two digits>`. */
  id: string;

  /** The product the assembly builds. */
  productId: ProductId;

  /** The part approval package that covers the assembly, `PPAP-nnnn`. */
  packageId: PackageId;

  /** The document the part structure is recorded against, as `src/seed/documents.ts` records it. */
  documentIds: readonly DocumentId[];

  /** The parts of the bill of materials, in the order that record set lists them. */
  parts: readonly AssemblyPart[];
}

/* ---------------------------------------------------------------------------------------------
 * Records — one assembly per package, in package order (AAP 0.12.2, 0.13.1)
 * ------------------------------------------------------------------------------------------- */

/**
 * The three assemblies of the demonstration, in package identifier order.
 *
 * The array is `readonly` because these records are the demonstration's dataset: the mock adapter's
 * loader deep-clones them into in-memory state and a reset restores them from this module, so
 * nothing in the application writes to them.
 *
 * Each part's `materialId` is one of the materials of `src/seed/materials.ts` that names the same
 * product, and each `quantity` is that material's own quantity per finished unit, so the two record
 * sets cannot disagree about how much of a material a product consumes.
 */
export const ASSEMBLIES: readonly Assembly[] = [
  {
    // Rotor assembly: cast and turned structure, the control board, the sealing and the finish.
    id: 'ASM-R75-01',
    productId: 'PRD-R75',
    packageId: 'PPAP-0204',
    documentIds: ['DOC-0031'],
    parts: [
      { partNumber: 'PN-R75-01', name: 'Steel plate, S355, 6 mm', materialId: 'MAT-STEEL-PLATE', quantity: 2.2 },
      { partNumber: 'PN-R75-02', name: 'Stainless steel bar, 316L, 20 mm', materialId: 'MAT-STAINLESS-BAR', quantity: 1.8 },
      { partNumber: 'PN-R75-03', name: 'Housing, cast iron, machined', materialId: 'MAT-CAST-IRON-HOUSING', quantity: 1 },
      { partNumber: 'PN-R75-04', name: 'Control board, four-layer, populated', materialId: 'MAT-CONTROL-PCBA', quantity: 1 },
      { partNumber: 'PN-R75-05', name: 'Ball bearing, 6205-2RS', materialId: 'MAT-BALL-BEARING-6205', quantity: 4 },
      { partNumber: 'PN-R75-06', name: 'Bearing, taper roller, 30206', materialId: 'MAT-TAPER-ROLLER-BEARING', quantity: 2 },
      { partNumber: 'PN-R75-07', name: 'Drive shaft, 42CrMo4, turned', materialId: 'MAT-DRIVE-SHAFT', quantity: 1 },
      { partNumber: 'PN-R75-08', name: 'Seal kit, EPDM', materialId: 'MAT-SEAL-KIT', quantity: 1 },
      { partNumber: 'PN-R75-09', name: 'Hose assembly, hydraulic, 12 mm', materialId: 'MAT-HYDRAULIC-HOSE', quantity: 2 },
      { partNumber: 'PN-R75-10', name: 'Fastener set, A2 stainless', materialId: 'MAT-FASTENER-SET', quantity: 1 },
      { partNumber: 'PN-R75-11', name: 'Spring, compression, 1.4310 stainless', materialId: 'MAT-COMPRESSION-SPRING', quantity: 8 },
      { partNumber: 'PN-R75-12', name: 'Finish, powder coating, anthracite matte', materialId: 'MAT-POWDER-COATING', quantity: 0.8 },
      { partNumber: 'PN-R75-13', name: 'Grease fill, lithium NLGI 2', materialId: 'MAT-LITHIUM-GREASE', quantity: 0.35 },
      { partNumber: 'PN-R75-14', name: 'Carton, shipping, with foam inserts', materialId: 'MAT-SHIPPING-CARTON', quantity: 1 },
    ],
  },
  {
    // Actuation module: sheet and busbar structure round the drive and its control electronics.
    id: 'ASM-A200-01',
    productId: 'PRD-A200',
    packageId: 'PPAP-0219',
    documentIds: ['DOC-0035'],
    parts: [
      { partNumber: 'PN-A200-01', name: 'Aluminium sheet, 2.0 mm, alloy 5754', materialId: 'MAT-ALUMINIUM-SHEET', quantity: 1.6 },
      { partNumber: 'PN-A200-02', name: 'Steel plate, S355, 6 mm', materialId: 'MAT-STEEL-PLATE', quantity: 2.2 },
      { partNumber: 'PN-A200-03', name: 'Copper busbar, 4 x 20 mm', materialId: 'MAT-COPPER-BUSBAR', quantity: 2.4 },
      { partNumber: 'PN-A200-04', name: 'Cover, aluminium die-cast', materialId: 'MAT-ALUMINIUM-DIE-CAST-COVER', quantity: 1 },
      { partNumber: 'PN-A200-05', name: 'Control board, four-layer, populated', materialId: 'MAT-CONTROL-PCBA', quantity: 1 },
      { partNumber: 'PN-A200-06', name: 'Wiring harness, 12-core', materialId: 'MAT-WIRE-HARNESS', quantity: 1 },
      { partNumber: 'PN-A200-07', name: 'Connector set, M12, 8-pin', materialId: 'MAT-CONNECTOR-SET', quantity: 2 },
      { partNumber: 'PN-A200-08', name: 'Pressure sensor, 0-16 bar', materialId: 'MAT-PRESSURE-SENSOR', quantity: 1 },
      { partNumber: 'PN-A200-09', name: 'Motor, brushless, 24 V', materialId: 'MAT-BRUSHLESS-MOTOR', quantity: 1 },
      { partNumber: 'PN-A200-10', name: 'Drive shaft, 42CrMo4, turned', materialId: 'MAT-DRIVE-SHAFT', quantity: 1 },
      { partNumber: 'PN-A200-11', name: 'Gear blank, 18-tooth', materialId: 'MAT-GEAR-BLANK', quantity: 2 },
      { partNumber: 'PN-A200-12', name: 'Fastener set, A2 stainless', materialId: 'MAT-FASTENER-SET', quantity: 1 },
      { partNumber: 'PN-A200-13', name: 'Spring, compression, 1.4310 stainless', materialId: 'MAT-COMPRESSION-SPRING', quantity: 8 },
      { partNumber: 'PN-A200-14', name: 'Finish, powder coating, anthracite matte', materialId: 'MAT-POWDER-COATING', quantity: 0.8 },
      { partNumber: 'PN-A200-15', name: 'Carton, shipping, with foam inserts', materialId: 'MAT-SHIPPING-CARTON', quantity: 1 },
    ],
  },
  {
    // Flow-control valve: sheet and bar body round the connector and the sealing that seats it.
    id: 'ASM-V40-01',
    productId: 'PRD-V40',
    packageId: 'PPAP-0237',
    documentIds: ['DOC-0036'],
    parts: [
      { partNumber: 'PN-V40-01', name: 'Aluminium sheet, 2.0 mm, alloy 5754', materialId: 'MAT-ALUMINIUM-SHEET', quantity: 1.6 },
      { partNumber: 'PN-V40-02', name: 'Stainless steel bar, 316L, 20 mm', materialId: 'MAT-STAINLESS-BAR', quantity: 1.8 },
      { partNumber: 'PN-V40-03', name: 'Copper busbar, 4 x 20 mm', materialId: 'MAT-COPPER-BUSBAR', quantity: 2.4 },
      { partNumber: 'PN-V40-04', name: 'Control board, four-layer, populated', materialId: 'MAT-CONTROL-PCBA', quantity: 1 },
      { partNumber: 'PN-V40-05', name: 'Connector set, M12, 8-pin', materialId: 'MAT-CONNECTOR-SET', quantity: 2 },
      { partNumber: 'PN-V40-06', name: 'Pressure sensor, 0-16 bar', materialId: 'MAT-PRESSURE-SENSOR', quantity: 1 },
      { partNumber: 'PN-V40-07', name: 'Ball bearing, 6205-2RS', materialId: 'MAT-BALL-BEARING-6205', quantity: 4 },
      { partNumber: 'PN-V40-08', name: 'Seal kit, EPDM', materialId: 'MAT-SEAL-KIT', quantity: 1 },
      { partNumber: 'PN-V40-09', name: 'O-ring, NBR 70, 45 mm bore', materialId: 'MAT-O-RING-NBR-45', quantity: 6 },
      { partNumber: 'PN-V40-10', name: 'Gasket, PTFE, 60 mm', materialId: 'MAT-PTFE-GASKET-60', quantity: 2 },
      { partNumber: 'PN-V40-11', name: 'Fastener set, A2 stainless', materialId: 'MAT-FASTENER-SET', quantity: 1 },
      { partNumber: 'PN-V40-12', name: 'Finish, powder coating, anthracite matte', materialId: 'MAT-POWDER-COATING', quantity: 0.8 },
      { partNumber: 'PN-V40-13', name: 'Grease fill, lithium NLGI 2', materialId: 'MAT-LITHIUM-GREASE', quantity: 0.35 },
      { partNumber: 'PN-V40-14', name: 'Carton, shipping, with foam inserts', materialId: 'MAT-SHIPPING-CARTON', quantity: 1 },
    ],
  },
];
