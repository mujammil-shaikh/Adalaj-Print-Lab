import { describe, it, expect } from 'vitest';
import {
  generateNextBatchId,
  createBatchCommand,
  duplicateBatchCommand,
} from '../../src/domain/batchCommands';
import type { Product, SKU, Batch } from '../../src/types';

describe('Domain: Batch Commands (WF-005, WF-006, WF-007, WF-008, E2E-04, E2E-07)', () => {
  const mockProduct: Product = {
    id: 'prod_turmeric',
    brandId: 'brand_adalaj',
    name: 'Turmeric Powder',
    shortCode: 'ADTP',
    batchPrefix: 'ADTP',
    defaultShelfLifeMonths: 12,
    allowedPackSizes: ['100 g', '500 g'],
  };

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
  ];

  it('generates next batch ID without collision or fixed fallback (WF-007)', () => {
    const existing = [{ id: 'ADTP001' }, { id: 'ADTP013' }, { id: 'ADTP014' }];
    expect(generateNextBatchId('ADTP', existing)).toBe('ADTP015');
    expect(generateNextBatchId('ADTP', [])).toBe('ADTP001');
  });

  it('rejects duplicate batch IDs (WF-007, DATA-05)', () => {
    const res = createBatchCommand(
      {
        batchId: 'ADTP014',
        productId: 'prod_turmeric',
        rawMaterialKg: 50,
        lotDate: '2026-11-04',
        allocations: [{ packSize: '100 g', allocatedKg: 10 }],
      },
      mockProduct,
      mockSkus,
      [{ id: 'ADTP014' }]
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('already exists');
  });

  it('rejects over-allocation and preserves entered rawMaterialKg (WF-005, E2E-04)', () => {
    const res = createBatchCommand(
      {
        batchId: 'ADTP015',
        productId: 'prod_turmeric',
        rawMaterialKg: 10,
        lotDate: '2026-11-04',
        allocations: [
          { packSize: '100 g', allocatedKg: 8 },
          { packSize: '500 g', allocatedKg: 4 }, // 8 + 4 = 12 kg > 10 kg
        ],
      },
      mockProduct,
      mockSkus,
      []
    );

    expect(res.success).toBe(false);
    expect(res.error).toContain('exceeds raw material input');
  });

  it('calculates pack counts accurately without forcing 1 pack (WF-006, E2E-05)', () => {
    const res = createBatchCommand(
      {
        batchId: 'ADTP015',
        productId: 'prod_turmeric',
        rawMaterialKg: 10,
        lotDate: '2026-11-04',
        allocations: [
          { packSize: '100 g', allocatedKg: 0.05 }, // 50g -> 0 packs of 100g
        ],
      },
      mockProduct,
      mockSkus,
      []
    );

    expect(res.success).toBe(true);
    expect(res.batch?.allocations[0].expectedPacks).toBe(0);
  });

  it('duplicates batch with new unique IDs and fresh allocation foreign keys (WF-008, E2E-07)', () => {
    const originalBatch: Batch = {
      id: 'ADTP014',
      productId: 'prod_turmeric',
      rawMaterialKg: 50,
      lotDate: '2026-10-10',
      status: 'Completed',
      allocations: [
        {
          id: 'alloc_orig_1',
          batchId: 'ADTP014',
          skuId: 'sku_adtp_100g',
          productId: 'prod_turmeric',
          packSize: '100 g',
          allocatedKg: 15,
          expectedPacks: 150,
          mfd: '10/10/26',
          bestBefore: '09/10/27',
          mrpSnapshot: 50,
          templateVersionSnapshot: 1,
          printStatus: 'Printed',
          packsPrinted: 150,
        },
      ],
      createdAt: '2026-10-10T00:00:00Z',
    };

    const res = duplicateBatchCommand(
      originalBatch,
      'ADTP015',
      '2026-11-04',
      [{ id: 'ADTP014' }],
      mockProduct,
      mockSkus
    );

    expect(res.success).toBe(true);
    const newBatch = res.batch!;
    expect(newBatch.id).toBe('ADTP015');
    expect(newBatch.status).toBe('Open');
    expect(newBatch.lotDate).toBe('2026-11-04');
    expect(newBatch.allocations.length).toBe(1);

    const newAlloc = newBatch.allocations[0];
    expect(newAlloc.id).not.toBe('alloc_orig_1');
    expect(newAlloc.batchId).toBe('ADTP015'); // Correctly points to new batch ID!
    expect(newAlloc.mfd).toBe('04/11/26');
    expect(newAlloc.printStatus).toBe('Pending'); // Reset
    expect(newAlloc.packsPrinted).toBe(0); // Reset
  });
});
