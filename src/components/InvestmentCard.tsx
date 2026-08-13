import React from 'react';
import { ShieldCheck, Coins, PiggyBank, HelpCircle, ArrowUpRight, Award, AlertCircle } from 'lucide-react';
import { CalculationResult, Currency } from '../types';
import { formatMoney } from '../data/metalRates';

interface InvestmentCardProps {
  result: CalculationResult;
  currency: Currency;
}

export const InvestmentCard: React.FC<InvestmentCardProps> = ({ result, currency }) => {
  const {
    assetPreservationRatioPercent,
    pawnshopEstimate,
    retailPrice,
    rawMaterialsTotal,
    markupCategory,
  } = result;

  // Investment Liquidity Grade
  let scoreGrade = 'C';
  let scoreTitle = 'Середня ліквідність (Декоративна покупка)';
  let scoreColor = 'text-amber-400 border-amber-500/30 bg-amber-500/10';

  if (assetPreservationRatioPercent >= 60) {
    scoreGrade = 'A+';
    scoreTitle = 'Відмінне збереження капіталу (Високий метал/камінь)';
    scoreColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
  } else if (assetPreservationRatioPercent >= 35) {
    scoreGrade = 'B';
    scoreTitle = 'Хороший баланс (Стандартна ювелірна прикраса)';
    scoreColor = 'text-sky-400 border-sky-500/30 bg-sky-500/10';
  } else if (assetPreservationRatioPercent < 20) {
    scoreGrade = 'D-';
    scoreTitle = 'Низька ліквідність (Покупка статусу / Емоцій)';
    scoreColor = 'text-rose-400 border-rose-500/30 bg-rose-500/10';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <PiggyBank className="w-5 h-5 text-amber-400" />
            <span>Інвестиційна Оцінка та Ліквідність</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Скільки реальної ринкової вартості залишається при терміновому перепродажу
          </p>
        </div>

        <div className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center space-x-1.5 ${scoreColor}`}>
          <Award className="w-4 h-4 shrink-0" />
          <span>Клас {scoreGrade}</span>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Asset preservation ratio */}
        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Капіталоємність сировини</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{assetPreservationRatioPercent}%</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {formatMoney(rawMaterialsTotal, currency)}
          </div>
          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, assetPreservationRatioPercent)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Частка вартості самого металу і каміння від чека в магазині.
          </p>
        </div>

        {/* Pawnshop Buyback Estimate */}
        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Ломбардна вартість (Скупка)</span>
            <span className="text-xs font-bold text-sky-400 font-mono">
              ~ {retailPrice > 0 ? Math.round((pawnshopEstimate / retailPrice) * 100) : 0}%
            </span>
          </div>
          <div className="text-xl font-bold text-sky-300 font-mono">
            {formatMoney(pawnshopEstimate, currency)}
          </div>
          <p className="text-[11px] text-slate-400">
            Орієнтовна сума, яку дасть ломбард або скуповування брухту (80% від металу).
          </p>
        </div>

      </div>

      {/* Advice Box */}
      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center space-x-2 text-amber-300 font-bold">
          <Coins className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Аналітичний Висновок: {scoreTitle}</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          {assetPreservationRatioPercent >= 50 ? (
            <>
              Цей виріб містить значну вагу дорогоцінного металу або якісне каміння. Якщо ви захочете продати його у майбутньому, ви збережете значну частину вкладених коштів.
            </>
          ) : assetPreservationRatioPercent >= 25 ? (
            <>
              Стандартне співвідношення для побутової ювелірної прикраси. Ви сплачуєте приблизно порівну за матеріали та роботу/бренд.
            </>
          ) : (
            <>
              Ця покупка є суто естетичною або іміджевою. В разі перепродажу у скупку або ломбард ви повернете лише малу частку сплачених коштів, оскільки левова частка ціни — це маржа бренду.
            </>
          )}
        </p>
      </div>

    </div>
  );
};
