import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Activity,
  Users,
  AlertTriangle,
  Radio,
  CheckCircle,
  XCircle,
  RotateCcw,
  Search,
  Lock,
  Unlock,
  KeyRound,
  DollarSign,
  TrendingUp,
  Cpu,
  RefreshCw,
  Sliders,
  ExternalLink,
  Eye,
  CreditCard,
  Building,
  PlusCircle,
  MinusCircle,
  X,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export const OpsTerminalPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users'); // default to 'users' for immediate access to directory!

  // Data States
  const [pulse, setPulse] = useState(null);
  const [clients, setClients] = useState([]);
  const [flaggedTxns, setFlaggedTxns] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [clock, setClock] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  // Modals
  const [selectedUserForAdjustment, setSelectedUserForAdjustment] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('credit'); // 'credit' or 'debit'
  const [adjustLimitVal, setAdjustLimitVal] = useState('');
  const [adjustReason, setAdjustReason] = useState('Executive Liquidity Inflow');
  const [adjustTierVal, setAdjustTierVal] = useState('premium');

  // Inspection Modal (Cards & Recent Transactions)
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [loadingInspect, setLoadingInspect] = useState(false);

  const auditStreamRef = useRef(null);

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setClock(now.toISOString().replace('T', ' // ').replace('Z', ' UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch initial data
  const fetchPulse = async () => {
    try {
      const res = await api.get('/admin/pulse');
      setPulse(res.data.data);
    } catch (err) {
      console.error('Pulse fetch failed:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (userSearch) params.append('search', userSearch);
      if (userStatusFilter) params.append('status', userStatusFilter);
      const res = await api.get(`/admin/users?${params.toString()}`);
      setClients(res.data.data);
    } catch (err) {
      console.error('Users fetch failed:', err);
    }
  };

  const fetchFlagged = async () => {
    try {
      const res = await api.get('/admin/flagged');
      setFlaggedTxns(res.data.data);
    } catch (err) {
      console.error('Flagged fetch failed:', err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await api.get('/admin/audit');
      setAuditEvents(res.data.data);
    } catch (err) {
      console.error('Audit fetch failed:', err);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPulse(), fetchUsers(), fetchFlagged(), fetchAuditLogs()]).finally(() =>
      setLoading(false)
    );
  }, [userStatusFilter]);

  // Subscribe to live SSE Audit Stream
  useEffect(() => {
    const token = localStorage.getItem('titan_access_token');
    const eventSource = new EventSource(
      `http://localhost:5000/api/admin/audit/stream?auth=${encodeURIComponent(token || '')}`,
      { withCredentials: true }
    );

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'BACKFILL') {
          setAuditEvents((prev) => {
            const combined = [...payload.events, ...prev];
            const unique = Array.from(
              new Map(combined.map((item) => [item._id || item.timestamp, item])).values()
            );
            return unique.slice(0, 50);
          });
        } else if (payload.type === 'EVENT') {
          setAuditEvents((prev) => [payload.event, ...prev.slice(0, 49)]);
        }
      } catch (err) {
        // Heartbeat or ping
      }
    };

    auditStreamRef.current = eventSource;

    return () => {
      if (auditStreamRef.current) {
        auditStreamRef.current.close();
      }
    };
  }, []);

  // 1-Click Toggle User Status (Active / Frozen / Suspended)
  const handleToggleUserStatus = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'active' ? 'frozen' : 'active';
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      setActionMsg(`User and account status updated to '${nextStatus.toUpperCase()}'`);
      fetchUsers();
      fetchPulse();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Status change failed');
    }
  };

  // 1-Click Force Reset Session (Revoke Token Version)
  const handleForceResetSession = async (userId, email) => {
    try {
      await api.post(`/admin/users/${userId}/force-reset-session`);
      setActionMsg(`Active cryptographic session revoked for ${email}. User must re-authenticate.`);
      fetchUsers();
    } catch (err) {
      setActionMsg('Failed to revoke session');
    }
  };

  // Open Adjust Balance / Limit Modal
  const openAdjustmentModal = (client) => {
    setSelectedUserForAdjustment(client);
    setAdjustLimitVal(String(client.dailyLimit || 50000));
    setAdjustTierVal(client.tier || 'premium');
    setAdjustAmount('');
    setAdjustType('credit');
    setAdjustReason('Executive Liquidity Inflow');
  };

  // Commit Balance / Limit Changes
  const handleCommitAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedUserForAdjustment) return;

    try {
      // 1. Adjust limits and tier
      await api.patch(`/admin/users/${selectedUserForAdjustment._id}/limits`, {
        dailyLimit: parseFloat(adjustLimitVal),
        tier: adjustTierVal,
      });

      // 2. Adjust balance if amount provided
      if (adjustAmount && parseFloat(adjustAmount) > 0) {
        await api.patch(`/admin/users/${selectedUserForAdjustment._id}/balance`, {
          amount: parseFloat(adjustAmount),
          type: adjustType,
          reason: adjustReason,
        });
      }

      setActionMsg(`Parameters and balance committed for ${selectedUserForAdjustment.email}`);
      setSelectedUserForAdjustment(null);
      fetchUsers();
      fetchPulse();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Adjustment failed');
    }
  };

  // Open User Inspection Modal (Cards & Ledger)
  const handleInspectUser = async (client) => {
    setInspectUser(client);
    setLoadingInspect(true);
    try {
      const res = await api.get(`/admin/users/${client._id}/details`);
      setInspectData(res.data.data);
    } catch (err) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoadingInspect(false);
    }
  };

  // Review Flagged Transaction
  const handleReviewTxn = async (reference, decision) => {
    try {
      const res = await api.post(`/admin/flagged/${reference}/review`, {
        decision,
        reason: `Command HQ Authorized: ${decision.toUpperCase()}`,
      });
      setActionMsg(res.data.message);
      fetchFlagged();
      fetchPulse();
    } catch (err) {
      setActionMsg(err.response?.data?.message || 'Review action failed');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-mono text-white">
      {/* Ops HQ Holographic Header */}
      <div className="bg-zinc-950 rounded-2xl p-6 sm:p-8 border border-zinc-700 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-white text-zinc-950 shadow-glow-white">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-wider">
                  TITAN OPS HQ // COMMAND BACK-OFFICE
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-zinc-950 uppercase">
                  OMEGA LEVEL
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Stealth Administrative Terminal // Live Liquidity & Compliance Sentinel
              </p>
            </div>
          </div>

          <div className="text-right text-xs">
            <p className="text-zinc-500">SYSTEM TIME (UTC):</p>
            <p className="text-white font-bold tracking-wider">{clock}</p>
          </div>
        </div>

        {actionMsg && (
          <div className="mt-4 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white text-xs flex items-center justify-between">
            <span className="font-bold">{actionMsg}</span>
            <button onClick={() => setActionMsg('')} className="text-zinc-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-zinc-800 overflow-x-auto text-xs">
          <button
            onClick={() => {
              setActiveTab('users');
              fetchUsers();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-white text-zinc-950 shadow-glow-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Bank Users & Directory ({clients.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pulse')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'pulse'
                ? 'bg-white text-zinc-950 shadow-glow-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Liquidity Pulse</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('fraud');
              fetchFlagged();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'fraud'
                ? 'bg-white text-zinc-950 shadow-glow-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Fraud Sentinel ({flaggedTxns.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-white text-zinc-950 shadow-glow-white'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Security Stream (Live)</span>
          </button>
        </div>
      </div>

      {/* ================= TAB: BANK USERS & ACCOUNTS DIRECTORY ================= */}
      {activeTab === 'users' && (
        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 space-y-5 animate-fade-in shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">
                Bank Users & Accounts Directory
              </h2>
              <p className="text-xs text-zinc-400">
                Live oversight, 1-click Freeze/Unfreeze, balance credit/debit, and account inspection
              </p>
            </div>

            {/* Filter and Search Box */}
            <div className="flex items-center gap-2">
              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
                <option value="suspended">Suspended</option>
              </select>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search name, email, account, IBAN..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-white"
                />
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                className="px-3 py-2 rounded-xl bg-white text-zinc-950 font-bold text-xs"
              >
                Query
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4">Client Entity / Email</th>
                  <th className="py-3 px-4">Role & Tier</th>
                  <th className="py-3 px-4">Account Number / IBAN</th>
                  <th className="py-3 px-4 text-right">Liquidity Balance</th>
                  <th className="py-3 px-4 text-right">Daily Limit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registration</th>
                  <th className="py-3 px-4 text-center">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {clients.map((c) => {
                  const isFrozen = c.status === 'frozen' || c.status === 'suspended';
                  return (
                    <tr key={c._id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-white text-sm">{c.fullName}</p>
                        <p className="text-[11px] text-zinc-400">{c.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.role === 'admin'
                              ? 'bg-white text-zinc-950'
                              : 'bg-zinc-900 text-zinc-300 border border-zinc-800'
                          }`}
                        >
                          {c.role} // {c.tier || 'PREMIUM'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {c.account ? (
                          <div>
                            <p className="text-white font-bold">{c.account.accountNumber}</p>
                            <p className="text-[10px] text-zinc-500">{c.account.iban}</p>
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {c.account ? (
                          <div>
                            <p className="text-white font-bold text-sm">
                              ${c.account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </p>
                            {c.account.savingsBalance > 0 && (
                              <p className="text-[10px] text-emerald-400">
                                +${c.account.savingsBalance.toLocaleString()} Vault
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-300 font-bold">
                        ${(c.dailyLimit || 50000).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${
                            c.status === 'active'
                              ? 'bg-zinc-900 text-white border border-zinc-700'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'
                            }`}
                          />
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-[11px]">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. Action: Freeze / Unfreeze */}
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(c._id, c.status)}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors flex items-center gap-1 ${
                              isFrozen
                                ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
                                : 'bg-zinc-900 border-zinc-800 text-rose-400 hover:bg-rose-950/40'
                            }`}
                            title={isFrozen ? 'Unfreeze Account' : 'Freeze & Lock Account'}
                          >
                            {isFrozen ? (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Unfreeze</span>
                              </>
                            ) : (
                              <>
                                <Lock className="w-3.5 h-3.5" />
                                <span>Freeze</span>
                              </>
                            )}
                          </button>

                          {/* 2. Action: Adjust Balance / Limits */}
                          <button
                            type="button"
                            onClick={() => openAdjustmentModal(c)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs flex items-center gap-1 transition-colors"
                            title="Adjust Balance and Spending Limit"
                          >
                            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Adjust</span>
                          </button>

                          {/* 3. Action: Inspect User (Cards & Transactions) */}
                          <button
                            type="button"
                            onClick={() => handleInspectUser(c)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                            title="Inspect Cards & Transaction History"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Action: Force Reset Session */}
                          <button
                            type="button"
                            onClick={() => handleForceResetSession(c._id, c.email)}
                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                            title="Revoke Active Session Token"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB: LIQUIDITY PULSE ================= */}
      {activeTab === 'pulse' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
              <span className="text-xs text-zinc-400 uppercase font-semibold">Total Platform Liquidity</span>
              <h3 className="text-3xl font-black text-white mt-1">
                ${(pulse?.totalLiquidity || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Aggregate Checking & Vault Reserves</p>
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
              <span className="text-xs text-zinc-400 uppercase font-semibold">24H Settlement Volume</span>
              <h3 className="text-3xl font-black text-white mt-1">
                ${(pulse?.volume24h || 0).toLocaleString()} USD
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">{pulse?.count24h || 0} transfers cleared</p>
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
              <span className="text-xs text-zinc-400 uppercase font-semibold">Reserve Ratio</span>
              <h3 className="text-3xl font-black text-white mt-1">
                {pulse?.reserveCoverageRatio || '142.8%'}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Tier-1 Capital Certified</p>
            </div>

            <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
              <span className="text-xs text-zinc-400 uppercase font-semibold">Pending Compliance Flags</span>
              <h3 className="text-3xl font-black text-amber-400 mt-1">
                {pulse?.pendingFraudCount || 0}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-1">Escrowed transfers requiring review</p>
            </div>
          </div>

          <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  24-Hour Settlement Velocity Pulse
                </h3>
                <p className="text-xs text-zinc-400">Intraday throughput by hourly interval</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-white text-xs">
                Avg Latency: {pulse?.settlementSpeedAvg || '48ms'}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pulse?.hourlyVelocity || []}>
                  <defs>
                    <linearGradient id="pulseMonochrome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FFFFFF" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FFFFFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" stroke="#52525B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#52525B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#09090B',
                      border: '1px solid #27272A',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volume"
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#pulseMonochrome)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: FRAUD & FLAGGED MONITOR ================= */}
      {activeTab === 'fraud' && (
        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 space-y-5 animate-fade-in shadow-2xl">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              High-Value & Fraud Flagged Ledger
            </h3>
            <p className="text-xs text-zinc-400">
              Operations exceeding $10,000 threshold or flagged by algorithmic risk rules
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                  <th className="py-3 px-4">Txn Ref</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Flag Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Decisions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {flaggedTxns.length > 0 ? (
                  flaggedTxns.map((tx) => (
                    <tr key={tx._id} className="hover:bg-zinc-900/60">
                      <td className="py-3.5 px-4 font-bold text-white">{tx.reference}</td>
                      <td className="py-3.5 px-4 text-zinc-200">{tx.senderName}</td>
                      <td className="py-3.5 px-4 text-zinc-200">{tx.receiverName}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        ${tx.amount.toLocaleString()} USD
                      </td>
                      <td className="py-3.5 px-4 text-amber-300 text-[11px] max-w-[220px]">
                        {tx.fraudReason || 'High-value threshold flag'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            tx.status === 'completed'
                              ? 'bg-zinc-900 text-white border border-zinc-700'
                              : tx.status === 'pending_review'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {tx.status === 'pending_review' && (
                            <>
                              <button
                                onClick={() => handleReviewTxn(tx.reference, 'approve')}
                                className="px-3 py-1.5 rounded-lg bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold shadow-sm"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewTxn(tx.reference, 'reject')}
                                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-rose-500/50 text-rose-400 hover:bg-rose-950 text-xs font-bold"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {tx.status === 'completed' && (
                            <button
                              onClick={() => handleReviewTxn(tx.reference, 'refund')}
                              className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-bold"
                            >
                              Refund
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-zinc-500">
                      No flagged risk transactions requiring action.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB: SECURITY AUDIT STREAM ================= */}
      {activeTab === 'audit' && (
        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 space-y-4 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Node.js EventEmitter Audit Terminal
              </h3>
            </div>
            <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              SSE Stream Connected
            </span>
          </div>

          <div className="h-[480px] overflow-y-auto space-y-2 pr-2">
            {auditEvents.map((evt, idx) => (
              <div
                key={evt._id || idx}
                className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/60 text-xs"
              >
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="font-bold text-white">{evt.action}</span>
                  <span className="text-zinc-500">
                    {new Date(evt.createdAt || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                  <div>
                    <span className="text-zinc-500">Actor: </span>
                    <span className="text-zinc-200 font-bold">{evt.actorEmail || 'system'}</span>
                    {evt.targetId && (
                      <>
                        <span className="text-zinc-500 ml-2">Target: </span>
                        <span className="text-zinc-300">{evt.targetId}</span>
                      </>
                    )}
                  </div>
                  <span className="text-zinc-600 text-[10px]">IP: {evt.ip || '127.0.0.1'}</span>
                </div>

                {evt.details && Object.keys(evt.details).length > 0 && (
                  <div className="mt-1.5 p-2 rounded bg-black/60 text-[10px] font-mono text-zinc-400 overflow-x-auto border border-zinc-800/60">
                    {JSON.stringify(evt.details)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= MODAL: ADJUST BALANCE & LIMITS ================= */}
      {selectedUserForAdjustment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-700 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-base font-bold text-white uppercase">
                Adjust Parameters for {selectedUserForAdjustment.fullName}
              </h3>
              <button
                onClick={() => setSelectedUserForAdjustment(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCommitAdjustment} className="space-y-4">
              {/* Balance Credit / Debit */}
              <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <span className="text-xs uppercase text-zinc-400 font-bold block">
                  Modify Account Balance (Direct Clearing)
                </span>
                <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setAdjustType('credit')}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      adjustType === 'credit'
                        ? 'bg-white text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    + Credit Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('debit')}
                    className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                      adjustType === 'debit'
                        ? 'bg-white text-zinc-950'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    - Debit Account
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-zinc-500 text-xs">$</span>
                  <input
                    type="number"
                    step="100"
                    placeholder="Adjustment Amount (e.g. 5000)"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Reason / Treasury Memo"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              {/* Limits and Tier */}
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Daily Limit (USD)</label>
                <input
                  type="number"
                  value={adjustLimitVal}
                  onChange={(e) => setAdjustLimitVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Clearance Tier</label>
                <select
                  value={adjustTierVal}
                  onChange={(e) => setAdjustTierVal(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="institutional">Institutional</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs shadow-glow-white transition-all"
                >
                  Authorize Changes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUserForAdjustment(null)}
                  className="px-4 py-3 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white text-xs border border-zinc-800"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: USER INSPECTION (CARDS & TRANSACTIONS) ================= */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-zinc-950 border border-zinc-700 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-white uppercase">
                  Account Deep-Dive: {inspectUser.fullName}
                </h3>
                <p className="text-xs text-zinc-400">{inspectUser.email}</p>
              </div>
              <button
                onClick={() => setInspectUser(null)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {loadingInspect ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : inspectData ? (
              <div className="space-y-6">
                {/* Linked Account Balance Snapshot */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                  <div>
                    <span className="text-zinc-500 block uppercase">Primary Account</span>
                    <span className="text-white font-bold">{inspectData.account?.accountNumber}</span>
                    <span className="text-zinc-400 block text-[10px] mt-0.5">{inspectData.account?.iban}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block uppercase">Balance</span>
                    <span className="text-white font-black text-lg">
                      ${(inspectData.account?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                    </span>
                    <span className="text-emerald-400 block text-[10px]">
                      +${(inspectData.account?.savingsBalance || 0).toLocaleString()} in Vault
                    </span>
                  </div>
                </div>

                {/* Linked Cards */}
                <div>
                  <h4 className="text-xs uppercase text-zinc-400 font-bold mb-3 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-white" /> Linked Virtual Cards ({inspectData.cards?.length || 0})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inspectData.cards?.map((card) => (
                      <div
                        key={card._id}
                        className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-white">{card.brand}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              card.status === 'active' ? 'bg-zinc-800 text-white' : 'bg-rose-950 text-rose-300'
                            }`}
                          >
                            {card.status}
                          </span>
                        </div>
                        <p className="font-mono text-sm tracking-wider text-white select-all">
                          {card.cardNumber || card.maskedNumber}
                        </p>
                        <div className="flex justify-between text-[10px] text-zinc-400 pt-1">
                          <span>EXP: {card.expiryMonth}/{card.expiryYear}</span>
                          <span>CVV: <strong className="text-white">{card.cvv}</strong></span>
                          <span>CAP: ${card.monthlyLimit?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent 10 Transactions */}
                <div>
                  <h4 className="text-xs uppercase text-zinc-400 font-bold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-white" /> Recent 10 Transactions
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-zinc-800">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-900 text-zinc-400 text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-3">Counterparty</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {inspectData.recentTransactions?.length > 0 ? (
                          inspectData.recentTransactions.map((tx) => (
                            <tr key={tx._id} className="hover:bg-zinc-900/40">
                              <td className="py-2.5 px-3 font-bold text-white">{tx.reference}</td>
                              <td className="py-2.5 px-3 text-zinc-300">{tx.receiverName}</td>
                              <td className="py-2.5 px-3">
                                <span className="text-[10px] font-bold uppercase text-zinc-300">
                                  {tx.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-white">
                                ${tx.amount.toLocaleString()}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" className="py-4 text-center text-zinc-500">
                              No recent transactions recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
