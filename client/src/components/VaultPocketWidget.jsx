import React, { useState, useEffect } from 'react';
import {
  Vault,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Percent,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export const VaultPocketWidget = ({ onBalanceUpdated }) => {
  const { account, refreshUserData } = useAuth();
  const [vaultData, setVaultData] = useState(null);
  const [actionType, setActionType] = useState('deposit'); // 'deposit' or 'withdraw'
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [calcAmount, setCalcAmount] = useState(10000);

  const fetchVault = async () => {
    try {
      const res = await api.get('/transfers/vault');
      setVaultData(res.data.data);
    } catch (err) {
      console.error('Failed to load vault data', err);
    }
  };

  useEffect(() => {
    fetchVault();
  }, [account]);

  const checkingBalance = account?.balance || 0;
  const savingsBalance = account?.savingsBalance || 0;
  const apyRate = account?.apyRate || 4.85;

  const handleAction = async (e) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return;

    setLoading(true);
    setFeedbackMsg('');
    try {
      const endpoint =
        actionType === 'deposit' ? '/transfers/vault/deposit' : '/transfers/vault/withdraw';
      const res = await api.post(endpoint, { amount: val });
      setFeedbackMsg(res.data.message);
      setAmount('');
      await refreshUserData();
      await fetchVault();
      if (onBalanceUpdated) onBalanceUpdated();
    } catch (err) {
      setFeedbackMsg(err.response?.data?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  // Calculator projections for simulated amount
  const projectedAnnual = (calcAmount * apyRate) / 100;
  const projectedMonthly = projectedAnnual / 12;
  const projectedDaily = projectedAnnual / 365;

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 font-mono text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white text-zinc-950">
            <Vault className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-wide">
                High-Yield Savings Vault
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 border border-zinc-700 text-white">
                {apyRate}% APY
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Compound daily interest with instant liquidity access
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-zinc-500 uppercase">Savings Portfolio</span>
          <p className="text-lg font-black text-white">
            ${savingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-200">
          {feedbackMsg}
        </div>
      )}

      {/* Quick Deposit / Withdraw Panel */}
      <form onSubmit={handleAction} className="space-y-4">
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800">
          <button
            type="button"
            onClick={() => setActionType('deposit')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              actionType === 'deposit'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Allocate to Vault (+)
          </button>
          <button
            type="button"
            onClick={() => setActionType('withdraw')}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              actionType === 'withdraw'
                ? 'bg-white text-zinc-950 shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Withdraw to Checking (-)
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">$</span>
            <input
              type="number"
              step="100"
              min="1"
              required
              placeholder="Amount to move..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-7 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs transition-all shrink-0"
          >
            {loading ? 'Processing...' : actionType === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        </div>

        <div className="flex justify-between text-[10px] text-zinc-500">
          <span>
            Checking Avail: ${checkingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
          <span>
            Vault Reserve: ${savingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </form>

      {/* Interactive Yield Calculator */}
      <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-zinc-400 flex items-center gap-1.5 font-bold">
            <Percent className="w-3.5 h-3.5" /> APY Yield Calculator
          </span>
          <span className="text-white font-bold">${calcAmount.toLocaleString()} USD</span>
        </div>

        <input
          type="range"
          min="1000"
          max="250000"
          step="1000"
          value={calcAmount}
          onChange={(e) => setCalcAmount(Number(e.target.value))}
          className="w-full accent-white bg-zinc-800 cursor-pointer h-1.5 rounded-lg"
        />

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase">Daily Est.</span>
            <span className="text-white font-bold">+${projectedDaily.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase">Monthly Est.</span>
            <span className="text-white font-bold">+${projectedMonthly.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-zinc-500 block text-[9px] uppercase">Annual Return</span>
            <span className="text-emerald-400 font-bold">+${projectedAnnual.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

