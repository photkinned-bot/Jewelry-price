import React, { useState } from 'react';
import { RefreshCcw, Save, TrendingUp, Info, ExternalLink, Globe, Paintbrush, Coins, DollarSign, Sparkles } from 'lucide-react';
import { MetalRates } from '../types';
import { DEFAULT_METAL_RATES } from '../data/metalRates';
import { fetchLiveRates } from '../lib/rateService';
import { ModalDialog } from './ModalDialog';

interface MetalRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  metalRates: MetalRates;
  onSaveRates: (newRates: MetalRates) => void;
}

type TabType = 'all' | 'metals' | 'coatings' | 'currencies';

export const MetalRatesModal: React.FC<MetalRatesModalProps> = ({
  isOpen,
  onClose,
  metalRates,
  onSaveRates,
}) => {
  const [rates, setRates] = useState<MetalRates>(metalRates);
  const [isFetching, setIsFetching] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Keep local state in sync when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setRates(metalRates);
    }
  }, [isOpen, metalRates]);

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
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Курси металів, тарифи та валюти"
      subtitle="Офіційні spot-котирування та виробничі ставки"
      icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Скинути до еталону</span>
            <span className="sm:hidden">Скинути</span>
          </button>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              Скасувати
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center space-x-1.5 px-4 sm:px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Зберегти тарифи</span>
            </button>
          </div>
        </>
      }
    >
      <div className="space-y-5">
        {/* Navigation Category Tabs for fast jumping */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto text-xs font-semibold scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            🌟 Усі розділи
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('metals')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'metals'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Метали 999 ($)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('coatings')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'coatings'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Paintbrush className="w-3.5 h-3.5" />
            <span>Покриття та обробка</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('currencies')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'currencies'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Валюти (UAH/USD)</span>
          </button>
        </div>

        {/* Official Source Badge */}
        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="min-w-0">
              <p className="font-bold text-emerald-300 flex items-center gap-1.5 truncate">
                <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{rates.source || 'Офіційні котирування НБУ (bank.gov.ua)'}</span>
              </p>
              <p className="text-[11px] text-emerald-200/70 truncate">
                Синхронізація з відкритим API Національного банку України
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={handleFetchNbuLive}
            disabled={isFetching}
            className="flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800/80 border border-emerald-600/40 text-emerald-200 text-[11px] font-semibold transition-colors disabled:opacity-50 shrink-0 self-start sm:self-auto"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Оновити з НБУ</span>
          </button>
        </div>

        {/* Info Box */}
        {(activeTab === 'all' || activeTab === 'metals') && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-200/90 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Як рахується собівартість металу?</p>
              <p className="mt-0.5 text-[11px] text-amber-200/80">
                Ціна вказується за 1 грам чистих дорогоцінних металів (999 проба) у USD.
                Для виробів проби 585 або 750 калькулятор автоматично вираховує точний чистий вміст дорогоцінного металу.
              </p>
            </div>
          </div>
        )}

        {/* SECTION 1: Pure Metals USD per gram */}
        {(activeTab === 'all' || activeTab === 'metals') && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Ціна чистого металу (999 проби) за 1 грам ($ USD)</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  🥇 Золото 999 (Gold / XAU)
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  🥈 Срібло 999 (Silver / XAG)
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  💎 Платина 999 (Platinum / XPT)
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-cyan-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  ⚙️ Паладій 999 (Palladium / XPD)
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-zinc-300 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ / г</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: Coating, Finishing & Engraving Rates */}
        {(activeTab === 'all' || activeTab === 'coatings') && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5" />
              <span>Базові розрахункові тарифи покриття, матирування та гравіювання (USD $)</span>
            </h3>

            <div className="space-y-2.5 bg-slate-950/60 p-3.5 sm:p-4 border border-slate-800 rounded-xl text-xs">
              
              {/* Rhodium White */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="font-bold text-slate-100">⚪ Білий Родій:</span>
                  <p className="text-[10px] text-slate-400">Гальванічне захисне та відбілююче покриття</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Black Rhodium */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="font-bold text-slate-100">🖤 Чорний Родій:</span>
                  <p className="text-[10px] text-slate-400">Графітово-чорне преміальне покриття</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Gilding */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="font-bold text-amber-300">👑 Позолота:</span>
                  <p className="text-[10px] text-slate-400">Гальванічне золочення 585/750 проби</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Blackening */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="font-bold text-slate-300">🌑 Чорніння (Оксидування):</span>
                  <p className="text-[10px] text-slate-400">Хімічне оксидування рельєфів</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Matte Sandblasting */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="font-bold text-sky-300">🏜️ Матування (Піскоструйна обробка):</span>
                  <p className="text-[10px] text-slate-400">Фактурне сатинування / матирування поверхні</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
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
                    className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-center"
                  />
                </div>
              </div>

              {/* Laser Engraving */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <span className="font-bold text-purple-300">⚡ Лазерне Гравіювання:</span>
                  <p className="text-[10px] text-slate-400">Автоматичне лазерне нанесення написів та візерунків</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-purple-200 font-mono font-bold text-center"
                  />
                </div>
              </div>

              {/* Hand Engraving */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-amber-300">✒️ Ручне Гравіювання (Штихель):</span>
                  <p className="text-[10px] text-slate-400">Ручна авторська робота майстра-гравіювальника</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] self-end sm:self-auto">
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
                    className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-200 font-mono font-bold text-center"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* SECTION 3: Currencies exchange rate */}
        {(activeTab === 'all' || activeTab === 'currencies') && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Валютні курси для автоматичного перерахунку</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  🇺🇦 Курс USD / UAH (Гривня за $1)
                </label>
                <div className="relative">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">₴ грн</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  🇪🇺 Курс EUR / USD ($ за €1)
                </label>
                <div className="relative">
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
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400">$ USD</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer timestamp & NBU link */}
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
    </ModalDialog>
  );
};
