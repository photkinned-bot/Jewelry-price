import React from 'react';
import {
  Sparkles,
  Scale,
  DollarSign,
  Tag,
  Wrench,
  Percent,
  Layers,
  Award,
  BookOpen,
} from 'lucide-react';
import { CalculationInputs, Currency, LaborComplexity, MetalType } from '../types';
import { LABOR_COMPLEXITY_OPTIONS, METAL_OPTIONS } from '../data/metalRates';
import { GemstoneInput } from './GemstoneInput';
import { SAMPLE_JEWELRY_ITEMS } from '../data/sampleItems';

interface JewelryFormProps {
  inputs: CalculationInputs;
  onChange: (inputs: CalculationInputs) => void;
  currency: Currency;
  onOpenScanner: () => void;
}

export const JewelryForm: React.FC<JewelryFormProps> = ({
  inputs,
  onChange,
  currency,
  onOpenScanner,
}) => {
  const selectedMetalMeta = METAL_OPTIONS.find((m) => m.id === inputs.metalType) || METAL_OPTIONS[0];

  const handleFieldChange = (fields: Partial<CalculationInputs>) => {
    onChange({ ...inputs, ...fields });
  };

  const handleMetalTypeChange = (metalType: MetalType) => {
    const meta = METAL_OPTIONS.find((m) => m.id === metalType) || METAL_OPTIONS[0];
    onChange({
      ...inputs,
      metalType,
      purity: meta.defaultPurity,
    });
  };

  const handleLoadSample = (sample: CalculationInputs) => {
    onChange({
      ...sample,
      id: 'calc-' + Date.now(),
      currency, // keep active user currency
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 text-slate-100 shadow-xl space-y-6">
      
      {/* Top Title & Presets */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <Scale className="w-5 h-5 text-amber-400" />
            <span>Параметри Ювелірного Виробу</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Введіть характеристики з ценника або бирки для детального розрахунку
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenScanner}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-medium text-xs transition-colors self-start sm:self-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Сканувати Бирку з Фото</span>
        </button>
      </div>

      {/* Preset Quick Load Buttons */}
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Швидкі шаблони прикрас для тесту:
        </label>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_JEWELRY_ITEMS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleLoadSample(sample)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700/90 border border-slate-700/80 text-xs text-slate-300 hover:text-white transition-all flex items-center space-x-1"
            >
              <Tag className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="truncate max-w-[160px]">{sample.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Basic info: Title, Type, Store/Brand */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Назва прикраси
          </label>
          <input
            type="text"
            placeholder="напр. Каблучка з діамантом"
            value={inputs.title}
            onChange={(e) => handleFieldChange({ title: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Тип виробу
          </label>
          <select
            value={inputs.itemType}
            onChange={(e) => handleFieldChange({ itemType: e.target.value as any })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          >
            <option value="ring">💍 Каблучка / Перстень</option>
            <option value="necklace">📿 Ланцюжок / Кольє</option>
            <option value="earrings">✨ Сережки</option>
            <option value="bracelet">⌚ Браслет</option>
            <option value="pendant">🔮 Кулон / Підвіска</option>
            <option value="other">💎 Інший виріб</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Бренд або магазин (опціонально)
          </label>
          <input
            type="text"
            placeholder="напр. Cartier, КЮЗ, Укрзолото"
            value={inputs.brandName || ''}
            onChange={(e) => handleFieldChange({ brandName: e.target.value })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>
      </div>

      {/* Metal selection & Purity */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-300">
          Вибір Дрогоцінного Металу
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {METAL_OPTIONS.map((meta) => {
            const isSelected = inputs.metalType === meta.id;
            return (
              <button
                key={meta.id}
                type="button"
                onClick={() => handleMetalTypeChange(meta.id)}
                className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between ${
                  isSelected
                    ? `${meta.colorClass} ring-2 ring-amber-400/50 shadow-md`
                    : 'bg-slate-800/60 border-slate-700/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <div className="font-bold text-sm">{meta.nameUk}</div>
                <div className="text-[11px] opacity-80 mt-1">
                  {meta.defaultPurity} проба
                </div>
              </button>
            );
          })}
        </div>

        {/* Metal Weight & Purity Select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Проба металу
            </label>
            <select
              value={inputs.purity}
              onChange={(e) => handleFieldChange({ purity: parseInt(e.target.value) || 585 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-amber-400"
            >
              {selectedMetalMeta.purities.map((p) => (
                <option key={p} value={p}>
                  {p} проба ({p === 999 ? 'Чистий 100% метал' : `${(p / 10).toFixed(1)}% чистоти`})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Загальна вага виробу (в грамах)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0.1"
                placeholder="4.50"
                value={inputs.metalWeightGrams || ''}
                onChange={(e) =>
                  handleFieldChange({ metalWeightGrams: Math.max(0, parseFloat(e.target.value) || 0) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-sans">
                грам (г)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gemstones Section */}
      <div className="pt-2 border-t border-slate-800">
        <GemstoneInput
          gemstones={inputs.gemstones || []}
          onChange={(gemstones) => handleFieldChange({ gemstones })}
        />
      </div>

      {/* Labor Complexity & Loss / Wastage */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <label className="block text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
          <Wrench className="w-4 h-4 text-amber-400" />
          <span>Складність Ювелірної Роботи та Втрати (Угар)</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Рівень складності виготовлення
            </label>
            <select
              value={inputs.laborComplexity}
              onChange={(e) => {
                const laborComplexity = e.target.value as LaborComplexity;
                const opt = LABOR_COMPLEXITY_OPTIONS.find((o) => o.id === laborComplexity);
                handleFieldChange({
                  laborComplexity,
                  wastagePercent: opt ? opt.typicalWastagePercent : inputs.wastagePercent,
                });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
            >
              {LABOR_COMPLEXITY_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.titleUk}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Відсоток втрат металу при литті (Угар) %
            </label>
            <div className="relative">
              <input
                type="number"
                step="1"
                min="0"
                max="30"
                value={inputs.wastagePercent}
                onChange={(e) =>
                  handleFieldChange({ wastagePercent: Math.max(0, parseInt(e.target.value) || 0) })
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              />
              <span className="absolute right-3 top-2 text-xs text-slate-400">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Store Retail Price & Currency */}
      <div className="pt-2 border-t border-slate-800 p-4 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-3">
        <label className="block text-xs font-bold text-amber-300 flex items-center space-x-1.5">
          <DollarSign className="w-4 h-4 text-amber-400" />
          <span>Ціна Виробу в Магазині (Чек / Цінник)</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="number"
              step="10"
              min="0"
              placeholder="введіть ціну в магазині"
              value={inputs.retailPrice || ''}
              onChange={(e) =>
                handleFieldChange({ retailPrice: Math.max(0, parseFloat(e.target.value) || 0) })
              }
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-2.5 text-lg font-extrabold text-amber-300 focus:outline-none focus:border-amber-400 shadow-inner"
            />
          </div>

          <div>
            <select
              value={inputs.currency}
              onChange={(e) => handleFieldChange({ currency: e.target.value as Currency })}
              className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-3 text-sm font-bold text-slate-100 focus:outline-none focus:border-amber-400"
            >
              <option value="UAH">₴ Гривня (UAH)</option>
              <option value="USD">$ Долар (USD)</option>
              <option value="EUR">€ Євро (EUR)</option>
            </select>
          </div>
        </div>
      </div>

    </div>
  );
};
