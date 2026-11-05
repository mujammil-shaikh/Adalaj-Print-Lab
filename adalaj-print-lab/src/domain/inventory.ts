/**
 * Domain Inventory, Mass Balance, and Pack Math
 * Invariants:
 * 1. Allocations cannot exceed raw material input.
 * 2. Missing or zero quantities are never silently converted to defaults.
 * 3. Pack count math is exact and non-negative.
 * 4. Commercial prices (MRP) must be verified and non-negative; never fabricated.
 */

export interface AllocationInput {
  packSize: string;
  allocatedKg: number;
  mrp?: number;
}

export interface MassBalanceResult {
  valid: boolean;
  rawMaterialKg: number;
  totalAllocatedKg: number;
  looseBalanceKg: number;
  error?: string;
}

export function parsePackSizeToGrams(packSize: string): number {
  if (!packSize || typeof packSize !== 'string') {
    throw new Error('Pack size must be a non-empty string');
  }
  const clean = packSize.toLowerCase().trim();
  if (clean.includes('kg')) {
    const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
    if (isNaN(val) || val <= 0) {
      throw new Error(`Invalid kg pack size: "${packSize}"`);
    }
    return val * 1000;
  }
  const val = parseFloat(clean.replace(/[^0-9.]/g, ''));
  if (isNaN(val) || val <= 0) {
    throw new Error(`Invalid gram pack size: "${packSize}"`);
  }
  return val;
}

export function calculateExpectedPacks(allocatedKg: number, packSizeGrams: number): number {
  if (allocatedKg <= 0 || packSizeGrams <= 0) {
    return 0;
  }
  return Math.floor((allocatedKg * 1000) / packSizeGrams);
}

export function validateMassBalance(
  rawMaterialKg: number,
  allocations: { allocatedKg: number }[]
): MassBalanceResult {
  if (rawMaterialKg <= 0) {
    return {
      valid: false,
      rawMaterialKg,
      totalAllocatedKg: 0,
      looseBalanceKg: 0,
      error: 'Raw material input quantity must be greater than 0 kg',
    };
  }

  const totalAllocatedKg = allocations.reduce((sum, a) => sum + (Number(a.allocatedKg) || 0), 0);
  // Round to 3 decimal places to avoid floating point anomalies (e.g. 15.00000000002)
  const roundedAllocated = Math.round(totalAllocatedKg * 1000) / 1000;
  const roundedRaw = Math.round(rawMaterialKg * 1000) / 1000;

  if (roundedAllocated > roundedRaw) {
    return {
      valid: false,
      rawMaterialKg: roundedRaw,
      totalAllocatedKg: roundedAllocated,
      looseBalanceKg: 0,
      error: `Total allocated quantity (${roundedAllocated} kg) exceeds raw material input (${roundedRaw} kg)`,
    };
  }

  const looseBalanceKg = Math.round((roundedRaw - roundedAllocated) * 1000) / 1000;
  return {
    valid: true,
    rawMaterialKg: roundedRaw,
    totalAllocatedKg: roundedAllocated,
    looseBalanceKg,
  };
}

export function calculateRatePerGram(mrp: number | undefined, packSizeGrams: number): number | null {
  if (typeof mrp !== 'number' || isNaN(mrp) || mrp <= 0 || packSizeGrams <= 0) {
    return null;
  }
  return Math.round((mrp / packSizeGrams) * 100) / 100;
}
