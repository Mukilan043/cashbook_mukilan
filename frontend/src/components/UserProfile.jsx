import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cashbookAPI } from '../services/api';
import { authAPI } from '../services/api';
import { format } from 'date-fns';
import BottomNavigation from './BottomNavigation';

const UserProfile = () => {
  const { user, logout, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [cashbooks, setCashbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', mobile: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);
  const [openCashbookMenuId, setOpenCashbookMenuId] = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const menuRef = useRef(null);
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = localStorage.getItem('theme');
    return stored === 'dark' || stored === 'light' ? stored : 'light';
  });
  const isDark = theme === 'dark';

  const closeCashbookMenu = () => setOpenCashbookMenuId(null);
  const toggleCashbookMenu = (id) => setOpenCashbookMenuId((prev) => (prev === id ? null : id));

  useEffect(() => {
    fetchCashbooks();
    if (user) {
      setEditForm({ username: user.username || '', mobile: user.mobile || '' });
      setProfilePreview(user.profile_image || '');
    }
  }, [user]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  const handleEdit = () => { setEditing(true); setMessage({ type: '', text: '' }); };
  const handleCancel = () => {
    setEditing(false);
    setEditForm({ username: user?.username || '', mobile: user?.mobile || '' });
    setMessage({ type: '', text: '' });
  };
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleProfileImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMessage({ type: 'error', text: 'Please select an image file' }); return; }
    if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: 'Image too large (max 2MB)' }); return; }
    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setProfilePreview(String(base64));
      await authAPI.updateProfile({ profile_image: base64 });
      await fetchUser();
      setMessage({ type: 'success', text: 'Profile photo updated!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload image' });
    } finally { setUploading(false); e.target.value = ''; }
  };

  const handleSave = async () => {
    if (!editForm.username.trim() || !editForm.mobile.trim()) {
      setMessage({ type: 'error', text: 'Username and mobile are required' }); return;
    }
    try {
      await authAPI.updateProfile(editForm);
      setMessage({ type: 'success', text: 'Profile updated!' });
      await fetchUser();
      setTimeout(() => { setEditing(false); setMessage({ type: '', text: '' }); }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to update profile' });
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleThemeToggle = () => {
    const next = isDark ? 'light' : 'dark';
    setTheme(next);
    if (typeof window !== 'undefined') localStorage.setItem('theme', next);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.classList.add('theme-transition');
      window.setTimeout(() => root.classList.remove('theme-transition'), 300);
    }
  };

  const handleEditCashbookName = async (cashbook) => {
    const nextName = window.prompt('Edit cashbook name:', cashbook?.name || '');
    if (nextName == null) return closeCashbookMenu();
    const trimmedName = String(nextName).trim();
    if (!trimmedName) { alert('Name cannot be empty'); return; }
    if (trimmedName === cashbook?.name) return closeCashbookMenu();
    try {
      await cashbookAPI.update(cashbook.id, { name: trimmedName });
      await fetchCashbooks();
    } catch (error) { alert(error.response?.data?.error || 'Failed'); }
    finally { closeCashbookMenu(); }
  };

  const handleDeleteCashbook = async (cashbook) => {
    const ok = window.confirm(`Delete "${cashbook?.name}"? Cannot be undone.`);
    if (!ok) return;
    try {
      await cashbookAPI.delete(cashbook.id);
      await fetchCashbooks();
    } catch (error) { alert(error.response?.data?.error || 'Failed'); }
    finally { closeCashbookMenu(); }
  };

  if (loading) {
    return (
      <div className="cd-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: 0 }}>
        <div style={{ color: 'var(--cd-text-soft)', fontSize: '0.9rem' }}>Loading profile…</div>
      </div>
    );
  }

  const initial = (user?.username || 'U').slice(0, 1).toUpperCase();

  return (
    <>
      <div className="cd-page">
        {/* Header */}
        <div className="cd-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="cd-logo-text">Profile</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--cd-text-soft)' }}>{isDark ? '🌙' : '☀️'}</span>
            <button
              type="button"
              onClick={handleThemeToggle}
              aria-label="Toggle dark mode"
              aria-pressed={isDark}
              className={`cb-theme-toggle${isDark ? ' cb-theme-toggle--dark' : ''}`}
            >
              <span className="cb-theme-toggle__thumb" />
            </button>
          </div>
        </div>

        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Profile hero card */}
          <div className="cd-balance-card cd-anim-fade-up" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Gradient banner */}
            <div style={{
              height: 72, background: 'var(--cd-primary)',
              position: 'relative',
            }}>
              {/* Change photo button */}
              <label style={{
                position: 'absolute', top: 12, right: 12,
                background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999, padding: '5px 12px',
                fontSize: '0.72rem', fontWeight: 600, color: '#fff',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                {uploading ? 'Uploading…' : 'Photo'}
                <input type="file" accept="image/*" onChange={handleProfileImagePick} className="hidden" disabled={uploading} style={{ display: 'none' }} />
              </label>
            </div>
            {/* Avatar */}
            <div style={{ padding: '0 20px 20px', position: 'relative' }}>
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                border: '4px solid var(--cd-surface-2)',
                background: 'var(--cd-surface-3)',
                marginTop: -36, marginBottom: 10,
                position: 'relative',
              }}>
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.8rem', fontWeight: 800, color: 'var(--cd-primary)',
                    background: 'rgba(108,99,255,0.15)',
                  }}>
                    {initial}
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--cd-text)' }}>{user?.username}</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--cd-text-soft)', marginTop: 2 }}>{user?.email}</div>
            </div>
          </div>

          {/* Alerts */}
          {message.text && (
            <div className={`cd-alert ${message.type === 'success' ? 'cd-alert-success' : 'cd-alert-danger'}`}>
              {message.text}
            </div>
          )}

          {/* Credentials Card */}
          <div className="cd-card cd-anim-fade-up">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div className="cd-section-title">Your Details</div>
              {!editing && (
                <button onClick={handleEdit} className="cd-btn cd-btn-ghost cd-btn-sm">
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="cd-label">Username *</label>
                  <input
                    type="text" name="username" value={editForm.username}
                    onChange={handleChange} className="cd-input"
                  />
                </div>
                <div>
                  <label className="cd-label">Mobile *</label>
                  <input
                    type="tel" name="mobile" value={editForm.mobile}
                    onChange={handleChange} className="cd-input"
                  />
                </div>
                <div>
                  <label className="cd-label">Email (cannot change)</label>
                  <input type="email" value={user?.email || ''} disabled className="cd-input" />
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button onClick={handleSave} className="cd-btn cd-btn-success" style={{ flex: 1 }}>Save</button>
                  <button onClick={handleCancel} className="cd-btn cd-btn-ghost" style={{ flex: 1 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Username', value: user?.username },
                  { label: 'Email', value: user?.email },
                  { label: 'Mobile', value: user?.mobile },
                  { label: 'Member Since', value: user?.created_at ? format(new Date(user.created_at), 'MMMM dd, yyyy') : '—' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--cd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--cd-text)', textAlign: 'right' }}>{item.value || '—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cashbooks */}
          <div className="cd-card cd-anim-fade-up">
            <div className="cd-section-title" style={{ marginBottom: 14 }}>
              Your Cashbooks
              <span style={{
                marginLeft: 8, fontSize: '0.75rem', fontWeight: 600,
                background: 'rgba(108,99,255,0.15)', color: 'var(--cd-primary)',
                borderRadius: 999, padding: '2px 9px',
              }}>{cashbooks.length}</span>
            </div>

            {cashbooks.length === 0 ? (
              <div style={{ color: 'var(--cd-text-muted)', fontSize: '0.85rem', textAlign: 'center', paddingTop: 8 }}>
                No cashbooks yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cashbooks.map((cashbook) => (
                  <div
                    key={cashbook.id}
                    onClick={() => navigate(`/cashbook/${cashbook.id}`)}
                    style={{
                      background: 'var(--cd-surface-3)',
                      border: '1px solid var(--cd-border)',
                      borderRadius: 12, padding: '12px 14px',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(108,99,255,0.35)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--cd-border)'}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                      background: 'rgba(108,99,255,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.95rem', fontWeight: 800, color: 'var(--cd-primary)',
                    }}>
                      {cashbook.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--cd-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cashbook.name}
                      </div>
                      {cashbook.description && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--cd-text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cashbook.description}
                        </div>
                      )}
                    </div>
                    <div style={{ color: 'var(--cd-text-muted)', fontSize: '0.85rem' }}>→</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Logout */}
          <div className="cd-anim-fade-up" style={{ paddingBottom: 16 }}>
            <button
              onClick={handleLogout}
              className="cd-btn cd-btn-danger cd-btn-full"
              style={{ borderRadius: 14 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <BottomNavigation
        cashbookId={null}
        onInflowClick={() => alert('Please select a cashbook first')}
        onOutflowClick={() => alert('Please select a cashbook first')}
        activeAction={null}
      />
    </>
  );
};

export default UserProfile;
