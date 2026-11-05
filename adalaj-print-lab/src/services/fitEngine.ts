/**
 * Fit Engine & Validation Service
 * Provides deterministic mathematical fitting, auto-flow, anti-overlap, and quality readiness checks
 * for all 4 Travel x Layout modes (Vertical Stack, Vertical Strip, Horizontal Strip, Horizontal Stack/2-Column).
 */

import type { Template, MachineProfile, PackProfile, DesignObject } from '../types';

export interface QualityIssue {
  id: string;
  type: 'error' | 'warning';
  title: string;
  message: string;
  objectId?: string;
  repairable: boolean;
  proposedAction?: string;
}

export interface FitResult {
  template: Template;
  changesMade: string[];
  issues: QualityIssue[];
}

/**
 * Fits a selected object or all objects within the machine print band and pack profile
 */
export function fitObjectsToBand(
  template: Template,
  machine: MachineProfile,
  packProfile: PackProfile,
  targetObjectId?: string
): FitResult {
  const newTemplate: Template = JSON.parse(JSON.stringify(template));
  const changesMade: string[] = [];

  const printBand = template.customBandMm || machine.printBandMm || 12.7;
  const usableBandWidthMm = printBand - (machine.contentPaddingLeftMm + machine.contentPaddingRightMm);
  const usableBandHeightMm = printBand - (machine.contentPaddingTopMm + machine.contentPaddingBottomMm);

  const objectsToFit = targetObjectId 
    ? newTemplate.objects.filter(o => o.id === targetObjectId)
    : newTemplate.objects;

  if (newTemplate.travel === 'Vertical' && newTemplate.layout === 'Stack') {
    // Vertical + Stack: Locked axis is Width (usableBandWidthMm, ~12.1 mm)
    objectsToFit.forEach(obj => {
      if (obj.locked) return;

      const charCount = (obj.content || '').length || 8;
      let textWidthMm = charCount * obj.fontSizeMm * 0.55;

      // 1. Condense horizontally down to 75% if needed
      if (textWidthMm > usableBandWidthMm) {
        const requiredStretch = Math.max(75, Math.floor((usableBandWidthMm / textWidthMm) * 100));
        if (requiredStretch < 100) {
          obj.horizontalStretchPercent = requiredStretch;
          textWidthMm = textWidthMm * (requiredStretch / 100);
          changesMade.push(`Condensed "${obj.content || obj.fieldKey}" to ${requiredStretch}%`);
        }
      }

      // 2. Reduce font size if still wider than band
      if (textWidthMm > usableBandWidthMm) {
        const scaleFactor = usableBandWidthMm / textWidthMm;
        const newFontSizeMm = Math.max(machine.minimumLegibleTextHeightMm, Math.round(obj.fontSizeMm * scaleFactor * 10) / 10);
        if (newFontSizeMm < obj.fontSizeMm) {
          changesMade.push(`Reduced font size of "${obj.content || obj.fieldKey}" from ${obj.fontSizeMm}mm to ${newFontSizeMm}mm`);
          obj.fontSizeMm = newFontSizeMm;
          obj.height = newFontSizeMm;
          obj.fontSizePt = Math.round(newFontSizeMm * 2.83);
        }
      }

      // 3. Keep width constrained to usable band
      obj.width = Math.min(usableBandWidthMm, Math.max(4.0, textWidthMm));
      if (obj.x === undefined) {
        obj.x = machine.contentPaddingLeftMm;
      }
    });

    // 4. Auto-flow stacked lines with lineGapMm
    reflowStackedLines(newTemplate, machine);
    changesMade.push(`Reflowed lines with spacing ${newTemplate.lineGapMm} mm`);
  } else if (newTemplate.travel === 'Horizontal' && newTemplate.layout === 'Stack') {
    // Horizontal + Stack: Head height is 12.5mm; arrange in 2 columns (e.g. 3 lines left, 3 lines right)
    const col1X = machine.contentPaddingLeftMm;
    const col2X = machine.contentPaddingLeftMm + 20.0;
    const colWidth = 19.0;

    newTemplate.objects.forEach((obj, idx) => {
      if (obj.locked) return;
      const isCol2 = idx >= 3;
      const colRowIdx = isCol2 ? idx - 3 : idx;

      obj.x = isCol2 ? col2X : col1X;
      obj.y = Math.round((machine.contentPaddingTopMm + colRowIdx * (3.0 + newTemplate.lineGapMm)) * 10) / 10;
      obj.fontSizeMm = Math.min(obj.fontSizeMm, 3.0);
      obj.height = obj.fontSizeMm;
      obj.width = colWidth;
    });
    changesMade.push('Arranged objects into 2-column horizontal stack layout');
  } else if (newTemplate.travel === 'Horizontal' && newTemplate.layout === 'Strip') {
    // Horizontal Strip: Flow objects horizontally across the length
    let currentX = machine.contentPaddingLeftMm;
    newTemplate.objects.forEach(obj => {
      if (obj.locked) return;
      obj.x = Math.round(currentX * 10) / 10;
      obj.y = machine.contentPaddingTopMm;
      currentX += obj.width + newTemplate.lineGapMm;
    });
    changesMade.push('Arranged objects along horizontal strip');
  } else {
    // Vertical Strip
    reflowStackedLines(newTemplate, machine);
    changesMade.push('Reflowed lines vertically');
  }

  // Validate quality after fitting
  const quality = validateTemplateQuality(newTemplate, machine, packProfile);

  return {
    template: newTemplate,
    changesMade,
    issues: quality
  };
}

