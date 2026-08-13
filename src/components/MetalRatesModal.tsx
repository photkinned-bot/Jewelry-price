import React, { useState } from 'react';
import { X, RefreshCcw, Save, TrendingUp, Info } from 'lucide-react';
import { MetalRates } from '../types';
import { DEFAULT_METAL_RATES } from '../data/metalRates';

interface MetalRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  metalRates: MetalRates;
  onSaveRates: (newRates: MetalRates) => void;
}

export const MetalRatesModal: React.FC<MetalRatesModalProps> = ({
  isOpen,
  onClose,
  metalRates,
  onSaveRates,
}) => {
  const [rates, setRates] = useState<MetalRates>(metalRates);

  if (!isOpen) return null;

  const handleReset = () => {
    setRates(DEFAULT_METAL_RATES);
  };

  const handleSave = () => {
    onSaveRates({
      ...rates,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold font-serif text-white">
              Курси металів та валют (Spot Rates)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Як рахується собівартість металу?</p>
              <p className="mt-0.5">
                Ціна вказується за 1 грам чистих дорогоцінних металів (999 проба) у USD.
                Для виробу проби 585 або 750 додаток автоматично перераховує чистий вміст дорогоцінного металу.
              </p>
            </div>
          </div>

          {/* Pure Metals USD per gram */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Ціна чистого металу (999 проби) за 1 грам (USD $)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  🥇 Золото 999 (Gold)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={rates.pureMetalRatesUsd.gold}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        pureMetalRatesUsd: {
                          ...rates.pureMetalRatesUsd,
                          gold: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  🥈 Срібло 999 (Silver)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={rates.pureMetalRatesUsd.silver}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        pureMetalRatesUsd: {
                          ...rates.pureMetalRatesUsd,
                          silver: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  💎 Платина 999 (Platinum)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={rates.pureMetalRatesUsd.platinum}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        pureMetalRatesUsd: {
                          ...rates.pureMetalRatesUsd,
                          platinum: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ⚙️ Паладій 999 (Palladium)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={rates.pureMetalRatesUsd.palladium}
                    onChange={(e) =>
                      setRates({
                        ...rates,
                        pureMetalRatesUsd: {
                          ...rates.pureMetalRatesUsd,
                          palladium: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-zinc-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>
            </div>
          </div>

          {/* Currencies exchange rate */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Валютні курси для перерахунку
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Курс USD / UAH
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={rates.currencies.UAH}
                  onChange={(e) =>
                    setRates({
                      ...rates,
                      currencies: {
                        ...rates.currencies,
                        UAH: parseFloat(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Курс EUR / USD
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={rates.currencies.EUR}
                  onChange={(e) =>
                    setRates({
                      ...rates,
                      currencies: {
                        ...rates.currencies,
                        EUR: parseFloat(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-right">
            Останнє оновлення: {new Date(rates.updatedAt).toLocaleTimeString('uk-UA')}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span>Скинути до еталону</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Скасувати
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Зберегти курси</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
