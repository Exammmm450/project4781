import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../api/client';

export const AnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/transfers/analytics')
      .then((res) => setAnalytics(res.data.data))
      .catch((err) => console.error('Failed to load analytics:', err))
      .finally(() => setLoading(false));
  }, []);

  const MONOCHROME_PALETTE = ['#FFFFFF', '#D4D4D8', '#A1A1AA', '#71717A', '#52525B', '#3F3F46', '#27272A'];

  const categoryData = analytics?.categoryBreakdown || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in font-mono">
      <div className="pb-4 border-b border-zinc-800">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Financial Intelligence & Treasury Analytics
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Granular category allocation, cashflow trajectory and institutional runway analysis
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            Gross Inflow (30D)
          </span>
          <h3 className="text-2xl font-bold text-white mt-1">
            +${(analytics?.totalIncome || 0).toLocaleString()} USD
          </h3>
          <p className="text-[11px] text-zinc-500 mt-2">Deposits, yield & inbound clearing</p>
        </div>

        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            Gross Outflow (30D)
          </span>
          <h3 className="text-2xl font-bold text-zinc-300 mt-1">
            -${(analytics?.totalExpense || 0).toLocaleString()} USD
          </h3>
          <p className="text-[11px] text-zinc-500 mt-2">Disbursements & card expenditures</p>
        </div>

        <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
          <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
            Net Treasury Velocity
          </span>
          <h3 className="text-2xl font-bold text-white mt-1">
            ${(analytics?.netCashFlow || 0).toLocaleString()} USD
          </h3>
          <p className="text-[11px] text-zinc-500 mt-2">Sovereign balance delta</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Category Breakdown Bar Chart */}
        <div className="lg:col-span-7 bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-6">
            Expenditure by Allocation (USD)
          </h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" stroke="#52525B" fontSize={11} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#52525B"
                  fontSize={11}
                  tickLine={false}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090B',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                  }}
                />
                <Bar dataKey="amount" fill="#FFFFFF" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`bar-${index}`}
                      fill={MONOCHROME_PALETTE[index % MONOCHROME_PALETTE.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Share Pie Chart */}
        <div className="lg:col-span-5 bg-zinc-950 rounded-2xl p-6 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
            Percentage Outflow Share
          </h3>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData.filter((c) => c.amount > 0)}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={4}
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`pie-${index}`}
                      fill={MONOCHROME_PALETTE[index % MONOCHROME_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#09090B',
                    border: '1px solid #27272A',
                    borderRadius: '8px',
                    fontFamily: 'monospace',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-zinc-800 text-xs">
            {categoryData.map((cat, idx) => (
              <div key={cat.category} className="flex items-center justify-between text-zinc-300">
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: MONOCHROME_PALETTE[idx % MONOCHROME_PALETTE.length] }}
                  />
                  <span className="truncate">{cat.category}</span>
                </span>
                <span className="text-white font-bold ml-1">{cat.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
