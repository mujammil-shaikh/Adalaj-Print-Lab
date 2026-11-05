/**
 * Main Application Header and Navigation Bar
 * Incorporates active batch indicator, route tabs, Simple/Advanced mode toggle, AI copilot trigger, and theme toggle
 */

import React from 'react';
import { 
  Home, 
  Package, 
  Layers, 
  PenTool, 
  Printer, 
  History, 
  Settings, 
  Search, 
  Sparkles, 
  Sun, 
  Moon, 
  HelpCircle,
  Sliders,
  Sparkle
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { Batch, Product } from '../../types';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  activeBatch: Batch | null;
  activeProduct?: Product | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isAdvancedMode: boolean;
  onToggleAdvancedMode: () => void;
  onOpenCommandPalette: () => void;
  onOpenCheatSheet: () => void;
  onOpenAIDrawer: () => void;
  onStartTour: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  activeBatch,
  activeProduct,
  theme,
  onToggleTheme,
  isAdvancedMode,
  onToggleAdvancedMode,
  onOpenCommandPalette,
  onOpenCheatSheet,
  onOpenAIDrawer,
  onStartTour
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, shortcut: 'Alt+1' },
    { id: 'products', label: 'Products & SKUs', icon: Package, shortcut: 'Alt+2' },
    { id: 'batches', label: 'Batches', icon: Layers, shortcut: 'Alt+3' },
    { id: 'design', label: 'Design', icon: PenTool, shortcut: 'Alt+4' },
    { id: 'print', label: 'Print & USB', icon: Printer, shortcut: 'Alt+5' },
    { id: 'history', label: 'History', icon: History, shortcut: 'Alt+6' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'Alt+7' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950 border-b-2 border-zinc-800 px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 shadow-md">
      {/* Brand & Active Batch Chip */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-black font-black flex items-center justify-center text-sm shadow-sm">
            AD
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-zinc-100 flex items-center gap-1.5">
              ADALAJ <span className="text-amber-400 font-medium text-xs">Print Lab</span>
            </h1>
            <p className="text-[10px] text-zinc-400 font-mono">Universal Mark & Code v3</p>
          </div>
        </div>

        {/* Active Product & Batch Chip */}
        <div 
          onClick={() => onNavigate('batches')}
          className="cursor-pointer hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 transition-colors text-xs"
          title="Click to view and switch Batches & Products"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-zinc-400 font-medium">Product:</span>
          <span className="text-zinc-100 font-semibold">{activeProduct?.name || 'Turmeric Powder'}</span>
          <span className="text-zinc-600">•</span>
          <span className="text-zinc-400 font-medium">Batch:</span>
          <span className="text-amber-400 font-mono font-bold">
            {activeBatch ? activeBatch.id : 'ADTP014'}
          </span>
        </div>

        {/* Compact Active Batch Chip on Mobile */}
        <div 
          onClick={() => onNavigate('batches')}
          className="cursor-pointer sm:hidden flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[11px]"
          title="Active Batch"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-amber-400 font-mono font-bold">{activeBatch ? activeBatch.id : 'ADTP014'}</span>
        </div>

        {/* Mode Toggle */}
        <button
          onClick={onToggleAdvancedMode}
          className={`hidden lg:flex items-center gap-1.5 px-2 py-1 rounded text-xs font-semibold transition-colors border ${
            isAdvancedMode 
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle between Simple Operator Mode and Advanced Engineering Mode"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isAdvancedMode ? 'Advanced Mode' : 'Simple Mode'}</span>
        </button>
      </div>

      {/* Main Navigation Tabs */}
      <nav aria-label="Main Navigation" className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1 w-full md:w-auto -mx-1 px-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors border ${
                isActive
                  ? 'bg-amber-500 text-black border-amber-400 shadow-sm'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              <kbd className={`hidden xl:inline text-[9px] font-mono px-1 py-0.2 rounded ${isActive ? 'bg-amber-600 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                {item.shortcut}
              </kbd>
            </button>
          );
        })}
      </nav>

      {/* Quick Action Utilities */}
      <div className="flex items-center gap-2">
        <PWAInstallButton />

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          title="Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-amber-400" />
          <kbd className="text-[10px] font-mono text-zinc-400">Ctrl+K</kbd>
        </button>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={onOpenAIDrawer}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-500/20 border border-amber-500/60 text-xs font-bold text-amber-300 hover:bg-amber-500/30"
          title="Open AI Copilot (Alt+A)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Guided Tour Trigger */}
        <button
          onClick={onStartTour}
          className="p-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          title="Replay Guided Tour (F1)"
        >
          <HelpCircle className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Keyboard Cheat Sheet */}
        <button
          onClick={onOpenCheatSheet}
          className="p-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          title="Keyboard Cheat Sheet (Ctrl+/ or ?)"
        >
          <kbd className="text-xs font-mono font-bold text-amber-400">?</kbd>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          title="Toggle High-Contrast Theme (Alt+T)"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-300" />}
        </button>
      </div>
    </header>
  );
};
