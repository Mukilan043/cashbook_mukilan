import { useEffect, useMemo, useState } from 'react';
import { transactionAPI } from '../services/api';
import { format, subDays, differenceInCalendarDays } from 'date-fns';
import { decodeDescription } from '../utils/transactionSmart';

const BUDGET_STORAGE_PREFIX = 'cb_budget_monthly_';

const PIE_COLORS = [
  'text-indigo-500',
  'text-blue-500',
  'text-emerald-500',
  'text-amber-500',
  'text-rose-500',
  'text-violet-500',
  'text-cyan-500',
  'text-fuchsia-500',
];

const formatMoney = (value) => {
  const num = Number(value || 0);
  return `Rs ${num.toFixed(2)}`;
};

const clampNumber = (value, { min = -Infinity, max = Infinity } = {}) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(max, Math.max(min, num));
};

const daysInMonth = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  return new Date(year, month + 1, 0).getDate();
};

const DonutChart = ({ title, items }) => {
  const total = items.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  let dashOffset = 0;
  return (
    <div className="bg-white bg-opacity-95 rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">Total: {formatMoney(total)}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div className="relative w-[180px] h-[180px] shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full">
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="rgba(229,231,235,1)"
              strokeWidth="14"
            />
            {total > 0 &&
              items
                .filter((it) => (Number(it.value) || 0) > 0)
                .map((it, idx) => {
                  const fraction = (Number(it.value) || 0) / total;
                  const dash = fraction * circumference;
                  const node = (
                    <circle
                      key={`${it.label}-${idx}`}
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="currentColor"
                      className={it.colorClass}
                      strokeWidth="14"
                      strokeDasharray={`${dash} ${circumference}`}
                      strokeDashoffset={-dashOffset}
                      strokeLinecap="butt"
                      transform="rotate(-90 60 60)"
                    />
                  );
                  dashOffset += dash;
                  return node;
                })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-sm font-bold text-gray-900">{formatMoney(total)}</div>
            </div>
          </div>
        </div>

        <div className="w-full">
          {items.length === 0 || total === 0 ? (
            <div className="text-sm text-gray-500">No data in this range.</div>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => {
                const pct = total > 0 ? Math.round(((Number(it.value) || 0) / total) * 100) : 0;
                return (
                  <div key={`${it.label}-${idx}`} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2.5 h-2.5 rounded-full bg-current ${it.colorClass}`} />
                      <span className="text-sm text-gray-800 truncate">{it.label}</span>
                    </div>
                    <div className="text-xs text-gray-600 whitespace-nowrap">
                      {formatMoney(it.value)} • {pct}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const BarChart = ({ title, points, colorClass = 'text-indigo-500' }) => {
  const maxVal = points.reduce((m, p) => Math.max(m, Number(p.value) || 0), 0);
  const width = 520;
  const height = 160;
  const padding = 24;
  const barAreaWidth = width - padding * 2;
  const barAreaHeight = height - padding * 2;
  const barGap = 6;
  const barWidth = points.length > 0
    ? Math.max(4, (barAreaWidth - barGap * (points.length - 1)) / points.length)
    : 8;

  const labelEvery = points.length <= 10 ? 1 : points.length <= 20 ? 2 : 4;

  return (
    <div className="bg-white bg-opacity-95 rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500 mt-1">Max: {formatMoney(maxVal)}</p>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label={title}
        >
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(209,213,219,1)" />
          {points.map((p, idx) => {
            const value = Number(p.value) || 0;
            const h = maxVal > 0 ? (value / maxVal) * barAreaHeight : 0;
            const x = padding + idx * (barWidth + barGap);
            const y = height - padding - h;

            return (
              <g key={`${p.label}-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={h}
                  fill="currentColor"
                  className={colorClass}
                  rx="3"
                />
                {idx % labelEvery === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(107,114,128,1)"
                  >
                    {p.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

const ReportGenerator = ({ cashbookId }) => {
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'all',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [pdfBlob, setPdfBlob] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);

  useEffect(() => {
    if (!cashbookId) return;
    const key = `${BUDGET_STORAGE_PREFIX}${cashbookId}`;
    const stored = localStorage.getItem(key);
    setMonthlyBudget(clampNumber(stored || 0, { min: 0 }));
  }, [cashbookId]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!cashbookId) return;
      if (new Date(filters.startDate) > new Date(filters.endDate)) return;

      setAnalyticsLoading(true);
      setAnalyticsError('');
      try {
        const reqFilters = {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: 'date',
          sortOrder: 'ASC',
          ...(filters.type !== 'all' ? { type: filters.type } : {}),
        };
        const data = await transactionAPI.getAll(cashbookId, reqFilters);
        setTransactions(Array.isArray(data) ? data : []);
      } catch (e) {
        setAnalyticsError(e?.response?.data?.error || e?.message || 'Failed to load analytics');
        setTransactions([]);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [cashbookId, filters.startDate, filters.endDate, filters.type]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generatePDF = async () => {
    if (!cashbookId) {
      setMessage({ type: 'error', text: 'Please select a cashbook first' });
      return;
    }

    if (new Date(filters.startDate) > new Date(filters.endDate)) {
      setMessage({ type: 'error', text: 'Start date must be before end date' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const reportFilters = {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      
      if (filters.type !== 'all') {
        reportFilters.type = filters.type;
      }

      // Fetch PDF as blob using API service
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/transactions/cashbook/${cashbookId}/reports/generate?${new URLSearchParams(reportFilters)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to generate report');
      
      const blob = await response.blob();
      setPdfBlob(blob);
      
      // Auto download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'cash-book-report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage({ type: 'success', text: 'Report generated and downloaded successfully!' });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.message || 'Failed to generate report' 
      });
    } finally {
      setLoading(false);
    }
  };

  const analytics = useMemo(() => {
    const rangeDays = Math.max(
      1,
      differenceInCalendarDays(new Date(filters.endDate), new Date(filters.startDate)) + 1
    );
    const byDate = new Map();
    const byCategory = new Map();

    let totalInflow = 0;
    let totalOutflow = 0;

    for (const t of transactions) {
      const amount = Number(t.amount) || 0;
      if (t.type === 'inflow') totalInflow += amount;
      if (t.type === 'outflow') totalOutflow += amount;

      const decoded = decodeDescription(t.description || '');
      const category = decoded.category || 'Uncategorized';

      const dateKey = t.date;
      if (!byDate.has(dateKey)) byDate.set(dateKey, { inflow: 0, outflow: 0 });
      const acc = byDate.get(dateKey);
      if (t.type === 'inflow') acc.inflow += amount;
      if (t.type === 'outflow') acc.outflow += amount;

      if (!byCategory.has(category)) byCategory.set(category, { inflow: 0, outflow: 0 });
      const catAcc = byCategory.get(category);
      if (t.type === 'inflow') catAcc.inflow += amount;
      if (t.type === 'outflow') catAcc.outflow += amount;
    }

    const mode = filters.type === 'inflow' ? 'inflow' : 'outflow';
    const categoryItems = Array.from(byCategory.entries())
      .map(([label, v]) => ({
        label,
        value: mode === 'inflow' ? v.inflow : v.outflow,
      }))
      .filter((x) => (Number(x.value) || 0) > 0)
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

    const topCategories = categoryItems.slice(0, 8).map((it, idx) => ({
      ...it,
      colorClass: PIE_COLORS[idx % PIE_COLORS.length],
    }));
    const otherTotal = categoryItems
      .slice(8)
      .reduce((sum, it) => sum + (Number(it.value) || 0), 0);
    const pieItems = otherTotal > 0
      ? [...topCategories, { label: 'Other', value: otherTotal, colorClass: 'text-gray-500' }]
      : topCategories;

    const sortedDates = Array.from(byDate.keys()).sort((a, b) => new Date(a) - new Date(b));
    const barPoints = sortedDates.map((d) => {
      const v = byDate.get(d);
      const val = mode === 'inflow' ? v.inflow : v.outflow;
      return {
        label: String(d).slice(5),
        value: val,
      };
    });

    const avgDailyOutflow = totalOutflow / rangeDays;
    const monthDays = daysInMonth(filters.endDate);
    const projectedMonthOutflow = avgDailyOutflow * monthDays;

    const topCategory = categoryItems[0]?.label || '';
    const topCategoryValue = Number(categoryItems[0]?.value || 0);
    const categoryTotal = categoryItems.reduce((sum, it) => sum + (Number(it.value) || 0), 0);
    const topCategoryPct = categoryTotal > 0 ? Math.round((topCategoryValue / categoryTotal) * 100) : 0;

    return {
      rangeDays,
      totalInflow,
      totalOutflow,
      net: totalInflow - totalOutflow,
      pieMode: mode,
      pieItems,
      barPoints,
      avgDailyOutflow,
      projectedMonthOutflow,
      monthDays,
      topCategory,
      topCategoryValue,
      topCategoryPct,
    };
  }, [transactions, filters.startDate, filters.endDate, filters.type]);

  const buildReportFile = () => {
    const safeStart = String(filters.startDate || '').replace(/\//g, '-');
    const safeEnd = String(filters.endDate || '').replace(/\//g, '-');
    const fileName = `cash-book-report_${safeStart}_to_${safeEnd}.pdf`;
    return new File([pdfBlob], fileName, { type: 'application/pdf' });
  };

  const trySharePdfFile = async () => {
    if (!pdfBlob) {
      setMessage({ type: 'error', text: 'Please generate PDF first' });
      return false;
    }

    const file = buildReportFile();
    const shareData = {
      title: 'Cash Book Report',
      text: `Cash Book Report from ${filters.startDate} to ${filters.endDate}`,
      files: [file],
    };

    const canShareFiles =
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] }));

    if (!canShareFiles) return false;

    try {
      await navigator.share(shareData);
      setMessage({ type: 'success', text: 'PDF shared successfully.' });
      return true;
    } catch (err) {
      // User cancelled share or share failed.
      const msg = err?.name === 'AbortError' ? 'Share cancelled.' : 'Could not share PDF.';
      setMessage({ type: 'error', text: msg });
      return true;
    }
  };

  const shareViaEmail = async () => {
    const didShare = await trySharePdfFile();
    if (didShare) return;

    const subject = encodeURIComponent('Cash Book Report');
    const body = encodeURIComponent(`Cash Book Report from ${filters.startDate} to ${filters.endDate}.\n\nPlease attach the downloaded PDF.`);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    window.open(mailtoLink);

    setMessage({ type: 'success', text: 'Email client opened. Please attach the downloaded PDF manually.' });
  };

  const shareViaWhatsApp = async () => {
    const didShare = await trySharePdfFile();
    if (didShare) return;

    const text = encodeURIComponent(
      `Cash Book Report from ${filters.startDate} to ${filters.endDate}\n\nPlease attach the downloaded PDF.`
    );
    const whatsappLink = `https://wa.me/?text=${text}`;
    window.open(whatsappLink, '_blank');

    setMessage({ type: 'success', text: 'WhatsApp opened. Please attach the downloaded PDF manually.' });
  };

  if (!cashbookId) {
    return (
      <div 
        className="max-w-md mx-auto bg-white bg-opacity-95 p-6 rounded-lg shadow-md"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-white bg-opacity-90 p-4 rounded-lg">
          <p className="text-center text-gray-500">Please select a cashbook to generate reports</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-4xl mx-auto bg-white bg-opacity-95 p-4 sm:p-6 rounded-lg shadow-md mb-20"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="bg-white bg-opacity-90 p-4 sm:p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-6">Generate Report</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type
            </label>
            <select
              id="type"
              name="type"
              value={filters.type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="inflow">Inflow Only</option>
              <option value="outflow">Outflow Only</option>
            </select>
          </div>

          {message.text && (
            <div className={`p-3 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={generatePDF}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Generating...' : 'Generate & Download PDF'}
          </button>

          {pdfBlob && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Share Report:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={shareViaEmail}
                  className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-lg"
                >
                  📧 Share via Email
                </button>
                <button
                  onClick={shareViaWhatsApp}
                  className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-lg"
                >
                  💬 Share via WhatsApp
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-md text-sm text-blue-700">
            <p className="font-semibold mb-1">Report includes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Summary (Total Inflow, Outflow, Balance)</li>
              <li>Complete transaction list with dates</li>
              <li>Transaction descriptions</li>
            </ul>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-lg font-bold text-gray-900">Analytics</h3>
              <div className="text-xs text-gray-500">
                {analyticsLoading ? 'Loading…' : `Loaded ${transactions.length} transactions`}
              </div>
            </div>

            {analyticsError && (
              <div className="mt-3 p-3 rounded-md bg-red-100 text-red-700 text-sm">
                {analyticsError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white bg-opacity-95 rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Total Inflow</div>
                <div className="text-lg font-bold text-green-700">{formatMoney(analytics.totalInflow)}</div>
              </div>
              <div className="bg-white bg-opacity-95 rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Total Outflow</div>
                <div className="text-lg font-bold text-red-700">{formatMoney(analytics.totalOutflow)}</div>
              </div>
              <div className="bg-white bg-opacity-95 rounded-lg border border-gray-200 p-4">
                <div className="text-xs text-gray-500">Net</div>
                <div className={`text-lg font-bold ${analytics.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {formatMoney(analytics.net)}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <DonutChart
                title={analytics.pieMode === 'inflow' ? 'Category-wise Inflow' : 'Category-wise Expenses'}
                items={analytics.pieItems}
              />
              <BarChart
                title={analytics.pieMode === 'inflow' ? 'Daily Inflow Trend' : 'Daily Spending Trend'}
                points={analytics.barPoints}
                colorClass={analytics.pieMode === 'inflow' ? 'text-emerald-500' : 'text-rose-500'}
              />
            </div>

            <div className="mt-4 bg-white bg-opacity-95 rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Budget & Insights</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Forecast uses average daily spending across this date range ({analytics.rangeDays} days).
                  </p>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Budget</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyBudget}
                    onChange={(e) => {
                      const next = clampNumber(e.target.value, { min: 0 });
                      setMonthlyBudget(next);
                      if (cashbookId) {
                        localStorage.setItem(`${BUDGET_STORAGE_PREFIX}${cashbookId}`, String(next));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="text-xs text-gray-500">Avg / day (outflow)</div>
                    <div className="text-sm font-bold text-gray-900">{formatMoney(analytics.avgDailyOutflow)}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="text-xs text-gray-500">Forecast month ({analytics.monthDays}d)</div>
                    <div className="text-sm font-bold text-gray-900">{formatMoney(analytics.projectedMonthOutflow)}</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <div className="text-xs text-gray-500">Budget status</div>
                    {monthlyBudget > 0 ? (
                      <div className={`text-sm font-bold ${analytics.projectedMonthOutflow <= monthlyBudget ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {analytics.projectedMonthOutflow <= monthlyBudget ? 'On track' : 'Over budget'}
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-gray-700">Set a budget</div>
                    )}
                    {monthlyBudget > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        Remaining: {formatMoney(monthlyBudget - analytics.projectedMonthOutflow)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-sm text-gray-800">
                {analytics.topCategory ? (
                  <div>
                    Top category: <span className="font-semibold">{analytics.topCategory}</span> — {formatMoney(analytics.topCategoryValue)} ({analytics.topCategoryPct}%)
                  </div>
                ) : (
                  <div className="text-gray-500">No category data yet. Add categories in inflow/outflow.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportGenerator;
