/**
 * Action Registry & Keyboard Engine
 * Provides single source of truth for all user actions across keyboard, mouse, touch, and voice.
 */

import type { ActionDefinition } from '../types';

export type ActionHandler = () => void;

export interface RegisteredAction extends ActionDefinition {
  isCustomShortcut?: boolean;
}

class ActionRegistry {
  private actions: Map<string, RegisteredAction> = new Map();
  private listeners: Set<() => void> = new Set();
  private customShortcutsKey = 'als_custom_shortcuts_v1';
  private hintModeActive = false;
  private hintListeners: Set<(active: boolean) => void> = new Set();

  constructor() {
    this.loadCustomShortcuts();
  }

  private loadCustomShortcuts() {
    try {
      const saved = localStorage.getItem(this.customShortcutsKey);
      if (saved) {
        const mappings: Record<string, string> = JSON.parse(saved);
        for (const [id, shortcut] of Object.entries(mappings)) {
          const action = this.actions.get(id);
          if (action) {
            action.shortcut = shortcut;
            action.isCustomShortcut = true;
          }
        }
      }
    } catch {
      // LocalStorage not available or parse error
    }
  }

  public register(action: ActionDefinition) {
    const existingCustom = this.getSavedShortcut(action.id);
    this.actions.set(action.id, {
      ...action,
      shortcut: existingCustom || action.shortcut,
      isCustomShortcut: !!existingCustom
    });
    this.notify();
  }

  public unregister(id: string) {
    this.actions.delete(id);
    this.notify();
  }

  public get(id: string): RegisteredAction | undefined {
    return this.actions.get(id);
  }

  public getAll(): RegisteredAction[] {
    return Array.from(this.actions.values());
  }

  public getByArea(area: ActionDefinition['area']): RegisteredAction[] {
    return this.getAll().filter(a => a.area === area);
  }

  public execute(id: string): boolean {
    const action = this.actions.get(id);
    if (action && action.enabled) {
      try {
        action.handler();
        return true;
      } catch (err) {
        console.error(`Error executing action ${id}:`, err);
      }
    }
    return false;
  }

  public updateShortcut(id: string, newShortcut: string): { success: boolean; conflictWith?: string } {
    // Check conflicts
    const conflict = this.getAll().find(a => a.id !== id && a.shortcut?.toLowerCase() === newShortcut.toLowerCase());
    if (conflict) {
      return { success: false, conflictWith: conflict.label };
    }

    const action = this.actions.get(id);
    if (action) {
      action.shortcut = newShortcut;
      action.isCustomShortcut = true;
      this.saveCustomShortcut(id, newShortcut);
      this.notify();
      return { success: true };
    }
    return { success: false };
  }

  public resetShortcut(id: string) {
    const action = this.actions.get(id);
    if (action) {
      this.removeSavedShortcut(id);
      action.isCustomShortcut = false;
      this.notify();
    }
  }

  public resetAllShortcuts() {
    localStorage.removeItem(this.customShortcutsKey);
    for (const action of this.actions.values()) {
      action.isCustomShortcut = false;
    }
    this.notify();
  }

  private getSavedShortcut(id: string): string | null {
    try {
      const saved = localStorage.getItem(this.customShortcutsKey);
      if (saved) {
        const mappings = JSON.parse(saved);
        return mappings[id] || null;
      }
    } catch {
      // ignore
    }
    return null;
  }

  private saveCustomShortcut(id: string, shortcut: string) {
    try {
      const saved = localStorage.getItem(this.customShortcutsKey);
      const mappings = saved ? JSON.parse(saved) : {};
      mappings[id] = shortcut;
      localStorage.setItem(this.customShortcutsKey, JSON.stringify(mappings));
    } catch {
      // ignore
    }
  }

  private removeSavedShortcut(id: string) {
    try {
      const saved = localStorage.getItem(this.customShortcutsKey);
      if (saved) {
        const mappings = JSON.parse(saved);
        delete mappings[id];
        localStorage.setItem(this.customShortcutsKey, JSON.stringify(mappings));
      }
    } catch {
      // ignore
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  // Hint Mode state
  public isHintMode(): boolean {
    return this.hintModeActive;
  }

  public setHintMode(active: boolean) {
    this.hintModeActive = active;
    this.hintListeners.forEach(fn => fn(active));
  }

  public toggleHintMode() {
    this.setHintMode(!this.hintModeActive);
  }

  public subscribeHintMode(listener: (active: boolean) => void): () => void {
    this.hintListeners.add(listener);
    return () => this.hintListeners.delete(listener);
  }
}

export const actionRegistry = new ActionRegistry();
