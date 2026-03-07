import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BottomNavigation = ({ cashbookId, onInflowClick, onOutflowClick, activeAction = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest, user } = useAuth();

  const iconSizeClass = 'w-8 h-8';

  // Order: cashbook, inflow, outflow, history, report, profile
  const navItems = [
    {
      id: 'cashbook',
      label: 'Cashbook',
      icon: (
        <svg className={iconSizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      iconActive: (
        <svg className={iconSizeClass} fill="currentColor" viewBox="0 0 24 24">
          <rect x="5" y="3" width="14" height="18" rx="2.2" />
          <rect x="8" y="8" width="8" height="2" rx="1" fill="#0b0a0a" fillOpacity="0.9" />
          <rect x="8" y="12" width="8" height="2" rx="1" fill="#090909" fillOpacity="0.9" />
        </svg>
      ),
      onClick: () => navigate('/'),
      active: location.pathname === '/' || location.pathname.startsWith('/cashbook/'),
    },
    {
      id: 'inflow',
      label: 'Inflow',
      icon: (
        <svg className={iconSizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      iconActive: (
        <svg className={iconSizeClass} fill="currentColor" viewBox="0 0 24 24">
          <path d="M11 5h2v14h-2zM5 11h14v2H5z" />
        </svg>
      ),
      onClick: () => {
        if (!isGuest && cashbookId) {
          onInflowClick();
        } else if (isGuest) {
          alert('Please login to add transactions');
        } else {
          alert('Please select a cashbook first');
        }
      },
      disabled: isGuest || !cashbookId,
      active: activeAction === 'inflow',
    },
    {
      id: 'outflow',
      label: 'Outflow',
      icon: (
        <svg className={iconSizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      ),
      iconActive: (
        <svg className={iconSizeClass} fill="currentColor" viewBox="0 0 24 24">
          <rect x="5" y="11" width="14" height="2" rx="1" />
        </svg>
      ),
      onClick: () => {
        if (!isGuest && cashbookId) {
          onOutflowClick();
        } else if (isGuest) {
          alert('Please login to add transactions');
        } else {
          alert('Please select a cashbook first');
        }
      },
      disabled: isGuest || !cashbookId,
      active: activeAction === 'outflow',
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg className={iconSizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconActive: (
        <svg className={iconSizeClass} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M11 7h2v6l4 2-1 1.8-5-2.6V7z" fill="#0f0e0e" fillOpacity="0.9" />
        </svg>
      ),
      onClick: () => {
        if (cashbookId) {
          navigate(`/cashbook/${cashbookId}/history`);
        } else {
          alert('Please select a cashbook first');
        }
      },
      disabled: !cashbookId,
      active: location.pathname.includes('/history'),
    },
    {
      id: 'report',
      label: 'Report',
      icon: (
        <svg className={iconSizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-8 4h8a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      iconActive: (
        <svg className={iconSizeClass} fill="currentColor" viewBox="0 0 24 24">
          <rect x="5" y="4" width="14" height="16" rx="2.2" />
          <rect x="8" y="9" width="8" height="2" rx="1" fill="#080808" fillOpacity="0.9" />
          <rect x="8" y="13" width="8" height="2" rx="1" fill="#0c0c0c" fillOpacity="0.9" />
        </svg>
      ),
      onClick: () => {
        if (cashbookId) {
          navigate(`/cashbook/${cashbookId}/report`);
        } else {
          alert('Please select a cashbook first');
        }
      },
      disabled: !cashbookId,
      active: location.pathname.includes('/report'),
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: user?.profile_image ? (
        <div className="w-7 h-7 rounded-full overflow-hidden border border-blue-200">
          <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
        </div>
      ) : (
        <svg className={iconSizeClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      iconActive: user?.profile_image ? (
        <div className="w-7 h-7 rounded-full overflow-hidden border-2 border-white">
          <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
        </div>
      ) : (
        <svg className={iconSizeClass} fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0v1H4v-1z" />
        </svg>
      ),
      onClick: () => navigate('/profile'),
      active: location.pathname === '/profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white bg-opacity-90 border-t border-gray-200 shadow-2xl backdrop-blur">
        <div className="h-1.5 bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600" />

        <div className="grid grid-cols-6 gap-2 px-2 py-3 max-w-6xl mx-auto">
          {navItems.map((item) => {
            const isActive = !!item.active;
            const filledGradientClass =
              item.id === 'inflow'
                ? 'from-emerald-500 via-green-500 to-emerald-600'
                : item.id === 'outflow'
                  ? 'from-rose-500 via-red-500 to-rose-600'
                  : item.id === 'cashbook'
                    ? 'from-teal-500 via-cyan-500 to-sky-500'
                    : item.id === 'history'
                      ? 'from-violet-500 via-indigo-500 to-purple-600'
                      : item.id === 'report'
                        ? 'from-blue-500 via-indigo-500 to-sky-600'
                        : 'from-blue-500 via-sky-500 to-indigo-600';

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={item.disabled}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={
                  `group cb-nav-hover relative flex flex-col items-center justify-center p-3 rounded-2xl transition-all duration-300 ease-out ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isActive
                        ? 'text-white shadow-xl cb-anim-tab-rise'
                        : 'text-slate-900 hover:bg-white hover:bg-opacity-80'
                  }`
                }
              >
                {isActive && (
                  <>
                    <span className={`absolute inset-0 rounded-xl bg-gradient-to-r ${filledGradientClass} cb-anim-tab-sweep`} />
                    <span
                      className={`absolute -inset-1 rounded-2xl opacity-40 blur-2xl cb-anim-soft-pulse ${
                        item.id === 'inflow'
                          ? 'bg-emerald-400'
                          : item.id === 'outflow'
                            ? 'bg-rose-400'
                            : item.id === 'cashbook'
                              ? 'bg-cyan-400'
                              : item.id === 'history'
                                ? 'bg-violet-400'
                                : item.id === 'report'
                                  ? 'bg-blue-400'
                                  : 'bg-sky-400'
                      }`}
                    />
                  </>
                )}

                <span className={isActive ? 'relative cb-anim-nav-pop cb-nav-icon' : 'relative cb-nav-icon'}>
                  {item.icon}
                </span>

                <span
                  className="cb-nav-tooltip opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0"
                >
                  {item.label}
                </span>

                {isActive && (
                  <span className="relative mt-1 w-8 h-0.5 rounded-full bg-white opacity-90" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNavigation;

