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

export function estimateTextWidthMm(
  text: string,
  fontFamily: string = 'Barlow Condensed',
  fontSizeMm: number = 2.5,
  letterSpacingMm: number = 0
): number {
  if (!text) return 2.0;
  const family = (fontFamily || '').toLowerCase();
  let ratio = 0.44;
  if (family.includes('barlow')) {
    ratio = 0.40;
  } else if (family.includes('roboto condensed')) {
    ratio = 0.43;
  } else if (family.includes('mono')) {
    ratio = 0.58;
  } else if (family.includes('oswald')) {
    ratio = 0.42;
  } else if (family.includes('noto')) {
    ratio = 0.50;
  }
  const textWidth = text.length * fontSizeMm * ratio;
  const spacing = Math.max(0, text.length - 1) * (letterSpacingMm || 0);
  return Math.max(1.5, Math.round((textWidth + spacing) * 10) / 10);
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
    const bandMm = template.customBandMm || machine.printBandMm || 12.5;
    const lengthMm = template.customLengthMm || packProfile?.printWindowLengthMm || (template.travel === 'Vertical' ? 35.0 : 45.0);

    const isVertical = template.travel === 'Vertical';
    const widthLimit = isVertical ? bandMm : lengthMm;
    const heightLimit = isVertical ? lengthMm : bandMm;

    const tokenMap: Record<string, string> = {
      product: product?.name || '',
      brand: 'ADALAJ',
      batch: batch?.id || 'AD001',
      lot: batch?.id || 'AD001',
      lot_no: batch?.id || 'AD001',
      net_wt: allocation?.packSize || sku?.packSize || (sku?.netWeightGrams ? `${sku.netWeightGrams} g` : '100 g'),
      pack_size: allocation?.packSize || sku?.packSize || '100 g',
      weight: allocation?.packSize || sku?.packSize || '100 g',
      net_weight: allocation?.packSize || sku?.packSize || '100 g',
      net_qty: allocation?.packSize || sku?.packSize || '100 g',
      mrp: allocation?.mrpSnapshot ? `₹${allocation.mrpSnapshot}` : (sku?.mrp ? `₹${sku.mrp}` : '₹50'),
      price: allocation?.mrpSnapshot ? `₹${allocation.mrpSnapshot}` : (sku?.mrp ? `₹${sku.mrp}` : '₹50'),
      mfd: allocation?.mfd || '01/01/26',
      best_before: allocation?.bestBefore || '01/01/27',
      expiry: allocation?.bestBefore || '01/01/27',
      exp: allocation?.bestBefore || '01/01/27',
      rate_per_gm: allocation?.ratePerGmSnapshot ? `₹${allocation.ratePerGmSnapshot.toFixed(2)}/g` : '₹0.50/g',
    };

    for (const obj of template.objects) {
      const scaleX = (obj.horizontalStretchPercent || 100) / 100;
      const scaleY = (obj.verticalStretchPercent || 100) / 100;
      const rot = obj.rotation || 0;
      const isRotated90or270 = rot === 90 || rot === 270;

      let physicalW = obj.width;
      let physicalH = obj.height;

      if (obj.type === 'text' || obj.type === 'field') {
        let text = obj.content || '';
        if (text.includes('{')) {
          text = text.replace(/\{(\w+)\}/g, (_, k) => {
            const keyLower = k.toLowerCase();
            return tokenMap[keyLower] ?? (allocation as any)?.[k] ?? (sku as any)?.[k] ?? (product as any)?.[k] ?? `{${k}}`;
          });
        } else if (obj.fieldKey) {
          const keyLower = obj.fieldKey.toLowerCase();
          text = tokenMap[keyLower] ?? (allocation as any)?.[obj.fieldKey] ?? text;
        }
        if (obj.uppercase) {
          text = text.toUpperCase();
        }
        const measuredTextW = estimateTextWidthMm(text, obj.fontFamily, obj.fontSizeMm, obj.letterSpacingMm);
        // The actual visible physical bounds occupied by glyphs:
        physicalW = Math.min(obj.width || measuredTextW, measuredTextW);
        physicalH = Math.min(obj.height || obj.fontSizeMm, obj.fontSizeMm);
      }

      // Effective physical container dimensions after condensation, stretching, and rotation
      const effW = isRotated90or270 ? (physicalH * scaleY) : (physicalW * scaleX);
      const effH = isRotated90or270 ? (physicalW * scaleX) : (physicalH * scaleY);

      let minX = obj.x;
      let maxX = obj.x + effW;
      if (obj.type === 'text' || obj.type === 'field') {
        if (obj.alignment === 'center') {
          const centerX = obj.x + (physicalW / 2);
          minX = centerX - (effW / 2);
          maxX = centerX + (effW / 2);
        } else if (obj.alignment === 'right') {
          minX = obj.x + physicalW - effW;
          maxX = obj.x + physicalW;
        }
      }

      if (effW > widthLimit + 0.5) {
        warnings.push(`Object "${obj.content || obj.id}" exceeds printable width (${effW.toFixed(1)} mm > ${widthLimit} mm limit) - excess content will be trimmed at printhead edge`);
      } else if (maxX > widthLimit + 0.8) {
        warnings.push(`Object "${obj.content || obj.id}" right edge (${maxX.toFixed(1)} mm) extends past printable width (${widthLimit} mm) and may be trimmed at boundary`);
      }

      if (effH > heightLimit + 0.5) {
        warnings.push(`Object "${obj.content || obj.id}" exceeds printable height (${effH.toFixed(1)} mm > ${heightLimit} mm limit) - excess content will be trimmed at printhead edge`);
      } else if (obj.y + effH > heightLimit + 0.8) {
        warnings.push(`Object "${obj.content || obj.id}" bottom edge (${(obj.y + effH).toFixed(1)} mm) extends past printable height (${heightLimit} mm) and may be trimmed at boundary`);
      }

      if (minX < -0.5 || obj.y < -0.5) {
        warnings.push(`Object "${obj.content || obj.id}" is partially positioned off-screen (left: ${minX.toFixed(1)} mm, top: ${obj.y.toFixed(1)} mm)`);
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
