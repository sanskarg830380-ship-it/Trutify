import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Info,
  ExternalLink,
  ShieldAlert,
  Newspaper,
  BookOpen,
  Calendar,
  User,
  Share2,
  ChevronDown,
  ChevronUp,
  RotateCcw
} from 'lucide-react';

const VERDICT_CONFIG = {
  VERIFIED: {
    color: 'emerald',
    badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    barColor: 'bg-emerald-500',
    icon: CheckCircle,
    label: 'VERIFIED',
    subtitle: 'Corroborated by high-authority sources and official records.'
  },
  FALSE: {
    color: 'rose',
    badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    barColor: 'bg-rose-500',
    icon: XCircle,
    label: 'FALSE',
    subtitle: 'Directly contradicted or debunked by verified evidence.'
  },
  MISLEADING: {
    color: 'amber',
    badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    barColor: 'bg-amber-500',
    icon: AlertTriangle,
    label: 'MISLEADING',
    subtitle: 'Contains real figures or events stripped of critical context or timing.'
  },
  'PARTIALLY TRUE': {
    color: 'yellow',
    badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    barColor: 'bg-yellow-500',
    icon: Info,
    label: 'PARTIALLY TRUE',
    subtitle: 'Accurate in core elements, but secondary details or figures are flawed.'
  },
  UNVERIFIED: {
    color: 'slate',
    badge: 'bg-slate-700 text-slate-300 border-slate-600',
    barColor: 'bg-slate-500',
    icon: HelpCircle,
    label: 'UNVERIFIED',
    subtitle: 'Insufficient authoritative evidence to confirm or refute at this time.'
  }
};

