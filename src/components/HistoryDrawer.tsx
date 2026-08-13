import React from 'react';
import { X, Trash2, Download, Printer, Tag, Calendar, ExternalLink } from 'lucide-react';
import { SavedCalculation, Currency } from '../types';
import { formatMoney } from '../data/metalRates';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedCalculation[];
  currency: Currency;
  onLoadItem: (item: SavedCalculation) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedItems,
  currency,
  onLoadItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(savedItems, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `jewelry-calculations-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full flex flex-col text-slate-100 shadow-2xl animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-serif text-white">
              Збережені Обрахунки ({savedItems.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {savedItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-500">
              <p className="text-xs">Історія порожня</p>
              <p className="text-[11px] max-w-xs mx-auto text-slate-600">
                Розрахуйте вартість прикраси у калькуляторі та натисніть «Зберегти розрахунок», щоб повернутись до нього пізніше.
              </p>
            </div>
          ) : (
            savedItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/50 rounded-xl space-y-2 text-xs transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors">
                      {item.inputs.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>{new Date(item.createdAt).toLocaleDateString('uk-UA')}</span>
                      <span>• {item.inputs.metalType} {item.inputs.purity} ({item.inputs.metalWeightGrams}г)</span>
                    </p>
                  </div>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    title="Видалити"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ціна в магазині</span>
                    <span className="font-bold text-white text-xs">
                      {formatMoney(item.result.retailPrice, currency)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Сировина</span>
                    <span className="font-bold text-amber-400 text-xs">
                      {formatMoney(item.result.rawMaterialsTotal, currency)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">Націнка</span>
                    <span className="font-bold text-rose-300 text-xs">
                      {item.result.markupRatio}x
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onLoadItem(item);
                    onClose();
                  }}
                  className="w-full py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs transition-colors mt-1"
                >
                  Відкрити у калькуляторі
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {savedItems.length > 0 && (
          <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Експорт JSON</span>
              </button>

              <button
                onClick={handlePrintReport}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Друк Звіту</span>
              </button>
            </div>

            <button
              onClick={onClearAll}
              className="w-full text-center text-xs text-rose-400 hover:underline pt-1"
            >
              Очистити всю історію
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
