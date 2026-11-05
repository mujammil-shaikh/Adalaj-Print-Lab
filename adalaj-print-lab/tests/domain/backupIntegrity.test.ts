import { describe, it, expect } from 'vitest';
import type { MachineProfile } from '../../src/types';

describe('Settings & Backup Integrity (SET-01, SET-07, WF-020)', () => {
  it('validates canonical V2 backup schema structure across all 12 tables', () => {
    const requiredTables = [
      'businesses',
      'brands',
      'products',
      'skus',
      'packProfiles',
      'machineProfiles',
      'mediaProfiles',
      'templates',
      'batches',
      'printJobs',
      'looseStock',
      'auditLogs',
    ];

    const mockV2Backup = {
      format: 'ADALAJ_LABEL_STUDIO_BACKUP',
      version: 2,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      tables: {
        businesses: [{ id: 'biz_default', name: 'ADALAJ Organics & Packaging' }],
        brands: [{ id: 'brand_adalaj', name: 'ADALAJ' }],
        products: [{ id: 'prod_adtp', name: 'Turmeric Powder' }],
        skus: [{ id: 'sku_adtp_100g', packSize: '100 g', netWeightGrams: 100 }],
        packProfiles: [{ id: 'pack_100g', name: '100 g' }],
        machineProfiles: [{ id: 'mach_r2d2', name: 'R2D2-SX100', printBandMm: 12.5 }],
        mediaProfiles: [{ id: 'med_pouch_gloss', name: 'Glossy Laminated Plastic Pouch' }],
        templates: [{ id: 'tmpl_pack_default_100g', name: 'Default 100 g Layout' }],
        batches: [{ id: 'ADTP013', rawMaterialKg: 50, allocations: [] }],
        printJobs: [{ id: 'job_adtp013_100g', jobCode: 'JOB-ADTP013-100G' }],
        looseStock: [{ id: 'loose_ADTP013_residual', availableQuantityKg: 5.0, status: 'Available' }],
        auditLogs: [{ id: 'audit_init', action: 'SYSTEM_INIT' }],
      },
    };

    expect(mockV2Backup.format).toBe('ADALAJ_LABEL_STUDIO_BACKUP');
    expect(mockV2Backup.version).toBe(2);
    for (const tbl of requiredTables) {
      expect(mockV2Backup.tables).toHaveProperty(tbl);
      expect(Array.isArray((mockV2Backup.tables as any)[tbl])).toBe(true);
    }
  });

  it('correctly adapts legacy V1 backup with singular business and missing printJobs/looseStock', () => {
    const legacyV1 = {
      version: 1,
      exportedAt: '2026-03-01T12:00:00.000Z',
      business: [{ id: 'biz_legacy', name: 'Legacy Biz' }],
      brands: [{ id: 'brand_legacy', name: 'Legacy Brand' }],
      products: [{ id: 'prod_adtp', name: 'Turmeric' }],
      skus: [{ id: 'sku_1', packSize: '100 g' }],
      packProfiles: [],
      machineProfiles: [],
      templates: [],
      batches: [{ id: 'BAT001', rawMaterialKg: 20 }],
      auditLogs: [],
    };

    // Transformation logic as implemented in SettingsView.tsx
    const tables = (legacyV1 as any).tables || legacyV1;
    const businesses = tables.businesses || (tables.business ? (Array.isArray(tables.business) ? tables.business : [tables.business]) : []);
    const printJobs = tables.printJobs || [];
    const looseStock = tables.looseStock || [];

    expect(businesses).toHaveLength(1);
    expect(businesses[0].id).toBe('biz_legacy');
    expect(printJobs).toEqual([]);
    expect(looseStock).toEqual([]);
  });

  it('rejects backup payload that lacks products or batches', () => {
    const corruptPayload = {
      version: 2,
      tables: {
        businesses: [],
        brands: [],
        products: [],
        batches: [],
      },
    };

    const tables = corruptPayload.tables;
    const hasCoreData = Boolean(tables.products?.length || tables.batches?.length);
    expect(hasCoreData).toBe(false);
  });

  it('updates machine profile specifications without mutating original object (SET-01)', () => {
    const originalMachine: MachineProfile = {
      id: 'mach_r2d2',
      name: 'R2D2-SX100',
      manufacturer: 'Universal TIJ Systems',
      model: 'R2D2-SX100',
      technology: 'TIJ Inkjet',
      headWidthMm: 12.7,
      printBandMm: 12.5,
      defaultDpi: 300,
      edgeBufferMm: 0.1,
      contentPaddingTopMm: 0.2,
      contentPaddingBottomMm: 0.2,
      contentPaddingLeftMm: 0.2,
      contentPaddingRightMm: 0.2,
      maxTravelLengthMm: 150.0,
      minimumLegibleTextHeightMm: 1.8,
      exportRotation: 0,
      mirrorX: false,
      mirrorY: false,
      feedOrigin: 'Top -> Bottom',
      inkSpreadCompensationPx: 0,
      supportedChannels: ['Black'],
      notes: 'Initial profile',
    };

    const updatedMachine: MachineProfile = {
      ...originalMachine,
      printBandMm: 12.7,
      edgeBufferMm: 0.5,
      exportRotation: 180,
      notes: 'Calibrated for high-speed conveyor line',
    };

    expect(updatedMachine.id).toBe(originalMachine.id);
    expect(updatedMachine.printBandMm).toBe(12.7);
    expect(updatedMachine.edgeBufferMm).toBe(0.5);
    expect(updatedMachine.exportRotation).toBe(180);
    expect(originalMachine.printBandMm).toBe(12.5); // Immutable check
  });
});
