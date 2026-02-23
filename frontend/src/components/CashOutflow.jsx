import { useState } from 'react';
import { transactionAPI } from '../services/api';
import { format } from 'date-fns';
import {
  DEFAULT_CATEGORIES,
  encodeDescription,
  inferCategory,
  learnCategory,
  parseNaturalInput,
} from '../utils/transactionSmart';

const CashOutflow = ({ cashbookId, onDone }) => {
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    category: '',
    smartText: '',
    customCategory: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'description') {
      const suggested = inferCategory(value);
      setFormData(prev => ({
        ...prev,
        category: prev.category || suggested,
      }));
    }
  };

  const handleSmartChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, smartText: value }));

    const parsed = parseNaturalInput(value);
    setFormData(prev => ({
      ...prev,
      amount: parsed.amount || prev.amount,
      date: parsed.date || prev.date,
      description: parsed.description || prev.description,
      category: prev.category || inferCategory(parsed.description || prev.description),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!cashbookId) {
      setMessage({ type: 'error', text: 'Please select a cashbook first' });
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount greater than 0' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const categoryToSave = formData.category === '__custom__'
        ? formData.customCategory
        : formData.category;

      learnCategory({ description: formData.description, category: categoryToSave });

      await transactionAPI.create(cashbookId, {
        type: 'outflow',
        amount: parseFloat(formData.amount),
        description: encodeDescription({ description: formData.description, category: categoryToSave }),
        date: formData.date,
      });

      setMessage({ type: 'success', text: 'Cash outflow added successfully!' });
      setFormData({
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        category: '',
        smartText: '',
        customCategory: '',
      });

      // Refresh balance
      if (window.refreshBalance) {
        window.refreshBalance();
      }

      if (typeof onDone === 'function') {
        onDone();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to add cash outflow' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-red-600 mb-6">Cash Outflow</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="smartText" className="block text-sm font-medium text-gray-700 mb-1">
            Smart input (optional)
          </label>
          <input
            type="text"
            id="smartText"
            name="smartText"
            value={formData.smartText}
            onChange={handleSmartChange}
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder='e.g. "Paid 120 for lunch today"'
          />
          <p className="text-xs text-gray-500 mt-1">
            Auto-fills amount, date, description, and category.
          </p>
        </div>

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
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Enter description (optional)"
          />
        </div>

        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
          >
            <option value="">Auto-detect</option>
            {DEFAULT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__custom__">Custom…</option>
          </select>
          {formData.category === '__custom__' && (
            <input
              type="text"
              name="customCategory"
              value={formData.customCategory}
              onChange={handleChange}
              className="mt-2 w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="e.g. 🐶 Pet Care"
            />
          )}
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
            className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Adding...' : 'Add Cash Outflow'}
        </button>
      </form>
    </div>
  );
};

export default CashOutflow;





