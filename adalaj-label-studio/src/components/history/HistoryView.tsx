/**
 * History & Audit Log Workspace View
 * Searchable production archive, reproducible historical reprints, and transaction audit trails
 */

import React, { useState } from 'react';
import { 
  History as HistoryIcon, 
  Search, 
  Printer, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Clock, 
  ShieldCheck,
  Calendar,
  Layers
} from 'lucide-react';
import type { Batch, AuditLogEntry, Product } from '../../types';

interface HistoryViewProps {
  batches: Batch[];
  auditLogs: AuditLogEntry[];
  products: Product[];
  onReprintBatch: (b: Batch) => void;
  onDuplicateBatch: (b: Batch) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  batches,
  auditLogs,
  products,
  onReprintBatch,
  onDuplicateBatch
}) => {
  const [tab, setTab] = useState<'batches' | 'audit'>('batches');
  const [search, setSearch] = useState('');

  const completedBatches = batches.filter(b => b.status === 'Completed' || b.id === 'ADTP013');

  const filteredBatches = completedBatches.filter(b => {
    const prod = products.find(p => p.id === b.productId);
    return !search || 
      b.id.toLowerCase().includes(search.toLowerCase()) ||
      prod?.name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredAudit = auditLogs.filter(a => 
    !search || 
    a.action.toLowerCase().includes(search.toLowerCase()) ||
    a.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-amber-400" />
            Production History & Immutable Audit Log
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            100% reproducible historical reprint snapshots and transaction audit trail.
          </p>
        </div>

        {/* View Tabs */}
        <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-1 text-xs font-semibold">
          <button
            onClick={() => setTab('batches')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'batches' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Printed Batches ({completedBatches.length})
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'audit' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            System Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 max-w-md">
        <Search className="w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by batch ID, product name, or action (/)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden"
        />
      </div>

      {/* Main Content */}
      {tab === 'batches' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3">Batch ID</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Raw kg</th>
                  <th className="p-3">Allocations</th>
                  <th className="p-3">Packs Printed</th>
                  <th className="p-3">Production Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredBatches.map(b => {
                  const prod = products.find(p => p.id === b.productId);
                  const totalPrinted = b.allocations.reduce((sum, a) => sum + (typeof a.packsPrinted === 'number' ? a.packsPrinted : 0), 0);

                  return (
                    <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-amber-400 text-sm">{b.id}</span>
                        {b.id === 'ADTP013' && (
                          <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                            Seed Record
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-zinc-200">{prod?.name}</td>
                      <td className="p-3 font-mono text-zinc-300">{b.rawMaterialKg} kg</td>
                      <td className="p-3 text-zinc-400">
                        {b.allocations.map(a => `${a.packSize} (${a.expectedPacks})`).join(', ')}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-400">
                        {totalPrinted} packs
                      </td>
                      <td className="p-3 font-mono text-zinc-400">{b.lotDate}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => onReprintBatch(b)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-black shadow-xs inline-flex items-center gap-1"
                          title="Reprint exactly with original immutable snapshot"
                        >
                          <Printer className="w-3 h-3" />
                          Reprint Exact
                        </button>
                        <button
                          onClick={() => onDuplicateBatch(b)}
                          className="px-2 py-1 text-xs font-semibold rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 inline-flex items-center gap-1"
                          title="Duplicate as new batch"
                        >
                          <Copy className="w-3 h-3" />
                          Duplicate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Details</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredAudit.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-800/40 transition-colors font-mono">
                    <td className="p-3 text-zinc-400 text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3 font-bold text-amber-400">{log.action}</td>
                    <td className="p-3 text-zinc-300">{log.user}</td>
                    <td className="p-3 text-zinc-300 font-sans">{log.details}</td>
                    <td className="p-3 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400">
                        Recorded
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
