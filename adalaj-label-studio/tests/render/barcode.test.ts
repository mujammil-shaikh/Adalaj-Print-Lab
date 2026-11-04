import { describe, it, expect } from 'vitest';
import bwipjs from 'bwip-js';

describe('Barcode & QR Code Real Encoding (P0-02, RENDER-07)', () => {
  it('generates valid SVG for CODE128', () => {
    const svg = bwipjs.toSVG({
      bcid: 'code128',
      text: 'ADTP014',
      scale: 2,
      height: 10,
      includetext: true,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
    expect(svg).toContain('path');
  });

  it('generates valid SVG for QR Code', () => {
    const svg = bwipjs.toSVG({
      bcid: 'qrcode',
      text: 'https://adalaj.in/b/ADTP014',
      scale: 2,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
    expect(svg).toContain('path');
  });

  it('generates valid SVG for EAN13 with valid payload', () => {
    const svg = bwipjs.toSVG({
      bcid: 'ean13',
      text: '890123456789',
      scale: 2,
      height: 10,
      includetext: true,
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox');
  });

  it('throws on invalid barcode payload', () => {
    expect(() => {
      bwipjs.toSVG({
        bcid: 'ean13',
        text: 'INVALID_NON_NUMERIC',
      });
    }).toThrow();
  });
});
