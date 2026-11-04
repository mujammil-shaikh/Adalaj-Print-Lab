/**
 * Domain Batch Commands & Lifecycle Transitions
 * Enforces transactional integrity, ID uniqueness, mass balance, and date math.
 */

import type { Batch, BatchAllocation, Product, SKU } from '../types';
import { parseDateInput, calculateBestBeforeDate, formatCalendarDateDMY } from './dates';
import { parsePackSizeToGrams, calculateExpectedPacks, validateMassBalance, calculateRatePerGram } from './inventory';

export interface CreateBatchInput {
  batchId: string;
  productId: string;
  rawMaterialKg: number;
  lotDate: string; // YYYY-MM-DD
  notes?: string;
  allocations: {
    packSize: string;
    allocatedKg: number;
    mrp?: number;
  }[];
}

export function generateNextBatchId(
  productPrefix: string,
  existingBatches: { id: string }[]
): string {
  const prefix = productPrefix.trim().toUpperCase() || 'ADTP';
  let maxNum = 0;

  for (const b of existingBatches) {
    if (b.id && b.id.toUpperCase().startsWith(prefix)) {
      const numPart = parseInt(b.id.slice(prefix.length).trim(), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}

export function createBatchCommand(
  input: CreateBatchInput,
  product: Product,
  availableSkus: SKU[],
  existingBatches: { id: string }[]
): { success: boolean; batch?: Batch; error?: string } {
  // 1. Validate ID Uniqueness
  const cleanId = input.batchId.trim().toUpperCase();
  if (!cleanId) {
    return { success: false, error: 'Batch ID is required' };
  }
  if (existingBatches.some(b => b.id.toUpperCase() === cleanId)) {
    return { success: false, error: `Batch ID "${cleanId}" already exists. Duplicate IDs are rejected.` };
  }

  // 2. Validate Mass Balance
  const balance = validateMassBalance(input.rawMaterialKg, input.allocations);
  if (!balance.valid) {
    return { success: false, error: balance.error };
  }

  if (input.allocations.length === 0) {
    return { success: false, error: 'At least one pack allocation is required' };
  }

  // 3. Parse Dates
  let mfdCalendar;
  try {
    mfdCalendar = parseDateInput(input.lotDate);
  } catch (err: any) {
    return { success: false, error: `Invalid lot date: ${err.message}` };
  }
  const mfdFormatted = formatCalendarDateDMY(mfdCalendar);

  // 4. Build Allocations
  const batchAllocations: BatchAllocation[] = [];

  for (let i = 0; i < input.allocations.length; i++) {
    const row = input.allocations[i];
    const packGrams = parsePackSizeToGrams(row.packSize);
    const expectedPacks = calculateExpectedPacks(row.allocatedKg, packGrams);

    const matchedSku = availableSkus.find(
      s => s.productId === product.id && s.packSize.toLowerCase() === row.packSize.toLowerCase()
    );

    // MRP must come from row or matched SKU. Never guessed/invented.
    const mrp = (typeof row.mrp === 'number' && row.mrp > 0) ? row.mrp : matchedSku?.mrp;
    const ratePerGm = mrp ? calculateRatePerGram(mrp, packGrams) : undefined;

    // Shelf life: check SKU override first, then product default, default to 12
    const shelfLifeMonths = matchedSku?.shelfLifeOverrideMonths || product.defaultShelfLifeMonths || 12;
    const bbCalendar = calculateBestBeforeDate(mfdCalendar, shelfLifeMonths);
    const bbFormatted = formatCalendarDateDMY(bbCalendar);

    const allocId = `alloc_${cleanId}_${Date.now()}_${i + 1}`;
    batchAllocations.push({
      id: allocId,
      batchId: cleanId,
      skuId: matchedSku?.id || `sku_${product.shortCode.toLowerCase()}_${row.packSize.replace(/\s+/g, '')}`,
      productId: product.id,
      packSize: row.packSize,
      allocatedKg: row.allocatedKg,
      expectedPacks,
      mfd: mfdFormatted,
      bestBefore: bbFormatted,
      mrpSnapshot: mrp,
      ratePerGmSnapshot: ratePerGm || undefined,
      templateVersionSnapshot: 1,
      printStatus: 'Pending',
      packsPrinted: 0,
    });
  }

  const batch: Batch = {
    id: cleanId,
    productId: product.id,
    rawMaterialKg: balance.rawMaterialKg, // Exact raw input preserved, never silently inflated
    lotDate: input.lotDate,
    status: 'Open',
    notes: input.notes || `Batch ${cleanId}: ${balance.rawMaterialKg} kg raw, ${balance.totalAllocatedKg} kg allocated, ${balance.looseBalanceKg} kg loose remaining.`,
    allocations: batchAllocations,
    createdAt: new Date().toISOString(),
  };

  return { success: true, batch };
}

/**
 * Duplicates a batch safely (WF-008, E2E-07).
 * - Creates brand new unique batch ID.
 * - Allocations get brand new unique allocation IDs referencing the new batch ID.
 * - Requires updated lot date and resets printed counts and statuses.
 */
export function duplicateBatchCommand(
  sourceBatch: Batch,
  newBatchId: string,
  newLotDate: string,
  existingBatches: { id: string }[],
  product: Product,
  availableSkus: SKU[]
): { success: boolean; batch?: Batch; error?: string } {
  const cleanId = newBatchId.trim().toUpperCase();
  if (!cleanId) {
    return { success: false, error: 'New Batch ID is required' };
  }
  if (existingBatches.some(b => b.id.toUpperCase() === cleanId)) {
    return { success: false, error: `Batch ID "${cleanId}" already exists.` };
  }

  let mfdCalendar;
  try {
    mfdCalendar = parseDateInput(newLotDate);
  } catch (err: any) {
    return { success: false, error: `Invalid lot date: ${err.message}` };
  }
  const mfdFormatted = formatCalendarDateDMY(mfdCalendar);

  const newAllocations: BatchAllocation[] = sourceBatch.allocations.map((oldAlloc, idx) => {
    const packGrams = parsePackSizeToGrams(oldAlloc.packSize);
    const matchedSku = availableSkus.find(
      s => s.productId === product.id && s.packSize.toLowerCase() === oldAlloc.packSize.toLowerCase()
    );
    const shelfLifeMonths = matchedSku?.shelfLifeOverrideMonths || product.defaultShelfLifeMonths || 12;
    const bbCalendar = calculateBestBeforeDate(mfdCalendar, shelfLifeMonths);

    return {
      id: `alloc_${cleanId}_${Date.now()}_${idx + 1}`,
      batchId: cleanId,
      skuId: oldAlloc.skuId,
      productId: product.id,
      packSize: oldAlloc.packSize,
      allocatedKg: oldAlloc.allocatedKg,
      expectedPacks: oldAlloc.expectedPacks,
      mfd: mfdFormatted,
      bestBefore: formatCalendarDateDMY(bbCalendar),
      mrpSnapshot: oldAlloc.mrpSnapshot,
      ratePerGmSnapshot: oldAlloc.ratePerGmSnapshot,
      templateVersionSnapshot: oldAlloc.templateVersionSnapshot,
      printStatus: 'Pending',
      packsPrinted: 0,
    };
  });

  const duplicated: Batch = {
    id: cleanId,
    productId: product.id,
    rawMaterialKg: sourceBatch.rawMaterialKg,
    lotDate: newLotDate,
    status: 'Open',
    notes: `Duplicated from ${sourceBatch.id} on ${new Date().toISOString().slice(0, 10)}`,
    allocations: newAllocations,
    createdAt: new Date().toISOString(),
  };

  return { success: true, batch: duplicated };
}
