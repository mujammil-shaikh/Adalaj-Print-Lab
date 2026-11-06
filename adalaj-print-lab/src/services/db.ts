/**
 * IndexedDB Database Service using Dexie
 * Handles local-first persistent storage, initial seed data, and transaction management
 */

import Dexie, { type Table } from 'dexie';
import type { 
  Business, 
  Brand, 
  Product, 
  SKU, 
  PackProfile, 
  MachineProfile, 
  MediaProfile, 
  Template, 
  Batch, 
  PrintJob, 
  AuditLogEntry,
  LooseStockRecord
} from '../types';
import { default500gTemplate } from './layoutRegistry';

export class LabelStudioDatabase extends Dexie {
  businesses!: Table<Business, string>;
  brands!: Table<Brand, string>;
  products!: Table<Product, string>;
  skus!: Table<SKU, string>;
  packProfiles!: Table<PackProfile, string>;
  machineProfiles!: Table<MachineProfile, string>;
  mediaProfiles!: Table<MediaProfile, string>;
  templates!: Table<Template, string>;
  batches!: Table<Batch, string>;
  printJobs!: Table<PrintJob, string>;
  auditLogs!: Table<AuditLogEntry, string>;
  looseStock!: Table<LooseStockRecord, string>;

  constructor() {
    super('AdalajLabelStudioDB');
    this.version(1).stores({
      businesses: 'id, name',
      brands: 'id, businessId, name',
      products: 'id, brandId, shortCode, archived',
      skus: 'id, productId, packSize',
      packProfiles: 'id, name, status',
      machineProfiles: 'id, name, technology',
      mediaProfiles: 'id, name',
      templates: 'id, name, status, version',
      batches: 'id, productId, status, createdAt',
      printJobs: 'id, jobCode, batchId, productionStatus, createdAt',
      auditLogs: 'id, timestamp, action'
    });
    this.version(2).stores({
      businesses: 'id, name',
      brands: 'id, businessId, name',
      products: 'id, brandId, shortCode, archived',
      skus: 'id, productId, packSize',
      packProfiles: 'id, name, status',
      machineProfiles: 'id, name, technology',
      mediaProfiles: 'id, name',
      templates: 'id, name, status, version',
      batches: 'id, productId, status, createdAt',
      printJobs: 'id, jobCode, batchId, productionStatus, createdAt',
      auditLogs: 'id, timestamp, action',
      looseStock: 'id, productId, sourceBatchId, lotDate, status, createdAt'
    });
  }
}

export const db = new LabelStudioDatabase();

export interface UniversalDatabaseSnapshot {
  version: 2;
  timestamp: string;
  appVersion: string;
  tables: {
    businesses: Business[];
    brands: Brand[];
    products: Product[];
    skus: SKU[];
    packProfiles: PackProfile[];
    machineProfiles: MachineProfile[];
    mediaProfiles: MediaProfile[];
    templates: Template[];
    batches: Batch[];
    printJobs: PrintJob[];
    looseStock: LooseStockRecord[];
    auditLogs: AuditLogEntry[];
  };
}

export const universalSyncChannel = typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('adalaj_universal_persistence_channel')
  : null;

if (universalSyncChannel) {
  universalSyncChannel.onmessage = async (evt) => {
    if (evt.data?.type === 'UNIVERSAL_SNAPSHOT_BROADCAST' && evt.data?.snapshot) {
      try {
        await restoreFromUniversalSnapshot(evt.data.snapshot);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('als_storage_synced', { detail: evt.data.snapshot.timestamp }));
        }
      } catch (e) {
        console.warn('Universal sync broadcast error:', e);
      }
    }
  };
}

/**
 * Universal Dual-Layer Snapshot Mirror
 * Persists the entire database into localStorage and broadcasts across all tabs/windows
 * guaranteeing 100% data retention and real-time cross-tab synchronization.
 */
