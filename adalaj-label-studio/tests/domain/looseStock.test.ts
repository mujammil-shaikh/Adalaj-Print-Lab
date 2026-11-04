import { describe, it, expect } from 'vitest';
import {
  createLooseStockRecord,
  allocateFromLooseStock,
  scrapLooseStock,
} from '../../src/domain/looseStock';

describe('Domain: Loose Stock & Residual Ledger (Policy Decision #1)', () => {
  it('creates traceable loose stock record from batch residual', () => {
    const record = createLooseStockRecord({
      productId: 'prod_turmeric',
      sourceBatchId: 'ADTP014',
      lotDate: '2026-11-04',
      residualKg: 12.5,
      containerId: 'BIN_SPICE_09',
      notes: 'Clean excess after 100g and 500g run',
    });

    expect(record.sourceBatchId).toBe('ADTP014');
    expect(record.availableQuantityKg).toBe(12.5);
    expect(record.status).toBe('Available');
    expect(record.containerId).toBe('BIN_SPICE_09');
  });

  it('allocates partial loose stock and maintains correct available/consumed balance', () => {
    const record = createLooseStockRecord({
      productId: 'prod_turmeric',
      sourceBatchId: 'ADTP014',
      lotDate: '2026-11-04',
      residualKg: 10,
    });

    const res = allocateFromLooseStock(record, 4, 'ADTP015');
    expect(res.success).toBe(true);
    expect(res.updatedRecord?.availableQuantityKg).toBe(6);
    expect(res.updatedRecord?.consumedQuantityKg).toBe(4);
    expect(res.updatedRecord?.status).toBe('Available');

    // Consume remaining 6 kg
    const res2 = allocateFromLooseStock(res.updatedRecord!, 6, 'ADTP016');
    expect(res2.success).toBe(true);
    expect(res2.updatedRecord?.availableQuantityKg).toBe(0);
    expect(res2.updatedRecord?.consumedQuantityKg).toBe(10);
    expect(res2.updatedRecord?.status).toBe('Consumed');
  });

  it('rejects over-allocation beyond available loose stock', () => {
    const record = createLooseStockRecord({
      productId: 'prod_turmeric',
      sourceBatchId: 'ADTP014',
      lotDate: '2026-11-04',
      residualKg: 5,
    });

    const res = allocateFromLooseStock(record, 6, 'ADTP015');
    expect(res.success).toBe(false);
    expect(res.error).toContain('exceeds available loose stock');
  });

  it('records process scrap separately from reusable stock', () => {
    const record = createLooseStockRecord({
      productId: 'prod_turmeric',
      sourceBatchId: 'ADTP014',
      lotDate: '2026-11-04',
      residualKg: 8,
    });

    const res = scrapLooseStock(record, 1.5, 'Moisture exposure near seal');
    expect(res.success).toBe(true);
    expect(res.updatedRecord?.availableQuantityKg).toBe(6.5);
    expect(res.updatedRecord?.scrappedQuantityKg).toBe(1.5);
    expect(res.updatedRecord?.status).toBe('Available');
  });
});
