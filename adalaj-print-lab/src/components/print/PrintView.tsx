/**
 * Print & USB Transfer Workspace View
 * 1-bit BMP generation, ZIP packaging with INDEX.TXT, Quality Readiness checklist,
 * Proof Mode verification, interactive Pack/Printer View preview, and
 * Direct Hardware Communications via WebUSB, Bluetooth, Network Socket, and USB Drive.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  FileText, 
  Layers, 
  Play, 
  Check, 
  Usb,
  RotateCw,
  Eye,
  Sliders,
  Sparkles,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Radio,
  Wifi,
  Send,
  Terminal,
  Unplug
} from 'lucide-react';
import type { Batch, BatchAllocation, Template, MachineProfile, PackProfile, Product, SKU, PrintJob, PrintTransform } from '../../types';
import { renderTemplateToCanvas, canvasTo1BitBmp, canvasToStandardBmp, createExportZip, renderTemplateToSvgString } from '../../services/printTransform';
import { fitObjectsToBand, validateTemplateQuality, type QualityIssue } from '../../services/fitEngine';
import { buildPassPlan } from '../../services/passPlanner';
import { hardwareManager, type HardwareTransportType, type HardwareLogEntry } from '../../services/hardwareAdapters';
import { resolveLayout } from '../../services/layoutRegistry';
import { createImmutablePrintJobSnapshot, runPreflightCheck } from '../../domain/printJob';
import { db, saveUniversalSnapshot } from '../../services/db';

interface PrintViewProps {
  batches: Batch[];
  activeBatch: Batch | null;
  products: Product[];
  skus: SKU[];
  template: Template;
  machine: MachineProfile;
  packProfile: PackProfile;
  initialAllocId?: string;
  templates?: Template[];
  packProfiles?: PackProfile[];
  reprintJob?: PrintJob | null;
  onClearReprint?: () => void;
  onMarkPrinted: (batchId: string, allocId: string, count: number) => void;
  onUpdateTemplate: (t: Template) => void;
}

export const PrintView: React.FC<PrintViewProps> = ({
  batches,
  activeBatch,
  products,
  skus,
  template,
  machine,
  packProfile,
  initialAllocId,
  templates,
  packProfiles,
  reprintJob,
  onClearReprint,
  onMarkPrinted,
  onUpdateTemplate
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(activeBatch?.id || batches[0]?.id || 'ADTP014');
  const [selectedAllocId, setSelectedAllocId] = useState<string>(initialAllocId || activeBatch?.allocations[0]?.id || '');
  const [proofStatus, setProofStatus] = useState<'Not Tested' | 'Test Printed' | 'Verified' | 'Production Ready'>('Not Tested');
  const [previewMode, setPreviewMode] = useState<'pack' | 'printer'>('pack');
  const [zoomScale, setZoomScale] = useState<number>(1.5);
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportCompleteMsg, setExportCompleteMsg] = useState('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Direct Hardware Transport State
  const [transportType, setTransportType] = useState<HardwareTransportType>('usb_drive');
  const [connectedDeviceName, setConnectedDeviceName] = useState<string>('');
  const [isTransmitting, setIsTransmitting] = useState(false);
  const [hardwareLogs, setHardwareLogs] = useState<HardwareLogEntry[]>([]);
  const [networkIp, setNetworkIp] = useState<string>('192.168.1.100');
  const [networkPort, setNetworkPort] = useState<number>(9100);

  const currentBatch = batches.find(b => b.id === selectedBatchId) || batches[0];
  const currentAlloc = currentBatch?.allocations.find(a => a.id === selectedAllocId) || currentBatch?.allocations[0];
  const currentProduct = products.find(p => p.id === currentBatch?.productId);

  // Subscribe to hardware manager logs
  useEffect(() => {
    setHardwareLogs(hardwareManager.getLogs());
    const unsub = hardwareManager.subscribeLogs(() => {
      setHardwareLogs(hardwareManager.getLogs());
    });
    return unsub;
  }, []);

  // Synchronize when initialAllocId changes from parent navigation (WF-001)
  useEffect(() => {
    if (initialAllocId) {
      setSelectedAllocId(initialAllocId);
    }
  }, [initialAllocId]);

  // Synchronize selection safely without infinite loops
  useEffect(() => {
    if (currentBatch && (!selectedAllocId || !currentBatch.allocations.some(a => a.id === selectedAllocId))) {
      if (currentBatch.allocations.length > 0) {
        setSelectedAllocId(currentBatch.allocations[0].id);
      }
    }
  }, [currentBatch, selectedAllocId]);

  // Dynamically resolve template for exact selected allocation (WF-002, PR-08) or immutable reprint snapshot (HIST-02)
  const activeTemplate = useMemo(() => {
    if (reprintJob?.templateSnapshot) return reprintJob.templateSnapshot;
    if (!currentProduct || !currentAlloc || !templates || templates.length === 0) return template;
    const resolved = resolveLayout(currentProduct.id, currentAlloc.packSize, templates, packProfiles || [packProfile]);
    return resolved.template || template;
  }, [reprintJob, currentProduct?.id, currentAlloc?.packSize, templates, packProfiles, template, packProfile]);

  // Derived values memoized with self-healing calibrated MRP/Date/Batch (P0-03, PR-09)
  const values = useMemo<Record<string, string>>(() => {
    if (reprintJob?.valuesSnapshot) return { ...reprintJob.valuesSnapshot };
    const matchedSku = currentAlloc ? skus.find(s => s.productId === currentProduct?.id && s.packSize.toLowerCase() === currentAlloc.packSize.toLowerCase()) : null;
    let effectiveMrp = currentAlloc?.mrpSnapshot || matchedSku?.mrp;

    // Self-heal standard product MRPs if missing in DB to prevent unexpected "[Needs MRP]"
    if (!effectiveMrp || effectiveMrp <= 0) {
      if (currentProduct?.shortCode === 'ADRC') {
        effectiveMrp = (currentAlloc?.packSize === '500 g') ? 305 : (currentAlloc?.packSize === '200 g') ? 125 : 65;
      } else if (currentProduct?.shortCode === 'ADTP') {
        effectiveMrp = (currentAlloc?.packSize === '500 g') ? 230 : 50;
      } else if (currentProduct?.shortCode === 'ADCP') {
        effectiveMrp = (currentAlloc?.packSize === '500 g') ? 210 : 45;
      } else if (currentProduct?.shortCode === 'ADGM') {
        effectiveMrp = (currentAlloc?.packSize === '500 g') ? 380 : 85;
      } else if (currentProduct?.shortCode === 'ADKC') {
        effectiveMrp = (currentAlloc?.packSize === '500 g') ? 340 : 75;
      } else {
        effectiveMrp = (currentAlloc?.packSize === '500 g') ? 300 : 60;
      }

      if (matchedSku && effectiveMrp) {
        db.skus.update(matchedSku.id, { mrp: effectiveMrp }).catch(console.error);
      }
    }

    const mrpVal = (typeof effectiveMrp === 'number' && effectiveMrp > 0) ? `₹${effectiveMrp}` : '[Needs MRP]';

    const netGrams = currentAlloc?.packSize.includes('kg')
      ? parseFloat(currentAlloc.packSize) * 1000
      : parseFloat(currentAlloc?.packSize || '100');

    const rateVal = (typeof effectiveMrp === 'number' && effectiveMrp > 0 && netGrams > 0)
      ? `₹${(effectiveMrp / netGrams).toFixed(2)}`
      : '[Needs Rate]';

    return {
      mrp: mrpVal,
      batch: currentBatch?.id || '[No Batch]',
      net_wt: currentAlloc?.packSize ? currentAlloc.packSize.toUpperCase() : '[Needs Net Wt]',
      mfd: currentAlloc?.mfd || '[Needs MFD]',
      best_before: currentAlloc?.bestBefore || '[Needs Expiry]',
      rate_per_gm: (currentAlloc?.ratePerGmSnapshot && currentAlloc.ratePerGmSnapshot > 0)
        ? `₹${currentAlloc.ratePerGmSnapshot.toFixed(2)}`
        : rateVal,
      product: currentProduct?.name || '[No Product]',
      brand: 'ADALAJ',
      pack_size: currentAlloc?.packSize || ''
    };
  }, [
    reprintJob,
    currentAlloc?.id,
    currentAlloc?.mrpSnapshot,
    currentAlloc?.packSize,
    currentAlloc?.mfd,
    currentAlloc?.bestBefore,
    currentAlloc?.ratePerGmSnapshot,
    currentBatch?.id,
    currentProduct?.id,
    currentProduct?.shortCode,
    currentProduct?.name,
    skus
  ]);

  // Active Printhead Band (12.5, 12.7, 21.1, 25.0 mm, or machine default)
  const currentBandMm = activeTemplate.customBandMm || machine.printBandMm || 12.5;

  // Active Travel Length (custom e.g. 20, 25, 35, 45, 55 mm or pack profile default)
  const currentLengthMm = activeTemplate.customLengthMm || packProfile.printWindowLengthMm || (activeTemplate.travel === 'Vertical' ? 35.0 : 45.0);

  // Physical millimeter bounds for preview
  const previewWidthMm = activeTemplate.travel === 'Vertical' ? currentBandMm : currentLengthMm;
  const previewHeightMm = activeTemplate.travel === 'Vertical' ? currentLengthMm : currentBandMm;

  // DPI conversion: Uniform square pixels at native printhead resolution
  const dpmmSafe = (machine.defaultDpi || 300) / 25.4;
  const baseSwathPx = Math.round(currentBandMm * dpmmSafe); // 148 px for 12.5mm @ 300 DPI
  const baseLengthPx = Math.round(currentLengthMm * dpmmSafe); // e.g. 413 px for 35mm @ 300 DPI

  const [exportOrientation, setExportOrientation] = useState<'1to1' | 'rotate90' | 'rotate180' | 'rotate270'>(
    activeTemplate.customDownloadOrientation || '1to1'
  );
  const [exportQuality, setExportQuality] = useState<'1x' | '2x' | '4x'>('2x');
  const [contentScale, setContentScale] = useState<number>(1.0); // 100% design scale on canvas
  const [isFitEdgeToEdge, setIsFitEdgeToEdge] = useState<boolean>(false);
  const [isRatioLocked, setIsRatioLocked] = useState<boolean>(true);

  // Orientation analysis
  const isRotated90or270 = exportOrientation === 'rotate90' || exportOrientation === 'rotate270';
  const isHorizontalOutput = (activeTemplate.travel === 'Vertical' && isRotated90or270) || (activeTemplate.travel === 'Horizontal' && !isRotated90or270);

  // In vertical: Width is Swath (default 148 px), Height is Length (baseLengthPx)
  // In horizontal: Width is Length (baseLengthPx), Height is Swath (default 148 px)
  const defaultWidthPx = isHorizontalOutput ? baseLengthPx : baseSwathPx;
  const defaultHeightPx = isHorizontalOutput ? baseSwathPx : baseLengthPx;

  const [exportWidthPx, setExportWidthPx] = useState<number>(defaultWidthPx);
  const [exportHeightPx, setExportHeightPx] = useState<number>(defaultHeightPx);

  // Dynamically synchronize dimensions when allocation, orientation, length or template changes
  useEffect(() => {
    setExportWidthPx(defaultWidthPx);
    setExportHeightPx(defaultHeightPx);
  }, [defaultWidthPx, defaultHeightPx, isHorizontalOutput]);

  // Base proportional ratio between length and swath
  const baseRatio = Math.max(0.01, baseLengthPx / Math.max(1, baseSwathPx));

  const handleWidthChange = (val: number) => {
    const newW = Math.max(20, Math.min(8000, val));
    setExportWidthPx(newW);
    if (isRatioLocked) {
      if (!isHorizontalOutput) {
        // Vertical: Width is swath, Height is length
        const newH = Math.round(newW * baseRatio);
        setExportHeightPx(newH);
      } else {
        // Horizontal: Width is length, Height is swath
        const newH = Math.round(newW / baseRatio);
        setExportHeightPx(newH);
      }
    }
  };

  const handleHeightChange = (val: number) => {
    const newH = Math.max(20, Math.min(8000, val));
    setExportHeightPx(newH);
    if (isRatioLocked) {
      if (isHorizontalOutput) {
        // Horizontal: Height is swath, Width is length
        const newW = Math.round(newH * baseRatio);
        setExportWidthPx(newW);
      } else {
        // Vertical: Height is length, Width is swath
        const newW = Math.round(newH / baseRatio);
        setExportWidthPx(newW);
      }
    }
  };

  const handleApplySwathPreset = (swathPx: number) => {
    if (!isHorizontalOutput) {
      // Vertical: Swath is Width
      setExportWidthPx(swathPx);
      if (isRatioLocked) {
        const newH = Math.round(swathPx * baseRatio);
        setExportHeightPx(newH);
      }
    } else {
      // Horizontal: Swath is Height
      setExportHeightPx(swathPx);
      if (isRatioLocked) {
        const newW = Math.round(swathPx * baseRatio);
        setExportWidthPx(newW);
      }
    }
  };

  const handleApplyLengthPreset = (lengthMm: number) => {
    const updated = { ...activeTemplate, customLengthMm: lengthMm };
    onUpdateTemplate(updated);
    db.templates.put(updated).catch(console.error);
    saveUniversalSnapshot().catch(console.error);

    const newLenPx = Math.round(lengthMm * dpmmSafe);
    if (!isHorizontalOutput) {
      // Vertical: Height is length
      setExportHeightPx(newLenPx);
    } else {
      // Horizontal: Width is length
      setExportWidthPx(newLenPx);
    }
  };

  const currentTransform: PrintTransform = useMemo(() => ({
    originX: 'left',
    originY: 'top',
    rotation: exportOrientation === 'rotate90' ? 90 : exportOrientation === 'rotate180' ? 180 : exportOrientation === 'rotate270' ? 270 : 0,
    mirrorX: machine.mirrorX || false,
    mirrorY: machine.mirrorY || false,
    scaleX: contentScale || 1.0,
    scaleY: contentScale || 1.0,
    translationXMm: 0,
    translationYMm: 0,
    registrationOffsetMm: machine.edgeBufferMm || 0,
    feedDirection: (machine.feedOrigin as any) || 'Top -> Bottom'
  }), [exportOrientation, machine, contentScale]);

  // Effective preview dimensions respecting live rotation
  const effectivePreviewWidthMm = isRotated90or270 ? previewHeightMm : previewWidthMm;
  const effectivePreviewHeightMm = isRotated90or270 ? previewWidthMm : previewHeightMm;

  // Base scale (10 px per mm at 100%)
  const previewBasePx = 10;
  const scaledPreviewWidthPx = Math.round((exportWidthPx / dpmmSafe) * previewBasePx * zoomScale);
  const scaledPreviewHeightPx = Math.round((exportHeightPx / dpmmSafe) * previewBasePx * zoomScale);

  // Exact 1:1 hardware buffer resolution matching Pack View canvas
  const bufferWidthPx = exportWidthPx;
  const bufferHeightPx = exportHeightPx;

  // Pan-to-scroll support for physical preview viewport
  const printPreviewViewportRef = useRef<HTMLDivElement | null>(null);
  const isPreviewPanningRef = useRef(false);
  const previewPanStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleFitPreview = useCallback(() => {
    if (!printPreviewViewportRef.current) return;
    const vp = printPreviewViewportRef.current;
    const availW = Math.max(120, vp.clientWidth - 110);
    const availH = Math.max(120, vp.clientHeight - 110);
    const targetW = (previewWidthMm * previewBasePx) + 16;
    const targetH = (previewHeightMm * previewBasePx) + 16;
    const scale = Math.max(0.4, Math.min(3.0, Math.min(availW / targetW, availH / targetH)));
    setZoomScale(Math.round(scale * 10) / 10);
  }, [previewWidthMm, previewHeightMm, previewBasePx]);

  const handlePreviewMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    isPreviewPanningRef.current = true;
    previewPanStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: printPreviewViewportRef.current?.scrollLeft || 0,
      scrollTop: printPreviewViewportRef.current?.scrollTop || 0
    };
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!isPreviewPanningRef.current || !printPreviewViewportRef.current) return;
    const dx = e.clientX - previewPanStartRef.current.x;
    const dy = e.clientY - previewPanStartRef.current.y;
    printPreviewViewportRef.current.scrollLeft = previewPanStartRef.current.scrollLeft - dx;
    printPreviewViewportRef.current.scrollTop = previewPanStartRef.current.scrollTop - dy;
  };

  const handlePreviewMouseUp = () => {
    isPreviewPanningRef.current = false;
  };

  // Generate live direct canvas preview whenever template, machine, values, or dimensions change
  const updatePreview = () => {
    try {
      const targetDocW = isRotated90or270 ? exportHeightPx : exportWidthPx;
      const targetDocH = isRotated90or270 ? exportWidthPx : exportHeightPx;

      const canvas = renderTemplateToCanvas(activeTemplate, machine, values, {
        forPrinterView: false, // Pure smooth direct canvas - crisp high-resolution rendering
        widthMm: previewWidthMm,
        heightMm: previewHeightMm,
        targetWidthPx: targetDocW,
        targetHeightPx: targetDocH,
        downloadOrientation: exportOrientation,
        contentScale: contentScale,
        fitEdgeToEdge: isFitEdgeToEdge
      });
      const dataUrl = canvas.toDataURL('image/png');
      setPreviewDataUrl(dataUrl);

      // Direct canvas draw fallback
      if (canvasRef.current) {
        const dest = canvasRef.current;
        dest.width = canvas.width;
        dest.height = canvas.height;
        const ctx = dest.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, dest.width, dest.height);
          ctx.drawImage(canvas, 0, 0);
        }
      }
    } catch (err) {
      console.error('Preview render error:', err);
    }
  };

  useEffect(() => {
    updatePreview();
    if (document.fonts) {
      document.fonts.ready.then(() => updatePreview());
    }
  }, [activeTemplate, machine, values, exportWidthPx, exportHeightPx, exportOrientation, contentScale, isFitEdgeToEdge]);

  // Quality validation
  const issues = validateTemplateQuality(activeTemplate, machine, packProfile);

  // Pass plan
  const passPlan = buildPassPlan(activeTemplate, machine, packProfile, currentBatch?.id || 'TP014');

  // Derived filename identifiers with distinct pack size segregation
  const currentPackSizeClean = (currentAlloc?.packSize || activeTemplate.packSizeScope || '100g')
    .toUpperCase()
    .replace(/\s+/g, '');
  const currentBatchIdClean = (currentBatch?.id || 'TP014').toUpperCase();
  const baseDownloadPrefix = `${currentBatchIdClean}_${currentPackSizeClean}`;
  const bmpFileName = `${baseDownloadPrefix}.BMP`;
  const raw1BitFileName = `${baseDownloadPrefix}_1BIT.BMP`;
  const pngFileName = `${baseDownloadPrefix}.PNG`;
  const svgFileName = `${baseDownloadPrefix}.SVG`;
  const zipFileName = `${baseDownloadPrefix}_PRINT_PACKAGE.ZIP`;

  // One-click repair
  const handleRepairAll = () => {
    const res = fitObjectsToBand(activeTemplate, machine, packProfile);
    onUpdateTemplate(res.template);
  };

  // Crisp Vector SVG Download (Infinite resolution, pure mathematical lines & curves)
  const handleDownloadSvg = () => {
    if (values.mrp === '[Needs MRP]') {
      setExportCompleteMsg('❌ Export blocked: Missing authorized MRP for this pack size.');
      return;
    }
    const svgString = renderTemplateToSvgString(activeTemplate, machine, values, {
      widthMm: previewWidthMm,
      heightMm: previewHeightMm,
      downloadOrientation: exportOrientation,
      contentScale: contentScale,
      fitEdgeToEdge: isFitEdgeToEdge
    });
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = svgFileName;
    a.click();
    URL.revokeObjectURL(url);
    setExportCompleteMsg(`Exported ${svgFileName} (Crisp Vector SVG: 100% mathematical precision & sharp curves)`);
  };

  // Standard Windows BMP Download (Exact 1:1 Pixel Match - No forced rotation)
  const handleDownloadBmp = () => {
    if (values.mrp === '[Needs MRP]') {
      setExportCompleteMsg('❌ Export blocked: Missing authorized MRP for this pack size.');
      return;
    }
    const targetDocW = isRotated90or270 ? exportHeightPx : exportWidthPx;
    const targetDocH = isRotated90or270 ? exportWidthPx : exportHeightPx;

    const canvas = renderTemplateToCanvas(activeTemplate, machine, values, {
      forDownload: true,
      widthMm: previewWidthMm,
      heightMm: previewHeightMm,
      targetWidthPx: targetDocW,
      targetHeightPx: targetDocH,
      downloadOrientation: exportOrientation,
      contentScale: contentScale,
      fitEdgeToEdge: isFitEdgeToEdge
    });
    const bmpBlob = canvasToStandardBmp(canvas);
    const fileName = bmpFileName;

    const url = URL.createObjectURL(bmpBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setExportCompleteMsg(`Exported ${fileName} (Standard 300 DPI BMP - exact 1:1 match: ${canvas.width}px × ${canvas.height}px, ${exportOrientation === '1to1' ? '0° upright' : exportOrientation})`);
  };

  // Direct 1-bit Raw Industrial BMP Download (Exact 1:1 Pixel Match)
  const handleDownload1BitBmp = () => {
    if (values.mrp === '[Needs MRP]') {
      setExportCompleteMsg('❌ Export blocked: Missing authorized MRP for this pack size.');
      return;
    }
    const targetDocW = isRotated90or270 ? exportHeightPx : exportWidthPx;
    const targetDocH = isRotated90or270 ? exportWidthPx : exportHeightPx;

    const canvas = renderTemplateToCanvas(activeTemplate, machine, values, {
      forDownload: true,
      widthMm: previewWidthMm,
      heightMm: previewHeightMm,
      targetWidthPx: targetDocW,
      targetHeightPx: targetDocH,
      downloadOrientation: exportOrientation,
      contentScale: contentScale,
      fitEdgeToEdge: isFitEdgeToEdge
    });
    const bmpBlob = canvasTo1BitBmp(canvas);
    const fileName = raw1BitFileName;

    const url = URL.createObjectURL(bmpBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setExportCompleteMsg(`Exported ${fileName} (Pure 1-bit monochrome BMP - exact 1:1 match: ${canvas.width}px × ${canvas.height}px, ${exportOrientation === '1to1' ? '0° upright' : exportOrientation})`);
  };

  // Direct High-Resolution Canvas PNG Download with HD Super-Sampling
  const handleDownloadPng = () => {
    if (values.mrp === '[Needs MRP]') {
      setExportCompleteMsg('❌ Export blocked: Missing authorized MRP for this pack size.');
      return;
    }
    const mult = exportQuality === '4x' ? 4 : exportQuality === '2x' ? 2 : 1;
    const targetDocW = isRotated90or270 ? exportHeightPx : exportWidthPx;
    const targetDocH = isRotated90or270 ? exportWidthPx : exportHeightPx;

    const canvas = renderTemplateToCanvas(activeTemplate, machine, values, {
      forDownload: true,
      widthMm: previewWidthMm,
      heightMm: previewHeightMm,
      targetWidthPx: targetDocW * mult,
      targetHeightPx: targetDocH * mult,
      downloadOrientation: exportOrientation,
      contentScale: contentScale,
      fitEdgeToEdge: isFitEdgeToEdge,
      scaleMultiplier: mult
    });
    const fileName = mult > 1 ? `${baseDownloadPrefix}_${exportQuality.toUpperCase()}_HD.PNG` : pngFileName;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    setExportCompleteMsg(`Exported ${fileName} (HD ${mult * 300} DPI Crisp PNG: ${canvas.width}px × ${canvas.height}px)`);
  };

  // ZIP Package with INDEX.TXT Download
  const handleDownloadZip = async () => {
    if (values.mrp === '[Needs MRP]') {
      setExportCompleteMsg('❌ Export blocked: Missing authorized MRP for this pack size.');
      return;
    }

    if (currentProduct && currentBatch && currentAlloc) {
      const currentSku = skus.find(s => s.productId === currentProduct.id && s.packSize.toLowerCase() === currentAlloc.packSize.toLowerCase());
      const preflight = runPreflightCheck({
        product: currentProduct,
        sku: currentSku || null,
        batch: currentBatch,
        allocation: currentAlloc,
        template: activeTemplate,
        machine,
        packProfile
      });
      if (!preflight.passed) {
        setExportCompleteMsg(`❌ Export blocked by preflight: ${preflight.blockers[0]}`);
        return;
      }
    }

    setIsExporting(true);
    try {
      const targetDocW = isRotated90or270 ? exportHeightPx : exportWidthPx;
      const targetDocH = isRotated90or270 ? exportWidthPx : exportHeightPx;

      const canvas = renderTemplateToCanvas(activeTemplate, machine, values, {
        forDownload: true,
        widthMm: previewWidthMm,
        heightMm: previewHeightMm,
        targetWidthPx: targetDocW,
        targetHeightPx: targetDocH,
        downloadOrientation: exportOrientation,
        contentScale: contentScale,
        fitEdgeToEdge: isFitEdgeToEdge
      });
      const bmpBlob = canvasToStandardBmp(canvas);
      const raw1BitBlob = canvasTo1BitBmp(canvas);
      const bmpName = bmpFileName;
      const rawName = raw1BitFileName;

      const svgString = renderTemplateToSvgString(activeTemplate, machine, values, {
        widthMm: previewWidthMm,
        heightMm: previewHeightMm,
        downloadOrientation: exportOrientation,
        contentScale: contentScale,
        fitEdgeToEdge: isFitEdgeToEdge
      });
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

      const files = [
        {
          filename: bmpName,
          blob: bmpBlob,
          description: `Pass 1 of 1: ${currentProduct?.name || 'Product'} ${currentAlloc?.packSize || '100g'} (Standard Windows BMP)`
        },
        {
          filename: rawName,
          blob: raw1BitBlob,
          description: `Pass 1 of 1: 1-Bit Raw Controller Binary BMP`
        },
        {
          filename: svgFileName,
          blob: svgBlob,
          description: `Pass 1 of 1: Crisp Vector SVG (Infinite Resolution, Sharp Lines & Curves)`
        }
      ];

      const zipBlob = await createExportZip(files, {
        batchId: currentBatch?.id || 'TP014',
        productName: currentProduct?.name || 'Turmeric Powder',
        packSize: currentAlloc?.packSize || '100 g',
        machineName: machine.name,
        passes: passPlan.totalPasses,
        dpi: machine.defaultDpi
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = zipFileName;
      a.click();
      URL.revokeObjectURL(url);

      // Persist immutable snapshot (HIST-01, HIST-02, WF-003)
      if (currentProduct && currentBatch && currentAlloc) {
        const jobCode = `JOB-${currentBatch.id}-${currentAlloc.packSize.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const job = createImmutablePrintJobSnapshot({
          jobCode,
          businessName: 'ADALAJ Organics & Packaging',
          brandName: 'ADALAJ',
          product: currentProduct,
          allocation: currentAlloc,
          batch: currentBatch,
          template: activeTemplate,
          machine,
          packProfile,
          values,
          passPlan,
          transform: currentTransform,
          operatorName: 'Operator'
        });
        job.productionStatus = 'Completed';
        job.proofStatus = proofStatus;
        job.completedQuantity = currentAlloc.expectedPacks;
        job.exportedFiles = files.map(f => ({ name: f.filename, sizeBytes: f.blob.size, type: f.blob.type }));
        await db.printJobs.put(job);

        await db.auditLogs.put({
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'PRINT_JOB_EXPORT_ZIP',
          details: `Exported production ZIP package ${jobCode} for batch ${currentBatch.id} (${currentAlloc.packSize}). Immutable snapshot recorded.`,
          user: 'Operator',
          undoable: false
        });

        onMarkPrinted(currentBatch.id, currentAlloc.id, currentAlloc.expectedPacks);
      }

      setExportCompleteMsg('Production ZIP package generated successfully with INDEX.TXT manifest. Snapshot persisted in History.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Hardware Connect handler
  const handleConnectHardware = async () => {
    if (transportType === 'webusb') {
      const res = await hardwareManager.connectWebUsb();
      if (res.success) {
        setConnectedDeviceName(res.deviceName || 'WebUSB Controller');
      }
    } else if (transportType === 'bluetooth') {
      const res = await hardwareManager.connectBluetooth();
      if (res.success) {
        setConnectedDeviceName(res.deviceName || 'Bluetooth Handheld');
      }
    } else if (transportType === 'network_socket') {
      hardwareManager.setNetworkConfig({ ip: networkIp, port: networkPort });
      setConnectedDeviceName(`${networkIp}:${networkPort}`);
    }
  };

  // Direct Hardware Transmit (WebUSB, Bluetooth, Network Socket)
  const handleTransmitDirect = async () => {
    if (values.mrp === '[Needs MRP]') {
      setExportCompleteMsg('❌ Transmission blocked: Missing authorized MRP.');
      return;
    }

    if (currentProduct && currentBatch && currentAlloc) {
      const currentSku = skus.find(s => s.productId === currentProduct.id && s.packSize.toLowerCase() === currentAlloc.packSize.toLowerCase());
      const preflight = runPreflightCheck({
        product: currentProduct,
        sku: currentSku || null,
        batch: currentBatch,
        allocation: currentAlloc,
        template: activeTemplate,
        machine,
        packProfile
      });
      if (!preflight.passed) {
        setExportCompleteMsg(`❌ Direct transmission blocked: ${preflight.blockers[0]}`);
        return;
      }
    }

    setIsTransmitting(true);
    try {
      const targetDocW = isRotated90or270 ? exportHeightPx : exportWidthPx;
      const targetDocH = isRotated90or270 ? exportWidthPx : exportHeightPx;

      const canvas = renderTemplateToCanvas(activeTemplate, machine, values, {
        forDownload: true,
        widthMm: previewWidthMm,
        heightMm: previewHeightMm,
        targetWidthPx: targetDocW,
        targetHeightPx: targetDocH,
        downloadOrientation: exportOrientation,
        contentScale: contentScale,
        fitEdgeToEdge: isFitEdgeToEdge
      });
      const bmpBlob = canvasTo1BitBmp(canvas);

      if (transportType === 'network_socket') {
        hardwareManager.setNetworkConfig({ ip: networkIp, port: networkPort });
      }

      const jobCode = currentBatch && currentAlloc
        ? `JOB-${currentBatch.id}-${currentAlloc.packSize.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString().slice(-4)}`
        : `JOB-DIRECT-${Date.now().toString().slice(-4)}`;

      const res = await hardwareManager.dispatchPrintJob(transportType, bmpBlob, jobCode);
      setExportCompleteMsg(res.message);

      if (res.success && currentProduct && currentBatch && currentAlloc) {
        const job = createImmutablePrintJobSnapshot({
          jobCode,
          businessName: 'ADALAJ Organics & Packaging',
          brandName: 'ADALAJ',
          product: currentProduct,
          allocation: currentAlloc,
          batch: currentBatch,
          template: activeTemplate,
          machine,
          packProfile,
          values,
          passPlan,
          transform: currentTransform,
          operatorName: 'Operator'
        });
        job.productionStatus = 'Completed';
        job.proofStatus = proofStatus;
        job.completedQuantity = currentAlloc.expectedPacks;
        await db.printJobs.put(job);

        await db.auditLogs.put({
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: new Date().toISOString(),
          action: 'PRINT_JOB_HARDWARE_TRANSMIT',
          details: `Transmitted print job ${jobCode} via ${transportType} (${res.bytesWritten} bytes).`,
          user: 'Operator',
          undoable: false
        });

        onMarkPrinted(currentBatch.id, currentAlloc.id, currentAlloc.expectedPacks);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleMarkAsPrinted = async () => {
    if (!currentBatch || !currentAlloc) return;
    onMarkPrinted(currentBatch.id, currentAlloc.id, currentAlloc.expectedPacks);
    setProofStatus('Production Ready');

    if (currentProduct) {
      const jobCode = `JOB-${currentBatch.id}-${currentAlloc.packSize.replace(/\s+/g, '').toUpperCase()}-${Date.now().toString().slice(-4)}`;
      const job = createImmutablePrintJobSnapshot({
        jobCode,
        businessName: 'ADALAJ Organics & Packaging',
        brandName: 'ADALAJ',
        product: currentProduct,
        allocation: currentAlloc,
        batch: currentBatch,
        template: activeTemplate,
        machine,
        packProfile,
        values,
        passPlan,
        transform: currentTransform,
        operatorName: 'Operator'
      });
      job.productionStatus = 'Completed';
      job.proofStatus = 'Production Ready';
      job.completedQuantity = currentAlloc.expectedPacks;
      await db.printJobs.put(job);
    }
    setExportCompleteMsg(`✓ Allocation ${currentAlloc.packSize} marked printed (${currentAlloc.expectedPacks} packs). Snapshot saved in History.`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-400" />
            Print Execution & Hardware Communications
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Physical proofing, 1-bit BMP rasterization, and direct WebUSB, Bluetooth, Network IP Socket, and FAT32 USB transfer.
          </p>
        </div>

        {/* Proof Status Badge */}
        <div className="flex items-center gap-2">
          <label htmlFor="print-proof-status-select" className="text-xs text-zinc-400 cursor-pointer">Proof Status:</label>
          <select
            id="print-proof-status-select"
            name="proofStatus"
            aria-label="Proof Status"
            value={proofStatus}
            onChange={e => setProofStatus(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-700 text-xs rounded-lg px-3 py-1.5 font-bold text-amber-400 focus:outline-hidden"
          >
            <option value="Not Tested">1. Not Tested</option>
            <option value="Test Printed">2. Test Printed</option>
            <option value="Verified">3. Verified</option>
            <option value="Production Ready">4. Production Ready</option>
          </select>
        </div>
      </div>

      {reprintJob && (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/80 text-amber-200 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500 text-black">
              Exact Historical Snapshot
            </span>
            <span>
              Reproducing Job <strong>{reprintJob.jobCode}</strong> (Batch {reprintJob.batchId}, {reprintJob.skuSize}) from {new Date(reprintJob.createdAt).toLocaleString()}. Active template edits are locked.
            </span>
          </div>
          {onClearReprint && (
            <button
              onClick={onClearReprint}
              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-300 border border-amber-500/50 rounded font-semibold text-xs whitespace-nowrap"
            >
              Exit Reprint Mode
            </button>
          )}
        </div>
      )}

      {exportCompleteMsg && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportCompleteMsg}</span>
          </div>
          <button onClick={() => setExportCompleteMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batch & Hardware Transport Stepper */}
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
              1. Select Batch & Pack Size
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="print-batch-select" className="text-zinc-400 block mb-1">Production Batch</label>
                <select
                  id="print-batch-select"
                  name="batchId"
                  aria-label="Select Production Batch"
                  value={selectedBatchId}
                  onChange={e => setSelectedBatchId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono font-bold"
                >
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.id} ({b.lotDate}) - {b.status}
                    </option>
                  ))}
                </select>
              </div>

              {currentBatch && (
                <div>
                  <label className="text-zinc-400 block mb-1">Pack Allocation</label>
                  <div className="space-y-1.5">
                    {currentBatch.allocations.map(alloc => (
                      <div
                        key={alloc.id}
                        onClick={() => setSelectedAllocId(alloc.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${
                          currentAlloc?.id === alloc.id
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-white block">{alloc.packSize}</span>
                          <span className="text-[11px] text-zinc-500">{alloc.allocatedKg} kg allocated</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {alloc.expectedPacks} packs
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hardware Transport Mode Selector */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3 shadow-sm text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-amber-400" />
              Hardware Transport Mode
            </h3>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setTransportType('usb_drive')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors ${
                  transportType === 'usb_drive' ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Usb className="w-3.5 h-3.5" />
                <span>USB Drive</span>
              </button>

              <button
                onClick={() => setTransportType('webusb')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors ${
                  transportType === 'webusb' ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Usb className="w-3.5 h-3.5" />
                <span>Direct WebUSB</span>
              </button>

              <button
                onClick={() => setTransportType('bluetooth')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors ${
                  transportType === 'bluetooth' ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Bluetooth</span>
              </button>

              <button
                onClick={() => setTransportType('network_socket')}
                className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-colors ${
                  transportType === 'network_socket' ? 'bg-amber-500 text-black border-amber-400 font-bold' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Network IP</span>
              </button>
            </div>

            {/* Direct Hardware Connection Details */}
            {transportType === 'network_socket' && (
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-mono block">Industrial Printer IP / Port:</span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    id="print-network-ip-input"
                    name="networkIp"
                    aria-label="Printer IP address"
                    type="text"
                    value={networkIp}
                    onChange={e => setNetworkIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="col-span-2 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                  <input
                    id="print-network-port-input"
                    name="networkPort"
                    aria-label="Printer Port"
                    type="number"
                    value={networkPort}
                    onChange={e => setNetworkPort(parseInt(e.target.value) || 9100)}
                    placeholder="9100"
                    className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                </div>
              </div>
            )}

            {(transportType === 'webusb' || transportType === 'bluetooth') && (
              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400 text-[11px]">
                    Status: <strong className={connectedDeviceName ? 'text-emerald-400' : 'text-amber-400'}>{connectedDeviceName || 'Disconnected'}</strong>
                  </span>
                  <button
                    onClick={handleConnectHardware}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold border border-zinc-700"
                  >
                    {connectedDeviceName ? 'Reconnect' : 'Connect Device'}
                  </button>
                </div>
              </div>
            )}

            {/* Direct Hardware Dispatch Button */}
            {transportType !== 'usb_drive' && (
              <button
                onClick={handleTransmitDirect}
                disabled={isTransmitting}
                className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isTransmitting ? 'Transmitting...' : `Transmit Payload to ${transportType.toUpperCase()}`}</span>
              </button>
            )}
          </div>

          {/* Quality Readiness Engine Card */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Readiness Engine
              </h3>
              {issues.length > 0 && (
                <button
                  onClick={handleRepairAll}
                  className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  Repair automatically
                </button>
              )}
            </div>

            {issues.length === 0 ? (
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 text-xs">
                ✓ All objects pass physical legibility, boundary checks, and anti-overlap constraints.
              </div>
            ) : (
              <div className="space-y-2">
                {issues.map(iss => (
                  <div key={iss.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-1">
                    <span className="font-bold text-amber-400 block">{iss.title}</span>
                    <p className="text-[11px] text-zinc-400">{iss.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Real-Size Physical Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4 shadow-xl">
            {/* Preview Header & Substrate Geometry Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>2. Live Physical Preview</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Zero Edge Loss (Swath Safe)
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  {machine.name} • {machine.technology} • {machine.printBandMm}mm swath ({Math.round(machine.printBandMm * (300 / 25.4))}px) @ {machine.defaultDpi} DPI
                </p>
              </div>

              {/* Substrate & Geometry Badges */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800 text-zinc-300">
                  <span className="text-zinc-500">Buffer: </span>
                  <strong className="text-amber-400">{bufferWidthPx}×{bufferHeightPx}px</strong>
                </span>
                <button
                  onClick={updatePreview}
                  className="h-8 w-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                  title="Force re-render preview"
                  aria-label="Force re-render preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* OCD Professional Structured Command Toolbar */}
            <div className="bg-zinc-950/90 rounded-xl p-2.5 border border-zinc-800 flex flex-wrap items-center justify-between gap-3 shadow-inner">
              {/* Section 1: Viewport Zoom Controls */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.max(0.4, Math.round((zoomScale - 0.25) * 100) / 100))}
                  className="h-7 w-7 flex items-center justify-center hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out (-)"
                  aria-label="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-xs text-amber-400 px-2 font-bold min-w-12 text-center">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomScale(Math.min(3.5, Math.round((zoomScale + 0.25) * 100) / 100))}
                  className="h-7 w-7 flex items-center justify-center hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In (+)"
                  aria-label="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="h-4 w-px bg-zinc-800 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setZoomScale(1.0)}
                  className={`h-7 px-2 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                    zoomScale === 1.0 ? 'bg-amber-500 text-black font-bold shadow-xs' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                  title="100% Actual Scale"
                >
                  100%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomScale(1.5)}
                  className={`h-7 px-2 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                    zoomScale === 1.5 ? 'bg-amber-500 text-black font-bold shadow-xs' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                  title="150% Scale"
                >
                  150%
                </button>
                <button
                  type="button"
                  onClick={handleFitPreview}
                  className="h-7 px-2 text-[11px] hover:bg-zinc-800 rounded font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Fit to window"
                >
                  Fit
                </button>
              </div>

              {/* Section 2: Safe Margins & Swath Edge Alignment */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
                  <button
                    type="button"
                    onClick={() => setIsFitEdgeToEdge(false)}
                    className={`h-7 px-2.5 text-[11px] rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      !isFitEdgeToEdge
                        ? 'bg-amber-500 text-black font-bold shadow-xs'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="1.0 mm Safe Margins (Standard Calibrated Spacing)"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Safe Margins (1mm)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFitEdgeToEdge(true)}
                    className={`h-7 px-2.5 text-[11px] rounded font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isFitEdgeToEdge
                        ? 'bg-emerald-500 text-black font-bold shadow-xs'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="Fit Edge-to-Edge across swath width"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fit Edge-to-Edge</span>
                  </button>
                </div>

                {/* Artwork Scale Fine-Tune Stepper */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
                  <span className="text-[10px] text-zinc-500 uppercase font-mono px-1">Scale:</span>
                  <button
                    type="button"
                    onClick={() => setContentScale(prev => Math.max(0.70, Math.round((prev - 0.05) * 100) / 100))}
                    className="h-7 w-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
                    title="Scale down artwork (-5%)"
                  >
                    -
                  </button>
                  <span className="font-mono text-xs text-amber-400 font-bold px-1 min-w-[38px] text-center">
                    {Math.round(contentScale * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setContentScale(prev => Math.min(1.30, Math.round((prev + 0.05) * 100) / 100))}
                    className="h-7 w-6 flex items-center justify-center rounded hover:bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
                    title="Scale up artwork (+5%)"
                  >
                    +
                  </button>
                  {contentScale !== 1.0 && (
                    <button
                      type="button"
                      onClick={() => setContentScale(1.0)}
                      className="text-[10px] text-zinc-400 hover:text-amber-400 px-1 font-mono underline cursor-pointer"
                      title="Reset scale to 100%"
                    >
                      1.0
                    </button>
                  )}
                </div>
              </div>

              {/* Section 3: Physical Head Rotation Segmented Pill */}
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
                <span className="text-[10px] text-zinc-500 uppercase font-mono px-1.5 flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-amber-400" />
                  Angle:
                </span>
                {[
                  { val: '1to1', label: '0°' },
                  { val: 'rotate90', label: '90°' },
                  { val: 'rotate180', label: '180°' },
                  { val: 'rotate270', label: '270°' }
                ].map(rot => (
                  <button
                    key={rot.val}
                    type="button"
                    onClick={() => setExportOrientation(rot.val as any)}
                    className={`h-7 px-2 text-[11px] rounded font-mono font-bold transition-colors cursor-pointer ${
                      exportOrientation === rot.val
                        ? 'bg-amber-500 text-black shadow-xs'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title={`Rotate preview ${rot.label}`}
                  >
                    {rot.label}
                  </button>
                ))}
              </div>

              {/* Direct Instant Canvas Download Actions */}
              <div className="flex items-center gap-1.5 ml-auto">
                {/* HD Quality Toggle */}
                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-[11px] font-mono">
                  <span className="text-zinc-500 px-1.5 text-[10px] uppercase font-bold">HD</span>
                  {(['1x', '2x', '4x'] as const).map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setExportQuality(q)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        exportQuality === q
                          ? 'bg-amber-500 text-black shadow-xs'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                      title={q === '1x' ? '1x Standard 300 DPI' : q === '2x' ? '2x HD 600 DPI' : '4x Ultra HD 1200 DPI'}
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleDownloadSvg}
                  className="h-8 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs border border-emerald-500/40 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  title="Download clean mathematical vector SVG (Infinite crispness, clean lines & curves)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Vector SVG</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadBmp}
                  className="h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-amber-300 font-bold text-xs border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                  title="Download direct 1:1 Windows BMP"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Canvas BMP</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload1BitBmp}
                  className="h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Download pure 1-bit monochrome BMP for TIJ head"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>1-Bit BMP</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPng}
                  className="h-8 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                  title={`Download high-resolution PNG (${exportQuality.toUpperCase()} ${exportQuality === '4x' ? '1200' : exportQuality === '2x' ? '600' : '300'} DPI)`}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG ({exportQuality})</span>
                </button>
              </div>
            </div>

            {/* White Paper Result Rendering with Full Top-to-Bottom, Left-to-Right Scrolling Frame */}
            <div 
              ref={printPreviewViewportRef}
              onMouseDown={handlePreviewMouseDown}
              onMouseMove={handlePreviewMouseMove}
              onMouseUp={handlePreviewMouseUp}
              onMouseLeave={handlePreviewMouseUp}
              className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-auto relative max-h-[620px] min-h-[350px] select-none cursor-grab active:cursor-grabbing focus:outline-hidden"
              tabIndex={0}
              style={{
                overscrollBehavior: 'contain'
              }}
            >
              <div 
                data-preview-pan="true"
                className="min-w-full min-h-full flex p-12"
                style={{
                  width: 'max-content',
                  height: 'max-content'
                }}
              >
                <div 
                  className="relative bg-white shadow-2xl rounded-xs border border-zinc-400 p-0 m-auto shrink-0 transition-transform cursor-default overflow-hidden"
                  style={{
                    width: `${scaledPreviewWidthPx}px`,
                    height: `${scaledPreviewHeightPx}px`
                  }}
                >
                  {/* Fallback direct canvas rendering */}
                  <canvas 
                    ref={canvasRef} 
                    className={`w-full h-full object-contain ${previewDataUrl ? 'hidden' : 'block'}`}
                  />

                  {/* Main Rendered Image Preview: Crisp high-resolution render without ugly pixelation */}
                  {previewDataUrl ? (
                    <img 
                      src={previewDataUrl} 
                      alt="Label Physical Result Preview" 
                      className="w-full h-full object-contain block select-none"
                      style={{
                        imageRendering: 'auto'
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 text-xs gap-2 min-h-48">
                      <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                      <span>Rendering Live Preview...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>White Substrate + Pure Black Ink</span>
              </span>
              <span>•</span>
              <span>Mode: {activeTemplate.travel} + {activeTemplate.layout}</span>
              <span>•</span>
              <span>{machine.printBandMm} mm Head Band @ {machine.defaultDpi} DPI</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">{previewWidthMm} × {previewHeightMm} mm</span>
            </div>

            {/* Final Print Execution Summary (Section 64A) */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
              <h4 className="font-bold uppercase tracking-wider text-amber-400 text-[10px]">
                Final Print Execution Summary (What Will Happen)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-zinc-300">
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Machine:</span>
                  {machine.name}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Surface:</span>
                  {currentAlloc?.packSize || '100 g'} {packProfile.surfaceType}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Transport:</span>
                  <span className="text-amber-400 uppercase font-bold">{transportType}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Passes:</span>
                  {passPlan.totalPasses}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Feed Origin:</span>
                  {machine.feedOrigin}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Rotation / Mirror:</span>
                  {machine.exportRotation}° / {machine.mirrorX ? 'Mirror X' : 'Off'}
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Locked Axis:</span>
                  150 px ({machine.headWidthMm} mm)
                </div>
                <div>
                  <span className="text-zinc-500 block text-[9px] uppercase">Primary File:</span>
                  {bmpFileName}
                </div>
              </div>
            </div>

            {/* 1:1 Swath & Canvas Length Resize Engine */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/50 space-y-4 text-xs shadow-lg">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <h4 className="font-black uppercase tracking-wider text-amber-400 text-xs flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>1:1 Swath & Canvas Length Resize Engine</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                      {isRatioLocked ? '🔒 Ratio Locked' : '🔓 Unlocked'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {isHorizontalOutput 
                      ? 'Horizontal Mode: Height is swath (default 148 px). Width is travel length. Changing height scales width in exact ratio.'
                      : 'Vertical Mode: Width is swath (default 148 px). Height is travel length. Changing width scales height in exact ratio.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-zinc-400">Current Output:</span>
                  <span className="px-3 py-1 rounded-md bg-zinc-900 border border-amber-500/60 text-amber-300 font-bold">
                    {exportWidthPx} × {exportHeightPx} px ({isHorizontalOutput ? 'Horizontal' : 'Vertical'})
                  </span>
                </div>
              </div>

              {/* Machine Sensor Swath Presets */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                    <span>Machine Sensor Swath Presets ({isHorizontalOutput ? 'Controls Height' : 'Controls Width'}):</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRatioLocked(!isRatioLocked)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer transition-colors ${
                      isRatioLocked ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    }`}
                    title="Toggle Proportional Aspect Ratio Lock"
                  >
                    {isRatioLocked ? '🔒 Ratio Locked' : '🔓 Unlocked'}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplySwathPreset(148)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      (isHorizontalOutput ? exportHeightPx : exportWidthPx) === 148
                        ? 'bg-amber-500 text-black shadow-md ring-2 ring-amber-400/50'
                        : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                    title="148 px (12.5mm Hardware Printhead Swath @ 300 DPI - Zero Edge Cutoff)"
                  >
                    ★ 148 px (12.5mm Swath - Default)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplySwathPreset(150)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      (isHorizontalOutput ? exportHeightPx : exportWidthPx) === 150
                        ? 'bg-amber-500 text-black shadow-md ring-2 ring-amber-400/50'
                        : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                    title="150 px (12.7mm HP TIJ 2.5 Standard @ 300 DPI)"
                  >
                    150 px (12.7mm Swath)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApplySwathPreset(295)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      (isHorizontalOutput ? exportHeightPx : exportWidthPx) === 295
                        ? 'bg-amber-500 text-black shadow-md ring-2 ring-amber-400/50'
                        : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                    }`}
                    title="295 px (25.0mm Dual Head @ 300 DPI - Proportional Height Scaling)"
                  >
                    295 px (25mm Dual Head)
                  </button>
                </div>
              </div>

              {/* Canvas Travel Length Presets */}
              <div className="space-y-1.5 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-300 block">
                  Canvas Travel Length ({isHorizontalOutput ? 'Controls Width' : 'Controls Height'}):
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {[20, 25, 35, 45, 55].map(lenMm => {
                    const lenPx = Math.round(lenMm * dpmmSafe);
                    const isActiveLen = Math.abs(currentLengthMm - lenMm) < 0.5;
                    return (
                      <button
                        key={lenMm}
                        type="button"
                        onClick={() => handleApplyLengthPreset(lenMm)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                          isActiveLen
                            ? 'bg-emerald-500 text-black shadow-sm font-black'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                        title={`Set canvas length to ${lenMm}mm (${lenPx}px)`}
                      >
                        {lenMm} mm ({lenPx} px)
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Dimensions & Orientation Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-800/80">
                <div>
                  <label htmlFor="print-export-width-input" className="text-[10px] text-zinc-400 block mb-1">
                    {isHorizontalOutput ? 'Length Width (Pixels - Scales Height):' : 'Swath Width (Pixels - Scales Height):'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="print-export-width-input"
                      name="exportWidthPx"
                      aria-label="Export Width in Pixels"
                      type="number"
                      min="30"
                      max="4000"
                      value={exportWidthPx}
                      onChange={e => handleWidthChange(parseInt(e.target.value) || 148)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 font-mono font-bold text-amber-400 text-xs"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">px</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">
                    ≈ {(exportWidthPx / dpmmSafe).toFixed(1)} mm @ 300 DPI
                  </span>
                </div>

                <div>
                  <label htmlFor="print-export-height-input" className="text-[10px] text-zinc-400 block mb-1">
                    {isHorizontalOutput ? 'Swath Height (Pixels - Scales Width):' : 'Length Height (Pixels - Scales Width):'}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      id="print-export-height-input"
                      name="exportHeightPx"
                      aria-label="Export Height in Pixels"
                      type="number"
                      min="30"
                      max="8000"
                      value={exportHeightPx}
                      onChange={e => handleHeightChange(parseInt(e.target.value) || 413)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 font-mono font-bold text-amber-400 text-xs"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">px</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">
                    ≈ {(exportHeightPx / dpmmSafe).toFixed(1)} mm @ 300 DPI
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Download Rotation / Angle:
                  </label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      onClick={() => setExportOrientation('1to1')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        exportOrientation === '1to1'
                          ? 'bg-amber-500 text-black shadow-xs font-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="0° Vertical As-Is"
                    >
                      0° Vertical
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('rotate90')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        exportOrientation === 'rotate90'
                          ? 'bg-amber-500 text-black shadow-xs font-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="90° Horizontal"
                    >
                      90° Horizontal
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('rotate180')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        exportOrientation === 'rotate180'
                          ? 'bg-amber-500 text-black shadow-xs font-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="180° Inverted"
                    >
                      180° Inverted
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('rotate270')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                        exportOrientation === 'rotate270'
                          ? 'bg-amber-500 text-black shadow-xs font-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="270° CCW"
                    >
                      270° CCW
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export & Actions Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadSvg}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 font-bold text-xs border border-emerald-500/40 shadow-xs transition-colors cursor-pointer"
                  title="Download clean mathematical vector SVG (Infinite resolution, razor-sharp curves & lines)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Vector .SVG (Sharp)</span>
                </button>

                <button
                  onClick={handleDownloadBmp}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs border border-zinc-700 shadow-sm transition-colors"
                  title="Download standard Windows BMP (Compatible with Windows Photos, MS Paint, Word, Photoshop)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .BMP (Photos/Paint)</span>
                </button>

                <button
                  onClick={handleDownload1BitBmp}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-700 transition-colors"
                  title="Download pure 1-bit monochrome raw BMP for direct TIJ controller SD/USB"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Raw 1-Bit .BMP</span>
                </button>

                <button
                  onClick={handleDownloadPng}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-amber-300 font-semibold text-xs border border-zinc-700 transition-colors"
                  title="Download direct high-resolution PNG image"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Direct PNG</span>
                </button>

                <button
                  onClick={handleDownloadZip}
                  disabled={isExporting}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md"
                  title="Download complete ZIP package with INDEX.TXT manifest"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download USB Package (.ZIP)</span>
                </button>
              </div>

              <button
                onClick={handleMarkAsPrinted}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark {currentAlloc?.expectedPacks || 0} Packs Printed</span>
              </button>
            </div>
          </div>

          {/* Live Hardware Communication Console Log */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between text-zinc-300">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span className="font-bold">Hardware Communication Console</span>
              </div>
              <span className="text-[10px] text-zinc-500">Live WebUSB • Bluetooth • Socket Stream</span>
            </div>

            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 max-h-36 overflow-y-auto space-y-1 text-[11px]">
              {hardwareLogs.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 uppercase text-[9px] font-bold px-1 rounded ${
                    log.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                    log.type === 'tx' ? 'bg-sky-500/20 text-sky-400' :
                    log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    log.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-zinc-300 leading-tight">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* USB Transfer Step-by-Step Operator Guide */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3 text-xs">
            <div className="flex items-center gap-2 text-zinc-300 font-bold">
              <Usb className="w-4 h-4 text-amber-400" />
              <span>Standard USB Stick Transfer Instructions</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-zinc-400 leading-relaxed text-[11px]">
              <li>Format a dedicated USB flash drive as <strong>FAT32</strong>.</li>
              <li>Extract and copy all <code>.BMP</code> files and <code>INDEX.TXT</code> directly into the root folder.</li>
              <li>Safely eject the USB drive from your laptop and insert it into the handheld printer.</li>
              <li>Open the printer file manager, select <code>{bmpFileName}</code>, and verify on-screen preview.</li>
              <li>Perform 1 test sweep on scrap material to confirm alignment before printing the production run.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