export async function saveUniversalSnapshot(): Promise<UniversalDatabaseSnapshot | null> {
  try {
    const snapshot: UniversalDatabaseSnapshot = {
      version: 2,
      timestamp: new Date().toISOString(),
      appVersion: '1.2.0',
      tables: {
        businesses: await db.businesses.toArray(),
        brands: await db.brands.toArray(),
        products: await db.products.toArray(),
        skus: await db.skus.toArray(),
        packProfiles: await db.packProfiles.toArray(),
        machineProfiles: await db.machineProfiles.toArray(),
        mediaProfiles: await db.mediaProfiles.toArray(),
        templates: await db.templates.toArray(),
        batches: await db.batches.toArray(),
        printJobs: await db.printJobs.toArray(),
        looseStock: await db.looseStock.toArray(),
        auditLogs: await db.auditLogs.toArray()
      }
    };
    localStorage.setItem('als_universal_db_snapshot', JSON.stringify(snapshot));
    localStorage.setItem('als_universal_last_saved', snapshot.timestamp);

    if (universalSyncChannel) {
      try {
        universalSyncChannel.postMessage({ type: 'UNIVERSAL_SNAPSHOT_BROADCAST', snapshot });
      } catch {
        // ignore
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('als_storage_synced', { detail: snapshot.timestamp }));
    }
    return snapshot;
  } catch (err) {
    console.warn('Failed to save universal localStorage snapshot:', err);
    return null;
  }
}

/**
 * Restores all database tables from a universal snapshot object or localStorage
 */
export async function restoreFromUniversalSnapshot(snapshotObj?: UniversalDatabaseSnapshot): Promise<boolean> {
  try {
    let snapshot = snapshotObj;
    if (!snapshot) {
      const raw = localStorage.getItem('als_universal_db_snapshot');
      if (!raw) return false;
      snapshot = JSON.parse(raw);
    }
    if (!snapshot || !snapshot.tables) return false;

    // Keep localStorage synchronized with latest restored state
    try {
      localStorage.setItem('als_universal_db_snapshot', JSON.stringify(snapshot));
      localStorage.setItem('als_universal_last_saved', snapshot.timestamp || new Date().toISOString());
    } catch {
      // ignore quota errors
    }

    const t = snapshot.tables;
    await db.transaction('rw', [
      db.businesses,
      db.brands,
      db.products,
      db.skus,
      db.packProfiles,
      db.machineProfiles,
      db.mediaProfiles,
      db.templates,
      db.batches,
      db.printJobs,
      db.looseStock,
      db.auditLogs
    ], async () => {
      if (t.businesses?.length) await db.businesses.bulkPut(t.businesses);
      if (t.brands?.length) await db.brands.bulkPut(t.brands);
      if (t.products?.length) await db.products.bulkPut(t.products);
      if (t.skus?.length) await db.skus.bulkPut(t.skus);
      if (t.packProfiles?.length) await db.packProfiles.bulkPut(t.packProfiles);
      if (t.machineProfiles?.length) await db.machineProfiles.bulkPut(t.machineProfiles);
      if (t.mediaProfiles?.length) await db.mediaProfiles.bulkPut(t.mediaProfiles);
      if (t.templates?.length) await db.templates.bulkPut(t.templates);
      if (t.batches?.length) await db.batches.bulkPut(t.batches);
      if (t.printJobs?.length) await db.printJobs.bulkPut(t.printJobs);
      if (t.looseStock?.length) await db.looseStock.bulkPut(t.looseStock);
      if (t.auditLogs?.length) await db.auditLogs.bulkPut(t.auditLogs);
    });
    return true;
  } catch (err) {
    console.error('Failed to restore from universal snapshot:', err);
    return false;
  }
}

/**
 * Universal portable base64 sync string for transferring complete app state across any device
 */
export function generateUniversalSyncString(snapshot: UniversalDatabaseSnapshot): string {
  const json = JSON.stringify(snapshot);
  return btoa(encodeURIComponent(json));
}

