/**
 * Canonical Workspace Context & Selection Manager
 * Addresses WF-001, WF-002, WF-004, WF-013, WF-016
 * Single source of truth for active route and selection hierarchy.
 */

import type { Product, SKU, Batch, BatchAllocation, Template, MachineProfile, PackProfile } from '../types';

export type AppRoute = 'home' | 'products' | 'batches' | 'design' | 'print' | 'history' | 'settings';

export interface WorkspaceContext {
  route: AppRoute;
  productId?: string;
  skuId?: string;
  batchId?: string;
  allocationId?: string;
  templateId?: string;
  machineProfileId?: string;
  packProfileId?: string;
  printJobId?: string;
}

export interface ResolvedContext {
  context: WorkspaceContext;
  product: Product | null;
  sku: SKU | null;
  batch: Batch | null;
  allocation: BatchAllocation | null;
  machine: MachineProfile | null;
  packProfile: PackProfile | null;
  template: Template | null;
}

/**
 * Reconciles the workspace context to ensure internal referential integrity.
 * Invariants:
 * 1. If batchId is set, product must match batch.productId.
 * 2. If allocationId is set, it must belong to the active batch.
 * 3. Allocation determines packSize and SKU.
 * 4. Stale selections from prior products/batches are wiped, never silently retained.
 */
export function reconcileWorkspace(
  current: WorkspaceContext,
  data: {
    products: Product[];
    skus: SKU[];
    batches: Batch[];
    machines: MachineProfile[];
    packProfiles: PackProfile[];
    templates: Template[];
  }
): ResolvedContext {
  const next: WorkspaceContext = { ...current };

  // 1. Resolve Machine
  let machine = data.machines.find(m => m.id === next.machineProfileId) || null;
  if (!machine && data.machines.length > 0) {
    machine = data.machines[0];
    next.machineProfileId = machine.id;
  }

  // 2. Resolve Batch & Product
  let batch = data.batches.find(b => b.id === next.batchId) || null;
  // If the batch belongs to a different product than the explicitly requested productId, drop the batch
  if (batch && next.productId && batch.productId !== next.productId) {
    batch = null;
    delete next.batchId;
    delete next.allocationId;
  } else if (batch) {
    next.productId = batch.productId;
  }

  let product = data.products.find(p => p.id === next.productId) || null;
  if (!product && data.products.length > 0) {
    product = data.products[0];
    next.productId = product.id;
  }

  // 3. Resolve Allocation
  let allocation: BatchAllocation | null = null;
  if (batch && batch.allocations && batch.allocations.length > 0) {
    if (next.allocationId) {
      allocation = batch.allocations.find(a => a.id === next.allocationId) || null;
    }
    if (!allocation) {
      allocation = batch.allocations[0];
      next.allocationId = allocation.id;
    }
  } else {
    delete next.allocationId;
  }

  // 4. Resolve SKU
  const productSkus = data.skus.filter(s => s.productId === product?.id && s.enabled);
  let sku: SKU | null = null;

  if (allocation) {
    sku = productSkus.find(s => s.id === allocation?.skuId) ||
          productSkus.find(s => s.packSize.toLowerCase() === allocation?.packSize.toLowerCase()) || null;
    if (sku) next.skuId = sku.id;
  } else if (next.skuId) {
    sku = productSkus.find(s => s.id === next.skuId) || null;
  }

  if (!sku && productSkus.length > 0) {
    sku = productSkus[0];
    next.skuId = sku.id;
  }

  // 5. Resolve Pack Profile & Template
  const activePackSize = allocation?.packSize || sku?.packSize || '100 g';
  const packProfile = data.packProfiles.find(p => p.name.toLowerCase() === activePackSize.toLowerCase()) ||
                      data.packProfiles[0] || null;
  if (packProfile) next.packProfileId = packProfile.id;

  // Resolve template using precedence:
  // 1. SKU override: skuOverrideKey = `prod_${productId}_${packSize}`
  // 2. Pack size default: packSizeScope = packSize && isPackSizeDefault
  // 3. Fallback to active template or first template
  const skuOverrideKey = product ? `prod_${product.id}_${activePackSize.toLowerCase().replace(/\s+/g, '')}` : '';
  let template = data.templates.find(t => t.skuOverrideKey === skuOverrideKey) ||
                 data.templates.find(t => t.isPackSizeDefault && t.packSizeScope?.toLowerCase() === activePackSize.toLowerCase()) ||
                 data.templates.find(t => t.id === next.templateId) ||
                 data.templates[0] || null;

  if (template) next.templateId = template.id;

  return {
    context: next,
    product,
    sku,
    batch,
    allocation,
    machine,
    packProfile,
    template,
  };
}
