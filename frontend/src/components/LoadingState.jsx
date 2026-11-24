import React, { useEffect, useState } from 'react';
import { Search, Brain, FileCheck, Shield, CheckCircle2, Loader2 } from 'lucide-react';

const STAGES = [
  {
    title: 'Ingesting & Preprocessing',
    desc: 'Validating format, performing OCR / SSRF check, and normalizing content.',
    icon: FileCheck
  },
  {
    title: 'AI Claim Extraction',
    desc: 'Google Gemini is identifying factual assertions, dates, and named entities.',
    icon: Brain
  },
  {
    title: 'Multi-Source Evidence Triangulation',
    desc: 'Querying Tavily, NewsAPI, and Google Fact Check Tools concurrently.',
    icon: Search
  },
  {
    title: 'Verdict Synthesis & Grounded Correction',
    desc: 'Analyzing source reliability tiers and formulating evidence-backed news corrections.',
    icon: Shield
  }
];

export default function LoadingState() {
  const [currentStage, setCurrentStage] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setCurrentStage(1), 1500);
    const timer2 = setTimeout(() => setCurrentStage(2), 3500);
    const timer3 = setTimeout(() => setCurrentStage(3), 6500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-8 shadow-xl max-w-2xl mx-auto backdrop-blur-sm text-center">
      <div className="inline-flex p-4 rounded-2xl bg-sky-500/10 text-sky-400 mb-6 glow-effect">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Analyzing & Cross-Referencing Evidence</h3>
      <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto">
        Please hold on while Trutify executes multi-engine deep search and grounds claims against authoritative databases.
      </p>

      {/* Progress Steps */}
      <div className="space-y-4 text-left">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isDone = idx < currentStage;
          const isActive = idx === currentStage;

          return (
            <div
              key={idx}
              className={`flex items-start space-x-4 p-3.5 rounded-xl border transition-all ${
                isActive
                  ? 'bg-slate-900/90 border-sky-500/50 shadow-md shadow-sky-500/10'
                  : isDone
                  ? 'bg-slate-900/40 border-slate-800 opacity-80'
                  : 'border-transparent opacity-40'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-sky-500 text-white animate-pulse'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-semibold ${isActive ? 'text-sky-300' : isDone ? 'text-slate-300' : 'text-slate-500'}`}>
                    {stage.title}
                  </h4>
                  {isActive && (
                    <span className="text-[10px] font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                      Processing...
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{stage.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
