/**
 * Pass Planner and Layout Advisor Service
 * Calculates passes, travel alternatives, and machine pass sheets
 */

import type { Template, MachineProfile, PackProfile, PassPlan, PassDefinition, TravelDirection, LayoutMode } from '../types';

export interface LayoutAlternative {
  travel: TravelDirection;
  layout: LayoutMode;
  passes: number;
  readabilityScore: 'High' | 'Medium' | 'Low';
  oneLineReason: string;
  isRecommended: boolean;
}

/**
 * Evaluates template, machine, and pack profile to calculate the optimal layout and viable alternatives
 */
export function getLayoutAdvice(
  template: Template,
  machine: MachineProfile,
  packProfile: PackProfile
): {
  recommended: LayoutAlternative;
  alternatives: LayoutAlternative[];
} {
  const band = machine.printBandMm;

  // Stack calculation: if every object width fits within band, 1 sweep
  const allFitStack = template.objects.every(o => o.width <= band + 0.1);
  const stackPasses = allFitStack ? 1 : Math.ceil(template.objects.length / 3);

  // Strip calculation: sum of heights + gaps
  const totalThickness = template.objects.reduce((sum, o) => sum + o.height, 0) + (template.objects.length - 1) * template.lineGapMm;
  const stripPasses = Math.ceil(totalThickness / band);

  const alternatives: LayoutAlternative[] = [
    {
      travel: 'Vertical',
      layout: 'Stack',
      passes: stackPasses,
      readabilityScore: 'High',
      oneLineReason: stackPasses === 1 
        ? 'Vertical + Stack — all values fit comfortably within the 12.5 mm print band in 1 single sweep.' 
        : `Vertical + Stack — requires ${stackPasses} passes due to object width.`,
      isRecommended: stackPasses === 1
    },
    {
      travel: 'Horizontal',
      layout: 'Strip',
      passes: stripPasses,
      readabilityScore: stripPasses === 1 ? 'High' : 'Medium',
      oneLineReason: stripPasses === 1 
        ? 'Horizontal + Strip — long continuous lines across horizontal axis in 1 pass.'
        : `Horizontal + Strip — requires ${stripPasses} passes to accommodate stacked height.`,
      isRecommended: stackPasses > 1 && stripPasses === 1
    },
    {
      travel: 'Vertical',
      layout: 'Strip',
      passes: stripPasses,
      readabilityScore: 'Medium',
      oneLineReason: 'Vertical + Strip — rotated text along vertical pack travel.',
      isRecommended: false
    },
    {
      travel: 'Horizontal',
      layout: 'Stack',
      passes: stackPasses,
      readabilityScore: 'Medium',
      oneLineReason: 'Horizontal + Stack — vertical column blocks along horizontal travel.',
      isRecommended: false
    }
  ];

  const recommended = alternatives.find(a => a.isRecommended) || alternatives[0];

  return {
    recommended,
    alternatives
  };
}

/**
 * Builds a concrete PassPlan for production and export
 */
export function buildPassPlan(
  template: Template,
  machine: MachineProfile,
  packProfile: PackProfile,
  batchPrefix: string = 'TP014'
): PassPlan {
  const { recommended } = getLayoutAdvice(template, machine, packProfile);
  const band = machine.printBandMm;
  const passes: PassDefinition[] = [];

  if (template.travel === 'Vertical' && template.layout === 'Stack') {
    // Check if any object exceeds band
    const oversized = template.objects.filter(o => o.width > band + 0.1);
    if (oversized.length === 0) {
      // 1 single pass
      let maxTravel = 25.0;
      template.objects.forEach(o => {
        if (o.y + o.height > maxTravel) maxTravel = o.y + o.height;
      });
      passes.push({
        passNumber: 1,
        objectIds: template.objects.map(o => o.id),
        linesSummary: `${template.objects.length} lines (${template.objects.map(o => o.fieldKey || o.content).slice(0, 3).join(', ')}...)`,
        startOffsetMm: packProfile.printWindowStartY,
        travelLengthMm: Math.round(maxTravel * 10) / 10,
        direction: 'Vertical',
        rotation: 0,
        fileName: `${batchPrefix.toUpperCase()}A.BMP`
      });
    } else {
      // Multi-pass: split lines without splitting any single line
      const mid = Math.ceil(template.objects.length / 2);
      const pass1Objs = template.objects.slice(0, mid);
      const pass2Objs = template.objects.slice(mid);

      passes.push({
        passNumber: 1,
        objectIds: pass1Objs.map(o => o.id),
        linesSummary: `Lines 1-${mid}`,
        startOffsetMm: packProfile.printWindowStartY,
        travelLengthMm: 20.0,
        direction: 'Vertical',
        rotation: 0,
        fileName: `${batchPrefix.toUpperCase()}A1.BMP`
      });

      passes.push({
        passNumber: 2,
        objectIds: pass2Objs.map(o => o.id),
        linesSummary: `Lines ${mid + 1}-${template.objects.length}`,
        startOffsetMm: packProfile.printWindowStartY + 20.0,
        travelLengthMm: 20.0,
        direction: 'Vertical',
        rotation: 0,
        fileName: `${batchPrefix.toUpperCase()}A2.BMP`
      });
    }
  } else {
    // Default 1 pass for configured layout
    passes.push({
      passNumber: 1,
      objectIds: template.objects.map(o => o.id),
      linesSummary: 'Full Layout Pass',
      startOffsetMm: packProfile.printWindowStartX,
      travelLengthMm: 35.0,
      direction: template.travel,
      rotation: 0,
      fileName: `${batchPrefix.toUpperCase()}A.BMP`
    });
  }

  return {
    totalPasses: passes.length,
    passes,
    oneLineReason: recommended.oneLineReason
  };
}
