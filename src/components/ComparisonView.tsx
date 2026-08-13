import React from 'react';
import { X, BarChart2, CheckCircle2, Award, ArrowDown, Trash2, Tag } from 'lucide-react';
import { SavedCalculation, Currency } from '../types';
import { formatMoney } from '../data/metalRates';

interface ComparisonViewProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedCalculation[];
  currency: Currency;
  onDeleteSaved: (id: string) => void;
  onSelectCalculatedItem: (item: SavedCalculation) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  isOpen,
  onClose,
  savedItems,
  currency,
  onDeleteSaved,
  onSelectCalculatedItem,
}) => {
  if (!isOpen) return null;

  // Find item with lowest markup ratio (best value for money)
  const bestValueItem = savedItems.length > 0
    ? [...savedItems].sort((a, b) => a.result.markupRatio - b.result.markupRatio)[0]
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold font-serif text-white">
                Порівняльна Таблиця Прикрас ({savedItems.length})
              </h2>
              <p className="text-xs text-slate-400">
                Порівняйте націнку та реальну вартість металу перед покупкою
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-x-auto space-y-4">
          {savedItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl space-y-2">
              <Tag className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Немає збережених розрахунків</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Натисніть «Зберегти у порівняння» в головному вікні калькулятора, щоб зберегти декілька прикрас із магазину та порівняти їх тут.
              </p>
            </div>
          ) : (
            <div className="min-w-[650px] space-y-4">
              
              {/* Best Value Banner */}
              {bestValueItem && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
                    <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Найвигідніший вибір за матеріалами та націнкою:
                      <span className="text-white font-bold ml-1">{bestValueItem.inputs.title}</span>
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[11px]">
                    Націнка лише {bestValueItem.result.markupRatio}x (+{bestValueItem.result.markupPercent}%)
                  </span>
                </div>
              )}

              {/* Table */}
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Параметр</th>
                    {savedItems.map((item) => (
                      <th
                        key={item.id}
                        className={`py-3 px-3 font-bold ${
                          bestValueItem?.id === item.id ? 'text-amber-400 bg-amber-500/5 rounded-t-xl' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate max-w-[150px]">{item.inputs.title}</span>
                          <button
                            onClick={() => onDeleteSaved(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-0.5"
                            title="Видалити"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  
                  {/* Retail Price */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-300">Ціна в магазині</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-white font-mono text-sm">
                        {formatMoney(item.result.retailPrice, currency)}
                      </td>
                    ))}
                  </tr>

                  {/* Metal details */}
                  <tr>
                    <td className="py-2.5 px-3 text-slate-400">Метал та проба</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 text-slate-200">
                        {item.inputs.metalType} {item.inputs.purity} проби ({item.inputs.metalWeightGrams}г)
                      </td>
                    ))}
                  </tr>

                  {/* Gemstones */}
                  <tr>
                    <td className="py-2.5 px-3 text-slate-400">Вставки каміння</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 text-slate-200">
                        {item.inputs.gemstones && item.inputs.gemstones.length > 0
                          ? item.inputs.gemstones.map((g) => `${g.count}x ${g.nameUk} (${g.caratsPerStone * g.count}ct)`).join(', ')
                          : 'Без каміння'}
                      </td>
                    ))}
                  </tr>

                  {/* Raw Materials Cost */}
                  <tr className="bg-slate-950/30">
                    <td className="py-2.5 px-3 font-semibold text-amber-300">Вартість сировини (Метал + Каміння)</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-amber-300 font-mono">
                        {formatMoney(item.result.rawMaterialsTotal, currency)}
                      </td>
                    ))}
                  </tr>

                  {/* Markup Index Ratio */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-300">Індекс націнки (Markup Index)</td>
                    {savedItems.map((item) => {
                      const isBest = bestValueItem?.id === item.id;
                      return (
                        <td key={item.id} className="py-2.5 px-3 font-mono">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            isBest ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-rose-300'
                          }`}>
                            {item.result.markupRatio}x (+{item.result.markupPercent}%)
                          </span>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Capital Preservation % */}
                  <tr>
                    <td className="py-2.5 px-3 text-slate-400">Капіталоємність (%)</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-amber-400 font-mono">
                        {item.result.assetPreservationRatioPercent}%
                      </td>
                    ))}
                  </tr>

                  {/* Action */}
                  <tr>
                    <td className="py-3 px-3"></td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-3 px-3">
                        <button
                          onClick={() => {
                            onSelectCalculatedItem(item);
                            onClose();
                          }}
                          className="w-full py-1.5 px-2 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs transition-colors"
                        >
                          Завантажити
                        </button>
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Закрити
          </button>
        </div>

      </div>
    </div>
  );
};
