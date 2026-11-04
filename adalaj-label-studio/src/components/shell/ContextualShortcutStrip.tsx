/**
 * Contextual Shortcut Strip
 * Displays 6-8 of the most relevant keyboard shortcuts for the current view and selection.
 */

import React from 'react';
import { Keyboard } from 'lucide-react';

interface ShortcutItem {
  key: string;
  description: string;
  action?: () => void;
}

interface ContextualShortcutStripProps {
  currentRoute: string;
  activeSelection?: string;
  onOpenCheatSheet: () => void;
}

export const ContextualShortcutStrip: React.FC<ContextualShortcutStripProps> = ({
  currentRoute,
  activeSelection,
  onOpenCheatSheet
}) => {
  // Determine relevant hotkeys based on route
  const getShortcutsForRoute = (): ShortcutItem[] => {
    switch (currentRoute) {
      case 'design':
        return [
          { key: 'Shift+F', description: 'Fit Selected' },
          { key: 'Shift+A', description: 'Fit All Lines' },
          { key: 'Alt+O', description: 'Cycle 4 Orientations' },
          { key: ',', description: 'Line Gap -' },
          { key: '.', description: 'Line Gap +' },
          { key: '0', description: 'Fit Canvas' },
          { key: '1', description: '100% Scale' },
          { key: 'K', description: 'Printer View' },
          { key: 'Ctrl+S', description: 'Save Template' }
        ];
      case 'batches':
        return [
          { key: 'N', description: 'New Batch' },
          { key: 'Enter', description: 'Open Allocation' },
          { key: 'E', description: 'Edit' },
          { key: 'Ctrl+Enter', description: 'Confirm Allocation' },
          { key: 'P', description: 'Print Labels' }
        ];
      case 'products':
        return [
          { key: 'N', description: 'New Product' },
          { key: 'B', description: 'Bulk Edit' },
          { key: 'F2', description: 'Edit Cell' },
          { key: 'Space', description: 'Select Row' },
          { key: 'Ctrl+Shift+E', description: 'Export CSV' }
        ];
      case 'print':
        return [
          { key: 'Ctrl+E', description: 'Export BMP' },
          { key: 'Ctrl+Z', description: 'Download ZIP' },
          { key: 'T', description: 'Test Print' },
          { key: 'M', description: 'Mark Printed' },
          { key: 'D', description: 'Diagnostics' }
        ];
      default:
        return [
          { key: 'Alt+1..7', description: 'Switch Pages' },
          { key: 'Ctrl+K', description: 'Command Palette' },
          { key: ';', description: 'Hint Mode' },
          { key: '?', description: 'Cheat Sheet' },
          { key: 'Alt+A', description: 'AI Copilot' },
          { key: 'Alt+T', description: 'Toggle Theme' }
        ];
    }
  };

  const shortcuts = getShortcutsForRoute();

  return (
    <footer className="sticky bottom-0 z-30 bg-zinc-950 border-t border-zinc-800 px-4 py-1.5 flex items-center justify-between text-xs text-zinc-400 select-none">
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-0.5">
        <div className="flex items-center gap-1.5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
          <Keyboard className="w-3.5 h-3.5 text-amber-500" />
          <span>Hotkeys:</span>
        </div>

        {shortcuts.map((sc, i) => (
          <div key={i} className="flex items-center gap-1.5 whitespace-nowrap">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-zinc-900 border border-zinc-700 text-amber-400 shadow-2xs">
              {sc.key}
            </kbd>
            <span className="text-zinc-300 text-[11px]">{sc.description}</span>
            {i < shortcuts.length - 1 && <span className="text-zinc-700">•</span>}
          </div>
        ))}
      </div>

      <div className="hidden md:flex items-center gap-2 pl-3 border-l border-zinc-800">
        <button
          onClick={onOpenCheatSheet}
          className="text-[11px] text-zinc-400 hover:text-amber-400 underline decoration-zinc-700 transition-colors"
        >
          View all shortcuts (Ctrl+/)
        </button>
      </div>
    </footer>
  );
};
