import React, { useState } from 'react';
import {
  CreditCard,
  Send,
  PieChart,
  History,
  ShieldAlert,
  LogOut,
  Terminal,
  Eye,
  EyeOff,
  Vault,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export const Navbar = ({ currentPath, onNavigate }) => {
  const { user, account, isAdmin, logout, refreshUserData } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [showStealthModal, setShowStealthModal] = useState(false);
  const [stealthKey, setStealthKey] = useState('');
  const [stealthStatus, setStealthStatus] = useState('');

  const balance = (account?.balance || 0) + (account?.savingsBalance || 0);

  // Double click logo easter egg to invoke Stealth Escalation modal
  const handleLogoDoubleClick = () => {
    setShowStealthModal(true);
  };

  const handleEscalate = async (e) => {
    e.preventDefault();
    setStealthStatus('Verifying cryptographic clearance...');
    try {
      await api.post('/auth/login', {
        email: user.email,
        password: 'UserPass123!',
        secretKey: stealthKey.trim(),
      });
      setStealthStatus('Clearance OMEGA Granted! Elevating session...');
      await refreshUserData();
      setTimeout(() => {
        setShowStealthModal(false);
        onNavigate('/terminal/ops-hq');
      }, 700);
    } catch (err) {
      setStealthStatus('Clearance Denied. Key rejected by Titan Sentinel.');
    }
  };

  const navItems = [
    { id: '/dashboard', label: 'Treasury', icon: CreditCard },
    { id: '/cards', label: 'Cards', icon: CreditCard },
    { id: '/transfers', label: 'Transfers', icon: Send },
    { id: '/analytics', label: 'Analytics', icon: PieChart },
    { id: '/transactions', label: 'Ledger', icon: History },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-zinc-950/90 border-b border-zinc-800 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand & Stealth Double-Click Trigger */}
          <div className="flex items-center gap-8">
            <div
              className="flex items-center gap-2.5 cursor-pointer select-none group"
              onClick={() => onNavigate(isAdmin ? '/terminal/ops-hq' : '/dashboard')}
              onDoubleClick={handleLogoDoubleClick}
              title="TITAN Architectural NeoBank // Double-click crest for Master Enclave"
            >
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-zinc-950 font-black shadow-glow-white">
                <span className="font-mono text-sm">T</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm font-extrabold tracking-wider text-white">
                    TITAN
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold tracking-widest">
                    RTGS
                  </span>
                </div>
                <p className="text-[8px] font-mono text-zinc-500 tracking-widest uppercase">
                  NEOBANK & TREASURY
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = currentPath === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                      active
                        ? 'bg-white text-zinc-950 font-bold shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}

              {/* Stealth Ops HQ Terminal button: ONLY rendered if user role is admin! */}
              {isAdmin && (
                <button
                  onClick={() => onNavigate('/terminal/ops-hq')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ml-2 ${
                    currentPath === '/terminal/ops-hq'
                      ? 'bg-zinc-100 text-zinc-950 ring-2 ring-white font-bold'
                      : 'bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>[OPS HQ TERMINAL]</span>
                </button>
              )}
            </nav>
          </div>

          {/* Right Header Section: Balance, Tier & User Profile */}
          <div className="flex items-center gap-3">
            {/* Total Balance Pill */}
            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 font-mono">
              <span className="text-[10px] uppercase text-zinc-400">Total:</span>
              <span className="text-xs font-bold text-white tracking-wide">
                {showBalance
                  ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                  : '••••••••'}
              </span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="text-zinc-500 hover:text-zinc-300 ml-1"
                aria-label="Toggle balance visibility"
              >
                {showBalance ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>

            {/* User Clearance Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{user?.tier || 'PREMIUM'}</span>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white leading-tight truncate max-w-[130px]">
                  {user?.fullName}
                </p>
                <p className="text-[9px] font-mono text-zinc-400 uppercase">
                  {isAdmin ? 'OMEGA ADMIN' : 'INSTITUTIONAL'}
                </p>
              </div>

              <button
                onClick={logout}
                title="Sign Out of Titan Enclave"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden flex items-center justify-around px-2 py-2 border-t border-zinc-800 bg-zinc-950 font-mono text-xs">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`px-2.5 py-1 rounded ${
                currentPath === item.id ? 'bg-white text-zinc-950 font-bold' : 'text-zinc-400'
              }`}
            >
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => onNavigate('/terminal/ops-hq')}
              className="px-2 py-1 rounded bg-zinc-800 text-white font-bold border border-zinc-700"
            >
              OPS HQ
            </button>
          )}
        </div>
      </header>

      {/* Stealth Escalation Modal */}
      {showStealthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl p-6 overflow-hidden font-mono text-white">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <div className="flex items-center gap-2 text-white text-xs font-bold uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Stealth Clearance Protocol</span>
              </div>
              <button
                onClick={() => setShowStealthModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Input Titan Master Cryptographic Key to elevate session to <strong>Omega Admin Ops HQ</strong>.
            </p>

            <form onSubmit={handleEscalate} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="Master Override Key"
                  value={stealthKey}
                  onChange={(e) => setStealthKey(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-white"
                />
              </div>

              {stealthStatus && (
                <p className="text-[11px] text-amber-300">{stealthStatus}</p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-white/10"
              >
                Execute Escalation
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
