import React, { useState } from 'react';
import { X, BookOpen, ShieldCheck, Gem, Award, AlertTriangle, Sparkles, HelpCircle } from 'lucide-react';

interface JewelryGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JewelryGuideModal: React.FC<JewelryGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'hallmarks' | 'diamonds' | 'lab_vs_natural' | 'store_tips'>('hallmarks');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl text-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h2 className="text-lg font-bold font-serif text-white">
              Гайд Покупця Ювелірних Прикрас
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab('hallmarks')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'hallmarks'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🥇 Проби та Клейма
          </button>
          <button
            onClick={() => setActiveTab('diamonds')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'diamonds'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            💎 Оцінка Діамантів (4C)
          </button>
          <button
            onClick={() => setActiveTab('lab_vs_natural')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'lab_vs_natural'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🧪 Натуральні vs Lab-Grown
          </button>
          <button
            onClick={() => setActiveTab('store_tips')}
            className={`py-3 px-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'store_tips'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            🛍️ Поради у Магазині
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed max-h-[65vh] overflow-y-auto">
          
          {/* Hallmarks Tab */}
          {activeTab === 'hallmarks' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-300">Що означає проба на ювелірній прикрасі?</h3>
              <p>
                Проба показує кількість частин чистого дорогоцінного металу в 1000 частинах сплаву. Решта — це лігатура (мідь, срібло, паладій), яка додає міцності та задає колір (жовте, біле чи рожеве золото).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
                  <span className="font-bold text-amber-400">Золото 585 проби (14 Карат)</span>
                  <p className="text-[11px] text-slate-400">
                    58.5% чистого золота. Найпопулярніша та найміцніша проба в Україні для щоденного носіння.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
                  <span className="font-bold text-amber-400">Золото 750 проби (18 Карат)</span>
                  <p className="text-[11px] text-slate-400">
                    75.0% чистого золота. Преміальний європейський стандарт. Яскравіший насичений жовтий колір.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
                  <span className="font-bold text-slate-300">Срібло 925 проби (Sterling Silver)</span>
                  <p className="text-[11px] text-slate-400">
                    92.5% чистого срібла. Еталонне стерлінгове срібло для прикрас та посуду.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
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
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-300">Міжнародна система оцінки діамантів 4C</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">1. Carat (Вага)</span>
                  <p className="text-[11px] text-slate-400">
                    1 карат = 0.2 грама. Ціна каменя росте нелінійно: 1-каратник коштує в 4-5 разів дорожче за два 0.5-каратні камені.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">2. Color (Колір)</span>
                  <p className="text-[11px] text-slate-400">
                    Шкала від D (абсолютно безбарвний) до Z (жовтуватий). Оптимальний вибір за ціною/якістю: колір G, H або I.
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl">
                  <span className="font-bold text-sky-300 block mb-1">3. Clarity (Чистота)</span>
                  <p className="text-[11px] text-slate-400">
                    Шкала: FL/IF → VVS → VS → SI → I. Включення у діамантах категорії VS2 та SI1 не видно неозброєним оком!
                  </p>
                </div>

                <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl">
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
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-amber-300">Природний діамант vs Лабораторний (Lab-Grown)</h3>
              <p>
                Лабораторні діаманти мають **абсолютно ідентичні** хімічні, фізичні та оптичні властивості з видобутими з надр землі. Різниця полягає у походженні та вартості.
              </p>

              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-white">
                  <span>🍃 Природний діамант</span>
                  <span className="text-amber-400">$2,500 - $8,000 / ct</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Рідкісний ресурс. Зберігає репутаційну цінність та перепродається на вторинному ринку з меншим дисконтом.
                </p>
              </div>

              <div className="p-4 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
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
              <ul className="space-y-2">
                <li className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="font-bold text-white block">1. Дивіться на вагу металу, а не лише на дизайн</span>
                  <span>Якщо каблучка важить лише 1.2 грами, але коштує 15 000 грн, ви сплачуєте понад 12 000 грн за роботу й маркетинг.</span>
                </li>
                <li className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="font-bold text-white block">2. Просіть знижку від 15% до 35%</span>
                  <span>Мас-маркет ювелірні мережі мають базову націнку 150-250%, тому майже завжди готові надати персональну знижку.</span>
                </li>
                <li className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/60">
                  <span className="font-bold text-white block">3. Перевіряйте наявність державного клейма та бирки</span>
                  <span>Кожна прикраса повинна мати пробірне клеймо та ниткову бирку з пломбою, де вказана вага, метал і характеристики вставок.</span>
                </li>
              </ul>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
          >
            Зрозуміло!
          </button>
        </div>

      </div>
    </div>
  );
};
