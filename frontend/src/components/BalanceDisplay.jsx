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
      setBalance({
        balance: Number(data?.balance || 0),
        totalInflow: Number(data?.totalinflow || data?.totalInflow || 0),
        totalOutflow: Number(data?.totaloutflow || data?.totalOutflow || 0),
      });
    } catch (error) {
      console.error('Error fetching balance:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="cd-balance-card cd-anim-fade-up">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📒</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cd-text)' }}>Select a Cashbook</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--cd-text-soft)', marginTop: 4 }}>Choose a cashbook to view balance</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="cd-balance-card">
        <div style={{ textAlign: 'center' }}>
          <div className="cd-skeleton" style={{ height: 20, width: '50%', margin: '0 auto 16px' }} />
          <div className="cd-skeleton" style={{ height: 40, width: '70%', margin: '0 auto 20px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="cd-skeleton" style={{ height: 60, borderRadius: 12 }} />
            <div className="cd-skeleton" style={{ height: 60, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  const bal = Number(balance.balance || 0);
  const isPositive = bal >= 0;

  return (
    <div className="cd-balance-card cd-anim-fade-up">
      {/* Gradient accent strip */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: 3,
        background: isPositive
          ? 'var(--cd-success)'
          : 'var(--cd-danger)',
        borderRadius: '20px 20px 0 0',
      }} />

      <div style={{ textAlign: 'center', paddingTop: 8 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.12em', color: 'var(--cd-text-muted)', textTransform: 'uppercase' }}>
          Current Balance
        </div>
        <div style={{
          fontSize: 'clamp(2rem, 8vw, 3.2rem)',
          fontWeight: 800,
          marginTop: 8,
          color: isPositive ? 'var(--cd-success)' : 'var(--cd-danger)',
          letterSpacing: '-1px',
          lineHeight: 1.1,
        }}>
          ₹{bal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--cd-text-muted)', marginTop: 4 }}>
          {isPositive ? '↑ You have positive balance' : '↓ Balance is in deficit'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
        <div style={{
          background: 'var(--cd-success-bg)',
          border: '1px solid rgba(0,200,150,0.2)',
          borderRadius: 14,
          padding: '14px 12px',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--cd-success)' }}>↓</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--cd-success)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total In</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cd-success)' }}>
            ₹{Number(balance.totalInflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{
          background: 'var(--cd-danger-bg)',
          border: '1px solid rgba(255,92,92,0.2)',
          borderRadius: 14,
          padding: '14px 12px',
          textAlign: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 14, color: 'var(--cd-danger)' }}>↑</span>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--cd-danger)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total Out</span>
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cd-danger)' }}>
            ₹{Number(balance.totalOutflow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BalanceDisplay;
