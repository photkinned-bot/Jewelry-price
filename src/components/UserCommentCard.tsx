import React from 'react';
import { MessageSquare, MessageSquarePlus, X, Tag, Sparkles, Check } from 'lucide-react';
import { InfoHelper } from './InfoHelper';

interface UserCommentCardProps {
  comment?: string;
  onChangeComment: (comment: string) => void;
  itemTitle?: string;
}

const QUICK_NOTE_SUGGESTIONS = [
  '🎁 Подарунок на свято',
  '🏷️ Продавець обіцяв знижку -10%',
  '🔍 Потрібно перевірити клеймо та пробу',
  '💎 Гарна якість огранювання каміння',
  '⚖️ Торгуватись за роботу майстра',
  '⭐ У магазині сподобалось найбільше',
];

export const UserCommentCard: React.FC<UserCommentCardProps> = ({
  comment = '',
  onChangeComment,
  itemTitle,
}) => {
  const maxChars = 400;
  const currentLength = comment.length;

  const handleQuickAdd = (text: string) => {
    if (!comment) {
      onChangeComment(text);
    } else if (!comment.includes(text)) {
      onChangeComment(`${comment.trim()} • ${text}`);
    }
  };

  const handleClear = () => {
    onChangeComment('');
  };

  return (
    <div
      id="user-comment-card"
      className="bg-slate-900 border border-slate-800 hover:border-slate-750 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-4 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <MessageSquare className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-base font-bold font-serif text-white flex items-center gap-2">
                <span>Власний Коментар та Нотатки</span>
                {currentLength > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-sans text-[10px] font-bold border border-amber-500/30">
                    <Check className="w-2.5 h-2.5" />
                    <span>Записано</span>
                  </span>
                )}
              </h3>
              <InfoHelper
                customItem={{
                  id: 'userCommentHelp',
                  title: 'Власний коментар до розрахунку',
                  category: 'Користувацькі нотатки',
                  whatIsIt: 'Поле для ваших особистих думок, нагадувань, домовленостей з продавцем чи вражень від прикраси.',
                  priceSource: 'Вводиться користувачем вручну.',
                  impact: 'Коментар автоматично зберігається в історії та передається при створенні посилання (кнопка «Поділитися»), щоб інша людина могла прочитати ваш відгук.',
                }}
              />
            </div>
            <p className="text-xs text-slate-400">
              Запишіть думки або аргументи — коментар потрапить в історію та посилання для друзів
            </p>
          </div>
        </div>

        {currentLength > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center space-x-1 text-[11px] text-slate-400 hover:text-rose-400 px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Очистити коментар"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Очистити</span>
          </button>
        )}
      </div>

      {/* Quick Tag Chips */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-amber-400" />
            <span>Швидкі підказки:</span>
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            Натисніть для додавання в коментар
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_NOTE_SUGGESTIONS.map((tag, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleQuickAdd(tag)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-amber-300 border border-slate-750 hover:border-amber-500/40 transition-all active:scale-95"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea Input */}
      <div className="space-y-1.5">
        <div className="relative">
          <textarea
            id="user-comment-input"
            rows={3}
            maxLength={maxChars}
            placeholder="напр. Гарна каблучка на ювілей, продавець обіцяє знижку 10% якщо сплатити готівкою. Вставки перевірили — природне каміння..."
            value={comment}
            onChange={(e) => onChangeComment(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/40 rounded-xl p-3 text-xs md:text-sm text-slate-100 placeholder-slate-500 leading-relaxed resize-none focus:outline-none transition-all"
          />
        </div>

        {/* Counter and status bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400/80" />
            <span>
              {currentLength > 0
                ? 'Коментар додано до історії та спільного посилання'
                : 'Короткий коментар збережеться разом із розрахунком'}
            </span>
          </span>

          <span
            className={`font-mono text-[10px] ${
              currentLength >= maxChars - 20
                ? 'text-rose-400 font-bold'
                : currentLength > 0
                ? 'text-amber-400'
                : 'text-slate-500'
            }`}
          >
            {currentLength}/{maxChars}
          </span>
        </div>
      </div>
    </div>
  );
};
