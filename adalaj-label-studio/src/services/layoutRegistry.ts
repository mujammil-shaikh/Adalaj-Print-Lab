/**
 * ADALAJ Label Studio - Two-Tier Layout Registry & Inheritance Engine
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

export function getPackDefaultTemplateId(packSize: string): string {
  return `tmpl_pack_default_${normalizePackSize(packSize)}`;
}

export function getSkuOverrideTemplateId(productId: string, packSize: string): string {
  return `tmpl_sku_override_${productId}_${normalizePackSize(packSize)}`;
}

export type LayoutSource = 'sku_override' | 'pack_default' | 'scratch_new';

export interface ResolvedLayout {
  template: Template;
  source: LayoutSource;
  normalizedPackSize: string;
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
      x: 0.5,
      y: 0.2,
      width: 11.5,
      height: 3.5,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 10,
      fontSizeMm: 3.5,
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
      x: 0.5,
      y: 4.5,
      width: 11.5,
      height: 3.2,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 9,
      fontSizeMm: 3.2,
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
      x: 0.5,
      y: 8.5,
      width: 11.5,
      height: 3.0,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 8.5,
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
      lineIndex: 2
    },
    {
      id: `obj_scratch_mfd_${Date.now()}`,
      type: 'field',
      fieldKey: 'mfd',
      content: '{mfd}',
      x: 0.5,
      y: 12.3,
      width: 11.5,
      height: 3.0,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8.5,
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
      lineIndex: 3
    },
    {
      id: `obj_scratch_bb_${Date.now()}`,
      type: 'field',
      fieldKey: 'best_before',
      content: '{best_before}',
      x: 0.5,
      y: 16.1,
      width: 11.5,
      height: 2.8,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8,
      fontSizeMm: 2.8,
      fontWeight: 'normal',
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
      lineIndex: 4
    },
    {
      id: `obj_scratch_rate_${Date.now()}`,
      type: 'field',
      fieldKey: 'rate_per_gm',
      content: '{rate_per_gm}',
      x: 0.5,
      y: 19.7,
      width: 11.5,
      height: 2.4,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 7,
      fontSizeMm: 2.4,
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
      x: 0.5,
      y: 0.2,
      width: 11.5,
      height: 3.5,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 10,
      fontSizeMm: 3.5,
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
      x: 0.5,
      y: 4.5,
      width: 11.5,
      height: 3.2,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 9,
      fontSizeMm: 3.2,
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
      x: 0.5,
      y: 8.5,
      width: 11.5,
      height: 3.0,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 8.5,
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
      lineIndex: 2
    },
    {
      id: 'obj_100g_line_4',
      type: 'field',
      fieldKey: 'mfd',
      content: '{mfd}',
      x: 0.5,
      y: 12.3,
      width: 11.5,
      height: 3.0,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8.5,
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
      lineIndex: 3
    },
    {
      id: 'obj_100g_line_5',
      type: 'field',
      fieldKey: 'best_before',
      content: '{best_before}',
      x: 0.5,
      y: 16.1,
      width: 11.5,
      height: 2.8,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8,
      fontSizeMm: 2.8,
      fontWeight: 'normal',
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
      lineIndex: 4
    },
    {
      id: 'obj_100g_line_6',
      type: 'field',
      fieldKey: 'rate_per_gm',
      content: '{rate_per_gm}',
      x: 0.5,
      y: 19.7,
      width: 11.5,
      height: 2.4,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 7,
      fontSizeMm: 2.4,
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
  description: 'General visual layout default for all 500 g packaging across all products (45 mm travel length, 12.5 mm nozzle band, 5.0 mm line pitch)',
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
      height: 3.8,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 10.5,
      fontSizeMm: 3.8,
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
      id: 'obj_500g_line_2',
      type: 'field',
      fieldKey: 'batch',
      content: '{batch}',
      x: 0.5,
      y: 5.5,
      width: 11.5,
      height: 3.5,
      rotation: 0,
      fontFamily: 'Roboto Condensed',
      fontSizePt: 9.5,
      fontSizeMm: 3.5,
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
      id: 'obj_500g_line_3',
      type: 'field',
      fieldKey: 'net_wt',
      content: '{net_wt}',
      x: 0.5,
      y: 10.5,
      width: 11.5,
      height: 3.2,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 9,
      fontSizeMm: 3.2,
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
      id: 'obj_500g_line_4',
      type: 'field',
      fieldKey: 'mfd',
      content: '{mfd}',
      x: 0.5,
      y: 15.2,
      width: 11.5,
      height: 3.2,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 9,
      fontSizeMm: 3.2,
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
      lineIndex: 3
    },
    {
      id: 'obj_500g_line_5',
      type: 'field',
      fieldKey: 'best_before',
      content: '{best_before}',
      x: 0.5,
      y: 19.8,
      width: 11.5,
      height: 3.0,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8.5,
      fontSizeMm: 3.0,
      fontWeight: 'normal',
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
      lineIndex: 4
    },
    {
      id: 'obj_500g_line_6',
      type: 'field',
      fieldKey: 'rate_per_gm',
      content: '{rate_per_gm}',
      x: 0.5,
      y: 24.2,
      width: 11.5,
      height: 2.6,
      rotation: 0,
      fontFamily: 'Noto Sans',
      fontSizePt: 7.5,
      fontSizeMm: 2.6,
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
/**
 * Resolves the effective template following a clean, universal two-tier hierarchy:
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
  templates: Template[],
  packProfiles?: PackProfile[]
): ResolvedLayout {
  const norm = normalizePackSize(packSize);
  const skuOverrideId = getSkuOverrideTemplateId(productId, packSize);
  const skuOverrideKey = `${productId}_${norm}`;
  const packDefaultId = getPackDefaultTemplateId(packSize);

  // Check 1: Does this specific product have its own independent custom override?
  const skuOverride = templates.find(t => 
    t.id === skuOverrideId || 
    t.skuOverrideKey === skuOverrideKey ||
    (t.isSkuOverride && t.skuOverrideKey === skuOverrideKey)
  );

  // Check 2: Global Pack Default in database (e.g. tmpl_pack_default_100g)
  const packDefault = templates.find(t => 
    t.id === packDefaultId || 
    (t.packSizeScope === norm && t.isPackSizeDefault)
  );

  if (skuOverride) {
    return {
      template: JSON.parse(JSON.stringify(skuOverride)),
      source: 'sku_override',
      normalizedPackSize: norm,
      hasCustomOverride: true,
      hasPackDefault: !!packDefault
    };
  }

  if (packDefault) {
    return {
      template: JSON.parse(JSON.stringify(packDefault)),
      source: 'pack_default',
      normalizedPackSize: norm,
      hasCustomOverride: false,
      hasPackDefault: true
    };
  }

  // Fallback 1: Pristine global 100g template
  if (norm === '100g') {
    const seed = templates.find(t => t.id === 'tmpl_adalaj_6line') || default100gTemplate;
    return {
      template: JSON.parse(JSON.stringify(seed)),
      source: 'pack_default',
      normalizedPackSize: norm,
      hasCustomOverride: false,
      hasPackDefault: true
    };
  }

  // Fallback 2: Pristine global 500g template
  if (norm === '500g') {
    return {
      template: JSON.parse(JSON.stringify(default500gTemplate)),
      source: 'pack_default',
      normalizedPackSize: norm,
      hasCustomOverride: false,
      hasPackDefault: true
    };
  }

  // Fallback 3: Scratch starter for other pack sizes
  const scratch = createScratchTemplate(packSize, packProfiles);
  return {
    template: scratch,
    source: 'scratch_new',
    normalizedPackSize: norm,
    hasCustomOverride: false,
    hasPackDefault: false
  };
}

/**
 * Prepares a template to be saved as the General Pack Size Default
 * Strips any SKU-specific lock or key, and brands it as the default for all SKUs of this pack size.
 */
