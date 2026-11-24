import React, { useState } from 'react';
import Navbar from './components/Navbar';
import MultimodalInput from './components/MultimodalInput';
import LoadingState from './components/LoadingState';
import VerificationResult from './components/VerificationResult';
import HistoryView from './components/HistoryView';
import { verifyClaim, verifyText, verifyFile, verifyUrl } from './services/api';
import { AlertOctagon, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('verify'); // 'verify' | 'history'
  const [isLoading, setIsLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [error, setError] = useState(null);

  const handleVerify = async ({ mode, data }) => {
    setIsLoading(true);
    setError(null);
    setVerificationResult(null);

    try {
      let result;
      if (mode === 'claim') {
        result = await verifyClaim(data.claim, data.context);
      } else if (mode === 'text') {
        result = await verifyText(data.text, data.auto_verify, data.context);
      } else if (mode === 'file') {
        result = await verifyFile(data.file, data.auto_verify, data.context);
      } else if (mode === 'url') {
        result = await verifyUrl(data.url, data.auto_verify, data.context);
      }
      setVerificationResult(result);
    } catch (err) {
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectHistoryRecord = (record) => {
    setVerificationResult(record);
    setActiveTab('verify');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Error Toast */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-3">
              <AlertOctagon className="w-5 h-5 shrink-0 text-rose-400" />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 text-rose-400 hover:text-white rounded-lg hover:bg-rose-500/20"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Verify View */}
        {activeTab === 'verify' && (
          <div className="space-y-8">
            {!verificationResult && !isLoading && (
              <MultimodalInput onVerify={handleVerify} isLoading={isLoading} />
            )}

            {isLoading && <LoadingState />}

            {verificationResult && !isLoading && (
              <VerificationResult
                result={verificationResult}
                onReset={() => setVerificationResult(null)}
              />
            )}
          </div>
        )}

        {/* Tab 2: History View */}
        {activeTab === 'history' && (
          <HistoryView onSelectRecord={handleSelectHistoryRecord} />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <p>
          Trutify • AI-Powered Multimodal News Verification & Misinformation Correction System
        </p>
        <p className="mt-1">
          Designed with Node.js Express, Python FastAPI, MongoDB Atlas, Google Gemini, Tavily & NewsAPI
        </p>
      </footer>
    </div>
  );
}
