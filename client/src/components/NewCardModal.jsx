import React, { useState } from 'react';
import { X, CreditCard, Sparkles, ShieldCheck } from 'lucide-react';
import api from '../api/client';

export const NewCardModal = ({ isOpen, onClose, onCardCreated }) => {
  const [brand, setBrand] = useState('VISA');
  const [colorTheme, setColorTheme] = useState('obsidian-black');
  const [monthlyLimit, setMonthlyLimit] = useState('15000');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await api.post('/cards/issue', {
        brand,
        colorTheme,
        monthlyLimit: Number(monthlyLimit),
      });

      if (onCardCreated) {
        onCardCreated(res.data.data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to issue virtual card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-white text-zinc-950">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Issue Virtual Card</h3>
            <p className="text-xs text-zinc-400 font-mono">
              Luhn Algorithm ISO/IEC 7812 // Instant Digital Clearing
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 font-mono">
          {/* Payment Network */}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-2">
              Payment Network
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBrand('VISA')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${
                  brand === 'VISA'
                    ? 'border-white bg-white text-zinc-950 font-bold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-sm font-bold">VISA</span>
                <span className="text-[10px] opacity-70">4xxx Series</span>
              </button>

              <button
                type="button"
                onClick={() => setBrand('MASTERCARD')}
                className={`py-3 px-4 rounded-xl border flex items-center justify-between transition-all ${
                  brand === 'MASTERCARD'
                    ? 'border-white bg-white text-zinc-950 font-bold'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <span className="text-sm font-bold">MASTERCARD</span>
                <span className="text-[10px] opacity-70">5xxx Series</span>
              </button>
            </div>
          </div>

          {/* Architectural Design Material */}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-2">
              Architectural Card Material
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setColorTheme('obsidian-black')}
                className={`p-3 rounded-xl border flex flex-col gap-1 text-left transition-all ${
                  colorTheme === 'obsidian-black'
                    ? 'border-white bg-zinc-900 text-white font-bold ring-1 ring-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-zinc-950 border border-zinc-700 shadow-sm" />
                  <span className="text-xs">Obsidian Black</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Brushed metal dark finish
                </span>
              </button>

              <button
                type="button"
                onClick={() => setColorTheme('titanium-white')}
                className={`p-3 rounded-xl border flex flex-col gap-1 text-left transition-all ${
                  colorTheme === 'titanium-white'
                    ? 'border-white bg-zinc-100 text-zinc-950 font-bold ring-1 ring-white'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full bg-white border border-zinc-300 shadow-sm" />
                  <span className="text-xs">Titanium White</span>
                </div>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Chalk-matte laser finish
                </span>
              </button>
            </div>
          </div>

          {/* Monthly Spending Limit */}
          <div>
            <label className="block text-xs uppercase text-zinc-400 mb-1.5">
              Monthly Limit (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2.5 text-zinc-500 text-sm">$</span>
              <input
                type="number"
                min="500"
                step="500"
                required
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 text-zinc-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Card valid for 3 years with Luhn check and dynamic CVV shield.</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-white/10 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="animate-pulse">COMPUTING CIPHER...</span>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Issue Instant Virtual Card</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
