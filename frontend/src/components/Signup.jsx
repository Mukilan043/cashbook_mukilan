import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hidePasswordNow = () => setShowPassword(false);
  const hideConfirmPasswordNow = () => setShowConfirmPassword(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    const { confirmPassword, ...userData } = formData;
    const result = await signup(userData);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleFormFocus = (e) => {
    const { name } = e.target;

    if (name !== 'password') {
      setShowPassword(false);
    }

    if (name !== 'confirmPassword') {
      setShowConfirmPassword(false);
    }
  };

  return (
    <div className="cb-auth-stage">
      <div className="cb-auth-split">
        <div className="cb-auth-hero">
          <div className="cb-auth-badge">
            <img src="/cdlogo.png" alt="CashDiary" className="cb-auth-logo" />
          </div>
          <h1 className="cb-font-display">Create your Cash Book</h1>
          <p>Start tracking your income and expenses in one clean, focused space.</p>
          <p>Export clear PDF reports and keep your balance in view.</p>
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
                <p>Capture income fast.</p>
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
                <p>Track every expense.</p>
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
                <p>Printable PDF exports.</p>
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
                <p>Update entries any time.</p>
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
                <p>Review every record.</p>
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
                <p>Separate by project.</p>
              </div>
            </div>
          </div>
          <div className="cb-auth-streaks" />
        </div>

        <div className="cb-auth-form">
          <h2>New Account</h2>
          <h3 className="cb-font-display">Sign up for Cash Book</h3>
          <p>Fill in the details below to create your account.</p>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} onFocusCapture={handleFormFocus} className="space-y-4">
            <label className="cb-auth-field">
              <span className="cb-auth-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" />
                  <path d="M20 20c-1.5-2.5-4.1-4-8-4s-6.5 1.5-8 4" />
                </svg>
              </span>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Username"
              />
            </label>

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
                  <path d="M5 4h14v16H5z" />
                  <path d="M8 20h8" />
                </svg>
              </span>
              <input
                type="tel"
                id="mobile"
                name="mobile"
                value={formData.mobile}
                onChange={handleChange}
                required
                placeholder="Mobile number"
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
                onBlur={hidePasswordNow}
                required
                minLength={6}
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

            <label className="cb-auth-field">
              <span className="cb-auth-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 018 0v3" />
                </svg>
              </span>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={hideConfirmPasswordNow}
                required
                placeholder="Confirm password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="cb-auth-icon"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
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

            <button type="submit" disabled={loading} className="cb-auth-action">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="cb-auth-footer">
            Already have an account?{' '}
            <Link to="/login">Login</Link>
          </div>
          <div className="cb-auth-footer">
            <Link to="/">← Back to home</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;

