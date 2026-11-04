/**
 * Domain Print Job & Attempt Lifecycle
 * Addresses P0-04, P0-05, HIST-01, HIST-02, PR-04, WF-003, WF-009, WF-024
 */

import type { Batch, BatchAllocation, Product, SKU, Template, MachineProfile, PackProfile, PrintJob, PassPlan, PrintTransform } from '../types';

export interface PreflightResult {
  passed: boolean;
  blockers: string[];
  warnings: string[];
}

export function runPreflightCheck(params: {
  product: Product | null;
  sku: SKU | null;
  batch: Batch | null;
  allocation: BatchAllocation | null;
  template: Template | null;
  machine: MachineProfile | null;
  packProfile: PackProfile | null;
}): PreflightResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const { product, sku, batch, allocation, template, machine, packProfile } = params;

  if (!product) blockers.push('No verified product selected');
  if (!batch) blockers.push('No production batch selected');
  if (!allocation) blockers.push('No pack allocation selected');
  if (!machine) blockers.push('No print machine profile selected');
  if (!template) blockers.push('No label template resolved for this pack size');
  if (!packProfile) warnings.push('Using fallback pack profile; physical window may not be calibrated');

  // Verify Commercial Value Truth (P0-03)
  if (allocation) {
    if (typeof allocation.mrpSnapshot !== 'number' || isNaN(allocation.mrpSnapshot) || allocation.mrpSnapshot <= 0) {
      if (typeof sku?.mrp !== 'number' || isNaN(sku.mrp) || sku.mrp <= 0) {
        blockers.push(`Missing authorized MRP for pack size ${allocation.packSize}. Printing without an authorized price is prohibited.`);
      }
    }

    if (!allocation.mfd || allocation.mfd.trim() === '') {
      blockers.push('Manufacturing Date (MFD) is missing');
    }
    if (!allocation.bestBefore || allocation.bestBefore.trim() === '') {
      blockers.push('Best Before / Expiry date is missing');
    }

    if (allocation.expectedPacks <= 0) {
      warnings.push('Expected pack count is zero (allocated raw material is insufficient for one complete pack)');
    }
  }

  // Verify Geometry & Band constraints
  if (template && machine) {
    const bandMm = template.customBandMm || machine.printBandMm || 12.7;
    for (const obj of template.objects) {
      if (obj.y + obj.height > bandMm) {
        blockers.push(`Object "${obj.content || obj.id}" exceeds usable print band (${bandMm} mm)`);
      }
      if (obj.x < 0 || obj.y < 0) {
        blockers.push(`Object "${obj.content || obj.id}" has negative coordinates (out of printable area)`);
      }
    }
  }

  return {
    passed: blockers.length === 0,
    blockers,
    warnings,
  };
}

export function createImmutablePrintJobSnapshot(params: {
  jobCode: string;
  businessName: string;
  brandName: string;
  product: Product;
  allocation: BatchAllocation;
  batch: Batch;
  template: Template;
  machine: MachineProfile;
  packProfile: PackProfile;
  values: Record<string, string>;
  passPlan: PassPlan;
  transform: PrintTransform;
  operatorName: string;
}): PrintJob {
  const now = new Date().toISOString();
  return {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    jobCode: params.jobCode,
    businessName: params.businessName,
    brandName: params.brandName,
    productName: params.product.name,
    skuSize: params.allocation.packSize,
    batchId: params.batch.id,
    quantityPacks: params.allocation.expectedPacks,
    completedQuantity: 0,
    rejectedQuantity: 0,
    proofStatus: 'Not Tested',
    productionStatus: 'Queued',
    machineId: params.machine.id,
    machineName: params.machine.name,
    surfaceProfileName: params.packProfile.name,
    travel: params.template.travel,
    layout: params.template.layout,
    passPlan: JSON.parse(JSON.stringify(params.passPlan)),
    transform: { ...params.transform },
    templateSnapshot: JSON.parse(JSON.stringify(params.template)), // Deep clone immutable snapshot
    valuesSnapshot: { ...params.values },                         // Exact commercial values
    exportedFiles: [],
    operatorName: params.operatorName || 'Operator',
    createdAt: now,
    updatedAt: now,
  };
}

export interface PrintReconciliationInput {
  job: PrintJob;
  goodCount: number;
  rejectedCount: number;
  rejectionReason?: string;
  isCompleted: boolean;
}

export function reconcilePrintQuantityCommand(input: PrintReconciliationInput): {
  success: boolean;
  updatedJob?: PrintJob;
  error?: string;
} {
  if (input.goodCount < 0 || input.rejectedCount < 0) {
    return { success: false, error: 'Counts cannot be negative' };
  }

  const updatedJob: PrintJob = {
    ...input.job,
    completedQuantity: input.goodCount,
    rejectedQuantity: input.rejectedCount,
    productionStatus: input.isCompleted ? 'Completed' : 'Paused',
    updatedAt: new Date().toISOString(),
  };

  return { success: true, updatedJob };
}
