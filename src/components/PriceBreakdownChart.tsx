import React, { useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CalculationResult, Currency } from '../types';
import { formatMoney } from '../data/metalRates';
import { PieChart as PieIcon, BarChart2, ShieldCheck, Tag, Info } from 'lucide-react';

interface PriceBreakdownChartProps {
  result: CalculationResult;
  currency: Currency;
}

export const PriceBreakdownChart: React.FC<PriceBreakdownChartProps> = ({ result, currency }) => {
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  // Breakdown slices
  const rawMaterialsVal = result.rawMaterialsTotal;
  const laborLossesVal = result.laborAndLossesTotal;
  const markupVal = result.markupAmount;
  const totalRetail = result.retailPrice || (rawMaterialsVal + laborLossesVal + markupVal);

  const rawPercent = totalRetail > 0 ? Math.round((rawMaterialsVal / totalRetail) * 100) : 0;
  const laborPercent = totalRetail > 0 ? Math.round((laborLossesVal / totalRetail) * 100) : 0;
  const markupPercentOfPrice = totalRetail > 0 ? Math.max(0, 100 - rawPercent - laborPercent) : 0;

  const chartData = [
    {
      name: 'Сировина (Метал + Каміння)',
      value: Math.round(rawMaterialsVal),
      percentage: rawPercent,
      color: '#f59e0b', // Amber
    },
    {
      name: 'Робота ювеліра та угар',
      value: Math.round(laborLossesVal),
      percentage: laborPercent,
      color: '#38bdf8', // Sky
    },
    {
      name: 'Націнка бренду / магазину',
      value: Math.round(markupVal),
      percentage: markupPercentOfPrice,
      color: '#f43f5e', // Rose
    },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-bold text-white">{data.name}</p>
          <p className="text-amber-400 font-mono text-sm font-bold">
            {formatMoney(data.value, currency)} ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-5">
      
      {/* Header & Toggle */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <PieIcon className="w-5 h-5 text-amber-400" />
            <span>Розкладення Ціни (Price Breakdown)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Структура чека: за що саме ви сплачуєте у магазині
          </p>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
          <button
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded-md transition-all ${
              chartType === 'pie' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Кругова діаграма"
          >
            <PieIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded-md transition-all ${
              chartType === 'bar' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
            title="Стовпчаста діаграма"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recharts Chart View */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => formatMoney(v, currency)} />
              <YAxis type="category" dataKey="name" stroke="#94a3b8" width={120} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Legend & Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
        
        {/* Raw materials */}
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Метал + Каміння</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{rawPercent}%</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatMoney(rawMaterialsVal, currency)}
          </div>
          <p className="text-[11px] text-slate-400">Чиста вартість сировини</p>
        </div>

        {/* Labor */}
        <div className="p-3.5 bg-sky-500/10 border border-sky-500/20 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-sky-300">Робота, покриття та угар</span>
            <span className="text-xs font-bold text-sky-400 font-mono">{laborPercent}%</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatMoney(laborLossesVal, currency)}
          </div>
          <p className="text-[11px] text-slate-400">
            {result.finishingAndCoatingTotal > 0 ? (
              <>Вкл. покриття, фактуру та гравіювання ({formatMoney(result.finishingAndCoatingTotal, currency)})</>
            ) : (
              <>Виробництво та втрати</>
            )}
          </p>
        </div>

        {/* Store markup */}
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">Націнка бренду</span>
            <span className="text-xs font-bold text-rose-400 font-mono">{markupPercentOfPrice}%</span>
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {formatMoney(markupVal, currency)}
          </div>
          <p className="text-[11px] text-slate-400">Маркетинг, прибуток, бренд</p>
        </div>

      </div>

    </div>
  );
};
