import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Trash2,
  Download,
  Printer,
  Tag,
  Calendar,
  ChevronRight,
  ExternalLink,
  Share2,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Filter,
} from 'lucide-react';
import { SavedCalculation, Currency, UserRating, RatingVote } from '../types';
import { formatMoney } from '../data/metalRates';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  savedItems: SavedCalculation[];
  currency: Currency;
  onLoadItem: (item: SavedCalculation) => void;
  onShareItem?: (item: SavedCalculation) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  onUpdateItemRating?: (id: string, rating: UserRating | undefined) => void;
}

type RatingFilterTab = 'all' | 'hearts' | 'thumbs_up' | 'thumbs_down' | 'top_stars';

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  savedItems,
  currency,
  onLoadItem,
  onShareItem,
  onDeleteItem,
  onClearAll,
  onUpdateItemRating,
}) => {
  const backdropPointerDownRef = useRef<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<RatingFilterTab>('all');

  // ESC key listener to close drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Counts for tabs
  const heartsCount = savedItems.filter(
    (it) => it.rating?.vote === 'heart' || it.inputs.rating?.vote === 'heart'
  ).length;
  const upCount = savedItems.filter(
    (it) => it.rating?.vote === 'up' || it.inputs.rating?.vote === 'up'
  ).length;
  const downCount = savedItems.filter(
    (it) => it.rating?.vote === 'down' || it.inputs.rating?.vote === 'down'
  ).length;
  const topStarsCount = savedItems.filter((it) => {
    const stars = it.rating?.stars ?? it.inputs.rating?.stars;
    return stars !== undefined && stars >= 4;
  }).length;

  const filteredItems = savedItems.filter((it) => {
    const itemRating = it.rating || it.inputs.rating;
    if (activeFilter === 'hearts') return itemRating?.vote === 'heart';
    if (activeFilter === 'thumbs_up') return itemRating?.vote === 'up';
    if (activeFilter === 'thumbs_down') return itemRating?.vote === 'down';
    if (activeFilter === 'top_stars') return itemRating?.stars !== undefined && itemRating.stars >= 4;
    return true;
  });

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

  const handleQuickStar = (item: SavedCalculation, stars: number) => {
    if (!onUpdateItemRating) return;
    const currentRating = item.rating || item.inputs.rating;
    const newRating: UserRating = {
      ...currentRating,
      stars,
      updatedAt: new Date().toISOString(),
    };
    onUpdateItemRating(item.id, newRating);
  };

  const handleQuickVote = (item: SavedCalculation, vote: RatingVote) => {
    if (!onUpdateItemRating) return;
    const currentRating = item.rating || item.inputs.rating;
    const isSame = currentRating?.vote === vote;
    const newRating: UserRating = {
      ...currentRating,
      vote: isSame ? null : vote,
      updatedAt: new Date().toISOString(),
    };
    onUpdateItemRating(item.id, newRating);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.button === 0 && e.target === e.currentTarget) {
          backdropPointerDownRef.current = true;
        } else {
          backdropPointerDownRef.current = false;
        }
      }}
      onClick={(e) => {
        if (e.button === 0 && backdropPointerDownRef.current && e.target === e.currentTarget) {
          onClose();
        }
        backdropPointerDownRef.current = false;
      }}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.stopPropagation();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onContextMenu={(e) => e.stopPropagation()}
        className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full max-h-[100dvh] flex flex-col text-slate-100 shadow-2xl animate-in slide-in-from-right duration-200"
      >
        
        {/* Header - Fixed */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-serif text-white">
              Збережені Розрахунки ({savedItems.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            title="Закрити (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Rating Filter Tabs */}
        {savedItems.length > 0 && (
          <div className="shrink-0 px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 overflow-x-auto">
            <div className="flex items-center space-x-1.5 min-w-max text-[11px]">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activeFilter === 'all'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                Всі ({savedItems.length})
              </button>

              {heartsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('hearts')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    activeFilter === 'hearts'
                      ? 'bg-rose-500 text-white font-bold shadow-sm'
                      : 'text-rose-300 hover:bg-rose-950/30'
                  }`}
                >
                  <Heart className="w-3 h-3 fill-current" />
                  <span>Улюблені ({heartsCount})</span>
                </button>
              )}

              {upCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('thumbs_up')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    activeFilter === 'thumbs_up'
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                      : 'text-emerald-300 hover:bg-emerald-950/30'
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Вигідні ({upCount})</span>
                </button>
              )}

              {downCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('thumbs_down')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    activeFilter === 'thumbs_down'
                      ? 'bg-amber-600 text-white font-bold shadow-sm'
                      : 'text-amber-300 hover:bg-amber-950/30'
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>Невигідні ({downCount})</span>
                </button>
              )}

              {topStarsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveFilter('top_stars')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                    activeFilter === 'top_stars'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Star className="w-3 h-3 fill-current" />
                  <span>4-5★ ({topStarsCount})</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Content list - Scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
          {savedItems.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-500">
              <p className="text-xs font-semibold">Історія порожня</p>
              <p className="text-[11px] max-w-xs mx-auto text-slate-600">
                Розрахуйте вартість прикраси у калькуляторі, оцініть її та натисніть «Зберегти в історію», щоб повернутись до неї пізніше.
              </p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-10 space-y-2 text-slate-500">
              <Filter className="w-6 h-6 mx-auto text-slate-600" />
              <p className="text-xs font-semibold">Немає елементів за обраним фільтром</p>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Показати всі розрахунки
              </button>
            </div>
          ) : (
            filteredItems.map((item) => {
              const itemRating = item.rating || item.inputs.rating;
              const stars = itemRating?.stars;
              const vote = itemRating?.vote;

              return (
                <div
                  key={item.id}
                  className="p-3.5 bg-slate-800/80 border border-slate-700/80 hover:border-amber-400/50 rounded-xl space-y-2.5 text-xs transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-white text-sm group-hover:text-amber-300 transition-colors truncate">
                        {item.inputs.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5 truncate">
                        <Calendar className="w-3 h-3 text-slate-500 shrink-0" />
                        <span>{new Date(item.createdAt).toLocaleDateString('uk-UA')}</span>
                        <span>• {item.inputs.metalType} {item.inputs.purity} ({item.inputs.metalWeightGrams}г)</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors shrink-0"
                      title="Видалити"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Rating Badge & Quick Rating Bar */}
                  <div className="p-2 bg-slate-950/70 rounded-lg border border-slate-800/80 flex items-center justify-between gap-2">
                    {/* Stars bar */}
                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => handleQuickStar(item, 0)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-all ${
                          stars === 0
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                            : 'text-slate-500 hover:text-rose-400'
                        }`}
                        title="0 зірок (максимально погано)"
                      >
                        0★
                      </button>

                      {[1, 2, 3, 4, 5].map((s) => {
                        const isFilled = stars !== undefined && s <= stars;
                        return (
                          <button
                            key={s}
                            type="button"
                            onClick={() => handleQuickStar(item, s)}
                            className="p-0.5 hover:scale-125 transition-transform"
                            title={`Поставити ${s} зірок`}
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${
                                isFilled
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600 hover:text-slate-400'
                              }`}
                            />
                          </button>
                        );
                      })}

                      {stars !== undefined && (
                        <span className="text-[10px] font-mono font-bold text-amber-400 ml-1">
                          {stars}/5
                        </span>
                      )}
                    </div>

                    {/* Reaction buttons */}
                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQuickVote(item, 'heart')}
                        className={`p-1 rounded transition-all ${
                          vote === 'heart'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : 'text-slate-500 hover:text-rose-400'
                        }`}
                        title="Улюблене"
                      >
                        <Heart className={`w-3.5 h-3.5 ${vote === 'heart' ? 'fill-rose-400' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickVote(item, 'up')}
                        className={`p-1 rounded transition-all ${
                          vote === 'up'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'text-slate-500 hover:text-emerald-400'
                        }`}
                        title="Рекомендую (палець уверх)"
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${vote === 'up' ? 'fill-emerald-400/20' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickVote(item, 'down')}
                        className={`p-1 rounded transition-all ${
                          vote === 'down'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                            : 'text-slate-500 hover:text-amber-400'
                        }`}
                        title="Не рекомендую (палець униз)"
                      >
                        <ThumbsDown className={`w-3.5 h-3.5 ${vote === 'down' ? 'fill-amber-400/20' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Financial Metrics */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-700/60 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Ціна</span>
                      <span className="font-bold text-white">
                        {formatMoney(item.result.retailPrice, currency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Сировина</span>
                      <span className="font-bold text-amber-400">
                        {formatMoney(item.result.rawMaterialsTotal, currency)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Націнка</span>
                      <span className="font-bold text-rose-300">
                        {item.result.markupRatio}x
                      </span>
                    </div>
                  </div>

                  {/* Direct Link to Store if present */}
                  {item.inputs.productUrl && (
                    <a
                      href={
                        item.inputs.productUrl.startsWith('http://') || item.inputs.productUrl.startsWith('https://')
                          ? item.inputs.productUrl
                          : `https://${item.inputs.productUrl}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-1.5 px-3 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:text-sky-200 font-semibold text-[11px] transition-all flex items-center justify-center gap-1.5"
                      title="Перейти на сторінку товару в інтернет-магазині"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="truncate">Перейти до магазину / товару</span>
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (onShareItem) {
                          onShareItem(item);
                        }
                      }}
                      className="py-2 px-2.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 hover:text-white text-slate-300 font-semibold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 border border-slate-600/60"
                      title="Поділитися цим збереженим розрахунком разом із рейтингом"
                    >
                      <Share2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Поділитися</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onLoadItem(item);
                        onClose();
                      }}
                      className="py-2 px-2.5 rounded-lg bg-amber-500/15 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1 active:scale-95 border border-amber-500/30"
                      title="Завантажити в робочу область калькулятора"
                    >
                      <span>Відкрити</span>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer - Fixed */}
        {savedItems.length > 0 && (
          <div className="shrink-0 p-4 bg-slate-950 border-t border-slate-800 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Експорт JSON</span>
              </button>

              <button
                type="button"
                onClick={handlePrintReport}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Друк Звіту</span>
              </button>
            </div>

            <button
              type="button"
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
