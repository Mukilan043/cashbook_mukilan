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
  };

  const closeForgot = () => {
    setShowForgot(false);
    setForgotStep(1);
    setError('');
    setInfo('');
    setForgotEmail('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="bg-black bg-opacity-60 absolute inset-0"></div>
      <div className="relative z-10 w-full max-w-lg">
        <div className="bg-white bg-opacity-95 rounded-2xl shadow-2xl p-10">
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            {showForgot ? 'Forgot Password' : 'Login'}
          </h2>

          {info && (
            <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-md text-sm">{info}</div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{error}</div>
          )}

          {showForgot ? (
            <form onSubmit={forgotStep === 1 ? handleForgotVerify : handleForgotReset} className="space-y-4">
              <div>
                <label htmlFor="forgotEmail" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="forgotEmail"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                  disabled={loading || forgotStep === 2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Enter your registered email"
                />
              </div>

              {forgotStep === 2 && (
                <>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      placeholder="Confirm new password"
                    />
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading
                    ? (forgotStep === 1 ? 'Verifying…' : 'Updating…')
                    : (forgotStep === 1 ? 'Verify Email' : 'Update Password')}
                </button>
                <button
                  type="button"
                  onClick={closeForgot}
                  disabled={loading}
                  className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={openForgot}
                      className="text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </form>
            </>
          )}

          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>

          <Link to="/" className="block mt-4 text-center text-sm text-gray-500 hover:text-gray-700">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
