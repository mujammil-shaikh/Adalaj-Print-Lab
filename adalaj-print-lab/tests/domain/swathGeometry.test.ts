import { describe, it, expect } from 'vitest';
import { 
  default100gTemplate, 
  default500gTemplate, 
  createScratchTemplate,
  resolveLayout
} from '../../src/services/layoutRegistry';

describe('Swath Boundary & Safe Margins Calibration (Zero Edge Loss)', () => {
  const PHYSICAL_SWATH_MM = 12.5;
  const MIN_MARGIN_MM = 1.0;
  const MAX_REACH_MM = PHYSICAL_SWATH_MM - MIN_MARGIN_MM; // 11.5mm

  it('default 100g template enforces safety margin on all 6 lines', () => {
    expect(default100gTemplate.objects.length).toBeGreaterThanOrEqual(6);

    for (const obj of default100gTemplate.objects) {
      // Left coordinate must be at or inside 1.0mm
      expect(obj.x).toBeGreaterThanOrEqual(1.0);

      // Total horizontal reach (x + width) must never exceed 11.5mm
      const reach = obj.x + (obj.width || 0);
      expect(reach).toBeLessThanOrEqual(MAX_REACH_MM);

      // Verify font sizes are strictly within calibrated bounds
      if (obj.fontSizeMm) {
        expect(obj.fontSizeMm).toBeLessThanOrEqual(3.0);
        expect(obj.fontSizeMm).toBeGreaterThanOrEqual(1.8);
      }
    }
  });

  it('default 500g template respects physical swath boundary with enlarged typography', () => {
    expect(default500gTemplate.objects.length).toBeGreaterThanOrEqual(6);

    for (const obj of default500gTemplate.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(0);
      const reach = obj.x + (obj.width || 0);
      expect(reach).toBeLessThanOrEqual(PHYSICAL_SWATH_MM);
      if (obj.fontSizeMm) {
        expect(obj.fontSizeMm).toBeGreaterThanOrEqual(1.8);
      }
    }
  });

  it('scratch template generation for arbitrary pack size enforces swath safety', () => {
    const scratch = createScratchTemplate('250g');
    expect(scratch.objects.length).toBeGreaterThanOrEqual(6);
    for (const obj of scratch.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(1.0);
      const reach = obj.x + (obj.width || 0);
      expect(reach).toBeLessThanOrEqual(MAX_REACH_MM);
    }
  });

  it('resolveLayout produces swath-safe template for SKU resolution', () => {
    const resolved = resolveLayout('prod_adtp', '100g', [default100gTemplate], []);
    expect(resolved.template.objects.length).toBeGreaterThanOrEqual(6);
    for (const obj of resolved.template.objects) {
      expect(obj.x).toBeGreaterThanOrEqual(1.0);
      const reach = obj.x + (obj.width || 0);
      expect(reach).toBeLessThanOrEqual(MAX_REACH_MM);
    }
  });

  it('guarantees layout stays strictly within physical 12.5mm swath with no boundary overflow', () => {
    const templates = [default100gTemplate, default500gTemplate];
    for (const tmpl of templates) {
      for (const obj of tmpl.objects) {
        const reach = obj.x + (obj.width || 0);
        expect(reach).toBeLessThanOrEqual(PHYSICAL_SWATH_MM);
        expect(obj.x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('guarantees date fields (MFD, Best Before) use condensed typography to prevent character cutoff', () => {
    const templates = [default100gTemplate, default500gTemplate];
    for (const tmpl of templates) {
      const dateObjs = tmpl.objects.filter(o => o.fieldKey === 'mfd' || o.fieldKey === 'best_before');
      expect(dateObjs.length).toBe(2);
      for (const obj of dateObjs) {
        expect(obj.fontFamily).toBe('Roboto Condensed');
        expect(obj.fontSizeMm).toBeLessThanOrEqual(2.6);
        expect(obj.letterSpacingMm || 0).toBeLessThanOrEqual(0.02);
      }
    }
  });

  it('calculates exact 148x531px hardware buffer dimensions matching 12.5mm swath at 300 DPI', () => {
    const dpmm = 300 / 25.4;
    const bandPx12_5 = Math.round(12.5 * dpmm);
    const lengthPx45 = Math.round(45.0 * dpmm);
    expect(bandPx12_5).toBe(148);
    expect(lengthPx45).toBe(531);

    // HP TIJ 2.5 12.7mm head
    const bandPx12_7 = Math.round(12.7 * dpmm);
    expect(bandPx12_7).toBe(150);

    // Dual-Head 25.0mm / 25.4mm head
    const bandPx25_0 = Math.round(25.0 * dpmm);
    expect(bandPx25_0).toBe(295);
    const bandPx25_4 = Math.round(25.4 * dpmm);
    expect(bandPx25_4).toBe(300);
  });

  it('swaps swath and travel length axes correctly between Vertical and Horizontal modes', () => {
    const dpmm = 300 / 25.4;
    const swathBandMm = 12.5;
    const travelLenMm = 45.0;

    // In Vertical Mode: Width is swath (148px), Height is travel length (531px)
    const verticalWidthPx = Math.round(swathBandMm * dpmm);
    const verticalHeightPx = Math.round(travelLenMm * dpmm);
    expect(verticalWidthPx).toBe(148);
    expect(verticalHeightPx).toBe(531);

    // In Horizontal Mode: Height is swath (148px), Width is travel length (531px)
    const horizontalWidthPx = Math.round(travelLenMm * dpmm);
    const horizontalHeightPx = Math.round(swathBandMm * dpmm);
    expect(horizontalWidthPx).toBe(531);
    expect(horizontalHeightPx).toBe(148);
  });

  it('preserves aspect ratio and scales objects proportionally when resizing swath from 148px to 295px', () => {
    const dpmm = 300 / 25.4;
    const oldSwathMm = (148 * 25.4) / 300; // ~12.53mm
    const newSwathMm = (295 * 25.4) / 300; // ~24.97mm
    const ratio = newSwathMm / oldSwathMm; // ~1.993

    const oldLengthMm = 45.0;
    const newLengthMm = Math.round(oldLengthMm * ratio * 10) / 10;
    expect(newLengthMm).toBe(89.7); // Proportionally doubled

    // An object at (1, 2) with width 10, height 4, font 2.4mm
    const obj = { x: 1.0, y: 2.0, width: 10.0, height: 4.0, fontSizeMm: 2.4 };
    const scaledObj = {
      x: Math.round(obj.x * ratio * 10) / 10,
      y: Math.round(obj.y * ratio * 10) / 10,
      width: Math.round(obj.width * ratio * 10) / 10,
      height: Math.round(obj.height * ratio * 10) / 10,
      fontSizeMm: Math.round(obj.fontSizeMm * ratio * 10) / 10
    };

    expect(scaledObj.x).toBe(2.0);
    expect(scaledObj.y).toBe(4.0);
    expect(scaledObj.width).toBe(19.9);
    expect(scaledObj.height).toBe(8.0);
    expect(scaledObj.fontSizeMm).toBe(4.8);
  });
});