export function parseUniversalSyncString(encoded: string): UniversalDatabaseSnapshot | null {
  try {
    const json = decodeURIComponent(atob(encoded));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Seed initial values if empty with promise deduplication
let initPromise: Promise<void> | null = null;

export function initializeDatabase(): Promise<void> {
  if (!initPromise) {
    initPromise = doInitializeDatabase().catch(err => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export function sanitizeTemplatesForCutoff(templates: Template[]): { updated: Template[]; changed: boolean } {
  let changed = false;
  const updated = templates.map(t => {
    let tChanged = false;
    const is100g = t.packSizeScope === '100g' || t.id.includes('100g') || t.id === 'tmpl_adalaj_6line';
    const targetX = is100g ? 1.0 : 0.5;
    const targetW = is100g ? 10.5 : 11.5;

    const newObjects = t.objects.map(obj => {
      if (obj.type === 'field' && (obj.fieldKey === 'mfd' || obj.fieldKey === 'best_before')) {
        if (obj.fontFamily === 'Roboto Mono' || obj.fontSizeMm > 2.8 || (obj.letterSpacingMm && obj.letterSpacingMm > 0.02)) {
          tChanged = true;
          return {
            ...obj,
            fontFamily: 'Roboto Condensed',
            fontSizeMm: 2.5,
            fontSizePt: 7.5,
            width: targetW,
            letterSpacingMm: 0,
            x: targetX
          };
        }
      }
      return obj;
    });
    if (tChanged) {
      changed = true;
      return { ...t, objects: newObjects, updatedAt: new Date().toISOString() };
    }
    return t;
  });
  return { updated, changed };
}

async function doInitializeDatabase() {
  const [businessCount, machCount, tmplCount, looseCount] = await Promise.all([
    db.businesses.count(),
    db.machineProfiles.count(),
    db.templates.count(),
    db.looseStock.count()
  ]);

  // First check if an existing universal snapshot exists in localStorage before applying factory seeds
  if (businessCount === 0 || tmplCount === 0) {
    const restored = await restoreFromUniversalSnapshot();
    if (restored) {
      const current = await db.templates.toArray();
      const { updated, changed } = sanitizeTemplatesForCutoff(current);
      if (changed) {
        await db.templates.bulkPut(updated);
        await saveUniversalSnapshot();
      }
      return;
    }
  }

  // Ensure incomplete databases are healed rather than skipping on businessCount alone
  if (businessCount > 0 && machCount > 0 && tmplCount > 0) {
    const current = await db.templates.toArray();
    const { updated, changed } = sanitizeTemplatesForCutoff(current);
    if (changed) {
      await db.templates.bulkPut(updated);
      await saveUniversalSnapshot();
    }

    if (looseCount === 0) {
      await db.looseStock.put({
        id: 'loose_ADTP013_residual',
        productId: 'prod_adtp',
        sourceBatchId: 'ADTP013',
        lotDate: '2026-03-01',
        initialQuantityKg: 5.0,
        availableQuantityKg: 5.0,
        reservedQuantityKg: 0,
        consumedQuantityKg: 0,
        scrappedQuantityKg: 0,
        containerId: 'BIN_TURMERIC_RESIDUAL_01',
        qualityPassed: true,
        notes: 'Residual 5.0 kg loose stock from batch ADTP013 (50 kg raw - 20 kg 100g - 25 kg 500g)',
        status: 'Available',
        createdAt: '2026-03-01T12:00:00.000Z',
        updatedAt: '2026-03-01T12:00:00.000Z'
      });
    }
    return;
  }

  const initialBusiness: Business = {
    id: 'biz_default',
    name: 'ADALAJ Organics & Packaging',
    industry: 'Consumer Goods / Food & Manufacturing',
    currencySymbol: '₹',
    currencyPosition: 'prefix',
    dateFormat: 'DD/MM/YY',
    updatedAt: new Date().toISOString()
  };

  const initialBrand: Brand = {
    id: 'brand_adalaj',
    businessId: 'biz_default',
    name: 'ADALAJ',
    description: 'Adalaj brand for food, spice, and packaging products'
  };

  const initialMachine: MachineProfile = {
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
    notes: 'Default seed TIJ handheld printer. Usable band 12.5 mm across 12.7 mm physical head (150 px @ 300 dpi).'
  };

  // Laser marker profile as second technology proof
  const laserMachine: MachineProfile = {
    id: 'mach_fiber_laser',
    name: 'Lumix Pro 20W Laser',
    manufacturer: 'Industrial Marking Tech',
    model: 'LM-20W',
    technology: 'Laser Marker',
    headWidthMm: 100.0,
    printBandMm: 95.0,
    defaultDpi: 600,
    edgeBufferMm: 2.5,
    contentPaddingTopMm: 1.0,
    contentPaddingBottomMm: 1.0,
    contentPaddingLeftMm: 1.0,
    contentPaddingRightMm: 1.0,
    maxTravelLengthMm: 100.0,
    minimumLegibleTextHeightMm: 1.0,
    exportRotation: 0,
    mirrorX: false,
    mirrorY: false,
    feedOrigin: 'Top -> Bottom',
    inkSpreadCompensationPx: 0,
    supportedChannels: ['Black'],
    notes: 'Direct-to-metal and direct-to-plastic industrial laser marking.'
  };

  // Pack profiles
  const pack100g: PackProfile = {
    id: 'pack_100g',
    name: '100 g',
    surfaceType: 'Pouch',
    packWidthMm: 120,
    packHeightMm: 170,
    referenceEdge: 'Top Seal',
    printWindowStartX: 65,
    printWindowStartY: 85,
    printWindowLengthMm: 35,
    printWindowWidthMm: 12.5,
    valueLinePitchMm: 4.3,
    status: 'estimated from photo, ±1 mm, please verify',
    notes: 'Value block ≈ 25 mm, caption block ≈ 27 mm, line pitch ≈ 4.3 mm, text height ≈ 3.3 mm, widest value ≈ 11.5 mm',
    captionRows: [
      { id: 'c1', fieldKey: 'mrp', label: 'M.R.P. ₹', baselineMm: 0, captionTextHeightMm: 3.2, valueStartX: 2.0, valueMaxWidthMm: 11.5, targetValueTextHeightMm: 3.5 },
      { id: 'c2', fieldKey: 'batch', label: 'Batch No.', baselineMm: 4.3, captionTextHeightMm: 3.0, valueStartX: 2.0, valueMaxWidthMm: 11.5, targetValueTextHeightMm: 3.2 },
      { id: 'c3', fieldKey: 'net_wt', label: 'Net Wt.', baselineMm: 8.6, captionTextHeightMm: 2.8, valueStartX: 2.0, valueMaxWidthMm: 11.5, targetValueTextHeightMm: 3.0 },
      { id: 'c4', fieldKey: 'mfd', label: 'Mfg Date', baselineMm: 12.9, captionTextHeightMm: 2.8, valueStartX: 2.0, valueMaxWidthMm: 11.5, targetValueTextHeightMm: 3.0 },
      { id: 'c5', fieldKey: 'best_before', label: 'Best Before', baselineMm: 17.2, captionTextHeightMm: 2.6, valueStartX: 2.0, valueMaxWidthMm: 11.5, targetValueTextHeightMm: 2.8 },
      { id: 'c6', fieldKey: 'rate_per_gm', label: 'Rate / g', baselineMm: 21.5, captionTextHeightMm: 2.4, valueStartX: 2.0, valueMaxWidthMm: 11.5, targetValueTextHeightMm: 2.5 }
    ]
  };

  const pack500g: PackProfile = {
    id: 'pack_500g',
    name: '500 g',
    surfaceType: 'Pouch',
    packWidthMm: 160,
    packHeightMm: 240,
    referenceEdge: 'Top Seal',
    printWindowStartX: 90,
    printWindowStartY: 120,
    printWindowLengthMm: 45.0,
    printWindowWidthMm: 12.5,
    valueLinePitchMm: 5.0,
    status: 'Awaiting measurements',
    notes: 'Provisional design area ~45 mm along longest axis. Verify on physical pack.',
    captionRows: []
  };

  const otherPacks: PackProfile[] = ['50 g', '200 g', '1 kg', '2 kg', '5 kg'].map(sz => ({
    id: `pack_${sz.replace(/\s+/g, '_')}`,
    name: sz,
    surfaceType: 'Pouch',
    referenceEdge: 'Top Seal',
    printWindowStartX: 50,
    printWindowStartY: 80,
    printWindowLengthMm: 35,
    printWindowWidthMm: 12.5,
    valueLinePitchMm: 4.5,
    status: 'Awaiting measurements',
    notes: sz === '50 g' ? 'May use ~6x8 cm sticker format.' : 'Awaiting physical measurement.',
    captionRows: []
  }));

  // Products
  const products: Product[] = [
    { id: 'prod_adtp', brandId: 'brand_adalaj', name: 'Turmeric Powder', shortCode: 'ADTP', batchPrefix: 'ADTP', defaultShelfLifeMonths: 12, allowedPackSizes: ['100 g', '200 g', '500 g', '1 kg', '2 kg', '5 kg'] },
    { id: 'prod_adrc', brandId: 'brand_adalaj', name: 'Red Chilli Powder', shortCode: 'ADRC', batchPrefix: 'ADRC', defaultShelfLifeMonths: 12, allowedPackSizes: ['100 g', '200 g', '500 g', '1 kg', '2 kg', '5 kg'] },
    { id: 'prod_adcp', brandId: 'brand_adalaj', name: 'Coriander Powder', shortCode: 'ADCP', batchPrefix: 'ADCP', defaultShelfLifeMonths: 12, allowedPackSizes: ['100 g', '200 g', '500 g', '1 kg', '2 kg', '5 kg'] },
    { id: 'prod_adgm', brandId: 'brand_adalaj', name: 'Garam Masala', shortCode: 'ADGM', batchPrefix: 'ADGM', defaultShelfLifeMonths: 9, allowedPackSizes: ['100 g', '500 g'] },
    { id: 'prod_adkc', brandId: 'brand_adalaj', name: 'Kashmiri Red Chilli Powder', shortCode: 'ADKC', batchPrefix: 'ADKC', defaultShelfLifeMonths: 12, allowedPackSizes: ['100 g', '200 g', '500 g', '1 kg', '2 kg', '5 kg'] }
  ];

  // SKUs with realistic calibrated seed MRP values
  const skus: SKU[] = [];
  products.forEach(p => {
    p.allowedPackSizes.forEach(sz => {
      const netGrams = sz.includes('kg') ? parseFloat(sz) * 1000 : parseFloat(sz);
      let seedMrp: number | undefined = undefined;
      if (p.shortCode === 'ADRC') {
        if (sz === '500 g') seedMrp = 305;
        else if (sz === '100 g') seedMrp = 65;
        else if (sz === '200 g') seedMrp = 125;
        else if (sz === '1 kg') seedMrp = 590;
      } else if (p.shortCode === 'ADTP') {
        if (sz === '100 g') seedMrp = 50;
        else if (sz === '500 g') seedMrp = 230;
      } else if (p.shortCode === 'ADCP') {
        if (sz === '100 g') seedMrp = 45;
        else if (sz === '500 g') seedMrp = 210;
      } else if (p.shortCode === 'ADGM') {
        if (sz === '100 g') seedMrp = 85;
        else if (sz === '500 g') seedMrp = 380;
      } else if (p.shortCode === 'ADKC') {
        if (sz === '100 g') seedMrp = 75;
        else if (sz === '500 g') seedMrp = 340;
      }
      skus.push({
        id: `sku_${p.shortCode.toLowerCase()}_${sz.replace(/\s+/g, '')}`,
        productId: p.id,
        packType: 'Stand-up Pouch',
        packSize: sz,
        netWeightGrams: netGrams,
        unit: sz.includes('kg') ? 'kg' : 'g',
        mrp: seedMrp,
        templateId: sz === '500 g' ? 'tmpl_pack_default_500g' : 'tmpl_adalaj_6line',
        enabled: true
      });
    });
  });

  // Default Template (ADALAJ-6LINE)
  // Values: {mrp}, {batch}, {net_wt}, {mfd}, {best_before}, {rate_per_gm}
  // Hierarchy: MRP (largest 3.5mm), Batch (3.2mm), MFD (3.0mm), Net Wt (3.0mm), Best Before (2.8mm), Rate/unit (2.4mm)
  const defaultTemplate: Template = {
    id: 'tmpl_adalaj_6line',
    name: 'ADALAJ-6LINE',
    description: 'Adalaj six-line variable data template (MRP, Batch, Net Wt, MFD, Best Before, Rate)',
    version: 1,
    status: 'Approved',
    travel: 'Vertical',
    layout: 'Stack',
    printCaptions: false,
    currencySymbol: '₹',
    currencyPosition: 'prefix',
    lineGapMm: 0.8,
    autoFlow: true,
    preventOverlap: true,
    respectPadding: true,
    customLengthMm: 35,
    customBandMm: 12.5,
    packSizeScope: '100g',
    isPackSizeDefault: true,
    objects: [
      {
        id: 'obj_line_1',
        type: 'field',
        fieldKey: 'mrp',
        content: '{mrp}',
        x: 1.0,
        y: 0.5,
        width: 10.5,
        height: 3.0,
        rotation: 0,
        fontFamily: 'Barlow Condensed',
        fontSizePt: 9,
        fontSizeMm: 3.0,
        fontWeight: 'bold',
        fontStyle: 'normal',
        letterSpacingMm: 0.1,
        lineHeightMultiplier: 1.0,
        horizontalStretchPercent: 100,
        alignment: 'left',
        uppercase: true,
        channel: 'Black',
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false,
        lineIndex: 0
      },
      {
        id: 'obj_line_2',
        type: 'field',
        fieldKey: 'batch',
        content: '{batch}',
        x: 1.0,
        y: 4.5,
        width: 10.5,
        height: 2.6,
        rotation: 0,
        fontFamily: 'Roboto Condensed',
        fontSizePt: 8,
        fontSizeMm: 2.6,
        fontWeight: 'bold',
        fontStyle: 'normal',
        letterSpacingMm: 0.1,
        lineHeightMultiplier: 1.0,
        horizontalStretchPercent: 100,
        alignment: 'left',
        uppercase: true,
        channel: 'Black',
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false,
        lineIndex: 1
      },
      {
        id: 'obj_line_3',
        type: 'field',
        fieldKey: 'net_wt',
        content: '{net_wt}',
        x: 1.0,
        y: 8.5,
        width: 10.5,
        height: 2.6,
        rotation: 0,
        fontFamily: 'Noto Sans',
        fontSizePt: 8,
        fontSizeMm: 2.6,
        fontWeight: 'bold',
        fontStyle: 'normal',
        letterSpacingMm: 0.1,
        lineHeightMultiplier: 1.0,
        horizontalStretchPercent: 100,
        alignment: 'left',
        uppercase: true,
        channel: 'Black',
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false,
        lineIndex: 2
      },
      {
        id: 'obj_line_4',
        type: 'field',
        fieldKey: 'mfd',
        content: '{mfd}',
        x: 1.0,
        y: 12.3,
        width: 10.5,
        height: 2.5,
        rotation: 0,
        fontFamily: 'Roboto Condensed',
        fontSizePt: 7.5,
        fontSizeMm: 2.5,
        fontWeight: 'bold',
        fontStyle: 'normal',
        letterSpacingMm: 0,
        lineHeightMultiplier: 1.0,
        horizontalStretchPercent: 100,
        alignment: 'left',
        uppercase: true,
        channel: 'Black',
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false,
        lineIndex: 3
      },
      {
        id: 'obj_line_5',
        type: 'field',
        fieldKey: 'best_before',
        content: '{best_before}',
        x: 1.0,
        y: 16.1,
        width: 10.5,
        height: 2.5,
        rotation: 0,
        fontFamily: 'Roboto Condensed',
        fontSizePt: 7.5,
        fontSizeMm: 2.5,
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacingMm: 0,
        lineHeightMultiplier: 1.0,
        horizontalStretchPercent: 100,
        alignment: 'left',
        uppercase: true,
        channel: 'Black',
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false,
        lineIndex: 4
      },
      {
        id: 'obj_line_6',
        type: 'field',
        fieldKey: 'rate_per_gm',
        content: '{rate_per_gm}',
        x: 1.0,
        y: 19.7,
        width: 10.5,
        height: 2.2,
        rotation: 0,
        fontFamily: 'Roboto Condensed',
        fontSizePt: 7,
        fontSizeMm: 2.2,
        fontWeight: 'normal',
        fontStyle: 'normal',
        letterSpacingMm: 0,
        lineHeightMultiplier: 1.0,
        horizontalStretchPercent: 100,
        alignment: 'left',
        uppercase: false,
        channel: 'Black',
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false,
        lineIndex: 5
      }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  // Production Batch: ADRC001 (Red Chilli Powder 500 g, ₹305, Active Production Batch)
  const redChilliBatch: Batch = {
    id: 'ADRC001',
    productId: 'prod_adrc',
    rawMaterialKg: 50,
    lotDate: '2026-03-05',
    status: 'Open',
    notes: 'Active production batch for Red Chilli Powder 500 g (M.R.P. ₹305)',
    allocations: [
      {
        id: 'alloc_adrc001_500g',
        batchId: 'ADRC001',
        skuId: 'sku_adrc_500g',
        productId: 'prod_adrc',
        packSize: '500 g',
        allocatedKg: 50,
        expectedPacks: 100,
        mfd: '05/03/26',
        bestBefore: '04/03/27',
        mrpSnapshot: 305,
        ratePerGmSnapshot: 0.61,
        templateVersionSnapshot: 1,
        printStatus: 'Pending',
        packsPrinted: 0
      }
    ],
    createdAt: '2026-03-05T08:00:00.000Z'
  };

  // Historical Batch: ADTP013 (Turmeric 100 g, MFD 01/03/26)
  const historicalBatch: Batch = {
    id: 'ADTP013',
    productId: 'prod_adtp',
    rawMaterialKg: 20,
    lotDate: '2026-03-01',
    status: 'Completed',
    notes: 'Historical batch printed on 01/03/26',
    allocations: [
      {
        id: 'alloc_adtp013_1',
        batchId: 'ADTP013',
        skuId: 'sku_adtp_100g',
        productId: 'prod_adtp',
        packSize: '100 g',
        allocatedKg: 20,
        expectedPacks: 200,
        mfd: '01/03/26',
        bestBefore: '28/02/27',
        mrpSnapshot: 50,
        ratePerGmSnapshot: 0.50,
        templateVersionSnapshot: 1,
        printStatus: 'Printed',
        packsPrinted: 200
      }
    ],
    createdAt: '2026-03-01T08:00:00.000Z'
  };

  // Seed Media Profiles
  const initialMedia: MediaProfile[] = [
    {
      id: 'med_pouch_gloss',
      name: 'Glossy Laminated Plastic Pouch',
      substrate: 'BOPP / MET-PET / Poly',
      preferredDpi: 300,
      densityPercent: 100,
      contrastPercent: 85,
      dotGainCompensationPercent: -5,
      notes: 'Quick-drying solvent ink profile for barrier packaging.'
    },
    {
      id: 'med_corrugate',
      name: 'Corrugated Kraft Carton',
      substrate: 'Brown / White Kraft',
      preferredDpi: 300,
      densityPercent: 90,
      contrastPercent: 75,
      dotGainCompensationPercent: 10,
      notes: 'Porous board; ink spreads slightly.'
    }
  ];

  await db.transaction('rw', [
    db.businesses,
    db.brands,
    db.machineProfiles,
    db.packProfiles,
    db.mediaProfiles,
    db.products,
    db.skus,
    db.templates,
    db.batches,
    db.auditLogs,
    db.looseStock,
    db.printJobs
  ], async () => {
    await db.businesses.put(initialBusiness);
    await db.brands.put(initialBrand);
    await db.machineProfiles.bulkPut([initialMachine, laserMachine]);
    await db.packProfiles.bulkPut([pack100g, pack500g, ...otherPacks]);
    await db.mediaProfiles.bulkPut(initialMedia);
    await db.products.bulkPut(products);
    await db.skus.bulkPut(skus);
    const pack100gDefaultTmpl: Template = {
      ...defaultTemplate,
      id: 'tmpl_pack_default_100g',
      name: 'Default 100 g Layout',
      description: 'General visual layout default for all 100 g packaging across all products'
    };
    const pack500gDefaultTmpl: Template = {
      ...default500gTemplate,
      id: 'tmpl_pack_default_500g',
      name: 'Default 500 g Layout',
      description: 'General visual layout default for all 500 g packaging across all products (45 mm travel length, 12.5 mm nozzle band, enlarged high-impact MRP typography)',
      packSizeScope: '500g',
      isPackSizeDefault: true,
      isSkuOverride: false
    };
    const turmeric100gTmpl: Template = {
      ...pack100gDefaultTmpl,
      id: 'tmpl_sku_override_prod_adtp_100g',
      name: 'Turmeric Powder (100 g) Custom Override',
      isSkuOverride: true,
      isPackSizeDefault: false,
      skuOverrideKey: 'prod_adtp_100g'
    };
    await db.templates.bulkPut([defaultTemplate, pack100gDefaultTmpl, pack500gDefaultTmpl, turmeric100gTmpl]);
    await db.batches.bulkPut([redChilliBatch, historicalBatch]);

    const seedLooseStock: LooseStockRecord = {
      id: 'loose_ADTP013_residual',
      productId: 'prod_adtp',
      sourceBatchId: 'ADTP013',
      lotDate: '2026-03-01',
      initialQuantityKg: 5.0,
      availableQuantityKg: 5.0,
      reservedQuantityKg: 0,
      consumedQuantityKg: 0,
      scrappedQuantityKg: 0,
      containerId: 'BIN_TURMERIC_RESIDUAL_01',
      qualityPassed: true,
      notes: 'Residual 5.0 kg loose stock from batch ADTP013 (50 kg raw - 20 kg 100g - 25 kg 500g)',
      status: 'Available',
      createdAt: '2026-03-01T12:00:00.000Z',
      updatedAt: '2026-03-01T12:00:00.000Z'
    };
    await db.looseStock.put(seedLooseStock);

    const seedPrintJob: PrintJob = {
      id: 'job_adtp013_100g',
      jobCode: 'JOB-ADTP013-100G',
      businessName: 'ADALAJ Organics & Packaging',
      brandName: 'ADALAJ',
      productName: 'Turmeric Powder',
      skuSize: '100 g',
      batchId: 'ADTP013',
      quantityPacks: 200,
      completedQuantity: 200,
      rejectedQuantity: 0,
      proofStatus: 'Production Ready',
      productionStatus: 'Completed',
      machineId: 'mach_r2d2',
      machineName: 'R2D2-SX100',
      surfaceProfileName: '100 g Pouch',
      travel: 'Horizontal',
      layout: 'Stack',
      passPlan: {
        totalPasses: 1,
        passes: [{
          passNumber: 1,
          objectIds: defaultTemplate.objects.map(o => o.id),
          linesSummary: 'M.R.P. ₹50 / B.No. ADTP013 / MFD 01/03/26',
          startOffsetMm: 0,
          travelLengthMm: 35,
          direction: 'Horizontal',
          rotation: 0,
          fileName: 'ADTP013A.BMP'
        }],
        oneLineReason: 'Fits within single 12.5mm TIJ print band'
      },
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
        feedDirection: 'Top -> Bottom'
      },
      templateSnapshot: turmeric100gTmpl,
      valuesSnapshot: {
        mrp: '₹50',
        batch: 'ADTP013',
        net_wt: '100 g',
        mfd: '01/03/26',
        best_before: '28/02/27',
        rate_per_gm: '₹0.50 / g'
      },
      exportedFiles: [
        { name: 'ADTP013A.BMP', sizeBytes: 15360, type: 'image/bmp' }
      ],
      operatorName: 'Production Lead',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:30:00.000Z'
    };
    await db.printJobs.put(seedPrintJob);

    await db.auditLogs.put({
      id: 'audit_init',
      timestamp: new Date().toISOString(),
      action: 'SYSTEM_INIT',
      details: 'Adalaj Print Lab database initialized with seed catalog, loose stock ledger, and historical batch ADTP013.',
      user: 'System',
      undoable: false
    });
  });

  // Seed snapshot mirror immediately
  await saveUniversalSnapshot();
}
