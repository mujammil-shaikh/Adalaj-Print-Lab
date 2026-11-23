/**
 * Adalaj Print Lab - Two-Tier Layout Registry & Inheritance Engine
 *
 * Tier 1: General Pack Size Default (e.g. all 100g packages across all products)
 * Tier 2: Product / SKU Specific Override (e.g. Turmeric 500g specific tweak)
 *
 * Enforces strict separation:
 * - Adjustable visual layout data (geometry, positions, font sizes, line gap, nozzle band, travel length)
 * - Dynamic data values (product name, batch number, MRP, dates come from SKU & Batch)
 * - 100g layouts never pollute 500g, 200g, or other pack sizes. Each pack size starts fresh from scratch
 *   until saved as its own general default.
 */

import type { Template, DesignObject, PackProfile } from '../types';

/**
 * Standardize pack size strings into consistent keys
 * e.g. "100 g", "100g", "100 gm", "100 GM" -> "100g"
 * e.g. "500 g", "500gm", "500g" -> "500g"
 * e.g. "1 kg", "1kg", "1000g" -> "1kg"
 */
export function normalizePackSize(size: string): string {
  if (!size) return '100g';
  const clean = size.toLowerCase().trim().replace(/\s+/g, '');
  if (clean.includes('gm')) return clean.replace('gm', 'g');
  if (clean.includes('gram')) return clean.replace('gram', 'g');
  if (clean.includes('kgs')) return clean.replace('kgs', 'kg');
  return clean;
}

/**
 * Standard Packaging Types identifiable in dropdowns and persistent template scopes
 */
export const STANDARD_PACKAGING_TYPES = [
  { id: 'standup_pouch', label: 'Standup Pouch', short: 'Standup', surface: 'Pouch' },
  { id: 'flat_pouch', label: 'Flat Pouch', short: 'Flat Pouch', surface: 'Pouch' },
  { id: 'pillow_pouch', label: 'Pillow Pouch', short: 'Pillow', surface: 'Pouch' },
  { id: 'jar', label: 'Jar', short: 'Jar', surface: 'Bottle / Jar' },
  { id: 'bottle', label: 'Bottle', short: 'Bottle', surface: 'Bottle / Jar' },
  { id: 'tin_can', label: 'Tin / Can', short: 'Tin', surface: 'Carton' },
  { id: 'carton_box', label: 'Carton / Box', short: 'Carton', surface: 'Carton' },
  { id: 'custom', label: 'Custom / Other', short: 'Custom', surface: 'Custom' },
] as const;

export type StandardPackagingTypeId = typeof STANDARD_PACKAGING_TYPES[number]['id'];

export function normalizePackType(type?: string): string {
  if (!type) return 'standup_pouch';
  const clean = type.toLowerCase().trim().replace(/[\s\-_/]+/g, '_');
  if (clean.includes('stand') || clean.includes('sup')) return 'standup_pouch';
  if (clean.includes('flat')) return 'flat_pouch';
  if (clean.includes('pillow')) return 'pillow_pouch';
  if (clean.includes('jar')) return 'jar';
  if (clean.includes('bottle')) return 'bottle';
  if (clean.includes('tin') || clean.includes('can')) return 'tin_can';
  if (clean.includes('carton') || clean.includes('box')) return 'carton_box';
  return clean || 'standup_pouch';
}

export function formatPackTypeLabel(type?: string): string {
  const norm = normalizePackType(type);
  const found = STANDARD_PACKAGING_TYPES.find(p => p.id === norm);
  return found ? found.label : (type || 'Standup Pouch');
}

export function getPackDefaultTemplateId(packSize: string, packType?: string): string {
  const normSize = normalizePackSize(packSize);
  const normType = normalizePackType(packType);
  return `tmpl_pack_default_${normSize}_${normType}`;
}

export function getLegacyPackDefaultTemplateId(packSize: string): string {
  return `tmpl_pack_default_${normalizePackSize(packSize)}`;
}

export function getSkuOverrideTemplateId(productId: string, packSize: string, packType?: string): string {
  const normSize = normalizePackSize(packSize);
  const normType = normalizePackType(packType);
  return `tmpl_sku_override_${productId}_${normSize}_${normType}`;
}

export function getLegacySkuOverrideTemplateId(productId: string, packSize: string): string {
  return `tmpl_sku_override_${productId}_${normalizePackSize(packSize)}`;
}

export type LayoutSource = 'sku_override' | 'pack_default' | 'scratch_new';

