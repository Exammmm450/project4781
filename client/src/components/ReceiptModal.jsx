import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Printer,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Building2,
  Clock,
  Hash,
} from 'lucide-react';
import api from '../api/client';

export const ReceiptModal = ({ reference, isOpen, onClose }) => {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && reference) {
      setLoading(true);
      api
        .get(`/transfers/${reference}/receipt`)
        .then((res) => {
          setReceipt(res.data.data);
        })
        .catch((err) => console.error('Failed to load receipt:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, reference]);

  if (!isOpen) return null;

  const downloadJsonReceipt = () => {
    if (!receipt) return;
    const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TITAN-RECEIPT-${receipt.reference}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in print:bg-white print:p-0">
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors print:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono text-zinc-400">RETRIEVING IMMUTABLE VOUCHER...</p>
          </div>
        ) : receipt ? (
          <div>
            {/* Bank Header */}
            <div className="text-center pb-5 border-b border-zinc-800 print:border-zinc-300">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-white text-[11px] font-mono uppercase tracking-widest mb-3 print:bg-zinc-100 print:text-black">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>OFFICIAL FINANCIAL CLEARING VOUCHER</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white print:text-black">
                TITAN ARCHITECTURAL BANK
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Institutional Treasury & Real-Time Gross Settlement
              </p>
            </div>

            {/* Central Amount Box */}
            <div className="my-6 p-5 rounded-xl bg-zinc-900 border border-zinc-800 text-center print:bg-zinc-50 print:border-zinc-300">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Settled Transaction Amount
              </span>
              <h1 className="text-3xl sm:text-4xl font-mono font-black text-white mt-1 print:text-black">
                ${parseFloat(receipt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-sm font-normal text-zinc-400 ml-2">{receipt.currency}</span>
              </h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-white border border-zinc-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {receipt.status}
                </span>
                <span className="text-[10px] font-mono text-zinc-400">Fee: $0.00 USD</span>
              </div>
            </div>

            {/* Structured Receipt Ledger Details */}
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> Ledger Reference:
                </span>
                <span className="text-white font-bold select-all print:text-black">
                  {receipt.reference}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Timestamp (UTC):
                </span>
                <span className="text-zinc-200 print:text-black">
                  {new Date(receipt.issueDate).toUTCString()}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-400">Category / Allocation:</span>
                <span className="text-white font-medium print:text-black">{receipt.category}</span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-400">Originating Sender:</span>
                <span className="text-zinc-200 font-semibold print:text-black">
                  {receipt.sender.name}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-400">Beneficiary Recipient:</span>
                <span className="text-zinc-200 font-semibold print:text-black">
                  {receipt.recipient.name}
                </span>
              </div>

              <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                <span className="text-zinc-400">Recipient Identifier:</span>
                <span className="text-white font-bold print:text-black">
                  {receipt.recipient.identifier}
                </span>
              </div>

              {receipt.hasAttachment && (
                <div className="flex justify-between py-1.5 border-b border-zinc-800/80">
                  <span className="text-zinc-400">Attached Invoice / Bill:</span>
                  <a
                    href={`http://localhost:5000${receipt.attachmentUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white underline flex items-center gap-1 hover:text-zinc-300"
                  >
                    <span>View Attachment</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Official Certification Stamp Box */}
            <div className="mt-6 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between font-mono text-[10px] text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-white" />
                <div>
                  <p className="text-white font-bold tracking-wider">
                    {receipt.verificationStamp || 'VERIFIED BY TITAN LEDGER'}
                  </p>
                  <p className="text-[9px] text-zinc-500 truncate max-w-[240px]">
                    {receipt.auditSignature}
                  </p>
                </div>
              </div>
              <div className="px-2 py-1 rounded bg-black border border-zinc-700 text-white font-bold text-[9px]">
                CLEARED
              </div>
            </div>

            {/* Actions for User */}
            <div className="grid grid-cols-2 gap-3 mt-6 print:hidden">
              <button
                type="button"
                onClick={downloadJsonReceipt}
                className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-mono text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-mono text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-white/10"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Official Slip</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-rose-400 text-xs font-mono">Unable to retrieve voucher metadata.</p>
        )}
      </div>
    </div>
  );
};
