import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import BalanceDisplay from './components/BalanceDisplay';
import Sidebar from './components/Sidebar';
import CashInflow from './components/CashInflow';
import CashOutflow from './components/CashOutflow';
import TransactionList from './components/TransactionList';
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
import { transactionAPI } from './services/api';
import CashbookAssistant from './components/CashbookAssistant';

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
    if (cashbookId && !isGuest) {
      fetchCashbook();
    }
    if (!isGuest) {
      fetchCashbooks();
    }
  }, [cashbookId, isGuest]);

  useEffect(() => {
    if (!cashbookId || isGuest) return;
    fetchRecentTransactions();
  }, [cashbookId, isGuest]);

  const fetchRecentTransactions = async () => {
    if (!cashbookId) return;
    try {
      setRecentLoading(true);
      const data = await transactionAPI.getAll(cashbookId, {
        sortBy: 'date',
        sortOrder: 'ASC',
      });
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
        if (t.type === 'inflow') {
          balance += amount;
        } else {
          balance -= amount;
        }
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

  // Close inflow/outflow panel when navigating to other pages (history/manage/report)
  useEffect(() => {
    if (!cashbookId) return;
    const path = location.pathname;
    const shouldCloseInlinePanels =
      path.includes('/manage') ||
      path.includes('/history') ||
      path.includes('/report');

    if (shouldCloseInlinePanels && (showInflow || showOutflow)) {
      setShowInflow(false);
      setShowOutflow(false);
    }
  }, [location.pathname, cashbookId, showInflow, showOutflow]);

  const fetchCashbooks = async () => {
    try {
      const data = await cashbookAPI.getAll();
      setCashbooks(data);
      if (cashbookId) {
        const found = data.find(cb => cb.id === parseInt(cashbookId));
        setSelectedCashbook(found);
      }
    } catch (error) {
      console.error('Error fetching cashbooks:', error);
    }
  };

  const fetchCashbook = async () => {
    try {
      const data = await cashbookAPI.getById(cashbookId);
      setSelectedCashbook(data);
    } catch (error) {
      console.error('Error fetching cashbook:', error);
    }
  };

  const handleOpenSidebar = (type) => {
    if (isGuest) {
      alert('Please login to add transactions');
      return;
    }
    if (!cashbookId) {
      alert('Please select a cashbook first');
      return;
    }

    // Ensure only one view is open at a time
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
    // Refresh transactions if on manage/history page
    window.location.reload();
  };

  const handleCashbookChange = (e) => {
    const id = e.target.value;
    if (id) {
      navigate(`/cashbook/${id}`);
    }
  };


  if (isGuest) {
    return <GuestView />;
  }

  return (
    <div 
      className="min-h-screen bg-gray-100 pb-20"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bg-black bg-opacity-65 min-h-screen">
        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white drop-shadow-lg">
              Cash Book Application
            </h1>
            
            {/* Cashbook Selector */}
            <div className="mb-4">
              <label htmlFor="cashbook-select" className="block text-sm font-medium text-white mb-2 drop-shadow">
                Select Cashbook:
              </label>
              <select
                id="cashbook-select"
                value={cashbookId || ''}
                onChange={handleCashbookChange}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Select Cashbook --</option>
                {cashbooks.map((cb) => (
                  <option key={cb.id} value={cb.id}>
                    {cb.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isAddingMode && (
            <>
              {/* Balance Display */}
              <div className="mb-6">
                <BalanceDisplay cashbookId={cashbookId} />
              </div>

              {/* Recent Transactions (latest 5) */}
              {cashbookId && isCashbookHome && (
                <div className="mb-6">
                  <div className="bg-white bg-opacity-90 backdrop-blur rounded-2xl shadow-2xl border border-white border-opacity-30 overflow-hidden">
                    <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Transactions</h3>
                        <p className="text-xs text-gray-600">Latest 5 inflow/outflow entries</p>
                      </div>
                      <button
                        onClick={() => navigate(`/cashbook/${cashbookId}/history`)}
                        className="text-sm font-semibold text-indigo-700 hover:text-indigo-800"
                      >
                        View all
                      </button>
                    </div>

                    <div className="border-t border-gray-200" />

                    {recentLoading ? (
                      <div className="px-4 sm:px-6 py-4 text-sm text-gray-600">Loading…</div>
                    ) : recentTransactions.length === 0 ? (
                      <div className="px-4 sm:px-6 py-6 text-sm text-gray-600">
                        No recent transactions yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                              <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Description</th>
                              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {recentTransactions.map((t) => {
                              const decoded = decodeDescription(t.description || '');
                              return (
                                <tr key={t.id} className="hover:bg-gray-50">
                                  <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{t.date}</td>
                                  <td className="px-2 sm:px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      t.type === 'inflow'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 text-sm font-medium text-gray-900 text-right tabular-nums whitespace-nowrap">
                                    Rs {Number(t.amount || 0).toFixed(2)}
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 text-sm text-gray-500 hidden sm:table-cell text-center">
                                    <div className="flex items-center justify-center gap-2 flex-wrap">
                                      {decoded.category && (
                                        <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                                          {decoded.category}
                                        </span>
                                      )}
                                      <span>{decoded.description || '-'}</span>
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 text-sm font-semibold text-right tabular-nums whitespace-nowrap">
                                    {(() => {
                                      const bal = Number(t.runningBalance || 0);
                                      return (
                                        <span className={bal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                                          Rs {bal.toFixed(2)}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Inline Inflow / Outflow panels */}
          {showInflow && (
            <div className="mb-6">
              <div className="bg-white bg-opacity-95 rounded-lg shadow p-4">
                <CashInflow
                  cashbookId={cashbookId}
                  onDone={() => {
                    fetchRecentTransactions();
                    setShowInflow(false);
                    navigate(`/cashbook/${cashbookId}`);
                  }}
                />
              </div>
            </div>
          )}
          {showOutflow && (
            <div className="mb-6">
              <div className="bg-white bg-opacity-95 rounded-lg shadow p-4">
                <CashOutflow
                  cashbookId={cashbookId}
                  onDone={() => {
                    fetchRecentTransactions();
                    setShowOutflow(false);
                    navigate(`/cashbook/${cashbookId}`);
                  }}
                />
              </div>
            </div>
          )}

          {/* Routes */}
          <Routes>
            <Route 
              path="manage" 
              element={
                <div>
                  <BackButton />
                  <TransactionList cashbookId={cashbookId} />
                </div>
              } 
            />
            <Route 
              path="history" 
              element={
                <div>
                  <BackButton />
                  <History cashbookId={cashbookId} />
                </div>
              } 
            />
            <Route 
              path="report" 
              element={
                <div>
                  <BackButton />
                  <ReportGenerator cashbookId={cashbookId} />
                </div>
              } 
            />
            <Route 
              path="" 
              element={
                <div className="py-2" />
              } 
            />
          </Routes>

          {/* Sidebar */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={handleCloseSidebar}
            type={sidebarType}
            cashbookId={cashbookId}
            onSuccess={handleSidebarSuccess}
          />

          {/* Bottom Navigation */}
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
      </div>
    </div>
  );
};

const MainApp = () => {
  const { user, isGuest, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Guest Route */}
      {isGuest && <Route path="/" element={<GuestView />} />}
      
      {/* Protected Routes */}
      {!isGuest && (
        <>
          <Route path="/" element={<HomePage />} />
          <Route path="/cashbook/:cashbookId/*" element={<CashbookView />} />
          <Route path="/profile" element={<UserProfile />} />
        </>
      )}
      
      {/* Redirect guest users */}
      {isGuest && <Route path="*" element={<GuestView />} />}
    </Routes>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const [cashbooks, setCashbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [openCashbookMenuId, setOpenCashbookMenuId] = useState(null);
  const menuRef = useRef(null);

  const closeCashbookMenu = () => setOpenCashbookMenuId(null);
  const toggleCashbookMenu = (id) => setOpenCashbookMenuId((prev) => (prev === id ? null : id));

  useEffect(() => {
    fetchCashbooks();
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!openCashbookMenuId) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        closeCashbookMenu();
      }
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [openCashbookMenuId]);

  const fetchCashbooks = async () => {
    try {
      const data = await cashbookAPI.getAll();
      setCashbooks(data);
    } catch (error) {
      console.error('Error fetching cashbooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCashbookClick = (id) => {
    navigate(`/cashbook/${id}`);
  };

  const handleEditCashbookName = async (cashbook) => {
    const nextName = window.prompt('Edit cashbook name:', cashbook?.name || '');
    if (nextName == null) return closeCashbookMenu();

    const trimmedName = String(nextName).trim();
    if (!trimmedName) {
      alert('Cashbook name cannot be empty');
      return;
    }
    if (trimmedName === (cashbook?.name || '')) return closeCashbookMenu();

    try {
      await cashbookAPI.update(cashbook.id, { name: trimmedName });
      await fetchCashbooks();
      alert('Cashbook name updated successfully');
    } catch (error) {
      console.error('Error updating cashbook name:', error);
      alert(error.response?.data?.error || 'Failed to update cashbook name');
    } finally {
      closeCashbookMenu();
    }
  };

  const handleEditCashbookDescription = async (cashbook) => {
    const nextDescription = window.prompt(
      'Edit cashbook description (leave blank for none):',
      cashbook?.description || ''
    );
    if (nextDescription == null) return closeCashbookMenu();

    const trimmedDescription = String(nextDescription).trim();
    if (trimmedDescription === (cashbook?.description || '')) return closeCashbookMenu();

    try {
      await cashbookAPI.update(cashbook.id, { description: trimmedDescription });
      await fetchCashbooks();
      alert('Cashbook description updated successfully');
    } catch (error) {
      console.error('Error updating cashbook description:', error);
      alert(error.response?.data?.error || 'Failed to update cashbook description');
    } finally {
      closeCashbookMenu();
    }
  };

  const handleDeleteCashbook = async (cashbook) => {
    const ok = window.confirm(`Delete "${cashbook?.name || 'this cashbook'}"? This cannot be undone.`);
    if (!ok) return;
    try {
      await cashbookAPI.delete(cashbook.id);
      await fetchCashbooks();
      alert('Cashbook deleted successfully');
    } catch (error) {
      console.error('Error deleting cashbook:', error);
      alert(error.response?.data?.error || 'Failed to delete cashbook');
    } finally {
      closeCashbookMenu();
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-100 pb-20"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="bg-black bg-opacity-60 min-h-screen">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-8 sm:py-10 relative">
          {/* ambient glow */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -left-20 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-blue-500 opacity-20 blur-3xl cb-anim-float" />
            <div className="absolute top-32 -right-24 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full bg-indigo-500 opacity-20 blur-3xl cb-anim-float-slow" />
          </div>

          <div className="mb-6 sm:mb-8 relative cb-anim-fade-in-up">
            <div className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-2xl shadow-2xl backdrop-blur p-5 sm:p-7 cb-anim-shimmer">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h1 className="text-3xl sm:text-5xl font-extrabold text-white drop-shadow">
                    Cash Book Application
                  </h1>
                  <p className="text-white text-opacity-90 mt-2 sm:mt-3 text-sm sm:text-base">
                    Pick a cashbook to open, or create a new one.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-4 py-2 rounded-xl bg-white bg-opacity-10 border border-white border-opacity-20 text-white text-sm">
                    <span className="font-semibold">{cashbooks.length}</span> cashbook{cashbooks.length === 1 ? '' : 's'}
                  </div>
                  <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-xl border border-white border-opacity-20 backdrop-blur bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    aria-label="Create new cashbook"
                    title="New Cashbook"
                  >
                    <span className="inline-flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Cashbook
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 sm:mt-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur"
                  >
                    <div className="h-4 w-2/3 bg-white bg-opacity-20 rounded mb-4" />
                    <div className="h-3 w-full bg-white bg-opacity-10 rounded mb-2" />
                    <div className="h-3 w-5/6 bg-white bg-opacity-10 rounded" />
                    <div className="mt-6 flex items-center justify-between">
                      <div className="h-3 w-1/2 bg-white bg-opacity-10 rounded" />
                      <div className="h-3 w-12 bg-white bg-opacity-10 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : cashbooks.length === 0 ? (
            <div className="mt-6 sm:mt-8">
              <div className="bg-white bg-opacity-10 border border-white border-opacity-20 rounded-2xl shadow-2xl backdrop-blur p-8 sm:p-10 text-center">
                <div className="text-4xl sm:text-5xl mb-3">📚</div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow mb-2">No cashbooks yet</h2>
                <p className="text-white text-opacity-90">Tap <span className="font-semibold">New Cashbook</span> to create your first cashbook.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {cashbooks.map((cashbook) => {
                const createdLabel = cashbook.created_at
                  ? new Date(cashbook.created_at).toLocaleDateString()
                  : '';
                const initial = (cashbook.name || 'C').slice(0, 1).toUpperCase();

                return (
                  <div
                    key={cashbook.id}
                    onClick={() => handleCashbookClick(cashbook.id)}
                    className="group cursor-pointer cb-anim-fade-in-up"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') handleCashbookClick(cashbook.id);
                    }}
                  >
                    <div className="relative bg-white bg-opacity-95 rounded-2xl shadow-xl border border-white border-opacity-40 overflow-visible transform transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-2xl">
                      {/* premium ring */}
                      <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black ring-opacity-5" />

                      {/* top accent */}
                      <div className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

                      {/* hover shine */}
                      <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <div className="absolute -inset-y-8 -left-1/2 w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/35 to-transparent cb-anim-shimmer" />
                      </div>

                      <div className="p-5 sm:p-6 relative">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-blue-500 opacity-10 blur-2xl" />
                          <div className="absolute -bottom-20 -left-20 w-52 h-52 rounded-full bg-indigo-500 opacity-10 blur-2xl" />
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-extrabold shadow-sm border border-blue-200">
                            {initial}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg sm:text-xl font-extrabold text-gray-900 truncate">
                              {cashbook.name}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {cashbook.description || 'No description'}
                            </p>
                          </div>

                          {/* Per-cashbook menu */}
                          <div
                            ref={openCashbookMenuId === cashbook.id ? menuRef : null}
                            className="relative z-50 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              aria-label="Cashbook options"
                              title="Options"
                              className="w-9 h-9 rounded-lg bg-white bg-opacity-90 border border-gray-200 shadow-sm hover:bg-opacity-100 flex items-center justify-center text-gray-700"
                              onClick={() => toggleCashbookMenu(cashbook.id)}
                            >
                              <span className="text-xl leading-none">⋮</span>
                            </button>

                            {openCashbookMenuId === cashbook.id && (
                              <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-gray-200 shadow-lg overflow-hidden z-50">
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                  onClick={() => handleEditCashbookName(cashbook)}
                                >
                                  Edit cashbook name
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                                  onClick={() => handleEditCashbookDescription(cashbook)}
                                >
                                  Edit description
                                </button>
                                <button
                                  type="button"
                                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteCashbook(cashbook)}
                                >
                                  Delete cashbook
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between gap-3">
                          <div className="text-xs sm:text-sm text-gray-500 truncate">
                            {createdLabel ? `Created: ${createdLabel}` : ' '}
                          </div>
                          <div className="text-blue-700 font-semibold text-sm transform transition-transform duration-200 group-hover:translate-x-0.5">
                            Open <span className="inline-block transform transition-transform duration-200 group-hover:translate-x-0.5">→</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Floating + Add Cashbook (above bottom nav) */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="group fixed right-4 bottom-24 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 ring-4 ring-blue-200 ring-opacity-30"
            aria-label="Add new cashbook"
            title="New Cashbook"
          >
            <span className="pointer-events-none absolute right-full mr-3 px-3 py-1 rounded-lg text-xs font-semibold bg-black bg-opacity-70 text-white opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity whitespace-nowrap">
              New Cashbook
            </span>
            <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping" />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-7 h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>

          {/* Create Cashbook Modal */}
          {isCreateOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black bg-opacity-60" onClick={() => setIsCreateOpen(false)} />
              <div className="relative z-10 w-full max-w-lg">
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setIsCreateOpen(false)}
                    className="text-white text-3xl leading-none"
                    aria-label="Close"
                    title="Close"
                  >
                    ×
                  </button>
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

          {/* Bottom Navigation */}
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
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainApp />
      </Router>
    </AuthProvider>
  );
}

export default App;
