import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  DollarSign,
  Download,
  X,
} from 'lucide-react';
import api from '../api/client';
import { ReceiptModal } from '../components/ReceiptModal';
import { useAuth } from '../context/AuthContext';

export const TransactionsPage = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    total: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Filter States
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [selectedReceiptRef, setSelectedReceiptRef] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        search,
        category,
        status,
      });
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);

      const res = await api.get(`/transfers?${params.toString()}`);
      setTransactions(res.data.data);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [category, status]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategory('');
    setStatus('');
    setMinAmount('');
    setMaxAmount('');
    setTimeout(() => fetchTransactions(1), 0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in font-mono">
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Enterprise Transaction Ledger
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Cryptographically immutable journal with search, filters, and digital clearing vouchers
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-zinc-950 rounded-2xl p-5 border border-zinc-800 space-y-4 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Keyword Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search reference, merchant, email, memo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
          >
            <option value="">All Categories</option>
            <option value="Transfers">Transfers</option>
            <option value="Investments">Investments</option>
            <option value="Treasury">Treasury</option>
            <option value="Restaurants">Restaurants</option>
            <option value="Subscriptions">Subscriptions</option>
            <option value="Utilities">Utilities</option>
            <option value="Shopping">Shopping</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs focus:outline-none focus:border-white"
          >
            <option value="">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="pending_review">Pending Review</option>
            <option value="rejected">Rejected</option>
            <option value="refunded">Refunded</option>
          </select>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold transition-all shadow-glow-white"
            >
              Filter
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition-colors border border-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Amount Range Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-zinc-800 text-xs">
          <span className="text-zinc-400">Amount Filter:</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="Min $"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              className="w-24 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-white"
            />
            <span className="text-zinc-600">-</span>
            <input
              type="number"
              placeholder="Max $"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              className="w-24 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-white"
            />
          </div>
          <span className="text-zinc-500 ml-auto">
            Results: <strong className="text-white">{pagination.total}</strong>
          </span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                <th className="py-3 px-4">Txn Reference</th>
                <th className="py-3 px-4">Counterparty</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Memo</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-zinc-500">
                    <div className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                    <p>Querying immutable ledger nodes...</p>
                  </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => {
                  const isSender = tx.senderId === user?.id || tx.senderName === user?.fullName;
                  return (
                    <tr key={tx._id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{tx.reference}</td>
                      <td className="py-3.5 px-4 text-zinc-200">
                        {isSender ? `To: ${tx.receiverName}` : `From: ${tx.senderName}`}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-400">{tx.category}</td>
                      <td className="py-3.5 px-4 text-zinc-500 truncate max-w-[140px]">
                        {tx.note || '—'}
                      </td>
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
                              : tx.status === 'refunded'
                              ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
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
                          isSender ? 'text-zinc-400' : 'text-white'
                        }`}
                      >
                        {isSender ? '-' : '+'}${tx.amount.toLocaleString()} USD
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
                  <td colSpan="8" className="py-8 text-center text-zinc-500">
                    No transactions matched your query filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-5 border-t border-zinc-800 text-xs">
          <span className="text-zinc-400">
            Page <strong className="text-white">{pagination.page}</strong> of{' '}
            <strong className="text-white">{pagination.totalPages}</strong>
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchTransactions(pagination.page - 1)}
              disabled={!pagination.hasPrevPage}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => fetchTransactions(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 disabled:opacity-30 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ReceiptModal
        reference={selectedReceiptRef}
        isOpen={!!selectedReceiptRef}
        onClose={() => setSelectedReceiptRef(null)}
      />
    </div>
  );
};
