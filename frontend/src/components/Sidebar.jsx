import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { transactionAPI } from '../services/api';

const Sidebar = ({ isOpen, onClose, type, cashbookId, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      setMessage({ type: '', text: '' });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const focusRingClass = type === 'inflow' ? 'focus:ring-green-500' : 'focus:ring-red-500';
  const borderClass = type === 'inflow' ? 'border-green-300 focus:border-green-500' : 'border-red-300 focus:border-red-500';

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await transactionAPI.create(cashbookId, {
        type,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
      });

      setMessage({ type: 'success', text: `Cash ${type} added successfully!` });
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || `Failed to add cash ${type}` 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div 
        className={`
          fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-xl z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
          overflow-y-auto
        `}
        style={{
          backgroundImage: type === 'inflow' 
            ? 'url(https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1920&q=80)'
            : 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="bg-white bg-opacity-95 h-full">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className={`text-2xl font-bold ${
              type === 'inflow' ? 'text-green-600' : 'text-red-600'
            }`}>
              Cash {type === 'inflow' ? 'Inflow' : 'Outflow'}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                required
                className={`w-full px-3 py-2 border ${borderClass} rounded-md focus:outline-none focus:ring-2 ${focusRingClass}`}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                className={`w-full px-3 py-2 border ${borderClass} rounded-md focus:outline-none focus:ring-2 ${focusRingClass}`}
                placeholder="Enter description (optional)"
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                id="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className={`w-full px-3 py-2 border ${borderClass} rounded-md focus:outline-none focus:ring-2 ${focusRingClass}`}
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded-md text-white focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                type === 'inflow'
                  ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
              }`}
            >
              {loading ? 'Adding...' : `Add Cash ${type === 'inflow' ? 'Inflow' : 'Outflow'}`}
            </button>
          </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

