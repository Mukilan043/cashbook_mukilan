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

  const fields = [
    {
      name: 'username',
      placeholder: 'Username',
      type: 'text',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z"/>
          <path d="M20 20c-1.5-2.5-4.1-4-8-4s-6.5 1.5-8 4"/>
        </svg>
      ),
    },
    {
      name: 'email',
      placeholder: 'Email address',
      type: 'email',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/>
        </svg>
      ),
    },
    {
      name: 'mobile',
      placeholder: 'Mobile number',
      type: 'tel',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="5" y="2" width="14" height="20" rx="2"/><circle cx="12" cy="17" r="1"/>
        </svg>
      ),
    },
  ];

  const EyeOpen = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeClosed = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/>
      <path d="M15 9l-6 6"/><path d="M9.5 9.5a3 3 0 014 4"/><path d="M14.5 14.5a3 3 0 01-4-4"/>
    </svg>
  );

  const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>
    </svg>
  );

  return (
    <div className="cd-auth-page">
      <div className="cd-auth-card cd-anim-scale-pop" style={{ maxWidth: 480 }}>
        {/* Logo */}
        <div className="cd-auth-logo-wrap">
          <div className="cd-auth-logo-icon" style={{ overflow: 'hidden', padding: 0 }}>
            <img src="/cdlogo.png" alt="CashDiary Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div className="cd-logo-text" style={{ fontSize: '1.5rem' }}>CashDiary</div>
            <div className="cd-auth-subtitle">Create your free account</div>
          </div>
        </div>

        {error && <div className="cd-alert cd-alert-danger" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map((f) => (
            <label key={f.name} className="cd-input-group">
              <span className="cd-input-icon">{f.icon}</span>
              <input
                type={f.type}
                name={f.name}
                value={formData[f.name]}
                onChange={handleChange}
                required
                placeholder={f.placeholder}
                style={{ color: 'var(--cd-text)' }}
              />
            </label>
          ))}

          {/* Password */}
          <label className="cd-input-group">
            <span className="cd-input-icon"><LockIcon /></span>
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={() => setShowPassword(false)}
              required
              minLength={6}
              placeholder="Password"
              style={{ color: 'var(--cd-text)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="cd-input-icon"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeClosed /> : <EyeOpen />}
            </button>
          </label>

          {/* Confirm Password */}
          <label className="cd-input-group">
            <span className="cd-input-icon"><LockIcon /></span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={() => setShowConfirmPassword(false)}
              required
              placeholder="Confirm password"
              style={{ color: 'var(--cd-text)' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((p) => !p)}
              className="cd-input-icon"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label={showConfirmPassword ? 'Hide' : 'Show'}
            >
              {showConfirmPassword ? <EyeClosed /> : <EyeOpen />}
            </button>
          </label>

          <button type="submit" disabled={loading} className="cd-btn cd-btn-primary cd-btn-full" style={{ marginTop: 4 }}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--cd-text-soft)' }}>
          Already have an account?{' '}
          <Link to="/login" className="cd-auth-link">Sign In</Link>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.82rem' }}>
          <Link to="/" className="cd-auth-link" style={{ opacity: 0.7 }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
