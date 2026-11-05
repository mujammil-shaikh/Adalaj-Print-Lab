/**
 * Guided Spotlight Tour Component
 * Walkthrough of the core keyboard-first and universal workflow
 */

import React, { useState } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ isOpen, onClose, onNavigate }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to Adalaj Print Lab',
      route: 'home',
      content: 'A keyboard-first, measurement-driven, machine-agnostic print and marking platform. Built for any packaging, direct-product marking, and any printer technology (TIJ, CIJ, Laser, Thermal).',
      tip: 'Press Alt+1 through Alt+7 at any time to instantly switch between workspaces.'
    },
    {
      title: '1. Products & SKU Matrix',
      route: 'products',
      content: 'Manage items, pack sizes, MRPs, and batch codes. Seed data includes Turmeric Powder, Red Chilli, Coriander, Garam Masala, and Kashmiri Chilli across 6 sizes.',
      tip: 'Notice Turmeric 100g has ₹50 MRP, while other sizes explicitly show "Needs MRP" - the system never invents missing business data.'
    },
    {
      title: '2. Batches & Precise Allocations',
      route: 'batches',
      content: 'Track raw material kg, calculate pack counts deterministically (floor(kg * 1000 / packGrams)), and maintain loose balance inventory for future packing.',
      tip: 'Historical batch ADTP013 is preserved with exact snapshots for reproducible reprints.'
    },
    {
      title: '3. Measurement-Driven Designer',
      route: 'design',
      content: 'Visual canvas in true physical millimetres with high-precision rulers (10mm, 5mm, 1mm hierarchy). Toggle between Pack View and Printer View at any time.',
      tip: 'Use Shift+F to Fit Selected line or Shift+A to Fit All Lines into the 12.5 mm print band.'
    },
    {
      title: '4. Four Travel × Layout Combinations',
      route: 'design',
      content: 'Switch between Vertical + Stack, Vertical + Strip, Horizontal + Strip, and Horizontal + Stack using the 2×2 selector or Alt+O. Pass Planner automatically calculates sweeps.',
      tip: 'All design changes use the shared "Apply To" scope to prevent overwriting SKU business data.'
    },
    {
      title: '5. Production Proofing & 1-Bit BMP Export',
      route: 'print',
      content: 'Inspect the Quality Readiness Engine, run a Test Print, and export pure 1-bit BMP bitmaps with FAT32-safe 8.3 filenames and an INDEX.TXT manifest in a single ZIP.',
      tip: 'Press Ctrl+K anytime for the Command Palette or ? for the complete Keyboard Cheat Sheet.'
    }
  ];

  const step = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      onNavigate(steps[next].route);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      onNavigate(steps[prev].route);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border-2 border-amber-500/80 shadow-2xl p-6 text-zinc-100 flex flex-col gap-4">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              Interactive Guide — Step {currentStep + 1} of {steps.length}
            </span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-3 py-1">
          <h2 className="text-lg font-black tracking-tight text-white">{step.title}</h2>
          <p className="text-sm text-zinc-300 leading-relaxed">{step.content}</p>

          <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-xs text-amber-300/90 flex items-start gap-2">
            <span className="font-bold text-amber-400">Pro Tip:</span>
            <span>{step.tip}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Skip Tour (Esc)
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
