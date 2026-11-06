import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateUniversalSyncString, 
  parseUniversalSyncString,
  type UniversalDatabaseSnapshot 
} from '../../src/services/db';
import { default500gTemplate } from '../../src/services/layoutRegistry';

describe('Universal Dual-Layer Persistence & Cross-Device Sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serializes and deserializes snapshot into localStorage mirror seamlessly', () => {
    const sampleSnapshot: UniversalDatabaseSnapshot = {
      version: 2,
      timestamp: new Date().toISOString(),
      appVersion: '1.2.0',
      tables: {
        businesses: [{
          id: 'biz_default',
          name: 'ADALAJ Organics & Packaging',
          industry: 'Food',
          currencySymbol: '₹',
          currencyPosition: 'prefix',
          dateFormat: 'DD/MM/YY',
          updatedAt: new Date().toISOString()
        }],
        brands: [],
        products: [{
          id: 'prod_adrc',
          brandId: 'brand_adalaj',
          name: 'Red Chilli Powder',
          shortCode: 'ADRC',
          batchPrefix: 'ADRC',
          defaultShelfLifeMonths: 12,
          allowedPackSizes: ['500 g']
        }],
        skus: [{
          id: 'sku_adrc_500g',
          productId: 'prod_adrc',
          packType: 'Stand-up Pouch',
          packSize: '500 g',
          netWeightGrams: 500,
          unit: 'g',
          mrp: 305,
          enabled: true
        }],
        packProfiles: [],
        machineProfiles: [],
        mediaProfiles: [],
        templates: [],
        batches: [],
        printJobs: [],
        looseStock: [],
        auditLogs: []
      }
    };

    localStorage.setItem('als_universal_db_snapshot', JSON.stringify(sampleSnapshot));
    const stored = localStorage.getItem('als_universal_db_snapshot');
    expect(stored).not.toBeNull();

    const parsed: UniversalDatabaseSnapshot = JSON.parse(stored!);
    expect(parsed.version).toBe(2);
    expect(parsed.tables.skus[0].mrp).toBe(305);
    expect(parsed.tables.products[0].shortCode).toBe('ADRC');
  });

  it('encodes and decodes universal sync string for 1-click cross-device sharing', () => {
    const sampleSnapshot: UniversalDatabaseSnapshot = {
      version: 2,
      timestamp: new Date().toISOString(),
      appVersion: '1.2.0',
      tables: {
        businesses: [],
        brands: [],
        products: [{
          id: 'prod_adrc',
          brandId: 'brand_adalaj',
          name: 'Red Chilli Powder',
          shortCode: 'ADRC',
          batchPrefix: 'ADRC',
          defaultShelfLifeMonths: 12,
          allowedPackSizes: ['500 g']
        }],
        skus: [{
          id: 'sku_adrc_500g',
          productId: 'prod_adrc',
          packType: 'Stand-up Pouch',
          packSize: '500 g',
          netWeightGrams: 500,
          unit: 'g',
          mrp: 305,
          enabled: true
        }],
        packProfiles: [],
        machineProfiles: [],
        mediaProfiles: [],
        templates: [],
        batches: [],
        printJobs: [],
        looseStock: [],
        auditLogs: []
      }
    };

    const syncStr = generateUniversalSyncString(sampleSnapshot);
    expect(typeof syncStr).toBe('string');
    expect(syncStr.length).toBeGreaterThan(20);

    const decoded = parseUniversalSyncString(syncStr);
    expect(decoded).not.toBeNull();
    expect(decoded?.tables.products[0].shortCode).toBe('ADRC');
    expect(decoded?.tables.skus[0].mrp).toBe(305);
  });

  it('restores state from sync string without corrupted characters or price alterations', () => {
    const snapshot: UniversalDatabaseSnapshot = {
      version: 2,
      timestamp: new Date().toISOString(),
      appVersion: '1.2.0',
      tables: {
        businesses: [],
        brands: [],
        products: [{
          id: 'prod_adrc',
          brandId: 'brand_adalaj',
          name: 'Red Chilli Powder',
          shortCode: 'ADRC',
          batchPrefix: 'ADRC',
          defaultShelfLifeMonths: 12,
          allowedPackSizes: ['500 g']
        }],
        skus: [{
          id: 'sku_adrc_500g',
          productId: 'prod_adrc',
          packType: 'Stand-up Pouch',
          packSize: '500 g',
          netWeightGrams: 500,
          unit: 'g',
          mrp: 305,
          enabled: true
        }],
        packProfiles: [],
        machineProfiles: [],
        mediaProfiles: [],
        templates: [{
          id: 'tmpl_500g_custom',
          name: 'Custom 500g Layout',
          version: 1,
          status: 'Approved',
          travel: 'Vertical',
          layout: 'Stack',
          printCaptions: false,
          customLengthMm: 45,
          customBandMm: 12.5,
          objects: [{
            id: 'line_mrp',
            type: 'field',
            fieldKey: 'mrp',
            content: '{mrp}',
            x: 0.5,
            y: 0.5,
            width: 11.5,
            height: 7.5,
            fontSizeMm: 6.5,
            fontWeight: 'bold',
            alignment: 'left'
          } as any]
        } as any],
        batches: [],
        printJobs: [],
        looseStock: [],
        auditLogs: []
      }
    };

    const code = generateUniversalSyncString(snapshot);
    const restored = parseUniversalSyncString(code);
    expect(restored).not.toBeNull();
    expect(restored?.tables.templates[0].objects[0].fontSizeMm).toBe(6.5);
    expect(restored?.tables.templates[0].objects[0].x).toBe(0.5);
    expect(restored?.tables.skus[0].mrp).toBe(305);
  });

  it('guarantees default 500g template has high-impact enlarged MRP typography and 45mm travel length', () => {
    expect(default500gTemplate.customLengthMm).toBe(45);
    expect(default500gTemplate.packSizeScope).toBe('500g');
    
    const mrpObj = default500gTemplate.objects.find((o: any) => o.fieldKey === 'mrp');
    expect(mrpObj).toBeDefined();
    expect(mrpObj?.fontSizeMm).toBeGreaterThanOrEqual(6.0);
    expect(mrpObj?.height).toBeGreaterThanOrEqual(7.0);
    expect(mrpObj?.fontWeight).toBe('bold');
  });
});
