import React, { useState } from 'react';
import { Star, ThumbsUp, ThumbsDown, Heart, RotateCcw, Sparkles } from 'lucide-react';
import { UserRating, RatingVote } from '../types';

interface CalculationRatingWidgetProps {
  rating?: UserRating;
  onChangeRating: (rating: UserRating | undefined) => void;
  itemTitle?: string;
}

const STAR_LABELS: Record<number, { title: string; desc: string; color: string }> = {
  0: {
    title: '0/5 — Максимально погано',
    desc: 'Критично невигідно, величезна переплата або низька якість',
    color: 'text-rose-400',
  },
  1: {
    title: '1/5 — Дуже погано',
    desc: 'Завищена ціна, низький вміст металу до вартості',
    color: 'text-rose-400',
  },
  2: {
    title: '2/5 — Нижче середнього',
    desc: 'Сумнівна вигода, краще пошукати альтернативу',
    color: 'text-orange-400',
  },
  3: {
    title: '3/5 — Посередньо / Нормально',
    desc: 'Стандартна ціна мас-маркету без особливої вигоди',
    color: 'text-amber-400',
  },
  4: {
    title: '4/5 — Добре / Вигідно',
    desc: 'Приємна ціна та хороший баланс матеріалів і роботи',
    color: 'text-lime-400',
  },
  5: {
    title: '5/5 — Відмінно / Класно!',
    desc: 'Топ вибір! Чесна собівартість та максимальна вигода',
    color: 'text-emerald-400',
  },
};

