/**
 * AI Copilot Drawer
 * Operator assistant with voice support (en-IN, hi-IN, gu-IN), strict proposal diffs, and confirmation modals
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Mic, 
  MicOff, 
  Send, 
  Check, 
  AlertTriangle, 
  CornerDownLeft, 
  CheckCircle2, 
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { aiCopilot, type ProposedChangeItem, type CopilotResponse } from '../../services/aiCopilot';
import type { Batch, Template, SKU, DesignScope } from '../../types';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentBatch: Batch | null;
  currentTemplate: Template | null;
  allSkus: SKU[];
  scope: DesignScope;
  onApplyChanges: (changes: ProposedChangeItem[]) => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  currentBatch,
  currentTemplate,
  allSkus,
  scope,
  onApplyChanges
}) => {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [selectedChanges, setSelectedChanges] = useState<Record<string, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const [voiceLang, setVoiceLang] = useState<'en-IN' | 'hi-IN' | 'gu-IN'>('en-IN');
  const [speechSupported, setSpeechSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setSpeechSupported(true);
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    try {
      const res = await aiCopilot.processPrompt(prompt, {
        currentBatch,
        currentTemplate,
        allSkus,
        scope
      });
      setResponse(res);
      // Select all proposed changes by default
      const initialMap: Record<string, boolean> = {};
      res.proposedChanges.forEach(c => {
        initialMap[c.id] = true;
      });
      setSelectedChanges(initialMap);
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleVoice = () => {
    if (!speechSupported) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(transcript);
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleApproveAll = () => {
    if (!response) return;
    const approved = response.proposedChanges.map(c => ({ ...c, approved: true }));
    onApplyChanges(approved);
    setResponse(null);
    setPrompt('');
  };

  const handleApproveSelected = () => {
    if (!response) return;
    const approved = response.proposedChanges
      .filter(c => selectedChanges[c.id])
      .map(c => ({ ...c, approved: true }));
    onApplyChanges(approved);
    setResponse(null);
    setPrompt('');
  };

  const handleReject = () => {
    setResponse(null);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-zinc-950 border-l-2 border-zinc-800 shadow-2xl flex flex-col">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100">AI Copilot & Voice Assistant</h2>
            <p className="text-[10px] text-zinc-400 font-mono">Strict proposal mode • Never writes directly</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-5 py-2.5 bg-zinc-900/50 border-b border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
        <span className="text-zinc-500 font-semibold whitespace-nowrap">Try:</span>
        <button
          onClick={() => setPrompt('Create 50 kg turmeric batch with 15kg to 100g and 15kg to 500g')}
          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700"
        >
          50kg Turmeric Batch
        </button>
        <button
          onClick={() => setPrompt('Switch to Horizontal + Strip layout')}
          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700"
        >
          Horizontal + Strip
        </button>
        <button
          onClick={() => setPrompt('Fit all lines into print band')}
          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700"
        >
          Fit all lines
        </button>
        <button
          onClick={() => setPrompt('Make MRP bigger')}
          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 whitespace-nowrap border border-zinc-700"
        >
          Make MRP bigger
        </button>
      </div>

      {/* Conversation & Proposal Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {response ? (
          <div className="space-y-4">
            {/* AI Explanation Message */}
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed">
              {response.message}
            </div>

            {/* Clarification Needed Alert (e.g. Missing 500g MRP) */}
            {response.clarificationNeeded && (
              <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold block">Operator Input Required:</span>
                  <p>{response.clarificationNeeded}</p>
                </div>
              </div>
            )}

            {/* Proposed Changes Diff Table */}
            {response.proposedChanges.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-bold uppercase tracking-wider text-[10px]">Proposed Changes (Preview)</span>
                  <span className="text-amber-400 font-mono text-[10px]">Apply Scope: {scope}</span>
                </div>

                <div className="space-y-2">
                  {response.proposedChanges.map(c => (
                    <div 
                      key={c.id} 
                      className={`p-3 rounded-lg border text-xs transition-colors ${
                        selectedChanges[c.id] ? 'bg-zinc-900/90 border-amber-500/60' : 'bg-zinc-900/40 border-zinc-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-zinc-200">{c.field}</span>
                        <input
                          type="checkbox"
                          checked={!!selectedChanges[c.id]}
                          onChange={e => setSelectedChanges({ ...selectedChanges, [c.id]: e.target.checked })}
                          className="rounded border-zinc-700 text-amber-500 focus:ring-amber-400"
                        />
                      </div>
                      
                      {/* Diff View */}
                      <div className="grid grid-cols-2 gap-2 p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] mb-1.5">
                        <div className="text-rose-400 truncate">
                          <span className="text-zinc-600 block text-[9px] uppercase">Before:</span>
                          {c.beforeValue}
                        </div>
                        <div className="text-emerald-400 truncate">
                          <span className="text-zinc-600 block text-[9px] uppercase">After:</span>
                          {c.afterValue}
                        </div>
                      </div>

                      <p className="text-[11px] text-zinc-400">{c.explanation}</p>
                    </div>
                  ))}
                </div>

                {/* Actions Footer */}
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={handleApproveAll}
                    className="flex-1 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve All
                  </button>
                  <button
                    onClick={handleApproveSelected}
                    className="px-3 py-2 text-xs font-bold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={handleReject}
                    className="px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-300">How can I assist you?</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
                Issue instructions in plain English, Hindi, or Gujarati. I will construct verified proposals without altering data unconfirmed.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input Form with Voice Button */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 bg-zinc-900/90">
        <div className="flex items-center justify-between mb-2">
          {speechSupported && (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span>Voice Lang:</span>
              <select
                value={voiceLang}
                onChange={e => setVoiceLang(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 text-xs rounded px-1.5 py-0.5 text-zinc-200"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi (हिन्दी)</option>
                <option value="gu-IN">Gujarati (ગુજરાતી)</option>
              </select>
            </div>
          )}
          <span className="text-[10px] text-zinc-500 font-mono">Alt+Enter to send</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={isListening ? 'Listening...' : 'Type or speak a design or batch instruction...'}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isProcessing}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-amber-500"
          />

          {speechSupported && (
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2 rounded-lg border transition-colors ${
                isListening 
                  ? 'bg-rose-500 text-white border-rose-400 animate-pulse' 
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Speak instruction (Alt+M)"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}

          <button
            type="submit"
            disabled={!prompt.trim() || isProcessing}
            className="p-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-40 transition-colors"
          >
            {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );
};
