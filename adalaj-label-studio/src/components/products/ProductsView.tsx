/**
 * Products & SKUs Workspace View
 * Spreadsheet view, multi-select, inline edit, CSV import/export, and safe bulk edit
 */

import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Download, 
  Upload, 
  Edit3, 
  Trash2, 
  Copy, 
  Sliders, 
  Check, 
  X,
  AlertTriangle,
  ArrowUpDown
} from 'lucide-react';
import type { Product, SKU, DesignScope } from '../../types';

interface ProductsViewProps {
  products: Product[];
  skus: SKU[];
  onUpdateSku: (sku: SKU) => void;
  onCreateProduct: (prod: Product) => void;
  onBulkUpdateSkus: (skuIds: string[], updates: Partial<SKU>) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  skus,
  onUpdateSku,
  onCreateProduct,
  onBulkUpdateSkus
}) => {
  const [search, setSearch] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [selectedSkuIds, setSelectedSkuIds] = useState<Set<string>>(new Set());
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editMrpValue, setEditMrpValue] = useState<string>('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkMrpValue, setBulkMrpValue] = useState('');

  // New product form state
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdShelfLife, setNewProdShelfLife] = useState(12);

  const filteredSkus = skus.filter(sku => {
    const prod = products.find(p => p.id === sku.productId);
    const matchesProd = selectedProductFilter === 'all' || sku.productId === selectedProductFilter;
    const matchesSearch = !search || 
      sku.packSize.toLowerCase().includes(search.toLowerCase()) ||
      prod?.name.toLowerCase().includes(search.toLowerCase()) ||
      prod?.shortCode.toLowerCase().includes(search.toLowerCase());
    return matchesProd && matchesSearch;
  });

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedSkuIds(new Set(filteredSkus.map(s => s.id)));
    } else {
      setSelectedSkuIds(new Set());
    }
  };

  const handleToggleSelectSku = (id: string) => {
    const next = new Set(selectedSkuIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSkuIds(next);
  };

  const startEditMrp = (sku: SKU) => {
    setEditingSkuId(sku.id);
    setEditMrpValue(sku.mrp ? String(sku.mrp) : '');
  };

  const saveEditMrp = (sku: SKU) => {
    const num = parseFloat(editMrpValue);
    onUpdateSku({
      ...sku,
      mrp: isNaN(num) || num <= 0 ? undefined : num
    });
    setEditingSkuId(null);
  };

  const handleApplyBulkMrp = () => {
    const num = parseFloat(bulkMrpValue);
    if (!isNaN(num) && num > 0 && selectedSkuIds.size > 0) {
      onBulkUpdateSkus(Array.from(selectedSkuIds), { mrp: num });
      setShowBulkEditModal(false);
      setBulkMrpValue('');
    }
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdCode) return;

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      brandId: 'brand_adalaj',
      name: newProdName,
      shortCode: newProdCode.toUpperCase(),
      batchPrefix: newProdCode.toUpperCase(),
      defaultShelfLifeMonths: newProdShelfLife,
      allowedPackSizes: ['100 g', '200 g', '500 g', '1 kg']
    };

    onCreateProduct(newProd);
    setShowAddProductModal(false);
    setNewProdName('');
    setNewProdCode('');
  };

  const handleExportCsv = () => {
    let csv = 'Product,ShortCode,PackSize,NetGrams,Unit,MRP,Enabled\r\n';
    skus.forEach(s => {
      const p = products.find(prod => prod.id === s.productId);
      csv += `"${p?.name || ''}","${p?.shortCode || ''}","${s.packSize}",${s.netWeightGrams},"${s.unit}",${s.mrp ?? ''},${s.enabled}\r\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADALAJ_SKU_CATALOG_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            Products & SKU Master Matrix
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage product items, pack sizes, and M.R.P. pricing across all physical packaging profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedSkuIds.size > 0 && (
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/40 text-xs font-bold"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedSkuIds.size})</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300 font-semibold"
            title="Export CSV (Ctrl+Shift+E)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search by product name, code, or pack size (/)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-500">Product:</span>
          <select
            value={selectedProductFilter}
            onChange={e => setSelectedProductFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-xs rounded px-2 py-1 text-zinc-300 focus:outline-hidden"
          >
            <option value="all">All Products ({products.length})</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.shortCode})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 uppercase font-mono text-[10px]">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredSkus.length > 0 && selectedSkuIds.size === filteredSkus.length}
                    onChange={handleSelectAll}
                    className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400"
                  />
                </th>
                <th className="p-3">Product Name</th>
                <th className="p-3">Code</th>
                <th className="p-3">Pack Size</th>
                <th className="p-3">Net Weight</th>
                <th className="p-3">M.R.P. (₹)</th>
                <th className="p-3">Rate / g</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80">
              {filteredSkus.map(sku => {
                const prod = products.find(p => p.id === sku.productId);
                const isSelected = selectedSkuIds.has(sku.id);
                const hasMrp = sku.mrp !== undefined && sku.mrp > 0;
                const ratePerG = hasMrp ? (sku.mrp! / sku.netWeightGrams).toFixed(2) : '-';

                return (
                  <tr 
                    key={sku.id}
                    className={`hover:bg-zinc-800/50 transition-colors ${
                      isSelected ? 'bg-amber-500/10' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectSku(sku.id)}
                        className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400"
                      />
                    </td>
                    <td className="p-3 font-semibold text-zinc-200">
                      {prod?.name}
                    </td>
                    <td className="p-3 font-mono text-zinc-400">
                      {prod?.shortCode}
                    </td>
                    <td className="p-3 font-mono font-medium text-amber-400">
                      {sku.packSize}
                    </td>
                    <td className="p-3 text-zinc-300">
                      {sku.netWeightGrams} g
                    </td>
                    <td className="p-3">
                      {editingSkuId === sku.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.5"
                            value={editMrpValue}
                            onChange={e => setEditMrpValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEditMrp(sku);
                              if (e.key === 'Escape') setEditingSkuId(null);
                            }}
                            autoFocus
                            className="w-20 bg-zinc-950 border border-amber-500 rounded px-1.5 py-0.5 text-xs text-white"
                          />
                          <button onClick={() => saveEditMrp(sku)} className="p-1 text-emerald-400 hover:text-emerald-300">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingSkuId(null)} className="p-1 text-rose-400 hover:text-rose-300">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEditMrp(sku)}
                          className="cursor-pointer group flex items-center gap-1.5"
                        >
                          {hasMrp ? (
                            <span className="font-mono font-bold text-white">₹{sku.mrp}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40">
                              Needs MRP
                            </span>
                          )}
                          <Edit3 className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>
                    <td className="p-3 font-mono text-zinc-400">
                      {ratePerG !== '-' ? `₹${ratePerG}` : '-'}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        hasMrp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {hasMrp ? 'Ready' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => startEditMrp(sku)}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Bulk Edit */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Bulk Edit Selected SKUs</h3>
            <p className="text-xs text-zinc-400">
              Apply a new M.R.P. to {selectedSkuIds.size} selected SKU items. All visual design templates and product definitions are safely preserved.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-300">New M.R.P. (₹)</label>
              <input
                type="number"
                placeholder="e.g. 120"
                value={bulkMrpValue}
                onChange={e => setBulkMrpValue(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBulkEditModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkMrp}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Apply to {selectedSkuIds.size} SKUs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form onSubmit={handleCreateProductSubmit} className="w-full max-w-md rounded-xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Create New Product / Item</h3>
            <p className="text-xs text-zinc-400">
              Add any food, industrial component, cosmetic, or consumer product.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Product Name</label>
                <input
                  type="text"
                  placeholder="e.g. Industrial Valve Pin, Cumin Powder"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Short Code / Prefix</label>
                <input
                  type="text"
                  placeholder="e.g. IVP, ADCP"
                  value={newProdCode}
                  onChange={e => setNewProdCode(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono uppercase text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Default Shelf Life (Months)</label>
                <input
                  type="number"
                  value={newProdShelfLife}
                  onChange={e => setNewProdShelfLife(parseInt(e.target.value) || 12)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Create Product
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
