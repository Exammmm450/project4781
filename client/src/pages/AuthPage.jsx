import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Shield,
  KeyRound,
  ArrowRight,
  Sparkles,
  Lock,
  Unlock,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthPage = ({ onAuthSuccess }) => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showStealthInput, setShowStealthInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Hotkey listener Ctrl+Shift+A to reveal Master Key input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        setShowStealthInput((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let result;
      if (isRegister) {
        result = await register(fullName, email, password, secretKey);
      } else {
        result = await login(email, password, secretKey);
      }

      if (result.isAdmin) {
        onAuthSuccess('/terminal/ops-hq');
      } else {
        onAuthSuccess('/dashboard');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const autofillAdmin = () => {
    setIsRegister(false);
    setEmail('admin@titan.internal');
    setPassword('AdminPass123!');
    setSecretKey('bankadmin6453');
    setShowStealthInput(true);
  };

  const autofillUser = () => {
    setIsRegister(false);
    setEmail('elena.rostova@quantum.io');
    setPassword('UserPass123!');
    setSecretKey('');
    setShowStealthInput(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-mono text-white">
      {/* Background Architectural Grid Lines */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-zinc-950 shadow-glow-white mb-4">
            <span className="font-mono text-2xl font-black">T</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            TITAN ARCHITECTURAL BANK
          </h1>
          <p className="text-xs text-zinc-400 mt-1 uppercase tracking-widest">
            Institutional Liquidity & NeoBank Protocol
          </p>
        </div>

        {/* Auth Panel */}
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl p-6 sm:p-8">
          {/* Tab Selector */}
          <div className="flex rounded-xl bg-zinc-900 p-1 mb-6 border border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                !isRegister
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMsg('');
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                isRegister
                  ? 'bg-white text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Open Enclave
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs uppercase text-zinc-400 mb-1.5 font-bold">
                  Legal Entity / Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Alexander Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1.5 font-bold">
                Institutional Email
              </label>
              <input
                type="email"
                required
                placeholder="name@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs uppercase text-zinc-400 mb-1.5 font-bold">
                Passphrase / Cryptographic Key
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Stealth Master Key Override Input */}
            {showStealthInput && (
              <div className="pt-2 animate-fade-in">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] uppercase text-rose-400 flex items-center gap-1.5 font-bold">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Titan Master Clearance Key</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">OMEGA ESCALATION</span>
                </div>
                <input
                  type="password"
                  placeholder="Enter Stealth Admin Key..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-zinc-900 border border-rose-500/40 text-rose-300 placeholder-zinc-600 text-xs focus:outline-none focus:border-rose-400"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 font-bold text-sm tracking-wide transition-all shadow-glow-white flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-pulse">AUTHENTICATING CIPHER...</span>
              ) : (
                <>
                  <span>{isRegister ? 'Initialize Enclave' : 'Sign In to Treasury'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Stealth Trigger & Security Status Pill */}
          <div className="mt-6 pt-5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => setShowStealthInput(!showStealthInput)}
              className="text-zinc-500 hover:text-zinc-300 flex items-center gap-1.5 transition-colors"
              title="Stealth Enclave Toggle (HotKey: Ctrl+Shift+A)"
            >
              <Shield className={`w-3.5 h-3.5 ${showStealthInput ? 'text-rose-400' : 'text-zinc-600'}`} />
              <span>Security Enclave: {showStealthInput ? 'OVERRIDE' : 'STANDARD'}</span>
            </button>

            <span className="text-zinc-500">ISO/IEC 7812</span>
          </div>
        </div>

        {/* Demo Fast-Switch Helpers for Quick Testing */}
        <div className="mt-4 p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-white" />
            <span className="text-[11px] font-bold">Fast Autofill:</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={autofillAdmin}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[10px] font-bold"
            >
              Admin HQ (Alexander)
            </button>
            <button
              type="button"
              onClick={autofillUser}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white text-[10px] font-bold"
            >
              Client (Elena)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
