import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Send,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  TrendingUp,
  ShieldCheck,
  FileText,
  Sliders,
  Vault,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { VirtualCard3D } from '../components/VirtualCard3D';
import { TransferModal } from '../components/TransferModal';
import { NewCardModal } from '../components/NewCardModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { VaultPocketWidget } from '../components/VaultPocketWidget';

export const DashboardPage = ({ onNavigate }) => {
  const { user, account, refreshUserData } = useAuth();
  const [cards, setCards] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);
  const [selectedReceiptRef, setSelectedReceiptRef] = useState(null);
  const [copiedIban, setCopiedIban] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [cardsRes, txnsRes, analyticsRes] = await Promise.all([
        api.get('/cards'),
        api.get('/transfers?limit=6'),
        api.get('/transfers/analytics'),
      ]);

      setCards(cardsRes.data.data);
      setTransactions(txnsRes.data.data);
      setAnalytics(analyticsRes.data.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const copyIban = () => {
    if (!account?.iban) return;
    navigator.clipboard.writeText(account.iban);
    setCopiedIban(true);
    setTimeout(() => setCopiedIban(false), 2000);
  };

  const handleCardUpdated = (updatedCard) => {
    setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
  };

  const handleCardCreated = (newCard) => {
    setCards((prev) => [newCard, ...prev]);
  };

  const primaryCard = cards[0];
  const checkingBalance = account?.balance || 0;
  const savingsBalance = account?.savingsBalance || 0;
  const totalLiquidity = checkingBalance + savingsBalance;

  // Architectural Monochrome Chart Colors
  const MONOCHROME_PALETTE = ['#FFFFFF', '#D4D4D8', '#A1A1AA', '#71717A', '#52525B', '#3F3F46'];

  const pieData = analytics?.categoryBreakdown?.filter((c) => c.amount > 0) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-mono">
      {/* Top Welcome & Master Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sovereign Treasury Overview
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-900 text-white border border-zinc-800">
              Active Enclave
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Institutional Node // Account Number:{' '}
            <span className="text-white font-bold">{account?.accountNumber}</span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs tracking-wider transition-all shadow-glow-white"
          >
            <Send className="w-4 h-4" />
            <span>Transfer Liquidity</span>
          </button>

          <button
            onClick={() => setIsNewCardOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-semibold transition-all"
          >
            <Plus className="w-4 h-4 text-zinc-400" />
            <span>Issue Card</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Liquidity Panels & Virtual Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Checking + Savings Balances & Flow Chart */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Liquidity Card (Inverted High Contrast) */}
          <div className="bg-zinc-950 rounded-2xl p-6 sm:p-8 border border-zinc-800 relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-semibold">
                  Total Platform Portfolio
                </p>
                <h2 className="text-3xl sm:text-5xl font-black text-white mt-1">
                  ${totalLiquidity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  <span className="text-sm font-normal text-zinc-500 ml-2">USD</span>
                </h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-white text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>+4.85% APY</span>
              </div>
            </div>

            {/* Split Balances: Liquid Checking vs High-Yield Savings */}
            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-zinc-800/80 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                  Checking (Liquid)
                </span>
                <span className="text-white font-bold text-base mt-0.5 block">
                  ${checkingBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">
                  Savings Vault (4.85%)
                </span>
                <span className="text-emerald-400 font-bold text-base mt-0.5 block">
                  ${savingsBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* IBAN & Account Number Bar */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-zinc-900 rounded-xl p-3 border border-zinc-800">
              <div>
                <span className="text-zinc-500 mr-2 uppercase text-[10px]">IBAN:</span>
                <span className="text-white tracking-wider font-semibold">
                  {account?.iban || 'US89NEOB921482019482'}
                </span>
              </div>
              <button
                onClick={copyIban}
                className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              >
                {copiedIban ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedIban ? 'Copied' : 'Copy IBAN'}</span>
              </button>
            </div>
          </div>

          {/* Pro Feature: High-Yield Savings Vault Pocket Widget */}
          <VaultPocketWidget onBalanceUpdated={fetchDashboardData} />

          {/* Cashflow Trend Chart (High Contrast) */}
          <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Settlement Velocity Dynamic
                </h3>
                <p className="text-[11px] text-zinc-400">Monthly Inflow vs Outflow Trajectory</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-white">
                  <span className="w-2 h-2 rounded-full bg-white" /> Inflow
                </span>
                <span className="flex items-center gap-1.5 text-zinc-500">
                  <span className="w-2 h-2 rounded-full bg-zinc-600" /> Outflow
                </span>
              </div>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.monthlyTrends || []}>
                  <defs>
                    <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#71717A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#71717A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#52525B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#inflowGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#71717A"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#outflowGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Virtual Card 3D & Allocation Pie */}
        <div className="lg:col-span-5 space-y-6 flex flex-col items-center">
          {/* Virtual Card 3D Display with Slider */}
          <div className="w-full bg-zinc-950 rounded-2xl p-6 border border-zinc-800 flex flex-col items-center shadow-xl">
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-white" />
                <h3 className="text-sm font-bold text-white uppercase">Primary Vault Card</h3>
              </div>
              <button
                onClick={() => onNavigate('/cards')}
                className="text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Vault ({cards.length}) →
              </button>
            </div>

            {primaryCard ? (
              <VirtualCard3D
                card={primaryCard}
                onCardUpdated={handleCardUpdated}
                showLimitSlider={true}
              />
            ) : (
              <div className="py-12 text-center">
                <p className="text-xs text-zinc-500 mb-3">No active virtual cards.</p>
                <button
                  onClick={() => setIsNewCardOpen(true)}
                  className="px-4 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs"
                >
                  Generate Card
                </button>
              </div>
            )}
          </div>

          {/* Allocation Breakdown */}
          <div className="w-full bg-zinc-950 rounded-2xl p-6 border border-zinc-800">
            <h3 className="text-sm font-bold text-white uppercase mb-2">
              Capital Outflow Allocation
            </h3>
            <div className="h-44 w-full flex items-center justify-center">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`pie-${index}`}
                          fill={MONOCHROME_PALETTE[index % MONOCHROME_PALETTE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#09090B',
                        border: '1px solid #27272A',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-zinc-500">No expense records logged yet.</p>
              )}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-zinc-800 text-[11px]">
              {pieData.slice(0, 4).map((cat, idx) => (
                <div key={cat.category} className="flex items-center justify-between text-zinc-300">
                  <span className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: MONOCHROME_PALETTE[idx % MONOCHROME_PALETTE.length],
                      }}
                    />
                    <span className="truncate">{cat.category}</span>
                  </span>
                  <span className="text-white font-bold">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Clearing Activity */}
      <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-white" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Recent Clearing Operations
            </h3>
          </div>
          <button
            onClick={() => onNavigate('/transactions')}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Full Ledger Search →
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isSender = tx.senderId === user?.id || tx.senderName === user?.fullName;
                  return (
                    <tr key={tx._id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{tx.reference}</td>
                      <td className="py-3.5 px-4 text-zinc-200">
                        {isSender ? `To: ${tx.receiverName}` : `From: ${tx.senderName}`}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">{tx.category}</td>
                      <td className="py-3.5 px-4 text-zinc-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            tx.status === 'completed'
                              ? 'bg-zinc-900 text-white border border-zinc-700'
                              : tx.status === 'pending_review'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              tx.status === 'completed'
                                ? 'bg-emerald-400'
                                : tx.status === 'pending_review'
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          {tx.status}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-bold ${
                          isSender ? 'text-zinc-300' : 'text-white'
                        }`}
                      >
                        {isSender ? '-' : '+'}${tx.amount.toLocaleString()} {tx.currency}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedReceiptRef(tx.reference)}
                          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-[11px] font-bold transition-colors"
                        >
                          Voucher
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-zinc-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onTransferSuccess={() => {
          fetchDashboardData();
          refreshUserData();
        }}
      />
      <NewCardModal
        isOpen={isNewCardOpen}
        onClose={() => setIsNewCardOpen(false)}
        onCardCreated={handleCardCreated}
      />
      <ReceiptModal
        reference={selectedReceiptRef}
        isOpen={!!selectedReceiptRef}
        onClose={() => setSelectedReceiptRef(null)}
      />
    </div>
  );
};
