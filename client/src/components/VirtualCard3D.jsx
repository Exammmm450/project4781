import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  RotateCw,
  Wifi,
  Sparkles,
  Sliders,
} from 'lucide-react';
import api from '../api/client';

export const VirtualCard3D = ({ card, onCardUpdated, showLimitSlider = false }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCvv, setShowCvv] = useState(false);
  const [freezing, setFreezing] = useState(false);
  const [currentLimit, setCurrentLimit] = useState(card?.monthlyLimit || 15000);
  const [updatingLimit, setUpdatingLimit] = useState(false);

  if (!card) return null;

  const isFrozen = card.status === 'frozen';
  const isWhiteTheme = card.colorTheme === 'titanium-white';

  const copyNumber = (e) => {
    e.stopPropagation();
    const cleanNum = (card.cardNumber || card.maskedNumber || '').replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanNum);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFreeze = async (e) => {
    e.stopPropagation();
    setFreezing(true);
    try {
      const { data } = await api.patch(`/cards/${card._id}/freeze`);
      if (onCardUpdated) {
        onCardUpdated(data.data);
      }
    } catch (err) {
      console.error('Failed to toggle card status:', err);
    } finally {
      setFreezing(false);
    }
  };

  const handleLimitCommit = async (newVal) => {
    setUpdatingLimit(true);
    try {
      const { data } = await api.patch(`/cards/${card._id}/limit`, { monthlyLimit: newVal });
      if (onCardUpdated) {
        onCardUpdated(data.data);
      }
    } catch (err) {
      console.error('Failed to update card limit:', err);
    } finally {
      setUpdatingLimit(false);
    }
  };

  // Card Number formatted in 4 blocks of 4
  const rawNumber = card.cardNumber || card.maskedNumber || '4000123456789010';
  const cleanDigits = rawNumber.replace(/\s+/g, '');
  const formattedNumber = cleanDigits.replace(/(\d{4})/g, '$1 ').trim();

  return (
    <div className="flex flex-col items-center w-full max-w-sm">
      {/* 3D Card Shell */}
      <div
        className="w-[340px] h-[215px] sm:w-[370px] sm:h-[230px] perspective-1000 cursor-pointer select-none group"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-700 preserve-3d transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* ================= CARD FRONT ================= */}
          <div
            className={`absolute inset-0 rounded-2xl p-6 shadow-2xl backface-hidden flex flex-col justify-between overflow-hidden transition-all duration-300 border ${
              isWhiteTheme
                ? 'bg-gradient-to-br from-white via-zinc-100 to-zinc-200 text-zinc-950 border-zinc-300 shadow-zinc-900/10'
                : 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white border-zinc-800 shadow-black/80'
            } ${isFrozen ? 'opacity-70 saturate-50' : 'hover:scale-[1.01]'}`}
          >
            {/* Frost/Lockdown overlay when frozen */}
            {isFrozen && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px] z-30 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-white text-xs font-mono font-bold tracking-wider shadow-xl">
                  <Lock className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                  <span>LOCKED // FROZEN</span>
                </div>
              </div>
            )}

            {/* Subtle Metallic Brushed Shimmer */}
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-gradient-to-br from-white/10 to-transparent blur-xl pointer-events-none" />

            {/* Top Row: Chip, Contactless Icon, Brand Wordmark */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                {/* Minimalist Architectural EMV Chip */}
                <div
                  className={`w-11 h-8 rounded-md border shadow-inner relative flex items-center justify-center overflow-hidden ${
                    isWhiteTheme
                      ? 'bg-gradient-to-tr from-zinc-800 via-zinc-700 to-zinc-900 border-zinc-900'
                      : 'bg-gradient-to-tr from-zinc-200 via-zinc-100 to-zinc-300 border-zinc-400'
                  }`}
                >
                  <div
                    className={`w-6 h-4 border rounded-sm ${
                      isWhiteTheme ? 'border-zinc-600' : 'border-zinc-400'
                    }`}
                  />
                </div>
                <Wifi
                  className={`w-5 h-5 rotate-90 ${
                    isWhiteTheme ? 'text-zinc-500' : 'text-zinc-500'
                  }`}
                />
              </div>

              {/* Brand Logo & Edition */}
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-mono tracking-widest uppercase font-bold px-1.5 py-0.5 rounded ${
                    isWhiteTheme ? 'bg-zinc-200 text-zinc-700' : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {isWhiteTheme ? 'TITANIUM' : 'OBSIDIAN'}
                </span>
                <span
                  className={`text-lg font-black tracking-wider italic font-mono ${
                    isWhiteTheme ? 'text-zinc-950' : 'text-white'
                  }`}
                >
                  {card.brand === 'MASTERCARD' ? 'mastercard' : 'VISA'}
                </span>
              </div>
            </div>

            {/* Middle Row: 16-Digit Card Number with 1-Click Copy */}
            <div className="z-10 my-auto">
              <div
                className={`flex items-center justify-between p-1.5 -mx-1.5 rounded-lg transition-colors cursor-pointer ${
                  isWhiteTheme ? 'hover:bg-black/5' : 'hover:bg-white/5'
                }`}
                onClick={copyNumber}
                title="Click to copy 16-digit card number"
              >
                <span className="font-mono text-xl sm:text-2xl tracking-[0.18em] font-bold drop-shadow-sm">
                  {formattedNumber}
                </span>
                <button
                  type="button"
                  className={`p-1.5 rounded-md transition-colors ${
                    isWhiteTheme ? 'bg-zinc-200 text-zinc-900' : 'bg-zinc-800 text-zinc-200'
                  }`}
                  aria-label="Copy card number"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              {copied && (
                <p className="text-[10px] font-mono text-emerald-500 mt-0.5 flex items-center gap-1 font-semibold">
                  <Sparkles className="w-3 h-3" /> Card number copied!
                </p>
              )}
            </div>

            {/* Bottom Row: Cardholder Name, Expiration Date */}
            <div className="flex items-end justify-between z-10">
              <div>
                <p
                  className={`text-[9px] uppercase font-mono tracking-wider font-semibold ${
                    isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  Cardholder
                </p>
                <p className="font-mono text-xs sm:text-sm font-bold tracking-wider uppercase truncate max-w-[190px]">
                  {card.cardHolder || 'CARDHOLDER'}
                </p>
              </div>

              <div className="text-right">
                <p
                  className={`text-[9px] uppercase font-mono tracking-wider font-semibold ${
                    isWhiteTheme ? 'text-zinc-500' : 'text-zinc-400'
                  }`}
                >
                  Valid Thru
                </p>
                <p className="font-mono text-xs sm:text-sm font-bold tracking-widest">
                  {card.expiryMonth || '11'}/{card.expiryYear || '29'}
                </p>
              </div>
            </div>
          </div>

          {/* ================= CARD BACK ================= */}
          <div
            className={`absolute inset-0 rounded-2xl shadow-2xl backface-hidden rotate-y-180 flex flex-col justify-between overflow-hidden transition-all duration-300 py-6 border ${
              isWhiteTheme
                ? 'bg-gradient-to-br from-white via-zinc-100 to-zinc-200 text-zinc-950 border-zinc-300 shadow-zinc-900/10'
                : 'bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white border-zinc-800 shadow-black/80'
            }`}
          >
            {/* Magnetic Stripe */}
            <div className="w-full h-11 bg-zinc-950 border-t border-b border-zinc-800" />

            {/* Signature Strip & CVV Code with Eye Toggle */}
            <div className="px-6 flex items-center gap-4">
              <div
                className={`flex-1 h-9 rounded flex items-center px-3 border ${
                  isWhiteTheme
                    ? 'bg-zinc-200 border-zinc-300 text-zinc-700'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                }`}
              >
                <span className="font-mono text-xs italic tracking-wider select-none font-medium">
                  Authorized Signature
                </span>
              </div>

              {/* CVV Section */}
              <div className="flex flex-col items-end">
                <span
                  className={`text-[9px] font-mono uppercase tracking-widest font-bold ${
                    isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  CVV / CVC
                </span>
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded border cursor-pointer ${
                    isWhiteTheme
                      ? 'bg-white border-zinc-300 text-zinc-950'
                      : 'bg-black border-zinc-700 text-white'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCvv(!showCvv);
                  }}
                  title="Toggle CVV visibility"
                >
                  <span className="font-mono text-xs font-bold tracking-widest">
                    {showCvv ? card.cvv || '742' : '•••'}
                  </span>
                  <button
                    type="button"
                    className={`${isWhiteTheme ? 'text-zinc-600' : 'text-zinc-400'}`}
                  >
                    {showCvv ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Security Notice & Certified Stamp */}
            <div className="px-6 flex items-end justify-between">
              <div className="max-w-[210px]">
                <p
                  className={`text-[8px] font-mono leading-tight ${
                    isWhiteTheme ? 'text-zinc-500' : 'text-zinc-500'
                  }`}
                >
                  Encrypted under ISO/IEC 7812 standards. International clearing backed by Titan
                  Sovereign Enclave.
                </p>
              </div>
              <div
                className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold ${
                  isWhiteTheme
                    ? 'bg-zinc-200 border-zinc-300 text-zinc-800'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-200'
                }`}
              >
                SECURE 3D
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Quick Action Bar */}
      <div className="flex items-center gap-2.5 mt-4 w-full justify-center">
        {/* Flip to view CVV / Front */}
        <button
          type="button"
          onClick={() => setIsFlipped(!isFlipped)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono font-medium text-zinc-200 hover:text-white transition-all"
        >
          <RotateCw className="w-3.5 h-3.5 text-zinc-400" />
          <span>{isFlipped ? 'Show Front' : 'Show CVV / Back'}</span>
        </button>

        {/* 1-Click Freeze / Unfreeze */}
        <button
          type="button"
          onClick={toggleFreeze}
          disabled={freezing}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all ${
            isFrozen
              ? 'bg-white text-zinc-950 border-white hover:bg-zinc-200'
              : 'bg-zinc-900 text-rose-400 border-rose-500/30 hover:bg-rose-950/40'
          }`}
        >
          {isFrozen ? (
            <>
              <Unlock className="w-3.5 h-3.5" />
              <span>Unfreeze Card</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Freeze Card</span>
            </>
          )}
        </button>
      </div>

      {/* Pro Monthly Spend Limit Slider */}
      {showLimitSlider && (
        <div className="w-full mt-4 p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 font-mono text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" /> Monthly Spending Cap:
            </span>
            <span className="text-white font-bold">${currentLimit.toLocaleString()} USD</span>
          </div>
          <input
            type="range"
            min="1000"
            max="100000"
            step="1000"
            value={currentLimit}
            onChange={(e) => setCurrentLimit(Number(e.target.value))}
            onMouseUp={(e) => handleLimitCommit(Number(e.target.value))}
            onTouchEnd={(e) => handleLimitCommit(Number(e.target.value))}
            className="w-full accent-white bg-zinc-800 cursor-pointer h-1.5 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>$1,000</span>
            <span>$50,000</span>
            <span>$100,000</span>
          </div>
        </div>
      )}
    </div>
  );
};
