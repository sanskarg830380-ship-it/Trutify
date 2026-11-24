import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Database, Server, RefreshCw, History, CheckCircle2, AlertCircle } from 'lucide-react';
import { getHealth } from '../services/api';

export default function Navbar({ activeTab, setActiveTab }) {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoadingHealth(true);
      const res = await getHealth();
      setHealth(res.data);
    } catch {
      setHealth({ status: 'offline' });
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'healthy';
  const pyHealthy = health?.dependencies?.pythonVerificationService?.status === 'healthy';
  const dbConnected = health?.dependencies?.database?.status === 'connected';

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('verify')}>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold tracking-tight text-white">Trutify</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v1.0 AI
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Multimodal News Verification & Misinformation Correction
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700/60">
          <button
            onClick={() => setActiveTab('verify')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'verify'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Verify</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'history'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
          </button>
        </div>

        {/* Microservices Health Status Pill */}
        <div className="hidden md:flex items-center space-x-3 bg-slate-950/60 border border-slate-800 px-3.5 py-1.5 rounded-xl text-xs">
          {/* Node Gateway */}
          <div className="flex items-center space-x-1.5" title="Node.js Gateway :5000">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-mono">Node</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* Python Service */}
          <div className="flex items-center space-x-1.5" title="Python FastAPI Reasoning Engine :8000">
            <Activity className="w-3.5 h-3.5 text-slate-400" />
            <span className={`w-2 h-2 rounded-full ${pyHealthy ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            <span className="text-slate-300 font-mono">PyEngine</span>
          </div>

          <span className="text-slate-700">|</span>

          {/* MongoDB */}
          <div className="flex items-center space-x-1.5" title="MongoDB Atlas Persistence">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className={`w-2 h-2 rounded-full ${dbConnected ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            <span className="text-slate-300 font-mono">Atlas</span>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loadingHealth}
            title="Refresh Service Status"
            className="text-slate-400 hover:text-sky-400 transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
