import React from 'react';
import { Percent, TrendingUp, AlertTriangle, CheckCircle, ShieldAlert, Award, Share2 } from 'lucide-react';
import { CalculationResult, Currency } from '../types';
import { formatMoney } from '../data/metalRates';
import { InfoHelper } from './InfoHelper';

interface MarkupGaugeProps {
  result: CalculationResult;
  currency: Currency;
  onShare?: () => void;
}

export const MarkupGauge: React.FC<MarkupGaugeProps> = ({ result, currency, onShare }) => {
  const { markupPercent, markupRatio, markupCategory, productionCostTotal, retailPrice, markupAmount } = result;

  // Category Configuration
  const categoryConfig = {
    wholesale: {
      titleUk: 'Мінімальна / Гуртова ціна',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      barColor: 'bg-emerald-500',
      icon: CheckCircle,
      descriptionUk: 'Дуже вигідна пропозиція! Ціна максимально наближена до чистої собівартості сировини.',
    },
    fair: {
      titleUk: 'Чесна націнка майстерні',
      badgeClass: 'bg-green-500/20 text-green-300 border-green-500/30',
      barColor: 'bg-green-500',
      icon: CheckCircle,
      descriptionUk: 'Стандартна адекватна націнка ювелірного виробництва для покриття витрат та невеликого прибутку.',
    },
    mass_market: {
      titleUk: 'Мас-маркет мережа (Помірна націнка)',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      barColor: 'bg-amber-500',
      icon: AlertTriangle,
      descriptionUk: 'Типова націнка великих торгівельних мереж. Ви сплачуєте за оренду магазину, зарплати та рекламу.',
    },
    luxury_overpriced: {
      titleUk: 'Люкс бренд / Висока націнка за імʼя',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
      barColor: 'bg-rose-500',
      icon: ShieldAlert,
      descriptionUk: 'Більше 70% ціни виробу — це плата за престижне бренд-імʼя, пакування та елітний маркетинг.',
    },
  }[markupCategory];

  const CategoryIcon = categoryConfig.icon;

  // Gauge bar percentage (maxed at 300% for visual scale)
  const gaugeFillPercent = Math.min(100, Math.max(5, (markupPercent / 300) * 100));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span>Індекс Націнки (Markup Index)</span>
            <InfoHelper helpKey="markupIndex" />
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Співвідношення ціни в магазині до чистої собівартості виготовлення
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-amber-300 hover:text-white transition-all shadow-sm active:scale-95"
              title="Поділитися цим розрахунком"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Поділитися</span>
            </button>
          )}

          <div className="flex items-center space-x-1.5">
            <span className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center space-x-1.5 ${categoryConfig.badgeClass}`}>
              <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{categoryConfig.titleUk}</span>
            </span>
            <InfoHelper helpKey="markupCategoryScale" />
          </div>
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Коефіцієнт націнки</span>
            <InfoHelper helpKey="markupRatio" />
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono tracking-tight">
            {markupRatio}x
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            ціна вища у {markupRatio} рази
          </span>
        </div>

        <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Націнка у відсотках</span>
            <InfoHelper helpKey="markupPercent" />
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            +{markupPercent}%
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            до собівартості
          </span>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 bg-slate-800/80 rounded-xl border border-slate-700/80">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Націнка у грошах</span>
            <InfoHelper helpKey="markupAmount" />
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono">
            {formatMoney(markupAmount, currency)}
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            прибуток та витрати магазину
          </span>
        </div>
      </div>

      {/* Visual Scale / Meter */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Собівартість: {formatMoney(productionCostTotal, currency)}</span>
          <span className="font-bold text-white">Чек: {formatMoney(retailPrice, currency)}</span>
        </div>

        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${categoryConfig.barColor}`}
            style={{ width: `${gaugeFillPercent}%` }}
          />
        </div>

        {/* Scale labels */}
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0% (Гуртова)</span>
          <span>50% (Чесна)</span>
          <span>150% (Мас-маркет)</span>
          <span>300%+ (Люкс бренд)</span>
        </div>
      </div>

      {/* Status explanation note */}
      <div className="p-3.5 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-300">
        <p className="leading-relaxed">{categoryConfig.descriptionUk}</p>
      </div>

    </div>
  );
};
