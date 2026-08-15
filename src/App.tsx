import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { JewelryForm } from './components/JewelryForm';
import { PriceBreakdownChart } from './components/PriceBreakdownChart';
import { MarkupGauge } from './components/MarkupGauge';
import { InvestmentCard } from './components/InvestmentCard';
import { AiAdviceCard } from './components/AiAdviceCard';
import { MetalRatesModal } from './components/MetalRatesModal';
import { AiScannerModal } from './components/AiScannerModal';
import { ComparisonView } from './components/ComparisonView';
import { HistoryDrawer } from './components/HistoryDrawer';
import { JewelryGuideModal } from './components/JewelryGuideModal';
import { ApiKeySettingsModal } from './components/ApiKeySettingsModal';
import { PwaGuideModal } from './components/PwaGuideModal';
import { ShareModal } from './components/ShareModal';
import { DisclaimerModal } from './components/DisclaimerModal';
import { CalculationRatingWidget } from './components/CalculationRatingWidget';
import { UserCommentCard } from './components/UserCommentCard';

import { CalculationInputs, Currency, MetalRates, SavedCalculation, CalculationResult, UserRating } from './types';
import { DEFAULT_METAL_RATES } from './data/metalRates';
import { fetchLiveRates } from './lib/rateService';
import { calculateJewelryBreakdown } from './data/calculationEngine';
import { EMPTY_CALCULATION_INPUTS } from './data/sampleItems';
import { parseShareUrlFromLocation } from './lib/shareService';
import { Save, History, Scale, CheckCircle2, Share2, Sparkles, X, AlertTriangle, MessageSquare } from 'lucide-react';

const LOCAL_STORAGE_KEY = 'jewelry_transparency_saved_v2';

