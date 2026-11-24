import React, { useState, useRef } from 'react';
import {
  FileText,
  AlignLeft,
  UploadCloud,
  Link2,
  Sparkles,
  ArrowRight,
  X,
  FileCheck2,
  ShieldAlert,
  HelpCircle,
  CheckCircle2
} from 'lucide-react';

const PRESET_EXAMPLES = [
  {
    type: 'claim',
    label: 'Viral Gravity Hoax',
    content: 'Earth will temporarily lose gravity for seven seconds tomorrow according to NASA.'
  },
  {
    type: 'claim',
    label: 'Fusion Energy Gain',
    content: 'Scientists at the National Ignition Facility achieved net energy gain in a nuclear fusion reaction.'
  },
  {
    type: 'text',
    label: 'WhatsApp Forward Rumor',
    content: 'URGENT FORWARD: All public schools and universities will be shut down nationwide starting tomorrow for 30 days due to emergency government orders. Share with all parents immediately.'
  },
  {
    type: 'url',
    label: 'BBC News Article',
    content: 'https://www.bbc.com/news/science-environment-63957019'
  }
];

export default function MultimodalInput({ onVerify, isLoading }) {
  const [activeMode, setActiveMode] = useState('claim'); // 'claim' | 'text' | 'file' | 'url'
  const [claimInput, setClaimInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [fileInput, setFileInput] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [contextInput, setContextInput] = useState('');
  const [showContext, setShowContext] = useState(false);
  const [autoVerify, setAutoVerify] = useState(true);

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileInput(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (evt) => setFilePreview(evt.target?.result);
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeFile = () => {
    setFileInput(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const applyPreset = (preset) => {
    setActiveMode(preset.type);
    if (preset.type === 'claim') setClaimInput(preset.content);
    if (preset.type === 'text') setTextInput(preset.content);
    if (preset.type === 'url') setUrlInput(preset.content);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;

    if (activeMode === 'claim') {
      if (!claimInput.trim()) return;
      onVerify({ mode: 'claim', data: { claim: claimInput.trim(), context: contextInput.trim() || null } });
    } else if (activeMode === 'text') {
      if (!textInput.trim()) return;
      onVerify({
        mode: 'text',
        data: { text: textInput.trim(), auto_verify: autoVerify, context: contextInput.trim() || null }
      });
    } else if (activeMode === 'file') {
      if (!fileInput) return;
      onVerify({
        mode: 'file',
        data: { file: fileInput, auto_verify: autoVerify, context: contextInput.trim() || null }
      });
    } else if (activeMode === 'url') {
      if (!urlInput.trim()) return;
      onVerify({
        mode: 'url',
        data: { url: urlInput.trim(), auto_verify: autoVerify, context: contextInput.trim() || null }
      });
    }
  };

  const canSubmit = () => {
    if (activeMode === 'claim') return claimInput.trim().length >= 5;
    if (activeMode === 'text') return textInput.trim().length >= 10;
    if (activeMode === 'file') return fileInput !== null;
    if (activeMode === 'url') return urlInput.trim().length >= 8;
    return false;
  };

  return (
    <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      {/* Background Glow Accents */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Modes Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <span>Verify Information</span>
            <Sparkles className="w-5 h-5 text-sky-400" />
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Choose an input format. Trutify extracts claims, searches multi-source evidence, and generates verified corrections.
          </p>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900/90 p-1.5 rounded-xl border border-slate-700/60 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveMode('claim')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'claim'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Claim</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('text')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'text'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlignLeft className="w-3.5 h-3.5" />
            <span>Raw Text</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('file')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'file'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Image / PDF</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('url')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeMode === 'url'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>URL</span>
          </button>
        </div>
      </div>

      {/* Preset Quick Fill Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <span className="text-xs font-medium text-slate-400 flex items-center space-x-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Quick Examples:</span>
        </span>
        {PRESET_EXAMPLES.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => applyPreset(preset)}
            className="text-xs bg-slate-900/60 hover:bg-slate-700/60 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/50 transition-colors"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Mode 1: Direct Claim */}
        {activeMode === 'claim' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Specific Factual Claim
            </label>
            <textarea
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="e.g. Earth will temporarily lose gravity for seven seconds tomorrow according to NASA."
              rows={3}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-sm leading-relaxed transition-all"
            />
            <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
              <span>Must be at least 5 characters</span>
              <span>{claimInput.length} chars</span>
            </div>
          </div>
        )}

        {/* Mode 2: Raw Text */}
        {activeMode === 'text' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Long-form Article or Message Body
            </label>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Paste news articles, transcripts, viral social posts, or messaging app forwards here..."
              rows={6}
              className="w-full bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-sm leading-relaxed transition-all font-sans"
            />
            <div className="flex justify-between items-center text-xs text-slate-500 mt-1">
              <span>Gemini AI automatically isolates verifiable claims from opinions</span>
              <span>{textInput.length} chars</span>
            </div>
          </div>
        )}

        {/* Mode 3: Image / PDF File Upload */}
        {activeMode === 'file' && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Upload Document, News Screenshot, or Meme
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-sky-500 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/70 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {!fileInput ? (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Click or drag and drop image or PDF document
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Supports PNG, JPEG, WebP, GIF, and PDF (Max 10MB)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-800 p-4 rounded-xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center space-x-4">
                    {filePreview ? (
                      <img src={filePreview} alt="Preview" className="w-14 h-14 object-cover rounded-lg border border-slate-700" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                        <FileCheck2 className="w-7 h-7" />
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                        {fileInput.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {(fileInput.size / 1024).toFixed(1)} KB • {fileInput.type || 'Document'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mode 4: Web URL */}
        {activeMode === 'url' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Article URL
              </label>
              <span className="text-[11px] text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SSRF Guard Active</span>
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Link2 className="w-5 h-5" />
              </div>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://reuters.com/world/news-article-title..."
                className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-12 pr-4 py-3.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 text-sm transition-all font-mono"
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Trutify safely strips boilerplate ads and extracts verified journalism with loopback IP protection.
            </p>
          </div>
        )}

        {/* Optional Context Accordion */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowContext(!showContext)}
            className="text-xs font-medium text-slate-400 hover:text-sky-400 flex items-center space-x-1 transition-colors"
          >
            <span>{showContext ? '− Hide optional background context' : '+ Add optional background context / source details'}</span>
          </button>

          {showContext && (
            <div className="mt-2">
              <textarea
                value={contextInput}
                onChange={(e) => setContextInput(e.target.value)}
                placeholder="Optional notes, platform where seen (e.g. WhatsApp, X/Twitter, Telegram), date seen..."
                rows={2}
                className="w-full bg-slate-900/60 border border-slate-700/80 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 text-xs"
              />
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            <span>Powered by Gemini AI, Tavily Search, NewsAPI & Google Fact Check</span>
          </div>

          <button
            type="submit"
            disabled={!canSubmit() || isLoading}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-lg ${
              canSubmit() && !isLoading
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sky-500/25 cursor-pointer hover:shadow-sky-500/40'
                : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <span>{isLoading ? 'Verifying...' : 'Analyze & Verify'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