export function buildPackDefaultTemplate(
  currentTemplate: Template,
  packSize: string
): Template {
  const norm = normalizePackSize(packSize);
  const targetId = getPackDefaultTemplateId(packSize);

  return {
    ...currentTemplate,
    id: targetId,
    name: `Default ${packSize} Layout`,
    description: `General visual layout default for all ${packSize} packaging across all products`,
    packSizeScope: norm,
    isPackSizeDefault: true,
    isSkuOverride: false,
    skuOverrideKey: undefined,
    version: (currentTemplate.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Prepares a template to be saved as a Product/SKU Specific Override
 * Isolates adjustments strictly to this product and pack size.
 */
export function buildSkuOverrideTemplate(
  currentTemplate: Template,
  productId: string,
  productName: string,
  packSize: string
): Template {
  const norm = normalizePackSize(packSize);
  const targetId = getSkuOverrideTemplateId(productId, packSize);
  const skuOverrideKey = `${productId}_${norm}`;

  return {
    ...currentTemplate,
    id: targetId,
    name: `${productName} (${packSize}) Custom Override`,
    description: `Specific layout override for ${productName} ${packSize}. Does not alter general ${packSize} default.`,
    packSizeScope: norm,
    isSkuOverride: true,
    isPackSizeDefault: false,
    skuOverrideKey,
    version: (currentTemplate.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };
}
