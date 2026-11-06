/**
 * Label Designer Workspace View
 * Dual-axis Millimeter rulers (X and Y with 10mm/5mm/1mm ticks and corner origin),
 * Dynamic Fit / 100% / 200% zoom engine, 4 Travel x Layout modes, Fit to nozzle,
 * Pack View vs Printer View (1-bit Raster), Auto-Flow, interactive Tool Rail with
 * fully working creation buttons, live object dragging, and bottom batch preview bar.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  PenTool, 
  Type, 
  Hash, 
  Minus, 
  Square, 
  QrCode, 
  Barcode, 
  Lock, 
  Unlock, 
  RotateCw, 
  ArrowDownUp, 
  ArrowLeftRight, 
  Save, 
  Sliders, 
  Eye, 
  Sparkles, 
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Crosshair,
  CheckCircle2,
  Trash2,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  RefreshCw,
  Printer,
  Download,
  FlipHorizontal,
  FlipVertical,
  Undo2,
  Redo2,
  Globe,
  Star,
  RotateCcw,
  ChevronDown,
  Layers
} from 'lucide-react';
import type { 
  Template, 
  DesignObject, 
  MachineProfile, 
  PackProfile, 
  SKU, 
  Product, 
  Batch,
  DesignScope,
  TravelDirection,
  LayoutMode
} from '../../types';
import { fitObjectsToBand, validateTemplateQuality, type QualityIssue } from '../../services/fitEngine';
import { getLayoutAdvice, buildPassPlan } from '../../services/passPlanner';
import { renderTemplateToCanvas, canvasTo1BitBmp, canvasToStandardBmp, renderBarcodeSvgString } from '../../services/printTransform';
import { 
  resolveLayout, 
  buildPackDefaultTemplate, 
  buildSkuOverrideTemplate, 
  getSkuOverrideTemplateId,
  normalizePackSize, 
  getCleanGlobalPackDefault,
  getFactoryProductTemplate,
  type LayoutSource, 
  type ResolvedLayout 
} from '../../services/layoutRegistry';
import { db, saveUniversalSnapshot } from '../../services/db';

interface DesignerViewProps {
  template: Template;
  machine: MachineProfile;
  packProfile: PackProfile;
  activeSku: SKU;
  activeProduct: Product;
  allSkus: SKU[];
  allProducts?: Product[];
  allBatches?: Batch[];
  activeBatch?: Batch | null;
  templates?: Template[];
  packProfiles?: PackProfile[];
  onSelectProduct?: (p: Product) => void;
  onSelectSku?: (s: SKU) => void;
  onSelectBatch?: (b: Batch) => void;
  onSaveTemplate: (t: Template, scope: DesignScope) => void;
  onSavePackDefault?: (t: Template, packSize: string, currentProductId?: string) => Promise<void>;
  onSaveSkuOverride?: (t: Template, productId: string, productName: string, packSize: string) => Promise<void>;
  onRevertSkuOverride?: (productId: string, packSize: string) => Promise<void>;
  onTemplateChange?: (t: Template) => void;
  onNavigateToPrint: () => void;
}

export const DesignerView: React.FC<DesignerViewProps> = ({
  template: initialTemplate,
  machine,
  packProfile,
  activeSku,
  activeProduct,
  allSkus,
  allProducts,
  allBatches,
  activeBatch,
  templates = [],
  packProfiles = [],
  onSelectProduct,
  onSelectSku,
  onSelectBatch,
  onSaveTemplate,
  onSavePackDefault,
  onSaveSkuOverride,
  onRevertSkuOverride,
  onTemplateChange,
  onNavigateToPrint
}) => {
  const [template, setTemplate] = useState<Template>(initialTemplate);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(initialTemplate.objects[0]?.id || null);
  const [viewMode, setViewMode] = useState<'pack' | 'printer'>('pack');
  const [zoomLevel, setZoomLevel] = useState<number>(8.0); // px per mm
  const [zoomMode, setZoomMode] = useState<'fit' | '100' | '200' | 'custom'>('fit');
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'field' | 'line' | 'rectangle' | 'barcode' | 'qr'>('select');
  const [scope, setScope] = useState<DesignScope>('This SKU');
  const [showScopeConfirmModal, setShowScopeConfirmModal] = useState(false);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false);
  const [selectedSaveTarget, setSelectedSaveTarget] = useState<'pack_default' | 'sku_override'>('pack_default');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [issues, setIssues] = useState<QualityIssue[]>([]);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticDataUrl, setDiagnosticDataUrl] = useState<string>('');
  const [printerViewDataUrl, setPrinterViewDataUrl] = useState<string>('');
  const [rasterRotation, setRasterRotation] = useState<0 | 90 | 180 | 270>(0);
  const [rasterMirrorX, setRasterMirrorX] = useState<boolean>(false);
  const [rasterMirrorY, setRasterMirrorY] = useState<boolean>(false);
  
  // Real-time Auto-Save for in-progress draft persistence
  const autoSaveTimerRef = useRef<any>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>('Saved');

  useEffect(() => {
    if (!template || !template.id) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await db.templates.put(template);
        if (onTemplateChange) onTemplateChange(template);
        await saveUniversalSnapshot();
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setAutoSaveStatus(`Auto-saved ${timeStr}`);
      } catch (err) {
        console.error('Auto-save error:', err);
      }
    }, 400);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [template, onTemplateChange]);
  
  // Refs
  const canvasViewportRef = useRef<HTMLDivElement | null>(null);
  const printerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const contentInputRef = useRef<HTMLInputElement | null>(null);

  const handleObjectDoubleClick = (objId: string) => {
    setSelectedObjectId(objId);
    setTimeout(() => {
      if (contentInputRef.current) {
        contentInputRef.current.focus();
        contentInputRef.current.select();
      }
    }, 50);
  };

  // Filter SKUs strictly belonging to the currently active product
  const productSkus = useMemo(() => {
    const filtered = allSkus.filter(s => s.productId === activeProduct.id);
    return filtered.length > 0 ? filtered : [activeSku];
  }, [allSkus, activeProduct.id, activeSku]);

  // Live preview SKU selection (default to activeSku, keep synchronized)
  const [previewSkuId, setPreviewSkuId] = useState<string>(activeSku.id);
  useEffect(() => {
    setPreviewSkuId(activeSku.id);
  }, [activeSku.id]);

  const previewSku = productSkus.find(s => s.id === previewSkuId) || productSkus[0] || activeSku;

  // Resolve two-tier layout inheritance: SKU Override > Pack Default > Scratch Starter
  const currentLayoutInfo = useMemo(() => {
    return resolveLayout(
      activeProduct.id,
      previewSku.packSize,
      templates && templates.length > 0 ? templates : [template],
      packProfiles
    );
  }, [activeProduct.id, previewSku.packSize, templates, packProfiles, template.id]);

  const selectedObject = template.objects.find(o => o.id === selectedObjectId);

  // Track currently loaded product and pack size
  const activeProductAndPackRef = useRef<string>(`${activeProduct.id}_${previewSku.packSize}`);

  // Synchronize template whenever product or pack size changes
  useEffect(() => {
    const key = `${activeProduct.id}_${previewSku.packSize}`;
    const productOrPackChanged = activeProductAndPackRef.current !== key;
    activeProductAndPackRef.current = key;

    // Only force resolve and replace template if the user switched product or SKU pack size!
    // If they just saved (which updates templates prop), DO NOT wipe out the canvas template!
    if (productOrPackChanged) {
      const resolved = resolveLayout(
        activeProduct.id,
        previewSku.packSize,
        templates && templates.length > 0 ? templates : [initialTemplate],
        packProfiles
      );
      setTemplate(resolved.template);
      setSelectedObjectId(resolved.template.objects[0]?.id || null);
      setHistory([]);
      setRedoStack([]);
    }
  }, [activeProduct.id, previewSku.packSize, templates]);

  // Undo / Redo history stacks (up to 25 states)
  const [history, setHistory] = useState<Template[]>([]);
  const [redoStack, setRedoStack] = useState<Template[]>([]);

  // Coalescing Undo Session: aggregates multi-step movements/nudges into ONE single undo step
  interface UndoSession {
    initialSnapshot: Template;
    type: 'keyboard_nudge' | 'property_tweak';
    targetObjectId: string;
    timer: any;
  }
  const undoSessionRef = useRef<UndoSession | null>(null);

  // Commit any pending coalesced movement session into history
  const commitPendingSession = useCallback(() => {
    if (!undoSessionRef.current) return;
    const session = undoSessionRef.current;
    if (session.timer) {
      clearTimeout(session.timer);
    }
    const initialSnapshot = session.initialSnapshot;
    const targetId = session.targetObjectId;
    undoSessionRef.current = null;

    setTemplate(currentTmpl => {
      const initialObj = initialSnapshot.objects.find(o => o.id === targetId);
      const currentObj = currentTmpl.objects.find(o => o.id === targetId);
      const hasChanged = !initialObj || !currentObj || 
        initialObj.x !== currentObj.x || 
        initialObj.y !== currentObj.y ||
        initialObj.width !== currentObj.width ||
        initialObj.height !== currentObj.height ||
        initialObj.fontSizeMm !== currentObj.fontSizeMm ||
        initialObj.content !== currentObj.content;

      if (hasChanged) {
        setHistory(h => [...h.slice(-24), initialSnapshot]);
        setRedoStack([]); // Clear redo stack on committed change
      }
      return currentTmpl;
    });
  }, []);

  // Update object with coalescing (coalesces rapid arrow keys / nudges / keystrokes into 1 undo step)
  const updateObjectCoalesced = useCallback((
    objectId: string,
    updates: Partial<DesignObject>,
    sessionType: 'keyboard_nudge' | 'property_tweak',
    debounceMs: number = 650
  ) => {
    // If a session exists for a different object or different type, commit it first
    if (undoSessionRef.current && (undoSessionRef.current.targetObjectId !== objectId || undoSessionRef.current.type !== sessionType)) {
      commitPendingSession();
    }

    // Capture initial snapshot at the start of movement sequence
    if (!undoSessionRef.current) {
      undoSessionRef.current = {
        initialSnapshot: JSON.parse(JSON.stringify(template)),
        type: sessionType,
        targetObjectId: objectId,
        timer: null
      };
    }

    // Reset debounce timer: once user stops pressing keys for debounceMs, finalize the session
    if (undoSessionRef.current.timer) {
      clearTimeout(undoSessionRef.current.timer);
    }
    undoSessionRef.current.timer = setTimeout(() => {
      commitPendingSession();
    }, debounceMs);

    // Apply movement in real-time on canvas without flooding the undo stack
    setTemplate(prev => ({
      ...prev,
      objects: prev.objects.map(obj => {
        if (obj.id === objectId) {
          const updated = { ...obj, ...updates };
          if (updates.fontSizeMm !== undefined) {
            updated.height = updates.fontSizeMm;
            updated.fontSizePt = Math.round(updates.fontSizeMm * 2.83);
          }
          return updated;
        }
        return obj;
      })
    }));
  }, [template, commitPendingSession]);

  // Object selection wrapper that finalizes any pending movement on the previous object
  const selectObject = useCallback((id: string | null) => {
    if (undoSessionRef.current) {
      commitPendingSession();
    }
    setSelectedObjectId(id);
  }, [commitPendingSession]);

  // Discrete action updater (adds new objects, fit band, delete, orientation)
  const updateTemplateWithHistory = useCallback((updater: Template | ((prev: Template) => Template)) => {
    if (undoSessionRef.current) {
      commitPendingSession();
    }
    setTemplate(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (next !== prev) {
        setHistory(h => [...h.slice(-24), JSON.parse(JSON.stringify(prev))]);
        setRedoStack([]); // Clear redo stack on new action
      }
      return next;
    });
  }, [commitPendingSession]);

  const handleUndo = useCallback(() => {
    // If user nudged and immediately hits Undo without waiting for timer
    if (undoSessionRef.current) {
      const initial = undoSessionRef.current.initialSnapshot;
      if (undoSessionRef.current.timer) {
        clearTimeout(undoSessionRef.current.timer);
      }
      undoSessionRef.current = null;
      setRedoStack(r => [...r, JSON.parse(JSON.stringify(template))]);
      setTemplate(initial);
      setToastMessage('Undo movement (back to start position)');
      setTimeout(() => setToastMessage(null), 1200);
      return;
    }

    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setRedoStack(r => [...r, JSON.parse(JSON.stringify(template))]);
    setTemplate(previous);
    setToastMessage(`Undo (Step ${history.length})`);
    setTimeout(() => setToastMessage(null), 1200);
  }, [history, template]);

  const handleRedo = useCallback(() => {
    if (undoSessionRef.current) {
      commitPendingSession();
    }
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(r => r.slice(0, -1));
    setHistory(h => [...h, JSON.parse(JSON.stringify(template))]);
    setTemplate(next);
    setToastMessage('Redo');
    setTimeout(() => setToastMessage(null), 1200);
  }, [redoStack, template, commitPendingSession]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (undoSessionRef.current?.timer) {
        clearTimeout(undoSessionRef.current.timer);
      }
    };
  }, []);

  // Keyboard shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Run quality validation on template update
  useEffect(() => {
    const q = validateTemplateQuality(template, machine, packProfile);
    setIssues(q);
  }, [template, machine, packProfile]);

  // Active Printhead Band (12.5mm vs 12.7mm TIJ ½" cartridge, or custom)
  const currentBandMm = template.customBandMm || machine.printBandMm || 12.7;

  // Active Travel Length: Endless / Unrestricted (e.g. 35, 45, 80, 100, 150+ mm)
  const currentLengthMm = template.customLengthMm || packProfile.printWindowLengthMm || (template.travel === 'Vertical' ? 35.0 : 45.0);

  // Correct Canvas Dimensions based on Travel Direction
  // When Vertical (head travels downwards): width is printhead band (12.5 / 12.7 mm), height is travel length (35, 80, 100+ mm)
  // When Horizontal (head travels sideways): width is travel length (45, 80, 100+ mm), height is printhead band (12.5 / 12.7 mm)
  const canvasWidthMm = useMemo(() => {
    if (template.travel === 'Vertical') {
      return currentBandMm;
    } else {
      return currentLengthMm;
    }
  }, [template.travel, currentBandMm, currentLengthMm]);

  const canvasHeightMm = useMemo(() => {
    if (template.travel === 'Vertical') {
      return currentLengthMm;
    } else {
      return currentBandMm;
    }
  }, [template.travel, currentBandMm, currentLengthMm]);

  // Set Printhead Band (12.5mm or 12.7mm)
  const handleSetBandMm = (band: number) => {
    updateTemplateWithHistory(prev => ({
      ...prev,
      customBandMm: band
    }));
  };

  // Set Endless / Custom Travel Length (e.g. 80, 100, 150 mm)
  const handleSetLengthMm = (len: number) => {
    const val = Math.max(10, Math.round(len * 10) / 10);
    updateTemplateWithHistory(prev => ({
      ...prev,
      customLengthMm: val
    }));
  };

  // Dynamic canvas display dimensions taking printer raster rotation into account
  const displayWidthMm = useMemo(() => {
    if (viewMode === 'printer' && (rasterRotation === 90 || rasterRotation === 270)) {
      return canvasHeightMm;
    }
    return canvasWidthMm;
  }, [viewMode, rasterRotation, canvasWidthMm, canvasHeightMm]);

  const displayHeightMm = useMemo(() => {
    if (viewMode === 'printer' && (rasterRotation === 90 || rasterRotation === 270)) {
      return canvasWidthMm;
    }
    return canvasHeightMm;
  }, [viewMode, rasterRotation, canvasWidthMm, canvasHeightMm]);

  // Derived live values for placeholder evaluation linked to active batch & active product
  const previewValues = useMemo<Record<string, string>>(() => {
    const mrp = previewSku?.mrp ? `₹${previewSku.mrp}` : '₹50';
    const netGrams = previewSku?.netWeightGrams || 100;
    const rate = previewSku?.mrp ? `₹${(previewSku.mrp / netGrams).toFixed(2)}` : '₹0.50';
    const batchId = activeBatch?.id || `${activeProduct?.batchPrefix || 'ADTP'}014`;
    const alloc = activeBatch?.allocations?.find(a => a.packSize === previewSku?.packSize) || activeBatch?.allocations?.[0];
    const mfd = alloc?.mfd || '10/10/26';
    const bb = alloc?.bestBefore || '09/11/27';

    return {
      mrp,
      batch: batchId,
      net_wt: previewSku?.packSize ? previewSku.packSize.toUpperCase() : '100 GM',
      mfd,
      best_before: bb,
      rate_per_gm: rate,
      product: activeProduct?.name || 'Turmeric Powder',
      brand: 'ADALAJ',
      pack_size: previewSku?.packSize || '100 g'
    };
  }, [previewSku, activeProduct, activeBatch]);

  // Generate Printer View raster whenever needed with exact 1:1 physical millimeter bounds
  const updatePrinterViewRaster = useCallback(() => {
    try {
      const canvas = renderTemplateToCanvas(template, machine, previewValues, {
        forPrinterView: true,
        widthMm: canvasWidthMm,
        heightMm: canvasHeightMm,
        transform: {
          rotation: rasterRotation,
          mirrorX: rasterMirrorX,
          mirrorY: rasterMirrorY
        }
      });
      const dataUrl = canvas.toDataURL('image/png');
      setPrinterViewDataUrl(dataUrl);

      if (printerCanvasRef.current) {
        const dest = printerCanvasRef.current;
        dest.width = canvas.width;
        dest.height = canvas.height;
        const ctx = dest.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, dest.width, dest.height);
          ctx.drawImage(canvas, 0, 0);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [template, machine, previewValues, canvasWidthMm, canvasHeightMm, rasterRotation, rasterMirrorX, rasterMirrorY]);

  useEffect(() => {
    if (viewMode === 'printer') {
      updatePrinterViewRaster();
    }
  }, [viewMode, updatePrinterViewRaster]);

  // DYNAMIC FIT TO WINDOW HANDLER
  const handleFitToWindow = useCallback(() => {
    const viewport = canvasViewportRef.current;
    const clientWidth = viewport ? viewport.clientWidth : 800;
    const clientHeight = viewport ? viewport.clientHeight : 500;
    const paddingX = 120; // Rulers, margins, borders
    const paddingY = 120;
    const availW = Math.max(120, clientWidth - paddingX);
    const availH = Math.max(120, clientHeight - paddingY);
    const scaleX = availW / displayWidthMm;
    const scaleY = availH / displayHeightMm;
    const fitScale = Math.max(3.0, Math.min(scaleX, scaleY));
    setZoomLevel(Math.round(fitScale * 10) / 10);
    setZoomMode('fit');
  }, [displayWidthMm, displayHeightMm]);

  // Fit to window on initial mount, travel orientation change, or raster rotation
  useEffect(() => {
    handleFitToWindow();
  }, [displayWidthMm, displayHeightMm]);

  // Handle window resize only if currently in 'fit' mode
  useEffect(() => {
    const handleResize = () => {
      if (zoomMode === 'fit') {
        handleFitToWindow();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleFitToWindow, zoomMode]);

  // 100% Zoom (Standard crisp 100% baseline design view: 12 px/mm)
  const handle100Percent = () => {
    setZoomLevel(12.0);
    setZoomMode('100');
  };

  // 200% Zoom (Magnified 200% detail view: 24 px/mm)
  const handle200Percent = () => {
    setZoomLevel(24.0);
    setZoomMode('200');
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(36.0, Math.round((prev + 2.0) * 10) / 10));
    setZoomMode('custom');
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(3.0, Math.round((prev - 2.0) * 10) / 10));
    setZoomMode('custom');
  };

  // Helper: Find next available empty vertical space on canvas to prevent collision
  const getNextAvailableY = (objHeight: number = 3.5): number => {
    if (template.objects.length === 0) return 0.5;
    const lowest = Math.max(...template.objects.map(o => o.y + o.height)) + (template.lineGapMm || 0.8);
    if (lowest + objHeight <= canvasHeightMm) {
      return Math.round(lowest * 10) / 10;
    }
    return Math.max(0.5, Math.round((canvasHeightMm - objHeight - 0.5) * 10) / 10);
  };

  // TOOL RAIL CREATION HANDLERS (Collision-Safe)
  const handleAddTextObject = () => {
    const newId = `obj_text_${Date.now()}`;
    const newObj: DesignObject = {
      id: newId,
      type: 'text',
      content: 'CUSTOM TEXT',
      x: 0.5,
      y: getNextAvailableY(3.2),
      width: Math.min(canvasWidthMm - 1.0, 11.5),
      height: 3.2,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 9,
      fontSizeMm: 3.2,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0.1,
      lineHeightMultiplier: 1.0,
      horizontalStretchPercent: 100,
      alignment: 'left',
      uppercase: true,
      channel: 'Black',
      mirrorX: false,
      mirrorY: false,
      invert: false,
      locked: false
    };
    updateTemplateWithHistory(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(newId);
    setActiveTool('select');
  };

  const handleAddFieldObject = (key: string = 'batch') => {
    const newId = `obj_field_${Date.now()}`;
    const newObj: DesignObject = {
      id: newId,
      type: 'field',
      fieldKey: key,
      content: `{${key}}`,
      x: 0.5,
      y: getNextAvailableY(3.2),
      width: Math.min(canvasWidthMm - 1.0, 11.5),
      height: 3.2,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 9,
      fontSizeMm: 3.2,
      fontWeight: 'bold',
      fontStyle: 'normal',
      letterSpacingMm: 0.1,
      lineHeightMultiplier: 1.0,
      horizontalStretchPercent: 100,
      alignment: 'left',
      uppercase: true,
      channel: 'Black',
      mirrorX: false,
      mirrorY: false,
      invert: false,
      locked: false
    };
    updateTemplateWithHistory(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(newId);
    setActiveTool('select');
  };

  const handleAddLineObject = () => {
    const newId = `obj_line_${Date.now()}`;
    const newObj: DesignObject = {
      id: newId,
      type: 'line',
      content: '',
      x: 0.5,
      y: getNextAvailableY(0.4),
      width: canvasWidthMm - 1.0,
      height: 0.4,
      strokeWidthMm: 0.4,
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 8,
      fontSizeMm: 0.4,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0,
      lineHeightMultiplier: 1.0,
      horizontalStretchPercent: 100,
      alignment: 'left',
      uppercase: false,
      channel: 'Black',
      mirrorX: false,
      mirrorY: false,
      invert: false,
      locked: false
    };
    updateTemplateWithHistory(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(newId);
    setActiveTool('select');
  };

  const handleAddRectangleObject = () => {
    const newId = `obj_rect_${Date.now()}`;
    const newObj: DesignObject = {
      id: newId,
      type: 'rectangle',
      content: '',
      x: 0.5,
      y: 0.5,
      width: canvasWidthMm - 1.0,
      height: canvasHeightMm - 1.0,
      strokeWidthMm: 0.4,
      cornerRadiusMm: 0,
      fillMode: 'hollow',
      borderStyle: 'solid',
      rotation: 0,
      fontFamily: 'Barlow Condensed',
      fontSizePt: 8,
      fontSizeMm: 1.0,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0,
      lineHeightMultiplier: 1.0,
      horizontalStretchPercent: 100,
      alignment: 'left',
      uppercase: false,
      channel: 'Black',
      mirrorX: false,
      mirrorY: false,
      invert: false,
      locked: false
    };
    updateTemplateWithHistory(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(newId);
    setActiveTool('select');
  };

  const handleAddBarcodeObject = () => {
    const newId = `obj_bc_${Date.now()}`;
    const newObj: DesignObject = {
      id: newId,
      type: 'barcode',
      content: 'ADTP014',
      x: 0.5,
      y: getNextAvailableY(6.0),
      width: Math.min(canvasWidthMm - 1.0, 11.5),
      height: 6.0,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8,
      fontSizeMm: 6.0,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0,
      lineHeightMultiplier: 1.0,
      horizontalStretchPercent: 100,
      alignment: 'center',
      uppercase: false,
      channel: 'Black',
      mirrorX: false,
      mirrorY: false,
      invert: false,
      locked: false,
      barcodeFormat: 'CODE128'
    };
    updateTemplateWithHistory(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(newId);
    setActiveTool('select');
  };

  const handleAddQrObject = () => {
    const newId = `obj_qr_${Date.now()}`;
    const qrDim = Math.min(canvasWidthMm - 1.0, 9.0);
    const newObj: DesignObject = {
      id: newId,
      type: 'qr',
      content: 'https://adalaj.in/b/ADTP014',
      x: 0.5,
      y: getNextAvailableY(qrDim),
      width: qrDim,
      height: qrDim,
      rotation: 0,
      fontFamily: 'Roboto Mono',
      fontSizePt: 8,
      fontSizeMm: qrDim,
      fontWeight: 'normal',
      fontStyle: 'normal',
      letterSpacingMm: 0,
      lineHeightMultiplier: 1.0,
      horizontalStretchPercent: 100,
      alignment: 'center',
      uppercase: false,
      channel: 'Black',
      mirrorX: false,
      mirrorY: false,
      invert: false,
      locked: false,
      barcodeFormat: 'QR'
    };
    updateTemplateWithHistory(prev => ({ ...prev, objects: [...prev.objects, newObj] }));
    setSelectedObjectId(newId);
    setActiveTool('select');
  };

  // Delete Object
  const handleDeleteSelected = () => {
    if (!selectedObjectId) return;
    updateTemplateWithHistory(prev => ({
      ...prev,
      objects: prev.objects.filter(o => o.id !== selectedObjectId)
    }));
    setSelectedObjectId(null);
  };

  // Fit handlers
  const handleFitSelected = () => {
    const targetId = selectedObjectId || template.objects[0]?.id;
    if (!targetId) return;
    if (!selectedObjectId) setSelectedObjectId(targetId);
    const res = fitObjectsToBand(template, machine, packProfile, targetId);
    updateTemplateWithHistory(res.template);
  };

  const handleFitAllLines = () => {
    const res = fitObjectsToBand(template, machine, packProfile);
    updateTemplateWithHistory(res.template);
  };

  // Cycle 4 Orientations
  const handleCycleOrientation = () => {
    const modes: Array<{ travel: TravelDirection; layout: LayoutMode }> = [
      { travel: 'Vertical', layout: 'Stack' },
      { travel: 'Vertical', layout: 'Strip' },
      { travel: 'Horizontal', layout: 'Strip' },
      { travel: 'Horizontal', layout: 'Stack' }
    ];
    const currentIndex = modes.findIndex(m => m.travel === template.travel && m.layout === template.layout);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateTemplateWithHistory(prev => ({
      ...prev,
      travel: nextMode.travel,
      layout: nextMode.layout
    }));
  };

  // Switch specific orientation without destroying manual object coordinates and font sizes
  const handleSetOrientation = (travel: TravelDirection, layout: LayoutMode) => {
    updateTemplateWithHistory(prev => ({
      ...prev,
      travel,
      layout
    }));
  };

  // Update single object property
  const handleUpdateSelectedObject = (updates: Partial<DesignObject>) => {
    if (!selectedObjectId) return;
    updateTemplateWithHistory(prev => ({
      ...prev,
      objects: prev.objects.map(obj => {
        if (obj.id === selectedObjectId) {
          const updated = { ...obj, ...updates };
          if (updates.fontSizeMm !== undefined) {
            updated.height = updates.fontSizeMm;
            updated.fontSizePt = Math.round(updates.fontSizeMm * 2.83);
          }
          return updated;
        }
        return obj;
      })
    }));
  };

  // Update line gap with auto-reflow
  const handleLineGapChange = (gap: number) => {
    const nextGap = Math.max(0.1, Math.round(gap * 10) / 10);
    const next: Template = {
      ...template,
      lineGapMm: nextGap
    };
    const res = fitObjectsToBand(next, machine, packProfile);
    updateTemplateWithHistory(res.template);
  };

  // Tier 1: Save as General Default for all products of this pack size
  const handleSaveGeneralPackDefault = async () => {
    setSaveStatus('saving');
    setIsSaveMenuOpen(false);
    setShowScopeConfirmModal(false);
    try {
      const targetPackSize = previewSku.packSize;
      const packTmpl = buildPackDefaultTemplate(template, targetPackSize);
      // Immediately set the local template state so canvas retains all edits
      setTemplate(packTmpl);
      if (onTemplateChange) onTemplateChange(packTmpl);
      if (onSavePackDefault) {
        await onSavePackDefault(template, targetPackSize, activeProduct.id);
      } else {
        await onSaveTemplate(packTmpl, 'All SKUs of this pack size');
      }
      setSaveStatus('saved');
      setToastMessage(`✓ Saved as Global Default for all ${targetPackSize} packages!`);
      setTimeout(() => setSaveStatus('idle'), 2500);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      setToastMessage('Error saving pack size default');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Tier 2: Save as Custom Override specifically for this Product & SKU
  const handleSaveSkuCustomOverride = async () => {
    setSaveStatus('saving');
    setIsSaveMenuOpen(false);
    setShowScopeConfirmModal(false);
    try {
      const targetPackSize = previewSku.packSize;
      const skuTmpl = buildSkuOverrideTemplate(template, activeProduct.id, activeProduct.name, targetPackSize);
      // Immediately set the local template state so canvas retains all edits
      setTemplate(skuTmpl);
      if (onTemplateChange) onTemplateChange(skuTmpl);
      if (onSaveSkuOverride) {
        await onSaveSkuOverride(template, activeProduct.id, activeProduct.name, targetPackSize);
      } else {
        await onSaveTemplate(skuTmpl, 'This SKU');
      }
      setSaveStatus('saved');
      setToastMessage(`✓ Saved Custom Override for ${activeProduct.shortCode} (${targetPackSize})`);
      setTimeout(() => setSaveStatus('idle'), 2500);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setSaveStatus('idle');
      setToastMessage('Error saving SKU override');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Reset design back to the current Global Default for this pack size (clears product override if any, or restores last saved global default)
  const handleResetToGlobal = async () => {
    setIsSaveMenuOpen(false);
    setShowScopeConfirmModal(false);
    try {
      const targetPackSize = previewSku.packSize;
      const norm = normalizePackSize(targetPackSize);
      if (onRevertSkuOverride) {
        await onRevertSkuOverride(activeProduct.id, targetPackSize);
      }
      const overrideId = getSkuOverrideTemplateId(activeProduct.id, targetPackSize);
      const remainingTemplates = (templates || []).filter(t => t.id !== overrideId && t.skuOverrideKey !== `${activeProduct.id}_${norm}`);
      const resolved = resolveLayout(activeProduct.id, targetPackSize, remainingTemplates, packProfiles);
      setTemplate(resolved.template);
      if (onTemplateChange) onTemplateChange(resolved.template);
      setSelectedObjectId(resolved.template.objects[0]?.id || null);
      setHistory(h => [...h.slice(-24), JSON.parse(JSON.stringify(template))]);
      setRedoStack([]);
      setToastMessage(`↺ Reverted ${activeProduct.shortCode} back to Global ${targetPackSize} Default`);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setToastMessage('Error resetting to global default');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Primary Save Button Dispatcher
  const handlePrimarySaveClick = () => {
    if (currentLayoutInfo.source === 'sku_override') {
      handleSaveSkuCustomOverride();
    } else {
      handleSaveGeneralPackDefault();
    }
  };

  // Save handler with scope modal for Ctrl+S or explicit scope choice
  const handleSaveClick = () => {
    handlePrimarySaveClick();
  };

  const handleConfirmScopeSave = () => {
    if (selectedSaveTarget === 'pack_default') {
      handleSaveGeneralPackDefault();
    } else {
      handleSaveSkuCustomOverride();
    }
  };

  // Diagnostic bitmap modal
  const handleOpenDiagnostic = () => {
    const canvas = renderTemplateToCanvas(template, machine, previewValues, {
      forPrinterView: true,
      widthMm: canvasWidthMm,
      heightMm: canvasHeightMm,
      transform: {
        rotation: rasterRotation,
        mirrorX: rasterMirrorX,
        mirrorY: rasterMirrorY
      }
    });
    setDiagnosticDataUrl(canvas.toDataURL('image/png'));
    setShowDiagnosticModal(true);
  };

  // Download Standard Windows BMP (Fully compatible with Windows Photos, Paint, Word, etc.)
  const handleDownloadStandardBmp = () => {
    try {
      const canvas = renderTemplateToCanvas(template, machine, previewValues, {
        forDownload: true,
        widthMm: canvasWidthMm,
        heightMm: canvasHeightMm,
        transform: {
          rotation: rasterRotation,
          mirrorX: rasterMirrorX,
          mirrorY: rasterMirrorY
        }
      });
      const bmpBlob = canvasToStandardBmp(canvas);
      const url = URL.createObjectURL(bmpBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_300dpi.bmp`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // Download 1-bit Raw Industrial BMP
  const handleDownload1BitBmp = () => {
    try {
      const canvas = renderTemplateToCanvas(template, machine, previewValues, {
        forDownload: true,
        widthMm: canvasWidthMm,
        heightMm: canvasHeightMm,
        transform: {
          rotation: rasterRotation,
          mirrorX: rasterMirrorX,
          mirrorY: rasterMirrorY
        }
      });
      const bmpBlob = canvasTo1BitBmp(canvas);
      const url = URL.createObjectURL(bmpBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_1bit_raw_300dpi.bmp`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  // Download High-Res PNG
  const handleDownloadPng = () => {
    try {
      const canvas = renderTemplateToCanvas(template, machine, previewValues, {
        forDownload: true,
        widthMm: canvasWidthMm,
        heightMm: canvasHeightMm,
        downloadOrientation: template.customDownloadOrientation || '1to1',
        transform: {
          rotation: rasterRotation,
          mirrorX: rasterMirrorX,
          mirrorY: rasterMirrorY
        }
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.name.toLowerCase().replace(/\s+/g, '_')}_300dpi.png`;
      a.click();
    } catch (err) {
      console.error(err);
    }
  };

  // Advice & Pass Plan
  const advice = getLayoutAdvice(template, machine, packProfile);
  const passPlan = buildPassPlan(template, machine, packProfile);

  // Canvas Viewport Pan-to-Scroll (Drag background to smoothly pan canvas in both X and Y)
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  const handleViewportMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on the background, not on interactive objects
    const target = e.target as HTMLElement;
    if (target.dataset.panBackground === 'true' || target === canvasViewportRef.current) {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        scrollLeft: canvasViewportRef.current?.scrollLeft || 0,
        scrollTop: canvasViewportRef.current?.scrollTop || 0
      };
    }
  };

  const handleViewportMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current || !canvasViewportRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    canvasViewportRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    canvasViewportRef.current.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handleViewportMouseUp = () => {
    isPanningRef.current = false;
  };

  // Mouse Drag to Move Objects with 0.1 mm precision (freely across X and Y without locking X!)
  const handleStartDrag = (e: React.MouseEvent, obj: DesignObject) => {
    if (obj.locked) return;
    e.stopPropagation();
    commitPendingSession();
    selectObject(obj.id);

    const initialTemplateState = JSON.parse(JSON.stringify(template));
    const startMouseX = e.clientX;
    const startMouseY = e.clientY;
    const startObjX = obj.x;
    const startObjY = obj.y;
    let hasMoved = false;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startMouseX) / zoomLevel;
      const deltaY = (moveEvent.clientY - startMouseY) / zoomLevel;
      
      // Freely move in X and Y without locking or clamping X to 0!
      const newX = Math.round((startObjX + deltaX) * 10) / 10;
      const newY = Math.round((startObjY + deltaY) * 10) / 10;

      if (Math.abs(deltaX) > 0.05 || Math.abs(deltaY) > 0.05) {
        hasMoved = true;
      }

      setTemplate(prev => ({
        ...prev,
        objects: prev.objects.map(o => o.id === obj.id ? { ...o, x: newX, y: newY } : o)
      }));
    };

    const onMouseUp = () => {
      if (hasMoved) {
        setHistory(h => [...h.slice(-24), initialTemplateState]);
        setRedoStack([]);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Keyboard navigation for selected object (coalesced nudging with arrow keys into 1 undo step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedObject || selectedObject.locked) return;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const step = e.shiftKey ? 1.0 : 0.1;
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateObjectCoalesced(selectedObject.id, { y: Math.max(0, Math.round((selectedObject.y - step) * 10) / 10) }, 'keyboard_nudge');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateObjectCoalesced(selectedObject.id, { y: Math.min(canvasHeightMm - selectedObject.height, Math.round((selectedObject.y + step) * 10) / 10) }, 'keyboard_nudge');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateObjectCoalesced(selectedObject.id, { x: Math.round((selectedObject.x - step) * 10) / 10 }, 'keyboard_nudge');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateObjectCoalesced(selectedObject.id, { x: Math.round((selectedObject.x + step) * 10) / 10 }, 'keyboard_nudge');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        commitPendingSession();
        handleDeleteSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, canvasWidthMm, canvasHeightMm, updateObjectCoalesced, commitPendingSession]);

  // Global Ctrl+S shortcut for Save Design
  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveClick();
      }
    };
    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [template, scope]);

  return (
    <div className="flex flex-col flex-1 h-full select-none bg-zinc-950 relative overflow-hidden">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-none">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-zinc-900 border border-emerald-500/60 shadow-2xl text-xs font-semibold text-emerald-300 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Context Toolbar */}
      {/* Tier 1: Context, Printhead Geometry & Save Bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-1.5 h-12 flex items-center justify-between gap-2 text-xs shrink-0 overflow-x-auto no-scrollbar">
        {/* Left: Synchronized Product & SKU Selectors + Inheritance Status */}
        <div className="flex items-center gap-2 shrink-0">
          {allProducts && allProducts.length > 0 && (
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0.5 h-8">
              <label htmlFor="designer-product-select" className="text-zinc-500 text-[11px] font-medium cursor-pointer shrink-0">Product:</label>
              <select
                id="designer-product-select"
                name="designerProduct"
                aria-label="Designer active product"
                value={activeProduct?.id}
                onChange={e => {
                  const p = allProducts.find(prod => prod.id === e.target.value);
                  if (p && onSelectProduct) {
                    onSelectProduct(p);
                    const matchedSku = allSkus.find(s => s.productId === p.id && s.packSize === previewSku.packSize) || allSkus.find(s => s.productId === p.id);
                    if (matchedSku) {
                      setPreviewSkuId(matchedSku.id);
                      if (onSelectSku) onSelectSku(matchedSku);
                      const resolved = resolveLayout(p.id, matchedSku.packSize, templates && templates.length > 0 ? templates : [template], packProfiles);
                      setTemplate(resolved.template);
                      setSelectedObjectId(resolved.template.objects[0]?.id || null);
                      setHistory([]);
                      setRedoStack([]);
                    }
                  }
                }}
                className="bg-transparent font-bold text-zinc-100 focus:outline-hidden cursor-pointer text-xs max-w-[140px] truncate"
                title="Select active product"
              >
                {allProducts.map(p => (
                  <option key={p.id} value={p.id} className="bg-zinc-900 text-white">
                    {p.name} ({p.shortCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-0.5 h-8">
            <label htmlFor="designer-sku-select" className="text-zinc-500 text-[11px] font-medium cursor-pointer shrink-0">SKU:</label>
            <select
              id="designer-sku-select"
              name="designerSku"
              aria-label="Designer active SKU"
              value={previewSkuId}
              onChange={e => {
                const s = productSkus.find(sku => sku.id === e.target.value);
                if (s) {
                  setPreviewSkuId(s.id);
                  if (onSelectSku) onSelectSku(s);
                  const resolved = resolveLayout(activeProduct.id, s.packSize, templates && templates.length > 0 ? templates : [template], packProfiles);
                  setTemplate(resolved.template);
                  setSelectedObjectId(resolved.template.objects[0]?.id || null);
                  setHistory([]);
                  setRedoStack([]);
                }
              }}
              className="bg-transparent font-mono font-bold text-amber-400 focus:outline-hidden cursor-pointer text-xs max-w-[100px] truncate"
              title="Select active SKU pack size"
            >
              {productSkus.map(s => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-amber-400">
                  {s.packSize} {s.mrp ? `(₹${s.mrp})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Inheritance Pill */}
          <div className="hidden sm:flex items-center h-8">
            {currentLayoutInfo.source === 'sku_override' ? (
              <span className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-lg font-semibold" title={`Custom placement override for ${activeProduct.name} ${previewSku.packSize}`}>
                <Star className="w-3 h-3 fill-amber-400" />
                <span className="hidden md:inline">Override</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-lg font-semibold" title={`Global default layout for all ${previewSku.packSize} products`}>
                <Globe className="w-3 h-3" />
                <span className="hidden md:inline">Global Default</span>
              </span>
            )}
          </div>
        </div>

        {/* Center: Printhead Band Selector & Travel Length */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 h-8">
            <span className="text-[10px] text-zinc-500 px-1 font-medium">Head:</span>
            {[
              { mm: 12.5, label: '12.5mm' },
              { mm: 12.7, label: '12.7mm' }
            ].map(b => (
              <button
                key={b.mm}
                type="button"
                onClick={() => handleSetBandMm(b.mm)}
                className={`h-7 px-2 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer ${
                  Math.abs(currentBandMm - b.mm) < 0.15 ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
                title={`Head swath width: ${b.label}`}
              >
                {b.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 h-8">
            <label htmlFor="designer-length-input" className="text-[10px] text-zinc-500 px-1 font-medium cursor-pointer">Len:</label>
            <input
              id="designer-length-input"
              name="designerLengthMm"
              aria-label="Travel length in millimeters"
              type="number"
              step="1"
              min="10"
              max="1000"
              value={currentLengthMm}
              onChange={e => handleSetLengthMm(parseFloat(e.target.value) || 35)}
              className="w-10 bg-zinc-900 border border-zinc-700 rounded h-7 px-1 font-mono text-[11px] font-bold text-amber-400 text-center focus:outline-hidden"
              title="Travel length in mm"
            />
            <span className="text-[10px] text-zinc-500 font-mono pr-1">mm</span>

            <div className="flex items-center gap-0.5 pl-1 border-l border-zinc-800">
              {[35, 45].map(len => (
                <button
                  key={len}
                  type="button"
                  onClick={() => handleSetLengthMm(len)}
                  className={`h-7 px-1.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    currentLengthMm === len ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50' : 'text-zinc-400 hover:text-white'
                  }`}
                  title={`Preset: ${len}mm`}
                >
                  {len}
                </button>
              ))}
            </div>

            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 h-7 flex items-center rounded border border-zinc-800" title="1:1 Pixel Dimensions">
              {Math.round(canvasWidthMm * (300 / 25.4))}×{Math.round(canvasHeightMm * (300 / 25.4))}px
            </span>

            {/* Live Auto-Save Indicator */}
            <div className="flex items-center gap-1.5 px-2 h-7 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-emerald-400 select-none" title="Every canvas adjustment is continuously auto-saved">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span>{autoSaveStatus}</span>
            </div>
          </div>
        </div>

        {/* Right: History, Reset, Save & Proceed Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* History Undo / Redo */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 h-8">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className={`h-7 px-1.5 rounded flex items-center gap-1 font-semibold transition-colors ${
                history.length > 0 ? 'text-zinc-200 hover:text-white hover:bg-zinc-800 cursor-pointer' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title="Undo change (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`h-7 px-1.5 rounded flex items-center gap-1 font-semibold transition-colors border-l border-zinc-800 ${
                redoStack.length > 0 ? 'text-zinc-200 hover:text-white hover:bg-zinc-800 cursor-pointer' : 'text-zinc-600 cursor-not-allowed'
              }`}
              title="Redo change (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Action 1: Revert to Global Default */}
          <button
            type="button"
            onClick={handleResetToGlobal}
            className="flex items-center gap-1 px-2 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 text-xs font-semibold transition-colors cursor-pointer"
            title={`Revert back to the latest saved Global ${previewSku.packSize} Default layout`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden xl:inline">Revert</span>
          </button>

          {/* Action 2: Save as Global Default */}
          <button
            type="button"
            onClick={handleSaveGeneralPackDefault}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title={`Set this layout as the Global Default for ALL ${previewSku.packSize} products.`}
          >
            {saveStatus === 'saving' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveStatus === 'saved' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>Save Global</span>
          </button>

          {/* Action 3: Save as SKU Custom Override */}
          <button
            type="button"
            onClick={handleSaveSkuCustomOverride}
            disabled={saveStatus === 'saving'}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title={`Save an independent layout specifically for ${activeProduct.name} (${previewSku.packSize}) only.`}
          >
            <Star className="w-3.5 h-3.5 fill-black text-black" />
            <span>Save for {activeProduct.shortCode}</span>
          </button>

          {/* Proceed to Print Action */}
          <button
            type="button"
            onClick={onNavigateToPrint}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-semibold text-xs border border-zinc-700 transition-colors cursor-pointer"
            title="Proceed to Print Production View"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Tier 2: Precision Canvas View & Smart Alignment Strip (Fixed Height h-11) */}
      <div className="bg-zinc-950 border-b border-zinc-800/80 px-4 py-1 h-11 flex items-center justify-between gap-3 text-xs shrink-0 select-none overflow-x-auto no-scrollbar">
        {/* Left: View Mode Segmented Pill + Raster Orientation Controls */}
        <div className="flex items-center gap-2">
          {/* View Mode Pill */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
            <button
              type="button"
              onClick={() => setViewMode('pack')}
              className={`h-7 px-2.5 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'pack' ? 'bg-amber-500 text-black font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="Interactive vector pack view"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Pack View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('printer')}
              className={`h-7 px-2.5 rounded text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'printer' ? 'bg-amber-500 text-black font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
              title="1-Bit industrial machine raster buffer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>1-Bit Machine Raster</span>
            </button>
          </div>

          {/* Raster Rotation & Flip */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
            <span className="text-[10px] text-zinc-500 px-1 font-mono">Rotate:</span>
            {([0, 90, 180, 270] as const).map(deg => (
              <button
                key={deg}
                type="button"
                onClick={() => setRasterRotation(deg)}
                className={`h-7 px-1.5 rounded font-mono text-[10px] transition-colors cursor-pointer ${
                  rasterRotation === deg ? 'bg-amber-500 text-black font-bold shadow-xs' : 'text-zinc-400 hover:text-white'
                }`}
                title={`Set raster rotation to ${deg}°`}
              >
                {deg}°
              </button>
            ))}
            <button
              type="button"
              onClick={() => setRasterMirrorX(prev => !prev)}
              className={`h-7 px-2 rounded text-[10px] font-mono transition-colors ml-0.5 cursor-pointer border-l border-zinc-800 ${
                rasterMirrorX ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50' : 'text-zinc-400 hover:text-white'
              }`}
              title="Mirror X (Horizontal Flip)"
            >
              Flip X
            </button>
          </div>
        </div>

        {/* Center: Precision Viewport Zoom Engine */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
          <button
            type="button"
            onClick={handleZoomOut}
            className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleFitToWindow}
            className={`h-7 px-2 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              zoomMode === 'fit' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-zinc-400 hover:text-white'
            }`}
            title="Fit Label to Window (F)"
          >
            Fit
          </button>

          <button
            type="button"
            onClick={handle100Percent}
            className={`h-7 px-2 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              zoomMode === '100' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-zinc-400 hover:text-white'
            }`}
            title="100% Zoom (12 px/mm)"
          >
            100%
          </button>

          <button
            type="button"
            onClick={handle200Percent}
            className={`h-7 px-2 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
              zoomMode === '200' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40' : 'text-zinc-400 hover:text-white'
            }`}
            title="200% Zoom (24 px/mm)"
          >
            200%
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            className="h-7 w-7 rounded flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono text-zinc-400 px-1 border-l border-zinc-800" title="Current zoom scale">
            {zoomLevel.toFixed(1)} px/mm
          </span>
        </div>

        {/* Right: Smart Alignment & Swath Safety Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 h-8">
            <button
              type="button"
              onClick={handleFitSelected}
              className="h-7 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              title="Fit Selected line into usable band (Shift+F)"
            >
              <span>Fit Line</span>
              <kbd className="text-[9px] font-mono text-amber-400">⇧F</kbd>
            </button>

            <button
              type="button"
              onClick={handleFitAllLines}
              className="h-7 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold border border-amber-500/40 transition-colors flex items-center gap-1 cursor-pointer"
              title="Fit All Lines into usable band (Shift+A)"
            >
              <Crosshair className="w-3 h-3" />
              <span>Fit All</span>
              <kbd className="text-[9px] font-mono text-amber-400">⇧A</kbd>
            </button>

            {/* Line Gap Stepper */}
            <div className="flex items-center gap-0.5 pl-1.5 border-l border-zinc-800">
              <span className="text-zinc-500 text-[10px] font-mono">Gap:</span>
              <button
                type="button"
                onClick={() => handleLineGapChange(template.lineGapMm - 0.1)}
                className="w-5 h-7 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 font-mono text-xs flex items-center justify-center cursor-pointer"
                title="Decrease line gap by 0.1mm"
              >
                -
              </button>
              <span className="font-mono font-bold text-amber-400 px-1 text-[11px]">
                {template.lineGapMm.toFixed(1)}mm
              </span>
              <button
                type="button"
                onClick={() => handleLineGapChange(template.lineGapMm + 0.1)}
                className="w-5 h-7 rounded text-zinc-300 hover:text-white hover:bg-zinc-800 font-mono text-xs flex items-center justify-center cursor-pointer"
                title="Increase line gap by 0.1mm"
              >
                +
              </button>
            </div>
          </div>

          {/* Swath Safe Badge */}
          <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-semibold" title="Calibrated physical margins enforced: minimum 1.0mm (12px) white border prevents physical clipping">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Swath Safe (1mm)</span>
          </div>
        </div>
      </div>

      {/* Main Designer Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tool Rail: ALL BUTTONS FULLY FUNCTIONAL */}
        <div className="w-14 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-3 gap-2 shrink-0">
          <button
            onClick={() => setActiveTool('select')}
            className={`p-2.5 rounded-lg transition-colors ${
              activeTool === 'select' ? 'bg-amber-500 text-black shadow-xs font-bold' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
            }`}
            title="Select & Move Tool (V)"
          >
            <PenTool className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddTextObject}
            className="p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add Text Object (T)"
          >
            <Type className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleAddFieldObject('batch')}
            className="p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add Variable Field (F)"
          >
            <Hash className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddLineObject}
            className="p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add Horizontal Dividing Line (L)"
          >
            <Minus className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddRectangleObject}
            className="p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add Rectangle Box (R)"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddBarcodeObject}
            className="p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add 1D Barcode (B)"
          >
            <Barcode className="w-4 h-4" />
          </button>

          <button
            onClick={handleAddQrObject}
            className="p-2.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            title="Add 2D QR Code (Q)"
          >
            <QrCode className="w-4 h-4" />
          </button>

          <div className="w-8 border-t border-zinc-800 my-1" />

          {/* Diagnostic Raster Trigger */}
          <button
            onClick={handleOpenDiagnostic}
            className="p-2.5 rounded-lg text-amber-400 hover:bg-zinc-800 transition-colors"
            title="Preview Final 1-Bit Machine Raster (Eye)"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>

        {/* Center Canvas Workspace Wrapper */}
        <div className="flex-1 relative flex flex-col overflow-hidden bg-zinc-950 drafting-dot-grid">
          {/* Scrollable Viewport with Full Top-to-Bottom, Left-to-Right Scrolling without Cutoff */}
          <div 
            ref={canvasViewportRef}
            onMouseDown={handleViewportMouseDown}
            onMouseMove={handleViewportMouseMove}
            onMouseUp={handleViewportMouseUp}
            onMouseLeave={handleViewportMouseUp}
            className="flex-1 overflow-auto relative select-none cursor-grab active:cursor-grabbing industrial-scrollbar"
            style={{
              scrollbarGutter: 'stable',
              overscrollBehavior: 'contain'
            }}
          >
            <div 
              data-pan-background="true"
              className="inline-flex min-w-full min-h-full p-20"
              style={{
                justifyContent: 'safe center',
                alignItems: 'safe center'
              }}
            >
              {/* UNIFIED DUAL-AXIS RULERS INTEGRATED FOR BOTH PACK VIEW & PRINTER RASTER VIEW */}
              <div className="relative inline-flex flex-col shadow-[0_25px_60px_rgba(0,0,0,0.95)] ring-1 ring-zinc-800 rounded-xs shrink-0 my-auto mx-auto cursor-default">
                {/* Top Row: Corner Origin Box + X Horizontal Ruler */}
                <div className="flex">
                  {/* (0,0) Corner Box */}
                  <div className="w-7 h-6 bg-zinc-900 border-r border-b border-zinc-700/80 flex items-center justify-center text-[9px] font-mono font-bold text-amber-400 select-none shrink-0">
                    mm
                  </div>

                  {/* X RULER (Horizontal Axis) */}
                  <div 
                    className="h-6 bg-zinc-900 border-b border-zinc-800 relative select-none overflow-hidden shrink-0"
                    style={{ 
                      width: `${displayWidthMm * zoomLevel}px`,
                      minWidth: `${displayWidthMm * zoomLevel}px`,
                      maxWidth: `${displayWidthMm * zoomLevel}px`
                    }}
                  >
                    {/* Millimeter Ticks on X Axis */}
                    {Array.from({ length: Math.ceil(displayWidthMm) + 1 }).map((_, mm) => {
                      const is10mm = mm % 10 === 0;
                      const is5mm = mm % 5 === 0 && !is10mm;
                      const posPx = mm * zoomLevel;

                      return (
                        <div 
                          key={mm} 
                          className={`absolute bottom-0 flex flex-col pointer-events-none ${
                            mm === 0 ? 'items-start left-0' : 'items-center -translate-x-1/2'
                          }`}
                          style={{ left: `${posPx}px` }}
                        >
                          {is10mm && mm > 0 && (
                            <span className="text-[8px] font-mono text-zinc-400 leading-none mb-0.5 select-none">
                              {mm}
                            </span>
                          )}
                          <div 
                            className={`w-px ${
                              is10mm ? 'h-3 bg-zinc-400' : is5mm ? 'h-2 bg-zinc-600' : 'h-1 bg-zinc-700'
                            }`} 
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Row: Y Vertical Ruler + Printable White Substrate */}
                <div className="flex">
                  {/* Y RULER (Vertical Axis) */}
                  <div 
                    className="w-7 bg-zinc-900 border-r border-zinc-800 relative select-none overflow-hidden shrink-0"
                    style={{ 
                      height: `${displayHeightMm * zoomLevel}px`,
                      minHeight: `${displayHeightMm * zoomLevel}px`,
                      maxHeight: `${displayHeightMm * zoomLevel}px`
                    }}
                  >
                    {/* Millimeter Ticks on Y Axis */}
                    {Array.from({ length: Math.ceil(displayHeightMm) + 1 }).map((_, mm) => {
                      const is10mm = mm % 10 === 0;
                      const is5mm = mm % 5 === 0 && !is10mm;
                      const posPx = mm * zoomLevel;

                      return (
                        <div 
                          key={mm} 
                          className={`absolute right-0 flex pointer-events-none ${
                            mm === 0 ? 'items-start top-0' : 'items-center -translate-y-1/2'
                          }`}
                          style={{ top: `${posPx}px` }}
                        >
                          {is10mm && mm > 0 && (
                            <span className="text-[8px] font-mono text-zinc-400 leading-none mr-1 select-none">
                              {mm}
                            </span>
                          )}
                          <div 
                            className={`h-px ${
                              is10mm ? 'w-3 bg-zinc-400' : is5mm ? 'w-2 bg-zinc-600' : 'h-1 bg-zinc-700'
                            }`} 
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* WHITE PAPER / SUBSTRATE CANVAS */}
                  <div 
                    className="relative bg-white text-black border border-zinc-400 shadow-xl select-none overflow-hidden cursor-crosshair shrink-0"
                    style={{
                      width: `${displayWidthMm * zoomLevel}px`,
                      minWidth: `${displayWidthMm * zoomLevel}px`,
                      maxWidth: `${displayWidthMm * zoomLevel}px`,
                      height: `${displayHeightMm * zoomLevel}px`,
                      minHeight: `${displayHeightMm * zoomLevel}px`,
                      maxHeight: `${displayHeightMm * zoomLevel}px`
                    }}
                    onClick={() => {
                      if (viewMode === 'pack') selectObject(null);
                    }}
                  >
                    {/* Subtle 5mm Grid Lines */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
                      <defs>
                        <pattern id="grid5mm" width={5 * zoomLevel} height={5 * zoomLevel} patternUnits="userSpaceOnUse">
                          <path d={`M ${5 * zoomLevel} 0 L 0 0 0 ${5 * zoomLevel}`} fill="none" stroke="#000" strokeWidth="0.5" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#grid5mm)" />
                    </svg>

                    {viewMode === 'printer' ? (
                      /* SMOOTH CRISP TRANSFORMED DIRECT CANVAS (NO PIXELATED DOWNSCALING) */
                      <div className="relative w-full h-full bg-white flex items-center justify-center pointer-events-none overflow-hidden">
                        <canvas 
                          ref={printerCanvasRef} 
                          className="w-full h-full pointer-events-none block object-contain" 
                          style={{ imageRendering: 'auto' }}
                        />
                      </div>
                    ) : (
                      /* PACK VIEW: INTERACTIVE VECTOR OBJECTS */
                      template.objects.map(obj => {
                        const isSelected = selectedObjectId === obj.id;
                        const xPx = obj.x * zoomLevel;
                        const yPx = obj.y * zoomLevel;
                        const wPx = Math.max(2, obj.width * zoomLevel);
                        const hPx = obj.height * zoomLevel;

                        let displayText = obj.content || '';
                        if (displayText.includes('{')) {
                          displayText = displayText.replace(/\{(\w+)\}/g, (_, k) => previewValues[k] !== undefined ? previewValues[k] : `{${k}}`);
                        } else if (obj.fieldKey && previewValues[obj.fieldKey]) {
                          displayText = previewValues[obj.fieldKey];
                        }

                        const rot = obj.rotation || 0;
                        const scaleX = (obj.mirrorX ? -1 : 1) * (obj.horizontalStretchPercent / 100);
                        const scaleY = obj.mirrorY ? -1 : 1;

                        return (
                          <div
                            key={obj.id}
                            onMouseDown={e => handleStartDrag(e, obj)}
                            onClick={e => {
                              e.stopPropagation();
                              selectObject(obj.id);
                            }}
                            onDoubleClick={e => {
                              e.stopPropagation();
                              handleObjectDoubleClick(obj.id);
                            }}
                            className={`absolute flex items-center transition-shadow select-none whitespace-nowrap ${
                              (obj.type === 'text' || obj.type === 'field') ? 'overflow-visible' : 'overflow-hidden'
                            } ${
                              isSelected 
                                ? 'outline outline-1.5 outline-amber-500 shadow-sm cursor-grab active:cursor-grabbing z-30' 
                                : 'hover:bg-zinc-100/60 cursor-pointer z-10'
                            }`}
                            style={{
                              left: `${xPx}px`,
                              top: `${yPx}px`,
                              width: (obj.type === 'text' || obj.type === 'field')
                                ? `${Math.max(wPx, (canvasWidthMm - obj.x - 0.2) * zoomLevel)}px`
                                : `${wPx}px`,
                              height: `${hPx}px`,
                              fontFamily: `${obj.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`,
                              fontSize: `${Math.max(6, Math.round(obj.fontSizeMm * zoomLevel))}px`,
                              fontWeight: obj.fontWeight === 'bold' ? 'bold' : 'normal',
                              fontStyle: obj.fontStyle === 'italic' ? 'italic' : 'normal',
                              letterSpacing: `${(obj.letterSpacingMm || 0) * zoomLevel}px`,
                              transform: `rotate(${rot}deg) scale(${scaleX}, ${scaleY})`,
                              transformOrigin: `${obj.alignment === 'center' ? 'center' : obj.alignment === 'right' ? 'right' : 'left'} center`,
                              filter: obj.invert ? 'invert(1)' : 'none',
                              justifyContent: obj.alignment === 'center' ? 'center' : obj.alignment === 'right' ? 'flex-end' : 'flex-start'
                            }}
                          >
                            {obj.type === 'line' ? (
                              <div 
                                className="w-full bg-black select-none pointer-events-none" 
                                style={{ 
                                  height: `${Math.max(1, (obj.strokeWidthMm || obj.height || 0.4) * zoomLevel)}px` 
                                }} 
                              />
                            ) : obj.type === 'rectangle' ? (
                              <div 
                                className="w-full h-full select-none pointer-events-none" 
                                style={{
                                  borderWidth: `${Math.max(1, (obj.strokeWidthMm || 0.4) * zoomLevel)}px`,
                                  borderColor: '#000000',
                                  borderStyle: obj.borderStyle || 'solid',
                                  borderRadius: `${Math.round((obj.cornerRadiusMm || 0) * zoomLevel)}px`,
                                  backgroundColor: obj.fillMode === 'solid' ? '#000000' : 'transparent',
                                  boxSizing: 'border-box'
                                }}
                              />
                            ) : obj.type === 'barcode' ? (
                              <div 
                                className="w-full h-full flex flex-col items-center justify-center bg-white p-0.5 select-none overflow-hidden"
                                dangerouslySetInnerHTML={{ 
                                  __html: renderBarcodeSvgString('barcode', displayText, obj.barcodeFormat === 'EAN13' ? 'EAN13' : 'CODE128') 
                                }}
                              />
                            ) : obj.type === 'qr' ? (
                              <div 
                                className="w-full h-full flex items-center justify-center bg-white p-0.5 select-none overflow-hidden"
                                dangerouslySetInnerHTML={{ 
                                  __html: renderBarcodeSvgString('qr', displayText) 
                                }}
                              />
                            ) : (
                              <span className="leading-none whitespace-nowrap overflow-visible">
                                {displayText}
                              </span>
                            )}

                            {/* Selected Bounding Box Handles */}
                            {isSelected && (
                              <>
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-amber-500 border border-white rounded-xs" />
                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 border border-white rounded-xs" />
                                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-amber-500 border border-white rounded-xs" />
                                <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-amber-500 border border-white rounded-xs" />
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Orientation & Travel Indicator Badge (Fixed in bottom-right of workspace, never scrolls away or blocks content) */}
          <div className="absolute bottom-3 right-5 z-20 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/95 backdrop-blur-xs border border-zinc-800 text-xs font-mono text-zinc-300 shadow-xl">
            <span className="text-zinc-500">Travel:</span>
            <span className="font-bold text-amber-400">{template.travel}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500">Layout:</span>
            <span className="font-bold text-amber-400">{template.layout}</span>
            <span className="text-zinc-600">•</span>
            <span className="text-zinc-500">Band:</span>
            <span className="font-bold text-zinc-200">{machine.printBandMm} mm</span>
          </div>
        </div>

        {/* Right Properties & Orientation Panel */}
        <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col overflow-y-auto industrial-scrollbar p-4 space-y-5 text-xs shrink-0">
          {viewMode === 'printer' ? (
            /* PRINTER 1-BIT RASTER DIAGNOSTICS & HARDWARE CONTROLS */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Printer className="w-4 h-4" />
                  <span>1-Bit Raster Properties</span>
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30">
                  {machine.defaultDpi} DPI
                </span>
              </div>

              {/* Technical Metrics Card */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Raster Res:</span>
                  <span className="font-bold text-white">
                    {Math.round(canvasWidthMm * (machine.defaultDpi / 25.4))} × {Math.round(canvasHeightMm * (machine.defaultDpi / 25.4))} px
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Physical Size:</span>
                  <span className="text-zinc-300">{canvasWidthMm.toFixed(1)} × {canvasHeightMm.toFixed(1)} mm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Head Nozzles:</span>
                  <span className="text-amber-400 font-bold">{machine.printBandMm} mm ({Math.round(machine.printBandMm * (machine.defaultDpi / 25.4))} nozzles)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Feed Direction:</span>
                  <span className="text-zinc-300">{machine.feedOrigin}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Binary Bit Depth:</span>
                  <span className="text-emerald-400 font-bold">1-Bit Pure Monochrome</span>
                </div>
              </div>

              {/* Raster Orientation & Flip Transforms */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                  Raster Orientation & Mirror
                </span>
                
                {/* 4-way Rotation */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500">Raster Rotation</label>
                    <button
                      onClick={() => setRasterRotation(prev => ((prev + 90) % 360) as 0 | 90 | 180 | 270)}
                      className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono"
                      title="Quick Rotate 90° Clockwise"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>+90°</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {([0, 90, 180, 270] as const).map(deg => (
                      <button
                        key={deg}
                        onClick={() => setRasterRotation(deg)}
                        className={`py-1 rounded font-mono text-[11px] transition-colors ${
                          rasterRotation === deg
                            ? 'bg-amber-500 text-black font-bold shadow-xs'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mirroring / Flips */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => setRasterMirrorX(prev => !prev)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] border transition-colors ${
                      rasterMirrorX
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                    title="Flip Horizontally (Mirror X)"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Flip X</span>
                  </button>

                  <button
                    onClick={() => setRasterMirrorY(prev => !prev)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-[11px] border transition-colors ${
                      rasterMirrorY
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                    title="Flip Vertically (Mirror Y)"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    <span>Flip Y</span>
                  </button>
                </div>
              </div>

              {/* Quick Raster Operations */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                  Download & Inspect
                </span>

                {/* Standard BMP button (Windows Photos compatible) */}
                <button
                  onClick={handleDownloadStandardBmp}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm transition-colors"
                  title="Download Windows BMP (Compatible with Windows Photos, Paint, and all viewers)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Windows BMP (300 DPI)</span>
                </button>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleDownload1BitBmp}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px] border border-zinc-700 transition-colors"
                    title="Download Raw 1-Bit Indexed BMP for direct industrial controllers"
                  >
                    <Download className="w-3 h-3" />
                    <span>Raw 1-Bit BMP</span>
                  </button>

                  <button
                    onClick={handleDownloadPng}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-[11px] border border-zinc-700 transition-colors"
                    title="Download High-Resolution PNG"
                  >
                    <Download className="w-3 h-3" />
                    <span>PNG (300 DPI)</span>
                  </button>
                </div>

                <button
                  onClick={updatePrinterViewRaster}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-Rasterize Template</span>
                </button>

                <button
                  onClick={handleOpenDiagnostic}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-semibold text-xs border border-zinc-700 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Binary Bitmap</span>
                </button>

                <button
                  onClick={() => setViewMode('pack')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs border border-zinc-800 transition-colors"
                >
                  <span>← Back to Vector Pack View</span>
                </button>
              </div>

              {/* Raster Readiness Notice */}
              <div className="border-t border-zinc-800 pt-3 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Raster Readiness</span>
                </span>
                <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-[11px] leading-relaxed">
                  ✓ Pure 1-bit binary raster generated at {machine.defaultDpi} DPI. Ready for direct industrial TIJ head streaming.
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* 2x2 Orientation Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Travel × Layout (2×2)
              </span>
              <button
                onClick={handleCycleOrientation}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-amber-400 hover:bg-zinc-700"
                title="Cycle Orientation (Alt+O)"
              >
                Cycle (Alt+O)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleSetOrientation('Vertical', 'Stack')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                  template.travel === 'Vertical' && template.layout === 'Stack'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <ArrowDownUp className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-mono">1 Pass</span>
                </div>
                <span className="text-[11px]">Vertical + Stack</span>
              </button>

              <button
                onClick={() => handleSetOrientation('Vertical', 'Strip')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                  template.travel === 'Vertical' && template.layout === 'Strip'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-mono">2 Passes</span>
                </div>
                <span className="text-[11px]">Vertical + Strip</span>
              </button>

              <button
                onClick={() => handleSetOrientation('Horizontal', 'Strip')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                  template.travel === 'Horizontal' && template.layout === 'Strip'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-mono">1 Pass</span>
                </div>
                <span className="text-[11px]">Horizontal + Strip</span>
              </button>

              <button
                onClick={() => handleSetOrientation('Horizontal', 'Stack')}
                className={`p-2.5 rounded-lg border text-left flex flex-col gap-1 transition-colors ${
                  template.travel === 'Horizontal' && template.layout === 'Stack'
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-mono">Column</span>
                </div>
                <span className="text-[11px]">Horizontal + Stack</span>
              </button>
            </div>

            {/* Layout Advisor Recommendation */}
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <span className="font-bold text-amber-400 block">Layout Advisor:</span>
              <p>{advice.recommended.oneLineReason}</p>
            </div>
          </div>

          {/* Selected Object Properties */}
          {selectedObject ? (
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Object: {selectedObject.fieldKey || selectedObject.content || selectedObject.type}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleUpdateSelectedObject({ locked: !selectedObject.locked })}
                    className={`p-1 rounded ${selectedObject.locked ? 'text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    title={selectedObject.locked ? 'Unlock object' : 'Lock object position'}
                  >
                    {selectedObject.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1 rounded text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete object"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* OBJECT CONTENT & DATA EDITOR (Category Tailored) */}
              {selectedObject.type !== 'line' && selectedObject.type !== 'rectangle' && (() => {
                const isBarcode = selectedObject.type === 'barcode';
                const isQr = selectedObject.type === 'qr';
                const fKey = selectedObject.fieldKey || '';
                const semTag = selectedObject.semanticTag || '';
                const contentStr = (selectedObject.content || '').toUpperCase();

                const category: 'mrp' | 'batch' | 'mfd' | 'best_before' | 'net_wt' | 'rate_per_gm' | 'barcode' | 'qr' | 'general' =
                  isBarcode ? 'barcode'
                  : isQr ? 'qr'
                  : (semTag === 'mrp' || fKey === 'mrp' || contentStr.includes('{MRP}') || contentStr.includes('MRP')) ? 'mrp'
                  : (semTag === 'batch' || fKey === 'batch' || contentStr.includes('{BATCH}') || contentStr.includes('B.NO') || contentStr.includes('LOT')) ? 'batch'
                  : (semTag === 'mfd' || fKey === 'mfd' || contentStr.includes('{MFD}') || contentStr.includes('MFD') || contentStr.includes('PKD') || contentStr.includes('MFG')) ? 'mfd'
                  : (semTag === 'best_before' || fKey === 'best_before' || contentStr.includes('{BEST_BEFORE}') || contentStr.includes('BEST BEFORE') || contentStr.includes('EXP')) ? 'best_before'
                  : (semTag === 'net_wt' || fKey === 'net_wt' || contentStr.includes('{NET_WT}') || contentStr.includes('NET WT') || contentStr.includes('WEIGHT')) ? 'net_wt'
                  : (semTag === 'rate_per_gm' || fKey === 'rate_per_gm' || contentStr.includes('{RATE_PER_GM}')) ? 'rate_per_gm'
                  : 'general';

                return (
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 space-y-2.5">
                    {/* Header with active category badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          {category === 'mrp' ? 'MRP & Unit Pricing'
                            : category === 'batch' ? 'Batch / Lot Number'
                            : category === 'mfd' ? 'Mfg Date (MFD)'
                            : category === 'best_before' ? 'Best Before / Shelf Life'
                            : category === 'net_wt' ? 'Net Weight / Quantity'
                            : category === 'barcode' ? 'Barcode Symbology'
                            : category === 'qr' ? '2D QR Code Matrix'
                            : 'Text & Content'}
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                        {category}
                      </span>
                    </div>

                    {/* Category Selector Pills */}
                    <div className="flex flex-wrap gap-1 pb-1 border-b border-zinc-800/80">
                      {[
                        { id: 'mrp', label: 'MRP' },
                        { id: 'batch', label: 'Batch' },
                        { id: 'mfd', label: 'MFD' },
                        { id: 'best_before', label: 'Best Before' },
                        { id: 'net_wt', label: 'Net Wt' },
                        { id: 'barcode', label: 'Barcode' },
                        { id: 'qr', label: 'QR' }
                      ].map(pill => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => {
                            if (pill.id === 'barcode') {
                              updateObjectCoalesced(selectedObject.id, { 
                                type: 'barcode',
                                semanticTag: 'barcode',
                                barcodeFormat: 'CODE128',
                                width: Math.min(canvasWidthMm - 1.0, 11.5),
                                height: 7.0,
                                content: selectedObject.content && !selectedObject.content.startsWith('http') ? selectedObject.content : 'ADTP014'
                              }, 'property_tweak');
                            } else if (pill.id === 'qr') {
                              updateObjectCoalesced(selectedObject.id, { 
                                type: 'qr',
                                semanticTag: 'qr',
                                width: 8.5,
                                height: 8.5,
                                content: 'https://adalaj.in/b/ADTP014' 
                              }, 'property_tweak');
                            } else {
                              updateObjectCoalesced(selectedObject.id, { 
                                type: 'field',
                                fieldKey: pill.id,
                                semanticTag: pill.id,
                                content: `{${pill.id}}`
                              }, 'property_tweak');
                            }
                            commitPendingSession();
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono transition-colors cursor-pointer border ${
                            category === pill.id
                              ? 'bg-amber-500 text-black border-amber-400 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {pill.label}
                        </button>
                      ))}
                    </div>

                    {/* MRP Specific Micro-Inspector */}
                    {category === 'mrp' && (
                      <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Current MRP: <strong className="text-white">{previewValues.mrp}</strong></span>
                          <span className="text-amber-400 font-mono">Rate: <strong>{previewValues.rate_per_gm}/g</strong></span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block">Regulatory Format Presets (Click to apply):</span>
                        <div className="grid grid-cols-1 gap-1">
                          {[
                            { label: `₹{mrp}`, desc: 'Price only' },
                            { label: `MRP ₹{mrp}`, desc: 'Standard label' },
                            { label: `MRP ₹{mrp} (INCL. OF ALL TAXES)`, desc: 'Statutory compliance' },
                            { label: `MRP ₹{mrp} (₹{rate_per_gm}/g)`, desc: 'Price + unit rate' },
                            { label: `₹{mrp} (USP ₹{rate_per_gm}/g)`, desc: 'Short USP tag' }
                          ].map(preset => (
                            <button
                              key={preset.label}
                              type="button"
                              onClick={() => {
                                updateObjectCoalesced(selectedObject.id, { content: preset.label }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className="w-full text-left px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 flex items-center justify-between text-[10px] font-mono text-zinc-200 transition-colors cursor-pointer"
                            >
                              <span className="text-amber-300 font-semibold">{preset.label}</span>
                              <span className="text-zinc-500 text-[9px]">{preset.desc}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Batch Specific Micro-Inspector */}
                    {category === 'batch' && (
                      <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Active Batch: <strong className="text-amber-400 font-mono">{previewValues.batch}</strong></span>
                          <span className="text-zinc-500 font-mono text-[10px]">{activeProduct.name}</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block">Batch Format Presets:</span>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            'B.No: {batch}',
                            'BATCH: {batch}',
                            'LOT NO: {batch}',
                            'B.No. {batch}',
                            'BATCH NO: {batch}',
                            '{batch}'
                          ].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                updateObjectCoalesced(selectedObject.id, { content: preset }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className="text-left px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer truncate"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* MFD Specific Micro-Inspector */}
                    {category === 'mfd' && (
                      <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">MFD Value: <strong className="text-white font-mono">{previewValues.mfd}</strong></span>
                          <span className="text-zinc-500 font-mono text-[9px]">DD/MM/YY</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block">Manufacturing Date Presets:</span>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            'MFD: {mfd}',
                            'PKD: {mfd}',
                            'MFG: {mfd}',
                            'DATE OF MFG: {mfd}',
                            'MFD. {mfd}',
                            '{mfd}'
                          ].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                updateObjectCoalesced(selectedObject.id, { content: preset }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className="text-left px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer truncate"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Best Before Specific Micro-Inspector */}
                    {category === 'best_before' && (
                      <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Expiry Value: <strong className="text-white font-mono">{previewValues.best_before}</strong></span>
                          <span className="text-zinc-500 font-mono text-[9px]">Shelf Life</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block">Best Before & Expiry Presets:</span>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            'BEST BEFORE: {best_before}',
                            'EXP: {best_before}',
                            'USE BY: {best_before}',
                            'EXPIRY: {best_before}',
                            'BEST BEFORE 12 MONTHS',
                            '{best_before}'
                          ].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                updateObjectCoalesced(selectedObject.id, { content: preset }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className="text-left px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer truncate"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Net Weight Specific Micro-Inspector */}
                    {category === 'net_wt' && (
                      <div className="p-2 rounded bg-zinc-900/80 border border-zinc-800 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-zinc-400">Net Quantity: <strong className="text-white font-mono">{previewValues.net_wt}</strong></span>
                          <span className="text-zinc-500 font-mono text-[9px]">{previewSku.packSize}</span>
                        </div>
                        <span className="text-[9px] text-zinc-500 block">Net Weight Presets:</span>
                        <div className="grid grid-cols-2 gap-1">
                          {[
                            'Net Wt: {net_wt}',
                            'NET WT. {net_wt}',
                            'Net Qty: {net_wt}',
                            'NET WEIGHT: {net_wt}',
                            'WEIGHT: {net_wt}',
                            '{net_wt}'
                          ].map(preset => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                updateObjectCoalesced(selectedObject.id, { content: preset }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className="text-left px-2 py-1 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/50 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer truncate"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Barcode Symbology Editor & Live Vector Preview */}
                    {isBarcode && (
                      <div className="space-y-2 pt-1 border-t border-zinc-800">
                        <div>
                          <label className="text-[10px] text-zinc-400 block mb-0.5">Symbology standard:</label>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                updateObjectCoalesced(selectedObject.id, { 
                                  barcodeFormat: 'CODE128',
                                  width: Math.min(canvasWidthMm - 1.0, 11.5)
                                }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                                (selectedObject.barcodeFormat || 'CODE128') === 'CODE128'
                                  ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              Code 128 (Batch)
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const digits = (selectedObject.content || '').replace(/\D/g, '');
                                const eanFormatted = digits.length >= 12 ? digits.slice(0, 12) : (digits ? digits.padEnd(12, '0') : '890103099999');
                                updateObjectCoalesced(selectedObject.id, { 
                                  barcodeFormat: 'EAN13',
                                  content: eanFormatted,
                                  width: Math.min(canvasWidthMm - 1.0, 11.5)
                                }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className={`py-1 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                                selectedObject.barcodeFormat === 'EAN13'
                                  ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                              }`}
                            >
                              EAN-13 (Retail GTIN)
                            </button>
                          </div>
                          <span className="text-[9px] text-zinc-400 block mt-1">
                            {selectedObject.barcodeFormat === 'EAN13'
                              ? 'EAN-13: Standard 12 data digits + auto-calculated 13th checksum digit'
                              : 'Code 128: Alphanumeric barcode for Batch IDs and alphanumeric SKU codes'}
                          </span>
                        </div>

                        {/* Barcode Height Presets */}
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">Barcode Height:</span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { mm: 5.0, label: '5 mm (Compact)' },
                              { mm: 7.0, label: '7 mm (Standard)' },
                              { mm: 10.0, label: '10 mm (Tall)' }
                            ].map(h => (
                              <button
                                key={h.mm}
                                type="button"
                                onClick={() => {
                                  updateObjectCoalesced(selectedObject.id, { height: h.mm }, 'property_tweak');
                                  commitPendingSession();
                                }}
                                className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                                  Math.abs(selectedObject.height - h.mm) < 0.2
                                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {h.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Vector Mini Preview */}
                        <div className="p-2 rounded bg-white border border-zinc-700 flex items-center justify-center h-12 overflow-hidden">
                          <div
                            className="w-full h-full flex items-center justify-center"
                            dangerouslySetInnerHTML={{
                              __html: renderBarcodeSvgString('barcode', selectedObject.content || 'ADTP014', selectedObject.barcodeFormat === 'EAN13' ? 'EAN13' : 'CODE128')
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* QR Code Editor & Live Vector Preview */}
                    {isQr && (
                      <div className="space-y-2 pt-1 border-t border-zinc-800">
                        <div>
                          <span className="text-[10px] text-zinc-400 block mb-1">QR Code Size (Square):</span>
                          <div className="grid grid-cols-3 gap-1">
                            {[
                              { mm: 6.0, label: '6 mm' },
                              { mm: 8.5, label: '8.5 mm' },
                              { mm: 11.0, label: '11 mm' }
                            ].map(s => (
                              <button
                                key={s.mm}
                                type="button"
                                onClick={() => {
                                  updateObjectCoalesced(selectedObject.id, { width: s.mm, height: s.mm }, 'property_tweak');
                                  commitPendingSession();
                                }}
                                className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                                  Math.abs(selectedObject.width - s.mm) < 0.2
                                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                                }`}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Live Vector Mini Preview */}
                        <div className="p-2 rounded bg-white border border-zinc-700 flex items-center justify-center h-16 overflow-hidden">
                          <div
                            className="w-14 h-14"
                            dangerouslySetInnerHTML={{
                              __html: renderBarcodeSvgString('qr', selectedObject.content || 'https://adalaj.in')
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Direct Text / Data Input */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-zinc-400">
                          {isQr ? 'QR Code URL / Payload' : isBarcode ? 'Barcode Value / Encoded Data' : 'Exact Label Text Value'}
                        </label>
                        <span className="text-[9px] text-zinc-500 font-mono">{(selectedObject.content || '').length} chars</span>
                      </div>
                      <input
                        ref={contentInputRef}
                        type="text"
                        value={selectedObject.content || ''}
                        onChange={e => {
                          const val = e.target.value;
                          updateObjectCoalesced(selectedObject.id, { content: val }, 'property_tweak');
                        }}
                        onBlur={commitPendingSession}
                        placeholder={isQr ? 'https://adalaj.in/b/{batch}' : isBarcode ? 'ADTP014' : 'Enter text...'}
                        className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-500 rounded px-2.5 py-1.5 text-xs text-zinc-100 font-mono focus:outline-hidden"
                      />
                    </div>

                    {/* Dynamic Token Chips */}
                    {!isBarcode && !isQr && (
                      <div>
                        <span className="text-[9px] text-zinc-500 block mb-1">Insert Dynamic Tokens:</span>
                        <div className="flex flex-wrap gap-1">
                          {[
                            { token: '{mrp}', label: 'MRP' },
                            { token: '{batch}', label: 'Batch' },
                            { token: '{net_wt}', label: 'Net Wt' },
                            { token: '{mfd}', label: 'MFD' },
                            { token: '{best_before}', label: 'Exp' },
                            { token: '{rate_per_gm}', label: 'Rate/g' },
                            { token: '{product}', label: 'Product' }
                          ].map(chip => (
                            <button
                              key={chip.token}
                              type="button"
                              onClick={() => {
                                const current = selectedObject.content || '';
                                const updated = current ? `${current} ${chip.token}` : chip.token;
                                updateObjectCoalesced(selectedObject.id, { content: updated }, 'property_tweak');
                                commitPendingSession();
                              }}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-[10px] font-mono text-amber-300 transition-colors cursor-pointer"
                              title={`Insert dynamic token: ${chip.token}`}
                            >
                              + {chip.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Box / Rectangle Properties */}
              {selectedObject.type === 'rectangle' && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Box & Border Styling
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                      BOX
                    </span>
                  </div>

                  {/* Fill Mode: Hollow vs Solid */}
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Fill Mode:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateObjectCoalesced(selectedObject.id, { fillMode: 'hollow' }, 'property_tweak');
                          commitPendingSession();
                        }}
                        className={`py-1.5 px-2 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                          (selectedObject.fillMode || 'hollow') === 'hollow'
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Hollow (Border Only)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateObjectCoalesced(selectedObject.id, { fillMode: 'solid' }, 'property_tweak');
                          commitPendingSession();
                        }}
                        className={`py-1.5 px-2 rounded text-[11px] font-semibold transition-colors cursor-pointer border ${
                          selectedObject.fillMode === 'solid'
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Solid Black Fill
                      </button>
                    </div>
                  </div>

                  {/* Border Style: Solid vs Dashed */}
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Border Line Style:</span>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          updateObjectCoalesced(selectedObject.id, { borderStyle: 'solid' }, 'property_tweak');
                          commitPendingSession();
                        }}
                        className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                          (selectedObject.borderStyle || 'solid') === 'solid'
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Solid
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateObjectCoalesced(selectedObject.id, { borderStyle: 'dashed' }, 'property_tweak');
                          commitPendingSession();
                        }}
                        className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                          selectedObject.borderStyle === 'dashed'
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Dashed
                      </button>
                    </div>
                  </div>

                  {/* Border Thickness */}
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Border Thickness (mm):</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { mm: 0.2, label: '0.2 mm' },
                        { mm: 0.4, label: '0.4 mm' },
                        { mm: 0.8, label: '0.8 mm' },
                        { mm: 1.2, label: '1.2 mm' }
                      ].map(t => (
                        <button
                          key={t.mm}
                          type="button"
                          onClick={() => {
                            updateObjectCoalesced(selectedObject.id, { strokeWidthMm: t.mm }, 'property_tweak');
                            commitPendingSession();
                          }}
                          className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                            Math.abs((selectedObject.strokeWidthMm || 0.4) - t.mm) < 0.05
                              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Radius */}
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Corner Radius (mm):</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { mm: 0, label: 'Square' },
                        { mm: 1.0, label: '1.0 mm' },
                        { mm: 2.0, label: '2.0 mm' },
                        { mm: 3.0, label: '3.0 mm' }
                      ].map(r => (
                        <button
                          key={r.mm}
                          type="button"
                          onClick={() => {
                            updateObjectCoalesced(selectedObject.id, { cornerRadiusMm: r.mm }, 'property_tweak');
                            commitPendingSession();
                          }}
                          className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                            Math.abs((selectedObject.cornerRadiusMm || 0) - r.mm) < 0.05
                              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Line Properties */}
              {selectedObject.type === 'line' && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      Dividing Line Style
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 uppercase">
                      LINE
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Thickness (mm):</span>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { mm: 0.2, label: '0.2 mm' },
                        { mm: 0.4, label: '0.4 mm' },
                        { mm: 0.8, label: '0.8 mm' },
                        { mm: 1.2, label: '1.2 mm' }
                      ].map(t => (
                        <button
                          key={t.mm}
                          type="button"
                          onClick={() => {
                            updateObjectCoalesced(selectedObject.id, { height: t.mm, strokeWidthMm: t.mm }, 'property_tweak');
                            commitPendingSession();
                          }}
                          className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                            Math.abs((selectedObject.strokeWidthMm || selectedObject.height) - t.mm) < 0.05
                              ? 'bg-amber-500 text-black font-bold shadow-xs'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Orientation Presets for Line */}
                  <div>
                    <span className="text-[10px] text-zinc-400 block mb-1">Line Orientation:</span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { deg: 0, label: '0° Horiz' },
                        { deg: 90, label: '90° Vert' },
                        { deg: 45, label: '45° Diag' }
                      ].map(p => (
                        <button
                          key={p.deg}
                          type="button"
                          onClick={() => {
                            updateObjectCoalesced(selectedObject.id, { rotation: p.deg }, 'property_tweak');
                            commitPendingSession();
                          }}
                          className={`py-1 rounded text-[10px] font-mono transition-colors cursor-pointer border ${
                            (selectedObject.rotation || 0) === p.deg
                              ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      updateObjectCoalesced(selectedObject.id, { x: 0.5, width: canvasWidthMm - 1.0, rotation: 0 }, 'property_tweak');
                      commitPendingSession();
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-500/50 text-[11px] font-semibold text-zinc-200 transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Span Full Band Width ({canvasWidthMm - 1.0} mm)</span>
                  </button>
                </div>
              )}

              {/* Coordinates: X, Y, W, H with 0.1 mm step & Directional Nudges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-[10px] text-zinc-500">X (mm)</label>
                    <div className="flex items-center gap-0.5">
                      <button 
                        type="button"
                        onClick={() => updateObjectCoalesced(selectedObject.id, { x: Math.round((selectedObject.x - 0.5) * 10) / 10 }, 'property_tweak')}
                        className="px-1 py-0.2 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono"
                        title="Move left 0.5mm"
                      >
                        ◀
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateObjectCoalesced(selectedObject.id, { x: Math.round((selectedObject.x + 0.5) * 10) / 10 }, 'property_tweak')}
                        className="px-1 py-0.2 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono"
                        title="Move right 0.5mm"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                  <input
                    id="designer-pos-x-input"
                    name="positionX"
                    aria-label="X position in millimeters"
                    type="number"
                    step="0.1"
                    value={selectedObject.x}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      updateObjectCoalesced(selectedObject.id, { x: isNaN(v) ? 0 : v }, 'property_tweak');
                    }}
                    onBlur={commitPendingSession}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-0.5">
                    <label htmlFor="designer-pos-y-input" className="text-[10px] text-zinc-500">Y (mm)</label>
                    <div className="flex items-center gap-0.5">
                      <button 
                        type="button"
                        onClick={() => updateObjectCoalesced(selectedObject.id, { y: Math.round((selectedObject.y - 0.5) * 10) / 10 }, 'property_tweak')}
                        className="px-1 py-0.2 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono"
                        title="Move up 0.5mm"
                      >
                        ▲
                      </button>
                      <button 
                        type="button"
                        onClick={() => updateObjectCoalesced(selectedObject.id, { y: Math.round((selectedObject.y + 0.5) * 10) / 10 }, 'property_tweak')}
                        className="px-1 py-0.2 text-[9px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded font-mono"
                        title="Move down 0.5mm"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                  <input
                    id="designer-pos-y-input"
                    name="positionY"
                    aria-label="Y position in millimeters"
                    type="number"
                    step="0.1"
                    value={selectedObject.y}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      updateObjectCoalesced(selectedObject.id, { y: isNaN(v) ? 0 : v }, 'property_tweak');
                    }}
                    onBlur={commitPendingSession}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                </div>
                <div>
                  <label htmlFor="designer-dim-w-input" className="text-[10px] text-zinc-500 block mb-0.5">Width (mm)</label>
                  <input
                    id="designer-dim-w-input"
                    name="dimensionWidth"
                    aria-label="Width in millimeters"
                    type="number"
                    step="0.1"
                    value={selectedObject.width}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      updateObjectCoalesced(selectedObject.id, { width: isNaN(v) ? 0 : v }, 'property_tweak');
                    }}
                    onBlur={commitPendingSession}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                </div>
                <div>
                  <label htmlFor="designer-dim-h-input" className="text-[10px] text-zinc-500 block mb-0.5">Height (mm)</label>
                  <input
                    id="designer-dim-h-input"
                    name="dimensionHeight"
                    aria-label="Height in millimeters"
                    type="number"
                    step="0.1"
                    value={selectedObject.height}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      updateObjectCoalesced(selectedObject.id, { height: isNaN(v) ? 0 : v, fontSizeMm: isNaN(v) ? 0 : v }, 'property_tweak');
                    }}
                    onBlur={commitPendingSession}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                </div>
              </div>

              {/* Typography Controls */}
              {selectedObject.type !== 'line' && selectedObject.type !== 'rectangle' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Font Family</label>
                    <select
                      value={selectedObject.fontFamily}
                      onChange={e => handleUpdateSelectedObject({ fontFamily: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-zinc-200 text-xs"
                    >
                      <option value="Barlow Condensed">Barlow Condensed</option>
                      <option value="Roboto Condensed">Roboto Condensed</option>
                      <option value="Noto Sans">Noto Sans</option>
                      <option value="Roboto Mono">Roboto Mono</option>
                      <option value="Oswald">Oswald</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="text-[10px] text-zinc-500 block mb-0.5">Text Height (mm)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1.0"
                        value={selectedObject.fontSizeMm}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 1.8;
                          updateObjectCoalesced(selectedObject.id, { fontSizeMm: v, height: v }, 'property_tweak');
                        }}
                        onBlur={commitPendingSession}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[10px] text-zinc-500">Condense (%)</label>
                        <span className="text-[9px] font-mono text-amber-400 font-bold">{selectedObject.horizontalStretchPercent}%</span>
                      </div>
                      <input
                        type="number"
                        min="40"
                        max="150"
                        step="5"
                        value={selectedObject.horizontalStretchPercent}
                        onChange={e => {
                          const val = Math.max(30, Math.min(200, parseInt(e.target.value) || 100));
                          updateObjectCoalesced(selectedObject.id, { horizontalStretchPercent: val }, 'property_tweak');
                        }}
                        onBlur={commitPendingSession}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                      />
                      <div className="flex items-center gap-1 mt-1">
                        {[75, 80, 85, 90, 100].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => {
                              commitPendingSession();
                              updateTemplateWithHistory(prev => ({
                                ...prev,
                                objects: prev.objects.map(o => o.id === selectedObject.id ? { ...o, horizontalStretchPercent: pct } : o)
                              }));
                            }}
                            className={`px-1 py-0.5 rounded text-[8px] font-mono transition-colors ${
                              selectedObject.horizontalStretchPercent === pct ? 'bg-amber-500 text-black font-bold' : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Alignment & Styles */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex rounded bg-zinc-950 border border-zinc-800 p-0.5">
                      <button
                        onClick={() => handleUpdateSelectedObject({ alignment: 'left' })}
                        className={`p-1.5 rounded ${selectedObject.alignment === 'left' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateSelectedObject({ alignment: 'center' })}
                        className={`p-1.5 rounded ${selectedObject.alignment === 'center' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateSelectedObject({ alignment: 'right' })}
                        className={`p-1.5 rounded ${selectedObject.alignment === 'right' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex rounded bg-zinc-950 border border-zinc-800 p-0.5">
                      <button
                        onClick={() => handleUpdateSelectedObject({ fontWeight: selectedObject.fontWeight === 'bold' ? 'normal' : 'bold' })}
                        className={`p-1.5 rounded ${selectedObject.fontWeight === 'bold' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateSelectedObject({ fontStyle: selectedObject.fontStyle === 'italic' ? 'normal' : 'italic' })}
                        className={`p-1.5 rounded ${selectedObject.fontStyle === 'italic' ? 'bg-zinc-800 text-amber-400' : 'text-zinc-500 hover:text-white'}`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Object Rotation, Mirroring & Invert Controls */}
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                    Rotate & Mirror Object
                  </span>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-amber-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                    <span>{selectedObject.rotation || 0}°</span>
                  </div>
                </div>

                {/* Arbitrary Angle Slider & Numeric Degree Input */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="1"
                      value={selectedObject.rotation || 0}
                      onChange={e => {
                        const rot = parseInt(e.target.value) || 0;
                        updateObjectCoalesced(selectedObject.id, { rotation: rot }, 'property_tweak');
                      }}
                      onMouseUp={commitPendingSession}
                      onTouchEnd={commitPendingSession}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                    />
                    <div className="flex items-center shrink-0">
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={selectedObject.rotation || 0}
                        onChange={e => {
                          const rot = (parseInt(e.target.value) || 0) % 360;
                          updateObjectCoalesced(selectedObject.id, { rotation: rot >= 0 ? rot : rot + 360 }, 'property_tweak');
                        }}
                        onBlur={commitPendingSession}
                        className="w-14 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-1 text-center font-mono text-xs text-amber-400 focus:outline-hidden"
                      />
                      <span className="text-[10px] text-zinc-500 font-mono ml-1">deg</span>
                    </div>
                  </div>

                  {/* Quick Angle Presets */}
                  <div className="grid grid-cols-6 gap-1">
                    {[
                      { deg: 0, label: '0°' },
                      { deg: 45, label: '45°' },
                      { deg: 90, label: '90°' },
                      { deg: 135, label: '135°' },
                      { deg: 180, label: '180°' },
                      { deg: 270, label: '270°' }
                    ].map(p => (
                      <button
                        key={p.deg}
                        type="button"
                        onClick={() => {
                          updateObjectCoalesced(selectedObject.id, { rotation: p.deg }, 'property_tweak');
                          commitPendingSession();
                        }}
                        className={`py-1 rounded font-mono text-[10px] transition-colors cursor-pointer border ${
                          (selectedObject.rotation || 0) === p.deg
                            ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-xs'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Fine Nudge Buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const curr = selectedObject.rotation || 0;
                        const next = (curr - 15 + 360) % 360;
                        updateObjectCoalesced(selectedObject.id, { rotation: next }, 'property_tweak');
                        commitPendingSession();
                      }}
                      className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-300 transition-colors cursor-pointer"
                    >
                      -15° Nudge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curr = selectedObject.rotation || 0;
                        const next = (curr + 15) % 360;
                        updateObjectCoalesced(selectedObject.id, { rotation: next }, 'property_tweak');
                        commitPendingSession();
                      }}
                      className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-zinc-300 transition-colors cursor-pointer"
                    >
                      +15° Nudge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const curr = selectedObject.rotation || 0;
                        const next = (curr + 90) % 360;
                        updateObjectCoalesced(selectedObject.id, { rotation: next }, 'property_tweak');
                        commitPendingSession();
                      }}
                      className="px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[10px] font-mono text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3" />
                      <span>+90°</span>
                    </button>
                  </div>
                </div>

                {/* Mirroring / Flips */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => handleUpdateSelectedObject({ mirrorX: !selectedObject.mirrorX })}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded text-[11px] border transition-colors ${
                      selectedObject.mirrorX
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                    title="Mirror / Flip Horizontally (X)"
                  >
                    <FlipHorizontal className="w-3.5 h-3.5" />
                    <span>Flip X</span>
                  </button>

                  <button
                    onClick={() => handleUpdateSelectedObject({ mirrorY: !selectedObject.mirrorY })}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded text-[11px] border transition-colors ${
                      selectedObject.mirrorY
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                    title="Mirror / Flip Vertically (Y)"
                  >
                    <FlipVertical className="w-3.5 h-3.5" />
                    <span>Flip Y</span>
                  </button>

                  <button
                    onClick={() => handleUpdateSelectedObject({ invert: !selectedObject.invert })}
                    className={`flex items-center justify-center gap-1 py-1.5 rounded text-[11px] border transition-colors ${
                      selectedObject.invert
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                    title="Invert Polarity"
                  >
                    <span>Invert</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Template Global Properties */
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Template Controls
              </span>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.autoFlow}
                    onChange={e => setTemplate(prev => ({ ...prev, autoFlow: e.target.checked }))}
                    className="accent-amber-500 rounded"
                  />
                  <span>Auto-Flow Stacked Lines</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.preventOverlap}
                    onChange={e => setTemplate(prev => ({ ...prev, preventOverlap: e.target.checked }))}
                    className="accent-amber-500 rounded"
                  />
                  <span>Prevent Object Overlap</span>
                </label>
                <label className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.printCaptions}
                    onChange={e => setTemplate(prev => ({ ...prev, printCaptions: e.target.checked }))}
                    className="accent-amber-500 rounded"
                  />
                  <span>Print Caption Labels ("M.R.P.:")</span>
                </label>
              </div>

              {/* Printhead Band & Endless Travel Length Controls */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">
                  Printhead & Substrate Length
                </span>

                {/* Printhead Band: 12.5mm vs 12.7mm */}
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Printhead Band (Locked Axis)</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => handleSetBandMm(12.5)}
                      className={`py-1.5 px-2 rounded text-xs font-mono transition-colors ${
                        currentBandMm === 12.5 ? 'bg-amber-500 text-black font-bold shadow-xs' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      12.5 mm
                    </button>
                    <button
                      onClick={() => handleSetBandMm(12.7)}
                      className={`py-1.5 px-2 rounded text-xs font-mono transition-colors ${
                        currentBandMm === 12.7 ? 'bg-amber-500 text-black font-bold shadow-xs' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                      }`}
                    >
                      12.7 mm (½")
                    </button>
                  </div>
                </div>

                {/* Unrestricted / Endless Length */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-zinc-500">Travel Length (Unrestricted)</label>
                    <span className="text-[10px] text-emerald-400 font-mono">Endless Mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="1000"
                      value={currentLengthMm}
                      onChange={e => handleSetLengthMm(parseFloat(e.target.value) || 35)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200 text-xs font-bold focus:outline-hidden"
                    />
                    <span className="text-zinc-500 text-xs font-mono">mm</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 mt-1.5">
                    {[35, 45, 80, 100].map(len => (
                      <button
                        key={len}
                        onClick={() => handleSetLengthMm(len)}
                        className={`py-1 rounded text-[10px] font-mono transition-colors ${
                          currentLengthMm === len ? 'bg-amber-500/30 text-amber-300 font-bold border border-amber-500/50' : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {len}mm
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quality Readiness Check Box */}
          <div className="border-t border-zinc-800 pt-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Readiness ({issues.length} issues)</span>
            </span>

            {issues.length === 0 ? (
              <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-[11px]">
                ✓ All objects within printable 12.5mm band. Safe for direct printing.
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleFitAllLines}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  title="Auto-reflow all objects into a collision-free stacked layout"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-black" />
                  <span>Auto-Fix & Reflow All Lines</span>
                </button>
                <div className="space-y-1.5 max-h-48 overflow-y-auto industrial-scrollbar pr-1">
                  {issues.map(iss => (
                    <div key={iss.id} className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] space-y-0.5">
                      <span className="font-bold text-amber-400">{iss.title}</span>
                      <p className="text-zinc-400">{iss.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom Batch-Value Preview Bar with Working Action Buttons */}
      <div className="h-10 bg-zinc-900 border-t border-zinc-800 px-4 flex items-center justify-between text-xs overflow-x-auto scrollbar-none gap-4 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor="designer-live-sku-select" className="font-bold uppercase tracking-wider text-[10px] text-zinc-400 cursor-pointer">Live Values:</label>
          <select
            id="designer-live-sku-select"
            name="livePreviewSku"
            aria-label="Select SKU for Live Values Preview"
            value={previewSkuId}
            onChange={e => {
              const s = productSkus.find(sku => sku.id === e.target.value);
              if (s) {
                setPreviewSkuId(s.id);
                if (onSelectSku) onSelectSku(s);
                const resolved = resolveLayout(activeProduct.id, s.packSize, templates && templates.length > 0 ? templates : [template], packProfiles);
                setTemplate(resolved.template);
                setSelectedObjectId(resolved.template.objects[0]?.id || null);
                setHistory([]);
                setRedoStack([]);
              }
            }}
            className="bg-zinc-950 border border-zinc-700 rounded px-2 py-0.5 text-xs text-amber-400 font-mono font-bold focus:outline-hidden cursor-pointer"
            title="Live values for active product SKUs"
          >
            {productSkus.map(s => (
              <option key={s.id} value={s.id}>
                {activeProduct?.shortCode || 'ADTP'} {s.packSize} {s.mrp ? `(₹${s.mrp})` : '(No MRP)'}
              </option>
            ))}
          </select>
        </div>

        {/* Live Evaluated Values Strip */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400 whitespace-nowrap overflow-hidden">
          <span>MRP: <strong className="text-white">{previewValues.mrp}</strong></span>
          <span className="text-zinc-700">•</span>
          <span>Batch: <strong className="text-amber-400">{previewValues.batch}</strong></span>
          <span className="text-zinc-700">•</span>
          <span>Net Wt: <strong className="text-white">{previewValues.net_wt}</strong></span>
          <span className="text-zinc-700">•</span>
          <span>MFD: <strong className="text-zinc-400">{previewValues.mfd}</strong></span>
          <span className="text-zinc-700">•</span>
          <span>Best Before: <strong className="text-zinc-400">{previewValues.best_before}</strong></span>
          <span className="text-zinc-700">•</span>
          <span>Rate: <strong className="text-white">{previewValues.rate_per_gm}</strong></span>
        </div>

        {/* Clickable Quick Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleFitSelected}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-[10px] border border-zinc-700"
          >
            Shift+F Fit
          </button>
          <button
            onClick={handleFitAllLines}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-mono text-[10px] border border-zinc-700"
          >
            Shift+A All
          </button>
          <button
            onClick={handleCycleOrientation}
            className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[10px] border border-zinc-700"
          >
            Alt+O Rotate
          </button>
        </div>
      </div>

      {/* Two-Tier Scope Confirmation Modal */}
      {showScopeConfirmModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>Save Design Layout Scope</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Choose how these design coordinates, sizes, fonts, and travel lengths should be applied.
                </p>
              </div>
              <button 
                onClick={() => setShowScopeConfirmModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scope Choices */}
            <div className="space-y-2.5">
              {/* Option 1: Pack Default */}
              <label 
                onClick={() => setSelectedSaveTarget('pack_default')}
                className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedSaveTarget === 'pack_default'
                    ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/40'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="save_scope"
                  checked={selectedSaveTarget === 'pack_default'}
                  onChange={() => setSelectedSaveTarget('pack_default')}
                  className="mt-0.5 accent-emerald-500"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>General Default for all {previewSku.packSize} packs (All Products)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Saves this layout as the standard for <strong>all {previewSku.packSize} packaging</strong> across all categories (Turmeric, Chilli, Coriander, etc.). Does NOT alter 500g, 200g, or any other pack size. Dynamic values (MRP, Batch, Net Wt) will come from each product automatically.
                  </p>
                </div>
              </label>

              {/* Option 2: SKU Override */}
              <label 
                onClick={() => setSelectedSaveTarget('sku_override')}
                className={`p-3 rounded-lg border flex items-start gap-3 cursor-pointer transition-colors ${
                  selectedSaveTarget === 'sku_override'
                    ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40'
                    : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <input
                  type="radio"
                  name="save_scope"
                  checked={selectedSaveTarget === 'sku_override'}
                  onChange={() => setSelectedSaveTarget('sku_override')}
                  className="mt-0.5 accent-amber-500"
                />
                <div>
                  <div className="text-xs font-bold text-zinc-100 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-400" />
                    <span>Custom Override for {activeProduct.name} ({previewSku.packSize}) only</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
                    Isolates these visual placement tweaks strictly for <strong>{activeProduct.name} {previewSku.packSize}</strong>. All other {previewSku.packSize} products continue using their General Default layout.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-500 font-mono">
                Active SKU: {activeProduct.shortCode} • {previewSku.packSize}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowScopeConfirmModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmScopeSave}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save {selectedSaveTarget === 'pack_default' ? `General ${previewSku.packSize} Default` : 'Custom Override'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostic Raster Preview Modal */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 max-w-2xl w-full space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-400" />
                <span>1-Bit Pure Monochrome Machine Raster</span>
              </h4>
              <button onClick={() => setShowDiagnosticModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-zinc-400">
              Raw binary bitmap rendered at {machine.defaultDpi} DPI. This is the exact bitmap delivered to the printer head.
            </p>
            <div className="p-6 bg-zinc-950 rounded-lg flex items-center justify-center border border-zinc-800">
              {diagnosticDataUrl && (
                <img 
                  src={diagnosticDataUrl} 
                  alt="Diagnostic 1-bit BMP" 
                  className="max-h-72 object-contain shadow-md"
                  style={{ imageRendering: 'pixelated' }}
                />
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black font-bold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
