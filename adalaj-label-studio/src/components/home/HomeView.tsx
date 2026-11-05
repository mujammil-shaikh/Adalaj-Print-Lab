/**
 * Home Workspace View
 * Quick start cards, open production batches, loose stock balances, machine status,
 * and a prominent interactive Live Production Label & Pouch Preview card.
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Play, 
  Printer, 
  Layers, 
  Package, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  Eye,
  PenTool,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import type { Batch, Product, SKU, MachineProfile, Template, PackProfile } from '../../types';
import { renderTemplateToCanvas } from '../../services/printTransform';
import { parseDateInput, calculateBestBeforeDate, formatCalendarDateDMY } from '../../domain/dates';

interface HomeViewProps {
  batches: Batch[];
  products: Product[];
  skus: SKU[];
  template?: Template | null;
  activeBatch?: Batch | null;
  activeMachine?: MachineProfile | null;
  onNavigate: (route: string) => void;
  onSelectBatch: (b: Batch) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  batches,
  products,
  skus,
  template,
  activeBatch,
  activeMachine,
  onNavigate,
  onSelectBatch
}) => {
  const [previewMode, setPreviewMode] = useState<'pouch' | 'band' | 'raster'>('pouch');
  const [selectedPreviewSkuId, setSelectedPreviewSkuId] = useState<string>('');
  const [zoomFactor, setZoomFactor] = useState<number>(1.5);
  const [rasterDataUrl, setRasterDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const openBatches = batches.filter(b => b.status === 'Open');
  const completedBatches = batches.filter(b => b.status === 'Completed');

  const currentBatch = activeBatch || batches[0];
  const currentProduct = products.find(p => p.id === currentBatch?.productId) || products[0];

  // Synchronize preview SKU to current product (WF-004)
  useEffect(() => {
    if (currentProduct) {
      const productSkus = skus.filter(s => s.productId === currentProduct.id && s.enabled);
      if (productSkus.length > 0 && !productSkus.some(s => s.id === selectedPreviewSkuId)) {
        const defaultSku = productSkus.find(s => s.packSize === '100 g') || productSkus[0];
        setSelectedPreviewSkuId(defaultSku.id);
      }
    }
  }, [currentProduct?.id, skus, selectedPreviewSkuId]);

  const activeSku = skus.find(s => s.id === selectedPreviewSkuId && s.productId === currentProduct?.id) ||
                    skus.find(s => s.productId === currentProduct?.id) ||
                    skus[0];

  // Derived values for live preview - truthful dates and commercial data (P0-03, WF-004)
  const liveValues = useMemo<Record<string, string>>(() => {
    const netGrams = activeSku?.netWeightGrams || 100;
    const mrp = activeSku?.mrp ? `₹${activeSku.mrp}` : '[Needs MRP]';
    const rate = activeSku?.mrp ? `₹${(activeSku.mrp / netGrams).toFixed(2)}` : '[Needs Rate]';

    let mfdStr = '[Sample MFD]';
    let bbStr = '[Sample Expiry]';
    if (currentBatch?.lotDate) {
      try {
        const cal = parseDateInput(currentBatch.lotDate);
        mfdStr = formatCalendarDateDMY(cal);
        const shelfLife = activeSku?.shelfLifeOverrideMonths || currentProduct?.defaultShelfLifeMonths || 12;
        const bb = calculateBestBeforeDate(cal, shelfLife);
        bbStr = formatCalendarDateDMY(bb);
      } catch {
        // Keep sample label
      }
    }

    return {
      mrp,
      batch: currentBatch?.id || '[Sample Batch]',
      net_wt: activeSku?.packSize ? activeSku.packSize.toUpperCase() : '100 GM',
      mfd: mfdStr,
      best_before: bbStr,
      rate_per_gm: rate,
      product: currentProduct?.name || 'Product',
      brand: 'ADALAJ',
      pack_size: activeSku?.packSize || '100 g'
    };
  }, [activeSku, currentBatch, currentProduct]);

  // Update canvas/raster preview
  useEffect(() => {
    if (!template || !activeMachine) return;
    try {
      const canvas = renderTemplateToCanvas(template, activeMachine, liveValues, {
        forPrinterView: previewMode === 'raster'
      });
      setRasterDataUrl(canvas.toDataURL('image/png'));

      if (canvasRef.current) {
        const dest = canvasRef.current;
        dest.width = canvas.width;
        dest.height = canvas.height;
        const ctx = dest.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, dest.width, dest.height);
          ctx.drawImage(canvas, 0, 0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [template, activeMachine, liveValues, previewMode]);

  // Compute loose stock summary across products
  const looseStockSummary = products.map(prod => {
    const prodBatches = batches.filter(b => b.productId === prod.id);
    let totalRaw = 0;
    let totalAlloc = 0;
    prodBatches.forEach(b => {
      totalRaw += b.rawMaterialKg;
      b.allocations.forEach(a => {
        totalAlloc += a.allocatedKg;
      });
    });
    const loose = Math.max(0, totalRaw - totalAlloc);
    return {
      product: prod,
      looseKg: loose,
      batchCount: prodBatches.length
    };
  });

  const machineName = activeMachine?.name || 'R2D2-SX100';
  const machineTech = activeMachine?.technology || 'TIJ Inkjet';
  const machineHead = activeMachine?.headWidthMm || 12.7;
  const machineBand = activeMachine?.printBandMm || 12.5;
  const machineDpi = activeMachine?.defaultDpi || 300;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Platform Banner */}
      <div className="rounded-2xl bg-linear-to-r from-zinc-900 via-zinc-900 to-amber-950/40 border-2 border-zinc-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500 text-black">
              Universal Platform
            </span>
            <span className="text-xs text-zinc-400 font-mono">Any surface • Any printer • Physical mm precision</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            ADALAJ Production Label Studio
          </h2>
          <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
            High-precision, keyboard-first label design and print management. Configured for <strong>{machineName}</strong> ({machineTech}, {machineHead} mm head, usable {machineBand} mm band @ {machineDpi} DPI).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('batches')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all"
          >
            <Play className="w-4 h-4" />
            <span>Start New Batch</span>
            <kbd className="text-[10px] font-mono bg-amber-600 px-1.5 py-0.5 rounded text-black">N</kbd>
          </button>
        </div>
      </div>

      {/* PROMINENT LIVE PRODUCTION LABEL & POUCH PREVIEW CARD */}
      <div className="rounded-2xl bg-zinc-900 border-2 border-amber-500/50 shadow-2xl p-6 space-y-5">
        {/* Preview Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Live Production Label Preview</span>
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ready to Print
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Batch: <strong className="text-amber-400 font-mono">{currentBatch?.id || 'ADTP014'}</strong> • Product: <strong className="text-zinc-200">{currentProduct?.name}</strong> • Head: <strong className="text-zinc-200">{machineBand} mm ({machineDpi} DPI)</strong>
              </p>
            </div>
          </div>

          {/* Mode Switcher & SKU Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* SKU Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs">
              <label htmlFor="home-preview-sku-select" className="text-zinc-500 text-[11px] cursor-pointer">Preview SKU:</label>
              <select
                id="home-preview-sku-select"
                name="previewSku"
                aria-label="Preview SKU for active batch"
                value={selectedPreviewSkuId}
                onChange={e => setSelectedPreviewSkuId(e.target.value)}
                className="bg-transparent text-amber-400 font-mono font-bold focus:outline-hidden"
              >
                {skus.filter(s => s.productId === currentProduct?.id && s.enabled).map(s => (
                  <option key={s.id} value={s.id} className="bg-zinc-950 text-zinc-200">
                    {currentProduct?.shortCode || 'AD'} {s.packSize} {s.mrp ? `(₹${s.mrp})` : '(Needs MRP)'}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Buttons */}
            <div className="flex rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setPreviewMode('pouch')}
                className={`px-3 py-1 rounded transition-colors ${
                  previewMode === 'pouch' ? 'bg-amber-500 text-black shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Pouch Mockup
              </button>
              <button
                onClick={() => setPreviewMode('band')}
                className={`px-3 py-1 rounded transition-colors ${
                  previewMode === 'band' ? 'bg-amber-500 text-black shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Head Band (1:1)
              </button>
              <button
                onClick={() => setPreviewMode('raster')}
                className={`px-3 py-1 rounded transition-colors ${
                  previewMode === 'raster' ? 'bg-amber-500 text-black shadow-xs font-bold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                1-Bit Machine Raster
              </button>
            </div>

            {/* Zoom Controls for Band/Raster */}
            {previewMode !== 'pouch' && (
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setZoomFactor(Math.max(1.0, zoomFactor - 0.5))}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1 text-amber-400">{Math.round(zoomFactor * 100)}%</span>
                <button
                  onClick={() => setZoomFactor(Math.min(3.0, zoomFactor + 0.5))}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Display Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Main Visual Display (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-6 rounded-xl bg-zinc-950 border border-zinc-800/80 min-h-80 overflow-hidden relative">
            {previewMode === 'pouch' ? (
              /* REALISTIC STAND-UP PACKAGING POUCH SIMULATION */
              <div className="relative w-64 h-96 bg-linear-to-b from-amber-600 via-amber-700 to-amber-900 rounded-2xl shadow-2xl border-4 border-amber-500/80 p-4 flex flex-col justify-between text-white select-none">
                {/* Metallic Top Seal / Zipper */}
                <div className="w-full h-3 bg-linear-to-r from-amber-300 via-yellow-200 to-amber-400 rounded-xs mb-2 shadow-inner border border-amber-200/50" />
                <div className="text-center font-mono text-[9px] uppercase tracking-widest text-amber-200">
                  Seal Area • Easy Open Zipper
                </div>

                {/* Brand & Artwork Area */}
                <div className="text-center space-y-1 my-auto">
                  <div className="inline-block px-3 py-1 rounded-full bg-zinc-950/80 border border-amber-400/80 font-black tracking-widest text-xs text-amber-300 shadow-md">
                    ADALAJ ORGANICS
                  </div>
                  <h4 className="text-lg font-black tracking-tight text-white drop-shadow-md">
                    {currentProduct?.name || 'Turmeric Powder'}
                  </h4>
                  <p className="text-[10px] text-amber-200 font-medium">100% Pure Agmark Certified</p>

                  <div className="inline-block px-2.5 py-0.5 rounded bg-amber-950/70 border border-amber-400/40 text-[11px] font-mono font-bold text-amber-200 mt-2">
                    Net Weight: {activeSku?.packSize || '100 g'}
                  </div>
                </div>

                {/* PHYSICAL VARIABLE PRINT WINDOW (Where Handheld TIJ Prints) */}
                <div className="bg-white text-black p-2.5 rounded-sm shadow-xl border-2 border-dashed border-zinc-800 font-mono text-[10px] leading-tight space-y-0.5 mt-auto">
                  <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-bold border-b border-zinc-300 pb-0.5 mb-1 flex justify-between">
                    <span>Variable Print Band (12.5mm)</span>
                    <span className="text-emerald-700">TIJ Swept</span>
                  </div>
                  <div className="flex justify-between font-bold text-[11px] text-black">
                    <span>M.R.P. :</span>
                    <span>{liveValues.mrp}</span>
                  </div>
                  <div className="flex justify-between font-bold text-zinc-900">
                    <span>Batch No. :</span>
                    <span className="text-zinc-950">{liveValues.batch}</span>
                  </div>
                  <div className="flex justify-between text-zinc-800">
                    <span>Net Wt. :</span>
                    <span>{liveValues.net_wt}</span>
                  </div>
                  <div className="flex justify-between text-zinc-700">
                    <span>Mfg Date :</span>
                    <span>{liveValues.mfd}</span>
                  </div>
                  <div className="flex justify-between text-zinc-700">
                    <span>Best Before :</span>
                    <span>{liveValues.best_before}</span>
                  </div>
                  <div className="flex justify-between text-zinc-600 text-[9px] pt-0.5 border-t border-zinc-200">
                    <span>Rate / g :</span>
                    <span>{liveValues.rate_per_gm}</span>
                  </div>
                </div>
              </div>
            ) : (
              /* HEAD BAND (1:1) / RASTER MODE */
              <div 
                className="relative bg-white shadow-2xl border-2 border-zinc-300 p-2 rounded-xs"
                style={{
                  transform: `scale(${zoomFactor})`,
                  transformOrigin: 'center center'
                }}
              >
                {rasterDataUrl ? (
                  <img 
                    src={rasterDataUrl} 
                    alt="Label Rendered Preview" 
                    className="block max-h-72 object-contain select-none"
                    style={{
                      imageRendering: previewMode === 'raster' ? 'pixelated' : 'auto'
                    }}
                  />
                ) : (
                  <canvas ref={canvasRef} className="block max-h-72 object-contain" />
                )}
              </div>
            )}

            {/* Travel / Orientation Footer Tag */}
            <div className="absolute bottom-3 left-4 text-[10px] font-mono text-zinc-500 bg-zinc-900/90 px-2.5 py-1 rounded border border-zinc-800">
              Sweep: <strong>{template?.travel || 'Vertical'} + {template?.layout || 'Stack'}</strong> • 150 px Head Band @ {machineDpi} DPI
            </div>
          </div>

          {/* Value Inspection & Fast Actions (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block border-b border-zinc-800 pb-1.5">
                Current Print Data Payload
              </span>

              <div className="space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-500">M.R.P. :</span>
                  <span className="font-bold text-white text-sm">{liveValues.mrp}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Batch ID :</span>
                  <span className="font-bold text-amber-400">{liveValues.batch}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Net Weight :</span>
                  <span className="text-zinc-200">{liveValues.net_wt}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-500">MFD Date :</span>
                  <span className="text-zinc-300">{liveValues.mfd}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/60">
                  <span className="text-zinc-500">Best Before :</span>
                  <span className="text-zinc-300">{liveValues.best_before}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Unit Rate :</span>
                  <span className="text-zinc-400">{liveValues.rate_per_gm}</span>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onNavigate('design')}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <PenTool className="w-4 h-4" />
                <span>Customize in Label Designer</span>
                <kbd className="text-[10px] font-mono bg-amber-600 px-1.5 py-0.5 rounded text-black">Alt+4</kbd>
              </button>

              <button
                onClick={() => onNavigate('print')}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-2 border border-zinc-700 shadow-sm transition-all"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                <span>Print & Export 1-Bit BMP</span>
                <kbd className="text-[10px] font-mono bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400">Alt+5</kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Start Batch */}
        <div 
          onClick={() => onNavigate('batches')}
          className="cursor-pointer group p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 transition-all shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Plan & Allocate Batch</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Deterministic allocations, pack counts, shelf-life calculation, and loose balances.
            </p>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 pt-1">Shortcut: Alt+3 or G then B</div>
        </div>

        {/* Card 2: Print & USB */}
        <div 
          onClick={() => onNavigate('print')}
          className="cursor-pointer group p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 transition-all shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Printer className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Print & Hardware Transfer</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Pure 1-bit BMP generation, WebUSB, Bluetooth, Network Socket, and FAT32 USB packages.
            </p>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 pt-1">Shortcut: Alt+5 or G then U</div>
        </div>

        {/* Card 3: Design */}
        <div 
          onClick={() => onNavigate('design')}
          className="cursor-pointer group p-5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/60 transition-all shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-amber-400 transition-colors" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Label Designer</h3>
            <p className="text-xs text-zinc-400 mt-1">
              True mm rulers, 4 Travel x Layout modes, Fit to nozzle, and anti-overlap engine.
            </p>
          </div>
          <div className="text-[11px] font-mono text-zinc-500 pt-1">Shortcut: Alt+4 or G then D</div>
        </div>
      </div>

      {/* Main Grid: Batches Status & Loose Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Batches Table */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-zinc-100">Active Production Batches</h3>
            </div>
            <button
              onClick={() => onNavigate('batches')}
              className="text-xs text-amber-400 hover:underline font-medium"
            >
              View all ({batches.length})
            </button>
          </div>

          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden">
            {batches.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">No active batches created yet.</div>
            ) : (
              batches.map(b => {
                const prod = products.find(p => p.id === b.productId);
                return (
                  <div 
                    key={b.id}
                    onClick={() => {
                      onSelectBatch(b);
                      onNavigate('batches');
                    }}
                    className="p-3.5 flex items-center justify-between hover:bg-zinc-800/60 cursor-pointer transition-colors text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400 text-sm">{b.id}</span>
                      <div>
                        <span className="font-semibold text-zinc-200">{prod?.name || 'Item'}</span>
                        <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5">
                          <span>Raw: {b.rawMaterialKg} kg</span>
                          <span>•</span>
                          <span>Allocations: {b.allocations.length}</span>
                          <span>•</span>
                          <span>{b.lotDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        b.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {b.status}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-zinc-600" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Loose Stock Balance Sidebar */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100">Loose Material Balances</h3>
          </div>
          <p className="text-[11px] text-zinc-400">
            Material not yet packaged into packs. Can be packed from loose stock at any time.
          </p>

          <div className="space-y-2">
            {looseStockSummary.map(({ product, looseKg }) => (
              <div 
                key={product.id}
                className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-medium text-zinc-300 block">{product?.name || 'Item'}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{product?.shortCode || 'CODE'}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-zinc-100 text-sm">{looseKg} kg</span>
                  <span className="text-[10px] text-zinc-500 block">unallocated</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
