import { describe, it, expect } from 'vitest';
import {
  runPreflightCheck,
  createImmutablePrintJobSnapshot,
  reconcilePrintQuantityCommand,
} from '../../src/domain/printJob';
import type { Product, SKU, Batch, Template, MachineProfile, PackProfile } from '../../src/types';

describe('Domain: Print Job & Preflight (P0-03, P0-04, P0-05, E2E-03, E2E-08, E2E-11)', () => {
  const mockProduct: Product = {
    id: 'prod_turmeric',
    brandId: 'brand_adalaj',
    name: 'Turmeric Powder',
    shortCode: 'ADTP',
    batchPrefix: 'ADTP',
    defaultShelfLifeMonths: 12,
    allowedPackSizes: ['100 g'],
  };

  const mockMachine: MachineProfile = {
    id: 'mach_r2d2',
    name: 'R2D2-SX100',
    manufacturer: 'Universal',
    model: 'R2D2',
    technology: 'TIJ Inkjet',
    headWidthMm: 12.7,
    printBandMm: 12.5,
    defaultDpi: 300,
    edgeBufferMm: 0.1,
    contentPaddingTopMm: 0.2,
    contentPaddingBottomMm: 0.2,
    contentPaddingLeftMm: 0.2,
    contentPaddingRightMm: 0.2,
    maxTravelLengthMm: 150,
    minimumLegibleTextHeightMm: 1.8,
    exportRotation: 0,
    mirrorX: false,
    mirrorY: false,
    feedOrigin: 'Top -> Bottom',
    inkSpreadCompensationPx: 0,
    supportedChannels: ['Black'],
  };

  const mockPackProfile: PackProfile = {
    id: 'pack_100g',
    name: '100 g',
    surfaceType: 'Pouch',
    referenceEdge: 'Top Seal',
    printWindowStartX: 0,
    printWindowStartY: 0,
    printWindowLengthMm: 45,
    printWindowWidthMm: 12.5,
    captionRows: [],
    valueLinePitchMm: 2.5,
    status: 'verified',
  };

  const mockTemplate: Template = {
    id: 'tmpl_100g',
    name: '100g Template',
    version: 1,
    status: 'Released',
    travel: 'Vertical',
    layout: 'Stack',
    printCaptions: true,
    currencySymbol: '₹',
    currencyPosition: 'prefix',
    lineGapMm: 0.5,
    autoFlow: true,
    preventOverlap: true,
    respectPadding: true,
    objects: [],
    createdAt: '',
    updatedAt: '',
  };

  it('blocks printing when MRP is missing on both allocation and SKU (P0-03, E2E-03)', () => {
    const mockSkuNoMrp: SKU = {
      id: 'sku_no_mrp',
      productId: 'prod_turmeric',
      packType: 'Pouch',
      packSize: '100 g',
      netWeightGrams: 100,
      unit: 'g',
      mrp: undefined, // Missing MRP!
      enabled: true,
    };

    const mockBatch: Batch = {
      id: 'ADTP014',
      productId: 'prod_turmeric',
      rawMaterialKg: 50,
      lotDate: '2026-11-04',
      status: 'Open',
      allocations: [
        {
          id: 'alloc_no_mrp',
          batchId: 'ADTP014',
          skuId: 'sku_no_mrp',
          productId: 'prod_turmeric',
          packSize: '100 g',
          allocatedKg: 10,
          expectedPacks: 100,
          mfd: '04/11/26',
          bestBefore: '03/11/27',
          mrpSnapshot: undefined, // Missing!
          templateVersionSnapshot: 1,
          printStatus: 'Pending',
          packsPrinted: 0,
        },
      ],
      createdAt: '',
    };

    const preflight = runPreflightCheck({
      product: mockProduct,
      sku: mockSkuNoMrp,
      batch: mockBatch,
      allocation: mockBatch.allocations[0],
      template: mockTemplate,
      machine: mockMachine,
      packProfile: mockPackProfile,
    });

    expect(preflight.passed).toBe(false);
    expect(preflight.blockers.some(b => b.includes('Missing authorized MRP'))).toBe(true);
  });

  it('creates an immutable snapshot that remains unchanged when template is modified (P0-04, E2E-11)', () => {
    const liveTemplate: Template = { ...mockTemplate, name: 'Original Name' };
    const liveValues = { mrp: '₹50', batch: 'ADTP014' };

    const snapshot = createImmutablePrintJobSnapshot({
      jobCode: 'JOB_001',
      businessName: 'ADALAJ',
      brandName: 'ADALAJ',
      product: mockProduct,
      allocation: {
        id: 'alloc_1',
        batchId: 'ADTP014',
        skuId: 'sku_1',
        productId: 'prod_turmeric',
        packSize: '100 g',
        allocatedKg: 10,
        expectedPacks: 100,
        mfd: '04/11/26',
        bestBefore: '03/11/27',
        mrpSnapshot: 50,
        templateVersionSnapshot: 1,
        printStatus: 'Pending',
        packsPrinted: 0,
      },
      batch: {
        id: 'ADTP014',
        productId: 'prod_turmeric',
        rawMaterialKg: 50,
        lotDate: '2026-11-04',
        status: 'Open',
        allocations: [],
        createdAt: '',
      },
      template: liveTemplate,
      machine: mockMachine,
      packProfile: mockPackProfile,
      values: liveValues,
      passPlan: { totalPasses: 1, passes: [], oneLineReason: '' },
      transform: {
        originX: 'left',
        originY: 'top',
        rotation: 0,
        mirrorX: false,
        mirrorY: false,
        scaleX: 1,
        scaleY: 1,
        translationXMm: 0,
        translationYMm: 0,
        registrationOffsetMm: 0,
        feedDirection: 'Top -> Bottom',
      },
      operatorName: 'Operator A',
    });

    // Mutate live objects
    liveTemplate.name = 'MODIFIED NAME';
    liveValues.mrp = '₹999';

    // Verify snapshot was untouched
    expect(snapshot.templateSnapshot.name).toBe('Original Name');
    expect(snapshot.valuesSnapshot.mrp).toBe('₹50');
  });

  it('reconciles partial quantities without falsely completing the job (P0-05, WF-003, E2E-08)', () => {
    const job = createImmutablePrintJobSnapshot({
      jobCode: 'JOB_001',
      businessName: 'ADALAJ',
      brandName: 'ADALAJ',
      product: mockProduct,
      allocation: {
        id: 'alloc_1',
        batchId: 'ADTP014',
        skuId: 'sku_1',
        productId: 'prod_turmeric',
        packSize: '100 g',
        allocatedKg: 10,
        expectedPacks: 100,
        mfd: '04/11/26',
        bestBefore: '03/11/27',
        mrpSnapshot: 50,
        templateVersionSnapshot: 1,
        printStatus: 'Pending',
        packsPrinted: 0,
      },
      batch: { id: 'ADTP014', productId: 'prod_turmeric', rawMaterialKg: 50, lotDate: '2026-11-04', status: 'Open', allocations: [], createdAt: '' },
      template: mockTemplate,
      machine: mockMachine,
      packProfile: mockPackProfile,
      values: {},
      passPlan: { totalPasses: 1, passes: [], oneLineReason: '' },
      transform: {} as any,
      operatorName: 'Operator',
    });

    // Reconcile 60 good, 5 rejected, not completed
    const res = reconcilePrintQuantityCommand({
      job,
      goodCount: 60,
      rejectedCount: 5,
      isCompleted: false,
    });

    expect(res.success).toBe(true);
    expect(res.updatedJob?.completedQuantity).toBe(60);
    expect(res.updatedJob?.rejectedQuantity).toBe(5);
    expect(res.updatedJob?.productionStatus).toBe('Paused');
  });
});
