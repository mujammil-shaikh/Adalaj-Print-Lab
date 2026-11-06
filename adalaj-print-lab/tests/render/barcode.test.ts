import { describe, it, expect } from 'vitest';
import bwipjs from 'bwip-js';
import { renderBarcodeSvgString } from '../../src/services/printTransform';

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

  it('safely handles QR code and EAN-13 through renderBarcodeSvgString without throwing', () => {
    const qrSvg = renderBarcodeSvgString('qr', 'https://adalaj.in/b/ADRC001');
    expect(qrSvg).toContain('<svg');
    expect(qrSvg).toContain('viewBox');
    expect(qrSvg).toContain('path');

    const eanSvg = renderBarcodeSvgString('barcode', 'ADRC001', 'EAN13');
    expect(eanSvg).toContain('<svg');
    expect(eanSvg).toContain('viewBox');

    const code128Svg = renderBarcodeSvgString('barcode', 'ADRC001', 'CODE128');
    expect(code128Svg).toContain('<svg');
    expect(code128Svg).toContain('viewBox');
  });
});
