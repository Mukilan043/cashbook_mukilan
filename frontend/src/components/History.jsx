import { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';
import { format } from 'date-fns';
import { decodeDescription } from '../utils/transactionSmart';

const History = ({ cashbookId }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
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

  const runningBalanceById = (() => {
    const chronological = [...transactions].sort((a, b) => {
      const dateDiff = new Date(a.date) - new Date(b.date);
      if (dateDiff !== 0) return dateDiff;

      const aCreated = a.created_at ? new Date(a.created_at) : null;
      const bCreated = b.created_at ? new Date(b.created_at) : null;
      if (aCreated && bCreated) {
        const createdDiff = aCreated - bCreated;
        if (createdDiff !== 0) return createdDiff;
      }

      return Number(a.id) - Number(b.id);
    });

    let balance = 0;
    const map = new Map();
    for (const transaction of chronological) {
      const amount = Number(transaction.amount || 0);
      if (transaction.type === 'inflow') {
        balance += amount;
      } else {
        balance -= amount;
      }
      map.set(transaction.id, balance);
    }
    return map;
  })();

  if (!cashbookId) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please select a cashbook first
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading history...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 sm:p-6 mb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <h2 className="text-2xl font-bold text-gray-900">History</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">All Types</option>
            <option value="inflow">Inflow Only</option>
            <option value="outflow">Outflow Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="date">Sort by Date</option>
            <option value="amount">Sort by Amount</option>
            <option value="description">Sort by Description</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="DESC">Descending</option>
            <option value="ASC">Ascending</option>
          </select>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transaction history found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-2 sm:px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Description</th>
                <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-2 sm:px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {format(new Date(transaction.date), 'MMM dd, yyyy')}
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
                  <td className="px-2 sm:px-4 py-3 text-sm font-medium text-gray-900 text-right tabular-nums whitespace-nowrap">
                    Rs {Number(transaction.amount || 0).toFixed(2)}
                  </td>
                  <td className="px-2 sm:px-4 py-3 text-sm text-gray-500 hidden sm:table-cell text-center">
                    {(() => {
                      const decoded = decodeDescription(transaction.description || '');
                      return (
                        <div className="flex items-center justify-center gap-2 flex-wrap">
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
                  <td className="px-2 sm:px-4 py-3 text-sm font-semibold text-right tabular-nums whitespace-nowrap">
                    {(() => {
                      const bal = Number(runningBalanceById.get(transaction.id) ?? 0);
                      return (
                        <span className={bal >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          Rs {bal.toFixed(2)}
                        </span>
                      );
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default History;
