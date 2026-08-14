import React from 'react';
import { BarChart2, Award, Trash2, Tag, ExternalLink, Share2, Star, Heart, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { SavedCalculation, Currency } from '../types';
import { formatMoney } from '../data/metalRates';
import { ModalDialog } from './ModalDialog';

interface ComparisonViewProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedCalculation[];
  currency: Currency;
  onDeleteSaved: (id: string) => void;
  onSelectCalculatedItem: (item: SavedCalculation) => void;
  onShareItem?: (item: SavedCalculation) => void;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  isOpen,
  onClose,
  savedItems,
  currency,
  onDeleteSaved,
  onSelectCalculatedItem,
  onShareItem,
}) => {
  if (!isOpen) return null;

  // Find item with lowest markup ratio (best value for money)
  const bestValueItem = savedItems.length > 0
    ? [...savedItems].sort((a, b) => a.result.markupRatio - b.result.markupRatio)[0]
    : null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Порівняльна Таблиця Прикрас (${savedItems.length})`}
      subtitle="Порівняйте націнку та реальну вартість металу перед покупкою"
      icon={<BarChart2 className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-5xl"
      footer={
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Закрити
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {savedItems.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl space-y-2">
            <Tag className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">Немає збережених розрахунків</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Натисніть «Зберегти в історію» в головному вікні калькулятора, щоб зберегти декілька прикрас із магазину та порівняти їх тут.
            </p>
          </div>
        ) : (
          <div className="space-y-4 overflow-x-auto">
            
            {/* Best Value Banner */}
            {bestValueItem && (
              <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-emerald-300 font-semibold">
                  <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    Найвигідніший вибір за матеріалами та націнкою:
                    <span className="text-white font-bold ml-1">{bestValueItem.inputs.title}</span>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[11px] self-start sm:self-auto shrink-0">
                  Націнка лише {bestValueItem.result.markupRatio}x (+{bestValueItem.result.markupPercent}%)
                </span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-3">Параметр</th>
                    {savedItems.map((item) => (
                      <th
                        key={item.id}
                        className={`py-3 px-3 font-bold ${
                          bestValueItem?.id === item.id ? 'text-amber-400 bg-amber-500/5' : 'text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate max-w-[140px]">{item.inputs.title}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteSaved(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-rose-950/30"
                            title="Видалити"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  
                  {/* Retail Price */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-300">Ціна в магазині</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 font-bold text-white font-mono text-sm">
                        {formatMoney(item.result.retailPrice, currency)}
                      </td>
                    ))}
                  </tr>

                  {/* User Rating */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-amber-300">Оцінка та враження</td>
                    {savedItems.map((item) => {
                      const itemRating = item.rating || item.inputs.rating;
                      const stars = itemRating?.stars;
                      const vote = itemRating?.vote;

                      return (
                        <td key={item.id} className="py-2.5 px-3">
                          {stars !== undefined || vote ? (
                            <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                              {stars !== undefined && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>{stars}/5</span>
                                </span>
                              )}
                              {vote === 'heart' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[11px]">
                                  <Heart className="w-3 h-3 fill-rose-400" />
                                  <span>Улюблене</span>
                                </span>
                              )}
                              {vote === 'up' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[11px]">
                                  <ThumbsUp className="w-3 h-3 fill-emerald-400/20" />
                                  <span>Вигідно</span>
                                </span>
                              )}
                              {vote === 'down' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[11px]">
                                  <ThumbsDown className="w-3 h-3 fill-amber-400/20" />
                                  <span>Невигідно</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">Не оцінено</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* User Comment / Notes */}
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-300">Власний коментар</td>
                    {savedItems.map((item) => {
                      const comment = item.inputs.userComment || item.inputs.notes || item.userComment;
                      return (
                        <td key={item.id} className="py-2.5 px-3">
                          {comment ? (
                            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-1">
                              <MessageSquare className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                              <span className="italic line-clamp-2">{comment}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 text-[11px]">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Metal details */}
                  <tr>
                    <td className="py-2.5 px-3 text-slate-400">Метал та проба</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3 text-slate-200">
                        {item.inputs.metalType} {item.inputs.purity} ({item.inputs.metalWeightGrams}г)
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
                  <tr className="bg-slate-950/50">
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

                  {/* Product URL */}
                  <tr>
                    <td className="py-2.5 px-3 text-slate-400">Сторінка в магазині</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-2.5 px-3">
                        {item.inputs.productUrl ? (
                          <a
                            href={
                              item.inputs.productUrl.startsWith('http://') || item.inputs.productUrl.startsWith('https://')
                                ? item.inputs.productUrl
                                : `https://${item.inputs.productUrl}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/30 text-sky-300 text-[11px] font-medium transition-colors"
                            title="Відкрити сторінку прикраси в інтернет-магазині"
                          >
                            <span>Магазин</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[11px]">—</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Action */}
                  <tr>
                    <td className="py-3 px-3 font-semibold text-slate-400">Дії</td>
                    {savedItems.map((item) => (
                      <td key={item.id} className="py-3 px-3">
                        <div className="flex flex-col gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectCalculatedItem(item);
                              onClose();
                            }}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs transition-colors"
                          >
                            Завантажити
                          </button>

                          {onShareItem && (
                            <button
                              type="button"
                              onClick={() => {
                                onShareItem(item);
                              }}
                              className="w-full py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition-colors flex items-center justify-center gap-1 border border-slate-700"
                            >
                              <Share2 className="w-3 h-3 text-amber-400" />
                              <span>Поділитися</span>
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </ModalDialog>
  );
};