/**
 * Reflows stacked lines from top to bottom ensuring zero overlap and uniform lineGapMm
 */
export function reflowStackedLines(template: Template, machine: MachineProfile) {
  template.objects.sort((a, b) => (a.lineIndex ?? a.y) - (b.lineIndex ?? b.y));

  let currentY = machine.contentPaddingTopMm;
  template.objects.forEach((obj, idx) => {
    obj.lineIndex = idx;
    if (!obj.locked) {
      obj.y = Math.round(currentY * 10) / 10;
      currentY = obj.y + obj.height + template.lineGapMm;
    } else {
      currentY = Math.max(currentY, obj.y + obj.height + template.lineGapMm);
    }
  });
}

/**
 * Validates template against machine limits, pack profile, legibility, and print window
 */
export function validateTemplateQuality(
  template: Template,
  machine: MachineProfile,
  packProfile: PackProfile
): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const lockedLimitMm = template.customBandMm || machine.printBandMm || 12.7;

  template.objects.forEach(obj => {
    // 1. Text height below minimum legible size
    if (obj.fontSizeMm < machine.minimumLegibleTextHeightMm) {
      issues.push({
        id: `legible_${obj.id}`,
        type: 'warning',
        title: 'Text below minimum legible size',
        message: `"${obj.content || obj.fieldKey}" height is ${obj.fontSizeMm.toFixed(1)} mm. Minimum recommended is ${machine.minimumLegibleTextHeightMm} mm.`,
        objectId: obj.id,
        repairable: true,
        proposedAction: `Increase font size to ${machine.minimumLegibleTextHeightMm} mm`
      });
    }

    // 2. Excessive horizontal condensing
    if (obj.horizontalStretchPercent < 70) {
      issues.push({
        id: `condense_${obj.id}`,
        type: 'warning',
        title: 'Excessive horizontal condensing',
        message: `"${obj.content || obj.fieldKey}" condensed to ${obj.horizontalStretchPercent}%. May degrade print legibility.`,
        objectId: obj.id,
        repairable: true,
        proposedAction: 'Reset horizontal stretch to 85%'
      });
    }

    // 3. Overflow locked axis
    const axisDimension = template.travel === 'Vertical' ? obj.width : obj.height;
    if (axisDimension > lockedLimitMm + 0.05) {
      issues.push({
        id: `overflow_${obj.id}`,
        type: 'error',
        title: 'Print band overflow',
        message: `Object dimension (${axisDimension.toFixed(1)} mm) exceeds machine print band (${lockedLimitMm} mm) by ${(axisDimension - lockedLimitMm).toFixed(1)} mm.`,
        objectId: obj.id,
        repairable: true,
        proposedAction: 'Fit object to print band'
      });
    }
  });

  // 4. Overlap inspection
  if (template.preventOverlap) {
    for (let i = 0; i < template.objects.length; i++) {
      for (let j = i + 1; j < template.objects.length; j++) {
        const a = template.objects[i];
        const b = template.objects[j];
        const overlapX = a.x < b.x + b.width && a.x + a.width > b.x;
        const overlapY = a.y < b.y + b.height && a.y + a.height > b.y;
        if (overlapX && overlapY) {
          issues.push({
            id: `overlap_${a.id}_${b.id}`,
            type: 'error',
            title: 'Line overlap detected',
            message: `"${a.content || a.fieldKey}" overlaps with "${b.content || b.fieldKey}".`,
            repairable: true,
            proposedAction: 'Auto-reflow lines'
          });
        }
      }
    }
  }

  return issues;
}
