import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CardsPage } from './pages/CardsPage';
import { TransfersPage } from './pages/TransfersPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { OpsTerminalPage } from './pages/OpsTerminalPage';

const AppContent = () => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState('/dashboard');

  useEffect(() => {
    if (isAuthenticated) {
      if (isAdmin && currentPath === '/dashboard') {
        setCurrentPath('/terminal/ops-hq');
      } else if (!isAdmin && currentPath === '/terminal/ops-hq') {
        setCurrentPath('/dashboard');
      }
    }
  }, [isAuthenticated, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center space-y-4 font-mono">
        <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-zinc-400 tracking-wider">
          ESTABLISHING TITAN ENCLAVE HANDSHAKE...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthPage
        onAuthSuccess={(targetRoute) => {
          setCurrentPath(targetRoute);
        }}
      />
    );
  }

  const handleNavigate = (path) => {
    if (path === '/terminal/ops-hq' && !isAdmin) {
      setCurrentPath('/dashboard');
      return;
    }
    setCurrentPath(path);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col justify-between selection:bg-white selection:text-zinc-950 font-mono">
      <div>
        <Navbar currentPath={currentPath} onNavigate={handleNavigate} />

        <main className="pb-16">
          {currentPath === '/dashboard' && <DashboardPage onNavigate={handleNavigate} />}
          {currentPath === '/cards' && <CardsPage />}
          {currentPath === '/transfers' && <TransfersPage />}
          {currentPath === '/analytics' && <AnalyticsPage />}
          {currentPath === '/transactions' && <TransactionsPage />}
          {currentPath === '/terminal/ops-hq' && isAdmin && <OpsTerminalPage />}
        </main>
      </div>

      {/* Architectural Monochrome Footer */}
      <footer className="border-t border-zinc-800 bg-zinc-950 py-6 px-4 text-center text-[11px] text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-300 font-bold">Titan Core RTGS v2.6.0</span>
            <span>//</span>
            <span>High-Contrast Architectural Interface</span>
          </div>

          <div className="flex items-center gap-4 text-zinc-400">
            <span>ISO/IEC 7812 Certified</span>
            <span>•</span>
            <span>Atomic Single-Document Acid Settlement</span>
            <span>•</span>
            <span>Live SSE Security Stream</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
