/**
 * Batches & Allocations Workspace View
 * Deterministic pack count calculations, loose balance tracking, and New Batch Wizard
 */

import React, { useState } from 'react';
import { 
  Layers, 
  Plus, 
  Printer, 
  Package, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  ShieldAlert,
  Calendar,
  FileText,
  Trash2
} from 'lucide-react';
import type { Batch, BatchAllocation, Product, SKU } from '../../types';
import { createBatchCommand, generateNextBatchId } from '../../domain/batchCommands';
import { parseDateInput, calculateBestBeforeDate, formatCalendarDateDMY } from '../../domain/dates';

interface BatchesViewProps {
  batches: Batch[];
  products: Product[];
  skus: SKU[];
  activeBatch: Batch | null;
  onSelectBatch: (b: Batch) => void;
  onCreateBatch: (b: Batch) => void;
  onNavigateToPrint: (b: Batch, allocId?: string) => void;
  onUpdateBatch: (b: Batch) => void;
}

export const BatchesView: React.FC<BatchesViewProps> = ({
  batches,
  products,
  skus,
  activeBatch,
  onSelectBatch,
  onCreateBatch,
  onNavigateToPrint,
  onUpdateBatch
}) => {
  const [showNewWizard, setShowNewWizard] = useState(false);
  const [showLoosePackModal, setShowLoosePackModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New batch wizard state
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [batchIdInput, setBatchIdInput] = useState('ADTP014');
  const [rawKgInput, setRawKgInput] = useState(50);
  const [lotDateInput, setLotDateInput] = useState(new Date().toISOString().slice(0, 10));

  // Dynamic allocations in wizard
  interface WizardAllocRow {
    id: string;
    packSize: string;
    allocatedKg: number;
    mrp: string;
  }

  const [wizardAllocations, setWizardAllocations] = useState<WizardAllocRow[]>([
    { id: 'row_1', packSize: '100 g', allocatedKg: 15, mrp: '50' },
    { id: 'row_2', packSize: '500 g', allocatedKg: 15, mrp: '220' }
  ]);
  const [mrpErrorAlert, setMrpErrorAlert] = useState('');

  // Synchronize product ID when products load
  React.useEffect(() => {
    if (!selectedProductId && products[0]) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  // Selected batch for detail view
  const currentBatch = activeBatch || batches[0];
  const currentProduct = products.find(p => p.id === currentBatch?.productId);

  // Calculate loose balance for current batch
  const totalAllocatedKg = currentBatch?.allocations?.reduce((sum, a) => sum + (a.allocatedKg || 0), 0) || 0;
  const looseBalanceKg = currentBatch ? Math.max(0, currentBatch.rawMaterialKg - totalAllocatedKg) : 0;

  // New allocation from loose state
  const [packSizeFromLoose, setPackSizeFromLoose] = useState('100 g');
  const [kgFromLoose, setKgFromLoose] = useState(5);

  const parsePackGrams = (sz: string): number => {
    if (!sz) return 100;
    const clean = sz.toLowerCase().trim();
    if (clean.includes('kg')) {
      const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
      return (val || 1) * 1000;
    }
    const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
    return val || 100;
  };

  const handleOpenWizard = () => {
    const prod = products.find(p => p.id === selectedProductId) || products[0];
    const nextId = generateNextBatchId(prod?.batchPrefix || 'ADTP', batches);
    setBatchIdInput(nextId);
    setRawKgInput(50);
    setMrpErrorAlert('');
    setLotDateInput(new Date().toISOString().slice(0, 10));

    // Pre-populate with actual enabled SKUs for this product (WF-015)
    const enabledSkus = skus.filter(s => s.productId === prod?.id && s.enabled);
    const initialRows = (enabledSkus.length > 0
      ? enabledSkus.slice(0, 2).map((s, idx) => ({
          id: `alloc_${Date.now()}_${idx + 1}`,
          packSize: s.packSize,
          allocatedKg: 15,
          mrp: s.mrp ? String(s.mrp) : ''
        }))
      : [
          { id: `alloc_${Date.now()}_1`, packSize: '100 g', allocatedKg: 15, mrp: '' },
          { id: `alloc_${Date.now()}_2`, packSize: '500 g', allocatedKg: 15, mrp: '' }
        ]
    );
    setWizardAllocations(initialRows);
    setShowNewWizard(true);
  };

  const handleAddWizardAllocRow = (suggestedSize = '200 g') => {
    const prod = products.find(p => p.id === selectedProductId) || products[0];
    const matched = skus.find(s => s.productId === prod?.id && s.packSize.toLowerCase() === suggestedSize.toLowerCase());
    const mrp = matched?.mrp ? String(matched.mrp) : '';
    setWizardAllocations(prev => [
      ...prev,
      {
        id: `alloc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        packSize: suggestedSize,
        allocatedKg: 5,
        mrp
      }
    ]);
  };

  const handleRemoveWizardAllocRow = (id: string) => {
    setWizardAllocations(prev => prev.filter(r => r.id !== id));
  };

  const handleUpdateWizardAllocRow = (id: string, field: 'packSize' | 'allocatedKg' | 'mrp', val: any) => {
    setWizardAllocations(prev => prev.map(r => r.id === id ? { ...r, [field]: val } : r));
    setMrpErrorAlert('');
  };

  const wizardTotalAllocatedKg = wizardAllocations.reduce((sum, a) => sum + (Number(a.allocatedKg) || 0), 0);
  const wizardRemainingLooseKg = Math.max(0, (Number(rawKgInput) || 0) - wizardTotalAllocatedKg);

  const handleCreateBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find(p => p.id === selectedProductId) || products[0];
    if (!prod) {
      setMrpErrorAlert('Please select a valid product first.');
      return;
    }

    const effectiveBatchId = (batchIdInput || '').trim() || generateNextBatchId(prod.batchPrefix || 'ADTP', batches);

    // Call pure domain command (validates uniqueness, mass balance, dates, pack counts)
    const result = createBatchCommand(
      {
        batchId: effectiveBatchId,
        productId: prod.id,
        rawMaterialKg: Number(rawKgInput) || 0,
        lotDate: lotDateInput || new Date().toISOString().slice(0, 10),
        allocations: wizardAllocations.map(r => ({
          packSize: r.packSize,
          allocatedKg: Number(r.allocatedKg) || 0,
          mrp: r.mrp ? parseFloat(r.mrp) : undefined,
        })),
      },
      prod,
      skus,
      batches
    );

    if (!result.success || !result.batch) {
      setMrpErrorAlert(result.error || 'Failed to create batch');
      return;
    }

    onCreateBatch(result.batch);
    onSelectBatch(result.batch);
    setShowNewWizard(false);
    setToastMsg(`✓ Batch ${result.batch.id} created successfully with ${result.batch.allocations.length} pack allocation(s)!`);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handlePackFromLoose = () => {
    if (!currentBatch || kgFromLoose <= 0 || kgFromLoose > looseBalanceKg) return;

    const packGrams = parsePackGrams(packSizeFromLoose);
    const expectedPacks = Math.floor((kgFromLoose * 1000) / packGrams);

    const prod = products.find(p => p.id === currentBatch.productId);
    const sku = skus.find(s => s.productId === currentBatch.productId && s.packSize.toLowerCase() === packSizeFromLoose.toLowerCase());
    const mrp = sku?.mrp;

    let mfdFormatted = '04/11/26';
    let bbFormatted = '03/11/27';
    try {
      const cal = parseDateInput(currentBatch.lotDate || new Date());
      mfdFormatted = formatCalendarDateDMY(cal);
      const shelfLife = sku?.shelfLifeOverrideMonths || prod?.defaultShelfLifeMonths || 12;
      const bb = calculateBestBeforeDate(cal, shelfLife);
      bbFormatted = formatCalendarDateDMY(bb);
    } catch {
      // fallback
    }

    const newAlloc: BatchAllocation = {
      id: `alloc_${Date.now()}`,
      batchId: currentBatch.id,
      skuId: sku?.id || `sku_loose_${packSizeFromLoose.replace(/\s+/g, '_')}`,
      productId: currentBatch.productId,
      packSize: packSizeFromLoose,
      allocatedKg: kgFromLoose,
      expectedPacks,
      mfd: mfdFormatted,
      bestBefore: bbFormatted,
      mrpSnapshot: mrp,
      ratePerGmSnapshot: (mrp && mrp > 0) ? Math.round((mrp / packGrams) * 100) / 100 : undefined,
      templateVersionSnapshot: 1,
      printStatus: 'Pending',
      packsPrinted: 0
    };

    const updatedBatch: Batch = {
      ...currentBatch,
      allocations: [...currentBatch.allocations, newAlloc]
    };

    onUpdateBatch(updatedBatch);
    setShowLoosePackModal(false);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            Production Batches & Material Allocations
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Deterministic pack count calculations, loose balance stock tracking, and batch audit snapshots.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenWizard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Batch</span>
            <kbd className="text-[10px] font-mono bg-amber-600 px-1.5 py-0.2 rounded text-black">N</kbd>
          </button>
        </div>
      </div>

      {/* Main Grid: Batches List & Batch Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Batches List */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">All Batches ({batches.length})</h3>
            <span className="text-[10px] text-zinc-500 font-mono">Use ↑ ↓ to navigate</span>
          </div>

          <div className="space-y-2">
            {batches.map(b => {
              const prod = products.find(p => p.id === b.productId);
              const isSelected = currentBatch?.id === b.id;
              const isHistorical = b.id === 'ADTP013';

              return (
                <div
                  key={b.id}
                  onClick={() => onSelectBatch(b)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-amber-500/10 border-amber-500/60 shadow-sm' 
                      : 'bg-zinc-950 border-zinc-800/80 hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-sm">{b.id}</span>
                      {isHistorical && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          Historical
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      b.status === 'Completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="text-xs text-zinc-200 font-medium">{prod?.name}</div>
                  <div className="text-[11px] text-zinc-500 flex items-center justify-between mt-1 font-mono">
                    <span>Raw: {b.rawMaterialKg} kg</span>
                    <span>{b.lotDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Batch Detail View */}
        <div className="lg:col-span-2 space-y-5">
          {currentBatch ? (
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 space-y-6 shadow-xl">
              {/* Batch Banner Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl font-black font-mono text-amber-400">{currentBatch.id}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {currentProduct?.name} ({currentProduct?.shortCode})
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">
                    Production Lot Date: <strong>{currentBatch.lotDate}</strong> • Status: <strong>{currentBatch.status}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateToPrint(currentBatch)}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-sm"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Batch Labels</span>
                  </button>
                </div>
              </div>

              {/* Material Allocation Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total Raw Material</span>
                  <span className="text-lg font-black font-mono text-zinc-100">{currentBatch.rawMaterialKg} kg</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">Input batch weight</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <span className="text-[10px] uppercase font-bold text-zinc-500 block">Allocated to Packs</span>
                  <span className="text-lg font-black font-mono text-emerald-400">{totalAllocatedKg} kg</span>
                  <span className="text-[10px] text-zinc-500 block mt-0.5">{currentBatch.allocations.length} pack allocations</span>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 block">Loose Stock Balance</span>
                    <span className="text-lg font-black font-mono text-amber-400">{looseBalanceKg} kg</span>
                  </div>
                  {looseBalanceKg > 0 && (
                    <button
                      onClick={() => setShowLoosePackModal(true)}
                      className="mt-1 text-[11px] font-bold text-amber-400 hover:underline text-left"
                    >
                      + Pack from loose later
                    </button>
                  )}
                </div>
              </div>

              {/* Allocations Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                    SKU Pack Allocations ({currentBatch.allocations.length})
                  </h4>
                  {looseBalanceKg > 0 && (
                    <button
                      onClick={() => setShowLoosePackModal(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700"
                    >
                      + Add Allocation
                    </button>
                  )}
                </div>

                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="p-3">Pack Size</th>
                        <th className="p-3">Allocated</th>
                        <th className="p-3">Expected Packs</th>
                        <th className="p-3">MFD</th>
                        <th className="p-3">Best Before</th>
                        <th className="p-3">M.R.P. Snapshot</th>
                        <th className="p-3">Rate / g</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/80 bg-zinc-950/40">
                      {currentBatch.allocations.map(alloc => (
                        <tr key={alloc.id} className="hover:bg-zinc-800/40">
                          <td className="p-3 font-mono font-bold text-amber-400">
                            {alloc.packSize}
                          </td>
                          <td className="p-3 font-mono text-zinc-200">
                            {alloc.allocatedKg} kg
                          </td>
                          <td className="p-3 font-mono font-bold text-emerald-400">
                            {alloc.expectedPacks} packs
                          </td>
                          <td className="p-3 font-mono text-zinc-400">
                            {alloc.mfd}
                          </td>
                          <td className="p-3 font-mono text-zinc-400">
                            {alloc.bestBefore}
                          </td>
                          <td className="p-3 font-mono font-bold text-zinc-100">
                            ₹{alloc.mrpSnapshot}
                          </td>
                          <td className="p-3 font-mono text-zinc-400">
                            ₹{alloc.ratePerGmSnapshot?.toFixed(2)}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onNavigateToPrint(currentBatch, alloc.id)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                            >
                              Print
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-64 rounded-xl border border-dashed border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
              Select or create a batch to view allocations.
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Batch Wizard */}
      {showNewWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={handleCreateBatchSubmit} className="w-full max-w-xl rounded-2xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Production Batch & Allocate Packs</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Deterministic mathematical allocations with strict compliance checks for missing MRPs.
              </p>
            </div>

            {mrpErrorAlert && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500 text-rose-200 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p>{mrpErrorAlert}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Product Item</label>
                <select
                  value={selectedProductId}
                  onChange={e => {
                    setSelectedProductId(e.target.value);
                    const p = products.find(prod => prod.id === e.target.value);
                    if (p) setBatchIdInput(`${p.batchPrefix}014`);
                  }}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.shortCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Batch ID Sequence</label>
                <input
                  type="text"
                  value={batchIdInput}
                  onChange={e => setBatchIdInput(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono uppercase text-amber-400 font-bold focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Total Raw Material (kg)</label>
                <input
                  type="number"
                  value={rawKgInput}
                  onChange={e => setRawKgInput(parseFloat(e.target.value) || 0)}
                  min="1"
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Manufacturing Date</label>
                <input
                  type="date"
                  value={lotDateInput}
                  onChange={e => setLotDateInput(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Dynamic Production Pack Allocations Section */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400 block">
                    Production Pack Allocations
                  </span>
                  <span className="text-[10px] text-zinc-400">
                    Create your own custom pack sizes (100g, 500g, 200g, 1kg, etc.) with verified M.R.P.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddWizardAllocRow()}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Pack Size</span>
                </button>
              </div>

              {/* Dynamic Rows */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {wizardAllocations.map((alloc) => {
                  const grams = parsePackGrams(alloc.packSize);
                  const expectedPacks = alloc.allocatedKg > 0 ? Math.floor((alloc.allocatedKg * 1000) / grams) : 0;
                  const mrpNum = parseFloat(alloc.mrp) || 0;
                  const ratePerGm = mrpNum > 0 && grams > 0 ? (mrpNum / grams).toFixed(2) : '0.00';

                  return (
                    <div
                      key={alloc.id}
                      className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center text-xs"
                    >
                      {/* Pack Size Selector / Input */}
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Pack Size</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={alloc.packSize}
                            onChange={e => handleUpdateWizardAllocRow(alloc.id, 'packSize', e.target.value)}
                            placeholder="e.g. 100 g, 500 g"
                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-bold text-zinc-200"
                          />
                          {/* Quick size dropdown */}
                          <select
                            onChange={e => {
                              if (e.target.value) handleUpdateWizardAllocRow(alloc.id, 'packSize', e.target.value);
                            }}
                            value=""
                            className="bg-zinc-800 border border-zinc-700 text-zinc-400 rounded px-1 py-1 text-[10px]"
                            title="Pick common preset"
                          >
                            <option value="">Preset</option>
                            <option value="50 g">50 g</option>
                            <option value="100 g">100 g</option>
                            <option value="200 g">200 g</option>
                            <option value="250 g">250 g</option>
                            <option value="500 g">500 g</option>
                            <option value="1 kg">1 kg</option>
                            <option value="2 kg">2 kg</option>
                            <option value="5 kg">5 kg</option>
                          </select>
                        </div>
                      </div>

                      {/* Allocated (kg) */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-zinc-400 block mb-0.5">Allocated (kg)</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={alloc.allocatedKg}
                            onChange={e => handleUpdateWizardAllocRow(alloc.id, 'allocatedKg', parseFloat(e.target.value) || 0)}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                          />
                          <span className="text-[10px] text-zinc-500 font-mono">kg</span>
                        </div>
                      </div>

                      {/* M.R.P. (₹) */}
                      <div className="sm:col-span-3">
                        <label className="text-[10px] text-amber-300 font-semibold block mb-0.5">M.R.P. (₹) *</label>
                        <input
                          type="number"
                          placeholder="e.g. 50"
                          value={alloc.mrp}
                          onChange={e => handleUpdateWizardAllocRow(alloc.id, 'mrp', e.target.value)}
                          className="w-full bg-zinc-950 border border-amber-500/50 rounded px-2 py-1 font-mono font-bold text-amber-300"
                        />
                      </div>

                      {/* Calculated Stats & Remove */}
                      <div className="sm:col-span-2 flex items-center justify-between gap-1 pt-3 sm:pt-0">
                        <div className="text-[10px] font-mono leading-tight">
                          <span className="text-emerald-400 font-bold block">{expectedPacks} pk</span>
                          <span className="text-zinc-500 text-[9px]">₹{ratePerGm}/g</span>
                        </div>
                        {wizardAllocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveWizardAllocRow(alloc.id)}
                            className="p-1 rounded hover:bg-rose-950/50 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Remove this pack allocation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary Bar */}
              <div className="border-t border-zinc-800 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-zinc-400">
                  Allocated: <strong className="text-emerald-400">{wizardTotalAllocatedKg} kg</strong> of {rawKgInput} kg
                </span>
                <span className="text-zinc-400">
                  Remaining Loose Balance:{' '}
                  <strong className={wizardRemainingLooseKg > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                    {wizardRemainingLooseKg} kg
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowNewWizard(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Create Batch & Allocations
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Pack from loose */}
      {showLoosePackModal && currentBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Pack From Loose Balance</h3>
            <p className="text-xs text-zinc-400">
              Available loose material: <strong>{looseBalanceKg} kg</strong> in Batch {currentBatch.id}.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Target Pack Size</label>
                <select
                  value={packSizeFromLoose}
                  onChange={e => setPackSizeFromLoose(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200"
                >
                  {['100 g', '200 g', '500 g', '1 kg', '2 kg', '5 kg'].map(sz => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Weight to Pack (kg)</label>
                <input
                  type="number"
                  value={kgFromLoose}
                  onChange={e => setKgFromLoose(parseFloat(e.target.value) || 0)}
                  max={looseBalanceKg}
                  min="0.1"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-emerald-400 font-bold">
                Expected Packs: {Math.floor((kgFromLoose * 1000) / (packSizeFromLoose.includes('kg') ? parseFloat(packSizeFromLoose) * 1000 : parseFloat(packSizeFromLoose)))} packs
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowLoosePackModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handlePackFromLoose}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Confirm Allocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
