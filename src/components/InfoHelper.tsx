import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Sparkles, TrendingUp, DollarSign, Lightbulb, Info } from 'lucide-react';
import { HELP_EXPLANATIONS, HelpInfoItem } from '../data/helpExplanations';

interface InfoHelperProps {
  /** Key from HELP_EXPLANATIONS dictionary */
  helpKey?: keyof typeof HELP_EXPLANATIONS | string;
  /** Custom data override or custom explanation */
  customItem?: Partial<HelpInfoItem>;
  /** Optional custom button size / styling */
  className?: string;
  /** Optional tooltip hover title */
  tooltipTitle?: string;
}

export const InfoHelper: React.FC<InfoHelperProps> = ({
  helpKey,
  customItem,
  className = '',
  tooltipTitle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const item: HelpInfoItem | undefined = helpKey
    ? HELP_EXPLANATIONS[helpKey]
      ? { ...HELP_EXPLANATIONS[helpKey], ...customItem }
      : (customItem as HelpInfoItem)
    : (customItem as HelpInfoItem);

  if (!item) {
    return null;
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // prevent background scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      {/* Small question mark button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        aria-label={`Довідка: ${item.title}`}
        title={tooltipTitle || `Пояснення: ${item.title}`}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-800/90 hover:bg-amber-500/25 border border-slate-700 hover:border-amber-400/60 text-slate-400 hover:text-amber-300 transition-all text-[11px] font-bold shrink-0 shadow-sm cursor-pointer ml-1 select-none focus:outline-none focus:ring-1 focus:ring-amber-400 ${className}`}
      >
        <span className="leading-none pb-0.5">?</span>
      </button>

      {/* Popover / Modal with explanation */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-slate-900 border border-amber-500/30 rounded-2xl p-5 sm:p-6 text-slate-100 shadow-2xl shadow-black/80 space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm sm:text-base font-bold font-serif text-white">
                      {item.title}
                    </h4>
                    {item.category && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 border border-slate-700">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Довідка та логіка ціноутворення
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Закрити"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation Content Blocks */}
            <div className="space-y-3 text-xs leading-relaxed">
              
              {/* 1. What it is */}
              {item.whatIsIt && (
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-1">
                  <div className="flex items-center space-x-1.5 text-sky-400 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Що це таке / Що означає:</span>
                  </div>
                  <p className="text-slate-300 pl-5">
                    {item.whatIsIt}
                  </p>
                </div>
              )}

              {/* 2. Where price comes from */}
              {item.priceSource && (
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-300 font-semibold text-[11px]">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    <span>Звідки береться ця ціна / Як розраховується:</span>
                  </div>
                  <p className="text-slate-200 pl-5">
                    {item.priceSource}
                  </p>
                </div>
              )}

              {/* 3. Impact */}
              {item.impact && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-300 font-semibold text-[11px]">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>На що це впливає у виробі та чеку:</span>
                  </div>
                  <p className="text-slate-200 pl-5">
                    {item.impact}
                  </p>
                </div>
              )}

              {/* 4. Practical Tip */}
              {item.practicalTip && (
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 space-y-1">
                  <div className="flex items-center space-x-1.5 text-purple-300 font-semibold text-[11px]">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                    <span>Порада ювелірного експерта:</span>
                  </div>
                  <p className="text-slate-200 pl-5">
                    {item.practicalTip}
                  </p>
                </div>
              )}

            </div>

            {/* Footer button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow"
              >
                Зрозуміло
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
