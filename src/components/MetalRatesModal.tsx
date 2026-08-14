import React, { useState } from 'react';
import { X, RefreshCcw, Save, TrendingUp, Info, ExternalLink, Globe, Paintbrush } from 'lucide-react';
import { MetalRates } from '../types';
import { COATING_OPTIONS, DEFAULT_METAL_RATES, SURFACE_FINISH_OPTIONS } from '../data/metalRates';
import { fetchLiveRates } from '../lib/rateService';

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
  const [isFetching, setIsFetching] = useState(false);

  if (!isOpen) return null;

  const handleFetchNbuLive = async () => {
    setIsFetching(true);
    try {
      const liveData = await fetchLiveRates(true);
      setRates(liveData);
      onSaveRates(liveData);
    } catch (e) {
      console.error('Failed to reload live rates:', e);
    } finally {
      setIsFetching(false);
    }
  };

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
          {/* Official Source Badge */}
          <div className="p-3 bg-emerald-950/50 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <div>
                <p className="font-bold text-emerald-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-emerald-400" />
                  {rates.source || 'Офіційні котирування НБУ (bank.gov.ua)'}
                </p>
                <p className="text-[11px] text-emerald-200/70">
                  Пряма синхронізація з відкритим API Національного банку України
                </p>
              </div>
            </div>
            
            <button
              onClick={handleFetchNbuLive}
              disabled={isFetching}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 text-[11px] font-semibold transition-colors disabled:opacity-50 shrink-0 self-start sm:self-auto"
            >
              <RefreshCcw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Оновити з НБУ</span>
            </button>
          </div>

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

          {/* Reference Coating & Surface Finishing Rates */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-cyan-400" />
              <span>Базові розрахункові тарифні ставки покриття та матирування (USD)</span>
            </h3>

            <div className="space-y-3 bg-slate-950/40 p-3.5 border border-slate-800 rounded-xl text-xs">
              
              {/* Rhodium White */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="font-bold text-slate-100">⚪ Білий Родій:</span>
                  <p className="text-[10px] text-slate-400">Гальванічне біле покриття</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.coatingRatesUsd?.rhodium_white?.base ?? 3.5}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.rhodium_white || { base: 3.5, perGram: 0.8 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          rhodium_white: { ...existing, base },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                  <span className="text-slate-400">+ $/г:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={rates.coatingRatesUsd?.rhodium_white?.perGram ?? 0.8}
                    onChange={(e) => {
                      const perGram = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.rhodium_white || { base: 3.5, perGram: 0.8 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          rhodium_white: { ...existing, perGram },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Black Rhodium */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="font-bold text-slate-100">🖤 Чорний Родій:</span>
                  <p className="text-[10px] text-slate-400">Графітово-чорне покриття</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.coatingRatesUsd?.rhodium_black?.base ?? 4.5}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.rhodium_black || { base: 4.5, perGram: 1.0 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          rhodium_black: { ...existing, base },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                  <span className="text-slate-400">+ $/г:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={rates.coatingRatesUsd?.rhodium_black?.perGram ?? 1.0}
                    onChange={(e) => {
                      const perGram = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.rhodium_black || { base: 4.5, perGram: 1.0 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          rhodium_black: { ...existing, perGram },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Gilding */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="font-bold text-amber-300">👑 Позолота:</span>
                  <p className="text-[10px] text-slate-400">Гальванічне золочення</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.coatingRatesUsd?.gilding?.base ?? 3.0}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.gilding || { base: 3.0, perGram: 0.9 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          gilding: { ...existing, base },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                  <span className="text-slate-400">+ $/г:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={rates.coatingRatesUsd?.gilding?.perGram ?? 0.9}
                    onChange={(e) => {
                      const perGram = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.gilding || { base: 3.0, perGram: 0.9 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          gilding: { ...existing, perGram },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Blackening */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="font-bold text-slate-300">🌑 Чорніння (Оксидування):</span>
                  <p className="text-[10px] text-slate-400">Оксидування рельєфу</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.coatingRatesUsd?.blackening?.base ?? 2.0}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.blackening || { base: 2.0, perGram: 0.4 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          blackening: { ...existing, base },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                  <span className="text-slate-400">+ $/г:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={rates.coatingRatesUsd?.blackening?.perGram ?? 0.4}
                    onChange={(e) => {
                      const perGram = parseFloat(e.target.value) || 0;
                      const existing = rates.coatingRatesUsd?.blackening || { base: 2.0, perGram: 0.4 };
                      setRates({
                        ...rates,
                        coatingRatesUsd: {
                          ...rates.coatingRatesUsd,
                          blackening: { ...existing, perGram },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Matte Sandblasting */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="font-bold text-sky-300">🏜️ Матова (Піскоструйна обробка):</span>
                  <p className="text-[10px] text-slate-400">Фактурне матирування</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.finishRatesUsd?.matte_sandblast?.base ?? 2.0}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const existing = rates.finishRatesUsd?.matte_sandblast || { base: 2.0, perGram: 0.5 };
                      setRates({
                        ...rates,
                        finishRatesUsd: {
                          ...rates.finishRatesUsd,
                          matte_sandblast: { ...existing, base },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                  <span className="text-slate-400">+ $/г:</span>
                  <input
                    type="number"
                    step="0.1"
                    value={rates.finishRatesUsd?.matte_sandblast?.perGram ?? 0.5}
                    onChange={(e) => {
                      const perGram = parseFloat(e.target.value) || 0;
                      const existing = rates.finishRatesUsd?.matte_sandblast || { base: 2.0, perGram: 0.5 };
                      setRates({
                        ...rates,
                        finishRatesUsd: {
                          ...rates.finishRatesUsd,
                          matte_sandblast: { ...existing, perGram },
                        } as any,
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Laser Engraving Base Rate */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div>
                  <span className="font-bold text-purple-300">⚡ Лазерне Гравіювання:</span>
                  <p className="text-[10px] text-slate-400">Автоматичне лазерне нанесення</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="0.5"
                    value={rates.engravingRatesUsd?.laser?.base ?? 8.5}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      setRates({
                        ...rates,
                        engravingRatesUsd: {
                          ...rates.engravingRatesUsd,
                          laser: { base },
                          hand: rates.engravingRatesUsd?.hand || { base: 22.0 },
                          none: { base: 0 },
                        },
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-purple-200 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Hand Engraving Base Rate */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-300">✒️ Ручне Гравіювання (Штихель):</span>
                  <p className="text-[10px] text-slate-400">Майстерна робота гравіювальника</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">База: $</span>
                  <input
                    type="number"
                    step="1"
                    value={rates.engravingRatesUsd?.hand?.base ?? 22.0}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      setRates({
                        ...rates,
                        engravingRatesUsd: {
                          ...rates.engravingRatesUsd,
                          hand: { base },
                          laser: rates.engravingRatesUsd?.laser || { base: 8.5 },
                          none: { base: 0 },
                        },
                      });
                    }}
                    className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-amber-200 font-mono font-bold"
                  />
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

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
            <a
              href="https://bank.gov.ua/ua/markets/exchangerates"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-400 transition-colors inline-flex items-center gap-1"
            >
              <span>Офіційний портал НБУ</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span>
              Оновлено: {new Date(rates.updatedAt).toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
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
