import React from 'react';
import { Gem, Sparkles, RefreshCw, BookOpen, BarChart2, Key, Tablet, AlertTriangle } from 'lucide-react';
import { Currency, MetalRates } from '../types';
import { formatMoney } from '../data/metalRates';

interface HeaderProps {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  metalRates: MetalRates;
  onOpenRatesModal: () => void;
  onOpenScanner: () => void;
  onOpenGuide: () => void;
  onOpenComparison: () => void;
  onOpenApiKeySettings: () => void;
  onOpenPwaGuide: () => void;
  onOpenDisclaimer: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currency,
  setCurrency,
  metalRates,
  onOpenRatesModal,
  onOpenScanner,
  onOpenGuide,
  onOpenComparison,
  onOpenApiKeySettings,
  onOpenPwaGuide,
  onOpenDisclaimer,
  savedCount,
}) => {
  const goldPriceDisplay = formatMoney(
    metalRates.pureMetalRatesUsd.gold * (currency === 'UAH' ? metalRates.currencies.UAH : 1),
    currency
  );

  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 text-slate-100 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          
          {/* Logo and Tagline */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Gem className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold tracking-tight text-white font-serif">
                  Ювелірний Калькулятор Прозорості
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Дізнайся реальну вартість металу, каміння та націнку бренду
              </p>
            </div>
          </div>

          {/* Quick Actions & Currency Selector */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Live Gold Price Badge */}
            <button
              onClick={onOpenRatesModal}
              title="Клацніть щоб переглянути або змінити біржові ціни металів"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-xs font-medium transition-colors text-amber-300"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span>Au 999:</span>
              <span className="font-semibold text-white">{goldPriceDisplay}/г</span>
            </button>

            {/* Currency Selector */}
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              {(['UAH', 'USD', 'EUR'] as Currency[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    currency === curr
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {curr === 'UAH' ? '₴ UAH' : curr === 'USD' ? '$ USD' : '€ EUR'}
                </button>
              ))}
            </div>

            {/* AI Vision Scanner Button */}
            <button
              onClick={onOpenScanner}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/10 active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
              <span>AI Сканер Бирки</span>
            </button>

            {/* Compare Button */}
            <button
              onClick={onOpenComparison}
              className="relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Порівняння</span>
              {savedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-bold rounded-full">
                  {savedCount}
                </span>
              )}
            </button>

            {/* Disclaimer / Warning Button - High Visibility */}
            <button
              onClick={onOpenDisclaimer}
              className="relative flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border-2 border-amber-500/50 hover:border-amber-400 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all shadow-sm shadow-amber-500/10 active:scale-95 group"
              title="Важливо: попередження про орієнтовність розрахунків"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <AlertTriangle className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Попередження</span>
            </button>

            {/* API Key Settings Button */}
            <button
              onClick={onOpenApiKeySettings}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
              title="Налаштування Gemini API Key"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">Ключ AI</span>
            </button>

            {/* iPad / PWA Guide */}
            <button
              onClick={onOpenPwaGuide}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
              title="Як зберегти на початковий екран iPad / Safari"
            >
              <Tablet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xl:inline">iPad App</span>
            </button>

            {/* Buyer Guide Modal */}
            <button
              onClick={onOpenGuide}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs transition-colors"
              title="Гайд покупця: як перевіряти проби, 4C діамантів та націнки"
            >
              <BookOpen className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Гайд</span>
            </button>

          </div>

        </div>
      </div>
    </header>
  );
};
