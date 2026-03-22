import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    const result = await login(formData.identifier, formData.password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleForgotVerify = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!forgotEmail) { setError('Email is required'); return; }
    try {
      setLoading(true);
      await authAPI.forgotPasswordVerify(forgotEmail);
      setForgotStep(2);
      setInfo('Email verified. Please set a new password.');
    } catch (err) {
      if (err.response?.status === 404) setError('Email not registered.');
      else setError(err.response?.data?.error || 'Failed to verify email.');
    } finally { setLoading(false); }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!newPassword || !confirmPassword) { setError('Please enter and confirm your new password'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    try {
      setLoading(true);
      await authAPI.resetPassword(forgotEmail, newPassword);
      setInfo('Password updated! Please login with your new password.');
      setShowForgot(false);
      setForgotStep(1);
      setNewPassword('');
      setConfirmPassword('');
      setFormData({ identifier: forgotEmail, password: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally { setLoading(false); }
  };

  const openForgot = () => {
    setShowForgot(true); setForgotStep(1); setError(''); setInfo('');
    const looksLikeEmail = formData.identifier.includes('@');
    setForgotEmail(looksLikeEmail ? formData.identifier : '');
    setNewPassword(''); setConfirmPassword(''); setShowResetPassword(false);
  };

  const closeForgot = () => {
    setShowForgot(false); setForgotStep(1); setError(''); setInfo('');
    setForgotEmail(''); setNewPassword(''); setConfirmPassword(''); setShowResetPassword(false);
  };

  return (
    <div className="cd-auth-page">
      <div className="cd-auth-card cd-anim-scale-pop">
        {/* Logo */}
        <div className="cd-auth-logo-wrap">
          <div className="cd-auth-logo-icon" style={{ overflow: 'hidden', padding: 0 }}>
            <img src="/cdlogo.png" alt="CashDiary Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div className="cd-logo-text" style={{ fontSize: '1.5rem' }}>CashDiary</div>
            <div className="cd-auth-subtitle">
              {showForgot ? 'Reset your password' : 'Sign in to your account'}
            </div>
          </div>
        </div>

        {/* Alerts */}
        {info && <div className="cd-alert cd-alert-success" style={{ marginBottom: 16 }}>{info}</div>}
        {error && <div className="cd-alert cd-alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        {showForgot ? (
          <form onSubmit={forgotStep === 1 ? handleForgotVerify : handleForgotReset} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="cd-label">Email address</label>
            <label className="cd-input-group">
              <span className="cd-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
                </svg>
              </span>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={loading || forgotStep === 2}
                placeholder="your@email.com"
                style={{ color: 'var(--cd-text)' }}
              />
            </label>

            {forgotStep === 2 && (
              <>
                <label className="cd-label">New password</label>
                <label className="cd-input-group">
                  <span className="cd-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>
                    </svg>
                  </span>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="New password"
                    style={{ color: 'var(--cd-text)' }}
                  />
                </label>

                <label className="cd-label">Confirm password</label>
                <label className="cd-input-group">
                  <span className="cd-input-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>
                    </svg>
                  </span>
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Confirm password"
                    style={{ color: 'var(--cd-text)' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.83rem', color: 'var(--cd-text-soft)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={showResetPassword}
                    onChange={(e) => setShowResetPassword(e.target.checked)}
                    disabled={loading}
                  />
                  Show password
                </label>
              </>
            )}

            <button type="submit" disabled={loading} className="cd-btn cd-btn-primary cd-btn-full" style={{ marginTop: 4 }}>
              {loading
                ? (forgotStep === 1 ? 'Verifying…' : 'Updating…')
                : (forgotStep === 1 ? 'Verify Email' : 'Update Password')}
            </button>
            <button type="button" onClick={closeForgot} disabled={loading} className="cd-btn cd-btn-ghost cd-btn-full">
              Cancel
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="cd-label">Email / Phone / Username</label>
            <label className="cd-input-group">
              <span className="cd-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
                  <path d="M20 20c-1.5-2.5-4.1-4-8-4s-6.5 1.5-8 4"/>
                </svg>
              </span>
              <input
                type="text"
                id="identifier"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                required
                placeholder="Email / phone / username"
                style={{ color: 'var(--cd-text)' }}
              />
            </label>

            <label className="cd-label">Password</label>
            <label className="cd-input-group">
              <span className="cd-input-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={() => setShowPassword(false)}
                required
                placeholder="Your password"
                style={{ color: 'var(--cd-text)' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="cd-input-icon"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/>
                    <path d="M15 9l-6 6"/><path d="M9.5 9.5a3 3 0 014 4"/><path d="M14.5 14.5a3 3 0 01-4-4"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </label>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--cd-text-soft)', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: 'var(--cd-primary)' }} />
                Remember me
              </label>
              <button type="button" onClick={openForgot} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cd-primary)', fontWeight: 600, fontFamily: 'inherit', fontSize: '0.82rem' }}>
                Forgot password?
              </button>
            </div>

            <button type="submit" disabled={loading} className="cd-btn cd-btn-primary cd-btn-full" style={{ marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--cd-text-soft)' }}>
          New here?{' '}
          <Link to="/signup" className="cd-auth-link">Create an account</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.82rem' }}>
          <Link to="/" className="cd-auth-link" style={{ opacity: 0.7 }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
