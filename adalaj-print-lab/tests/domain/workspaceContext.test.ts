import { describe, it, expect } from 'vitest';
import { reconcileWorkspace, type WorkspaceContext } from '../../src/domain/workspaceContext';
import type { Product, SKU, Batch, Template, MachineProfile, PackProfile } from '../../src/types';

describe('Domain: Workspace Context Reconciler (WF-001, WF-002, WF-004, WF-013, WF-016)', () => {
  const mockProducts: Product[] = [
    {
      id: 'prod_turmeric',
      brandId: 'brand_adalaj',
      name: 'Turmeric Powder',
      shortCode: 'ADTP',
      batchPrefix: 'ADTP',
      defaultShelfLifeMonths: 12,
      allowedPackSizes: ['100 g', '500 g'],
    },
    {
      id: 'prod_chilli',
      brandId: 'brand_adalaj',
      name: 'Red Chilli Powder',
      shortCode: 'ADCP',
      batchPrefix: 'ADCP',
      defaultShelfLifeMonths: 12,
      allowedPackSizes: ['100 g', '200 g'],
    },
  ];

  const mockSkus: SKU[] = [
    {
      id: 'sku_adtp_100g',
      productId: 'prod_turmeric',
      packType: 'Stand-up Pouch',
      packSize: '100 g',
      netWeightGrams: 100,
      unit: 'g',
      mrp: 50,
      enabled: true,
    },
    {
      id: 'sku_adtp_500g',
      productId: 'prod_turmeric',
      packType: 'Stand-up Pouch',
      packSize: '500 g',
      netWeightGrams: 500,
      unit: 'g',
      mrp: 220,
      enabled: true,
    },
    {
      id: 'sku_adcp_100g',
      productId: 'prod_chilli',
      packType: 'Stand-up Pouch',
      packSize: '100 g',
      netWeightGrams: 100,
      unit: 'g',
      mrp: 60,
      enabled: true,
    },
  ];

  const mockBatches: Batch[] = [
    {
      id: 'ADTP014',
      productId: 'prod_turmeric',
      rawMaterialKg: 50,
      lotDate: '2026-11-04',
      status: 'Open',
      allocations: [
        {
          id: 'alloc_100',
          batchId: 'ADTP014',
          skuId: 'sku_adtp_100g',
          productId: 'prod_turmeric',
          packSize: '100 g',
          allocatedKg: 15,
          expectedPacks: 150,
          mfd: '04/11/26',
          bestBefore: '03/11/27',
          mrpSnapshot: 50,
          templateVersionSnapshot: 1,
          printStatus: 'Pending',
          packsPrinted: 0,
        },
        {
          id: 'alloc_500',
          batchId: 'ADTP014',
          skuId: 'sku_adtp_500g',
          productId: 'prod_turmeric',
          packSize: '500 g',
          allocatedKg: 20,
          expectedPacks: 40,
          mfd: '04/11/26',
          bestBefore: '03/11/27',
          mrpSnapshot: 220,
          templateVersionSnapshot: 1,
          printStatus: 'Pending',
          packsPrinted: 0,
        },
      ],
      createdAt: '2026-11-04T10:00:00Z',
    },
  ];

  const mockTemplates: Template[] = [
    {
      id: 'tmpl_100g',
      name: '100g Default Template',
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
      packSizeScope: '100 g',
      isPackSizeDefault: true,
      objects: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'tmpl_500g',
      name: '500g Default Template',
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
      packSizeScope: '500 g',
      isPackSizeDefault: true,
      objects: [],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const mockMachines: MachineProfile[] = [
    {
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
    },
  ];

  const mockPackProfiles: PackProfile[] = [
    {
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
    },
    {
      id: 'pack_500g',
      name: '500 g',
      surfaceType: 'Pouch',
      referenceEdge: 'Top Seal',
      printWindowStartX: 0,
      printWindowStartY: 0,
      printWindowLengthMm: 80,
      printWindowWidthMm: 12.5,
      captionRows: [],
      valueLinePitchMm: 2.5,
      status: 'verified',
    },
  ];

  it('preserves exact allocationId when navigating to Print (WF-001, E2E-01)', () => {
    const inputContext: WorkspaceContext = {
      route: 'print',
      batchId: 'ADTP014',
      allocationId: 'alloc_500',
    };

    const resolved = reconcileWorkspace(inputContext, {
      products: mockProducts,
      skus: mockSkus,
      batches: mockBatches,
      machines: mockMachines,
      packProfiles: mockPackProfiles,
      templates: mockTemplates,
    });

    expect(resolved.allocation?.id).toBe('alloc_500');
    expect(resolved.allocation?.packSize).toBe('500 g');
    expect(resolved.sku?.id).toBe('sku_adtp_500g');
    expect(resolved.packProfile?.name).toBe('500 g');
    expect(resolved.template?.id).toBe('tmpl_500g');
    expect(resolved.product?.id).toBe('prod_turmeric');
  });

  it('switches template, SKU, and pack profile together when allocation switches (WF-002, E2E-02)', () => {
    const context100 = reconcileWorkspace({
      route: 'print',
      batchId: 'ADTP014',
      allocationId: 'alloc_100',
    }, {
      products: mockProducts,
      skus: mockSkus,
      batches: mockBatches,
      machines: mockMachines,
      packProfiles: mockPackProfiles,
      templates: mockTemplates,
    });

    expect(context100.allocation?.packSize).toBe('100 g');
    expect(context100.template?.id).toBe('tmpl_100g');

    const context500 = reconcileWorkspace({
      route: 'print',
      batchId: 'ADTP014',
      allocationId: 'alloc_500',
    }, {
      products: mockProducts,
      skus: mockSkus,
      batches: mockBatches,
      machines: mockMachines,
      packProfiles: mockPackProfiles,
      templates: mockTemplates,
    });

    expect(context500.allocation?.packSize).toBe('500 g');
    expect(context500.template?.id).toBe('tmpl_500g');
  });

  it('resets batch and allocation when product changes to one that does not own the batch (WF-004, WF-016)', () => {
    const inputContext: WorkspaceContext = {
      route: 'batches',
      productId: 'prod_chilli', // Changed to chilli
      batchId: 'ADTP014',        // Belongs to turmeric!
      allocationId: 'alloc_500',
    };

    const resolved = reconcileWorkspace(inputContext, {
      products: mockProducts,
      skus: mockSkus,
      batches: mockBatches,
      machines: mockMachines,
      packProfiles: mockPackProfiles,
      templates: mockTemplates,
    });

    expect(resolved.product?.id).toBe('prod_chilli');
    expect(resolved.batch).toBeNull();
    expect(resolved.allocation).toBeNull();
    expect(resolved.context.batchId).toBeUndefined();
    expect(resolved.context.allocationId).toBeUndefined();
    expect(resolved.sku?.productId).toBe('prod_chilli');
  });
});
