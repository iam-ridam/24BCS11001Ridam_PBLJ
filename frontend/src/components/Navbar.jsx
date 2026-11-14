import React from 'react';
import { Flame, ShieldCheck, Cpu, Wifi } from 'lucide-react';
import { getCryptoProviderName, isCryptoSubtleSupported } from '../lib/crypto';

export default function Navbar({ activeTab, setActiveTab }) {
  const isSubtle = isCryptoSubtleSupported();
  const provider = getCryptoProviderName();

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('create')}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 via-amber-500 to-emerald-500 p-[1px] shadow-lg shadow-rose-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">
                Zero<span className="text-emerald-400">Burn</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                v1.0 Production
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Zero-Knowledge • Anti-Bot • Real-Time Intrusion Detection
            </p>
          </div>
        </div>

        {/* Center Nav */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Secret
          </button>
          <button
            onClick={() => setActiveTab('console')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'console'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            Live Security Console
          </button>
        </div>

        {/* Crypto Provider Pill */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              isSubtle
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
            }`}
            title={provider}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px] font-medium">
              {isSubtle ? 'WebCrypto AES-256-GCM' : '@noble/ciphers Pure-JS'}
            </span>
          </div>
          <div
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-slate-400 text-[11px] font-mono"
            title="Local LAN & Mobile Hotspot Ready"
          >
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>LAN Ready</span>
          </div>
        </div>
      </div>
    </header>
  );
}