export default function App() {
  const [currency, setCurrency] = useState<Currency>('UAH');
  const [metalRates, setMetalRates] = useState<MetalRates>(DEFAULT_METAL_RATES);

  // Current calculation form state - starts empty by default
  const [inputs, setInputs] = useState<CalculationInputs>(EMPTY_CALCULATION_INPUTS);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Saved calculations history
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Modal visibility states
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isApiKeySettingsOpen, setIsApiKeySettingsOpen] = useState(false);
  const [isPwaGuideOpen, setIsPwaGuideOpen] = useState(false);
  const [isDisclaimerOpen, setIsDisclaimerOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTargetItem, setShareTargetItem] = useState<{
    inputs: CalculationInputs;
    result: CalculationResult;
    currency: Currency;
  } | null>(null);

  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [sharedBannerNotice, setSharedBannerNotice] = useState<{ title: string; comment?: string } | null>(null);

  // Check URL on startup for shared calculation parameters (?calc=...)
  useEffect(() => {
    const sharedData = parseShareUrlFromLocation();
    if (sharedData && sharedData.inputs) {
      setInputs(sharedData.inputs);
      if (sharedData.currency) {
        setCurrency(sharedData.currency);
      }
      setSharedBannerNotice({
        title: sharedData.inputs.title || 'Ювелірний виріб',
        comment: sharedData.inputs.userComment || sharedData.inputs.notes,
      });
    }
  }, []);

  // Sync saved calculations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(savedCalculations));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [savedCalculations]);

  // Fetch live metal rates on mount (supports server API and GitHub Pages client fallback)
  useEffect(() => {
    async function loadInitialRates() {
      try {
        const ratesData = await fetchLiveRates(false);
        setMetalRates((prev) => ({
          ...prev,
          ...ratesData,
        }));
      } catch (err) {
        console.warn('Could not load live rates, using defaults:', err);
      }
    }
    loadInitialRates();
  }, []);

  // Compute live breakdown result whenever inputs, currency or metal rates change
  const result = useMemo(() => {
    return calculateJewelryBreakdown(
      { ...inputs, currency },
      metalRates
    );
  }, [inputs, currency, metalRates]);

  // Open share modal for current active item or a specific saved item
  const handleOpenShareModal = (savedItem?: SavedCalculation) => {
    if (savedItem) {
      setShareTargetItem({
        inputs: savedItem.inputs,
        result: savedItem.result,
        currency: savedItem.inputs.currency || currency,
      });
    } else {
      setShareTargetItem({
        inputs,
        result,
        currency,
      });
    }
    setIsShareModalOpen(true);
  };

  // Save current item to history
  const handleSaveCalculation = () => {
    const newSaved: SavedCalculation = {
      id: 'saved-' + Date.now(),
      createdAt: new Date().toISOString(),
      inputs: { ...inputs, currency },
      result,
      rating: inputs.rating,
      userComment: inputs.userComment || inputs.notes,
    };
    setSavedCalculations((prev) => [newSaved, ...prev]);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleUpdateItemRating = (id: string, rating: UserRating | undefined) => {
    setSavedCalculations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            rating,
            inputs: {
              ...item.inputs,
              rating,
            },
          };
        }
        return item;
      })
    );
  };

  const handleDeleteSaved = (id: string) => {
    setSavedCalculations((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllSaved = () => {
    if (window.confirm('Ви дійсно бажаєте очистити всю історію порівнянь?')) {
      setSavedCalculations([]);
    }
  };

  const handleApplyScannedData = (scanned: Partial<CalculationInputs>) => {
    setSelectedTemplateId(null);
    setInputs((prev) => {
      const next: CalculationInputs = {
        ...prev,
        ...scanned,
        id: 'calc-' + Date.now(),
        // Keep existing photo if scanner didn't provide a new product photo (e.g. from tag scan)
        photoUrl: scanned.photoUrl || prev.photoUrl,
        // Only override weight if scanned weight is positive
        metalWeightGrams: (scanned.metalWeightGrams && scanned.metalWeightGrams > 0)
          ? scanned.metalWeightGrams
          : (prev.metalWeightGrams || 0),
        // Only override price if scanned price is positive
        retailPrice: (scanned.retailPrice && scanned.retailPrice > 0)
          ? scanned.retailPrice
          : (prev.retailPrice || 0),
        // Apply scanned gemstones if array is provided
        gemstones: Array.isArray(scanned.gemstones)
          ? scanned.gemstones
          : (prev.gemstones || []),
      };
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased selection:bg-amber-500 selection:text-slate-950">
      
      {/* Top Bar Header */}
      <Header
        currency={currency}
        setCurrency={setCurrency}
        metalRates={metalRates}
        onOpenRatesModal={() => setIsRatesModalOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenComparison={() => setIsComparisonOpen(true)}
        onOpenApiKeySettings={() => setIsApiKeySettingsOpen(true)}
        onOpenPwaGuide={() => setIsPwaGuideOpen(true)}
        onOpenDisclaimer={() => setIsDisclaimerOpen(true)}
        savedCount={savedCalculations.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Banner / Notice Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-slate-800 rounded-2xl shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">
                  Перевіряйте ціну будь-яких ювелірних прикрас перед покупкою
                </span>
                <button
                  type="button"
                  onClick={() => setIsDisclaimerOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-[11px] font-semibold transition-colors cursor-pointer"
                  title="Натисніть щоб прочитати офіційне попередження"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Орієнтовний розрахунок</span>
                </button>
              </div>
              <span className="text-slate-400 block mt-0.5">
                Калькулятор вираховує чистий вміст металу, ринкову вартість каміння й відокремлює її від націнки магазину.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
            {/* Disclaimer Button in Bar */}
            <button
              type="button"
              onClick={() => setIsDisclaimerOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 text-xs font-semibold transition-all active:scale-95"
              title="Попередження щодо точності розрахунків"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Увага: орієнтир</span>
            </button>

            {/* Share Button (Primary) */}
            <button
              onClick={() => handleOpenShareModal()}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95"
              title="Поділитися поточним розрахунком через соцмережі або посиланням"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-950" />
              <span>Поділитися</span>
            </button>

            <button
              onClick={handleSaveCalculation}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 text-slate-200 hover:text-white font-semibold text-xs shadow-sm transition-all active:scale-95"
            >
              <Save className="w-3.5 h-3.5 text-amber-400" />
              <span>Зберегти</span>
            </button>

            <button
              onClick={() => setIsHistoryOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-colors"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Історія ({savedCalculations.length})</span>
            </button>
          </div>
        </div>

        {/* Incoming Shared Calculation Welcome Banner */}
        {sharedBannerNotice && (
          <div className="p-4 bg-gradient-to-r from-amber-950/50 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl text-xs text-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white text-sm">
                    Відкрито спільний розрахунок: «{sharedBannerNotice.title}»
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold text-[10px] border border-amber-500/30">
                    Спільне посилання
                  </span>
                </div>
                {sharedBannerNotice.comment && (
                  <div className="mt-1 p-2 rounded-lg bg-slate-950/80 border border-amber-500/30 text-amber-200 text-xs italic flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Коментар автора: «{sharedBannerNotice.comment}»</span>
                  </div>
                )}
                <p className="text-slate-400 text-xs mt-0.5">
                  Ви можете переглянути повну розбивку ціни, змінити параметри або зберегти розрахунок до своєї історії.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleSaveCalculation}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/10 active:scale-95"
              >
                Зберегти собі в історію
              </button>
              <button
                type="button"
                onClick={() => setSharedBannerNotice(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                title="Закрити сповіщення"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Save success toast banner */}
        {saveSuccessNotice && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Прикрасу успішно збережено до історії порівняння!</span>
          </div>
        )}

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT COLUMN (Form Inputs) - 5 cols */}
          <div className="lg:col-span-5 space-y-6">
            <JewelryForm
              inputs={inputs}
              onChange={setInputs}
              currency={currency}
              rates={metalRates}
              onOpenScanner={() => setIsScannerOpen(true)}
              selectedTemplateId={selectedTemplateId}
              onSelectTemplate={setSelectedTemplateId}
            />
          </div>

          {/* RIGHT COLUMN (Live Breakdown Analytics) - 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* 1. User Rating & Reaction Verdict Widget */}
            <CalculationRatingWidget
              rating={inputs.rating}
              onChangeRating={(newRating) => setInputs((prev) => ({ ...prev, rating: newRating }))}
              itemTitle={inputs.title}
            />

            {/* 2. Markup Meter / Gauge */}
            <MarkupGauge
              result={result}
              currency={currency}
              onShare={() => handleOpenShareModal()}
            />

            {/* 3. Recharts Price Breakdown */}
            <PriceBreakdownChart result={result} currency={currency} />

            {/* 4. Investment & Pawnshop Liquidity */}
            <InvestmentCard result={result} currency={currency} />

            {/* 5. Gemini AI Advice Consultant */}
            <AiAdviceCard inputs={inputs} result={result} />

            {/* 6. User Personal Comment & Notes */}
            <UserCommentCard
              comment={inputs.userComment || inputs.notes || ''}
              onChangeComment={(text) =>
                setInputs((prev) => ({ ...prev, userComment: text, notes: text }))
              }
              itemTitle={inputs.title}
            />

          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 py-6 text-slate-500 text-xs mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-2">
          <p className="font-serif text-slate-400 font-medium">
            Ювелірний Калькулятор Прозорості (Jewelry Value & Markup Tracker)
          </p>
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
            <span>Розрахунки базуються на орієнтовних міжнародних біржових котируваннях металів (LBMA spot) та стандартних коефіцієнтах ювелірного виробництва.</span>
            <button
              type="button"
              onClick={() => setIsDisclaimerOpen(true)}
              className="text-amber-400 hover:text-amber-300 underline font-semibold inline-flex items-center gap-1 ml-1 cursor-pointer"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400" />
              <span>Попередження про орієнтовність даних</span>
            </button>
          </p>
        </div>
      </footer>

      {/* MODALS & DRAWERS */}
      <MetalRatesModal
        isOpen={isRatesModalOpen}
        onClose={() => setIsRatesModalOpen(false)}
        metalRates={metalRates}
        onSaveRates={setMetalRates}
      />

      <AiScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onApplyData={handleApplyScannedData}
      />

      <ComparisonView
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        savedItems={savedCalculations}
        currency={currency}
        onDeleteSaved={handleDeleteSaved}
        onSelectCalculatedItem={(item) => {
          setSelectedTemplateId(null);
          setInputs(item.inputs);
        }}
        onShareItem={(item) => handleOpenShareModal(item)}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        savedItems={savedCalculations}
        currency={currency}
        onLoadItem={(item) => {
          setSelectedTemplateId(null);
          setInputs(item.inputs);
        }}
        onShareItem={(item) => handleOpenShareModal(item)}
        onDeleteItem={handleDeleteSaved}
        onClearAll={handleClearAllSaved}
        onUpdateItemRating={handleUpdateItemRating}
      />

      <JewelryGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      <ApiKeySettingsModal
        isOpen={isApiKeySettingsOpen}
        onClose={() => setIsApiKeySettingsOpen(false)}
      />

      <PwaGuideModal
        isOpen={isPwaGuideOpen}
        onClose={() => setIsPwaGuideOpen(false)}
      />

      <DisclaimerModal
        isOpen={isDisclaimerOpen}
        onClose={() => setIsDisclaimerOpen(false)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        inputs={shareTargetItem?.inputs || inputs}
        result={shareTargetItem?.result || result}
        currency={shareTargetItem?.currency || currency}
      />

    </div>
  );
}

