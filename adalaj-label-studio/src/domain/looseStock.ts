/**
 * Domain Loose Stock & Residual Material Ledger
 * Implements Product Owner Decision #1:
 * - Residual material remains traceable reusable loose stock.
 * - Explicit distinction between Available, Reserved, Consumed, and Scrapped stock.
 * - Retains full traceability to original batch lot and container.
 */

export type LooseStockStatus = 'Available' | 'Reserved' | 'Consumed' | 'Scrapped';

export interface LooseStockRecord {
  id: string;
  productId: string;
  sourceBatchId: string;
  lotDate: string;
  initialQuantityKg: number;
  availableQuantityKg: number;
  reservedQuantityKg: number;
  consumedQuantityKg: number;
  scrappedQuantityKg: number;
  containerId?: string;
  qualityPassed: boolean;
  notes?: string;
  status: LooseStockStatus;
  createdAt: string;
  updatedAt: string;
}

export function createLooseStockRecord(params: {
  productId: string;
  sourceBatchId: string;
  lotDate: string;
  residualKg: number;
  containerId?: string;
  notes?: string;
}): LooseStockRecord {
  const rounded = Math.round(params.residualKg * 1000) / 1000;
  if (rounded <= 0) {
    throw new Error('Residual quantity must be greater than 0 kg to register as loose stock');
  }

  const now = new Date().toISOString();
  return {
    id: `loose_${params.sourceBatchId}_${Date.now()}`,
    productId: params.productId,
    sourceBatchId: params.sourceBatchId,
    lotDate: params.lotDate,
    initialQuantityKg: rounded,
    availableQuantityKg: rounded,
    reservedQuantityKg: 0,
    consumedQuantityKg: 0,
    scrappedQuantityKg: 0,
    containerId: params.containerId || 'STD_BIN_01',
    qualityPassed: true,
    notes: params.notes || `Residual stock from batch ${params.sourceBatchId}`,
    status: 'Available',
    createdAt: now,
    updatedAt: now,
  };
}

export function allocateFromLooseStock(
  record: LooseStockRecord,
  requestedKg: number,
  destinationBatchId: string
): { success: boolean; updatedRecord?: LooseStockRecord; allocatedKg?: number; error?: string } {
  if (record.status !== 'Available') {
    return { success: false, error: `Loose stock item is ${record.status} and cannot be allocated` };
  }
  if (!record.qualityPassed) {
    return { success: false, error: 'Loose stock has not passed quality verification' };
  }

  const roundedReq = Math.round(requestedKg * 1000) / 1000;
  if (roundedReq <= 0) {
    return { success: false, error: 'Requested allocation quantity must be greater than 0 kg' };
  }

  if (roundedReq > record.availableQuantityKg) {
    return {
      success: false,
      error: `Requested ${roundedReq} kg exceeds available loose stock (${record.availableQuantityKg} kg)`,
    };
  }

  const newAvailable = Math.round((record.availableQuantityKg - roundedReq) * 1000) / 1000;
  const newConsumed = Math.round((record.consumedQuantityKg + roundedReq) * 1000) / 1000;
  const isFullyConsumed = newAvailable === 0 && record.reservedQuantityKg === 0;

  const updatedRecord: LooseStockRecord = {
    ...record,
    availableQuantityKg: newAvailable,
    consumedQuantityKg: newConsumed,
    status: isFullyConsumed ? 'Consumed' : 'Available',
    notes: `${record.notes || ''} | Allocated ${roundedReq} kg to ${destinationBatchId}`.trim(),
    updatedAt: new Date().toISOString(),
  };

  return { success: true, updatedRecord, allocatedKg: roundedReq };
}

export function scrapLooseStock(
  record: LooseStockRecord,
  scrapKg: number,
  reason: string
): { success: boolean; updatedRecord?: LooseStockRecord; error?: string } {
  const roundedScrap = Math.round(scrapKg * 1000) / 1000;
  if (roundedScrap <= 0) {
    return { success: false, error: 'Scrap quantity must be greater than 0 kg' };
  }

  if (roundedScrap > record.availableQuantityKg) {
    return {
      success: false,
      error: `Scrap quantity (${roundedScrap} kg) exceeds available loose stock (${record.availableQuantityKg} kg)`,
    };
  }

  const newAvailable = Math.round((record.availableQuantityKg - roundedScrap) * 1000) / 1000;
  const newScrapped = Math.round((record.scrappedQuantityKg + roundedScrap) * 1000) / 1000;
  const isAllScrapped = newAvailable === 0 && record.reservedQuantityKg === 0;

  const updatedRecord: LooseStockRecord = {
    ...record,
    availableQuantityKg: newAvailable,
    scrappedQuantityKg: newScrapped,
    status: isAllScrapped ? 'Scrapped' : 'Available',
    notes: `${record.notes || ''} | Scrapped ${roundedScrap} kg: ${reason}`.trim(),
    updatedAt: new Date().toISOString(),
  };

  return { success: true, updatedRecord };
}
