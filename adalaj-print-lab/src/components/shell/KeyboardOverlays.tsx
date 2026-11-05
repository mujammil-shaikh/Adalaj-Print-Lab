/**
 * Keyboard Overlays:
 * 1. Command Palette (Ctrl+K)
 * 2. Hint Mode Overlay (';' or Ctrl+;)
 * 3. Cheat Sheet Modal ('?' or Ctrl+/)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, Keyboard, X, ArrowRight, CornerDownLeft, Sparkles } from 'lucide-react';
import { actionRegistry, type RegisteredAction } from '../../services/actionRegistry';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: string) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allActions = actionRegistry.getAll();
  const filtered = allActions.filter(a => 
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.area.toLowerCase().includes(query.toLowerCase()) ||
    (a.shortcut && a.shortcut.toLowerCase().includes(query.toLowerCase()))
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].handler();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/70 backdrop-blur-xs p-4">
      <div 
        className="w-full max-w-xl rounded-xl bg-zinc-900 border-2 border-zinc-700 shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        onKeyDown={handleKeyDown}
      >
        {/* Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-950">
          <Search className="w-5 h-5 text-amber-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, shortcut, or search actions..."
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 rounded border border-zinc-700">
            ESC to close
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No actions match "{query}"
            </div>
          ) : (
            filtered.map((action, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    action.handler();
                    onClose();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs transition-colors ${
                    isSelected ? 'bg-amber-500/20 border border-amber-500/50 text-amber-200' : 'hover:bg-zinc-800 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {action.area}
                    </span>
                    <span className="font-medium text-zinc-100">{action.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {action.shortcut && (
                      <kbd className="px-2 py-0.5 text-[11px] font-mono rounded bg-zinc-800 text-amber-400 border border-zinc-700">
                        {action.shortcut}
                      </kbd>
                    )}
                    {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Use ↑ ↓ to navigate</span>
          <span>ENTER to execute</span>
        </div>
      </div>
    </div>
  );
};

export const CheatSheetModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useState('');

  if (!isOpen) return null;

  const actions = actionRegistry.getAll();
  const areas = ['Global', 'Navigation', 'Designer', 'Batch', 'Print', 'Settings'] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-4xl max-h-[85vh] rounded-xl bg-zinc-900 border-2 border-zinc-700 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-zinc-100">Keyboard Shortcuts & Action Reference</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700"
            >
              Print 1-Page Card
            </button>
            <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-100">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <input
            type="text"
            placeholder="Search shortcuts..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        {/* Grid by Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {areas.map(area => {
            const areaActions = actions.filter(a => 
              a.area === area && 
              (a.label.toLowerCase().includes(filter.toLowerCase()) || 
               (a.shortcut && a.shortcut.toLowerCase().includes(filter.toLowerCase())))
            );
            if (areaActions.length === 0) return null;

            return (
              <div key={area} className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-zinc-800 pb-1">
                  {area}
                </h3>
                <div className="space-y-1">
                  {areaActions.map(action => (
                    <div key={action.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-zinc-800/60">
                      <span className="text-zinc-300">{action.label}</span>
                      {action.shortcut ? (
                        <kbd className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                          {action.shortcut}
                        </kbd>
                      ) : (
                        <span className="text-[10px] text-zinc-600">via palette</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-6 py-3 bg-zinc-950 border-t border-zinc-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold rounded bg-amber-500 text-black hover:bg-amber-400"
          >
            Done (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
