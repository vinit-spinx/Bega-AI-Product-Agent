'use client';

import { useState } from 'react';

const DATE_RANGES = ['Today', '7 Days', '30 Days', '90 Days'];

const EXPORT_OPTIONS = [
  {
    format: 'CSV',
    description: 'Spreadsheet-compatible, lightweight',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M11 3H5a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V9z" />
        <path d="M11 3v6h6" />
        <path d="M7 13h6M7 10h3" />
      </svg>
    ),
  },
  {
    format: 'Excel',
    description: 'Formatted workbook with charts',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M11 3H5a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V9z" />
        <path d="M11 3v6h6" />
        <path d="M7 10l6 6M13 10l-6 6" />
      </svg>
    ),
  },
  {
    format: 'PDF',
    description: 'Executive-ready print layout',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M11 3H5a1 1 0 00-1 1v12a1 1 0 001 1h10a1 1 0 001-1V9z" />
        <path d="M11 3v6h6" />
        <path d="M7 12h4a1.5 1.5 0 000-3H7v6" />
      </svg>
    ),
  },
];

export default function ReportsTab() {
  const [selectedRange, setSelectedRange] = useState('30 Days');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: string) => {
    setExporting(format);
    // Simulate export delay — replace with real download trigger in production
    await new Promise(r => setTimeout(r, 1200));
    setExporting(null);
  };

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Date Filters */}
      <div className="bg-white rounded-2xl border border-bega-border-1 p-6">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-4">Report Period</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {DATE_RANGES.map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRange(r)}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all
                ${selectedRange === r
                  ? 'bg-bega-black text-white'
                  : 'border border-bega-border-2 text-bega-text-2 hover:bg-bega-bg-1'
                }`}
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedRange('Custom')}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-medium transition-all
              ${selectedRange === 'Custom'
                ? 'bg-bega-black text-white'
                : 'border border-bega-border-2 text-bega-text-2 hover:bg-bega-bg-1'
              }`}
          >
            Custom Range
          </button>
        </div>

        {selectedRange === 'Custom' && (
          <div className="flex items-center gap-3 mt-3">
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3 mb-1.5">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-bega-border-2 text-[13px] text-bega-text-1 bg-white focus:outline-none focus:ring-2 focus:ring-bega-black/10"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-bega-text-3 mb-1.5">To</label>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-bega-border-2 text-[13px] text-bega-text-1 bg-white focus:outline-none focus:ring-2 focus:ring-bega-black/10"
              />
            </div>
          </div>
        )}
      </div>

      {/* Export Options */}
      <div className="bg-white rounded-2xl border border-bega-border-1 p-6">
        <p className="text-[13px] font-semibold text-bega-text-1 mb-1">Export Report</p>
        <p className="text-[12px] text-bega-text-3 mb-5">
          Download a full analytics report for the selected period.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EXPORT_OPTIONS.map(opt => (
            <button
              key={opt.format}
              type="button"
              onClick={() => handleExport(opt.format)}
              disabled={!!exporting}
              className="flex items-center gap-3 p-4 rounded-xl border border-bega-border-2 text-left
                         hover:border-bega-border-3 hover:bg-bega-bg-1 transition-all active:scale-[0.98]
                         disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <span className="text-bega-text-2 group-hover:text-bega-text-1 transition-colors">
                {opt.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold text-bega-text-1">
                  {exporting === opt.format ? 'Preparing…' : `Export ${opt.format}`}
                </p>
                <p className="text-[10px] text-bega-text-3 truncate">{opt.description}</p>
              </div>
              {exporting === opt.format && (
                <svg className="w-3.5 h-3.5 text-bega-text-3 ml-auto animate-spin flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scheduled Reports — Coming Soon */}
      <div className="bg-white rounded-2xl border border-bega-border-1 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold text-bega-text-1">Scheduled Reports</p>
            <p className="text-[12px] text-bega-text-3 mt-0.5">Automatically deliver reports to stakeholders</p>
          </div>
          <span className="text-[8.5px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-bega-bg-2 text-bega-text-3">
            Coming Soon
          </span>
        </div>
        <div className="rounded-xl border border-dashed border-bega-border-2 p-8 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 rounded-xl bg-bega-bg-1 flex items-center justify-center mb-3">
            <svg viewBox="0 0 20 20" fill="none" stroke="#C8C4BE" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="3" y="4" width="14" height="14" rx="1.5" />
              <path d="M7 2v4M13 2v4M3 9h14" />
              <path d="M7 13h6M7 16h4" />
            </svg>
          </div>
          <p className="text-[12px] font-medium text-bega-text-2 mb-1">Schedule weekly or monthly reports</p>
          <p className="text-[11px] text-bega-text-3 max-w-xs leading-relaxed">
            Deliver automated PDF summaries to your team by email on a recurring schedule.
          </p>
        </div>
      </div>
    </div>
  );
}
