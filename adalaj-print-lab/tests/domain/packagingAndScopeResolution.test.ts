import { describe, it, expect } from 'vitest';
import {
  STANDARD_PACKAGING_TYPES,
  normalizePackSize,
  normalizePackType,
  formatPackTypeLabel,
  getPackDefaultTemplateId,
  getLegacyPackDefaultTemplateId,
  getSkuOverrideTemplateId,
  getLegacySkuOverrideTemplateId,
  buildPackDefaultTemplate,
  buildSkuOverrideTemplate,
  resolveLayout,
  default500gTemplate,
  default100gTemplate
} from '../../src/services/layoutRegistry';
import type { Template } from '../../src/types';

describe('Packaging Type & Scope Resolution (Multi-Pack Size & Pack Type Isolation)', () => {
  it('provides all standard packaging types with clear labels', () => {
    expect(STANDARD_PACKAGING_TYPES.length).toBeGreaterThanOrEqual(8);
    const ids = STANDARD_PACKAGING_TYPES.map(t => t.id);
    expect(ids).toContain('standup_pouch');
    expect(ids).toContain('flat_pouch');
    expect(ids).toContain('pillow_pouch');
    expect(ids).toContain('jar');
    expect(ids).toContain('bottle');
    expect(ids).toContain('tin_can');
    expect(ids).toContain('carton_box');
    expect(ids).toContain('custom');
  });

  it('normalizes packaging types reliably', () => {
    expect(normalizePackType('Standup Pouch')).toBe('standup_pouch');
    expect(normalizePackType('Stand-up Pouch')).toBe('standup_pouch');
    expect(normalizePackType('SUP')).toBe('standup_pouch');
    expect(normalizePackType('flat pouch')).toBe('flat_pouch');
    expect(normalizePackType('Pillow Pouch')).toBe('pillow_pouch');
    expect(normalizePackType('Glass Jar')).toBe('jar');
    expect(normalizePackType('Pet Bottle')).toBe('bottle');
    expect(normalizePackType('Tin / Can')).toBe('tin_can');
    expect(normalizePackType('Carton Box')).toBe('carton_box');
    expect(normalizePackType(undefined)).toBe('standup_pouch');
  });

  it('formats human-readable labels for packaging types', () => {
    expect(formatPackTypeLabel('standup_pouch')).toBe('Standup Pouch');
    expect(formatPackTypeLabel('jar')).toBe('Jar');
    expect(formatPackTypeLabel('flat_pouch')).toBe('Flat Pouch');
  });

  it('generates consistent scoped template IDs for Global Defaults and SKU Overrides', () => {
    expect(getPackDefaultTemplateId('500 g', 'standup_pouch')).toBe('tmpl_pack_default_500g_standup_pouch');
    expect(getPackDefaultTemplateId('500 g', 'jar')).toBe('tmpl_pack_default_500g_jar');
    expect(getPackDefaultTemplateId('100 g', 'flat_pouch')).toBe('tmpl_pack_default_100g_flat_pouch');
    expect(getLegacyPackDefaultTemplateId('500 g')).toBe('tmpl_pack_default_500g');

    expect(getSkuOverrideTemplateId('prod_adrc', '500 g', 'standup_pouch')).toBe('tmpl_sku_override_prod_adrc_500g_standup_pouch');
    expect(getSkuOverrideTemplateId('prod_adtp', '100 g', 'jar')).toBe('tmpl_sku_override_prod_adtp_100g_jar');
    expect(getLegacySkuOverrideTemplateId('prod_adrc', '500 g')).toBe('tmpl_sku_override_prod_adrc_500g');
  });

  it('buildPackDefaultTemplate stamps packSizeScope and packTypeScope', () => {
    const base = JSON.parse(JSON.stringify(default500gTemplate)) as Template;
    const globalJar = buildPackDefaultTemplate(base, '500 g', 'jar');

    expect(globalJar.id).toBe('tmpl_pack_default_500g_jar');
    expect(globalJar.packSizeScope).toBe('500g');
    expect(globalJar.packTypeScope).toBe('jar');
    expect(globalJar.isPackSizeDefault).toBe(true);
    expect(globalJar.isSkuOverride).toBe(false);
    expect(globalJar.skuOverrideKey).toBeUndefined();
    expect(globalJar.name).toContain('500 g');
    expect(globalJar.name).toContain('Jar');
  });

  it('buildSkuOverrideTemplate stamps packSizeScope, packTypeScope and composite skuOverrideKey', () => {
    const base = JSON.parse(JSON.stringify(default500gTemplate)) as Template;
    const override = buildSkuOverrideTemplate(base, 'prod_adrc', 'Red Chilli', '500 g', 'standup_pouch');

    expect(override.id).toBe('tmpl_sku_override_prod_adrc_500g_standup_pouch');
    expect(override.packSizeScope).toBe('500g');
    expect(override.packTypeScope).toBe('standup_pouch');
    expect(override.isSkuOverride).toBe(true);
    expect(override.isPackSizeDefault).toBe(false);
    expect(override.skuOverrideKey).toBe('prod_adrc_500g_standup_pouch');
    expect(override.name).toContain('Red Chilli');
    expect(override.name).toContain('500 g');
  });

  it('resolves layout with pack size and packaging type isolation without corrupting other scopes', () => {
    // 1. Create global defaults for (500g, standup_pouch) and (500g, jar)
    const base500 = JSON.parse(JSON.stringify(default500gTemplate)) as Template;
    const global500Pouch = buildPackDefaultTemplate(base500, '500 g', 'standup_pouch');
    global500Pouch.customLengthMm = 45;

    const baseJar = JSON.parse(JSON.stringify(default500gTemplate)) as Template;
    const global500Jar = buildPackDefaultTemplate(baseJar, '500 g', 'jar');
    global500Jar.customLengthMm = 30; // Jars have shorter travel length

    const base100 = JSON.parse(JSON.stringify(default100gTemplate)) as Template;
    const global100Pouch = buildPackDefaultTemplate(base100, '100 g', 'standup_pouch');
    global100Pouch.customLengthMm = 28;

    const templates = [global500Pouch, global500Jar, global100Pouch];

    // Check resolution for (500g, standup_pouch)
    const resPouch = resolveLayout('prod_adrc', '500 g', 'standup_pouch', templates);
    expect(resPouch.template.id).toBe('tmpl_pack_default_500g_standup_pouch');
    expect(resPouch.template.customLengthMm).toBe(45);
    expect(resPouch.source).toBe('pack_default');

    // Check resolution for (500g, jar)
    const resJar = resolveLayout('prod_adrc', '500 g', 'jar', templates);
    expect(resJar.template.id).toBe('tmpl_pack_default_500g_jar');
    expect(resJar.template.customLengthMm).toBe(30);

    // Check resolution for (100g, standup_pouch)
    const res100 = resolveLayout('prod_adrc', '100 g', 'standup_pouch', templates);
    expect(res100.template.id).toBe('tmpl_pack_default_100g_standup_pouch');
    expect(res100.template.customLengthMm).toBe(28);

    // Another product (Turmeric Powder) inherits the same global default for (500g, standup_pouch)
    const resTurmeric = resolveLayout('prod_adtp', '500 g', 'standup_pouch', templates);
    expect(resTurmeric.template.id).toBe('tmpl_pack_default_500g_standup_pouch');
    expect(resTurmeric.template.customLengthMm).toBe(45);

    // Now add a specific override for Turmeric (500g, standup_pouch)
    const customTurmeric = buildSkuOverrideTemplate(global500Pouch, 'prod_adtp', 'Turmeric Powder', '500 g', 'standup_pouch');
    customTurmeric.customLengthMm = 48; // Turmeric has custom length

    const templatesWithOverride = [customTurmeric, ...templates];

    // Turmeric now resolves its individual override
    const resTurmericOverridden = resolveLayout('prod_adtp', '500 g', 'standup_pouch', templatesWithOverride);
    expect(resTurmericOverridden.template.id).toBe('tmpl_sku_override_prod_adtp_500g_standup_pouch');
    expect(resTurmericOverridden.source).toBe('sku_override');
    expect(resTurmericOverridden.template.customLengthMm).toBe(48);

    // Red Chilli still gets the Global Default untouched
    const resRedChilliStillGlobal = resolveLayout('prod_adrc', '500 g', 'standup_pouch', templatesWithOverride);
    expect(resRedChilliStillGlobal.template.id).toBe('tmpl_pack_default_500g_standup_pouch');
    expect(resRedChilliStillGlobal.source).toBe('pack_default');
    expect(resRedChilliStillGlobal.template.customLengthMm).toBe(45);

    // When reverting Turmeric, it returns to the Global Default for (500g, standup_pouch)
    const templatesAfterRevert = templatesWithOverride.filter(t => t.id !== customTurmeric.id);
    const resTurmericReverted = resolveLayout('prod_adtp', '500 g', 'standup_pouch', templatesAfterRevert);
    expect(resTurmericReverted.template.id).toBe('tmpl_pack_default_500g_standup_pouch');
    expect(resTurmericReverted.source).toBe('pack_default');
    expect(resTurmericReverted.template.customLengthMm).toBe(45);
  });
});
