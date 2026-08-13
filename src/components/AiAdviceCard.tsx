import React, { useState } from 'react';
import { Sparkles, Bot, ThumbsUp, AlertTriangle, MessageSquare, RefreshCw, Award } from 'lucide-react';
import { AiAdviceResult, CalculationInputs, CalculationResult } from '../types';

interface AiAdviceCardProps {
  inputs: CalculationInputs;
  result: CalculationResult;
}

export const AiAdviceCard: React.FC<AiAdviceCardProps> = ({ inputs, result }) => {
  const [advice, setAdvice] = useState<AiAdviceResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-advice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calculationDetails: {
            title: inputs.title || 'Ювелірний виріб',
            metalType: inputs.metalType,
            metalPurity: inputs.purity,
            metalWeight: inputs.metalWeightGrams,
            materialsCost: result.rawMaterialsTotal,
            laborCost: result.laborAndLossesTotal,
            costBasis: result.productionCostTotal,
            retailPrice: result.retailPrice,
            markupAmount: result.markupAmount,
            markupPercent: result.markupPercent,
            markupRatio: result.markupRatio,
            currency: inputs.currency,
            gemstones: inputs.gemstones,
          },
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textErr = await response.text();
        throw new Error(textErr.slice(0, 150) || 'Помилка отримання даних від сервера');
      }

      const json = await response.json();
      if (!response.ok || !json.success) {
        throw new Error(json.error || 'Не вдалося отримати консультацію від AI');
      }

      setAdvice(json.advice);
    } catch (err: any) {
      console.error('Error getting AI advice:', err);
      setError(err?.message || 'Помилка звернення до AI');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-5">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-bold">
            <Sparkles className="w-5 h-5 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-base font-bold font-serif text-white">
              AI Експертна Консультація та Тактика Торгу
            </h3>
            <p className="text-xs text-slate-400">
              Нейромережевий аналіз вигідності покупки від гемолога Gemini
            </p>
          </div>
        </div>

        {!advice && (
          <button
            onClick={fetchAdvice}
            disabled={loading}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Аналізую...</span>
              </>
            ) : (
              <>
                <Bot className="w-4 h-4 text-slate-950" />
                <span>Отримати Висновок AI</span>
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* AI Response View */}
      {advice ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Summary & Liquidity Rating */}
          <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Загальний висновок
              </span>
              <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span>Оцінка ліквідності: {advice.investmentRating} / 10</span>
              </div>
            </div>

            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              {advice.summary}
            </p>
          </div>

          {/* Pros & Cons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Pros */}
            {advice.pros && advice.pros.length > 0 && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-emerald-400 flex items-center space-x-1">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>Переваги угоди:</span>
                </span>
                <ul className="space-y-1 text-slate-300">
                  {advice.pros.map((p, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cons */}
            {advice.cons && advice.cons.length > 0 && (
              <div className="p-3.5 bg-rose-950/30 border border-rose-500/20 rounded-xl space-y-2 text-xs">
                <span className="font-bold text-rose-400 flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Застереження:</span>
                </span>
                <ul className="space-y-1 text-slate-300">
                  {advice.cons.map((c, i) => (
                    <li key={i} className="flex items-start space-x-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Negotiating tip */}
          {advice.advice && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <span>Порада покупцеві перед покупкою</span>
                </span>
                {advice.recommendedDiscountPercent && advice.recommendedDiscountPercent > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold text-[11px]">
                    Просіть знижку: -{advice.recommendedDiscountPercent}%
                  </span>
                )}
              </div>
              <p className="text-slate-200 leading-relaxed">
                {advice.advice}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={fetchAdvice}
              disabled={loading}
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Оновити аналіз AI</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="p-6 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
          <p className="text-xs text-slate-400">
            Натисніть кнопку вище, щоб Gemini проаналізував цей конкретний вибір, його каміння, пробу та націнку, й дав аргументи для торгу в магазині.
          </p>
        </div>
      )}

    </div>
  );
};
