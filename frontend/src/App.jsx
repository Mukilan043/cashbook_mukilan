import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BalanceDisplay from './components/BalanceDisplay';
import Sidebar from './components/Sidebar';
import CashInflow from './components/CashInflow';
import CashOutflow from './components/CashOutflow';
import History from './components/History';
import ReportGenerator from './components/ReportGenerator';
import CreateCashbook from './components/CreateCashbook';
import UserProfile from './components/UserProfile';
import GuestView from './components/GuestView';
import Login from './components/Login';
import Signup from './components/Signup';
import BottomNavigation from './components/BottomNavigation';
import BackButton from './components/BackButton';
import { cashbookAPI } from './services/api';
import { decodeDescription } from './utils/transactionSmart';
import { formatDateDisplay } from './utils/dateFormat';
import { transactionAPI } from './services/api';
import CashbookAssistant from './components/CashbookAssistant';

/* ─── CashbookView ──────────────────────────────────────────── */
const CashbookView = () => {
  const { cashbookId } = useParams();
  const { isGuest } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarType, setSidebarType] = useState(null);
  const [cashbooks, setCashbooks] = useState([]);
  const [selectedCashbook, setSelectedCashbook] = useState(null);
  const [showInflow, setShowInflow] = useState(false);
  const [showOutflow, setShowOutflow] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const navigate = useNavigate();

  const isCashbookHome = !!cashbookId && (
    location.pathname === `/cashbook/${cashbookId}` ||
    location.pathname === `/cashbook/${cashbookId}/`
  );
  const isAddingMode = showInflow || showOutflow;

  useEffect(() => {
    if (cashbookId && !isGuest) fetchCashbook();
    if (!isGuest) fetchCashbooks();
  }, [cashbookId, isGuest]);

  useEffect(() => {
    if (!cashbookId || isGuest) return;
    fetchRecentTransactions();
  }, [cashbookId, isGuest]);

  const fetchRecentTransactions = async () => {
    if (!cashbookId) return;
    try {
      setRecentLoading(true);
      const data = await transactionAPI.getAll(cashbookId, { sortBy: 'date', sortOrder: 'ASC' });
      const arr = Array.isArray(data) ? data : [];
      const chronological = [...arr].sort((a, b) => {
        const dateDiff = new Date(a.date) - new Date(b.date);
        if (dateDiff !== 0) return dateDiff;
        const aCreated = a.created_at ? new Date(a.created_at) : null;
        const bCreated = b.created_at ? new Date(b.created_at) : null;
        if (aCreated && bCreated) {
          const createdDiff = aCreated - bCreated;
          if (createdDiff !== 0) return createdDiff;
        }
        return Number(a.id) - Number(b.id);
      });
      let balance = 0;
      const balanceById = new Map();
      for (const t of chronological) {
        const amount = Number(t.amount || 0);
        if (t.type === 'inflow') balance += amount;
        else balance -= amount;
        balanceById.set(t.id, balance);
      }
      const desc = [...arr].sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        const aCreated = a.created_at ? new Date(a.created_at) : null;
        const bCreated = b.created_at ? new Date(b.created_at) : null;
        if (aCreated && bCreated) {
          const createdDiff = bCreated - aCreated;
          if (createdDiff !== 0) return createdDiff;
        }
        return Number(b.id) - Number(a.id);
      });
      const latestFive = desc.slice(0, 5).map((t) => ({
        ...t,
        runningBalance: Number(balanceById.get(t.id) ?? 0),
      }));
      setRecentTransactions(latestFive);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      setRecentTransactions([]);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    if (!cashbookId) return;
    const path = location.pathname;
    const shouldClose = path.includes('/history') || path.includes('/report');
    if (shouldClose && (showInflow || showOutflow)) {
      setShowInflow(false);
      setShowOutflow(false);
    }
  }, [location.pathname, cashbookId, showInflow, showOutflow]);

  const fetchCashbooks = async () => {
    try {
      const data = await cashbookAPI.getAll();
      setCashbooks(data);
      if (cashbookId) {
        const found = data.find((cb) => cb.id === parseInt(cashbookId));
        setSelectedCashbook(found);
      }
    } catch (error) { console.error('Error fetching cashbooks:', error); }
  };

  const fetchCashbook = async () => {
    try {
      const data = await cashbookAPI.getById(cashbookId);
      setSelectedCashbook(data);
    } catch (error) { console.error('Error fetching cashbook:', error); }
  };

  const handleOpenSidebar = (type) => {
    if (isGuest) { alert('Please login to add transactions'); return; }
    if (!cashbookId) { alert('Please select a cashbook first'); return; }
    navigate(`/cashbook/${cashbookId}`);
    setShowInflow(type === 'inflow');
    setShowOutflow(type === 'outflow');
    setSidebarType(null);
    setSidebarOpen(false);
  };

  const handleCloseSidebar = () => {
    setShowInflow(false);
    setShowOutflow(false);
    setSidebarOpen(false);
    setSidebarType(null);
  };

  const handleSidebarSuccess = () => {
    if (window.refreshBalance) window.refreshBalance();
    window.location.reload();
  };

  const handleCashbookChange = (e) => {
    const id = e.target.value;
    if (id) navigate(`/cashbook/${id}`);
  };

  if (isGuest) return <GuestView />;

  return (
    <div className="cd-page">
      {/* Header */}
      <div className="cd-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="cd-logo-text">CashDiary</div>
        </div>
        {/* Cashbook selector chip */}
        <select
          id="cashbook-select"
          value={cashbookId || ''}
          onChange={handleCashbookChange}
          className="cd-select"
          style={{ width: 'auto', minWidth: 140, maxWidth: 200, fontSize: '0.85rem', padding: '8px 14px' }}
        >
          <option value="">Select book…</option>
          {cashbooks.map((cb) => (
            <option key={cb.id} value={cb.id}>{cb.name}</option>
          ))}
        </select>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Balance */}
        {!isAddingMode && (
          <>
            <div style={{ marginBottom: 16 }}>
              <BalanceDisplay cashbookId={cashbookId} />
            </div>

            {/* Recent Transactions */}
            {cashbookId && isCashbookHome && (
              <div className="cd-card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div>
                    <div className="cd-section-title">Recent Transactions</div>
                    <div className="cd-section-subtitle">Latest 5 entries</div>
                  </div>
                  <button
                    onClick={() => navigate(`/cashbook/${cashbookId}/history`)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--cd-primary)', fontWeight: 600, fontSize: '0.82rem',
                      fontFamily: 'inherit',
                    }}
                  >
                    View all →
                  </button>
                </div>

                <div className="cd-divider" style={{ marginBottom: 12 }} />

                {recentLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="cd-skeleton" style={{ height: 52, borderRadius: 12 }} />
                    ))}
                  </div>
                ) : recentTransactions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--cd-text-muted)', fontSize: '0.88rem' }}>
                    No transactions yet. Add your first entry!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {recentTransactions.map((t) => {
                      const decoded = decodeDescription(t.description || '');
                      const isInflow = t.type === 'inflow';
                      const bal = Number(t.runningBalance || 0);
                      return (
                        <div key={t.id} className="cd-row">
                          {/* Icon */}
                          <div className="cd-row-icon" style={{
                            background: isInflow ? 'var(--cd-success-bg)' : 'var(--cd-danger-bg)',
                          }}>
                            <span style={{ fontSize: '1.1rem', color: isInflow ? 'var(--cd-success)' : 'var(--cd-danger)' }}>
                              {isInflow ? '↓' : '↑'}
                            </span>
                          </div>
                          {/* Middle */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--cd-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {decoded.description || (isInflow ? 'Cash In' : 'Cash Out')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--cd-text-muted)', marginTop: 2 }}>
                              {formatDateDisplay(t.date)}
                              {decoded.category && (
                                <span style={{
                                  marginLeft: 6,
                                  background: 'rgba(108,99,255,0.15)',
                                  color: 'var(--cd-primary)',
                                  borderRadius: 999, padding: '1px 7px', fontSize: '0.68rem', fontWeight: 600,
                                }}>
                                  {decoded.category}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Amounts */}
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: '0.88rem', fontWeight: 700,
                              color: isInflow ? 'var(--cd-success)' : 'var(--cd-danger)',
                            }}>
                              {isInflow ? '+' : '-'}₹{Number(t.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                            <div style={{
                              fontSize: '0.72rem',
                              color: bal >= 0 ? 'var(--cd-success)' : 'var(--cd-danger)',
                              opacity: 0.8, marginTop: 2,
                            }}>
                              ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Inline forms */}
        {showInflow && (
          <div className="cd-card" style={{ marginBottom: 16 }}>
            <CashInflow
              cashbookId={cashbookId}
              onDone={() => {
                fetchRecentTransactions();
                setShowInflow(false);
                navigate(`/cashbook/${cashbookId}`);
              }}
            />
          </div>
        )}
        {showOutflow && (
          <div className="cd-card" style={{ marginBottom: 16 }}>
            <CashOutflow
              cashbookId={cashbookId}
              onDone={() => {
                fetchRecentTransactions();
                setShowOutflow(false);
                navigate(`/cashbook/${cashbookId}`);
              }}
            />
          </div>
        )}

        {/* Sub-routes */}
        <Routes>
          <Route path="history" element={<div><BackButton /><History cashbookId={cashbookId} /></div>} />
          <Route path="report" element={<div><BackButton /><ReportGenerator cashbookId={cashbookId} /></div>} />
          <Route path="" element={<div className="py-2" />} />
        </Routes>

        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
          type={sidebarType}
          cashbookId={cashbookId}
          onSuccess={handleSidebarSuccess}
        />
      </div>

      <BottomNavigation
        cashbookId={cashbookId}
        onInflowClick={() => handleOpenSidebar('inflow')}
        onOutflowClick={() => handleOpenSidebar('outflow')}
        activeAction={showInflow ? 'inflow' : showOutflow ? 'outflow' : null}
      />

      <CashbookAssistant
        currentCashbookId={cashbookId}
        visible={isCashbookHome && !isAddingMode}
        buttonBottomClass="bottom-24"
        panelBottomClass="bottom-32"
      />
    </div>
  );
};

/* ─── MainApp ────────────────────────────────────────────────── */
const MainApp = () => {
  const { user, isGuest, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--cd-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            background: 'var(--cd-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }} className="cd-anim-pulse">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <div style={{ color: 'var(--cd-text-soft)', fontSize: '0.9rem' }}>Loading CashDiary…</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      {isGuest && <Route path="/" element={<GuestView />} />}
      {!isGuest && (
        <>
          <Route path="/" element={<HomePage />} />
          <Route path="/cashbook/:cashbookId/*" element={<CashbookView />} />
          <Route path="/profile" element={<UserProfile />} />
        </>
      )}
      {isGuest && <Route path="*" element={<GuestView />} />}
    </Routes>
  );
};

/* ─── HomePage ───────────────────────────────────────────────── */
const HomePage = () => {
  const navigate = useNavigate();
  const [cashbooks, setCashbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openCashbookMenuId, setOpenCashbookMenuId] = useState(null);
  const menuRef = useRef(null);

  const closeCashbookMenu = () => setOpenCashbookMenuId(null);
  const toggleCashbookMenu = (id) => setOpenCashbookMenuId((prev) => (prev === id ? null : id));

  useEffect(() => { fetchCashbooks(); }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!openCashbookMenuId) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) closeCashbookMenu();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openCashbookMenuId]);

  const fetchCashbooks = async () => {
    try {
      const data = await cashbookAPI.getAll();
      setCashbooks(data);
    } catch (error) { console.error('Error fetching cashbooks:', error); }
    finally { setLoading(false); }
  };

  const handleCashbookClick = (id) => navigate(`/cashbook/${id}`);

  const handleEditCashbookName = async (cashbook) => {
    const nextName = window.prompt('Edit cashbook name:', cashbook?.name || '');
    if (nextName == null) return closeCashbookMenu();
    const trimmedName = String(nextName).trim();
    if (!trimmedName) { alert('Cashbook name cannot be empty'); return; }
    if (trimmedName === (cashbook?.name || '')) return closeCashbookMenu();
    try {
      await cashbookAPI.update(cashbook.id, { name: trimmedName });
      await fetchCashbooks();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update cashbook name');
    } finally { closeCashbookMenu(); }
  };

  const handleEditCashbookDescription = async (cashbook) => {
    const nextDescription = window.prompt('Edit cashbook description:', cashbook?.description || '');
    if (nextDescription == null) return closeCashbookMenu();
    const trimmedDescription = String(nextDescription).trim();
    if (trimmedDescription === (cashbook?.description || '')) return closeCashbookMenu();
    try {
      await cashbookAPI.update(cashbook.id, { description: trimmedDescription });
      await fetchCashbooks();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update description');
    } finally { closeCashbookMenu(); }
  };

  const handleDeleteCashbook = async (cashbook) => {
    const ok = window.confirm(`Delete "${cashbook?.name || 'this cashbook'}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await cashbookAPI.delete(cashbook.id);
      await fetchCashbooks();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete cashbook');
    } finally { closeCashbookMenu(); }
  };

  const COLORS = [
    { from: '#6C63FF', to: '#A78BFA' },
    { from: '#00C896', to: '#00A87A' },
    { from: '#FF5C5C', to: '#E04040' },
    { from: '#FFB84D', to: '#F97316' },
    { from: '#60A5FA', to: '#3B82F6' },
    { from: '#A78BFA', to: '#7C3AED' },
  ];

  return (
    <div className="cd-page">
      {/* Header */}
      <div className="cd-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="cd-logo-text">CashDiary</div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--cd-text-muted)', marginTop: 1 }}>
            {cashbooks.length} cashbook{cashbooks.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="cd-btn cd-btn-primary cd-btn-sm"
          aria-label="Create new cashbook"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 4v16m8-8H4"/>
          </svg>
          New
        </button>
      </div>

      <div style={{ padding: '8px 16px', paddingBottom: 20 }}>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="cd-skeleton" style={{ height: 120, borderRadius: 16 }} />
            ))}
          </div>
        ) : cashbooks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }} className="cd-anim-fade-up">
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📒</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cd-text)', marginBottom: 6 }}>No cashbooks yet</div>
            <div style={{ fontSize: '0.88rem', color: 'var(--cd-text-soft)', marginBottom: 24, lineHeight: 1.5 }}>
              Create your first cashbook to start tracking income & expenses
            </div>
            <button onClick={() => setIsCreateOpen(true)} className="cd-btn cd-btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 4v16m8-8H4"/>
              </svg>
              Create Cashbook
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {cashbooks.map((cashbook, idx) => {
              const color = COLORS[idx % COLORS.length];
              const initial = (cashbook.name || 'C').slice(0, 1).toUpperCase();
              const createdLabel = cashbook.created_at
                ? new Date(cashbook.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                : '';
              return (
                <div
                  key={cashbook.id}
                  onClick={() => handleCashbookClick(cashbook.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCashbookClick(cashbook.id); }}
                  className="cd-card-elevated cd-anim-fade-up"
                  style={{ cursor: 'pointer', transition: 'transform 180ms ease, box-shadow 180ms ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  {/* Top gradient strip */}
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    borderTopLeftRadius: 'var(--cd-radius)', borderTopRightRadius: 'var(--cd-radius)',
                    background: `linear-gradient(90deg, ${color.from}, ${color.to})`,
                  }} />
                  <div style={{ paddingTop: 4, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                      background: `linear-gradient(135deg, ${color.from}, ${color.to})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#fff', fontWeight: 800, fontSize: '1.1rem',
                      boxShadow: `0 6px 16px ${color.from}55`,
                    }}>
                      {initial}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cd-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cashbook.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--cd-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cashbook.description || 'No description'}
                      </div>
                    </div>
                    {/* Menu button */}
                    <div
                      ref={openCashbookMenuId === cashbook.id ? menuRef : null}
                      style={{ position: 'relative', zIndex: 50, flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        aria-label="Options"
                        onClick={() => toggleCashbookMenu(cashbook.id)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, cursor: 'pointer',
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid var(--cd-border)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--cd-text-soft)', fontSize: '1.2rem', fontFamily: 'inherit',
                        }}
                      >
                        ⋮
                      </button>
                      {openCashbookMenuId === cashbook.id && (
                        <div style={{
                          position: 'absolute', right: 0, marginTop: 4,
                          width: 180, borderRadius: 12,
                          background: 'var(--cd-surface-2)',
                          border: '1px solid var(--cd-border)',
                          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                          overflow: 'hidden', zIndex: 60,
                        }}>
                          {[
                            { label: 'Edit name', fn: () => handleEditCashbookName(cashbook) },
                            { label: 'Edit description', fn: () => handleEditCashbookDescription(cashbook) },
                          ].map((item) => (
                            <button
                              key={item.label}
                              type="button"
                              onClick={item.fn}
                              style={{
                                width: '100%', textAlign: 'left', padding: '10px 14px',
                                fontSize: '0.85rem', color: 'var(--cd-text)', background: 'none',
                                border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                borderBottom: '1px solid var(--cd-border)',
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                            >
                              {item.label}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleDeleteCashbook(cashbook)}
                            style={{
                              width: '100%', textAlign: 'left', padding: '10px 14px',
                              fontSize: '0.85rem', color: 'var(--cd-danger)', background: 'none',
                              border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,92,92,0.08)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                          >
                            Delete cashbook
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--cd-text-muted)' }}>{createdLabel ? `Created ${createdLabel}` : ''}</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: color.from }}>Open →</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setIsCreateOpen(true)}
        aria-label="New cashbook"
        style={{
          position: 'fixed', right: 20, bottom: 'calc(var(--cd-nav-h) + 20px)', zIndex: 40,
          width: 52, height: 52, borderRadius: 999, border: 'none', cursor: 'pointer',
          background: 'var(--cd-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 28px rgba(108,99,255,0.5)',
          transition: 'transform 150ms ease',
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M12 4v16m8-8H4"/>
        </svg>
      </button>

      {/* Create Modal */}
      {isCreateOpen && (
        <div className="cd-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="cd-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cd-text)' }}>New Cashbook</div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--cd-text-muted)', fontSize: '1.4rem', lineHeight: 1,
                }}
              >×</button>
            </div>
            <CreateCashbook
              onSuccess={() => {
                fetchCashbooks();
                setIsCreateOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <BottomNavigation
        cashbookId={null}
        onInflowClick={() => alert('Please select a cashbook first')}
        onOutflowClick={() => alert('Please select a cashbook first')}
        activeAction={null}
      />

      <CashbookAssistant
        currentCashbookId={null}
        visible={true}
        side="right"
        buttonBottomClass="bottom-40"
        panelBottomClass="bottom-48"
      />
    </div>
  );
};

/* ─── Theme Initializer ─────────────────────────────────────── */
const ThemeInitializer = () => {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('theme');
    const theme = stored === 'dark' || stored === 'light' ? stored : 'light';
    document.documentElement.setAttribute('data-theme', theme);
  }, []);
  return null;
};

/* ─── Root ──────────────────────────────────────────────────── */
function App() {
  return (
    <AuthProvider>
      <ThemeInitializer />
      <Router>
        <MainApp />
      </Router>
    </AuthProvider>
  );
}

export default App;
