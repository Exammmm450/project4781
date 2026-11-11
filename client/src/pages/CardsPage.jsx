import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import api from '../api/client';
import { VirtualCard3D } from '../components/VirtualCard3D';
import { NewCardModal } from '../components/NewCardModal';

export const CardsPage = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);

  const fetchCards = async () => {
    try {
      const res = await api.get('/cards');
      setCards(res.data.data);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleCardUpdated = (updatedCard) => {
    setCards((prev) => prev.map((c) => (c._id === updatedCard._id ? updatedCard : c)));
  };

  const handleCardCreated = (newCard) => {
    setCards((prev) => [newCard, ...prev]);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Virtual Cards Vault
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-zinc-900 text-white border border-zinc-800">
              ISO/IEC 7812
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Titanium White & Obsidian Black cards with instant freeze and spending limit sliders
          </p>
        </div>

        <button
          onClick={() => setIsNewCardOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-bold tracking-wider transition-all shadow-glow-white"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Card</span>
        </button>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {cards.map((card) => {
            const spentPercent = Math.min(
              100,
              Math.round(((card.spentThisMonth || 0) / (card.monthlyLimit || 15000)) * 100)
            );

            return (
              <div
                key={card._id}
                className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 flex flex-col items-center justify-between space-y-6 shadow-xl"
              >
                {/* 3D Interactive Card with Slider */}
                <VirtualCard3D
                  card={card}
                  onCardUpdated={handleCardUpdated}
                  showLimitSlider={true}
                />

                {/* Utilization Details */}
                <div className="w-full space-y-3 text-xs border-t border-zinc-800 pt-4">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>Monthly Limit Utilization</span>
                    <span className="text-white font-bold">{spentPercent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                    <div
                      className="h-full bg-white rounded-full transition-all duration-500"
                      style={{ width: `${spentPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">
                      Spent: <strong className="text-white">${(card.spentThisMonth || 0).toLocaleString()}</strong>
                    </span>
                    <span className="text-zinc-400">
                      Cap: <strong className="text-white">${(card.monthlyLimit || 15000).toLocaleString()}</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                    <span className="uppercase">Theme: {card.colorTheme || 'Obsidian'}</span>
                    <span className="uppercase">Status: {card.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-zinc-950 rounded-2xl p-12 text-center border border-zinc-800">
          <CreditCard className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-white">No Virtual Cards Issued Yet</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
            Generate your first high-security virtual debit card compliant with Luhn Checksum ISO/IEC 7812.
          </p>
          <button
            onClick={() => setIsNewCardOpen(true)}
            className="mt-5 px-5 py-2.5 rounded-xl bg-white text-zinc-950 font-bold text-xs"
          >
            Issue Instant Virtual Card
          </button>
        </div>
      )}

      {/* New Card Modal */}
      <NewCardModal
        isOpen={isNewCardOpen}
        onClose={() => setIsNewCardOpen(false)}
        onCardCreated={handleCardCreated}
      />
    </div>
  );
};
