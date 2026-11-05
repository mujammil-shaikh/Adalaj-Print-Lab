/**
 * Products & SKUs Workspace View
 * Deep CRUD for Products & SKU Master Matrix, inline & modal edits, CSV export, and bulk editing
 */

import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  Sliders, 
  Check, 
  X,
  AlertCircle,
  CheckCircle2,
  Tag,
  Boxes,
  Barcode
} from 'lucide-react';
import type { Product, SKU } from '../../types';

interface ProductsViewProps {
  products: Product[];
  skus: SKU[];
  onUpdateSku: (sku: SKU) => void;
  onCreateProduct: (prod: Product) => void;
  onUpdateProduct?: (prod: Product) => void;
  onDeleteProduct?: (productId: string) => void;
  onCreateSku?: (sku: SKU) => void;
  onDeleteSku?: (skuId: string) => void;
  onBulkUpdateSkus: (skuIds: string[], updates: Partial<SKU>) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  skus,
  onUpdateSku,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onCreateSku,
  onDeleteSku,
  onBulkUpdateSkus
}) => {
  const [search, setSearch] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('all');
  const [selectedSkuIds, setSelectedSkuIds] = useState<Set<string>>(new Set());
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editMrpValue, setEditMrpValue] = useState<string>('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddSkuModal, setShowAddSkuModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkMrpValue, setBulkMrpValue] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProdName, setEditProdName] = useState('');
  const [editProdCode, setEditProdCode] = useState('');
  const [editProdShelfLife, setEditProdShelfLife] = useState(12);
  const [editProdPackSizes, setEditProdPackSizes] = useState('');

  // Delete Product Confirmation
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Edit SKU Modal State
  const [editingSku, setEditingSku] = useState<SKU | null>(null);
  const [editSkuPackSize, setEditSkuPackSize] = useState('');
  const [editSkuPackType, setEditSkuPackType] = useState('Stand-up Pouch');
  const [editSkuNetGrams, setEditSkuNetGrams] = useState<number>(100);
  const [editSkuUnit, setEditSkuUnit] = useState('g');
  const [editSkuMrp, setEditSkuMrp] = useState<string>('');
  const [editSkuBarcode, setEditSkuBarcode] = useState('');
  const [editSkuShelfLife, setEditSkuShelfLife] = useState<string>('');
  const [editSkuEnabled, setEditSkuEnabled] = useState(true);

  // Delete SKU Confirmation
  const [skuToDelete, setSkuToDelete] = useState<SKU | null>(null);

  // New Product Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCode, setNewProdCode] = useState('');
  const [newProdShelfLife, setNewProdShelfLife] = useState(12);
  const [newProdPackSizes, setNewProdPackSizes] = useState('100 g, 200 g, 500 g, 1 kg');

  // New SKU Form State
  const [newSkuProductId, setNewSkuProductId] = useState(products[0]?.id || '');
  const [newSkuPackSize, setNewSkuPackSize] = useState('250 g');
  const [newSkuPackType, setNewSkuPackType] = useState('Stand-up Pouch');
  const [newSkuNetGrams, setNewSkuNetGrams] = useState<number>(250);
  const [newSkuUnit, setNewSkuUnit] = useState('g');
  const [newSkuMrp, setNewSkuMrp] = useState<string>('110');
  const [newSkuBarcode, setNewSkuBarcode] = useState('');
  const [newSkuShelfLife, setNewSkuShelfLife] = useState('');

  const filteredSkus = skus.filter(sku => {
    const prod = products.find(p => p.id === sku.productId);
    const matchesProd = selectedProductFilter === 'all' || sku.productId === selectedProductFilter;
    const matchesSearch = !search || 
      sku.packSize.toLowerCase().includes(search.toLowerCase()) ||
      prod?.name.toLowerCase().includes(search.toLowerCase()) ||
      prod?.shortCode.toLowerCase().includes(search.toLowerCase());
    return matchesProd && matchesSearch;
  });

  const selectedProductObj = products.find(p => p.id === selectedProductFilter);

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
    setToastMsg(`M.R.P. updated for ${sku.packSize}`);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleApplyBulkMrp = () => {
    const num = parseFloat(bulkMrpValue);
    if (!isNaN(num) && num > 0 && selectedSkuIds.size > 0) {
      onBulkUpdateSkus(Array.from(selectedSkuIds), { mrp: num });
      setShowBulkEditModal(false);
      setBulkMrpValue('');
      setToastMsg(`✓ Updated M.R.P. across ${selectedSkuIds.size} SKUs`);
      setTimeout(() => setToastMsg(null), 3000);
    }
  };

  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdCode) return;

    const parsedSizes = newProdPackSizes
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      brandId: 'brand_adalaj',
      name: newProdName.trim(),
      shortCode: newProdCode.trim().toUpperCase(),
      batchPrefix: newProdCode.trim().toUpperCase(),
      defaultShelfLifeMonths: newProdShelfLife,
      allowedPackSizes: parsedSizes.length > 0 ? parsedSizes : ['100 g', '200 g', '500 g', '1 kg']
    };

    onCreateProduct(newProd);
    setShowAddProductModal(false);
    setNewProdName('');
    setNewProdCode('');
    setToastMsg(`✓ Product "${newProd.name}" created with ${newProd.allowedPackSizes.length} default pack sizes!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStartEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditProdName(p.name);
    setEditProdCode(p.shortCode);
    setEditProdShelfLife(p.defaultShelfLifeMonths);
    setEditProdPackSizes(p.allowedPackSizes.join(', '));
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !onUpdateProduct) return;

    const parsedSizes = editProdPackSizes
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const updated: Product = {
      ...editingProduct,
      name: editProdName.trim(),
      shortCode: editProdCode.trim().toUpperCase(),
      batchPrefix: editProdCode.trim().toUpperCase(),
      defaultShelfLifeMonths: editProdShelfLife,
      allowedPackSizes: parsedSizes.length > 0 ? parsedSizes : editingProduct.allowedPackSizes
    };

    onUpdateProduct(updated);
    setEditingProduct(null);
    setToastMsg(`✓ Product "${updated.name}" updated successfully!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleStartEditSku = (sku: SKU) => {
    setEditingSku(sku);
    setEditSkuPackSize(sku.packSize);
    setEditSkuPackType(sku.packType || 'Stand-up Pouch');
    setEditSkuNetGrams(sku.netWeightGrams);
    setEditSkuUnit(sku.unit || 'g');
    setEditSkuMrp(sku.mrp ? String(sku.mrp) : '');
    setEditSkuBarcode(sku.barcode || '');
    setEditSkuShelfLife(sku.shelfLifeOverrideMonths ? String(sku.shelfLifeOverrideMonths) : '');
    setEditSkuEnabled(sku.enabled);
  };

  const handleSaveSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSku) return;

    const mrpNum = parseFloat(editSkuMrp);
    const shelfNum = parseInt(editSkuShelfLife, 10);

    const updated: SKU = {
      ...editingSku,
      packSize: editSkuPackSize.trim(),
      packType: editSkuPackType,
      netWeightGrams: editSkuNetGrams,
      unit: editSkuUnit,
      mrp: !isNaN(mrpNum) && mrpNum > 0 ? mrpNum : undefined,
      barcode: editSkuBarcode.trim() || undefined,
      shelfLifeOverrideMonths: !isNaN(shelfNum) && shelfNum > 0 ? shelfNum : undefined,
      enabled: editSkuEnabled
    };

    onUpdateSku(updated);
    setEditingSku(null);
    setToastMsg(`✓ SKU "${updated.packSize}" updated!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateSkuSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateSku) return;

    const prod = products.find(p => p.id === newSkuProductId) || products[0];
    if (!prod) return;

    const mrpNum = parseFloat(newSkuMrp);
    const shelfNum = parseInt(newSkuShelfLife, 10);

    const newSku: SKU = {
      id: `sku_${prod.shortCode.toLowerCase()}_${newSkuPackSize.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
      productId: prod.id,
      packType: newSkuPackType,
      packSize: newSkuPackSize.trim(),
      netWeightGrams: newSkuNetGrams,
      unit: newSkuUnit,
      mrp: !isNaN(mrpNum) && mrpNum > 0 ? mrpNum : undefined,
      barcode: newSkuBarcode.trim() || undefined,
      shelfLifeOverrideMonths: !isNaN(shelfNum) && shelfNum > 0 ? shelfNum : undefined,
      enabled: true
    };

    onCreateSku(newSku);
    setShowAddSkuModal(false);
    setToastMsg(`✓ New Pack Size SKU "${newSku.packSize}" added for ${prod.name}!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportCsv = () => {
    let csv = 'Product,ShortCode,PackSize,PackType,NetGrams,Unit,MRP,Barcode,ShelfLifeOverride,Status\r\n';
    skus.forEach(s => {
      const p = products.find(prod => prod.id === s.productId);
      csv += `"${p?.name || ''}","${p?.shortCode || ''}","${s.packSize}","${s.packType || ''}",${s.netWeightGrams},"${s.unit}",${s.mrp ?? ''},"${s.barcode || ''}",${s.shelfLifeOverrideMonths ?? ''},${s.enabled ? 'Active' : 'Inactive'}\r\n`;
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
            Manage product items, pack sizes, barcodes, and M.R.P. pricing across all physical packaging profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedSkuIds.size > 0 && (
            <button
              onClick={() => setShowBulkEditModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/40 text-xs font-bold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Bulk Edit ({selectedSkuIds.size})</span>
            </button>
          )}

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-xs text-zinc-300 font-semibold transition-colors"
            title="Export CSV (Ctrl+Shift+E)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          {onCreateSku && (
            <button
              onClick={() => {
                if (selectedProductFilter !== 'all') {
                  setNewSkuProductId(selectedProductFilter);
                } else if (products[0]) {
                  setNewSkuProductId(products[0].id);
                }
                setShowAddSkuModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/40 text-xs font-bold transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              <span>Add Pack Size</span>
            </button>
          )}

          <button
            onClick={() => setShowAddProductModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter / Search Strip & Active Product Action Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            id="products-search-input"
            name="productsSearch"
            aria-label="Search by product name, code, or pack size"
            type="text"
            placeholder="Search by product name, code, pack size, barcode (/)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="products-filter-select" className="text-zinc-500 cursor-pointer">Product:</label>
          <select
            id="products-filter-select"
            name="productFilter"
            aria-label="Filter SKUs by product"
            value={selectedProductFilter}
            onChange={e => setSelectedProductFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-xs rounded px-2 py-1 text-zinc-300 focus:outline-hidden"
          >
            <option value="all">All Products ({products.length})</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.shortCode})</option>
            ))}
          </select>

          {/* Product-specific actions when a product is selected */}
          {selectedProductObj && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
              {onUpdateProduct && (
                <button
                  onClick={() => handleStartEditProduct(selectedProductObj)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-semibold"
                  title="Edit product name, short code, and allowed sizes"
                >
                  <Edit3 className="w-3 h-3 text-amber-400" />
                  <span>Edit Product</span>
                </button>
              )}
              {onDeleteProduct && (
                <button
                  onClick={() => setProductToDelete(selectedProductObj)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-700 text-[11px] font-semibold"
                  title="Delete product and all its SKUs"
                >
                  <Trash2 className="w-3 h-3 text-rose-400" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          )}
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
                    id="products-select-all-checkbox"
                    name="selectAllSkus"
                    aria-label="Select all SKUs"
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
                <th className="p-3">Pack Type</th>
                <th className="p-3">Barcode</th>
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
                        id={`sku-checkbox-${sku.id}`}
                        name={`select_sku_${sku.id}`}
                        aria-label={`Select ${sku.packSize}`}
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
                    <td className="p-3 text-zinc-300 font-mono">
                      {sku.netWeightGrams} {sku.unit || 'g'}
                    </td>
                    <td className="p-3 text-zinc-400">
                      {sku.packType || 'Pouch'}
                    </td>
                    <td className="p-3 font-mono text-zinc-400 text-[11px]">
                      {sku.barcode || '-'}
                    </td>
                    <td className="p-3">
                      {editingSkuId === sku.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            id={`inline-mrp-${sku.id}`}
                            name={`inlineMrp_${sku.id}`}
                            aria-label={`Edit MRP for ${sku.packSize}`}
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStartEditSku(sku)}
                          className="px-2.5 py-1 text-[11px] font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
                        >
                          Edit
                        </button>
                        {onDeleteSku && (
                          <button
                            onClick={() => setSkuToDelete(sku)}
                            className="p-1 rounded hover:bg-rose-950/50 text-zinc-500 hover:text-rose-400 transition-colors"
                            title="Delete this SKU"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
              <label htmlFor="bulk-mrp-input" className="text-xs font-semibold text-zinc-300">New M.R.P. (₹)</label>
              <input
                id="bulk-mrp-input"
                name="bulkMrpValue"
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
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white">Create New Product Item</h3>
              <button type="button" onClick={() => setShowAddProductModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Add any food, industrial component, cosmetic, or consumer product with predefined packaging profiles.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label htmlFor="new-product-name" className="font-semibold text-zinc-300 block mb-1">Product Name</label>
                <input
                  id="new-product-name"
                  name="productName"
                  type="text"
                  placeholder="e.g. Cumin Seeds, Industrial Valve Pin"
                  value={newProdName}
                  onChange={e => setNewProdName(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="new-product-code" className="font-semibold text-zinc-300 block mb-1">Short Code / Batch Prefix</label>
                <input
                  id="new-product-code"
                  name="productCode"
                  type="text"
                  placeholder="e.g. ADCS, IVP"
                  value={newProdCode}
                  onChange={e => setNewProdCode(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono uppercase text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="new-product-shelflife" className="font-semibold text-zinc-300 block mb-1">Default Shelf Life (Months)</label>
                <input
                  id="new-product-shelflife"
                  name="productShelfLife"
                  type="number"
                  value={newProdShelfLife}
                  onChange={e => setNewProdShelfLife(parseInt(e.target.value, 10) || 12)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label htmlFor="new-product-sizes" className="font-semibold text-zinc-300 block mb-1">Allowed Pack Sizes (comma separated)</label>
                <input
                  id="new-product-sizes"
                  name="productPackSizes"
                  type="text"
                  value={newProdPackSizes}
                  onChange={e => setNewProdPackSizes(e.target.value)}
                  placeholder="100 g, 200 g, 500 g, 1 kg"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
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

      {/* Modal: Edit Product */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <form onSubmit={handleSaveProductSubmit} className="w-full max-w-md rounded-xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Edit Product: {editingProduct.name}
              </h3>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Product Name</label>
                <input
                  type="text"
                  value={editProdName}
                  onChange={e => setEditProdName(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Short Code / Batch Prefix</label>
                <input
                  type="text"
                  value={editProdCode}
                  onChange={e => setEditProdCode(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono uppercase text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Default Shelf Life (Months)</label>
                <input
                  type="number"
                  value={editProdShelfLife}
                  onChange={e => setEditProdShelfLife(parseInt(e.target.value, 10) || 12)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Allowed Pack Sizes (comma separated)</label>
                <input
                  type="text"
                  value={editProdPackSizes}
                  onChange={e => setEditProdPackSizes(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Save Product Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Pack Size / SKU */}
      {showAddSkuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <form onSubmit={handleCreateSkuSubmit} className="w-full max-w-lg rounded-xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-400" />
                Add Pack Size / SKU Item
              </h3>
              <button type="button" onClick={() => setShowAddSkuModal(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2">
                <label className="font-semibold text-zinc-300 block mb-1">Parent Product</label>
                <select
                  value={newSkuProductId}
                  onChange={e => setNewSkuProductId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.shortCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Pack Size Label</label>
                <input
                  type="text"
                  placeholder="e.g. 250 g, 1 kg"
                  value={newSkuPackSize}
                  onChange={e => {
                    const sz = e.target.value;
                    setNewSkuPackSize(sz);
                    const clean = sz.toLowerCase();
                    if (clean.includes('kg')) {
                      const v = parseFloat(clean.replace(/[^0-9.]/g, ''));
                      if (!isNaN(v)) {
                        setNewSkuNetGrams(v * 1000);
                        setNewSkuUnit('kg');
                      }
                    } else {
                      const v = parseFloat(clean.replace(/[^0-9.]/g, ''));
                      if (!isNaN(v)) {
                        setNewSkuNetGrams(v);
                        setNewSkuUnit('g');
                      }
                    }
                  }}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 font-bold focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Pack Type</label>
                <select
                  value={newSkuPackType}
                  onChange={e => setNewSkuPackType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                >
                  <option value="Stand-up Pouch">Stand-up Pouch</option>
                  <option value="Flat Pouch">Flat Pouch</option>
                  <option value="Jar">Jar</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Carton Box">Carton Box</option>
                  <option value="Canister">Canister</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Net Weight (Grams)</label>
                <input
                  type="number"
                  value={newSkuNetGrams}
                  onChange={e => setNewSkuNetGrams(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-amber-300 block mb-1">M.R.P. (₹) *</label>
                <input
                  type="number"
                  step="0.5"
                  placeholder="e.g. 110"
                  value={newSkuMrp}
                  onChange={e => setNewSkuMrp(e.target.value)}
                  className="w-full bg-zinc-950 border border-amber-500/50 rounded-lg px-3 py-2 font-mono font-bold text-amber-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Barcode (EAN-13 / UPC)</label>
                <input
                  type="text"
                  placeholder="e.g. 8901234567890"
                  value={newSkuBarcode}
                  onChange={e => setNewSkuBarcode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Shelf Life Override (Months)</label>
                <input
                  type="number"
                  placeholder="Leave empty to use product default"
                  value={newSkuShelfLife}
                  onChange={e => setNewSkuShelfLife(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowAddSkuModal(false)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Add Pack Size SKU
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Edit SKU */}
      {editingSku && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <form onSubmit={handleSaveSkuSubmit} className="w-full max-w-lg rounded-xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Edit SKU: <span className="font-mono text-amber-400">{editingSku.packSize}</span>
              </h3>
              <button type="button" onClick={() => setEditingSku(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Pack Size Label</label>
                <input
                  type="text"
                  value={editSkuPackSize}
                  onChange={e => setEditSkuPackSize(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-bold text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Pack Type</label>
                <select
                  value={editSkuPackType}
                  onChange={e => setEditSkuPackType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                >
                  <option value="Stand-up Pouch">Stand-up Pouch</option>
                  <option value="Flat Pouch">Flat Pouch</option>
                  <option value="Jar">Jar</option>
                  <option value="Bottle">Bottle</option>
                  <option value="Carton Box">Carton Box</option>
                  <option value="Canister">Canister</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Net Weight (Grams)</label>
                <input
                  type="number"
                  value={editSkuNetGrams}
                  onChange={e => setEditSkuNetGrams(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-amber-300 block mb-1">M.R.P. (₹)</label>
                <input
                  type="number"
                  step="0.5"
                  value={editSkuMrp}
                  onChange={e => setEditSkuMrp(e.target.value)}
                  className="w-full bg-zinc-950 border border-amber-500/50 rounded-lg px-3 py-2 font-mono font-bold text-amber-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Barcode</label>
                <input
                  type="text"
                  value={editSkuBarcode}
                  onChange={e => setEditSkuBarcode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-300 block mb-1">Shelf Life Override (Months)</label>
                <input
                  type="number"
                  value={editSkuShelfLife}
                  onChange={e => setEditSkuShelfLife(e.target.value)}
                  placeholder="Defaults to product"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-zinc-200 focus:outline-hidden"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-sku-enabled"
                  checked={editSkuEnabled}
                  onChange={e => setEditSkuEnabled(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="edit-sku-enabled" className="text-zinc-300 cursor-pointer">
                  SKU Active & Available in Production
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingSku(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Save SKU
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Delete Product Confirmation */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border-2 border-rose-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Product Item?</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Product: <span className="text-amber-400 font-bold">{productToDelete.name} ({productToDelete.shortCode})</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              This action will permanently delete this product and all associated SKU pack profiles. Active batches referencing this product will retain their historical snapshots.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteProduct) onDeleteProduct(productToDelete.id);
                  setProductToDelete(null);
                  if (selectedProductFilter === productToDelete.id) setSelectedProductFilter('all');
                  setToastMsg(`Product ${productToDelete.name} deleted.`);
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete SKU Confirmation */}
      {skuToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border-2 border-rose-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-500 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete SKU Pack Size?</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Pack Size: <span className="text-amber-400 font-bold">{skuToDelete.packSize}</span>
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to remove this SKU pack size from the product catalog?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setSkuToDelete(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteSku) onDeleteSku(skuToDelete.id);
                  setSkuToDelete(null);
                  setToastMsg(`SKU ${skuToDelete.packSize} deleted.`);
                  setTimeout(() => setToastMsg(null), 3000);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 border-2 border-emerald-500 text-emerald-300 text-xs font-bold shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