export interface ResolvedLayout {
  template: Template;
  source: LayoutSource;
  normalizedPackSize: string;
  normalizedPackType: string;
  hasCustomOverride: boolean;
  hasPackDefault: boolean;
}

/**
 * Creates a clean, pristine scratch starter template for a newly encountered pack size.
 * Does NOT copy lingering offsets or coordinates from 100g.
 */
export function createScratchTemplate(packSize: string, packProfiles?: PackProfile[]): Template {
  const norm = normalizePackSize(packSize);
  const matchedPack = packProfiles?.find(p => normalizePackSize(p.name) === norm);

  // Set reasonable travel length based on pack size or pack profile
  let travelLength = 35;
  if (matchedPack?.printWindowLengthMm && matchedPack.printWindowLengthMm > 0) {
    travelLength = matchedPack.printWindowLengthMm;
  } else if (norm.includes('500g') || norm.includes('1kg') || norm.includes('2kg') || norm.includes('5kg')) {
    travelLength = 45;
  }

  const bandMm = matchedPack?.printWindowWidthMm || 12.5;

  const starterObjects: DesignObject[] = [
    {
      id: `obj_scratch_mrp_${Date.now()}`,
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
      id: `obj_scratch_batch_${Date.now()}`,
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
      id: `obj_scratch_netwt_${Date.now()}`,
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
      id: `obj_scratch_mfd_${Date.now()}`,
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
      id: `obj_scratch_bb_${Date.now()}`,
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
      id: `obj_scratch_rate_${Date.now()}`,
      type: 'field',
      fieldKey: 'rate_per_gm',
      content: '{rate_per_gm}',
      x: 1.0,
      y: 19.7,
      width: 10.5,
      height: 2.2,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 7,
      fontSizeMm: 2.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0.05,
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
  ];

  return {
    id: `tmpl_scratch_${norm}`,
    name: `Scratch ${packSize} Starter`,
    description: `Clean initial layout for ${packSize} packaging. Ready to be saved as General Default.`,
    version: 1,
    status: 'Draft',
    travel: 'Vertical',
    layout: 'Stack',
    printCaptions: false,
    currencySymbol: '₹',
    currencyPosition: 'prefix',
    lineGapMm: 0.8,
    autoFlow: true,
    preventOverlap: true,
    respectPadding: true,
    customLengthMm: travelLength,
    customBandMm: bandMm,
    packSizeScope: norm,
    isPackSizeDefault: false,
    isSkuOverride: false,
    objects: starterObjects,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export const default100gTemplate: Template = {
  id: 'tmpl_pack_default_100g',
  name: 'Default 100 g Layout',
  description: 'General visual layout default for all 100 g packaging across all products (35 mm travel length, 12.5 mm nozzle band)',
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
  isSkuOverride: false,
  objects: [
    {
      id: 'obj_100g_line_1',
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
      id: 'obj_100g_line_2',
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
      id: 'obj_100g_line_3',
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
      id: 'obj_100g_line_4',
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
      id: 'obj_100g_line_5',
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
      id: 'obj_100g_line_6',
      type: 'field',
      fieldKey: 'rate_per_gm',
      content: '{rate_per_gm}',
      x: 1.0,
      y: 19.7,
      width: 10.5,
      height: 2.2,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 7,
      fontSizeMm: 2.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0.05,
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
  createdAt: '2026-03-01T08:00:00.000Z',
  updatedAt: new Date().toISOString()
};

export const default500gTemplate: Template = {
  id: 'tmpl_pack_default_500g',
  name: 'Default 500 g Layout',
  description: 'General visual layout default for all 500 g packaging across all products (45 mm travel length, 12.5 mm nozzle band, enlarged high-impact MRP typography)',
  version: 1,
  status: 'Approved',
  travel: 'Vertical',
  layout: 'Stack',
  printCaptions: false,
  currencySymbol: '₹',
  currencyPosition: 'prefix',
  lineGapMm: 1.0,
  autoFlow: true,
  preventOverlap: true,
  respectPadding: true,
  customLengthMm: 45,
  customBandMm: 12.5,
  packSizeScope: '500g',
  isPackSizeDefault: true,
  isSkuOverride: false,
  objects: [
    {
      id: 'obj_500g_line_1',
      type: 'field',
      fieldKey: 'mrp',
      content: '{mrp}',
      x: 0.5,
      y: 0.5,
      width: 11.5,
      height: 7.5,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 18,
      fontSizeMm: 6.5,
      fontWeight: 'bold',
      fontStyle: 'normal',
      letterSpacingMm: 0.05,
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
      id: 'obj_500g_line_2',
      type: 'field',
      fieldKey: 'batch',
      content: '{batch}',
      x: 0.5,
      y: 11.0,
      width: 11.5,
      height: 4.0,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 11,
      fontSizeMm: 3.8,
      fontWeight: 'bold',
      fontStyle: 'normal',
      letterSpacingMm: 0.05,
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
      id: 'obj_500g_line_3',
      type: 'field',
      fieldKey: 'net_wt',
      content: '{net_wt}',
      x: 0.5,
      y: 19.0,
      width: 11.5,
      height: 4.2,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 12,
      fontSizeMm: 4.0,
      fontWeight: 'bold',
      fontStyle: 'normal',
      letterSpacingMm: 0.05,
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
      id: 'obj_500g_line_4',
      type: 'field',
      fieldKey: 'mfd',
      content: '{mfd}',
      x: 0.5,
      y: 27.0,
      width: 11.5,
      height: 3.2,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 8,
      fontSizeMm: 2.6,
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
      lineIndex: 3
    },
    {
      id: 'obj_500g_line_5',
      type: 'field',
      fieldKey: 'best_before',
      content: '{best_before}',
      x: 0.5,
      y: 33.5,
      width: 11.5,
      height: 3.2,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 8,
      fontSizeMm: 2.6,
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
      id: 'obj_500g_line_6',
      type: 'field',
      fieldKey: 'rate_per_gm',
      content: '{rate_per_gm}',
      x: 0.5,
      y: 39.5,
      width: 11.5,
      height: 3.0,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 8,
      fontSizeMm: 2.6,
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
  createdAt: '2026-03-01T08:00:00.000Z',
  updatedAt: new Date().toISOString()
};

export const turmeric100gOverrideTemplate: Template = {
  ...default100gTemplate,
  id: 'tmpl_sku_override_prod_adtp_100g',
  name: 'Turmeric Powder (100 g) Custom Override',
  description: 'Specific calibrated placement for Turmeric Powder 100 g (ADTP014, ₹50, 100 G, 12.5mm nozzle band, 35mm travel)',
  isSkuOverride: true,
  isPackSizeDefault: false,
  skuOverrideKey: 'prod_adtp_100g'
};

export const turmeric500gOverrideTemplate: Template = {
  ...default500gTemplate,
  id: 'tmpl_sku_override_prod_adtp_500g',
  name: 'Turmeric Powder (500 g) Custom Override',
  description: 'Specific calibrated placement for Turmeric Powder 500 g (45 mm travel length, 12.5 mm nozzle band)',
  isSkuOverride: true,
  isPackSizeDefault: false,
  skuOverrideKey: 'prod_adtp_500g'
};

export const coriander100gOverrideTemplate: Template = {
  ...default100gTemplate,
  id: 'tmpl_sku_override_prod_adcp_100g',
  name: 'Coriander Powder (100 g) Custom Override',
  description: 'Perfect calibrated placement for Coriander Powder 100 g (ADCP014, ₹45, 100 G, 12.5mm nozzle band, 35mm travel)',
  isSkuOverride: true,
  isPackSizeDefault: false,
  skuOverrideKey: 'prod_adcp_100g'
};

export const coriander500gOverrideTemplate: Template = {
  ...default500gTemplate,
  id: 'tmpl_sku_override_prod_adcp_500g',
  name: 'Coriander Powder (500 g) Custom Override',
  description: 'Perfect calibrated placement for Coriander Powder 500 g (ADCP014, 500 G, 12.5mm nozzle band, 45mm travel)',
  isSkuOverride: true,
  isPackSizeDefault: false,
  skuOverrideKey: 'prod_adcp_500g'
};

export const garamMasala100gOverrideTemplate: Template = {
  ...default100gTemplate,
  id: 'tmpl_sku_override_prod_adgm_100g',
  name: 'Garam Masala (100 g) Custom Override',
  description: 'Perfect calibrated placement for Garam Masala 100 g (ADGM014, ₹75, 100 G, 12.5mm nozzle band, 35mm travel)',
  isSkuOverride: true,
  isPackSizeDefault: false,
  skuOverrideKey: 'prod_adgm_100g'
};

export const garamMasala500gOverrideTemplate: Template = {
  ...default500gTemplate,
  id: 'tmpl_sku_override_prod_adgm_500g',
  name: 'Garam Masala (500 g) Custom Override',
  description: 'Perfect calibrated placement for Garam Masala 500 g (ADGM014, 500 G, 12.5mm nozzle band, 45mm travel)',
  isSkuOverride: true,
  isPackSizeDefault: false,
  skuOverrideKey: 'prod_adgm_500g'
};

/**
 * Returns the immutable clean Global Default for a given pack size (e.g. 100g or 500g)
 * Never affected by unsaved edits or temporary state.
 */
export function getCleanGlobalPackDefault(packSize: string): Template {
  const norm = normalizePackSize(packSize);
  if (norm === '100g') {
    return JSON.parse(JSON.stringify(default100gTemplate));
  }
  if (norm === '500g') {
    return JSON.parse(JSON.stringify(default500gTemplate));
  }
  return createScratchTemplate(packSize);
}

/**
 * Returns the factory calibrated perfect layout for a specific product & pack size
 */
export function getFactoryProductTemplate(productId: string, packSize: string): Template {
  const norm = normalizePackSize(packSize);
  if (norm === '100g') {
    if (productId === 'prod_adcp') return JSON.parse(JSON.stringify(coriander100gOverrideTemplate));
    if (productId === 'prod_adgm') return JSON.parse(JSON.stringify(garamMasala100gOverrideTemplate));
    if (productId === 'prod_adtp') return JSON.parse(JSON.stringify(turmeric100gOverrideTemplate));
    return JSON.parse(JSON.stringify(default100gTemplate));
  }
  if (norm === '500g') {
    if (productId === 'prod_adcp') return JSON.parse(JSON.stringify(coriander500gOverrideTemplate));
    if (productId === 'prod_adgm') return JSON.parse(JSON.stringify(garamMasala500gOverrideTemplate));
    if (productId === 'prod_adtp') return JSON.parse(JSON.stringify(turmeric500gOverrideTemplate));
    return JSON.parse(JSON.stringify(default500gTemplate));
  }
  return createScratchTemplate(packSize);
}

/**
 * Resolves the effective template following a clean two-tier hierarchy:
 * 1. Independent Product-Specific Custom State / Override (if user saved one for this product)
 * 2. Global Pack Size Default across all products (e.g. 100g, 500g)
 * 3. Pristine Baseline Factory Template for the pack size
 *
 * NO product is hardcoded as a benchmark. Any product can be saved as the Global Default,
 * and any product can have its own independent custom state.
 */
export function resolveLayout(
  productId: string,
  packSize: string,
  packTypeOrTemplates?: string | Template[],
  templatesOrProfiles?: Template[] | PackProfile[],
  maybePackProfiles?: PackProfile[]
): ResolvedLayout {
  let packType: string | undefined = undefined;
  let templates: Template[] = [];
  let packProfiles: PackProfile[] | undefined = undefined;

  if (typeof packTypeOrTemplates === 'string') {
    packType = packTypeOrTemplates;
    templates = Array.isArray(templatesOrProfiles) ? (templatesOrProfiles as Template[]) : [];
    packProfiles = maybePackProfiles;
  } else {
    // Backwards-compatible signature: resolveLayout(productId, packSize, templates, packProfiles)
    packType = 'standup_pouch';
    templates = Array.isArray(packTypeOrTemplates) ? packTypeOrTemplates : [];
    packProfiles = Array.isArray(templatesOrProfiles) ? (templatesOrProfiles as PackProfile[]) : undefined;
  }

  const normSize = normalizePackSize(packSize);
  const normType = normalizePackType(packType);

  const skuOverrideId = getSkuOverrideTemplateId(productId, packSize, packType);
  const skuOverrideKey = `${productId}_${normSize}_${normType}`;
  const legacySkuOverrideId = getLegacySkuOverrideTemplateId(productId, packSize);
  const legacySkuOverrideKey = `${productId}_${normSize}`;

  const packDefaultId = getPackDefaultTemplateId(packSize, packType);
  const legacyPackDefaultId = getLegacyPackDefaultTemplateId(packSize);

  // Check 1: SKU Override (specific to this product + size + type, or legacy product + size)
  const skuOverride = templates.find(t => 
    t.id === skuOverrideId || 
    t.skuOverrideKey === skuOverrideKey ||
    (t.isSkuOverride && t.skuOverrideKey === skuOverrideKey)
  ) || templates.find(t =>
    t.id === legacySkuOverrideId ||
    t.skuOverrideKey === legacySkuOverrideKey ||
    (t.isSkuOverride && t.skuOverrideKey === legacySkuOverrideKey)
  );

  // Check 2: Global Pack Default for (packSize, packType), falling back gracefully to legacy pack size default
  const packDefault = templates.find(t => t.id === packDefaultId)
    || templates.find(t => t.packSizeScope === normSize && t.packTypeScope === normType && t.isPackSizeDefault)
    || templates.find(t => t.id === legacyPackDefaultId)
    || templates.find(t => t.packSizeScope === normSize && t.isPackSizeDefault && t.id !== 'tmpl_adalaj_6line')
    || templates.find(t => t.packSizeScope === normSize && t.isPackSizeDefault);

  if (skuOverride) {
    return {
      template: JSON.parse(JSON.stringify(skuOverride)),
      source: 'sku_override',
      normalizedPackSize: normSize,
      normalizedPackType: normType,
      hasCustomOverride: true,
      hasPackDefault: !!packDefault
    };
  }

  if (packDefault) {
    return {
      template: JSON.parse(JSON.stringify(packDefault)),
      source: 'pack_default',
      normalizedPackSize: normSize,
      normalizedPackType: normType,
      hasCustomOverride: false,
      hasPackDefault: true
    };
  }

  // Fallback 1: Pristine global 100g template
  if (normSize === '100g') {
    const seed = templates.find(t => t.id === packDefaultId) 
      || templates.find(t => t.id === legacyPackDefaultId) 
      || templates.find(t => t.id === 'tmpl_adalaj_6line') 
      || default100gTemplate;
    return {
      template: JSON.parse(JSON.stringify(seed)),
      source: 'pack_default',
      normalizedPackSize: normSize,
      normalizedPackType: normType,
      hasCustomOverride: false,
      hasPackDefault: true
    };
  }

  // Fallback 2: Pristine global 500g template
  if (normSize === '500g') {
    const seed = templates.find(t => t.id === packDefaultId) 
      || templates.find(t => t.id === legacyPackDefaultId) 
      || default500gTemplate;
    return {
      template: JSON.parse(JSON.stringify(seed)),
      source: 'pack_default',
      normalizedPackSize: normSize,
      normalizedPackType: normType,
      hasCustomOverride: false,
      hasPackDefault: true
    };
  }

  // Fallback 3: Scratch starter for other pack sizes & types
  const scratch = createScratchTemplate(packSize, packProfiles);
  scratch.packTypeScope = normType;
  return {
    template: scratch,
    source: 'scratch_new',
    normalizedPackSize: normSize,
    normalizedPackType: normType,
    hasCustomOverride: false,
    hasPackDefault: false
  };
}

/**
 * Prepares a template to be saved as the General Pack Size + Pack Type Default
 * Strips any SKU-specific lock or key, and brands it as the default for all SKUs of this pack size and packaging type.
 */
export function buildPackDefaultTemplate(
  currentTemplate: Template,
  packSize: string,
  packType?: string
): Template {
  const normSize = normalizePackSize(packSize);
  const normType = normalizePackType(packType || currentTemplate.packTypeScope);
  const targetId = getPackDefaultTemplateId(packSize, normType);
  const typeLabel = formatPackTypeLabel(normType);

  return {
    ...currentTemplate,
    id: targetId,
    name: `Default ${packSize} ${typeLabel} Layout`,
    description: `General visual layout default for all ${packSize} ${typeLabel} packaging across all products`,
    packSizeScope: normSize,
    packTypeScope: normType,
    isPackSizeDefault: true,
    isSkuOverride: false,
    skuOverrideKey: undefined,
    version: (currentTemplate.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Prepares a template to be saved as a Product/SKU Specific Override
 * Isolates adjustments strictly to this product, pack size, and packaging type.
 */
export function buildSkuOverrideTemplate(
  currentTemplate: Template,
  productId: string,
  productName: string,
  packSize: string,
  packType?: string
): Template {
  const normSize = normalizePackSize(packSize);
  const normType = normalizePackType(packType || currentTemplate.packTypeScope);
  const targetId = getSkuOverrideTemplateId(productId, packSize, normType);
  const skuOverrideKey = `${productId}_${normSize}_${normType}`;
  const typeLabel = formatPackTypeLabel(normType);

  return {
    ...currentTemplate,
    id: targetId,
    name: `${productName} (${packSize} ${typeLabel}) Custom Override`,
    description: `Specific layout override for ${productName} ${packSize} ${typeLabel}. Does not alter general ${packSize} default.`,
    packSizeScope: normSize,
    packTypeScope: normType,
    isSkuOverride: true,
    isPackSizeDefault: false,
    skuOverrideKey,
    version: (currentTemplate.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };
}
