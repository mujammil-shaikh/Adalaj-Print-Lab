/**
 * Main Application Header and Navigation Bar
 * Incorporates brand lockup, compact workspace switcher, active batch indicator,
 * Simple/Advanced mode toggle, AI copilot trigger, and utilities
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
  Cloud
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import type { Batch, Product, MachineProfile } from '../../types';

interface HeaderProps {
  currentRoute: string;
  onNavigate: (route: string) => void;
  activeBatch: Batch | null;
  activeProduct?: Product | null;
  machines?: MachineProfile[];
  activeMachine?: MachineProfile | null;
  onSelectMachine?: (m: MachineProfile) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isAdvancedMode: boolean;
  onToggleAdvancedMode: () => void;
  onOpenCommandPalette: () => void;
  onOpenCheatSheet: () => void;
  onOpenAIDrawer: () => void;
  onStartTour: () => void;
  onOpenSyncModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  activeBatch,
  activeProduct,
  machines,
  activeMachine,
  onSelectMachine,
  theme,
  onToggleTheme,
  isAdvancedMode,
  onToggleAdvancedMode,
  onOpenCommandPalette,
  onOpenCheatSheet,
  onOpenAIDrawer,
  onStartTour,
  onOpenSyncModal
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home, shortcut: 'Alt+1' },
    { id: 'products', label: 'Products', icon: Package, shortcut: 'Alt+2' },
    { id: 'batches', label: 'Batches', icon: Layers, shortcut: 'Alt+3' },
    { id: 'design', label: 'Design', icon: PenTool, shortcut: 'Alt+4' },
    { id: 'print', label: 'Print', icon: Printer, shortcut: 'Alt+5' },
    { id: 'history', label: 'History', icon: History, shortcut: 'Alt+6' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: 'Alt+7' },
  ];

  return (
    <header className="sticky top-0 z-40 h-14 bg-zinc-950 border-b border-zinc-800 px-4 flex items-center justify-between gap-3 shadow-md shrink-0 select-none">
      {/* Brand & Active Product / Batch Lockup */}
      <div className="flex items-center gap-3 shrink-0">
        <div 
          className="flex items-center gap-2 cursor-pointer group" 
          onClick={() => onNavigate('home')} 
          title="Adalaj Print Lab - Home"
        >
          <img 
            src="/brand/Adalaj_Print_Lab_Printer_Icon.svg" 
            alt="Adalaj Print Lab" 
            className="w-8 h-8 rounded-lg border border-amber-500/40 shadow-xs object-contain bg-black shrink-0 group-hover:scale-105 transition-transform"
          />
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-sm font-black tracking-wider text-zinc-100 font-sans uppercase">ADALAJ</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500 text-black tracking-wider shadow-xs">
              PRINT LAB
            </span>
          </div>
        </div>

        {/* Active Product & Batch Chip */}
        <div 
          onClick={() => onNavigate('batches')}
          className="cursor-pointer hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-colors text-xs"
          title="Active Batch & Product (click to manage)"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-zinc-300 font-medium max-w-[120px] truncate" title={activeProduct?.name || 'Turmeric Powder'}>
            {activeProduct?.name || 'Turmeric'}
          </span>
          <span className="text-zinc-600 font-mono">•</span>
          <span className="text-amber-400 font-mono font-bold">
            {activeBatch ? activeBatch.id : 'ADTP014'}
          </span>
        </div>

        {/* Active Machine Switcher Chip */}
        {activeMachine && machines && machines.length > 0 && (
          <div 
            className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
            title="Active Hardware Machine Profile"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={activeMachine.id}
              onChange={e => {
                const target = machines.find(m => m.id === e.target.value);
                if (target && onSelectMachine) onSelectMachine(target);
              }}
              className="bg-transparent text-amber-300 font-bold focus:outline-hidden cursor-pointer text-xs"
            >
              {machines.map(m => (
                <option key={m.id} value={m.id} className="bg-zinc-950 text-white font-mono">
                  {m.name} ({m.printBandMm}mm)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Workspace Switcher (Segmented Control - Fits Comfortably, No Sprawl) */}
      <nav aria-label="Workspaces" className="flex items-center bg-zinc-900/90 border border-zinc-800 p-0.5 rounded-xl shadow-inner shrink-0 overflow-x-auto no-scrollbar">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentRoute === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-black font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/70'
              }`}
              title={`${item.label} (${item.shortcut})`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Action Utilities */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Simple / Advanced Toggle */}
        <button
          onClick={onToggleAdvancedMode}
          className={`hidden 2xl:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors border ${
            isAdvancedMode 
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' 
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle between Simple Operator Mode and Advanced Mode"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{isAdvancedMode ? 'Advanced' : 'Simple'}</span>
        </button>

        <PWAInstallButton />

        {/* Universal Cloud Sync Trigger */}
        <button
          onClick={onOpenSyncModal}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-emerald-400 hover:border-emerald-500/40 transition-colors cursor-pointer"
          title="Universal Persistence & Device Sync"
        >
          <Cloud className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline text-[11px] font-semibold">Sync</span>
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
          title="Command Palette (Ctrl+K)"
        >
          <Search className="w-3.5 h-3.5 text-amber-400" />
          <kbd className="text-[10px] font-mono text-zinc-400 hidden sm:inline">Ctrl+K</kbd>
        </button>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={onOpenAIDrawer}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors cursor-pointer"
          title="Open AI Copilot (Alt+A)"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* Guided Tour Trigger */}
        <button
          onClick={onStartTour}
          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Replay Guided Tour (F1)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Keyboard Cheat Sheet */}
        <button
          onClick={onOpenCheatSheet}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono font-bold text-amber-400 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Keyboard Cheat Sheet (Ctrl+/ or ?)"
        >
          ?
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Toggle High-Contrast Theme (Alt+T)"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-300" />}
        </button>
      </div>
    </header>
  );
};
