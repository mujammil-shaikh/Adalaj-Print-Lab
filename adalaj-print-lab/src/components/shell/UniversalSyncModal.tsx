/**
 * Universal Persistence & Cross-Device Sync Hub
 * Enables instant multi-device backup, portable sync codes, 1-click share links, and dual-layer verification.
 */

import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CloudCheck, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Share2, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { 
  db, 
  saveUniversalSnapshot, 
  restoreFromUniversalSnapshot, 
  generateUniversalSyncString, 
  parseUniversalSyncString 
} from '../../services/db';
import { renderBarcodeSvgString } from '../../services/printTransform';

interface UniversalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const UniversalSyncModal: React.FC<UniversalSyncModalProps> = ({
  isOpen,
  onClose,
  onDataRestored
}) => {
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [shareUrl, setShareUrl] = useState<string>('');
  const [lastSavedTime, setLastSavedTime] = useState<string>('Just now');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedTime = localStorage.getItem('als_universal_last_saved');
      if (savedTime) {
        setLastSavedTime(new Date(savedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
      saveUniversalSnapshot().then(snapshot => {
        if (snapshot) {
          const syncStr = generateUniversalSyncString(snapshot);
          setShareUrl(`${window.location.origin}${window.location.pathname}#sync=${syncStr}`);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopySyncCode = async () => {
    try {
      setIsProcessing(true);
      const snapshot = await saveUniversalSnapshot();
      if (!snapshot) throw new Error('Could not generate snapshot');
      const syncStr = generateUniversalSyncString(snapshot);
      await navigator.clipboard.writeText(syncStr);
      setCopiedSyncCode(true);
      setStatusMessage('✓ Universal Sync Code copied to clipboard!');
      setTimeout(() => setCopiedSyncCode(false), 2500);
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopyShareLink = async () => {
    try {
      setIsProcessing(true);
      const snapshot = await saveUniversalSnapshot();
      if (!snapshot) throw new Error('Could not generate snapshot');
      const syncStr = generateUniversalSyncString(snapshot);
      const shareUrl = `${window.location.origin}${window.location.pathname}#sync=${syncStr}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShareLink(true);
      setStatusMessage('✓ 1-Click Universal Share Link copied! Open on phone or any computer.');
      setTimeout(() => setCopiedShareLink(false), 2500);
    } catch (err: any) {
      setStatusMessage(`❌ Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplySyncCode = async () => {
    if (!syncCodeInput.trim()) return;
    try {
      setIsProcessing(true);
      const parsed = parseUniversalSyncString(syncCodeInput.trim());
      if (!parsed || !parsed.tables) {
        throw new Error('Invalid Sync Code format. Please verify the code.');
      }
      await restoreFromUniversalSnapshot(parsed);
      setStatusMessage('✓ Workspace successfully restored from Sync Code!');
      setSyncCodeInput('');
      onDataRestored();
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setStatusMessage(`❌ Sync Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const snapshot = await saveUniversalSnapshot();
      if (!snapshot) return;
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ADALAJ_UNIVERSAL_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('✓ JSON backup downloaded successfully.');
    } catch (err: any) {
      setStatusMessage(`❌ Export failed: ${err.message}`);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        const snapshot = json.tables ? json : { tables: json };
        await restoreFromUniversalSnapshot(snapshot);
        setStatusMessage('✓ JSON backup restored successfully.');
        onDataRestored();
        setTimeout(() => onClose(), 1000);
      } catch (err: any) {
        setStatusMessage(`❌ Restore failed: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
                Universal Persistence & Cross-Device Sync
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Dual-Layer Active
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                All templates, prices, custom lines, batches and settings persist 100% across refreshes and devices.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Dual-Layer Storage Status Banner */}
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>100% Reload Safe: IndexedDB + LocalStorage Snapshot Mirror</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400/80">
              Saved: {lastSavedTime}
            </span>
          </div>

          {/* Action 1: Universal 1-Click Share Link */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-200">1-Click Mobile / Multi-Device Share Link</span>
              </div>
              <button
                onClick={handleCopyShareLink}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black transition-colors shadow-xs cursor-pointer"
              >
                {copiedShareLink ? <Check className="w-3.5 h-3.5 text-black" /> : <Share2 className="w-3.5 h-3.5 text-black" />}
                <span>{copiedShareLink ? 'Link Copied!' : 'Copy Share Link'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Generates a universal web link containing your complete current design, pricing, and batch database. Send it via WhatsApp, email, or open on your phone/tablet to immediately load the exact same data.
            </p>

            {/* Instant Camera Scan QR Code */}
            <div className="flex items-center gap-3 pt-2 border-t border-zinc-850">
              <div className="shrink-0 bg-white p-1 rounded-lg border border-zinc-700 w-20 h-20 flex items-center justify-center overflow-hidden">
                <div 
                  className="w-full h-full flex items-center justify-center"
                  dangerouslySetInnerHTML={{
                    __html: renderBarcodeSvgString('qr', shareUrl || (typeof window !== 'undefined' ? window.location.href : 'https://adalaj-print-lab.vercel.app'))
                  }}
                />
              </div>
              <div className="text-[11px] text-zinc-400 space-y-1">
                <span className="font-bold text-amber-400 block">Instant Camera Scan:</span>
                <p>Point any smartphone or tablet camera at this QR code to immediately clone and sync your workspace across devices with 0 configuration.</p>
              </div>
            </div>
          </div>

          {/* Action 2: Portable Universal Sync Code */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Copy className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-zinc-200">Portable Universal Sync Code</span>
              </div>
              <button
                onClick={handleCopySyncCode}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors cursor-pointer"
              >
                {copiedSyncCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSyncCode ? 'Code Copied!' : 'Copy Sync Code'}</span>
              </button>
            </div>

            {/* Paste & Apply Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste Universal Sync Code from another device..."
                value={syncCodeInput}
                onChange={e => setSyncCodeInput(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 font-mono placeholder:text-zinc-600 focus:outline-hidden focus:border-amber-500"
              />
              <button
                onClick={handleApplySyncCode}
                disabled={!syncCodeInput.trim() || isProcessing}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-amber-400 border border-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
              >
                Apply Code
              </button>
            </div>
          </div>

          {/* Action 3: JSON File Backup & Restore */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-zinc-200 block">Offline Backup File</span>
              <span className="text-[11px] text-zinc-500">Export or import standard .json backup archive</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
              <label className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Import</span>
                <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
              </label>
            </div>
          </div>

          {/* Status Feedback */}
          {statusMessage && (
            <div className="p-2.5 rounded-lg bg-zinc-950 border border-amber-500/30 text-xs font-medium text-amber-300">
              {statusMessage}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between text-[11px] text-zinc-500">
          <span>Adalaj Label Studio V2.0 • Zero-Data-Loss Architecture</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
