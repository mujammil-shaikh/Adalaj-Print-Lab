/**
 * Settings Workspace View
 * Machine Profiles, Pack Profiles (with Measurement Wizard), Media Profiles,
 * Keyboard Shortcut Editor with conflict detection, Screen Scale Calibration, and JSON Backup/Restore.
 */

import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Package, 
  Keyboard, 
  Sliders, 
  Ruler, 
  Download, 
  Upload, 
  Check, 
  AlertTriangle,
  RotateCw,
  Plus,
  RefreshCw,
  Layers,
  Usb,
  Radio,
  Wifi,
  Terminal,
  Send,
  Copy,
  CheckCheck,
  Database,
  Key
} from 'lucide-react';
import type { MachineProfile, PackProfile, MediaProfile, Business, Brand } from '../../types';
import { actionRegistry } from '../../services/actionRegistry';
import { 
  db, 
  saveUniversalSnapshot, 
  generateUniversalSyncString, 
  parseUniversalSyncString, 
  restoreFromUniversalSnapshot,
  type UniversalDatabaseSnapshot 
} from '../../services/db';
import { hardwareManager, type HardwareLogEntry } from '../../services/hardwareAdapters';

interface SettingsViewProps {
  business: Business;
  brand: Brand;
  machines: MachineProfile[];
  activeMachine: MachineProfile;
  packProfiles: PackProfile[];
  mediaProfiles: MediaProfile[];
  onSelectMachine: (m: MachineProfile) => void;
  onUpdateMachine: (m: MachineProfile) => void;
  onUpdatePackProfile: (p: PackProfile) => void;
  onRestoreBackup: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  business,
  brand,
  machines,
  activeMachine,
  packProfiles,
  mediaProfiles,
  onSelectMachine,
  onUpdateMachine,
  onUpdatePackProfile,
  onRestoreBackup
}) => {
  const [activeTab, setActiveTab] = useState<'machine' | 'pack' | 'hardware' | 'keyboard' | 'calibrate' | 'backup'>('machine');

  // Hardware Tab state
  const [hwLogs, setHwLogs] = useState<HardwareLogEntry[]>([]);
  const [testNetIp, setTestNetIp] = useState('192.168.1.100');
  const [testNetPort, setTestNetPort] = useState(9100);
  const [hwDeviceName, setHwDeviceName] = useState('');

  useEffect(() => {
    setHwLogs(hardwareManager.getLogs());
    const unsub = hardwareManager.subscribeLogs(() => {
      setHwLogs(hardwareManager.getLogs());
    });
    return unsub;
  }, []);

  const [editingMachine, setEditingMachine] = useState<MachineProfile | null>(null);
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);

  // Screen scale calibration state
  const [calibratedMm, setCalibratedMm] = useState<number>(100);
  const [calibrationSuccess, setCalibrationSuccess] = useState(false);

  // Measurement wizard modal state
  const [selectedPackForWizard, setSelectedPackForWizard] = useState<PackProfile | null>(null);
  const [wizardDistSealToMrp, setWizardDistSealToMrp] = useState<number>(17.2);
  const [wizardLinePitch, setWizardLinePitch] = useState<number>(4.3);
  const [wizardTextHeight, setWizardTextHeight] = useState<number>(3.3);
  const [wizardBlockHeight, setWizardBlockHeight] = useState<number>(25.0);

  // Keyboard shortcut editor state
  const [shortcutFilter, setShortcutFilter] = useState('');
  const [shortcutCategory, setShortcutCategory] = useState<string>('all');
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [capturedKey, setCapturedKey] = useState('');
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [keyboardFeedback, setKeyboardFeedback] = useState<string | null>(null);

  // Backup & sync state
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [syncStringInput, setSyncStringInput] = useState<string>('');
  const [copiedSync, setCopiedSync] = useState(false);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const [prods, skus, bts, tmpls, machs, jobs, loose, audits] = await Promise.all([
          db.products.count(),
          db.skus.count(),
          db.batches.count(),
          db.templates.count(),
          db.machineProfiles.count(),
          db.printJobs.count(),
          db.looseStock.count(),
          db.auditLogs.count()
        ]);
        setTableCounts({
          Products: prods,
          SKUs: skus,
          Batches: bts,
          Templates: tmpls,
          Machines: machs,
          PrintJobs: jobs,
          LooseStock: loose,
          AuditLogs: audits
        });
      } catch (err) {
        console.error('Failed to load table counts:', err);
      }
    };
    loadCounts();
  }, [activeTab]);

  const registeredActions = actionRegistry.getAll();
  const filteredActions = registeredActions.filter(a => {
    const matchesCategory = shortcutCategory === 'all' || a.area.toLowerCase() === shortcutCategory.toLowerCase();
    const matchesSearch = !shortcutFilter || 
      a.label.toLowerCase().includes(shortcutFilter.toLowerCase()) ||
      (a.shortcut && a.shortcut.toLowerCase().includes(shortcutFilter.toLowerCase())) ||
      a.area.toLowerCase().includes(shortcutFilter.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSaveCalibration = () => {
    localStorage.setItem('als_screen_scale_factor', String(100 / calibratedMm));
    setCalibrationSuccess(true);
    setTimeout(() => setCalibrationSuccess(false), 3000);
  };

  const handleOpenMeasurementWizard = (p: PackProfile) => {
    setSelectedPackForWizard(p);
    setWizardDistSealToMrp(p.printWindowStartY);
    setWizardLinePitch(p.valueLinePitchMm);
    setWizardTextHeight(3.3);
    setWizardBlockHeight(p.printWindowLengthMm);
  };

  const handleSaveWizard = () => {
    if (!selectedPackForWizard) return;
    const updated: PackProfile = {
      ...selectedPackForWizard,
      printWindowStartY: wizardDistSealToMrp,
      valueLinePitchMm: wizardLinePitch,
      printWindowLengthMm: wizardBlockHeight,
      status: 'verified',
      notes: `Physically measured: Seal-to-MRP: ${wizardDistSealToMrp}mm, Line pitch: ${wizardLinePitch}mm, Text height: ${wizardTextHeight}mm.`
    };
    onUpdatePackProfile(updated);
    setSelectedPackForWizard(null);
  };

  const handleAssignShortcut = (actionId: string) => {
    if (!capturedKey) return;
    const res = actionRegistry.updateShortcut(actionId, capturedKey);
    if (!res.success && res.conflictWith) {
      setConflictWarning(`Conflict detected: "${capturedKey}" is already assigned to "${res.conflictWith}". Please choose another shortcut.`);
    } else {
      setConflictWarning(null);
      setEditingActionId(null);
      setCapturedKey('');
      setKeyboardFeedback(`✓ Shortcut for "${actionId}" updated to "${capturedKey}".`);
      setTimeout(() => setKeyboardFeedback(null), 3000);
    }
  };

  const handleCopyUniversalSyncString = async () => {
    try {
      const snapshot: UniversalDatabaseSnapshot = {
        version: 2,
        timestamp: new Date().toISOString(),
        appVersion: '1.0.0',
        tables: {
          businesses: await db.businesses.toArray(),
          brands: await db.brands.toArray(),
          products: await db.products.toArray(),
          skus: await db.skus.toArray(),
          packProfiles: await db.packProfiles.toArray(),
          machineProfiles: await db.machineProfiles.toArray(),
          mediaProfiles: await db.mediaProfiles.toArray(),
          templates: await db.templates.toArray(),
          batches: await db.batches.toArray(),
          printJobs: await db.printJobs.toArray(),
          looseStock: await db.looseStock.toArray(),
          auditLogs: await db.auditLogs.toArray()
        }
      };
      const syncStr = generateUniversalSyncString(snapshot);
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(syncStr);
        setCopiedSync(true);
        setTimeout(() => setCopiedSync(false), 3000);
        setBackupFeedback('✓ Universal Sync Code copied to clipboard! Paste into any other device/browser to sync completely.');
      }
    } catch (err: any) {
      setBackupFeedback(`❌ Failed to generate sync code: ${err.message}`);
    }
  };

  const handleImportUniversalSyncString = async () => {
    if (!syncStringInput.trim()) return;
    try {
      const snapshot = parseUniversalSyncString(syncStringInput.trim());
      if (!snapshot || !snapshot.tables) {
        setBackupFeedback('❌ Invalid sync code format. Please verify the copied string.');
        return;
      }
      const success = await restoreFromUniversalSnapshot(snapshot);
      if (success) {
        setBackupFeedback('✓ Universal Database snapshot applied successfully! Reloading data...');
        setSyncStringInput('');
        onRestoreBackup();
      } else {
        setBackupFeedback('❌ Failed to restore from sync string.');
      }
    } catch (err: any) {
      setBackupFeedback(`❌ Error applying sync string: ${err.message || 'Corrupted string'}`);
    }
  };

  const handleExportBackup = async () => {
    const data = {
      format: 'ADALAJ_LABEL_STUDIO_BACKUP' as const,
      version: 2,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      tables: {
        businesses: await db.businesses.toArray(),
        brands: await db.brands.toArray(),
        products: await db.products.toArray(),
        skus: await db.skus.toArray(),
        packProfiles: await db.packProfiles.toArray(),
        machineProfiles: await db.machineProfiles.toArray(),
        mediaProfiles: await db.mediaProfiles.toArray(),
        templates: await db.templates.toArray(),
        batches: await db.batches.toArray(),
        printJobs: await db.printJobs.toArray(),
        looseStock: await db.looseStock.toArray(),
        auditLogs: await db.auditLogs.toArray()
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ADALAJ_BACKUP_V2_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupFeedback(`Backup exported successfully (${Object.keys(data.tables).length} tables: ${data.tables.products.length} products, ${data.tables.batches.length} batches, ${data.tables.printJobs.length} print jobs, ${data.tables.looseStock.length} loose stock items).`);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Canonical v2 uses { format, version, tables: { ... } }; v1 used root keys
        const tables = json.tables || json;
        const businesses = tables.businesses || (tables.business ? (Array.isArray(tables.business) ? tables.business : [tables.business]) : []);
        const brands = tables.brands || [];
        const products = tables.products || [];
        const skus = tables.skus || [];
        const packProfiles = tables.packProfiles || [];
        const machineProfiles = tables.machineProfiles || [];
        const mediaProfiles = tables.mediaProfiles || [];
        const templates = tables.templates || [];
        const batches = tables.batches || [];
        const printJobs = tables.printJobs || [];
        const looseStock = tables.looseStock || [];
        const auditLogs = tables.auditLogs || [];

        if (!products.length && !batches.length) {
          throw new Error('Backup file does not contain valid catalog or batch records.');
        }

        await db.transaction('rw', [
          db.businesses,
          db.brands,
          db.products,
          db.skus,
          db.packProfiles,
          db.machineProfiles,
          db.mediaProfiles,
          db.templates,
          db.batches,
          db.printJobs,
          db.looseStock,
          db.auditLogs
        ], async () => {
          if (businesses.length) await db.businesses.bulkPut(businesses);
          if (brands.length) await db.brands.bulkPut(brands);
          if (products.length) await db.products.bulkPut(products);
          if (skus.length) await db.skus.bulkPut(skus);
          if (packProfiles.length) await db.packProfiles.bulkPut(packProfiles);
          if (machineProfiles.length) await db.machineProfiles.bulkPut(machineProfiles);
          if (mediaProfiles.length) await db.mediaProfiles.bulkPut(mediaProfiles);
          if (templates.length) await db.templates.bulkPut(templates);
          if (batches.length) await db.batches.bulkPut(batches);
          if (printJobs.length) await db.printJobs.bulkPut(printJobs);
          if (looseStock.length) await db.looseStock.bulkPut(looseStock);
          if (auditLogs.length) await db.auditLogs.bulkPut(auditLogs);
        });

        await saveUniversalSnapshot();
        setBackupFeedback(`✓ Backup restored: ${products.length} products, ${batches.length} batches, ${printJobs.length} print jobs, ${looseStock.length} loose stock items.`);
        onRestoreBackup();
      } catch (err: any) {
        setBackupFeedback(`❌ Restore failed: ${err.message || 'Invalid backup file structure'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-amber-400" />
          Settings & Machine Profiles
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure printer heads, pack physical measurements, screen scale calibration, and keyboard keymaps.
        </p>
      </div>

      {/* Tabs Bar */}
      <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 text-xs font-semibold gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('machine')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeTab === 'machine' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Machine Profiles ({machines.length})
        </button>
        <button
          onClick={() => setActiveTab('pack')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeTab === 'pack' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Pack Profiles & Measurements ({packProfiles.length})
        </button>
        <button
          onClick={() => setActiveTab('hardware')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeTab === 'hardware' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Hardware Adapters (WebUSB/BT/IP)
        </button>
        <button
          onClick={() => setActiveTab('calibrate')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeTab === 'calibrate' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Screen Scale Calibration
        </button>
        <button
          onClick={() => setActiveTab('keyboard')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeTab === 'keyboard' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Keyboard Hotkeys ({registeredActions.length})
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
            activeTab === 'backup' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Backup & Restore JSON
        </button>
      </div>

      {/* Tab Content: Machines */}
      {activeTab === 'machine' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {machines.map(m => {
            const isActive = activeMachine.id === m.id;
            return (
              <div 
                key={m.id}
                className={`p-5 rounded-xl border shadow-md space-y-4 ${
                  isActive ? 'bg-zinc-900 border-amber-500/80 ring-1 ring-amber-500/50' : 'bg-zinc-900/60 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-zinc-800 text-amber-400 border border-zinc-700">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{m.name}</h3>
                      <p className="text-[11px] text-zinc-400">{m.manufacturer} • {m.technology}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingMachine(m)}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-zinc-700 inline-flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      Edit Specs
                    </button>
                    {isActive ? (
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-amber-500 text-black">
                        Active
                      </span>
                    ) : (
                      <button
                        onClick={() => onSelectMachine(m)}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                      >
                        Make Active
                      </button>
                    )}
                  </div>
                </div>

                {/* Geometry Specs */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-zinc-950 p-3 rounded-lg border border-zinc-800/80">
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Physical Head:</span>
                    <span className="text-zinc-200 font-bold">{m.headWidthMm} mm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Usable Print Band:</span>
                    <span className="text-amber-400 font-bold">{m.printBandMm} mm</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Resolution:</span>
                    <span className="text-zinc-200 font-bold">{m.defaultDpi} DPI</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Locked Axis Px:</span>
                    <span className="text-zinc-200 font-bold">{Math.round((m.headWidthMm * m.defaultDpi) / 25.4)} px</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Feed Origin:</span>
                    <span className="text-zinc-300">{m.feedOrigin}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block uppercase">Rotation / Mirror:</span>
                    <span className="text-zinc-300">{m.exportRotation}° / {m.mirrorX ? 'Mirror' : 'None'}</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">{m.notes}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab Content: Pack Profiles & Measurement Wizard */}
      {activeTab === 'pack' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
            <Ruler className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white block">Measurement-Driven Calibration:</span>
              <p className="text-zinc-400 mt-0.5">
                Physical pouch measurements control the placement of variable data lines. Use the Measurement Wizard to enter measured seal offsets and line pitch values.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packProfiles.map(p => (
              <div key={p.id} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400 text-sm">{p.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    p.status === 'verified' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {p.status}
                  </span>
                </div>

                <div className="text-xs text-zinc-300 space-y-1 font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Ref Edge:</span>
                    <span>{p.referenceEdge}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Seal to Print Y:</span>
                    <span>{p.printWindowStartY} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Line Pitch:</span>
                    <span>{p.valueLinePitchMm} mm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Window Length:</span>
                    <span>{p.printWindowLengthMm} mm</span>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 italic">{p.notes}</p>

                <button
                  onClick={() => handleOpenMeasurementWizard(p)}
                  className="w-full py-1.5 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                >
                  Open Measurement Wizard
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Content: Hardware Communication Adapters */}
      {activeTab === 'hardware' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* WebUSB Adapter Card */}
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Direct WebUSB</h4>
                    <span className="text-[10px] text-zinc-500 font-mono">USB Cable / FTDI Serial</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  hardwareManager.isWebUsbSupported() ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {hardwareManager.isWebUsbSupported() ? 'Supported' : 'Unsupported'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Connect directly to industrial TIJ, CIJ, or USB-to-serial print controllers without driver software.
              </p>
              <button
                onClick={async () => {
                  const res = await hardwareManager.connectWebUsb();
                  if (res.success) setHwDeviceName(res.deviceName || 'WebUSB Controller');
                }}
                className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 font-bold text-xs border border-zinc-700 shadow-xs"
              >
                Scan & Pair WebUSB
              </button>
            </div>

            {/* Bluetooth Adapter Card */}
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Bluetooth Wireless</h4>
                    <span className="text-[10px] text-zinc-500 font-mono">BLE GATT Serial</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                  hardwareManager.isBluetoothSupported() ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {hardwareManager.isBluetoothSupported() ? 'Supported' : 'Unsupported'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Wireless transmission directly to portable handheld battery inkjet marking printers.
              </p>
              <button
                onClick={async () => {
                  const res = await hardwareManager.connectBluetooth();
                  if (res.success) setHwDeviceName(res.deviceName || 'Bluetooth Printer');
                }}
                className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sky-300 font-bold text-xs border border-zinc-700 shadow-xs"
              >
                Scan & Pair Bluetooth
              </button>
            </div>

            {/* Network IP Socket Adapter Card */}
            <div className="p-5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Network Socket</h4>
                    <span className="text-[10px] text-zinc-500 font-mono">Raw TCP Port 9100</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400">
                  Ready
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex gap-2">
                  <input
                    id="settings-test-net-ip"
                    name="testNetIp"
                    aria-label="Target printer IP"
                    type="text"
                    value={testNetIp}
                    onChange={e => setTestNetIp(e.target.value)}
                    placeholder="192.168.1.100"
                    className="flex-1 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                  <input
                    id="settings-test-net-port"
                    name="testNetPort"
                    aria-label="Target printer port"
                    type="number"
                    value={testNetPort}
                    onChange={e => setTestNetPort(parseInt(e.target.value) || 9100)}
                    placeholder="9100"
                    className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 font-mono text-zinc-200"
                  />
                </div>
              </div>
              <button
                onClick={() => {
                  hardwareManager.setNetworkConfig({ ip: testNetIp, port: testNetPort });
                  alert(`Network target set to ${testNetIp}:${testNetPort}`);
                }}
                className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-emerald-300 font-bold text-xs border border-zinc-700 shadow-xs"
              >
                Save Network Target
              </button>
            </div>
          </div>

          {/* Live Hardware Activity Console */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-zinc-300">
                <Terminal className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold">Hardware Communication Stream</h4>
              </div>
              <span className="font-mono text-zinc-500 text-[11px]">Real-time adapter logs</span>
            </div>

            <div className="bg-zinc-950 rounded-lg p-3 border border-zinc-800 max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
              {hwLogs.map(log => (
                <div key={log.id} className="flex items-start gap-2">
                  <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 uppercase text-[9px] font-bold px-1 rounded ${
                    log.type === 'error' ? 'bg-rose-500/20 text-rose-400' :
                    log.type === 'tx' ? 'bg-sky-500/20 text-sky-400' :
                    log.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                    log.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-zinc-300 leading-tight">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Screen Scale Calibration */}
      {activeTab === 'calibrate' && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 space-y-5 max-w-2xl">
          <div>
            <h3 className="text-base font-bold text-white">Calibrate Screen Physical Scale</h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Hold a physical metric ruler against the display line below. Enter what the line actually measures with your physical ruler in millimetres.
            </p>
          </div>

          {/* Reference Line */}
          <div className="p-6 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col items-center gap-3">
            <span className="text-xs font-mono text-zinc-400">Target Reference: 100.0 mm</span>
            <div 
              className="h-3 bg-amber-400 rounded-xs shadow-md border border-amber-300"
              style={{ width: `${100 * 3.779}px` }} // Approx 100mm in standard 96dpi
            />
            <span className="text-[10px] text-zinc-500 font-mono">← Measure physical length between line ends →</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Your Measured Ruler Value (mm)
              </label>
              <input
                type="number"
                step="0.5"
                value={calibratedMm}
                onChange={e => setCalibratedMm(parseFloat(e.target.value) || 100)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <button
              onClick={handleSaveCalibration}
              className="mt-5 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm"
            >
              Save Calibration
            </button>
          </div>

          {calibrationSuccess && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs">
              ✓ Screen physical scale calibrated. 100% canvas zoom now represents true physical dimensions.
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Keyboard Remapping */}
      {activeTab === 'keyboard' && (
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Keyboard Shortcut Manager</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Keyboard-first industrial control. Remap any action, filter by workspace, or restore factory key bindings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  actionRegistry.resetAllShortcuts();
                  setKeyboardFeedback('✓ All keyboard shortcuts reset to factory defaults.');
                  setTimeout(() => setKeyboardFeedback(null), 3500);
                }}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
              >
                Reset All Defaults
              </button>
            </div>
          </div>

          {keyboardFeedback && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{keyboardFeedback}</span>
            </div>
          )}

          {conflictWarning && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500 text-rose-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          {/* Category Filter Pills & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All Actions' },
                { id: 'canvas', label: 'Canvas' },
                { id: 'navigation', label: 'Navigation' },
                { id: 'print', label: 'Print' },
                { id: 'workflow', label: 'Workflow' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setShortcutCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    shortcutCategory === cat.id
                      ? 'bg-amber-500 text-black font-bold shadow-xs'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex-1 sm:max-w-xs">
              <input
                id="settings-shortcut-search"
                name="shortcutFilter"
                aria-label="Search keyboard shortcuts"
                type="text"
                placeholder="Search shortcuts..."
                value={shortcutFilter}
                onChange={e => setShortcutFilter(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            {filteredActions.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">
                No matching keyboard shortcuts found.
              </div>
            ) : (
              filteredActions.map(action => (
                <div key={action.id} className="p-3 flex items-center justify-between text-xs hover:bg-zinc-800/40">
                  <div>
                    <span className="font-semibold text-zinc-200 block">{action.label}</span>
                    <span className="text-[10px] text-zinc-500 font-mono uppercase">{action.area}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingActionId === action.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          id="settings-captured-key-input"
                          name="capturedKey"
                          aria-label="Capture key combo"
                          type="text"
                          placeholder="Press key combo..."
                          value={capturedKey}
                          readOnly
                          onKeyDown={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            const parts: string[] = [];
                            if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
                            if (e.altKey) parts.push('Alt');
                            if (e.shiftKey) parts.push('Shift');
                            if (e.key && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                              parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
                            }
                            if (parts.length > 0) {
                              setCapturedKey(parts.join('+'));
                            }
                          }}
                          className="w-32 bg-zinc-950 border border-amber-500 rounded px-2 py-0.5 text-xs text-amber-300 font-mono font-bold"
                        />
                        <button
                          onClick={() => handleAssignShortcut(action.id)}
                          className="px-2 py-0.5 rounded bg-emerald-500 text-black font-bold text-xs cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingActionId(null);
                            setConflictWarning(null);
                          }}
                          className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        {action.shortcut ? (
                          <kbd className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-950 text-amber-400 border border-zinc-700">
                            {action.shortcut}
                          </kbd>
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono">None</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingActionId(action.id);
                            setCapturedKey(action.shortcut || '');
                            setConflictWarning(null);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer"
                        >
                          Change
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Table Counts Overview */}
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <span>Universal Database Overview & Status</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              {Object.entries(tableCounts).map(([tbl, cnt]) => (
                <div key={tbl} className="bg-zinc-950 border border-zinc-800/80 p-2.5 rounded-lg">
                  <span className="text-[10px] text-zinc-500 uppercase block">{tbl}</span>
                  <span className="text-sm font-bold text-amber-400">{cnt} records</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Universal Sync Code (Instant Cross-Device Transfer) */}
            <div className="rounded-xl bg-zinc-900 border border-amber-500/50 p-6 space-y-4 shadow-md">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Copy className="w-4 h-4 text-amber-400" />
                  <span>Universal Sync Code (Instant Device Transfer)</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Transfer your entire workspace state (all designs, MRPs, batches, machines, and settings) to any device or browser by copying a portable base64 string.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleCopyUniversalSyncString}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-sm transition-all cursor-pointer"
                >
                  {copiedSync ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSync ? 'Copied to Clipboard!' : 'Copy Universal Sync Code'}</span>
                </button>
              </div>

              <div className="pt-3 border-t border-zinc-800 space-y-2">
                <label className="text-[11px] font-semibold text-zinc-300 block">
                  Paste Sync Code to Restore:
                </label>
                <textarea
                  value={syncStringInput}
                  onChange={e => setSyncStringInput(e.target.value)}
                  placeholder="Paste base64 sync code string here..."
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 font-mono text-[11px] text-zinc-200 focus:outline-hidden focus:border-amber-500"
                />
                <button
                  onClick={handleImportUniversalSyncString}
                  disabled={!syncStringInput.trim()}
                  className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-amber-300 font-bold text-xs border border-zinc-700 transition-colors cursor-pointer"
                >
                  Apply Universal Sync Code
                </button>
              </div>
            </div>

            {/* Right: Traditional JSON File Export & Import */}
            <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Complete JSON Backup & Restore</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Export complete database to an immutable JSON backup file for cold archive, compliance, or offline storage.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={handleExportBackup}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs border border-zinc-700 shadow-sm transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Export Complete JSON Backup</span>
                </button>

                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-200 font-semibold text-xs border border-zinc-700 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Restore from JSON File</span>
                  <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                </label>
              </div>

              {backupFeedback && (
                <div className={`p-3 rounded-lg text-xs mt-3 ${
                  backupFeedback.startsWith('✓') || backupFeedback.includes('successfully')
                    ? 'bg-emerald-950/40 border border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/40 border border-rose-500/50 text-rose-300'
                }`}>
                  {backupFeedback}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Measurement Wizard */}
      {selectedPackForWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white">
                Pack Measurement Wizard — {selectedPackForWizard.name}
              </h3>
              <p className="text-xs text-zinc-400">
                Enter actual physical dimensions measured with a ruler or calliper.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Seal to Top of MRP (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wizardDistSealToMrp}
                  onChange={e => setWizardDistSealToMrp(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Line Pitch (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wizardLinePitch}
                  onChange={e => setWizardLinePitch(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Target Text Height (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wizardTextHeight}
                  onChange={e => setWizardTextHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Value Block Height (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={wizardBlockHeight}
                  onChange={e => setWizardBlockHeight(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setSelectedPackForWizard(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWizard}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Save Measurements
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Machine Profile (SET-01) */}
      {editingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-zinc-900 border-2 border-zinc-700 p-6 shadow-2xl space-y-4">
            <div className="border-b border-zinc-800 pb-2">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-amber-400" />
                Edit Machine Profile — {editingMachine.name}
              </h3>
              <p className="text-xs text-zinc-400">
                Adjust nozzle band width, DPI, export rotation, and edge buffer constraints.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Machine Name</label>
                <input
                  type="text"
                  value={editingMachine.name}
                  onChange={e => setEditingMachine({ ...editingMachine, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={editingMachine.manufacturer}
                  onChange={e => setEditingMachine({ ...editingMachine, manufacturer: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Usable Print Band (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMachine.printBandMm}
                  onChange={e => setEditingMachine({ ...editingMachine, printBandMm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-amber-300 font-bold"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Physical Head Width (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMachine.headWidthMm}
                  onChange={e => setEditingMachine({ ...editingMachine, headWidthMm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Resolution (DPI)</label>
                <input
                  type="number"
                  value={editingMachine.defaultDpi}
                  onChange={e => setEditingMachine({ ...editingMachine, defaultDpi: parseInt(e.target.value) || 300 })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Edge Buffer (mm)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editingMachine.edgeBufferMm}
                  onChange={e => setEditingMachine({ ...editingMachine, edgeBufferMm: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                />
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Feed Origin</label>
                <select
                  value={editingMachine.feedOrigin}
                  onChange={e => setEditingMachine({ ...editingMachine, feedOrigin: e.target.value as any })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                >
                  <option value="Top -> Bottom">Top &rarr; Bottom</option>
                  <option value="Bottom -> Top">Bottom &rarr; Top</option>
                  <option value="Left -> Right">Left &rarr; Right</option>
                  <option value="Right -> Left">Right &rarr; Left</option>
                </select>
              </div>

              <div>
                <label className="text-zinc-300 font-semibold block mb-1">Export Rotation (°)</label>
                <select
                  value={editingMachine.exportRotation}
                  onChange={e => setEditingMachine({ ...editingMachine, exportRotation: parseInt(e.target.value) as any })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 font-mono text-zinc-200"
                >
                  <option value="0">0°</option>
                  <option value="90">90°</option>
                  <option value="180">180°</option>
                  <option value="270">270°</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-zinc-300 font-semibold block mb-1">Operator / Hardware Notes</label>
                <textarea
                  rows={2}
                  value={editingMachine.notes || ''}
                  onChange={e => setEditingMachine({ ...editingMachine, notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-200 font-sans text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setEditingMachine(null)}
                className="px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onUpdateMachine(editingMachine);
                  setEditingMachine(null);
                }}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
              >
                Save Machine Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
