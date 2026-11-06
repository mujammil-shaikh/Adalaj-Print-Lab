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
});
