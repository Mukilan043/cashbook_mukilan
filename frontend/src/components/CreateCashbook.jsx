import { useState } from 'react';
import { cashbookAPI } from '../services/api';

const CreateCashbook = ({ onSuccess }) => {
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Cashbook name is required' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await cashbookAPI.create(formData);
      setMessage({ type: 'success', text: 'Cashbook created successfully!' });
      setFormData({ name: '', description: '' });
      setTimeout(() => {
        if (onSuccess) onSuccess();
        setMessage({ type: '', text: '' });
      }, 1500);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create cashbook' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="bg-white bg-opacity-95 p-6 rounded-lg shadow-md mb-6"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1920&q=80)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="bg-white bg-opacity-90 p-6 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Add New Cashbook</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Cashbook Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter cashbook name"
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter description (optional)"
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
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Cashbook'}
        </button>
      </form>
      </div>
    </div>
  );
};

export default CreateCashbook;

