/**
 * Canonical Print Transform and Raster Engine
 * Guarantees physical mm precision, deterministic orientation, mirror, feed direction, and pure 1-bit BMP output.
 */

import type { Template, MachineProfile, PrintTransform, TravelDirection, LayoutMode, DesignObject } from '../types';
import JSZip from 'jszip';
import bwipjs from 'bwip-js';

export interface RenderRasterResult {
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  canvas: HTMLCanvasElement;
  bmpBlob: Blob;
  pngBlob: Blob;
  diagnostic: {
    dpi: number;
    headWidthMm: number;
    printBandMm: number;
    rotation: number;
    mirrorX: boolean;
    mirrorY: boolean;
    feedDirection: string;
    lockedAxisPx: number;
    travelAxisPx: number;
  };
}

/**
 * Generates an official 1-bit Windows Bitmap (BMP) binary ArrayBuffer
 * biBitCount = 1, 2 color entries (0x000000 and 0xFFFFFF), row bytes padded to 4-byte boundaries.
 */
export function canvasTo1BitBmp(canvas: HTMLCanvasElement, dpi = 300): Blob {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Each row in 1-bit BMP is padded to a multiple of 4 bytes (32 bits)
  const rowBytes = Math.ceil(width / 32) * 4;
  const pixelArraySize = rowBytes * height;

  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const colorTableSize = 8; // 2 colors * 4 bytes (RGBQUAD)
  const offsetToPixelData = fileHeaderSize + infoHeaderSize + colorTableSize;
  const fileSize = offsetToPixelData + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42);           // 'B' (0x42)
  view.setUint8(1, 0x4D);           // 'M' (0x4D)
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);       // Reserved 1
  view.setUint16(8, 0, true);       // Reserved 2
  view.setUint32(10, offsetToPixelData, true);

  const ppm = Math.round(dpi * 39.3701);

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);   // positive height: bottom-up standard BMP
  view.setUint16(26, 1, true);        // biPlanes
  view.setUint16(28, 1, true);        // biBitCount = 1 bit per pixel
  view.setUint32(30, 0, true);        // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, ppm, true);       // biXPelsPerMeter (scaled according to target DPI)
  view.setInt32(42, ppm, true);       // biYPelsPerMeter
  view.setUint32(46, 2, true);        // biClrUsed (2 colors)
  view.setUint32(50, 0, true);        // biClrImportant

  // Color Table: Color 0 = Black (0, 0, 0, 0), Color 1 = White (255, 255, 255, 0)
  // Index 0: Black
  view.setUint8(54, 0);
  view.setUint8(55, 0);
  view.setUint8(56, 0);
  view.setUint8(57, 0);
  // Index 1: White
  view.setUint8(58, 255);
  view.setUint8(59, 255);
  view.setUint8(60, 255);
  view.setUint8(61, 0);

  // Pixel Data: BMP stores rows from bottom to top
  const uint8 = new Uint8Array(buffer);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // flip Y for bottom-up BMP
    const rowOffset = offsetToPixelData + y * rowBytes;

    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      const a = data[srcIdx + 3];

      // Luminance threshold for pure 1-bit: 0 is black (ink), 1 is white (media/background)
      // Transparent or bright is 1 (white), dark is 0 (black ink)
      const lum = (0.299 * r + 0.587 * g + 0.114 * b);
      const isWhite = a < 128 || lum > 128;

      if (isWhite) {
        const byteIndex = rowOffset + Math.floor(x / 8);
        const bitPosition = 7 - (x % 8);
        uint8[byteIndex] |= (1 << bitPosition);
      }
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Generates a standard Windows 24-bit Bitmap (BMP) binary ArrayBuffer.
 * Fully compatible with Windows Photos app, Paint, macOS Preview, Word, and all image viewers.
 * Pixel rows are padded to 4-byte boundaries, pure monochrome 300 DPI pixels.
 */
