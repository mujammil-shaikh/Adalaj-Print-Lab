/**
 * History & Audit Log Workspace View
 * Searchable production archive, reproducible historical reprints, and transaction audit trails
 */

import React, { useState, useEffect } from 'react';
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
  Layers,
  Filter
} from 'lucide-react';
import type { Batch, AuditLogEntry, Product, PrintJob } from '../../types';
import { db } from '../../services/db';

interface HistoryViewProps {
  batches: Batch[];
  auditLogs: AuditLogEntry[];
  products: Product[];
  printJobs?: PrintJob[];
  onReprintBatch: (b: Batch) => void;
  onReprintJob?: (job: PrintJob) => void;
  onDuplicateBatch: (b: Batch) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  batches,
  auditLogs,
  products,
  printJobs: propPrintJobs,
  onReprintBatch,
  onReprintJob,
  onDuplicateBatch
}) => {
  const [tab, setTab] = useState<'jobs' | 'batches' | 'audit'>('jobs');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Open'>('All');
  const [search, setSearch] = useState('');
  const [loadedJobs, setLoadedJobs] = useState<PrintJob[]>([]);

  useEffect(() => {
    let active = true;
    db.printJobs.reverse().toArray().then(items => {
      if (active) setLoadedJobs(items);
    }).catch(console.error);
    return () => { active = false; };
  }, [tab]);

  const allJobs = propPrintJobs || loadedJobs;

  const filteredJobs = allJobs.filter(j => {
    return !search ||
      j.jobCode.toLowerCase().includes(search.toLowerCase()) ||
      j.batchId.toLowerCase().includes(search.toLowerCase()) ||
      j.productName.toLowerCase().includes(search.toLowerCase()) ||
      j.skuSize.toLowerCase().includes(search.toLowerCase());
  });

  const filteredBatches = batches.filter(b => {
    if (statusFilter !== 'All' && b.status !== statusFilter) return false;
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
            onClick={() => setTab('jobs')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'jobs' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Print Jobs Archive ({allJobs.length})
          </button>
          <button
            onClick={() => setTab('batches')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'batches' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Batches ({batches.length})
          </button>
          <button
            onClick={() => setTab('audit')}
            className={`px-3 py-1 rounded transition-colors ${
              tab === 'audit' ? 'bg-amber-500 text-black shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 max-w-md w-full">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            id="history-search-input"
            name="historySearch"
            aria-label="Search print jobs and audit logs"
            type="text"
            placeholder={tab === 'jobs' ? 'Search jobs by code, batch, product...' : 'Search by batch ID, product name, or action (/)...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-transparent text-xs text-zinc-200 placeholder-zinc-500 focus:outline-hidden"
          />
        </div>

        {tab === 'batches' && (
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400">Status:</span>
            <div className="flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
              {(['All', 'Completed', 'Open'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold ${
                    statusFilter === st ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      {tab === 'jobs' ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950 text-zinc-400 uppercase font-mono text-[10px] border-b border-zinc-800">
                <tr>
                  <th className="p-3">Job Code</th>
                  <th className="p-3">Batch & SKU</th>
                  <th className="p-3">Product</th>
                  <th className="p-3">Target / Output</th>
                  <th className="p-3">Machine</th>
                  <th className="p-3">Proof Status</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500 font-mono">
                      No print jobs recorded yet. Dispatched jobs will appear here with immutable snapshots.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(j => (
                    <tr key={j.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3">
                        <span className="font-mono font-bold text-amber-400 text-xs block">{j.jobCode}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{j.id}</span>
                      </td>
                      <td className="p-3 font-mono">
                        <span className="text-white font-bold">{j.batchId}</span>
                        <span className="text-zinc-400 block text-[11px]">{j.skuSize}</span>
                      </td>
                      <td className="p-3 text-zinc-200 font-medium">{j.productName}</td>
                      <td className="p-3 font-mono">
                        <span className="text-emerald-400 font-bold">{j.completedQuantity}</span>
                        <span className="text-zinc-500"> / {j.quantityPacks} packs</span>
                      </td>
                      <td className="p-3 text-zinc-300 font-mono text-[11px]">{j.machineName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          j.proofStatus === 'Production Ready'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {j.proofStatus}
                        </span>
                      </td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">
                        {new Date(j.createdAt).toLocaleDateString()} {new Date(j.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            if (onReprintJob) {
                              onReprintJob(j);
                            } else {
                              const b = batches.find(bat => bat.id === j.batchId);
                              if (b) onReprintBatch(b);
                            }
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-black shadow-xs inline-flex items-center gap-1"
                          title="Reprint exactly from byte-identical snapshot"
                        >
                          <Printer className="w-3 h-3" />
                          Reprint Exact
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'batches' ? (
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
                  <th className="p-3">Status</th>
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
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                          b.status === 'Completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-zinc-400">{b.lotDate}</td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={() => onReprintBatch(b)}
                          className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-500 hover:bg-amber-400 text-black shadow-xs inline-flex items-center gap-1"
                          title="Reprint batch allocations"
                        >
                          <Printer className="w-3 h-3" />
                          Reprint
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
