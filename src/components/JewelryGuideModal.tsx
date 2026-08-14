import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { ModalDialog } from './ModalDialog';

interface JewelryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JewelryGuideModal: React.FC<JewelryGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'hallmarks' | 'diamonds' | 'lab_vs_natural' | 'store_tips'>('hallmarks');

  if (!isOpen) return null;

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Гайд Покупця Ювелірних Прикрас"
      subtitle="Проби, діаманти 4C, лабораторне каміння та поради у магазині"
      icon={<BookOpen className="w-5 h-5 text-sky-400" />}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex justify-end w-full">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/10 transition-all active:scale-95"
          >
            Зрозуміло!
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 rounded-xl p-1 overflow-x-auto text-xs font-semibold gap-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('hallmarks')}
            className={`py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'hallmarks'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            🥇 Проби та Клейма
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diamonds')}
            className={`py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'diamonds'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            💎 Оцінка Діамантів (4C)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lab_vs_natural')}
            className={`py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'lab_vs_natural'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            🧪 Натуральні vs Lab-Grown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('store_tips')}
            className={`py-2 px-3 rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'store_tips'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            🛍️ Поради у Магазині
          </button>
        </div>

        {/* Body Content */}
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Hallmarks Tab */}
          {activeTab === 'hallmarks' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300">Що означає проба на ювелірній прикрасі?</h3>
              <p className="text-slate-300">
                Проба показує кількість частин чистого дорогоцінного металу в 1000 частинах сплаву. Решта — це лігатура (мідь, срібло, паладій), яка додає міцності та задає колір (жовте, біле чи рожеве золото).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="font-bold text-amber-400">Золото 585 проби (14 Карат)</span>
                  <p className="text-[11px] text-slate-400">
                    58.5% чистого золота. Найпопулярніша та найміцніша проба в Україні для щоденного носіння.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="font-bold text-amber-400">Золото 750 проби (18 Карат)</span>
                  <p className="text-[11px] text-slate-400">
                    75.0% чистого золота. Преміальний європейський стандарт. Яскравіший насичений жовтий колір.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="font-bold text-slate-300">Срібло 925 проби (Sterling Silver)</span>
                  <p className="text-[11px] text-slate-400">
                    92.5% чистого срібла. Еталонне стерлінгове срібло для прикрас та посуду.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1">
                  <span className="font-bold text-cyan-300">Платина 950 проби</span>
                  <p className="text-[11px] text-slate-400">
                    95.0% чистої платини. Важкий, гіпоалергенний та надміцний метал, який не стирається з роками.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Diamonds 4C */}
          {activeTab === 'diamonds' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300">Міжнародна система оцінки діамантів 4C</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">1. Carat (Вага)</span>
                  <p className="text-[11px] text-slate-400">
                    1 карат = 0.2 грама. Ціна каменя росте нелінійно: 1-каратник коштує в 4-5 разів дорожче за два 0.5-каратні камені.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">2. Color (Колір)</span>
                  <p className="text-[11px] text-slate-400">
                    Шкала від D (абсолютно безбарвний) до Z (жовтуватий). Оптимальний вибір за ціною/якістю: колір G, H або I.
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">3. Clarity (Чистота)</span>
                  <p className="text-[11px] text-slate-400">
                    Шкала: FL/IF → VVS → VS → SI → I. Включення у діамантах категорії VS2 та SI1 не видно неозброєним оком!
                  </p>
                </div>

                <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">4. Cut (Огранювання)</span>
                  <p className="text-[11px] text-slate-400">
                    Якість огранювання (Excellent, Very Good) визначає, наскільки яскраво діамант грає та заломлює світло.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lab vs Natural */}
          {activeTab === 'lab_vs_natural' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300">Природний діамант vs Лабораторний (Lab-Grown)</h3>
              <p className="text-slate-300">
                Лабораторні діаманти мають <strong>абсолютно ідентичні</strong> хімічні, фізичні та оптичні властивості з видобутими з надр землі. Різниця полягає у походженні та вартості.
              </p>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>🍃 Природний діамант</span>
                  <span className="text-amber-400">$2,500 - $8,000 / ct</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Рідкісний ресурс. Зберігає репутаційну цінність та перепродається на вторинному ринку з меншим дисконтом.
                </p>
              </div>

              <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>🧪 Лабораторний діамант (Lab-Grown)</span>
                  <span className="text-cyan-400">$150 - $400 / ct</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Вирощується за 2-3 тижні методом HPHT або CVD. Дозволяє купити величезний камінь ідеальної чистоти в 5-10 разів дешевше, проте майже не має інвестиційної цінності при скупці.
                </p>
              </div>
            </div>
          )}

          {/* Store Tips */}
          {activeTab === 'store_tips' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-amber-300">4 Головні правила торгу у ювелірному магазині:</h3>
              <ul className="space-y-2.5">
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block">1. Дивіться на вагу металу, а не лише на дизайн</span>
                  <span className="text-slate-400 text-[11px]">Якщо каблучка важить лише 1.2 грами, але коштує 15 000 грн, ви сплачуєте понад 12 000 грн за роботу й маркетинг бренду.</span>
                </li>
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block">2. Просіть знижку від 15% до 35%</span>
                  <span className="text-slate-400 text-[11px]">Мас-маркет ювелірні мережі мають базову націнку 150-250%, тому майже завжди готові надати персональну знижку клієнту.</span>
                </li>
                <li className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                  <span className="font-bold text-white block">3. Перевіряйте наявність державного клейма та бирки</span>
                  <span className="text-slate-400 text-[11px]">Кожна прикраса повинна мати пробірне клеймо та ниткову бирку з пломбою, де вказана вага, метал і характеристики вставок.</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </ModalDialog>
  );
};
