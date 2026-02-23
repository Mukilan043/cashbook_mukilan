import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BottomNavigation = ({ cashbookId, onInflowClick, onOutflowClick, activeAction = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest, user } = useAuth();

  // Order: cashbook, inflow, outflow, manage, history, report, profile
  const navItems = [
    {
      id: 'cashbook',
      label: 'Cashbook',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      onClick: () => navigate('/'),
      active: location.pathname === '/' || location.pathname.startsWith('/cashbook/'),
    },
    {
      id: 'inflow',
      label: 'Inflow',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
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
      id: 'manage',
      label: 'Manage',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => {
        if (cashbookId) {
          navigate(`/cashbook/${cashbookId}/manage`);
        } else {
          alert('Please select a cashbook first');
        }
      },
      disabled: !cashbookId,
      active: location.pathname.includes('/manage'),
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
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
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-8 4h8a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
        <div className="w-6 h-6 rounded-full overflow-hidden border border-blue-200">
          <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
        </div>
      ) : (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: () => navigate('/profile'),
      active: location.pathname === '/profile',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-white bg-opacity-85 border-t border-gray-200 shadow-2xl backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        <div className="grid grid-cols-7 gap-1 px-1 py-2 max-w-6xl mx-auto">
          {navItems.map((item) => {
            const isActive = !!item.active;
            const filledGradientClass =
              item.id === 'inflow'
                ? 'from-green-600 via-emerald-600 to-green-700'
                : item.id === 'outflow'
                  ? 'from-red-600 via-rose-600 to-red-700'
                  : 'from-blue-600 via-indigo-600 to-purple-600';

            return (
              <button
                key={item.id}
                onClick={item.onClick}
                disabled={item.disabled}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={
                  `relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : isActive
                        ? 'text-white shadow-lg'
                        : 'text-gray-700 hover:bg-white hover:bg-opacity-70'
                  }`
                }
              >
                {isActive && (
                  <>
                    <span className={`absolute inset-0 rounded-xl bg-gradient-to-r ${filledGradientClass}`} />
                    <span
                      className={`absolute inset-0 rounded-xl opacity-25 blur-xl cb-anim-soft-pulse ${
                        item.id === 'inflow'
                          ? 'bg-green-500'
                          : item.id === 'outflow'
                            ? 'bg-red-500'
                            : 'bg-blue-500'
                      }`}
                    />
                  </>
                )}

                <span className={isActive ? 'relative cb-anim-nav-pop' : 'relative'}>
                  {item.icon}
                </span>
                <span className={`relative text-[11px] mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
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

