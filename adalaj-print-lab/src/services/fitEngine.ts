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
  const frameWidth = newTemplate.travel === 'Vertical' ? printBand : (newTemplate.customLengthMm || 35.0);
  const frameHeight = newTemplate.travel === 'Vertical' ? (newTemplate.customLengthMm || 35.0) : printBand;
  const usableBandWidthMm = printBand - (machine.contentPaddingLeftMm + machine.contentPaddingRightMm);
  const usableBandHeightMm = printBand - (machine.contentPaddingTopMm + machine.contentPaddingBottomMm);

  if (targetObjectId) {
    // Single object targeted fit (Fit Line / Fit Object)
    const obj = newTemplate.objects.find(o => o.id === targetObjectId);
    if (obj && !obj.locked) {
      if (obj.type === 'line') {
        obj.x = 0.5;
        obj.width = frameWidth - 1.0;
        obj.height = Math.min(Math.max(0.2, obj.height || 0.4), 2.0);
        obj.y = Math.max(0.5, Math.min(frameHeight - obj.height - 0.5, obj.y));
        changesMade.push(`Fit line to band width (${obj.width}mm)`);
      } else if (obj.type === 'rectangle') {
        obj.width = Math.min(frameWidth - 1.0, Math.max(4.0, obj.width));
        obj.height = Math.min(frameHeight - 1.0, Math.max(2.0, obj.height));
        obj.x = Math.max(0.5, Math.min(frameWidth - obj.width - 0.5, obj.x));
        obj.y = Math.max(0.5, Math.min(frameHeight - obj.height - 0.5, obj.y));
        changesMade.push(`Fit box dimensions within print frame`);
      } else if (obj.type === 'barcode') {
        obj.width = Math.min(frameWidth - 1.0, Math.max(8.0, obj.width));
        obj.height = Math.min(frameHeight - 1.0, Math.max(4.0, obj.height));
        obj.x = Math.max(0.5, Math.min(frameWidth - obj.width - 0.5, obj.x));
        obj.y = Math.max(0.5, Math.min(frameHeight - obj.height - 0.5, obj.y));
        changesMade.push(`Fit barcode dimensions within print frame`);
      } else if (obj.type === 'qr') {
        const qrSize = Math.min(frameWidth - 1.0, frameHeight - 1.0, Math.max(obj.width, obj.height));
        obj.width = qrSize;
        obj.height = qrSize;
        obj.x = Math.max(0.5, Math.min(frameWidth - obj.width - 0.5, obj.x));
        obj.y = Math.max(0.5, Math.min(frameHeight - obj.height - 0.5, obj.y));
        changesMade.push(`Fit QR code dimensions (${qrSize}x${qrSize}mm)`);
      } else {
        // Text / Field
        const charCount = (obj.content || '').length || 8;
        const maxAllowedW = frameWidth - 1.0;
        let textWidthMm = charCount * obj.fontSizeMm * 0.55;

        if (textWidthMm > maxAllowedW) {
          const reqStretch = Math.max(75, Math.floor((maxAllowedW / textWidthMm) * 100));
          if (reqStretch < 100) {
            obj.horizontalStretchPercent = reqStretch;
            textWidthMm = textWidthMm * (reqStretch / 100);
            changesMade.push(`Condensed "${obj.content || obj.fieldKey}" to ${reqStretch}%`);
          }
        }
        if (textWidthMm > maxAllowedW) {
          const scaleFactor = maxAllowedW / textWidthMm;
          const newFontSizeMm = Math.max(machine.minimumLegibleTextHeightMm, Math.round(obj.fontSizeMm * scaleFactor * 10) / 10);
          if (newFontSizeMm < obj.fontSizeMm) {
            changesMade.push(`Reduced font size from ${obj.fontSizeMm}mm to ${newFontSizeMm}mm`);
            obj.fontSizeMm = newFontSizeMm;
            obj.height = newFontSizeMm;
            obj.fontSizePt = Math.round(newFontSizeMm * 2.83);
          }
        }
        obj.width = Math.min(maxAllowedW, Math.max(4.0, textWidthMm));
        obj.x = Math.max(0.5, Math.min(frameWidth - obj.width - 0.5, obj.x));
        obj.y = Math.max(0.5, Math.min(frameHeight - obj.height - 0.5, obj.y));
      }
    }
  } else if (newTemplate.travel === 'Vertical' && newTemplate.layout === 'Stack') {
    // Vertical + Stack: Locked axis is Width (usableBandWidthMm, ~12.1 mm)
    newTemplate.objects.forEach(obj => {
      if (obj.locked) return;

      if (obj.type === 'line') {
        obj.width = usableBandWidthMm;
        obj.x = machine.contentPaddingLeftMm;
        obj.height = Math.min(Math.max(0.2, obj.height || 0.4), 1.2);
        return;
      }

      if (obj.type === 'rectangle') {
        obj.width = Math.min(usableBandWidthMm, obj.width);
        obj.x = machine.contentPaddingLeftMm;
        return;
      }

      if (obj.type === 'barcode') {
        obj.width = Math.min(usableBandWidthMm, Math.max(8.0, obj.width));
        obj.x = machine.contentPaddingLeftMm;
        obj.height = Math.min(obj.height, 7.0);
        return;
      }

      if (obj.type === 'qr') {
        const qrSize = Math.min(usableBandWidthMm, obj.width, obj.height);
        obj.width = qrSize;
        obj.height = qrSize;
        obj.x = machine.contentPaddingLeftMm;
        return;
      }

      // Text and Field objects:
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
    // Horizontal + Stack: 2-column layout (fitting cleanly within travel length x print band)
    const canvasLen = newTemplate.customLengthMm || 35.0;
    const colWidth = Math.max(10.0, Math.floor((canvasLen - 4.0) / 2));
    const col1X = 1.0;
    const col2X = col1X + colWidth + 1.5;

    const itemsPerCol = Math.max(1, Math.ceil(newTemplate.objects.length / 2));
    const dynamicGap = itemsPerCol > 3 ? 0.4 : (newTemplate.lineGapMm || 0.8);
    const rowH = Math.min(2.8, Math.max(1.8, Math.floor(((usableBandHeightMm - (itemsPerCol - 1) * dynamicGap) / itemsPerCol) * 10) / 10));

    newTemplate.objects.forEach((obj, idx) => {
      if (obj.locked) return;
      const isCol2 = idx >= itemsPerCol;
      const colRowIdx = isCol2 ? idx - itemsPerCol : idx;

      obj.x = isCol2 ? col2X : col1X;
      obj.y = Math.round((machine.contentPaddingTopMm + colRowIdx * (rowH + dynamicGap)) * 10) / 10;
      if (obj.type !== 'barcode' && obj.type !== 'qr' && obj.type !== 'line') {
        obj.fontSizeMm = rowH;
        obj.height = rowH;
      } else if (obj.type === 'line') {
        obj.height = Math.min(rowH, 0.4);
      } else {
        obj.height = Math.min(usableBandHeightMm - obj.y, Math.max(rowH, 5.0));
      }
      obj.width = colWidth;
    });
    changesMade.push('Arranged objects into 2-column horizontal stack layout');
  } else if (newTemplate.travel === 'Horizontal' && newTemplate.layout === 'Strip') {
    // Horizontal Strip: Flow objects horizontally across the length
    const canvasLen = newTemplate.customLengthMm || 35.0;
    let currentX = machine.contentPaddingLeftMm;
    const totalCount = newTemplate.objects.length || 1;
    const maxPerObjW = Math.max(4.0, (canvasLen - 1.0 - (totalCount * 0.8)) / totalCount);

    newTemplate.objects.forEach(obj => {
      if (obj.locked) return;
      obj.width = Math.min(obj.width, maxPerObjW);
      obj.x = Math.round(currentX * 10) / 10;
      obj.y = machine.contentPaddingTopMm;
      obj.height = Math.min(obj.height, usableBandHeightMm);
      currentX += obj.width + 0.8;
    });
    changesMade.push('Arranged objects along horizontal strip');
  } else {
    // Vertical Strip
    reflowStackedLines(newTemplate, machine);
    changesMade.push('Reflowed lines vertically');
  }

  // Final Safety Guarantee: Clamp all objects within substrate canvas frame
  newTemplate.objects.forEach(obj => {
    obj.width = Math.min(obj.width, frameWidth - 1.0);
    obj.height = Math.min(obj.height, frameHeight - 1.0);
    obj.x = Math.max(0.5, Math.min(frameWidth - obj.width - 0.5, obj.x));
    obj.y = Math.max(0.5, Math.min(frameHeight - obj.height - 0.5, obj.y));
  });

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
