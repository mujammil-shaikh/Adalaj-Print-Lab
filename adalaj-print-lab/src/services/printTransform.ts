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
export function canvasTo1BitBmp(canvas: HTMLCanvasElement): Blob {
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

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);   // positive height: bottom-up standard BMP
  view.setUint16(26, 1, true);        // biPlanes
  view.setUint16(28, 1, true);        // biBitCount = 1 bit per pixel
  view.setUint32(30, 0, true);        // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 11811, true);     // biXPelsPerMeter (300 DPI ≈ 11811 ppm)
  view.setInt32(42, 11811, true);     // biYPelsPerMeter
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
export function canvasToStandardBmp(canvas: HTMLCanvasElement): Blob {
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

  // BITMAPINFOHEADER
  view.setUint32(14, infoHeaderSize, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);   // positive height: bottom-up standard BMP
  view.setUint16(26, 1, true);        // biPlanes
  view.setUint16(28, 24, true);       // biBitCount = 24 bits per pixel (RGB)
  view.setUint32(30, 0, true);        // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 11811, true);     // biXPelsPerMeter (300 DPI ≈ 11811 ppm)
  view.setInt32(42, 11811, true);     // biYPelsPerMeter
  view.setUint32(46, 0, true);        // biClrUsed
  view.setUint32(50, 0, true);        // biClrImportant

  // Pixel Data: BMP stores rows from bottom to top, in BGR order
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

      // Pure monochrome thresholding:
      // ink (black = 0,0,0) vs substrate (white = 255,255,255)
      const lum = (0.299 * r + 0.587 * g + 0.114 * b);
      const isWhite = a < 128 || lum > 128;
      const val = isWhite ? 255 : 0;

      const pxOffset = rowOffset + x * 3;
      uint8[pxOffset] = val;     // Blue
      uint8[pxOffset + 1] = val; // Green
      uint8[pxOffset + 2] = val; // Red
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
  } = {}
): HTMLCanvasElement {
  const dpi = options.dpi || machine.defaultDpi || 300;
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
  const defaultBandPx = Math.round(bandMm * dpmm); // 148 px for 12.5 mm @ 300 DPI
  const defaultTravelPx = Math.round(travelLengthMm * dpmm);

  const widthPx = options.targetWidthPx || template.customWidthPx || (template.travel === 'Vertical' ? defaultBandPx : defaultTravelPx);
  const heightPx = options.targetHeightPx || template.customHeightPx || (template.travel === 'Vertical' ? defaultTravelPx : defaultBandPx);

  // Compute effective dpmm for drawing objects
  // TIJ printer heads have uniform square pixel pitch. effDpmm must align with the physical nozzle swath density (X for vertical, Y for horizontal)
  const effDpmmX = widthPx / Math.max(0.1, docWidthMm);
  const effDpmmY = heightPx / Math.max(0.1, docHeightMm);
  const effDpmm = template.travel === 'Vertical' ? effDpmmX : effDpmmY;

  // Edge-to-edge auto-fit calculation if requested
  let edgeScaleX = 1.0;
  let edgeOffsetX = 0;
  if (options.fitEdgeToEdge) {
    // Find rightmost extent of objects
    let maxObjRightMm = 1.0;
    template.objects.forEach(o => {
      const right = o.x + (o.width || 10);
      if (right > maxObjRightMm) maxObjRightMm = right;
    });
    // Target 96% of swath width leaving 2% safety margins
    const targetWidthMm = docWidthMm * 0.96;
    if (maxObjRightMm > 0) {
      edgeScaleX = Math.min(1.25, Math.max(0.75, targetWidthMm / maxObjRightMm));
      edgeOffsetX = (docWidthMm * 0.02) * effDpmmX;
    }
  }

  const docCanvas = document.createElement('canvas');
  docCanvas.width = widthPx;
  docCanvas.height = heightPx;
  const ctx = docCanvas.getContext('2d');
  if (!ctx) return docCanvas;

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
  const dpmmSafe = Math.max(1, dpmm);
  // Guarantee physical margin from canvas edges: 1.0mm (~12px @ 300 DPI)
  const safetyMarginX = Math.max(8, Math.round(1.0 * dpmmSafe));

  const rawX = obj.x * dpmm;
  const rawY = obj.y * dpmm;
  const rawW = obj.width * dpmm;
  const h = obj.height * dpmm;

  // Enforce left safe coordinate so characters never touch or cut off on the left
  const x = Math.max(safetyMarginX, rawX);
  
  // Calculate maximum allowed width to guarantee ink never reaches right safety margin
  const maxSafeWidthPx = canvasWidthPx 
    ? Math.max(20, canvasWidthPx - x - safetyMarginX) 
    : rawW;
  const w = Math.min(rawW, maxSafeWidthPx);

  ctx.save();
  ctx.translate(x + w / 2, rawY + h / 2);

  if (obj.rotation !== 0) {
    ctx.rotate((obj.rotation * Math.PI) / 180);
  }

  if (obj.mirrorX || obj.mirrorY) {
    ctx.scale(obj.mirrorX ? -1 : 1, obj.mirrorY ? -1 : 1);
  }

  ctx.translate(-w / 2, -h / 2);

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

    // Font calculation with robust system fallbacks matching Pack View mm scale exactly
    let fontSizePx = Math.max(6, Math.round(obj.fontSizeMm * dpmm));
    const fontStyle = obj.fontStyle === 'italic' ? 'italic ' : '';
    const fontWeight = obj.fontWeight === 'bold' ? 'bold ' : '';
    ctx.font = `${fontStyle}${fontWeight}${fontSizePx}px ${obj.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = obj.invert ? '#ffffff' : '#000000';

    // Horizontal stretch/condensing anchored to text alignment origin
    const alignPivotX = obj.alignment === 'center' ? (w / 2) : obj.alignment === 'right' ? w : 0;
    if (obj.horizontalStretchPercent && obj.horizontalStretchPercent !== 100) {
      const scale = obj.horizontalStretchPercent / 100;
      ctx.translate(alignPivotX, h / 2);
      ctx.scale(scale, 1);
      ctx.translate(-alignPivotX, -h / 2);
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

    // Ink measurement including advance width and right glyph overhang
    const metrics = ctx.measureText(text);
    const measuredAdvance = metrics.width;
    const inkRightOverhang = Math.max(0, (metrics.actualBoundingBoxRight ?? measuredAdvance) - measuredAdvance);
    const totalInkWidth = measuredAdvance + inkRightOverhang;

    // Auto-fit text if it exceeds width so it NEVER cuts off
    if (totalInkWidth > w && w > 0) {
      // Proportionally reduce font size first so glyph proportions remain natural and balanced
      const overflowRatio = w / totalInkWidth;
      if (overflowRatio < 0.95) {
        fontSizePx = Math.max(6, Math.floor(fontSizePx * overflowRatio * 0.96));
        ctx.font = `${fontStyle}${fontWeight}${fontSizePx}px ${obj.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      }

      const remeasured = ctx.measureText(text);
      const remeasuredAdvance = remeasured.width;
      const remeasuredOverhang = Math.max(0, (remeasured.actualBoundingBoxRight ?? remeasuredAdvance) - remeasuredAdvance);
      const remeasuredTotal = remeasuredAdvance + remeasuredOverhang;
      const scaleX = remeasuredTotal > w ? (w / remeasuredTotal) : 1.0;

      ctx.save();
      if (obj.alignment === 'center') {
        ctx.translate(w / 2, 0);
        ctx.scale(scaleX, 1);
        ctx.translate(-w / 2, 0);
      } else if (obj.alignment === 'right') {
        ctx.translate(w, 0);
        ctx.scale(scaleX, 1);
        ctx.translate(-w, 0);
      } else {
        ctx.scale(scaleX, 1);
      }
      ctx.fillText(text, textX, h / 2);
      ctx.restore();
    } else {
      ctx.fillText(text, textX, h / 2);
    }
  } else if (obj.type === 'line') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 0.2 * dpmm);
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  } else if (obj.type === 'rectangle') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = Math.max(1, 0.2 * dpmm);
    ctx.strokeRect(0, 0, w, h);
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
      const bcid = obj.type === 'qr'
        ? 'qrcode'
        : (obj.barcodeFormat === 'EAN13' ? 'ean13' : 'code128');

      const svg = bwipjs.toSVG({
        bcid,
        text: payload,
        scale: 2,
        height: obj.type === 'barcode' ? 10 : undefined,
        includetext: obj.type === 'barcode',
      });

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
        }
      }
      ctx.restore();
    } catch {
      // If payload fails checksum or format constraints, render visible indicator
      ctx.fillStyle = '#000000';
      ctx.font = `${Math.max(8, 2 * dpmm)}px monospace`;
      ctx.fillText(`[${obj.type.toUpperCase()}: ${payload}]`, 0, h / 2);
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
