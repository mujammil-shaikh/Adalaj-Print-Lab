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
import type { Batch, BatchAllocation, Template, MachineProfile, PackProfile, Product, SKU } from '../../types';
import { renderTemplateToCanvas, canvasTo1BitBmp, canvasToStandardBmp, createExportZip } from '../../services/printTransform';
import { fitObjectsToBand, validateTemplateQuality, type QualityIssue } from '../../services/fitEngine';
import { buildPassPlan } from '../../services/passPlanner';
import { hardwareManager, type HardwareTransportType, type HardwareLogEntry } from '../../services/hardwareAdapters';

interface PrintViewProps {
  batches: Batch[];
  activeBatch: Batch | null;
  products: Product[];
  skus: SKU[];
  template: Template;
  machine: MachineProfile;
  packProfile: PackProfile;
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
  onMarkPrinted,
  onUpdateTemplate
}) => {
  const [selectedBatchId, setSelectedBatchId] = useState<string>(activeBatch?.id || batches[0]?.id || 'ADTP014');
  const [selectedAllocId, setSelectedAllocId] = useState<string>('');
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

  // Synchronize selection safely without infinite loops
  useEffect(() => {
    if (currentBatch && (!selectedAllocId || !currentBatch.allocations.some(a => a.id === selectedAllocId))) {
      if (currentBatch.allocations.length > 0) {
        setSelectedAllocId(currentBatch.allocations[0].id);
      }
    }
  }, [currentBatch, selectedAllocId]);

  // Derived values memoized with primitive dependencies to avoid infinite re-renders
  const values = useMemo<Record<string, string>>(() => {
    const mrpVal = currentAlloc?.mrpSnapshot ? `₹${currentAlloc.mrpSnapshot}` : '₹50';
    const netGrams = currentAlloc?.packSize.includes('kg') ? parseFloat(currentAlloc.packSize) * 1000 : parseFloat(currentAlloc?.packSize || '100');
    const rateVal = currentAlloc?.mrpSnapshot ? `₹${(currentAlloc.mrpSnapshot / netGrams).toFixed(2)}` : '₹0.50';

    return {
      mrp: mrpVal,
      batch: currentBatch?.id || 'ADTP014',
      net_wt: currentAlloc?.packSize.toUpperCase() || '100 GM',
      mfd: currentAlloc?.mfd || '10/10/26',
      best_before: currentAlloc?.bestBefore || '09/11/27',
      rate_per_gm: currentAlloc?.ratePerGmSnapshot ? `₹${currentAlloc.ratePerGmSnapshot.toFixed(2)}` : rateVal,
      product: currentProduct?.name || 'Turmeric Powder',
      brand: 'ADALAJ',
      pack_size: currentAlloc?.packSize || '100 g'
    };
  }, [
    currentAlloc?.id,
    currentAlloc?.mrpSnapshot,
    currentAlloc?.packSize,
    currentAlloc?.mfd,
    currentAlloc?.bestBefore,
    currentAlloc?.ratePerGmSnapshot,
    currentBatch?.id,
    currentProduct?.name
  ]);

  // Active Printhead Band (12.5, 12.7, 21.1, 25.0 mm, or machine default)
  const currentBandMm = template.customBandMm || machine.printBandMm || 12.7;

  // Active Travel Length (custom e.g. 80, 100, 150 mm or pack profile default)
  const currentLengthMm = template.customLengthMm || packProfile.printWindowLengthMm || (template.travel === 'Vertical' ? 100.0 : 45.0);

  // Physical millimeter bounds for preview
  const previewWidthMm = template.travel === 'Vertical' ? currentBandMm : currentLengthMm;
  const previewHeightMm = template.travel === 'Vertical' ? currentLengthMm : currentBandMm;

  // Exact 1:1 Pixel Dimensions for Export (Defaults to 148 x 1181 px for Vertical, 1181 x 148 px for Horizontal)
  // 148 px matches the actual physical 12.5 mm printhead swath @ 300 DPI, preventing edge cutoff
  const defaultWidthPx = template.customWidthPx || (template.travel === 'Vertical' ? 148 : 1181);
  const defaultHeightPx = template.customHeightPx || (template.travel === 'Vertical' ? 1181 : 148);

  const [exportWidthPx, setExportWidthPx] = useState<number>(defaultWidthPx);
  const [exportHeightPx, setExportHeightPx] = useState<number>(defaultHeightPx);
  const [exportOrientation, setExportOrientation] = useState<'1to1' | 'rotate90' | 'rotate180' | 'rotate270'>(
    template.customDownloadOrientation || '1to1'
  );
  const [contentScale, setContentScale] = useState<number>(1.0); // 100% design scale on canvas
  const [isFitEdgeToEdge, setIsFitEdgeToEdge] = useState<boolean>(false);

  // Effective preview dimensions respecting live rotation
  const isRotated90or270 = exportOrientation === 'rotate90' || exportOrientation === 'rotate270';
  const effectivePreviewWidthMm = isRotated90or270 ? previewHeightMm : previewWidthMm;
  const effectivePreviewHeightMm = isRotated90or270 ? previewWidthMm : previewHeightMm;

  // Base scale (10 px per mm at 100%)
  const previewBasePx = 10;
  const scaledPreviewWidthPx = Math.round(effectivePreviewWidthMm * previewBasePx * zoomScale);
  const scaledPreviewHeightPx = Math.round(effectivePreviewHeightMm * previewBasePx * zoomScale);

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
      const canvas = renderTemplateToCanvas(template, machine, values, {
        forPrinterView: false, // Pure smooth direct canvas - crisp high-resolution rendering
        widthMm: previewWidthMm,
        heightMm: previewHeightMm,
        targetWidthPx: exportWidthPx,
        targetHeightPx: exportHeightPx,
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
  }, [template, machine, values, exportWidthPx, exportHeightPx, exportOrientation, contentScale, isFitEdgeToEdge]);

  // Quality validation
  const issues = validateTemplateQuality(template, machine, packProfile);

  // Pass plan
  const passPlan = buildPassPlan(template, machine, packProfile, currentBatch?.id || 'TP014');

  // One-click repair
  const handleRepairAll = () => {
    const res = fitObjectsToBand(template, machine, packProfile);
    onUpdateTemplate(res.template);
  };

  // Standard Windows BMP Download (Exact 1:1 Pixel Match - No forced rotation)
  const handleDownloadBmp = () => {
    const canvas = renderTemplateToCanvas(template, machine, values, {
      forDownload: true,
      widthMm: previewWidthMm,
      heightMm: previewHeightMm,
      targetWidthPx: exportWidthPx,
      targetHeightPx: exportHeightPx,
      downloadOrientation: exportOrientation,
      contentScale: contentScale,
      fitEdgeToEdge: isFitEdgeToEdge
    });
    const bmpBlob = canvasToStandardBmp(canvas);
    const fileName = `${(currentBatch?.id || 'TP014').toUpperCase()}A.BMP`;

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
    const canvas = renderTemplateToCanvas(template, machine, values, {
      forDownload: true,
      widthMm: previewWidthMm,
      heightMm: previewHeightMm,
      targetWidthPx: exportWidthPx,
      targetHeightPx: exportHeightPx,
      downloadOrientation: exportOrientation,
      contentScale: contentScale,
      fitEdgeToEdge: isFitEdgeToEdge
    });
    const bmpBlob = canvasTo1BitBmp(canvas);
    const fileName = `${(currentBatch?.id || 'TP014').toUpperCase()}A_1BIT.BMP`;

    const url = URL.createObjectURL(bmpBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setExportCompleteMsg(`Exported ${fileName} (Pure 1-bit monochrome BMP - exact 1:1 match: ${canvas.width}px × ${canvas.height}px, ${exportOrientation === '1to1' ? '0° upright' : exportOrientation})`);
  };

  // ZIP Package with INDEX.TXT Download
  const handleDownloadZip = async () => {
    setIsExporting(true);
    try {
      const canvas = renderTemplateToCanvas(template, machine, values, {
        forDownload: true,
        widthMm: previewWidthMm,
        heightMm: previewHeightMm,
        targetWidthPx: exportWidthPx,
        targetHeightPx: exportHeightPx,
        downloadOrientation: exportOrientation,
        contentScale: contentScale,
        fitEdgeToEdge: isFitEdgeToEdge
      });
      const bmpBlob = canvasToStandardBmp(canvas);
      const raw1BitBlob = canvasTo1BitBmp(canvas);
      const bmpName = `${(currentBatch?.id || 'TP014').toUpperCase()}A.BMP`;
      const rawName = `${(currentBatch?.id || 'TP014').toUpperCase()}A_1BIT.BMP`;

      const files = [
        {
          filename: bmpName,
          blob: bmpBlob,
          description: `Pass 1 of 1: ${currentProduct?.name || 'Product'} ${currentAlloc?.packSize || '100g'} (Universal Standard BMP)`
        },
        {
          filename: rawName,
          blob: raw1BitBlob,
          description: `Pass 1 of 1: 1-Bit Raw Controller Binary BMP`
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
      a.download = `${(currentBatch?.id || 'TP014').toUpperCase()}_PRINT_PACKAGE.ZIP`;
      a.click();
      URL.revokeObjectURL(url);

      setExportCompleteMsg('Production ZIP package generated successfully with INDEX.TXT manifest.');
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
    setIsTransmitting(true);
    try {
      const canvas = renderTemplateToCanvas(template, machine, values, {
        forDownload: true
      });
      const bmpBlob = canvasTo1BitBmp(canvas);

      if (transportType === 'network_socket') {
        hardwareManager.setNetworkConfig({ ip: networkIp, port: networkPort });
      }

      const res = await hardwareManager.dispatchPrintJob(transportType, bmpBlob);
      setExportCompleteMsg(res.message);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsTransmitting(false);
    }
  };

  const handleMarkAsPrinted = () => {
    if (!currentBatch || !currentAlloc) return;
    onMarkPrinted(currentBatch.id, currentAlloc.id, currentAlloc.expectedPacks);
    setProofStatus('Production Ready');
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
          <span className="text-xs text-zinc-400">Proof Status:</span>
          <select
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
                <label className="text-zinc-400 block mb-1">Production Batch</label>
                <select
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
                    type="text"
                    value={networkIp}
                    onChange={e => setNetworkIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="col-span-2 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                  <input
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
            {/* Preview Header & Zoom Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>2. Live Physical Preview</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                    Direct Canvas Preview (Crisp 300 DPI)
                  </span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  {machine.name} ({machine.technology}) • {machine.printBandMm} mm usable band @ {machine.defaultDpi} DPI
                </p>
              </div>

              {/* Zoom Controls & Refresh */}
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs text-zinc-300">
                  <button
                    onClick={() => setZoomScale(Math.max(0.4, Math.round((zoomScale - 0.25) * 100) / 100))}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] px-1 text-amber-400 min-w-10 text-center font-bold">
                    {Math.round(zoomScale * 100)}%
                  </span>
                  <button
                    onClick={() => setZoomScale(Math.min(3.5, Math.round((zoomScale + 0.25) * 100) / 100))}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white"
                    title="Zoom In (+)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoomScale(1.0)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                      zoomScale === 1.0 ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                    title="1:1 Physical Scale"
                  >
                    100%
                  </button>
                  <button
                    onClick={() => setZoomScale(1.5)}
                    className={`px-1.5 py-0.5 text-[10px] rounded font-semibold transition-colors ${
                      zoomScale === 1.5 ? 'bg-amber-500 text-black font-bold' : 'text-zinc-400 hover:bg-zinc-800'
                    }`}
                    title="150% Scale"
                  >
                    150%
                  </button>
                  <button
                    onClick={handleFitPreview}
                    className="px-1.5 py-0.5 text-[10px] hover:bg-zinc-800 rounded font-semibold text-zinc-400 hover:text-white"
                    title="Fit entire substrate within view"
                  >
                    Fit
                  </button>
                </div>

                <button
                  onClick={updatePreview}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                  title="Force Refresh Live Preview"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Dedicated Image Editor & Swath Adjustment Toolbar (Edge-to-Edge, Content Zoom, Rotation) */}
            <div className="bg-zinc-950 rounded-xl p-3 border border-zinc-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Fit Edge-to-Edge Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsFitEdgeToEdge(!isFitEdgeToEdge)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                      isFitEdgeToEdge
                        ? 'bg-emerald-500 text-black ring-2 ring-emerald-400/50'
                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700'
                    }`}
                    title="Scale and fit elements edge-to-edge across the 148 px swath with 2% safety margins"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Fit Edge-to-Edge: {isFitEdgeToEdge ? 'ON' : 'OFF'}</span>
                  </button>

                  {/* Artwork Zoom / Content Scale Stepper */}
                  <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1">
                    <span className="text-[10px] text-zinc-400 font-mono uppercase">Design Zoom:</span>
                    <button
                      type="button"
                      onClick={() => setContentScale(prev => Math.max(0.70, Math.round((prev - 0.05) * 100) / 100))}
                      className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold"
                      title="Scale down artwork (-5%)"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs text-amber-400 font-bold px-1 min-w-[42px] text-center">
                      {Math.round(contentScale * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setContentScale(prev => Math.min(1.30, Math.round((prev + 0.05) * 100) / 100))}
                      className="w-5 h-5 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-bold"
                      title="Scale up artwork (+5%)"
                    >
                      +
                    </button>
                    {contentScale !== 1.0 && (
                      <button
                        type="button"
                        onClick={() => setContentScale(1.0)}
                        className="text-[10px] text-zinc-400 hover:text-white underline ml-1"
                        title="Reset design zoom to 100%"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Instant Angle / Rotation Selector */}
                <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-lg p-1 text-xs">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono px-1 flex items-center gap-1">
                    <RotateCw className="w-3 h-3 text-amber-400" />
                    Angle:
                  </span>
                  <button
                    type="button"
                    onClick={() => setExportOrientation('1to1')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      exportOrientation === '1to1'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="0° Upright (Default 1:1)"
                  >
                    0° (1:1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportOrientation('rotate90')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      exportOrientation === 'rotate90'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="Rotate 90° Clockwise"
                  >
                    90°
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportOrientation('rotate180')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      exportOrientation === 'rotate180'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="Rotate 180° Inverted"
                  >
                    180°
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportOrientation('rotate270')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors ${
                      exportOrientation === 'rotate270'
                        ? 'bg-amber-500 text-black'
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                    }`}
                    title="Rotate 270° Counter-Clockwise"
                  >
                    270°
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-zinc-900">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Physical Printhead Sync: 148 px swath (12.5 mm @ 300 DPI) prevents edge cut-off</span>
                </span>
                <span className="text-zinc-500">
                  Preview & export update in real time
                </span>
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
                  className="relative bg-white shadow-2xl rounded-xs border-2 border-zinc-400 p-2 m-auto shrink-0 transition-transform cursor-default"
                  style={{
                    width: `${scaledPreviewWidthPx + 16}px`,
                    height: `${scaledPreviewHeightPx + 16}px`
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
              <span>Mode: {template.travel} + {template.layout}</span>
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
                  {(currentBatch?.id || 'TP014').toUpperCase()}A.BMP
                </div>
              </div>
            </div>

            {/* 1:1 Pixel-by-Pixel Injector Swath & Download Ratio Configuration */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-amber-500/40 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                <div>
                  <h4 className="font-bold uppercase tracking-wider text-amber-400 text-xs flex items-center gap-1.5">
                    <span>1:1 Injector Screen & Swath Resolution</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-mono font-bold">
                      Exact 1:1 Pixel Match
                    </span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Matches your injector screen pixel-by-pixel. 0° font angle ensures text reads upright with no manual rotation on the printer.
                  </p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="text-zinc-400">Current Output:</span>
                  <span className="px-2.5 py-1 rounded-md bg-zinc-900 border border-amber-500/50 text-amber-300 font-bold">
                    {exportWidthPx} × {exportHeightPx} px (1:1 Ratio)
                  </span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-zinc-400">Resolution Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    setExportWidthPx(148);
                    setExportHeightPx(1181);
                    setExportOrientation('1to1');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    exportWidthPx === 148 && exportHeightPx === 1181 && exportOrientation === '1to1'
                      ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="148 x 1181 px (12.5mm Hardware Printhead Swath @ 300 DPI - Zero Edge Cutoff)"
                >
                  ★ 148 × 1181 px (12.5mm Print Swath)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportWidthPx(150);
                    setExportHeightPx(1181);
                    setExportOrientation('1to1');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    exportWidthPx === 150 && exportHeightPx === 1181 && exportOrientation === '1to1'
                      ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="150 x 1181 px (12.7mm HP TIJ 2.5 Standard @ 300 DPI)"
                >
                  150 × 1181 px (12.7mm)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportWidthPx(248);
                    setExportHeightPx(1181);
                    setExportOrientation('1to1');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    exportWidthPx === 248 && exportHeightPx === 1181 && exportOrientation === '1to1'
                      ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="248 x 1181 px (TIJ Injector Screen Resolution)"
                >
                  248 × 1181 px (Screen)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportWidthPx(295);
                    setExportHeightPx(1181);
                    setExportOrientation('1to1');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    exportWidthPx === 295 && exportHeightPx === 1181 && exportOrientation === '1to1'
                      ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="295 x 1181 px (25.0mm Dual Head @ 300 DPI)"
                >
                  295 × 1181 px (25mm)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setExportWidthPx(1181);
                    setExportHeightPx(148);
                    setExportOrientation('1to1');
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                    exportWidthPx === 1181 && exportHeightPx === 148 && exportOrientation === '1to1'
                      ? 'bg-amber-500 text-black shadow-sm ring-2 ring-amber-400/50'
                      : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                  }`}
                  title="1181 x 148 px (Horizontal Conveyor 1:1)"
                >
                  1181 × 148 px (Horizontal)
                </button>
              </div>

              {/* Custom Dimensions & Orientation Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-zinc-800/80">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Export Width (Pixels):
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="30"
                      max="4000"
                      value={exportWidthPx}
                      onChange={e => setExportWidthPx(parseInt(e.target.value) || 148)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 font-mono font-bold text-amber-400 text-xs"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">px</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">
                    ≈ {(exportWidthPx / (300 / 25.4)).toFixed(1)} mm @ 300 DPI
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">
                    Export Height (Pixels):
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="30"
                      max="8000"
                      value={exportHeightPx}
                      onChange={e => setExportHeightPx(parseInt(e.target.value) || 1181)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1 font-mono font-bold text-amber-400 text-xs"
                    />
                    <span className="text-[10px] text-zinc-500 font-mono">px</span>
                  </div>
                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5 block">
                    ≈ {(exportHeightPx / (300 / 25.4)).toFixed(1)} mm @ 300 DPI
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
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                        exportOrientation === '1to1'
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="Direct 1:1 As Designed - 0° Font Angle (No Rotation)"
                    >
                      0° As-Is (1:1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('rotate90')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                        exportOrientation === 'rotate90'
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="Rotate 90° Clockwise"
                    >
                      Rotate 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('rotate180')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                        exportOrientation === 'rotate180'
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="Rotate 180°"
                    >
                      Rotate 180°
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('rotate270')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                        exportOrientation === 'rotate270'
                          ? 'bg-amber-500 text-black'
                          : 'bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white'
                      }`}
                      title="Rotate 270°"
                    >
                      Rotate 270°
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Export & Actions Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-800">
              <div className="flex items-center gap-2">
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
              <li>Open the printer file manager, select <code>{(currentBatch?.id || 'TP014').toUpperCase()}A.BMP</code>, and verify on-screen preview.</li>
              <li>Perform 1 test sweep on scrap material to confirm alignment before printing the production run.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