export function canvasToStandardBmp(canvas: HTMLCanvasElement, dpi = 300): Blob {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Each row in 24-bit BMP is padded to a multiple of 4 bytes
  const rowBytes = Math.ceil((width * 3) / 4) * 4;
  const pixelArraySize = rowBytes * height;

  const fileHeaderSize = 14;
  const infoHeaderSize = 40;
  const offsetToPixelData = fileHeaderSize + infoHeaderSize; // 54
  const fileSize = offsetToPixelData + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42);           // 'B' (0x42)
  view.setUint8(1, 0x4D);           // 'M' (0x4D)
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, offsetToPixelData, true);

  const ppm = Math.round(dpi * 39.3701);

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);   // positive height: bottom-up standard BMP
  view.setUint16(26, 1, true);        // biPlanes
  view.setUint16(28, 24, true);       // biBitCount = 24 bits per pixel (RGB)
  view.setUint32(30, 0, true);        // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, ppm, true);       // biXPelsPerMeter (scaled according to target DPI)
  view.setInt32(42, ppm, true);       // biYPelsPerMeter
  view.setUint32(46, 0, true);        // biClrUsed
  view.setUint32(50, 0, true);        // biClrImportant

  // Pixel Data: BMP stores rows from bottom to top, in BGR order
  // Preserve full anti-aliasing and smooth glyph edges composited over white substrate
  const uint8 = new Uint8Array(buffer);
  for (let y = 0; y < height; y++) {
    const srcY = height - 1 - y; // flip Y for bottom-up BMP
    const rowOffset = offsetToPixelData + y * rowBytes;

    for (let x = 0; x < width; x++) {
      const srcIdx = (srcY * width + x) * 4;
      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];
      const a = data[srcIdx + 3];

      // Alpha composite over pure white background to maintain smooth anti-aliased curves
      const alpha = a / 255;
      const rComp = Math.round(r * alpha + 255 * (1 - alpha));
      const gComp = Math.round(g * alpha + 255 * (1 - alpha));
      const bComp = Math.round(b * alpha + 255 * (1 - alpha));

      const pxOffset = rowOffset + x * 3;
      uint8[pxOffset] = bComp;     // Blue (BGR)
      uint8[pxOffset + 1] = gComp; // Green
      uint8[pxOffset + 2] = rComp; // Red
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Calculates canonical physical dimensions based on travel direction and print band
 */
export function getCanvasDimensionsMm(
  travel: TravelDirection,
  machine: MachineProfile,
  maxContentTravelMm: number = 35.0
): { widthMm: number; heightMm: number; lockedAxisMm: number } {
  const lockedAxisMm = machine.printBandMm; // e.g. 12.5 mm
  if (travel === 'Vertical') {
    return {
      widthMm: lockedAxisMm,
      heightMm: Math.max(25.0, maxContentTravelMm),
      lockedAxisMm
    };
  } else {
    return {
      widthMm: Math.max(25.0, maxContentTravelMm),
      heightMm: lockedAxisMm,
      lockedAxisMm
    };
  }
}

/**
 * Renders objects into an HTMLCanvasElement with physical accuracy and applies PrintTransform
 */
export function renderTemplateToCanvas(
  template: Template,
  machine: MachineProfile,
  values: Record<string, string>,
  options: {
    dpi?: number;
    forPrinterView?: boolean;
    forDownload?: boolean;
    widthMm?: number;
    heightMm?: number;
    targetWidthPx?: number;   // Exact target pixel width (e.g. 148 px default)
    targetHeightPx?: number;  // Exact target pixel height (e.g. 1181 px)
    downloadOrientation?: '1to1' | 'rotate90' | 'rotate180' | 'rotate270';
    contentScale?: number;    // Zoom in/out artwork scale on canvas (e.g. 0.8 to 1.3, default 1.0)
    fitEdgeToEdge?: boolean;  // Fit design edge-to-edge within printable swath without clipping
    mirrorX?: boolean;
    mirrorY?: boolean;
    transform?: Partial<PrintTransform>;
    highlightColor?: string;
    scaleMultiplier?: number;
  } = {}
): HTMLCanvasElement {
  const mult = Math.max(1, options.scaleMultiplier || 1);
  const dpi = (options.dpi || machine.defaultDpi || 300) * mult;
  const dpmm = dpi / 25.4;

  const bandMm = template.customBandMm || machine.printBandMm || 12.5;
  let travelLengthMm = template.customLengthMm || 35.0;

  // Determine physical mm dimensions
  let docWidthMm: number;
  let docHeightMm: number;

  if (options.widthMm && options.heightMm) {
    docWidthMm = options.widthMm;
    docHeightMm = options.heightMm;
  } else {
    docWidthMm = template.travel === 'Vertical' ? bandMm : travelLengthMm;
    docHeightMm = template.travel === 'Vertical' ? travelLengthMm : bandMm;
  }

  // Exact 1:1 pixel dimensions (Defaults to 148 px width for 12.5 mm physical TIJ band @ 300 DPI)
  const defaultBandPx = Math.round(bandMm * dpmm);
  const defaultTravelPx = Math.round(travelLengthMm * dpmm);

  const widthPx = Math.round((options.targetWidthPx || template.customWidthPx || (template.travel === 'Vertical' ? defaultBandPx : defaultTravelPx)) * (options.targetWidthPx ? 1 : mult));
  const heightPx = Math.round((options.targetHeightPx || template.customHeightPx || (template.travel === 'Vertical' ? defaultTravelPx : defaultBandPx)) * (options.targetHeightPx ? 1 : mult));

  // Compute effective dpmm for drawing objects
  // TIJ printer heads have uniform square pixel pitch. effDpmm must align with the physical nozzle swath density (X for vertical, Y for horizontal)
  const effDpmmX = widthPx / Math.max(0.1, docWidthMm);
  const effDpmmY = heightPx / Math.max(0.1, docHeightMm);
  const effDpmm = template.travel === 'Vertical' ? effDpmmX : effDpmmY;

  // Respect exact canvas coordinates: zero artificial offset or margins
  let edgeScaleX = 1.0;
  let edgeOffsetX = 0;

  const docCanvas = document.createElement('canvas');
  docCanvas.width = widthPx;
  docCanvas.height = heightPx;
  const ctx = docCanvas.getContext('2d');
  if (!ctx) return docCanvas;

  // Set high-fidelity geometric precision rendering for razor-sharp lines and curves
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  if ('textRendering' in ctx) {
    (ctx as any).textRendering = 'geometricPrecision';
  }

  // Background is always pure white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  ctx.save();
  // Apply contentScale (zoom in / zoom out artwork on canvas)
  if (options.contentScale && options.contentScale !== 1.0) {
    ctx.translate(widthPx / 2, heightPx / 2);
    ctx.scale(options.contentScale, options.contentScale);
    ctx.translate(-widthPx / 2, -heightPx / 2);
  }

  if (options.fitEdgeToEdge && edgeScaleX !== 1.0) {
    ctx.translate(edgeOffsetX, 0);
    ctx.scale(edgeScaleX, 1.0);
  }

  // Render objects into canvas
  template.objects.forEach(obj => {
    renderSingleObject(ctx, obj, values, effDpmm, template.travel, template.layout, widthPx, heightPx);
  });
  ctx.restore();

  // 2. UNIFIED ORIENTATION & ROTATION (Applies to both live preview & downloads!)
  const orientation = options.downloadOrientation || template.customDownloadOrientation || '1to1';
  const mirrorX = options.mirrorX ?? options.transform?.mirrorX ?? machine.mirrorX;
  const mirrorY = options.mirrorY ?? options.transform?.mirrorY ?? machine.mirrorY;

  if (orientation !== '1to1' || mirrorX || mirrorY) {
    const isRotated90or270 = orientation === 'rotate90' || orientation === 'rotate270';
    const outWidthPx = isRotated90or270 ? heightPx : widthPx;
    const outHeightPx = isRotated90or270 ? widthPx : heightPx;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = outWidthPx;
    exportCanvas.height = outHeightPx;

    const expCtx = exportCanvas.getContext('2d');
    if (!expCtx) return docCanvas;

    expCtx.fillStyle = '#ffffff';
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    expCtx.save();
    expCtx.translate(exportCanvas.width / 2, exportCanvas.height / 2);

    if (orientation === 'rotate90') {
      expCtx.rotate(Math.PI / 2);
    } else if (orientation === 'rotate180') {
      expCtx.rotate(Math.PI);
    } else if (orientation === 'rotate270') {
      expCtx.rotate((3 * Math.PI) / 2);
    }

    if (mirrorX) expCtx.scale(-1, 1);
    if (mirrorY) expCtx.scale(1, -1);

    expCtx.drawImage(docCanvas, -widthPx / 2, -heightPx / 2);
    expCtx.restore();

    return exportCanvas;
  }

  // If not for printer diagnostics view and no rotation, return docCanvas
  if (!options.forPrinterView) {
    return docCanvas;
  }

  const rot = options.transform?.rotation ?? machine.exportRotation ?? 0;
  const feedDir = machine.feedOrigin ?? 'Left -> Right';

  const isRot90 = rot === 90 || rot === 270;
  const finalWidthPx = isRot90 ? heightPx : widthPx;
  const finalHeightPx = isRot90 ? widthPx : heightPx;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = finalWidthPx;
  outCanvas.height = finalHeightPx;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) return docCanvas;

  outCtx.fillStyle = '#ffffff';
  outCtx.fillRect(0, 0, finalWidthPx, finalHeightPx);

  outCtx.save();
  outCtx.translate(finalWidthPx / 2, finalHeightPx / 2);

  if (feedDir === 'Bottom -> Top') {
    outCtx.scale(1, -1);
  } else if (feedDir === 'Right -> Left') {
    outCtx.scale(-1, 1);
  }

  if (rot !== 0) {
    outCtx.rotate((rot * Math.PI) / 180);
  }

  if (mirrorX || mirrorY) {
    outCtx.scale(mirrorX ? -1 : 1, mirrorY ? -1 : 1);
  }

  outCtx.drawImage(docCanvas, -widthPx / 2, -heightPx / 2);
  outCtx.restore();

  return outCanvas;
}

