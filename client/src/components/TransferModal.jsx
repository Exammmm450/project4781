import React, { useState } from 'react';
import {
  X,
  Send,
  UploadCloud,
  FileCheck,
  AlertTriangle,
  CreditCard,
  Building,
  Mail,
  CheckCircle,
  User,
  Sparkles,
} from 'lucide-react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export const TransferModal = ({ isOpen, onClose, onTransferSuccess }) => {
  const { account, refreshUserData } = useAuth();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Transfers');
  const [note, setNote] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  if (!isOpen) return null;

  // Quick Transfer Contacts
  const quickContacts = [
    { name: 'Elena Rostova', id: 'ACC-8492-3104', initials: 'ER', tag: 'Personal' },
    { name: 'Alexander Vance', id: 'ACC-0001-9999', initials: 'AV', tag: 'Ops HQ' },
    { name: 'Satoshi Capital', id: 'ACC-7721-0012', initials: 'SC', tag: 'Partner' },
    { name: 'Quantum Liquidity', id: 'treasury@satoshicapital.com', initials: 'QL', tag: 'Escrow' },
  ];

  const numAmount = parseFloat(amount) || 0;
  const isHighValue = numAmount >= 10000;
  const currentBalance = account?.balance || 0;
  const isExceedingBalance = numAmount > currentBalance;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setReceiptFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleSelectContact = (contactId) => {
    setRecipient(contactId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (isExceedingBalance) {
      setErrorMsg('Transfer amount exceeds available account balance');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('receiverIdentifier', recipient);
      formData.append('amount', amount);
      formData.append('category', category);
      formData.append('note', note);
      if (receiptFile) {
        formData.append('receipt', receiptFile);
      }

      const res = await api.post('/transfers', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      await refreshUserData();
      setSuccessData(res.data);
      if (onTransferSuccess) {
        onTransferSuccess(res.data.data.transaction);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Transfer execution failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRecipient('');
    setAmount('');
    setNote('');
    setReceiptFile(null);
    setErrorMsg('');
    setSuccessData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-white">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {successData ? (
          /* Settlement Confirmation Screen */
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-white text-zinc-950 flex items-center justify-center mb-4 shadow-glow-white">
              <CheckCircle className="w-9 h-9" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Settlement Dispatched</h3>
            <p className="text-sm text-zinc-300 max-w-sm mb-5 font-mono">
              {successData.message}
            </p>
            <div className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left font-mono text-xs space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-zinc-400">Reference:</span>
                <span className="text-white font-bold">{successData.data.transaction.reference}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Amount Settled:</span>
                <span className="text-white font-bold">
                  ${parseFloat(successData.data.transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Status:</span>
                <span
                  className={`capitalize font-bold ${
                    successData.data.transaction.status === 'completed'
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {successData.data.transaction.status}
                </span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm font-mono transition-all shadow-lg shadow-white/10"
            >
              Return to Treasury
            </button>
          </div>
        ) : (
          /* Transfer Input Form */
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-white text-zinc-950">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Transfer Liquidity</h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Atomic P2P, Interbank & Wire Settlement
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
                {errorMsg}
              </div>
            )}

            {/* Pro Feature: Quick Transfer Contacts */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                  Quick Recipients
                </span>
                <span className="text-[10px] font-mono text-zinc-500">Click to autofill</span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {quickContacts.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectContact(c.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all shrink-0 text-left ${
                      recipient === c.id
                        ? 'bg-white text-zinc-950 border-white font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                        recipient === c.id ? 'bg-zinc-950 text-white' : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {c.initials}
                    </span>
                    <div className="text-[11px] font-mono leading-tight">
                      <p className="truncate max-w-[90px]">{c.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Recipient Input */}
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  Recipient (Account #, 16-Digit Card, or Email)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="ACC-8492-3104 or user@domain.com or 4xxx..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm font-mono focus:outline-none focus:border-white transition-colors"
                  />
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 text-zinc-500 text-xs">
                    <Building className="w-3.5 h-3.5" />
                    <CreditCard className="w-3.5 h-3.5" />
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>

              {/* Amount & Available Balance */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-mono uppercase text-zinc-400">Amount (USD)</label>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Checking:{' '}
                    <strong className="text-white font-bold">
                      ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-2.5 text-zinc-400 font-mono text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-900 border text-white placeholder-zinc-600 text-sm font-mono focus:outline-none transition-colors ${
                      isExceedingBalance ? 'border-rose-500' : 'border-zinc-800 focus:border-white'
                    }`}
                  />
                </div>
                {isExceedingBalance && (
                  <p className="text-[11px] text-rose-400 mt-1 font-mono">
                    Insufficient checking balance.
                  </p>
                )}
              </div>

              {/* Compliance High Value Alert */}
              {isHighValue && (
                <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/40 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300 font-mono leading-relaxed">
                    <strong>Institutional Sentinel:</strong> Amounts ≥ $10,000 will be held in
                    escrow for Ops HQ verification before final release.
                  </p>
                </div>
              )}

              {/* Category & Memo Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono focus:outline-none focus:border-white transition-colors"
                  >
                    <option value="Transfers">Transfers</option>
                    <option value="Investments">Investments</option>
                    <option value="Treasury">Treasury</option>
                    <option value="Restaurants">Restaurants</option>
                    <option value="Subscriptions">Subscriptions</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Shopping">Shopping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                    Memo / Note
                  </label>
                  <input
                    type="text"
                    placeholder="Invoice # or Note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono placeholder-zinc-600 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>

              {/* Drag-and-Drop Receipt Attachment */}
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">
                  Attach Voucher / Bill (Optional)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-white bg-zinc-900'
                      : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                  }`}
                  onClick={() => document.getElementById('transfer-receipt-input')?.click()}
                >
                  <input
                    id="transfer-receipt-input"
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    onChange={handleFileChange}
                  />
                  {receiptFile ? (
                    <div className="flex items-center justify-center gap-2 text-white text-xs font-mono">
                      <FileCheck className="w-4 h-4 text-emerald-400" />
                      <span className="truncate max-w-[220px]">{receiptFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReceiptFile(null);
                        }}
                        className="text-zinc-500 hover:text-rose-400 ml-2"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-zinc-400">
                      <UploadCloud className="w-5 h-5 text-zinc-500" />
                      <span className="text-xs">Drag & drop receipt or browse</span>
                      <span className="text-[10px] text-zinc-500">PDF, PNG, JPG up to 10MB</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || isExceedingBalance}
                className="w-full mt-2 py-3.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-40 text-zinc-950 font-bold font-mono text-sm tracking-wide transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="font-mono text-xs animate-pulse">SETTLING ATOMICALLY...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Authorize & Execute Transfer</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
