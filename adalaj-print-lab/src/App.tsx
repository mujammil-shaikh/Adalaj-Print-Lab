/**
 * Adalaj Print Lab - Print Management Application Root
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  db, 
  initializeDatabase, 
  saveUniversalSnapshot, 
  restoreFromUniversalSnapshot, 
  parseUniversalSyncString, 
  generateUniversalSyncString 
} from './services/db';
import { actionRegistry } from './services/actionRegistry';
import type { 
  Business, 
  Brand, 
  Product, 
  SKU, 
  PackProfile, 
  MachineProfile, 
  MediaProfile, 
  Template, 
  Batch, 
  AuditLogEntry,
  DesignScope,
  PrintJob
} from './types';
import { 
  resolveLayout, 
  normalizePackSize,
  buildPackDefaultTemplate, 
  buildSkuOverrideTemplate, 
  getSkuOverrideTemplateId,
  getPackDefaultTemplateId,
  default100gTemplate,
  default500gTemplate,
  turmeric100gOverrideTemplate,
  turmeric500gOverrideTemplate,
  coriander100gOverrideTemplate,
  coriander500gOverrideTemplate,
  garamMasala100gOverrideTemplate,
  garamMasala500gOverrideTemplate,
  getCleanGlobalPackDefault,
  getFactoryProductTemplate
} from './services/layoutRegistry';
import { generateNextBatchId, duplicateBatchCommand } from './domain/batchCommands';

// Shell Components
import { Header } from './components/shell/Header';
import { ContextualShortcutStrip } from './components/shell/ContextualShortcutStrip';
import { CommandPalette, CheatSheetModal } from './components/shell/KeyboardOverlays';
import { GuidedTour } from './components/shell/GuidedTour';
import { OfflineIndicator } from './components/shell/PWAInstallButton';
import { AICopilotDrawer } from './components/ai/AICopilotDrawer';
import { UniversalSyncModal } from './components/shell/UniversalSyncModal';

// Workspace Views
import { HomeView } from './components/home/HomeView';
import { ProductsView } from './components/products/ProductsView';
import { BatchesView } from './components/batches/BatchesView';
import { DesignerView } from './components/designer/DesignerView';
import { PrintView } from './components/print/PrintView';
import { HistoryView } from './components/history/HistoryView';
import { SettingsView } from './components/settings/SettingsView';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return localStorage.getItem('als_active_route') || 'home';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState(false);
  const [isAIDrawerOpen, setIsAIDrawerOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Core Domain State
  const [business, setBusiness] = useState<Business | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [packProfiles, setPackProfiles] = useState<PackProfile[]>([]);
  const [machines, setMachines] = useState<MachineProfile[]>([]);
  const [activeMachine, setActiveMachine] = useState<MachineProfile | null>(null);
  const [mediaProfiles, setMediaProfiles] = useState<MediaProfile[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Active Selections
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeSku, setActiveSku] = useState<SKU | null>(null);
  const [activePackProfile, setActivePackProfile] = useState<PackProfile | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  const [printAllocId, setPrintAllocId] = useState<string>('');
  const [reprintJob, setReprintJob] = useState<PrintJob | null>(null);

  // Safe navigation with persistence
  const navigateToRoute = useCallback((route: string) => {
    setCurrentRoute(route);
    localStorage.setItem('als_active_route', route);
  }, []);

  // Initialize DB and load all data
  const loadDatabase = useCallback(async () => {
    // 1. Check for universal sync URL hash on startup (e.g. #sync=<base64>)
    if (typeof window !== 'undefined' && window.location.hash.startsWith('#sync=')) {
      try {
        const encoded = window.location.hash.replace('#sync=', '');
        const snapshot = parseUniversalSyncString(encoded);
        if (snapshot) {
          await restoreFromUniversalSnapshot(snapshot);
          window.history.replaceState(null, '', window.location.pathname);
          console.info('Universal workspace snapshot applied from share URL.');
        }
      } catch (err) {
        console.error('Failed to parse universal sync URL hash:', err);
      }
    }

    await initializeDatabase();

    const [
      bizzes,
      brandsList,
      prods,
      skuList,
      packs,
      machs,
      medias,
      tmpls,
      bts,
      audits
    ] = await Promise.all([
      db.businesses.toArray(),
      db.brands.toArray(),
      db.products.toArray(),
      db.skus.toArray(),
      db.packProfiles.toArray(),
      db.machineProfiles.toArray(),
      db.mediaProfiles.toArray(),
      db.templates.toArray(),
      db.batches.toArray(),
      db.auditLogs.toArray()
    ]);

    // Ensure established default templates exist if completely missing
    const currentTmpls = [...tmpls];
    const templatesToEnsure: Template[] = [];

    if (!currentTmpls.some(t => t.id === 'tmpl_pack_default_100g' || (t.packSizeScope === '100g' && t.isPackSizeDefault))) {
      templatesToEnsure.push(default100gTemplate);
      currentTmpls.push(default100gTemplate);
    }
    if (!currentTmpls.some(t => t.id === 'tmpl_pack_default_500g' || (t.packSizeScope === '500g' && t.isPackSizeDefault))) {
      templatesToEnsure.push(default500gTemplate);
      currentTmpls.push(default500gTemplate);
    }

    if (templatesToEnsure.length > 0) {
      await db.templates.bulkPut(templatesToEnsure);
      await saveUniversalSnapshot();
    }

    setBusiness(bizzes[0] || null);
    setBrand(brandsList[0] || null);
    setProducts(prods);
    setSkus(skuList);
    setPackProfiles(packs);
    setMachines(machs);
    setMediaProfiles(medias);
    setTemplates(currentTmpls);
    setBatches(bts);
    setAuditLogs(audits);

    // Restore active selections from persistent user session, falling back gracefully
    const savedProdId = localStorage.getItem('als_active_product_id');
    const savedSkuId = localStorage.getItem('als_active_sku_id');
    const savedBatchId = localStorage.getItem('als_active_batch_id');
    const savedMachineId = localStorage.getItem('als_active_machine_id');

    const resolvedProd = prods.find(p => p.id === savedProdId) || prods.find(p => p.shortCode === 'ADRC') || prods.find(p => p.shortCode === 'ADTP') || prods[0];
    const resolvedSku = skuList.find(s => s.id === savedSkuId && s.productId === resolvedProd?.id) ||
      skuList.find(s => s.productId === resolvedProd?.id && s.packSize === '500 g') ||
      skuList.find(s => s.productId === resolvedProd?.id && s.packSize === '100 g') ||
      skuList.find(s => s.productId === resolvedProd?.id) ||
      skuList[0];
    const resolvedPack = packs.find(p => p.name === resolvedSku?.packSize) || packs[0];
    const resolvedBatch = bts.find(b => b.id === savedBatchId && b.productId === resolvedProd?.id) ||
      bts.find(b => b.productId === resolvedProd?.id) ||
      bts.find(b => b.id === 'ADRC001') ||
      bts[0];
    const resolvedMachine = machs.find(m => m.id === savedMachineId) || machs[0] || null;

    const initialResolved = resolveLayout(resolvedProd?.id || '', resolvedSku?.packSize || '100 g', currentTmpls, packs);
    const defaultTemplate = initialResolved.template;

    setActiveProduct(resolvedProd || null);
    setActiveSku(resolvedSku || null);
    setActivePackProfile(resolvedPack || null);
    setActiveBatch(resolvedBatch || null);
    setActiveMachine(resolvedMachine);
    setActiveTemplate(defaultTemplate || null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadDatabase();

    // Check theme preference
    const savedTheme = localStorage.getItem('als_theme') as 'dark' | 'light';
    if (savedTheme) {
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.documentElement.classList.add('theme-light');
      }
    }
  }, [loadDatabase]);

  // Real-time Cross-Tab & Cross-Window State Synchronization
  useEffect(() => {
    const handleStorageSynced = () => {
      loadDatabase();
    };
    window.addEventListener('als_storage_synced', handleStorageSynced);
    window.addEventListener('storage', handleStorageSynced);
    return () => {
      window.removeEventListener('als_storage_synced', handleStorageSynced);
      window.removeEventListener('storage', handleStorageSynced);
    };
  }, [loadDatabase]);

  // Handle immediate in-memory template changes from Designer View
  const handleTemplateChange = useCallback((updatedTmpl: Template) => {
    setActiveTemplate(updatedTmpl);
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === updatedTmpl.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedTmpl;
        return next;
      }
      return [updatedTmpl, ...prev];
    });
  }, []);

  // Toggle Theme
  const handleToggleTheme = useCallback(() => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('als_theme', next);
      if (next === 'light') {
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
      }
      return next;
    });
  }, []);

  // Register Global Actions into central Action Registry
  useEffect(() => {
    actionRegistry.register({
      id: 'nav_home',
      label: 'Go to Home',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+1',
      enabled: true,
      handler: () => navigateToRoute('home'),
      tooltip: 'Go to Home Workspace'
    });

    actionRegistry.register({
      id: 'nav_products',
      label: 'Go to Products & SKUs',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+2',
      enabled: true,
      handler: () => navigateToRoute('products'),
      tooltip: 'Manage products and SKUs'
    });

    actionRegistry.register({
      id: 'nav_batches',
      label: 'Go to Batches',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+3',
      enabled: true,
      handler: () => navigateToRoute('batches'),
      tooltip: 'Plan and allocate batches'
    });

    actionRegistry.register({
      id: 'nav_design',
      label: 'Go to Label Designer',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+4',
      enabled: true,
      handler: () => navigateToRoute('design'),
      tooltip: 'Open WYSIWYG Label Designer'
    });

    actionRegistry.register({
      id: 'nav_print',
      label: 'Go to Print & USB',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+5',
      enabled: true,
      handler: () => navigateToRoute('print'),
      tooltip: 'Print labels and export 1-bit BMP'
    });

    actionRegistry.register({
      id: 'nav_history',
      label: 'Go to History & Archive',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+6',
      enabled: true,
      handler: () => navigateToRoute('history'),
      tooltip: 'View production history and audit log'
    });

    actionRegistry.register({
      id: 'nav_settings',
      label: 'Go to Settings',
      area: 'Navigation',
      scope: 'global',
      shortcut: 'Alt+7',
      enabled: true,
      handler: () => navigateToRoute('settings'),
      tooltip: 'Configure machines and pack profiles'
    });

    actionRegistry.register({
      id: 'palette_open',
      label: 'Open Command Palette',
      area: 'Global',
      scope: 'global',
      shortcut: 'Ctrl+K',
      enabled: true,
      handler: () => setIsCommandPaletteOpen(true),
      tooltip: 'Search all actions and commands'
    });

    actionRegistry.register({
      id: 'cheatsheet_open',
      label: 'Open Keyboard Cheat Sheet',
      area: 'Global',
      scope: 'global',
      shortcut: 'Ctrl+/',
      altShortcuts: ['?'],
      enabled: true,
      handler: () => setIsCheatSheetOpen(true),
      tooltip: 'Display all keyboard shortcuts'
    });

    actionRegistry.register({
      id: 'ai_copilot_toggle',
      label: 'Toggle AI Copilot',
      area: 'Global',
      scope: 'global',
      shortcut: 'Alt+A',
      enabled: true,
      handler: () => setIsAIDrawerOpen(prev => !prev),
      tooltip: 'Open AI Assistant Drawer'
    });

    actionRegistry.register({
      id: 'theme_toggle',
      label: 'Toggle High-Contrast Theme',
      area: 'Global',
      scope: 'global',
      shortcut: 'Alt+T',
      enabled: true,
      handler: handleToggleTheme,
      tooltip: 'Switch between Dark and High-Contrast Light theme'
    });

    actionRegistry.register({
      id: 'tour_start',
      label: 'Start Guided Spotlight Tour',
      area: 'Global',
      scope: 'global',
      shortcut: 'F1',
      enabled: true,
      handler: () => setIsTourOpen(true),
      tooltip: 'Replay guided onboarding tour'
    });
  }, [handleToggleTheme]);

  // Global Keyboard Event Dispatcher
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore single character shortcuts if inside an input or textarea
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ctrl+K -> Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
        return;
      }

      // Ctrl+/ or '?' (when not typing) -> Cheat Sheet
      if (((e.ctrlKey || e.metaKey) && e.key === '/') || (!isInput && e.key === '?')) {
        e.preventDefault();
        setIsCheatSheetOpen(prev => !prev);
        return;
      }

      // Alt+A -> AI Drawer
      if (e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAIDrawerOpen(prev => !prev);
        return;
      }

      // Alt+T -> Toggle Theme
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleToggleTheme();
        return;
      }

      // F1 -> Guided Tour
      if (e.key === 'F1') {
        e.preventDefault();
        setIsTourOpen(true);
        return;
      }

      // Alt+1 through Alt+7 Navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        if (e.key === '1') { e.preventDefault(); navigateToRoute('home'); }
        if (e.key === '2') { e.preventDefault(); navigateToRoute('products'); }
        if (e.key === '3') { e.preventDefault(); navigateToRoute('batches'); }
        if (e.key === '4') { e.preventDefault(); navigateToRoute('design'); }
        if (e.key === '5') { e.preventDefault(); navigateToRoute('print'); }
        if (e.key === '6') { e.preventDefault(); navigateToRoute('history'); }
        if (e.key === '7') { e.preventDefault(); navigateToRoute('settings'); }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleToggleTheme]);

  // Business Data Mutations with Dual-Layer Persistence Snapshot Mirroring
  const handleUpdateSku = async (updated: SKU) => {
    await db.skus.put(updated);
    setSkus(prev => prev.map(s => s.id === updated.id ? updated : s));
    await saveUniversalSnapshot();
  };

  const handleCreateProduct = async (newProd: Product) => {
    await db.products.put(newProd);
    // Create default SKUs for allowed pack sizes
    const newSkus: SKU[] = newProd.allowedPackSizes.map(sz => ({
      id: `sku_${newProd.shortCode.toLowerCase()}_${sz.replace(/\s+/g, '')}`,
      productId: newProd.id,
      packType: 'Stand-up Pouch',
      packSize: sz,
      netWeightGrams: sz.includes('kg') ? parseFloat(sz) * 1000 : parseFloat(sz),
      unit: sz.includes('kg') ? 'kg' : 'g',
      enabled: true
    }));
    await db.skus.bulkPut(newSkus);
    setProducts(prev => [...prev, newProd]);
    setSkus(prev => [...prev, ...newSkus]);
    await saveUniversalSnapshot();
  };

  const handleUpdateProduct = async (updatedProd: Product) => {
    await db.products.put(updatedProd);
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
    if (activeProduct?.id === updatedProd.id) setActiveProduct(updatedProd);
    await saveUniversalSnapshot();
  };

  const handleDeleteProduct = async (productId: string) => {
    await db.products.delete(productId);
    const skusToDelete = skus.filter(s => s.productId === productId);
    for (const s of skusToDelete) {
      await db.skus.delete(s.id);
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
    setSkus(prev => prev.filter(s => s.productId !== productId));
    if (activeProduct?.id === productId) {
      const remaining = products.filter(p => p.id !== productId);
      setActiveProduct(remaining[0] || null);
    }
    await saveUniversalSnapshot();
  };

  const handleCreateSku = async (newSku: SKU) => {
    await db.skus.put(newSku);
    setSkus(prev => {
      const filtered = prev.filter(s => s.id !== newSku.id);
      return [...filtered, newSku];
    });
    const prod = products.find(p => p.id === newSku.productId);
    if (prod && !prod.allowedPackSizes.includes(newSku.packSize)) {
      const updatedProd = { ...prod, allowedPackSizes: [...prod.allowedPackSizes, newSku.packSize] };
      await db.products.put(updatedProd);
      setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
    }
    await saveUniversalSnapshot();
  };

  const handleDeleteSku = async (skuId: string) => {
    await db.skus.delete(skuId);
    setSkus(prev => prev.filter(s => s.id !== skuId));
    await saveUniversalSnapshot();
  };

  const handleBulkUpdateSkus = async (skuIds: string[], updates: Partial<SKU>) => {
    await db.transaction('rw', db.skus, async () => {
      for (const id of skuIds) {
        await db.skus.update(id, updates);
      }
    });
    setSkus(prev => prev.map(s => skuIds.includes(s.id) ? { ...s, ...updates } : s));
    await saveUniversalSnapshot();
  };

  const handleCreateBatch = async (newBatch: Batch) => {
    await db.batches.put(newBatch);
    setBatches(prev => {
      const filtered = prev.filter(b => b.id !== newBatch.id);
      return [newBatch, ...filtered];
    });
    setActiveBatch(newBatch);
    localStorage.setItem('als_active_batch_id', newBatch.id);
    const p = products.find(prod => prod.id === newBatch.productId);
    if (p) {
      setActiveProduct(p);
      localStorage.setItem('als_active_product_id', p.id);
    }
    await saveUniversalSnapshot();
  };

  const handleUpdateBatch = async (updated: Batch) => {
    await db.batches.put(updated);
    setBatches(prev => prev.map(b => b.id === updated.id ? updated : b));
    if (activeBatch?.id === updated.id) setActiveBatch(updated);
    await saveUniversalSnapshot();
  };

  const handleDeleteBatch = async (batchId: string) => {
    await db.batches.delete(batchId);
    setBatches(prev => prev.filter(b => b.id !== batchId));
    if (activeBatch?.id === batchId) {
      const remaining = batches.filter(b => b.id !== batchId);
      setActiveBatch(remaining[0] || null);
    }
    await saveUniversalSnapshot();
  };

  const handleDuplicateBatch = async (sourceBatch: Batch) => {
    const prod = products.find(p => p.id === sourceBatch.productId);
    const prefix = prod?.batchPrefix || prod?.shortCode || 'BAT';
    const nextId = generateNextBatchId(prefix, batches);
    const cloned: Batch = {
      ...sourceBatch,
      id: nextId,
      status: 'Planned',
      createdAt: new Date().toISOString(),
      notes: `Cloned from ${sourceBatch.id}`
    };
    await db.batches.put(cloned);
    setBatches(prev => [cloned, ...prev]);
    setActiveBatch(cloned);
    localStorage.setItem('als_active_batch_id', cloned.id);
    await saveUniversalSnapshot();
  };

  // Safe Design Scope Template Save (Strictly separates geometry from data)
  const handleSaveTemplate = async (updatedTmpl: Template, scope: DesignScope) => {
    await db.templates.put(updatedTmpl);
    setTemplates(prev => {
      const idx = prev.findIndex(t => t.id === updatedTmpl.id);
      return idx >= 0 ? prev.map(t => t.id === updatedTmpl.id ? updatedTmpl : t) : [...prev, updatedTmpl];
    });
    setActiveTemplate(updatedTmpl);

    await db.auditLogs.put({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      action: 'TEMPLATE_GEOMETRY_SAVED',
      details: `Saved design geometry for template "${updatedTmpl.name}" (Scope: ${scope}). Product and SKU values preserved.`,
      user: 'Operator',
      undoable: true
    });

    const newLogs = await db.auditLogs.toArray();
    setAuditLogs(newLogs);
    await saveUniversalSnapshot();
  };

  // Tier 1: Save General Default for all packages of this pack size
  const handleSavePackSizeDefault = async (tmplToSave: Template, packSize: string, currentProductId?: string) => {
    const norm = normalizePackSize(packSize);
    const targetId = getPackDefaultTemplateId(packSize);
    const packDefaultTmpl = buildPackDefaultTemplate(tmplToSave, packSize);

    // 1. Remove ANY previous template that served as the default for this pack size
    let updatedTemplates = templates.filter(t => 
      t.id !== targetId && 
      !(t.packSizeScope === norm && t.isPackSizeDefault) &&
      !(norm === '100g' && t.id === 'tmpl_adalaj_6line')
    );

    await db.templates.delete(targetId);
    if (norm === '100g') {
      await db.templates.delete('tmpl_adalaj_6line');
    }

    // 2. Also delete any conflicting custom override for currentProductId so this product inherits the new Global Default immediately
    if (currentProductId) {
      const overrideId = getSkuOverrideTemplateId(currentProductId, packSize);
      await db.templates.delete(overrideId);
      updatedTemplates = updatedTemplates.filter(t => t.id !== overrideId && t.skuOverrideKey !== `${currentProductId}_${norm}`);
    }

    // 3. Save new default at the top of templates so it resolves first
    await db.templates.put(packDefaultTmpl);
    updatedTemplates = [packDefaultTmpl, ...updatedTemplates];

    setTemplates(updatedTemplates);
    setActiveTemplate(packDefaultTmpl);

    await db.auditLogs.put({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      action: 'PACK_SIZE_DEFAULT_SAVED',
      details: `Saved new Global Default layout for all ${packSize} packages across all products. Conflicting custom override cleared.`,
      user: 'Operator',
      undoable: true
    });
    const newLogs = await db.auditLogs.toArray();
    setAuditLogs(newLogs);
    await saveUniversalSnapshot();
  };

  // Tier 2: Save Custom Override specifically for this product & pack size
  const handleSaveSkuOverride = async (tmplToSave: Template, productId: string, productName: string, packSize: string) => {
    const norm = normalizePackSize(packSize);
    const skuOverrideTmpl = buildSkuOverrideTemplate(tmplToSave, productId, productName, packSize);
    await db.templates.put(skuOverrideTmpl);
    let updatedTemplates = templates.filter(t => t.id !== skuOverrideTmpl.id && t.skuOverrideKey !== `${productId}_${norm}`);
    updatedTemplates = [skuOverrideTmpl, ...updatedTemplates];
    setTemplates(updatedTemplates);
    setActiveTemplate(skuOverrideTmpl);

    await db.auditLogs.put({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      action: 'SKU_OVERRIDE_SAVED',
      details: `Saved Custom Override layout specifically for ${productName} (${packSize}). General ${packSize} default preserved for other products.`,
      user: 'Operator',
      undoable: true
    });
    const newLogs = await db.auditLogs.toArray();
    setAuditLogs(newLogs);
    await saveUniversalSnapshot();
  };

  // Revert Custom Override back to General Pack Size Default
  const handleRevertSkuOverride = async (productId: string, packSize: string) => {
    const norm = normalizePackSize(packSize);
    const overrideId = getSkuOverrideTemplateId(productId, packSize);
    await db.templates.delete(overrideId);
    const updatedTemplates = templates.filter(t => t.id !== overrideId && t.skuOverrideKey !== `${productId}_${norm}`);
    setTemplates(updatedTemplates);

    // Re-resolve layout from general default
    const resolved = resolveLayout(productId, packSize, updatedTemplates, packProfiles);
    setActiveTemplate(resolved.template);

    await db.auditLogs.put({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      action: 'SKU_OVERRIDE_REVERTED',
      details: `Reverted custom override for ${productId} (${packSize}) back to general ${packSize} default layout.`,
      user: 'Operator',
      undoable: true
    });
    const newLogs = await db.auditLogs.toArray();
    setAuditLogs(newLogs);
    await saveUniversalSnapshot();
  };

  // Print completed mutation
  const handleMarkPrinted = async (batchId: string, allocId: string, count: number) => {
    const targetBatch = batches.find(b => b.id === batchId);
    if (!targetBatch) return;

    const updatedAllocations = targetBatch.allocations.map(a => {
      if (a.id === allocId) {
        return {
          ...a,
          printStatus: 'Printed' as const,
          packsPrinted: count
        };
      }
      return a;
    });

    const isAllPrinted = updatedAllocations.every(a => a.printStatus === 'Printed');
    const updatedBatch: Batch = {
      ...targetBatch,
      status: isAllPrinted ? 'Completed' : 'Open',
      allocations: updatedAllocations
    };

    await db.batches.put(updatedBatch);
    setBatches(prev => prev.map(b => b.id === batchId ? updatedBatch : b));

    await db.auditLogs.put({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      action: 'BATCH_PRINTED',
      details: `Printed ${count} packs for Batch ${batchId} (Allocation ID: ${allocId}).`,
      user: 'Operator',
      undoable: false
    });

    const newLogs = await db.auditLogs.toArray();
    setAuditLogs(newLogs);
  };

  if (isLoading || !activeMachine) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-300 gap-3 font-sans">
        <div className="w-12 h-12 rounded-xl bg-amber-500 text-black font-black flex items-center justify-center text-lg shadow-lg animate-pulse">
          AD
        </div>
        <div className="text-sm font-bold text-zinc-200">Loading Adalaj Print Lab...</div>
        <div className="text-xs text-zinc-500 font-mono">Initializing local-first database and hardware engine</div>
      </div>
    );
  }

  return (
    <div className={`h-screen overflow-hidden flex flex-col font-sans transition-colors ${
      theme === 'light' ? 'bg-zinc-100 text-zinc-900' : 'bg-zinc-950 text-zinc-100'
    }`}>
      {/* Shell Header */}
      <Header
        currentRoute={currentRoute}
        onNavigate={navigateToRoute}
        activeBatch={activeBatch}
        activeProduct={activeProduct}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isAdvancedMode={isAdvancedMode}
        onToggleAdvancedMode={() => setIsAdvancedMode(prev => !prev)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
        onOpenAIDrawer={() => setIsAIDrawerOpen(true)}
        onStartTour={() => setIsTourOpen(true)}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Main Workspace Router */}
      <main className={`flex-1 ${currentRoute === 'design' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto industrial-scrollbar'}`}>
        {currentRoute === 'home' && (
          <HomeView
            batches={batches}
            products={products}
            skus={skus}
            templates={templates}
            packProfiles={packProfiles}
            template={activeTemplate || templates[0]}
            activeBatch={activeBatch || batches[0]}
            activeProduct={activeProduct || products[0]}
            activeMachine={activeMachine || machines[0]}
            onNavigate={navigateToRoute}
            onSelectProduct={p => {
              setActiveProduct(p);
              if (p) localStorage.setItem('als_active_product_id', p.id);
              const pBatch = batches.find(b => b.productId === p.id);
              if (pBatch) {
                setActiveBatch(pBatch);
                localStorage.setItem('als_active_batch_id', pBatch.id);
              }
              const pSku = skus.find(s => s.productId === p.id && s.packSize === activeSku?.packSize) || skus.find(s => s.productId === p.id);
              if (pSku) {
                setActiveSku(pSku);
                localStorage.setItem('als_active_sku_id', pSku.id);
                const resolved = resolveLayout(p.id, pSku.packSize, templates, packProfiles);
                setActiveTemplate(resolved.template);
              }
            }}
            onSelectBatch={b => {
              setActiveBatch(b);
              if (b) localStorage.setItem('als_active_batch_id', b.id);
              const p = products.find(prod => prod.id === b.productId);
              if (p) {
                setActiveProduct(p);
                localStorage.setItem('als_active_product_id', p.id);
              }
            }}
          />
        )}

        {currentRoute === 'products' && (
          <ProductsView
            products={products}
            skus={skus}
            onUpdateSku={handleUpdateSku}
            onCreateProduct={handleCreateProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onCreateSku={handleCreateSku}
            onDeleteSku={handleDeleteSku}
            onBulkUpdateSkus={handleBulkUpdateSkus}
          />
        )}

        {currentRoute === 'batches' && (
          <BatchesView
            batches={batches}
            products={products}
            skus={skus}
            activeBatch={activeBatch}
            onSelectBatch={b => {
              setActiveBatch(b);
              const p = products.find(prod => prod.id === b.productId);
              if (p) setActiveProduct(p);
            }}
            onCreateBatch={handleCreateBatch}
            onUpdateBatch={handleUpdateBatch}
            onDeleteBatch={handleDeleteBatch}
            onDuplicateBatch={handleDuplicateBatch}
            onNavigateToPrint={(b, allocId) => {
              setActiveBatch(b);
              localStorage.setItem('als_active_batch_id', b.id);
              if (allocId) setPrintAllocId(allocId);
              navigateToRoute('print');
            }}
          />
        )}

        {currentRoute === 'design' && (
          <DesignerView
            template={activeTemplate || templates[0]}
            machine={activeMachine || machines[0]}
            packProfile={activePackProfile || packProfiles[0]}
            activeSku={activeSku || skus[0]}
            activeProduct={activeProduct || products[0]}
            allSkus={skus}
            allProducts={products}
            allBatches={batches}
            activeBatch={activeBatch}
            templates={templates}
            packProfiles={packProfiles}
            onSelectProduct={p => {
              setActiveProduct(p);
              if (p) localStorage.setItem('als_active_product_id', p.id);
              const pSku = skus.find(s => s.productId === p.id && s.packSize === activeSku?.packSize) || skus.find(s => s.productId === p.id);
              if (pSku) {
                setActiveSku(pSku);
                localStorage.setItem('als_active_sku_id', pSku.id);
                const resolved = resolveLayout(p.id, pSku.packSize, templates, packProfiles);
                setActiveTemplate(resolved.template);
              }
              const pBatch = batches.find(b => b.productId === p.id);
              if (pBatch) {
                setActiveBatch(pBatch);
                localStorage.setItem('als_active_batch_id', pBatch.id);
              }
            }}
            onSelectSku={s => {
              setActiveSku(s);
              localStorage.setItem('als_active_sku_id', s.id);
              const p = products.find(prod => prod.id === s.productId) || activeProduct;
              if (p) {
                setActiveProduct(p);
                localStorage.setItem('als_active_product_id', p.id);
                const resolved = resolveLayout(p.id, s.packSize, templates, packProfiles);
                setActiveTemplate(resolved.template);
              }
            }}
            onSaveTemplate={handleSaveTemplate}
            onSavePackDefault={(tmpl, packSize, currentProdId) => handleSavePackSizeDefault(tmpl, packSize, currentProdId || activeProduct?.id)}
            onSaveSkuOverride={handleSaveSkuOverride}
            onRevertSkuOverride={handleRevertSkuOverride}
            onTemplateChange={handleTemplateChange}
            onNavigateToPrint={() => navigateToRoute('print')}
          />
        )}

        {currentRoute === 'print' && (() => {
          const printBatch = activeBatch || batches[0];
          const printAlloc = (printAllocId ? printBatch?.allocations.find(a => a.id === printAllocId) : null) || printBatch?.allocations[0];
          const printPackSize = printAlloc?.packSize || activeSku?.packSize || '100 g';
          const printProductId = printBatch?.productId || activeProduct?.id || '';
          const resolvedPrintTmpl = resolveLayout(printProductId, printPackSize, templates, packProfiles).template;
          return (
            <PrintView
              batches={batches}
              activeBatch={printBatch}
              initialAllocId={printAlloc?.id}
              products={products}
              skus={skus}
              templates={templates}
              packProfiles={packProfiles}
              template={resolvedPrintTmpl || activeTemplate || templates[0]}
              machine={activeMachine || machines[0]}
              packProfile={activePackProfile || packProfiles[0]}
              reprintJob={reprintJob}
              onClearReprint={() => setReprintJob(null)}
              onMarkPrinted={handleMarkPrinted}
              onUpdateTemplate={t => {
                setActiveTemplate(t);
                db.templates.put(t);
              }}
            />
          );
        })()}

        {currentRoute === 'history' && (
          <HistoryView
            batches={batches}
            auditLogs={auditLogs}
            products={products}
            onReprintJob={job => {
              setReprintJob(job);
              const b = batches.find(bat => bat.id === job.batchId);
              if (b) {
                setActiveBatch(b);
                const p = products.find(prod => prod.id === b.productId);
                if (p) setActiveProduct(p);
              }
              navigateToRoute('print');
            }}
            onReprintBatch={b => {
              setReprintJob(null);
              setActiveBatch(b);
              const p = products.find(prod => prod.id === b.productId);
              if (p) setActiveProduct(p);
              navigateToRoute('print');
            }}
            onDuplicateBatch={b => {
              const prod = products.find(p => p.id === b.productId) || products[0];
              const nextId = generateNextBatchId(prod.batchPrefix || 'ADTP', batches);
              const result = duplicateBatchCommand(
                b,
                nextId,
                new Date().toISOString().slice(0, 10),
                batches,
                prod,
                skus
              );
              if (result.success && result.batch) {
                handleCreateBatch(result.batch);
                navigateToRoute('batches');
              }
            }}
          />
        )}

        {currentRoute === 'settings' && business && brand && activeMachine && (
          <SettingsView
            business={business}
            brand={brand}
            machines={machines}
            activeMachine={activeMachine}
            packProfiles={packProfiles}
            mediaProfiles={mediaProfiles}
            onSelectMachine={m => {
              setActiveMachine(m);
              localStorage.setItem('als_active_machine_id', m.id);
            }}
            onUpdateMachine={async m => {
              await db.machineProfiles.put(m);
              setMachines(prev => prev.map(mach => mach.id === m.id ? m : mach));
              setActiveMachine(m);
              await saveUniversalSnapshot();
            }}
            onUpdatePackProfile={async p => {
              await db.packProfiles.put(p);
              setPackProfiles(prev => prev.map(pack => pack.id === p.id ? p : pack));
              await saveUniversalSnapshot();
            }}
            onRestoreBackup={loadDatabase}
          />
        )}
      </main>

      {/* Contextual Shortcut Strip Footer */}
      <ContextualShortcutStrip
        currentRoute={currentRoute}
        onOpenCheatSheet={() => setIsCheatSheetOpen(true)}
      />

      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Command Palette Overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={navigateToRoute}
      />

      {/* Keyboard Cheat Sheet Modal */}
      <CheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
      />

      {/* Universal Persistence & Cross-Device Sync Hub Modal */}
      <UniversalSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onDataRestored={loadDatabase}
      />

      {/* Guided Tour Spotlight */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onNavigate={navigateToRoute}
      />

      {/* AI Copilot Drawer */}
      <AICopilotDrawer
        isOpen={isAIDrawerOpen}
        onClose={() => setIsAIDrawerOpen(false)}
        currentBatch={activeBatch}
        currentTemplate={activeTemplate}
        allSkus={skus}
        scope="This SKU"
        onApplyChanges={async (approvedChanges) => {
          if (activeTemplate) {
            // Check if orientation changed
            const orientChange = approvedChanges.find(c => c.category === 'Orientation' && c.field === 'Travel Direction');
            const layoutChange = approvedChanges.find(c => c.category === 'Orientation' && c.field === 'Layout Mode');
            if (orientChange || layoutChange) {
              const updated = {
                ...activeTemplate,
                travel: (orientChange?.afterValue as any) || activeTemplate.travel,
                layout: (layoutChange?.afterValue as any) || activeTemplate.layout
              };
              await db.templates.put(updated);
              setActiveTemplate(updated);
            }
          }
          await db.auditLogs.put({
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date().toISOString(),
            action: 'AI_COPILOT_APPLY',
            details: `Applied ${approvedChanges.length} AI proposed change(s).`,
            user: 'Operator (AI Copilot)',
            undoable: true
          });
          const logs = await db.auditLogs.toArray();
          setAuditLogs(logs);
        }}
      />
    </div>
  );
}
