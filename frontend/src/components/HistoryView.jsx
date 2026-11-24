import React, { useEffect, useState } from 'react';
import {
  History,
  Trash2,
  ExternalLink,
  Filter,
  RefreshCw,
  FileText,
  AlignLeft,
  UploadCloud,
  Link2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getHistory, deleteHistory } from '../services/api';

const TYPE_ICONS = {
  CLAIM: FileText,
  TEXT: AlignLeft,
  IMAGE: UploadCloud,
  PDF: UploadCloud,
  URL: Link2
};

const VERDICT_STYLES = {
  VERIFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FALSE: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  MISLEADING: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'PARTIALLY TRUE': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  UNVERIFIED: 'bg-slate-700 text-slate-300 border-slate-600'
};

export default function HistoryView({ onSelectRecord }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [verdictFilter, setVerdictFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await getHistory({
        page,
        limit: 10,
        verdict: verdictFilter || null,
        input_type: typeFilter || null
      });

      // Handle both { data: recordsArray, pagination: {...} } and { data: { records, pagination } }
      const recordsList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.records)
        ? res.data.records
        : [];
      const totalCount =
        res.pagination?.total ??
        res.data?.pagination?.total ??
        recordsList.length;

      setRecords(recordsList);
      setTotal(totalCount);
    } catch (err) {
      setError(err.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [page, verdictFilter, typeFilter]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this verification record?')) return;
    try {
      await deleteHistory(id);
      fetchRecords();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <History className="w-5 h-5 text-sky-400" />
            <span>Verification Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Persisted records and evidence trails stored in MongoDB Atlas ({total} total).
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Verdict Filter */}
          <select
            value={verdictFilter}
            onChange={(e) => {
              setVerdictFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Verdicts</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="FALSE">FALSE</option>
            <option value="MISLEADING">MISLEADING</option>
            <option value="PARTIALLY TRUE">PARTIALLY TRUE</option>
            <option value="UNVERIFIED">UNVERIFIED</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">All Formats</option>
            <option value="CLAIM">Direct Claim</option>
            <option value="TEXT">Raw Text</option>
            <option value="IMAGE">Image OCR</option>
            <option value="PDF">PDF Report</option>
            <option value="URL">Web URL</option>
          </select>

          <button
            onClick={fetchRecords}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Records Feed */}
      {isLoading && records.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-400 mb-2" />
          Loading verification history...
        </div>
      ) : records.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
          <p className="text-base font-medium text-slate-300">No verification records found.</p>
          <p className="text-xs text-slate-500 mt-1">
            Run a verification using the Verify tab to generate persistent audit trails.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((rec) => {
            const TypeIcon = TYPE_ICONS[rec.input_type] || FileText;
            const style = VERDICT_STYLES[rec.verdict] || VERDICT_STYLES.UNVERIFIED;

            return (
              <div
                key={rec.id}
                onClick={() => onSelectRecord(rec)}
                className="bg-slate-800/70 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 rounded-2xl p-5 transition-all cursor-pointer shadow-md group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 text-sky-400 border border-slate-700/80 group-hover:scale-105 transition-transform">
                    <TypeIcon className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${style}`}>
                        {rec.verdict}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">
                        {rec.confidence}% Conf.
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        {rec.input_type}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-white group-hover:text-sky-300 transition-colors line-clamp-1">
                      {rec.primary_claim}
                    </p>

                    {rec.corrected_headline && (
                      <p className="text-xs text-indigo-300 font-medium line-clamp-1 mt-0.5">
                        ↳ Correction: {rec.corrected_headline}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={(e) => handleDelete(e, rec.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900/60 transition-colors"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold text-sky-400 flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                    <span>Inspect</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Bar */}
      {total > 10 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <span>
            Showing {(page - 1) * 10 + 1} - {Math.min(page * 10, total)} of {total}
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * 10 >= total}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
