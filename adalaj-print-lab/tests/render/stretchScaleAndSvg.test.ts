import { describe, it, expect } from 'vitest';
import { renderTemplateToSvgString, canvasToStandardBmp, canvasTo1BitBmp } from '../../src/services/printTransform';
import type { Template, MachineProfile } from '../../src/types';

describe('Dual-Axis Scale, Condense & SVG Vector Engine', () => {
  const mockMachine: MachineProfile = {
    id: 'mach-1',
    name: 'TIJ 12.7mm Handheld',
    technology: 'TIJ Handheld',
    printBandMm: 12.5,
    maxSpeedMpm: 30,
    supportedOrientations: ['Normal', 'Rotated 90°'],
    dpi: [300],
    defaultDpi: 300,
    exportFormat: 'BMP',
    exportRotation: 0,
    mirrorX: false,
    mirrorY: false,
    feedOrigin: 'Left -> Right',
    edgeBufferMm: 0,
    status: 'Ready',
    maintenanceIntervalDays: 30
  } as any;

  const mockTemplate: Template = {
    id: 'tmpl-test',
    code: 'TP100',
    name: 'Turmeric 100g Test',
    productId: 'p-1',
    packSizeScope: '100g',
    version: 1,
    travel: 'Vertical',
    layout: 'Stack',
    canvasWidthMm: 12.5,
    canvasHeightMm: 35.0,
    densityDpi: 300,
    objects: [
      {
        id: 'txt-mfg',
        type: 'text',
        x: 1,
        y: 2,
        width: 10,
        height: 4,
        rotation: 0,
        fontSizeMm: 2.2,
        fontFamily: 'monospace',
        content: 'MFD: {mfg}',
        alignment: 'left',
        horizontalStretchPercent: 75, // 75% Condensed
        verticalStretchPercent: 150,  // 150% Elongated (Tall)
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false
      },
      {
        id: 'txt-exp',
        type: 'text',
        x: 1,
        y: 8,
        width: 10,
        height: 4,
        rotation: 0,
        fontSizeMm: 2.2,
        fontFamily: 'monospace',
        content: 'EXP: {exp}',
        alignment: 'center',
        horizontalStretchPercent: 50,  // 50% max condensed
        verticalStretchPercent: 400,  // 400% max elongated
        mirrorX: false,
        mirrorY: false,
        invert: true, // Inverted polarity
        locked: false
      },
      {
        id: 'line-div',
        type: 'line',
        x: 0.5,
        y: 13,
        width: 11.5,
        height: 0.5,
        rotation: 0,
        strokeWidthMm: 0.4,
        horizontalStretchPercent: 100,
        verticalStretchPercent: 100,
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false
      },
      {
        id: 'bc-code',
        type: 'barcode',
        x: 1,
        y: 15,
        width: 10.5,
        height: 12,
        rotation: 0,
        content: 'ADTP014',
        barcodeFormat: 'CODE128',
        horizontalStretchPercent: 125,
        verticalStretchPercent: 90,
        mirrorX: false,
        mirrorY: false,
        invert: false,
        locked: false
      }
    ]
  } as any;

  const mockValues: Record<string, string> = {
    mfg: 'NOV 2026',
    exp: 'NOV 2027',
    batch: 'ADTP014',
    mrp: '₹50'
  };

  it('renders a valid XML SVG with proper namespaces and viewBox', () => {
    const svg = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues);
    expect(svg).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="12.5mm"');
    expect(svg).toContain('height="35mm"');
    expect(svg).toContain('viewBox="0 0 12.5 35"');
    expect(svg).toContain('shape-rendering="geometricPrecision"');
    expect(svg).toContain('text-rendering="geometricPrecision"');
  });

  it('correctly incorporates horizontal condense (75%) and vertical elongation (150%) transforms', () => {
    const svg = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues);
    expect(svg).toContain('scale(0.75, 1.5)');
    expect(svg).toContain('scale(0.5, 4)');
    expect(svg).toContain('scale(1.25, 0.9)');
  });

  it('substitutes dynamic variables into text elements', () => {
    const svg = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues);
    expect(svg).toContain('MFD: NOV 2026');
    expect(svg).toContain('EXP: NOV 2027');
  });

  it('renders inverted polarity with solid black rect behind inverted text', () => {
    const svg = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues);
    expect(svg).toContain('<rect x="0" y="0" width="10" height="4" fill="#000000" />');
    expect(svg).toContain('fill="#ffffff"');
  });

  it('embeds real vector barcode paths inside the SVG export', () => {
    const svg = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues);
    expect(svg).toContain('<svg x="0" y="0" width="10.5" height="12"');
    expect(svg).toContain('<path d="');
  });

  it('supports 90-degree and 270-degree rotation in export orientation', () => {
    const svg90 = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues, {
      downloadOrientation: 'rotate90'
    });
    expect(svg90).toContain('width="35mm"');
    expect(svg90).toContain('height="12.5mm"');
    expect(svg90).toContain('rotate(90)');

    const svg180 = renderTemplateToSvgString(mockTemplate, mockMachine, mockValues, {
      downloadOrientation: 'rotate180'
    });
    expect(svg180).toContain('rotate(180)');
  });

  it('generates 24-bit Standard BMP with HD DPI header preserving color depth', async () => {
    const mockCanvas = {
      width: 100,
      height: 100,
      getContext: () => ({
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4).fill(255)
        })
      })
    } as any;

    const blob = canvasToStandardBmp(mockCanvas, 600);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/bmp');
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    // biXPelsPerMeter at offset 38: 600 * 39.3701 ≈ 23622
    expect(view.getInt32(38, true)).toBe(23622);
    expect(view.getUint16(28, true)).toBe(24); // 24-bit color depth
  });

  it('generates 1-bit BMP with HD DPI header', async () => {
    const mockCanvas = {
      width: 100,
      height: 100,
      getContext: () => ({
        getImageData: (_x: number, _y: number, w: number, h: number) => ({
          data: new Uint8ClampedArray(w * h * 4).fill(255)
        })
      })
    } as any;

    const blob = canvasTo1BitBmp(mockCanvas, 1200);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/bmp');
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    // biXPelsPerMeter at offset 38: 1200 * 39.3701 ≈ 47244
    expect(view.getInt32(38, true)).toBe(47244);
    expect(view.getUint16(28, true)).toBe(1); // 1-bit color depth
  });
});
