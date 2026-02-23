import { useEffect, useMemo, useRef, useState } from 'react';
import { assistantAPI } from '../services/api';

const BUDGET_STORAGE_PREFIX = 'cb_budget_monthly_';

const getBudgetsByCashbook = () => {
  const budgets = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(BUDGET_STORAGE_PREFIX)) continue;
      const cashbookId = key.slice(BUDGET_STORAGE_PREFIX.length);
      budgets[String(cashbookId)] = Number(localStorage.getItem(key) || 0) || 0;
    }
  } catch {
    // ignore
  }
  return budgets;
};

const formatTime = (date) => {
  try {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const CashbookAssistant = ({
  currentCashbookId,
  visible,
  side = 'right',
  buttonBottomClass = 'bottom-24',
  panelBottomClass = 'bottom-32',
}) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Ask me anything about your cashbooks. Example: “How much did I spend last 7 days?” or “Show top category this month.”',
      ts: Date.now(),
    },
  ]);

  const listRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages.length, loading]);

  useEffect(() => {
    if (!visible && open) setOpen(false);
  }, [visible, open]);

  const canSend = useMemo(() => {
    return !loading && input.trim().length > 0;
  }, [loading, input]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError('');
    setInput('');

    const userMsg = { id: `${Date.now()}_u`, role: 'user', text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    setLoading(true);
    try {
      const budgetsByCashbook = getBudgetsByCashbook();
      const res = await assistantAPI.chat({
        message: text,
        currentCashbookId: currentCashbookId ? String(currentCashbookId) : null,
        budgetsByCashbook,
      });

      const answerText = res?.answer || 'Sorry, I could not generate an answer.';
      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}_a`, role: 'assistant', text: answerText, ts: Date.now() },
      ]);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Assistant failed';
      setError(msg);
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}_a_err`,
          role: 'assistant',
          text: 'I could not answer that right now. Please try again.',
          ts: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const isLeft = side === 'left';
  const buttonPos = isLeft ? 'left-4 sm:left-6' : 'right-4 sm:right-6';
  const panelPos = isLeft ? 'left-4 sm:left-6' : 'right-4 sm:right-6';

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={open ? 'Close Assistant' : 'Assistant'}
        className={`group fixed ${buttonBottomClass} ${buttonPos} z-50 w-14 h-14 rounded-full shadow-2xl border border-white border-opacity-30 backdrop-blur bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center hover:opacity-95`}
        aria-label={open ? 'Close Assistant' : 'Open Assistant'}
      >
        <span className="pointer-events-none absolute right-full mr-3 px-3 py-1 rounded-lg text-xs font-semibold bg-black bg-opacity-70 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap">
          {open ? 'Close Assistant' : 'Assistant'}
        </span>
        {open ? (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h8m-8 4h5m-7 6l-3 3V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2H7l-2 2z"
            />
          </svg>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className={`fixed ${panelBottomClass} ${panelPos} z-50 w-[92vw] max-w-md`}>
          <div className="overflow-hidden rounded-2xl shadow-2xl border border-white border-opacity-30 backdrop-blur bg-white bg-opacity-90">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold truncate">Cashbook Assistant</div>
                  <div className="text-[11px] opacity-90 truncate">Ask about totals, categories, trends, budgets</div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close Assistant"
                  title="Close Assistant"
                  className="text-white text-sm font-semibold px-2 py-1 rounded-lg hover:bg-white hover:bg-opacity-10"
                >
                  ✕
                </button>
              </div>
            </div>

            <div ref={listRef} className="max-h-[50vh] overflow-y-auto px-4 py-3 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={
                      m.role === 'user'
                        ? 'max-w-[85%] rounded-2xl px-3 py-2 bg-indigo-600 text-white shadow'
                        : 'max-w-[85%] rounded-2xl px-3 py-2 bg-white border border-gray-200 text-gray-900 shadow-sm'
                    }
                  >
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    <div className={m.role === 'user' ? 'text-[10px] opacity-80 mt-1 text-right' : 'text-[10px] text-gray-500 mt-1'}>
                      {formatTime(m.ts)}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-white border border-gray-200 text-gray-700 shadow-sm">
                    <div className="text-sm">Thinking…</div>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-100 text-red-700 text-xs p-2 border border-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200" />

            <div className="p-3">
              <div className="flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  className="flex-1 resize-none px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder='Ask: “spent last 7 days?”, “top category this month”, “budget forecast”'
                />
                <button
                  onClick={send}
                  disabled={!canSend}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
              <div className="mt-2 text-[11px] text-gray-500">
                Tip: mention a cashbook name if you have multiple.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CashbookAssistant;
