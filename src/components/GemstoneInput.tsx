import React from 'react';
import { Plus, Trash2, Gem, Info } from 'lucide-react';
import { GemOrigin, GemstoneItem, GemType } from '../types';
import { GEM_OPTIONS_META, calculateGemstoneUsdValue } from '../data/gemstoneValuation';

interface GemstoneInputProps {
  gemstones: GemstoneItem[];
  onChange: (gems: GemstoneItem[]) => void;
}

export const GemstoneInput: React.FC<GemstoneInputProps> = ({ gemstones, onChange }) => {
  const handleAddGem = () => {
    const newGem: GemstoneItem = {
      id: 'gem-' + Date.now(),
      type: 'diamond',
      nameUk: 'Камінь вставка',
      count: 1,
      caratsPerStone: 0.1,
      origin: 'natural',
      colorQuality: 'G / 4',
      clarityQuality: 'VS2 / 4',
    };
    onChange([...gemstones, newGem]);
  };

  const handleRemoveGem = (id: string) => {
    onChange(gemstones.filter((g) => g.id !== id));
  };

  const handleUpdateGem = (id: string, fields: Partial<GemstoneItem>) => {
    onChange(
      gemstones.map((g) => {
        if (g.id !== id) return g;
        const updated = { ...g, ...fields };
        // Auto-set title if type changed
        if (fields.type && fields.type !== g.type) {
          const meta = GEM_OPTIONS_META.find((m) => m.type === fields.type);
          if (meta) {
            updated.nameUk = meta.nameUk.split(' ')[0];
            updated.origin = meta.defaultOrigin;
          }
        }
        return updated;
      })
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-200 flex items-center space-x-1.5">
          <Gem className="w-4 h-4 text-cyan-400" />
          <span>Каміння та вставки ({gemstones.length})</span>
        </label>
        <button
          type="button"
          onClick={handleAddGem}
          className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-medium transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Додати камінь</span>
        </button>
      </div>

      {gemstones.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 text-center text-xs text-slate-400">
          У виробі немає вставок каміння (чистий метал без діамантів чи фіанітів)
        </div>
      ) : (
        <div className="space-y-3">
          {gemstones.map((gem, index) => {
            const estimatedUsd = calculateGemstoneUsdValue(gem);
            return (
              <div
                key={gem.id}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-300">
                    #{index + 1} Вставка
                  </span>
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2 py-0.5 rounded text-[11px]">
                      ~ ${estimatedUsd.toLocaleString('en-US')} USD
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGem(gem.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Видалити вставку"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {/* Type */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Тип каменя</label>
                    <select
                      value={gem.type}
                      onChange={(e) => handleUpdateGem(gem.id, { type: e.target.value as GemType })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      {GEM_OPTIONS_META.map((meta) => (
                        <option key={meta.type} value={meta.type}>
                          {meta.nameUk}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Origin */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Походження</label>
                    <select
                      value={gem.origin}
                      onChange={(e) => handleUpdateGem(gem.id, { origin: e.target.value as GemOrigin })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                    >
                      <option value="natural">🍃 Натуральне (Природний)</option>
                      <option value="lab">🧪 Лабораторне (Lab-Grown)</option>
                      <option value="synthetic">✨ Штучне / Фіаніт</option>
                    </select>
                  </div>

                  {/* Count */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">Кількість (шт)</label>
                    <input
                      type="number"
                      min="1"
                      value={gem.count}
                      onChange={(e) =>
                        handleUpdateGem(gem.id, { count: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Carats per stone */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-0.5">
                      Вага 1 каменя (ct / карат)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.001"
                      value={gem.caratsPerStone}
                      onChange={(e) =>
                        handleUpdateGem(gem.id, {
                          caratsPerStone: Math.max(0.001, parseFloat(e.target.value) || 0.01),
                        })
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Additional characteristics: Color & Clarity */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Колір (Color)</label>
                    <input
                      type="text"
                      placeholder="напр. D, G, 4"
                      value={gem.colorQuality || ''}
                      onChange={(e) => handleUpdateGem(gem.id, { colorQuality: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Чистота (Clarity)</label>
                    <input
                      type="text"
                      placeholder="напр. VVS2, VS1, 3/4"
                      value={gem.clarityQuality || ''}
                      onChange={(e) => handleUpdateGem(gem.id, { clarityQuality: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center pt-3 text-[10px] text-slate-400">
                    <Info className="w-3 h-3 text-cyan-400 mr-1 shrink-0" />
                    <span>Всього: {(gem.caratsPerStone * gem.count).toFixed(3)} ct</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
