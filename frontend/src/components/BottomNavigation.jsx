import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const BottomNavigation = ({ cashbookId, onInflowClick, onOutflowClick, activeAction = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isGuest, user } = useAuth();

  const navItems = [
    {
      id: 'cashbook',
      label: 'Home',
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      onClick: () => navigate('/'),
      active: location.pathname === '/' || location.pathname.startsWith('/cashbook/'),
      colorClass: '',
    },
    {
      id: 'inflow',
      label: 'Money In',
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
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
      colorClass: 'nav-inflow',
    },
    {
      id: 'outflow',
      label: 'Money Out',
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
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
      colorClass: 'nav-outflow',
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      colorClass: '',
    },
    {
      id: 'report',
      label: 'Report',
      icon: (
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      colorClass: '',
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: user?.profile_image ? (
        <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(108,99,255,0.5)' }}>
          <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      ) : (
        <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      onClick: () => navigate('/profile'),
      active: location.pathname === '/profile',
      colorClass: '',
    },
  ];

  return (
    <nav className="cd-bottom-nav">
      <div style={{ display: 'flex', width: '100%', margin: '0 auto' }}>
        {navItems.map((item) => {
          const isActive = !!item.active;
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              disabled={item.disabled}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`cd-nav-item flex flex-col items-center justify-center flex-1 h-full cursor-pointer border-none bg-transparent transition-colors ${isActive ? `active ${item.colorClass}` : 'text-gray-500'} ${item.disabled ? 'disabled' : ''}`}
            >
              <div className="cd-nav-icon-wrap w-12 h-8 flex items-center justify-center rounded-full transition-colors">
                {item.icon}
              </div>
              <div className={`mt-1 text-[10px] ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;
