import React, { useState, useEffect } from 'react';
import { Send, Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, FileText } from 'lucide-react';
import api from '../api/client';
import { TransferModal } from '../components/TransferModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { useAuth } from '../context/AuthContext';

export const TransfersPage = () => {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState([]);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedReceiptRef, setSelectedReceiptRef] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      const res = await api.get('/transfers?category=Transfers&limit=20');
      setTransfers(res.data.data);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, []);

  const frequentRecipients = [
    { name: 'Satoshi Capital Partners', id: 'ACC-7721-0012', type: 'Institutional' },
    { name: 'Alexander Vance (Ops)', id: 'ACC-0001-9999', type: 'Treasury HQ' },
    { name: 'Global Liquidity Escrow', id: 'treasury@satoshicapital.com', type: 'Email' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Transfers & Gross Settlement
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Execute atomic P2P wires and interbank transfers with digital receipt vouchers
          </p>
        </div>

        <button
          onClick={() => setIsTransferOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-xs tracking-wider transition-all shadow-glow-white"
        >
          <Send className="w-4 h-4" />
          <span>New Settlement Wire</span>
        </button>
      </div>

      {/* Verified Counterparties */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-zinc-400 mb-3 font-bold">
          Verified Institutional Counterparties
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {frequentRecipients.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setIsTransferOpen(true)}
              className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 hover:border-zinc-500 cursor-pointer transition-all flex items-center justify-between group shadow-sm"
            >
              <div>
                <p className="text-sm font-bold text-white group-hover:text-zinc-300 transition-colors">
                  {rec.name}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">{rec.id}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
                  {rec.type}
                </span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
            </div>
          ))}
        </div>
      </div>

      {/* Transfers Ledger Table */}
      <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
          Transfer Settlement Log
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase text-[10px]">
                <th className="py-3 px-4">Txn Reference</th>
                <th className="py-3 px-4">Beneficiary</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Settled Amount</th>
                <th className="py-3 px-4 text-center">Voucher</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-zinc-500">
                    Loading transfer history...
                  </td>
                </tr>
              ) : transfers.length > 0 ? (
                transfers.map((tx) => {
                  const isSender = tx.senderId === user?.id || tx.senderName === user?.fullName;
                  return (
                    <tr key={tx._id} className="hover:bg-zinc-900/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-white">{tx.reference}</td>
                      <td className="py-3.5 px-4 text-zinc-200">
                        {isSender ? tx.receiverName : tx.senderName}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500">
                        {new Date(tx.createdAt).toLocaleString()}
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
                  <td colSpan="6" className="py-8 text-center text-zinc-500">
                    No transfer settlements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onTransferSuccess={fetchTransfers}
      />
      <ReceiptModal
        reference={selectedReceiptRef}
        isOpen={!!selectedReceiptRef}
        onClose={() => setSelectedReceiptRef(null)}
      />
    </div>
  );
};
