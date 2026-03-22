import { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';
import { formatDateDisplay, toDateOnly } from '../utils/dateFormat';
import {
  DEFAULT_CATEGORIES,
  decodeDescription,
  encodeDescription,
} from '../utils/transactionSmart';

const TransactionList = ({ cashbookId }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('DESC');

  useEffect(() => {
    if (cashbookId) {
      fetchTransactions();
    }
  }, [cashbookId, filterType, sortBy, sortOrder]);

  const fetchTransactions = async () => {
    if (!cashbookId) return;
    try {
      setLoading(true);
      const filters = {
        ...(filterType !== 'all' && { type: filterType }),
        sortBy,
        sortOrder,
      };
      const data = await transactionAPI.getAll(cashbookId, filters);
      setTransactions(data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await transactionAPI.delete(cashbookId, id);
      fetchTransactions();
      if (window.refreshBalance) {
        window.refreshBalance();
      }
    } catch (error) {
      alert('Failed to delete transaction');
      console.error('Error deleting transaction:', error);
    }
  };

  const handleEdit = (transaction) => {
    const decoded = decodeDescription(transaction.description || '');
    setEditingId(transaction.id);
    setEditForm({
      amount: transaction.amount,
      description: decoded.description || '',
      category: decoded.category || '',
      customCategory: '',
      date: toDateOnly(transaction.date),
      type: transaction.type,
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (id) => {
    try {
      const categoryToSave = editForm.category === '__custom__'
        ? editForm.customCategory
        : editForm.category;

      await transactionAPI.update(cashbookId, id, {
        type: editForm.type,
        amount: editForm.amount,
        date: editForm.date,
        description: encodeDescription({ description: editForm.description, category: categoryToSave }),
      });
      setEditingId(null);
      setEditForm({});
      fetchTransactions();
      if (window.refreshBalance) {
        window.refreshBalance();
      }
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update transaction');
      console.error('Error updating transaction:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const filteredTransactions = transactions.filter(transaction => {
    const decoded = decodeDescription(transaction.description || '');
    const matchesSearch = 
      decoded.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.amount.toString().includes(searchTerm);
    const category = decoded.category || '';
    const matchesCategory = filterCategory === 'all' || (category && category === filterCategory);
    return matchesSearch && matchesCategory;
  });

  const availableCategories = Array.from(
    new Set(
      transactions
        .map(t => decodeDescription(t.description || '').category)
        .filter(Boolean)
        .concat(DEFAULT_CATEGORIES)
    )
  );

  if (!cashbookId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please select a cashbook first
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading transactions...</div>;
  }

  return (
    <div className="cd-card p-4 sm:p-6 mb-20">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Manage Transactions</h2>
          <button
            onClick={async () => {
              try {
                const reportFilters = {
                  startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                };
                const { API_BASE_URL } = await import('../services/api');
                const token = localStorage.getItem('token');
                const response = await fetch(
                  `${API_BASE_URL}/transactions/cashbook/${cashbookId}/reports/generate?${new URLSearchParams(reportFilters)}`,
                  {
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  }
                );
                if (!response.ok) throw new Error('Failed to generate report');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'cash-book-report.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (error) {
                alert('Failed to export PDF: ' + error.message);
              }
            }}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 text-sm shadow-lg"
          >
            Export PDF
          </button>
        </div>

        {/* Filters and Search */}
        <div className="mb-4 space-y-3">
          <input
            type="text"
            placeholder="Search by description or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="cd-input"
          />
          
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="cd-select"
            >
              <option value="all">All Types</option>
              <option value="inflow">Inflow Only</option>
              <option value="outflow">Outflow Only</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="cd-select"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="cd-select"
            >
              <option value="date">Sort by Date</option>
              <option value="amount">Sort by Amount</option>
              <option value="description">Sort by Description</option>
              <option value="type">Sort by Type</option>
            </select>

            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="cd-select"
            >
              <option value="DESC">Descending</option>
              <option value="ASC">Ascending</option>
            </select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead style={{ background: 'var(--cd-surface-2)' }}>
                <tr>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Description</th>
                  <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody style={{ background: 'var(--cd-surface)' }}>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    {editingId === transaction.id ? (
                      <>
                        <td className="px-2 sm:px-4 py-3">
                          <input
                            type="date"
                            name="date"
                            value={editForm.date}
                            onChange={handleEditChange}
                            className="cd-input"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <select
                            name="type"
                            value={editForm.type}
                            onChange={handleEditChange}
                            className="cd-select"
                          >
                            <option value="inflow">Inflow</option>
                            <option value="outflow">Outflow</option>
                          </select>
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <input
                            type="number"
                            name="amount"
                            value={editForm.amount}
                            onChange={handleEditChange}
                            step="0.01"
                            min="0.01"
                            className="cd-input"
                          />
                        </td>
                        <td className="px-2 sm:px-4 py-3 hidden sm:table-cell">
                          <div className="space-y-2">
                            <select
                              name="category"
                              value={editForm.category || ''}
                              onChange={handleEditChange}
                              className="cd-select"
                            >
                              <option value="">No category</option>
                              {availableCategories.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                              <option value="__custom__">Custom…</option>
                            </select>

                            {editForm.category === '__custom__' && (
                              <input
                                type="text"
                                name="customCategory"
                                value={editForm.customCategory || ''}
                                onChange={handleEditChange}
                                className="cd-input"
                                placeholder="e.g. Pet Care"
                              />
                            )}

                            <input
                              type="text"
                              name="description"
                              value={editForm.description}
                              onChange={handleEditChange}
                              className="cd-input"
                              placeholder="Description"
                            />
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditSubmit(transaction.id)}
                              className="px-2 sm:px-3 py-1 bg-green-600 text-white rounded text-xs sm:text-sm hover:bg-green-700"
                            >
                              Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 sm:px-3 py-1 bg-gray-500 text-white rounded text-xs sm:text-sm hover:bg-gray-600"
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 sm:px-4 py-3 text-sm" style={{ color: 'var(--cd-text)' }}>
                          {formatDateDisplay(transaction.date)}
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.type === 'inflow'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type}
                          </span>
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm font-medium" style={{ color: 'var(--cd-text)' }}>
                          Rs {Number(transaction.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-4 py-3 text-sm hidden sm:table-cell" style={{ color: 'var(--cd-text-soft)' }}>
                          {(() => {
                            const decoded = decodeDescription(transaction.description || '');
                            return (
                              <div className="flex items-center gap-2 flex-wrap">
                                {decoded.category && (
                                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                                    {decoded.category}
                                  </span>
                                )}
                                <span>{decoded.description || '-'}</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-2 sm:px-4 py-3">
                          <div className="flex gap-1 sm:gap-2">
                            <button
                              onClick={() => handleEdit(transaction)}
                              className="px-2 sm:px-3 py-1 bg-blue-600 text-white rounded text-xs sm:text-sm hover:bg-blue-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="px-2 sm:px-3 py-1 bg-red-600 text-white rounded text-xs sm:text-sm hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
