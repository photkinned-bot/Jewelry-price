import React from 'react';
import { Tablet, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';
import { ModalDialog } from './ModalDialog';

interface PwaGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaGuideModal: React.FC<PwaGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Встановлення на iPad / Safari"
      subtitle="Автономний повноекранний режим роботи"
      icon={<Tablet className="w-5 h-5 text-amber-400" />}
      maxWidthClass="max-w-md"
      footer={
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
          >
            Зрозуміло
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs text-slate-300">
        <p className="text-slate-200 font-medium">
          Ви можете зберегти калькулятор на початковий екран iPad або iPhone як повноцінний автономний застосунок:
        </p>

        <ol className="space-y-3 pt-1">
          <li className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              1
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Share className="w-3.5 h-3.5 text-sky-400" />
                Натисніть кнопку «Поширити» (Share)
              </span>
              <p className="text-slate-400 text-[11px]">
                У верхній панелі Safari (або нижній на iPhone) натисніть піктограму квадрата зі стрілкою вгору.
              </p>
            </div>
          </li>

          <li className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              2
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <PlusSquare className="w-3.5 h-3.5 text-amber-400" />
                Оберіть «На початковий екран» (Add to Home Screen)
              </span>
              <p className="text-slate-400 text-[11px]">
                Прокрутіть меню вниз та виберіть пункт додавання іконки на робочий стіл iPad.
              </p>
            </div>
          </li>

          <li className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold shrink-0">
              3
            </div>
            <div className="space-y-1">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Готово! Повноекранний режим PWA
              </span>
              <p className="text-slate-400 text-[11px]">
                Застосунок запускатиметься без рамок браузера Safari, а всі функції AI Сканера та Калькулятора працюватимуть автономно.
              </p>
            </div>
          </li>
        </ol>

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center space-x-2 text-[11px] text-slate-400">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Підтримується робота з GitHub Pages та Vercel без обов'язкової авторизації!</span>
        </div>
      </div>
    </ModalDialog>
  );
};
