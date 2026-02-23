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
  const [editForm, setEditForm] = useState({
    username: '',
    mobile: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploading, setUploading] = useState(false);
  const [openCashbookMenuId, setOpenCashbookMenuId] = useState(null);
  const menuRef = useRef(null);

  const closeCashbookMenu = () => setOpenCashbookMenuId(null);
  const toggleCashbookMenu = (id) => setOpenCashbookMenuId((prev) => (prev === id ? null : id));

  useEffect(() => {
    fetchCashbooks();
    if (user) {
      setEditForm({
        username: user.username || '',
        mobile: user.mobile || '',
      });
    }
  }, [user]);

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

  const handleEdit = () => {
    setEditing(true);
    setMessage({ type: '', text: '' });
  };

  const handleCancel = () => {
    setEditing(false);
    setEditForm({
      username: user?.username || '',
      mobile: user?.mobile || '',
    });
    setMessage({ type: '', text: '' });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select an image file' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image too large (max 2MB)' });
      return;
    }
    setUploading(true);
    setMessage({ type: '', text: '' });
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await authAPI.updateProfile({ profile_image: base64 });
      await fetchUser();
      setMessage({ type: 'success', text: 'Profile image updated!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to upload image' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!editForm.username.trim() || !editForm.mobile.trim()) {
      setMessage({ type: 'error', text: 'Username and mobile are required' });
      return;
    }

    try {
      const response = await authAPI.updateProfile(editForm);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      await fetchUser(); // Refresh user data
      setTimeout(() => {
        setEditing(false);
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error.response?.data?.error || 'Failed to update profile',
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
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

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <>
      <div 
        className="min-h-screen pb-20"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="bg-black bg-opacity-40 min-h-screen">
          <div className="max-w-4xl mx-auto bg-white bg-opacity-90 p-4 sm:p-6 rounded-lg shadow-lg mb-20 pb-20 relative z-10 mt-6 backdrop-blur">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow">
                  {user?.profile_image ? (
                    <img
                      src={user.profile_image}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-600">
                      {(user?.username || 'U').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-900 font-bold text-lg">{user?.username}</div>
                  <div className="text-gray-600 text-sm">{user?.email}</div>
                </div>
              </div>
              <div className="sm:ml-auto">
                <label className="inline-flex items-center gap-2 bg-white bg-opacity-90 px-4 py-2 rounded-md shadow cursor-pointer hover:bg-opacity-100">
                  <span className="text-sm font-semibold text-gray-800">
                    {uploading ? 'Uploading...' : 'Change Photo'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImagePick}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">User Profile</h2>
              {!editing && (
                <button
                  onClick={handleEdit}
                  className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                >
                  Edit
                </button>
              )}
            </div>

            {/* User Credentials */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Your Credentials</h3>
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                {editing ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username *
                      </label>
                      <input
                        type="text"
                        name="username"
                        value={editForm.username}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile *
                      </label>
                      <input
                        type="tel"
                        name="mobile"
                        value={editForm.mobile}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email (cannot be changed)
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                      />
                    </div>
                    {message.text && (
                      <div className={`p-3 rounded-md ${
                        message.type === 'success'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {message.text}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handleSave}
                        className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Username:</span>
                      <p className="text-gray-900">{user?.username}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Email:</span>
                      <p className="text-gray-900">{user?.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Mobile:</span>
                      <p className="text-gray-900">{user?.mobile}</p>
                    </div>
                    {user?.created_at && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Member Since:</span>
                        <p className="text-gray-900">
                          {format(new Date(user.created_at), 'MMMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Cashbooks */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold mb-4">Your Cashbooks</h3>
              {cashbooks.length === 0 ? (
                <p className="text-gray-500">No cashbooks yet. Create one to get started!</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cashbooks.map((cashbook) => (
                    <div
                      key={cashbook.id}
                      onClick={() => navigate(`/cashbook/${cashbook.id}`)}
                      className="relative bg-blue-50 p-4 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-blue-900 min-w-0 flex-1 truncate">{cashbook.name}</h4>

                        {/* Per-cashbook menu */}
                        <div
                          ref={openCashbookMenuId === cashbook.id ? menuRef : null}
                          className="relative z-10 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label="Cashbook options"
                            title="Options"
                            className="w-8 h-8 rounded-md bg-white border border-blue-200 hover:bg-blue-50 flex items-center justify-center text-blue-900"
                            onClick={() => toggleCashbookMenu(cashbook.id)}
                          >
                            <span className="text-lg leading-none">⋮</span>
                          </button>

                          {openCashbookMenuId === cashbook.id && (
                            <div className="absolute right-0 mt-2 w-44 rounded-lg bg-white border border-gray-200 shadow-lg overflow-hidden">
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
                      {cashbook.description && (
                        <p className="text-sm text-blue-700 mt-1">{cashbook.description}</p>
                      )}
                      <p className="text-xs text-blue-600 mt-2">
                        Created: {format(new Date(cashbook.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Logout Button */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Navigation */}
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
