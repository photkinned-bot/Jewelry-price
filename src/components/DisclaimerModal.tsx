import React from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle, Info, Sparkles, Scale } from 'lucide-react';
import { ModalDialog } from './ModalDialog';

interface DisclaimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ isOpen, onClose }) => {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-lg"
      title="Попередження щодо розрахунків"
      subtitle="Юридична та практична інформація про точність оцінки"
      icon={
        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
          <AlertTriangle className="w-4 h-4" />
        </div>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Використовуйте для порівняння та захисту від переплат
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all active:scale-95 shrink-0"
          >
            Зрозуміло
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs leading-relaxed text-slate-200">
        
        {/* Головне виділене повідомлення */}
        <div className="p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-200 flex items-start space-x-3 shadow-inner">
          <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-white text-sm">
              Увага: розрахунки є орієнтовними!
            </p>
            <p className="text-amber-200/90 text-xs">
              Всі наведені у калькуляторі розрахунки собівартості, вартості каміння, металів та націнки <strong className="text-white font-semibold">є орієнтовними і не можуть бути абсолютно точними</strong>. Вони слугують виключно як <strong className="text-white font-semibold">певний орієнтир для прийняття рішення</strong>.
            </p>
          </div>
        </div>

        {/* Чому дані є орієнтиром */}
        <div className="space-y-2.5 pt-1">
          <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-xs text-amber-400">
            <Info className="w-3.5 h-3.5" />
            Чому точна вартість у кожному магазині може відрізнятися:
          </h3>

          <div className="grid gap-2">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 font-bold text-[10px] mt-0.5">
                1
              </div>
              <p className="text-slate-300">
                <strong className="text-white">Біржові котирування металів:</strong> розрахунок ведеться за світовими курсами (LBMA). Кожен завод, майстерня чи ломбард закладає власну внутрішню премію або дисконт на переплавку.
              </p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 font-bold text-[10px] mt-0.5">
                2
              </div>
              <p className="text-slate-300">
                <strong className="text-white">Індивідуальні властивості каміння:</strong> точна вартість діамантів чи самоцвітів залежить від мікрохарактеристик (симетрія граней, люмінесценція, тип сертифіката), які неможливо врахувати на 100% без геммологічної експертизи.
              </p>
            </div>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400 font-bold text-[10px] mt-0.5">
                3
              </div>
              <p className="text-slate-300">
                <strong className="text-white">Складність роботи та бренд:</strong> унікальний авторський дизайн, ручне закріплення каміння та престижність ювелірного дому формують індивідуальну націнку виробника.
              </p>
            </div>
          </div>
        </div>

        {/* Рекомендація */}
        <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center gap-2 text-slate-300">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Використовуйте цей інструмент, щоб розуміти справедливий діапазон цін та впевнено вести діалог при покупці.
          </span>
        </div>

      </div>
    </ModalDialog>
  );
};