export default function VerificationResult({ result, onReset }) {
  const [activeEvidenceTab, setActiveEvidenceTab] = useState('all'); // 'all' | 'supporting' | 'contradicting' | 'contextual'
  const [showRawClaims, setShowRawClaims] = useState(false);

  // If input was classified as non-verifiable (opinions, chit-chat, non-factual)
  if (result.is_verifiable === false) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-800/90 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
          <Info className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Non-Verifiable Input
          </span>
          <h3 className="text-xl font-bold text-white mt-3">No Verifiable Factual Claims Detected</h3>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            {result.reason || result.message || 'The submitted text appears to be a subjective opinion, personal greeting, or non-factual expression rather than a verifiable news statement.'}
          </p>
        </div>
        <div className="pt-4 border-t border-slate-700">
          <button
            onClick={onReset}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            Try Another Input
          </button>
        </div>
      </div>
    );
  }

  // Extract verification & extraction payloads (supporting both { data: ... } and { verification: ... })
  const verification = result.verification || result.data || result;
  const extraction = result.extraction || result.data?.extraction || {};
  const verdict = verification.verdict || 'UNVERIFIED';
  const confidence = Math.min(100, Math.max(0, verification.confidence ?? 0));

  const config = VERDICT_CONFIG[verdict] || VERDICT_CONFIG.UNVERIFIED;
  const VerdictIcon = config.icon;

  const supporting = verification.supporting_evidence || [];
  const contradicting = verification.contradicting_evidence || [];
  const contextual = verification.contextual_evidence || [];
  const allEvidence = [...contradicting, ...supporting, ...contextual];

  const filteredEvidence =
    activeEvidenceTab === 'supporting'
      ? supporting
      : activeEvidenceTab === 'contradicting'
      ? contradicting
      : activeEvidenceTab === 'contextual'
      ? contextual
      : allEvidence;

  const hasCorrection = Boolean(verification.corrected_news || verification.corrected_headline);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onReset}
          className="flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 px-3.5 py-2 rounded-xl border border-slate-700 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Verify Another Item</span>
        </button>

        <span className="text-xs text-slate-500 font-mono">
          Trutify Engine v1.0 • Grounded Verification
        </span>
      </div>

      {/* 1. Main Verdict Banner */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-700/70">
          <div className="flex items-start space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${config.badge}`}>
              <VerdictIcon className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className={`text-xl sm:text-2xl font-black tracking-wide px-3.5 py-1 rounded-xl border ${config.badge}`}>
                  {config.label}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Official Verdict
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-2 font-medium">{config.subtitle}</p>
            </div>
          </div>

          {/* Confidence Score Gauge */}
          <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 sm:min-w-[200px] text-center shrink-0">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Confidence Rating
            </span>
            <div className="text-3xl font-black text-white font-mono">{confidence}%</div>
            <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${config.barColor}`}
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>
        </div>

        {/* Primary Claim Extracted */}
        <div className="mt-6">
          <span className="text-xs font-bold uppercase tracking-wider text-sky-400 block mb-1">
            Primary Factual Claim Verified
          </span>
          <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">
            "{verification.original_claim || extraction.primary_claim || result.original_input}"
          </p>

          {/* Entities & Dates Metadata Tags */}
          {(extraction.entities?.length > 0 || extraction.dates?.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-700/40">
              {extraction.entities?.map((ent, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 text-xs bg-slate-900/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
                >
                  <User className="w-3 h-3 text-sky-400" />
                  <span>{ent}</span>
                </span>
              ))}
              {extraction.dates?.map((dt, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 text-xs bg-slate-900/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700"
                >
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>{dt}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Journalistic Grounded News Correction (Highlighted Box) */}
      {hasCorrection && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border-2 border-indigo-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center space-x-2.5 mb-4">
            <span className="bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-md shadow-sm">
              FACT-CHECK NEWS CORRECTION
            </span>
            <span className="text-xs text-indigo-300 font-medium">
              Objective, Evidence-Grounded Journalism
            </span>
          </div>

          {verification.corrected_headline && (
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-4">
              {verification.corrected_headline}
            </h3>
          )}

          {verification.corrected_news && (
            <div className="prose prose-invert max-w-none text-slate-200 text-sm sm:text-base leading-relaxed bg-slate-950/40 p-5 rounded-xl border border-indigo-500/20 whitespace-pre-line font-sans">
              {verification.corrected_news}
            </div>
          )}

          {verification.correction_explanation && (
            <div className="mt-4 pt-4 border-t border-indigo-500/20">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 block mb-2">
                Specific Misconceptions Corrected:
              </span>
              <div className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed pl-2 border-l-2 border-indigo-500">
                {verification.correction_explanation}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Deep Reasoning & Verdict Synthesis */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2 mb-3">
          <BookOpen className="w-4 h-4 text-sky-400" />
          <span>Synthesis & Reasoning</span>
        </h4>

        {verification.summary && (
          <p className="text-sm sm:text-base font-medium text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-slate-700/60 mb-4">
            {verification.summary}
          </p>
        )}

        {verification.explanation && (
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed whitespace-pre-line">
            {verification.explanation}
          </p>
        )}
      </div>

      {/* 4. Categorized Evidence Sources */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h4 className="text-sm font-bold uppercase tracking-wider text-white flex items-center space-x-2">
            <Newspaper className="w-4 h-4 text-sky-400" />
            <span>Retrieved Cross-Reference Evidence ({allEvidence.length})</span>
          </h4>

          {/* Evidence Filter Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-700/60 text-xs">
            <button
              onClick={() => setActiveEvidenceTab('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeEvidenceTab === 'all' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({allEvidence.length})
            </button>
            <button
              onClick={() => setActiveEvidenceTab('contradicting')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeEvidenceTab === 'contradicting' ? 'bg-rose-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Refuting ({contradicting.length})
            </button>
            <button
              onClick={() => setActiveEvidenceTab('supporting')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                activeEvidenceTab === 'supporting' ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Corroborating ({supporting.length})
            </button>
          </div>
        </div>

        {/* Evidence List */}
        {filteredEvidence.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">
            No sources found in this category.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvidence.map((item, idx) => {
              const rel = item.evidence_relationship || 'NEUTRAL';
              const isRefuting = rel === 'CONTRADICTS';
              const isSupporting = rel === 'SUPPORTS';

              return (
                <div
                  key={idx}
                  className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 sm:p-5 hover:border-slate-600 transition-all"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                          isRefuting
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : isSupporting
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {rel}
                      </span>
                      <span className="text-xs font-mono font-semibold text-sky-400">
                        {item.source_name || new URL(item.url || 'https://unknown.com').hostname}
                      </span>
                    </div>

                    {item.relevance_score && (
                      <span className="text-[11px] font-mono text-slate-400">
                        Relevance: {(item.relevance_score * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm sm:text-base font-bold text-white hover:text-sky-400 flex items-center space-x-1.5 transition-colors group mb-2"
                  >
                    <span>{item.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0" />
                  </a>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-3 rounded-lg border border-slate-800">
                    "{item.content}"
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Limitations & Source Attribution */}
      {verification.limitations?.length > 0 && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
          <span className="font-semibold text-slate-300 block mb-1">Retrieval Notes & Transparency:</span>
          <ul className="list-disc list-inside space-y-1">
            {verification.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