export const CalculationRatingWidget: React.FC<CalculationRatingWidgetProps> = ({
  rating,
  onChangeRating,
  itemTitle,
}) => {
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);

  const currentStars = rating?.stars;
  const currentVote = rating?.vote;

  const displayStars = hoveredStar !== null ? hoveredStar : currentStars;

  const handleStarClick = (stars: number) => {
    // If clicking same star value, keep or allow resetting
    const newRating: UserRating = {
      ...rating,
      stars,
      updatedAt: new Date().toISOString(),
    };
    onChangeRating(newRating);
  };

  const handleVoteClick = (vote: RatingVote) => {
    const isSame = currentVote === vote;
    const newVote = isSame ? null : vote;
    const newRating: UserRating = {
      ...rating,
      vote: newVote,
      updatedAt: new Date().toISOString(),
    };
    onChangeRating(newRating);
  };

  const handleReset = () => {
    onChangeRating(undefined);
    setHoveredStar(null);
  };

  const hasAnyRating = currentStars !== undefined || currentVote !== undefined && currentVote !== null;

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-750 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-4 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400/20" />
          </div>
          <div>
            <h3 className="text-sm md:text-base font-bold font-serif text-white flex items-center gap-1.5">
              <span>Ваша Оцінка Розрахунку</span>
              {hasAnyRating && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-sans text-[10px] font-bold border border-amber-500/30">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>Оцінено</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Позначте враження від розрахунку — оцінка збережеться в історії та посиланні
            </p>
          </div>
        </div>

        {hasAnyRating && (
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Скинути оцінку"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Скинути</span>
          </button>
        )}
      </div>

      {/* Main Interactive Rating Row */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
        
        {/* Left: Star Scale (0-5 stars) */}
        <div className="sm:col-span-7 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Оцінка за 5-бальною шкалою:
            </span>
            {currentStars !== undefined && (
              <span className={`text-xs font-mono font-bold ${STAR_LABELS[currentStars]?.color || 'text-amber-400'}`}>
                {currentStars}/5 зірок
              </span>
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            {/* Quick 0 Stars Button (Worst rating) */}
            <button
              type="button"
              onClick={() => handleStarClick(0)}
              onMouseEnter={() => setHoveredStar(0)}
              onMouseLeave={() => setHoveredStar(null)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold font-mono transition-all border ${
                currentStars === 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm ring-1 ring-rose-500/40'
                  : 'bg-slate-800/80 text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border-slate-700'
              }`}
              title="0 зірочок — Максимально погано"
            >
              0★
            </button>

            {/* 1 to 5 Stars Buttons */}
            {[1, 2, 3, 4, 5].map((starNum) => {
              const isFilled = displayStars !== undefined && starNum <= displayStars;
              const isSelected = currentStars !== undefined && starNum <= currentStars;

              return (
                <button
                  key={starNum}
                  type="button"
                  onClick={() => handleStarClick(starNum)}
                  onMouseEnter={() => setHoveredStar(starNum)}
                  onMouseLeave={() => setHoveredStar(null)}
                  className="p-1.5 sm:p-2 rounded-xl transition-all hover:scale-110 active:scale-95 focus:outline-none"
                  title={`${starNum} з 5 зірочок — ${STAR_LABELS[starNum]?.title}`}
                >
                  <Star
                    className={`w-6 h-6 sm:w-7 sm:h-7 transition-all ${
                      isFilled
                        ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                        : isSelected
                        ? 'text-amber-400 fill-amber-400/50'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Description of active star state */}
          <div className="min-h-[28px] text-[11px] leading-tight">
            {displayStars !== undefined ? (
              <div className="animate-in fade-in duration-150">
                <span className={`font-bold ${STAR_LABELS[displayStars]?.color}`}>
                  {STAR_LABELS[displayStars]?.title}:{' '}
                </span>
                <span className="text-slate-400">{STAR_LABELS[displayStars]?.desc}</span>
              </div>
            ) : (
              <span className="text-slate-500 italic">
                Оберіть зірочки (0 — дуже погано, 5 — відмінно)
              </span>
            )}
          </div>
        </div>

        {/* Right: Quick Reactions (Thumbs up, Thumbs down, Heart) */}
        <div className="sm:col-span-5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 block">
            Швидка реакція / вердикт:
          </span>

          <div className="grid grid-cols-3 gap-1.5">
            {/* Heart (Like / Favorite) */}
            <button
              type="button"
              onClick={() => handleVoteClick('heart')}
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border active:scale-95 ${
                currentVote === 'heart'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/10 ring-1 ring-rose-500/40'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-rose-300 border-slate-700/60'
              }`}
              title="Сердечко — дуже подобається, улюблене"
            >
              <Heart
                className={`w-4 h-4 ${
                  currentVote === 'heart' ? 'fill-rose-400 text-rose-400 animate-pulse' : ''
                }`}
              />
              <span className="text-[10px] font-bold">Вподобати</span>
            </button>

            {/* Thumbs Up (Recommend / Good) */}
            <button
              type="button"
              onClick={() => handleVoteClick('up')}
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border active:scale-95 ${
                currentVote === 'up'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500/40'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 border-slate-700/60'
              }`}
              title="Палець уверх — вигідно, рекомендую"
            >
              <ThumbsUp
                className={`w-4 h-4 ${
                  currentVote === 'up' ? 'fill-emerald-400/20 text-emerald-400' : ''
                }`}
              />
              <span className="text-[10px] font-bold">Рекомендую</span>
            </button>

            {/* Thumbs Down (Overpriced / Bad) */}
            <button
              type="button"
              onClick={() => handleVoteClick('down')}
              className={`p-2 rounded-xl flex flex-col items-center justify-center gap-1 transition-all border active:scale-95 ${
                currentVote === 'down'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border-slate-700/60'
              }`}
              title="Палець униз — невигідно, завищена націнка"
            >
              <ThumbsDown
                className={`w-4 h-4 ${
                  currentVote === 'down' ? 'fill-amber-400/20 text-amber-400' : ''
                }`}
              />
              <span className="text-[10px] font-bold">Не раджу</span>
            </button>
          </div>
        </div>

      </div>

      {/* Summary Badge for Active Rating */}
      {hasAnyRating && (
        <div className="p-3 bg-slate-950/70 rounded-xl border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-slate-200">
            <span className="text-amber-400 font-bold">Вердикт:</span>
            <span className="font-semibold text-white">
              {currentStars !== undefined && (
                <span className="mr-1.5">
                  {'★'.repeat(currentStars)}
                  {'☆'.repeat(Math.max(0, 5 - currentStars))} ({currentStars}/5)
                </span>
              )}
              {currentVote === 'heart' && <span className="text-rose-400">❤️ Улюблене</span>}
              {currentVote === 'up' && <span className="text-emerald-400">👍 Схвалено</span>}
              {currentVote === 'down' && <span className="text-amber-400">👎 Невигідно</span>}
            </span>
          </div>

          <span className="text-[11px] text-slate-400 italic">
            ✓ Включено в історію та посилання
          </span>
        </div>
      )}
    </div>
  );
};