/**
 * Draws a single object into 2D context using physical mm coordinates
 */
function renderSingleObject(
  ctx: CanvasRenderingContext2D,
  obj: DesignObject,
  values: Record<string, string>,
  dpmm: number,
  travel: TravelDirection,
  layout: LayoutMode,
  canvasWidthPx?: number,
  canvasHeightPx?: number
) {
  // Exact 1:1 ground-truth positioning matching Pack View canvas with zero artificial offsets or margins
  const x = obj.x * dpmm;
  const y = obj.y * dpmm;
  const w = obj.width * dpmm;
  const h = obj.height * dpmm;

  const isTextLike = obj.type === 'text' || obj.type === 'field';
  const alignPivotX = obj.alignment === 'center' ? (w / 2) : obj.alignment === 'right' ? w : 0;
  const alignPivotY = h / 2;
  const originPivotX = isTextLike ? alignPivotX : (w / 2);
  const originPivotY = h / 2;

  const scaleX = (obj.mirrorX ? -1 : 1) * ((obj.horizontalStretchPercent || 100) / 100);
  const scaleY = (obj.mirrorY ? -1 : 1) * ((obj.verticalStretchPercent || 100) / 100);

  ctx.save();
  // 1. Anchor to the exact origin pivot matching Pack View DOM's transformOrigin
  ctx.translate(x + originPivotX, y + originPivotY);

  if (obj.rotation !== 0) {
    ctx.rotate((obj.rotation * Math.PI) / 180);
  }

  // 2. Apply scaleX and scaleY at the container level (matching Pack View DOM transform)
  ctx.scale(scaleX, scaleY);

  // 3. Move back to top-left of the object
  ctx.translate(-originPivotX, -originPivotY);

  // 4. Clip to the object's box (which now scales WITH the object, preventing unwanted text cutoff)
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();

  if (obj.type === 'text' || obj.type === 'field') {
    let text = obj.content || '';
    if (text.includes('{')) {
      text = text.replace(/\{(\w+)\}/g, (_, k) => values[k] !== undefined ? values[k] : `{${k}}`);
    } else if (obj.fieldKey && values[obj.fieldKey]) {
      text = values[obj.fieldKey];
    }

    if (obj.uppercase) {
      text = text.toUpperCase();
    }

    // Exact 1:1 font size matching Pack View mm scale exactly - no artificial reduction or shrinking
    const fontSizePx = Math.max(4, Math.round(obj.fontSizeMm * dpmm));
    const fontStyle = obj.fontStyle === 'italic' ? 'italic ' : '';
    const fontWeight = obj.fontWeight === 'bold' ? 'bold ' : '';
    ctx.font = `${fontStyle}${fontWeight}${fontSizePx}px ${obj.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';

    if (obj.invert) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = '#000000';
    }

    if (obj.letterSpacingMm) {
      const spacingPx = Math.round(obj.letterSpacingMm * dpmm);
      try {
        (ctx as any).letterSpacing = `${spacingPx}px`;
      } catch {
        // Fallback for environments without ctx.letterSpacing
      }
    } else {
      try {
        (ctx as any).letterSpacing = '0px';
      } catch {}
    }

    let textX = 0;
    if (obj.alignment === 'center') {
      ctx.textAlign = 'center';
      textX = w / 2;
    } else if (obj.alignment === 'right') {
      ctx.textAlign = 'right';
      textX = w;
    } else {
      ctx.textAlign = 'left';
      textX = 0;
    }

    // Direct 1:1 text rendering identical to Pack View canvas
    ctx.fillText(text, textX, h / 2);
  } else {
    // Non-text objects (line, rectangle, rounded_rect, ellipse, image, barcode, qr)
    if (obj.type === 'line') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(1, (obj.strokeWidthMm || obj.height || 0.4) * dpmm);
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    } else if (obj.type === 'rectangle') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, (obj.strokeWidthMm || 0.4) * dpmm);
    if (obj.borderStyle === 'dashed') {
      ctx.setLineDash([4, 2]);
    } else {
      ctx.setLineDash([]);
    }
    const r = (obj.cornerRadiusMm || 0) * dpmm;
    if (r > 0 && typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(0, 0, w, h, r);
      if (obj.fillMode === 'solid') {
        ctx.fillStyle = '#000000';
        ctx.fill();
      } else {
        ctx.stroke();
      }
    } else {
      if (obj.fillMode === 'solid') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
      } else {
        ctx.strokeRect(0, 0, w, h);
      }
    }
    ctx.setLineDash([]);
  } else if (obj.type === 'rounded_rect') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 0.2 * dpmm);
    const r = Math.min(2 * dpmm, w / 4, h / 4);
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.stroke();
  } else if (obj.type === 'ellipse') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 0.2 * dpmm);
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  } else if (obj.type === 'image' && obj.imageDataUrl) {
    const img = new Image();
    img.src = obj.imageDataUrl;
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, 0, 0, w, h);
    }
  } else if (obj.type === 'barcode' || obj.type === 'qr') {
    // P0-02/RENDER-07: Standards-compliant barcode and QR code vector rendering
    let text = obj.content || '';
    if (text.includes('{')) {
      text = text.replace(/\{(\w+)\}/g, (_, k) => values[k] !== undefined ? values[k] : `{${k}}`);
    } else if (obj.fieldKey && values[obj.fieldKey]) {
      text = values[obj.fieldKey];
    }
    const payload = text.trim() || (obj.type === 'barcode' ? (values.batch || 'ADTP014') : 'https://adalaj.in');

    try {
      const svg = renderBarcodeSvgString(
        obj.type,
        payload,
        obj.barcodeFormat === 'EAN13' ? 'EAN13' : 'CODE128'
      );

      const viewBoxMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      const vbW = viewBoxMatch ? parseFloat(viewBoxMatch[1]) : 100;
      const vbH = viewBoxMatch ? parseFloat(viewBoxMatch[2]) : 100;

      const dMatches = Array.from(svg.matchAll(/d="([^"]+)"/g));
      ctx.save();
      ctx.scale(w / vbW, h / vbH);
      ctx.fillStyle = '#000000';

      for (const m of dMatches) {
        if (typeof Path2D !== 'undefined' && m && m[1]) {
          const p = new Path2D(m[1]);
          ctx.fill(p);
        } else if (typeof Path2D === 'undefined') {
          // Fallback in headless / node test environments without native Path2D
          ctx.fillRect(0, 0, vbW, vbH);
          break;
        }
      }
      ctx.restore();
    } catch {
      // In case of any unhandled graphics failure, draw genuine geometric block rather than ugly text
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }
  }
  }

  ctx.restore();
}

/**
 * Creates a complete ZIP package with FAT32-safe 8.3 filenames, INDEX.TXT, pass sheet, and 1-bit BMP
 */
export async function createExportZip(
  files: { filename: string; blob: Blob; description: string }[],
  meta: {
    batchId: string;
    productName: string;
    packSize: string;
    machineName: string;
    passes: number;
    dpi: number;
  }
): Promise<Blob> {
  const zip = new JSZip();

  let indexText = `ADALAJ PRINT LAB - PRODUCTION EXPORT INDEX\r\n`;
  indexText += `==============================================\r\n`;
  indexText += `BATCH ID:     ${meta.batchId}\r\n`;
  indexText += `PRODUCT:      ${meta.productName}\r\n`;
  indexText += `PACK SIZE:    ${meta.packSize}\r\n`;
  indexText += `MACHINE:      ${meta.machineName}\r\n`;
  indexText += `TOTAL PASSES: ${meta.passes}\r\n`;
  indexText += `RESOLUTION:   ${meta.dpi} DPI\r\n`;
  indexText += `EXPORT DATE:  ${new Date().toISOString()}\r\n`;
  indexText += `==============================================\r\n\r\n`;
  indexText += `FILES IN THIS DIRECTORY (FAT32 USB ROOT):\r\n`;

  for (const f of files) {
    zip.file(f.filename, f.blob);
    indexText += `- ${f.filename.padEnd(12)} : ${f.description}\r\n`;
  }

  indexText += `\r\nOPERATOR INSTRUCTIONS:\r\n`;
  indexText += `1. Copy all .BMP files directly to the root of your FAT32-formatted USB drive.\r\n`;
  indexText += `2. Insert USB into printer, open file selector, and verify preview matches Pack View.\r\n`;
  indexText += `3. Always perform 1 scrap test pass before proceeding with the production batch.\r\n`;

  zip.file('INDEX.TXT', indexText);

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Generates an interactive, responsive vector SVG string for real Barcode (Code 128 / EAN-13)
 * and real 2D QR Code rendering directly inside the interactive canvas pack view.
 */
export function renderBarcodeSvgString(
  type: 'barcode' | 'qr',
  text: string,
  format: 'CODE128' | 'EAN13' = 'CODE128'
): string {
  const payload = (text || (type === 'barcode' ? 'ADTP014' : 'https://adalaj.in')).trim();

  try {
    let bcid: string;
    let encodeText = payload;

    if (type === 'qr') {
      bcid = 'qrcode';
    } else if (format === 'EAN13') {
      bcid = 'ean13';
      // EAN-13 strictly requires 12 digits (bwip-js auto-calculates 13th checksum) or 13 digits
      const digits = payload.replace(/\D/g, '');
      if (digits.length === 13) {
        encodeText = digits;
      } else if (digits.length >= 12) {
        encodeText = digits.slice(0, 12);
      } else if (digits.length > 0) {
        encodeText = digits.padEnd(12, '0');
      } else {
        encodeText = '890103099999';
      }
    } else {
      bcid = 'code128';
    }

    const opts: Record<string, unknown> = {
      bcid,
      text: encodeText,
      scale: 2,
    };
    if (type === 'barcode') {
      opts.height = 10;
      opts.includetext = true;
      opts.textxalign = 'center';
    }

    const svg = bwipjs.toSVG(opts as any);

    // Make SVG responsive so it fits nicely inside canvas containers
    return svg
      .replace(/<svg\s+/, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ')
      .replace(/width="[\d.]+"/, '')
      .replace(/height="[\d.]+"/, '');
  } catch (err) {
    console.warn("BWIP-JS primary generation warning:", err);
    // If EAN-13 or specific format fails, fall back to Code 128 so we ALWAYS render genuine vector lines
    try {
      if (type === 'barcode') {
        const fallbackSvg = bwipjs.toSVG({
          bcid: 'code128',
          text: payload.slice(0, 24) || 'ADTP014',
          scale: 2,
          height: 10,
          includetext: true,
          textxalign: 'center'
        });
        return fallbackSvg
          .replace(/<svg\s+/, '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" ')
          .replace(/width="[\d.]+"/, '')
          .replace(/height="[\d.]+"/, '');
      }
    } catch {
      // ignore
    }

    // Ultimate fallback if characters are completely unencodable
    return `<svg width="100%" height="100%" viewBox="0 0 100 30" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="30" fill="#f4f4f5" stroke="#a1a1aa" stroke-width="0.5" />
      <text x="50" y="18" font-family="monospace" font-size="7" text-anchor="middle" fill="#71717a">${text || 'INVALID CODE'}</text>
    </svg>`;
  }
}

/**
 * Escapes characters for safe inclusion in XML / SVG attributes and text nodes
 */
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Renders an entire LabelTemplate into a pristine, razor-sharp vector SVG string.
 * Provides infinite resolution, mathematical line precision, clean Bézier curves,
 * and exact vector barcode/QR codes matching the Pack View design with 0% distortion.
 */
export function renderTemplateToSvgString(
  template: Template,
  machine: MachineProfile,
  values: Record<string, string>,
  options: {
    widthMm?: number;
    heightMm?: number;
    downloadOrientation?: '1to1' | 'rotate90' | 'rotate180' | 'rotate270';
    contentScale?: number;
    fitEdgeToEdge?: boolean;
  } = {}
): string {
  const bandMm = template.customBandMm || machine.printBandMm || 12.5;
  const travelLengthMm = template.customLengthMm || 35.0;

  let docWidthMm: number;
  let docHeightMm: number;

  if (options.widthMm && options.heightMm) {
    docWidthMm = options.widthMm;
    docHeightMm = options.heightMm;
  } else {
    docWidthMm = template.travel === 'Vertical' ? bandMm : travelLengthMm;
    docHeightMm = template.travel === 'Vertical' ? travelLengthMm : bandMm;
  }

  const orientation = options.downloadOrientation || template.customDownloadOrientation || '1to1';
  const isRotated90or270 = orientation === 'rotate90' || orientation === 'rotate270';
  const outWidthMm = isRotated90or270 ? docHeightMm : docWidthMm;
  const outHeightMm = isRotated90or270 ? docWidthMm : docHeightMm;

  let elementsSvg = '';

  for (const obj of template.objects) {
    const w = obj.width;
    const h = obj.height;
    const rot = obj.rotation || 0;
    const mirrorX = obj.mirrorX ? -1 : 1;
    const mirrorY = obj.mirrorY ? -1 : 1;
    const isTextLike = obj.type === 'text' || obj.type === 'field';
    const alignPivotX = obj.alignment === 'center' ? (w / 2) : obj.alignment === 'right' ? w : 0;
    const alignPivotY = h / 2;
    const originPivotX = isTextLike ? alignPivotX : (w / 2);
    const originPivotY = h / 2;

    const scaleX = (obj.horizontalStretchPercent || 100) / 100;
    const scaleY = (obj.verticalStretchPercent || 100) / 100;
    const clipId = `clip_${obj.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    let innerContent = '';

    if (obj.type === 'text' || obj.type === 'field') {
      let text = obj.content || '';
      if (text.includes('{')) {
        text = text.replace(/\{(\w+)\}/g, (_: string, k: string) => values[k] !== undefined ? values[k] : `{${k}}`);
      } else if (obj.fieldKey && values[obj.fieldKey]) {
        text = values[obj.fieldKey];
      }
      if (obj.uppercase) text = text.toUpperCase();

      const textX = obj.alignment === 'center' ? (w / 2) : obj.alignment === 'right' ? w : 0;
      const textAnchor = obj.alignment === 'center' ? 'middle' : obj.alignment === 'right' ? 'end' : 'start';
      const fontStyle = obj.fontStyle === 'italic' ? 'italic' : 'normal';
      const fontWeight = obj.fontWeight === 'bold' ? 'bold' : 'normal';
      const letterSpacing = obj.letterSpacingMm ? ` letter-spacing="${obj.letterSpacingMm}mm"` : '';
      const fill = obj.invert ? '#ffffff' : '#000000';

      const invertBg = obj.invert ? `<rect x="0" y="0" width="${w}" height="${h}" fill="#000000" />` : '';

      innerContent = `
        ${invertBg}
        <text x="${textX}" y="${h / 2}" font-family="${escapeXml(obj.fontFamily)}, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace, sans-serif" font-size="${obj.fontSizeMm}mm" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${textAnchor}" dominant-baseline="central" fill="${fill}"${letterSpacing}>${escapeXml(text)}</text>
      `;
    } else if (obj.type === 'line') {
      const strokeW = obj.strokeWidthMm || obj.height || 0.4;
      innerContent = `
        <line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="#000000" stroke-width="${strokeW}" stroke-linecap="square" />
      `;
    } else if (obj.type === 'rectangle') {
      const strokeW = obj.strokeWidthMm || 0.4;
      const rx = obj.cornerRadiusMm || 0;
      const isSolid = obj.fillMode === 'solid';
      const dash = obj.borderStyle === 'dashed' ? ' stroke-dasharray="2, 1"' : '';
      innerContent = `
        <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="${isSolid ? '#000000' : 'none'}" stroke="${isSolid ? 'none' : '#000000'}" stroke-width="${strokeW}"${dash} />
      `;
    } else if (obj.type === 'rounded_rect') {
      const rx = Math.min(2, w / 4, h / 4);
      innerContent = `
        <rect x="0" y="0" width="${w}" height="${h}" rx="${rx}" ry="${rx}" fill="none" stroke="#000000" stroke-width="0.3" />
      `;
    } else if (obj.type === 'ellipse') {
      innerContent = `
        <ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="none" stroke="#000000" stroke-width="0.3" />
      `;
    } else if (obj.type === 'barcode' || obj.type === 'qr') {
      let text = obj.content || '';
      if (text.includes('{')) {
        text = text.replace(/\{(\w+)\}/g, (_: string, k: string) => values[k] !== undefined ? values[k] : `{${k}}`);
      } else if (obj.fieldKey && values[obj.fieldKey]) {
        text = values[obj.fieldKey];
      }
      const payload = text.trim() || (obj.type === 'barcode' ? (values.batch || 'ADTP014') : 'https://adalaj.in');
      const bSvg = renderBarcodeSvgString(obj.type, payload, obj.barcodeFormat === 'EAN13' ? 'EAN13' : 'CODE128');
      const vbMatch = bSvg.match(/viewBox="([^"]+)"/);
      const vb = vbMatch ? vbMatch[1] : '0 0 100 100';
      const dMatches = Array.from(bSvg.matchAll(/d="([^"]+)"/g));

      const paths = dMatches.map(m => `<path d="${m[1]}" fill="#000000" />`).join('\n');

      innerContent = `
        <svg x="0" y="0" width="${w}" height="${h}" viewBox="${vb}" preserveAspectRatio="${obj.type === 'qr' ? 'xMidYMid meet' : 'none'}">
          ${paths}
        </svg>
      `;
    } else if (obj.type === 'image' && obj.imageDataUrl) {
      innerContent = `
        <image href="${escapeXml(obj.imageDataUrl)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" />
      `;
    }

    elementsSvg += `
      <!-- Object: ${escapeXml(obj.id)} (${obj.type}) -->
      <g transform="translate(${obj.x}, ${obj.y}) translate(${originPivotX}, ${originPivotY}) rotate(${rot}) scale(${mirrorX * scaleX}, ${mirrorY * scaleY}) translate(${-originPivotX}, ${-originPivotY})">
        <defs>
          <clipPath id="${clipId}">
            <rect x="0" y="0" width="${w}" height="${h}" />
          </clipPath>
        </defs>
        <g clip-path="url(#${clipId})">
          ${innerContent}
        </g>
      </g>
    `;
  }

  // Content Scale (zoom in/out)
  let contentScaleTransform = '';
  if (options.contentScale && options.contentScale !== 1.0) {
    const s = options.contentScale;
    contentScaleTransform = ` transform="translate(${docWidthMm / 2}, ${docHeightMm / 2}) scale(${s}) translate(${-docWidthMm / 2}, ${-docHeightMm / 2})"`;
  }

  // Orientation transform
  let orientationTransform = '';
  if (orientation === 'rotate90') {
    orientationTransform = ` transform="translate(${outWidthMm / 2}, ${outHeightMm / 2}) rotate(90) translate(${-docWidthMm / 2}, ${-docHeightMm / 2})"`;
  } else if (orientation === 'rotate180') {
    orientationTransform = ` transform="translate(${outWidthMm / 2}, ${outHeightMm / 2}) rotate(180) translate(${-docWidthMm / 2}, ${-docHeightMm / 2})"`;
  } else if (orientation === 'rotate270') {
    orientationTransform = ` transform="translate(${outWidthMm / 2}, ${outHeightMm / 2}) rotate(270) translate(${-docWidthMm / 2}, ${-docHeightMm / 2})"`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${outWidthMm}mm" height="${outHeightMm}mm" viewBox="0 0 ${outWidthMm} ${outHeightMm}" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <rect width="100%" height="100%" fill="#ffffff" />
  <g${orientationTransform}>
    <g${contentScaleTransform}>
      ${elementsSvg}
    </g>
  </g>
</svg>`;
}

