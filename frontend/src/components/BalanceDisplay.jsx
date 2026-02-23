import { useState, useEffect } from 'react';
import { transactionAPI } from '../services/api';

const BalanceDisplay = ({ cashbookId }) => {
  const [balance, setBalance] = useState({ balance: 0, totalInflow: 0, totalOutflow: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cashbookId) {
      fetchBalance();
    }
  }, [cashbookId]);

  const fetchBalance = async () => {
    if (!cashbookId) return;
    try {
      setLoading(true);
      const data = await transactionAPI.getBalance(cashbookId);
      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expose refresh function to parent
  useEffect(() => {
    if (cashbookId) {
      window.refreshBalance = fetchBalance;
      return () => {
        delete window.refreshBalance;
      };
    }
  }, [cashbookId]);

  if (!cashbookId) {
    return (
      <div className="bg-white bg-opacity-90 backdrop-blur text-gray-800 p-6 rounded-2xl shadow-xl border border-white border-opacity-30">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Select a Cashbook</h2>
          <p className="text-sm text-gray-500">Choose a cashbook to view balance</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white bg-opacity-90 backdrop-blur text-gray-800 p-6 rounded-2xl shadow-xl border border-white border-opacity-30">
        <div className="text-center">Loading balance...</div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-white bg-opacity-90 backdrop-blur text-gray-900 p-4 sm:p-6 rounded-2xl shadow-2xl border border-white border-opacity-30">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-10 -left-10 w-44 h-44 rounded-full bg-blue-500 opacity-15 blur-3xl" />
        <div className="absolute -bottom-12 -right-10 w-52 h-52 rounded-full bg-indigo-500 opacity-15 blur-3xl" />
      </div>

      <div className="relative flex flex-col items-center">
        <div className="text-xs font-semibold tracking-wide text-gray-600 uppercase">Current Balance</div>
        <div className={`mt-2 text-3xl sm:text-5xl font-extrabold drop-shadow-sm ${balance.balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
          Rs {balance.balance.toFixed(2)}
        </div>

        <div className="mt-5 w-full grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-xl border border-white border-opacity-30 bg-white bg-opacity-70 p-3 sm:p-4 text-center">
            <div className="text-[11px] sm:text-xs text-gray-600">Total Inflow</div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-green-700">
              Rs {balance.totalInflow.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border border-white border-opacity-30 bg-white bg-opacity-70 p-3 sm:p-4 text-center">
            <div className="text-[11px] sm:text-xs text-gray-600">Total Outflow</div>
            <div className="mt-1 text-lg sm:text-xl font-bold text-red-700">
              Rs {balance.totalOutflow.toFixed(2)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceDisplay;
