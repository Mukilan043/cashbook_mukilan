import { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';
import { format, parseISO } from 'date-fns';
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

  // Group transactions by date
  const groupedTransactions = transactions.reduce((groups, transaction) => {
    const date = transaction.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(transaction);
    return groups;
  }, {});

  // Calculate running balance
  const calculateRunningBalance = (transactionsList) => {
    let balance = 0;
    return transactionsList.map(transaction => {
      if (transaction.type === 'inflow') {
        balance += transaction.amount;
      } else {
        balance -= transaction.amount;
      }
      return { ...transaction, runningBalance: balance };
    });
  };

  // Sort dates in descending order
  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b) - new Date(a)
  );

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

      {sortedDates.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No transaction history found
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => {
            const dayTransactions = calculateRunningBalance(
              groupedTransactions[date].sort((a, b) => 
                new Date(b.created_at) - new Date(a.created_at)
              )
            );

            return (
              <div key={date} className="bg-gray-50 border border-gray-200 rounded-lg">
                <div className="px-4 py-2 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-700">
                    {format(parseISO(date), 'EEEE, MMMM dd, yyyy')}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {dayTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="px-4 py-3 bg-white hover:bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            transaction.type === 'inflow'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.type}
                          </span>
                          {(() => {
                            const decoded = decodeDescription(transaction.description || '');
                            return (
                              <>
                                {decoded.category && (
                                  <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-semibold">
                                    {decoded.category}
                                  </span>
                                )}
                                <span className="text-sm text-gray-900">
                                  {decoded.description || 'No description'}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {format(parseISO(transaction.created_at), 'hh:mm a')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          transaction.type === 'inflow' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'inflow' ? '+' : '-'}Rs {transaction.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Balance: Rs {transaction.runningBalance.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
