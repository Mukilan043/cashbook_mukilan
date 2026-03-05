import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
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

    const result = await login(formData.email, formData.password);

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

    if (!forgotEmail) {
      setError('Email is required');
      return;
    }

    try {
      setLoading(true);
      await authAPI.forgotPasswordVerify(forgotEmail);
      setForgotStep(2);
      setInfo('Email verified. Please set a new password.');
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Email not registered. Please enter your registered email.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Email is required');
      } else if (err.response?.status === 500) {
        setError(err.response?.data?.error || 'Server error. Please try again.');
      } else {
        setError(
          err.response?.data?.error ||
          'Failed to verify email. If you are running locally, ensure the backend is running and Vite proxy points /api to your backend (see frontend/vite.config.js).'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      await authAPI.resetPassword(forgotEmail, newPassword);
      setInfo('Password updated successfully. Please login with your new password.');

      setShowForgot(false);
      setForgotStep(1);
      setNewPassword('');
      setConfirmPassword('');
      setFormData({ email: forgotEmail, password: '' });
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Email not registered. Please enter your registered email.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || 'Invalid request');
      } else {
        setError(err.response?.data?.error || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgot = () => {
    setShowForgot(true);
    setForgotStep(1);
    setError('');
    setInfo('');
    setForgotEmail(formData.email || '');
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPassword(false);
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep(1);
    setError('');
    setInfo('');
    setForgotEmail('');
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPassword(false);
  };

  const handleLoginFocus = (e) => {
    if (e.target.name !== 'password') {
      setShowPassword(false);
    }
  };

  return (
    <div className="cb-auth-stage">
      <div className="cb-auth-split">
        <div className="cb-auth-hero">
          <div className="cb-auth-badge">
            <img src="/pwa.svg" alt="CashDiary" className="cb-auth-logo" />
          </div>
          <h1 className="cb-font-display">Welcome to Cash Book</h1>
          <p>Track inflow, outflow, and balances with clean summaries and instant reports.</p>
          <p>Stay on top of your Cash flow with a Simple,focused Dashboard.</p>
          <div className="cb-auth-links" style={{ color: '#f8fafc' }}>
            
          </div>
          <div className="cb-auth-mini-grid">
            <div className="cb-auth-mini-card cb-anim-fade-in-up">
              <div className="cb-auth-mini-icon cb-auth-mini-icon--green">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 4v16" />
                  <path d="M6 14l6 6 6-6" />
                </svg>
              </div>
              <div>
                <h4>Cash Inflow</h4>
                <p>Record income in seconds.</p>
              </div>
            </div>
            <div className="cb-auth-mini-card cb-anim-fade-in-up">
              <div className="cb-auth-mini-icon cb-auth-mini-icon--rose">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20V4" />
                  <path d="M6 10l6-6 6 6" />
                </svg>
              </div>
              <div>
                <h4>Cash Outflow</h4>
                <p>Track expenses and vendors.</p>
              </div>
            </div>
            <div className="cb-auth-mini-card cb-anim-fade-in-up">
              <div className="cb-auth-mini-icon cb-auth-mini-icon--blue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16v16H4z" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
              </div>
              <div>
                <h4>Reports & History</h4>
                <p>Export PDF summaries.</p>
              </div>
            </div>
            <div className="cb-auth-mini-card cb-anim-fade-in-up">
              <div className="cb-auth-mini-icon cb-auth-mini-icon--teal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </svg>
              </div>
              <div>
                <h4>View & Manage</h4>
                <p>Edit or delete entries.</p>
              </div>
            </div>
            <div className="cb-auth-mini-card cb-anim-fade-in-up">
              <div className="cb-auth-mini-icon cb-auth-mini-icon--amber">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 4h12v16H6z" />
                  <path d="M9 8h6" />
                  <path d="M9 12h6" />
                </svg>
              </div>
              <div>
                <h4>Full History</h4>
                <p>See every transaction.</p>
              </div>
            </div>
            <div className="cb-auth-mini-card cb-anim-fade-in-up">
              <div className="cb-auth-mini-icon cb-auth-mini-icon--violet">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16" />
                  <path d="M7 10h10" />
                  <path d="M10 14h4" />
                  <path d="M6 18h12" />
                </svg>
              </div>
              <div>
                <h4>Multiple Cashbooks</h4>
                <p>Organize by projects.</p>
              </div>
            </div>
          </div>
          <div className="cb-auth-footer" style={{ color: '#f8fafc' }}>
            Join thousands tracking cash daily with clarity.
          </div>
          <div className="cb-auth-streaks" />
        </div>

        <div className="cb-auth-form">
          <h2>{showForgot ? 'Reset Access' : 'User Login'}</h2>
          <h3 className="cb-font-display">{showForgot ? 'Update your password' : 'Sign in to Cash Book'}</h3>
          <p>{showForgot ? 'Verify your email and set a new password.' : 'Use your email and password to continue.'}</p>

          {info && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {info}
            </div>
          )}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          {showForgot ? (
            <form onSubmit={forgotStep === 1 ? handleForgotVerify : handleForgotReset} className="space-y-4">
              <label className="cb-auth-field">
                <span className="cb-auth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16v16H4z" stroke="none" />
                    <path d="M4 4h16v16H4z" />
                    <path d="M4 4l8 8 8-8" />
                  </svg>
                </span>
                <input
                  type="email"
                  id="forgotEmail"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={loading || forgotStep === 2}
                  placeholder="Email address"
                />
              </label>

              {forgotStep === 2 && (
                <>
                  <label className="cb-auth-field">
                    <span className="cb-auth-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 018 0v3" />
                      </svg>
                    </span>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="New password"
                    />
                  </label>

                  <label className="cb-auth-field">
                    <span className="cb-auth-icon">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="4" y="10" width="16" height="10" rx="2" />
                        <path d="M8 10V7a4 4 0 018 0v3" />
                      </svg>
                    </span>
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Confirm password"
                    />
                  </label>

                  <label className="cb-auth-links">
                    <span>
                      <input
                        type="checkbox"
                        checked={showResetPassword}
                        onChange={(e) => setShowResetPassword(e.target.checked)}
                        disabled={loading}
                        className="rounded border-slate-300"
                      />
                      <span className="ml-2">Show password</span>
                    </span>
                  </label>
                </>
              )}

              <button type="submit" disabled={loading} className="cb-auth-action">
                {loading
                  ? (forgotStep === 1 ? 'Verifying…' : 'Updating…')
                  : (forgotStep === 1 ? 'Verify Email' : 'Update Password')}
              </button>
              <button type="button" onClick={closeForgot} disabled={loading} className="cb-auth-footer">
                Cancel
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} onFocusCapture={handleLoginFocus} className="space-y-4">
              <label className="cb-auth-field">
                <span className="cb-auth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                    <path d="M20 20c-1.5-2.5-4.1-4-8-4s-6.5 1.5-8 4" />
                  </svg>
                </span>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Email address"
                />
              </label>

              <label className="cb-auth-field">
                <span className="cb-auth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="10" width="16" height="10" rx="2" />
                    <path d="M8 10V7a4 4 0 018 0v3" />
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
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="cb-auth-icon"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                      <path d="M15 9l-6 6" />
                      <path d="M9.5 9.5a3 3 0 014 4" />
                      <path d="M14.5 14.5a3 3 0 01-4-4" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </label>

              <div className="cb-auth-links">
                <span>
                  <input type="checkbox" className="rounded border-slate-300" />
                  <span className="ml-2">Remember me</span>
                </span>
                <button type="button" onClick={openForgot}>Forgot password?</button>
              </div>

              <button type="submit" disabled={loading} className="cb-auth-action">
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>
          )}

          <div className="cb-auth-footer">
            New here?{' '}
            <Link to="/signup">Create an account</Link>
          </div>
          <div className="cb-auth-footer">
            <Link to="/">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
