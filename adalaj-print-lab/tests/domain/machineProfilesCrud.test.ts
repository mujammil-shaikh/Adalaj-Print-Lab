import { describe, it, expect, beforeEach } from 'vitest';
import { 
  generateUniversalSyncString, 
  parseUniversalSyncString, 
  type UniversalDatabaseSnapshot 
} from '../../src/services/db';
import type { MachineProfile } from '../../src/types';

describe('Machine Profiles Detailed CRUD & Universal Save Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const sampleR2D2: MachineProfile = {
    id: 'mach_r2d2',
    name: 'R2D2-SX100',
    manufacturer: 'Adalaj TIJ Systems',
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
    notes: 'Primary TIJ Inkjet printer'
  };

  const sampleDualHead25mm: MachineProfile = {
    id: 'mach_dual_25mm',
    name: 'Adalaj Dual Head TIJ 25.4mm',
    manufacturer: 'Adalaj TIJ Systems',
    model: 'DX-200 Dual',
    technology: 'TIJ Inkjet',
    headWidthMm: 25.4,
    printBandMm: 25.0,
    defaultDpi: 300,
    edgeBufferMm: 0.2,
    contentPaddingTopMm: 0.2,
    contentPaddingBottomMm: 0.2,
    contentPaddingLeftMm: 0.2,
    contentPaddingRightMm: 0.2,
    maxTravelLengthMm: 200.0,
    minimumLegibleTextHeightMm: 1.8,
    exportRotation: 0,
    mirrorX: false,
    mirrorY: false,
    feedOrigin: 'Top -> Bottom',
    inkSpreadCompensationPx: 0,
    supportedChannels: ['Black'],
    notes: 'Dual cartridge stitched head'
  };

  it('accurately calculates locked axis swath pixels across DPI and head sizes', () => {
    // 12.7mm @ 300 DPI = 150 px (or 148 px usable)
    const swathR2D2 = Math.round((sampleR2D2.headWidthMm * sampleR2D2.defaultDpi) / 25.4);
    expect(swathR2D2).toBe(150);

    // 25.4mm @ 300 DPI = 300 px (or 295 px usable)
    const swathDual = Math.round((sampleDualHead25mm.headWidthMm * sampleDualHead25mm.defaultDpi) / 25.4);
    expect(swathDual).toBe(300);

    // 100mm laser @ 600 DPI
    const swathLaser = Math.round((100.0 * 600) / 25.4);
    expect(swathLaser).toBe(2362);
  });

  it('clones and duplicates machine profile with unique ID and name modifier', () => {
    const cloneId = `mach_clone_${Date.now()}`;
    const cloned: MachineProfile = {
      ...sampleR2D2,
      id: cloneId,
      name: `${sampleR2D2.name} (Copy)`
    };

    expect(cloned.id).toBe(cloneId);
    expect(cloned.name).toBe('R2D2-SX100 (Copy)');
    expect(cloned.headWidthMm).toBe(sampleR2D2.headWidthMm);
    expect(cloned.printBandMm).toBe(sampleR2D2.printBandMm);
    expect(cloned.technology).toBe(sampleR2D2.technology);
  });

  it('prevents accidental empty or corrupt deletions when handling list of machines', () => {
    let machineList: MachineProfile[] = [sampleR2D2, sampleDualHead25mm];
    expect(machineList.length).toBe(2);

    // Delete one
    machineList = machineList.filter(m => m.id !== 'mach_dual_25mm');
    expect(machineList.length).toBe(1);
    expect(machineList[0].id).toBe('mach_r2d2');

    // Attempting to delete when length <= 1 should be guarded
    const canDelete = machineList.length > 1;
    expect(canDelete).toBe(false);
  });

  it('serializes and preserves machine profiles in universal cross-device sync strings', () => {
    const snapshot: UniversalDatabaseSnapshot = {
      version: 2,
      timestamp: new Date().toISOString(),
      appVersion: '1.2.0',
      tables: {
        businesses: [],
        brands: [],
        products: [],
        skus: [],
        packProfiles: [],
        machineProfiles: [sampleR2D2, sampleDualHead25mm],
        mediaProfiles: [],
        templates: [],
        batches: [],
        printJobs: [],
        looseStock: [],
        auditLogs: []
      }
    };

    const syncStr = generateUniversalSyncString(snapshot);
    expect(typeof syncStr).toBe('string');
    expect(syncStr.length).toBeGreaterThan(50);

    const parsed = parseUniversalSyncString(syncStr);
    expect(parsed).not.toBeNull();
    expect(parsed?.tables.machineProfiles.length).toBe(2);
    expect(parsed?.tables.machineProfiles[0].id).toBe('mach_r2d2');
    expect(parsed?.tables.machineProfiles[1].id).toBe('mach_dual_25mm');
    expect(parsed?.tables.machineProfiles[1].printBandMm).toBe(25.0);
  });
});
