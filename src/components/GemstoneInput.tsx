import React from 'react';
import { Plus, Trash2, Gem, Info, RefreshCw, DollarSign } from 'lucide-react';
import { GemOrigin, GemstoneItem, GemType } from '../types';
import { GEM_OPTIONS_META, calculateGemstoneUsdValue } from '../data/gemstoneValuation';
import { InfoHelper } from './InfoHelper';

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
            if (fields.type !== 'other') {
              updated.customName = undefined;
            }
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
          <InfoHelper helpKey="gemstonesSection" />
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
            const isCustomPrice = gem.customTotalPriceUsd !== undefined && gem.customTotalPriceUsd >= 0;
            const displayName = gem.type === 'other' && gem.customName ? gem.customName : gem.nameUk;

            return (
              <div
                key={gem.id}
                className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 text-xs relative group"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <span>#{index + 1} {displayName || 'Вставка'}</span>
                    {isCustomPrice && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-sans">
                        Ручна ціна
                      </span>
                    )}
                  </span>
                  
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/50 px-2.5 py-0.5 rounded text-[11px] flex items-center gap-1">
                      <span>~ ${estimatedUsd.toLocaleString('en-US')} USD</span>
                    </span>

                    {isCustomPrice && (
                      <button
                        type="button"
                        onClick={() => handleUpdateGem(gem.id, { customTotalPriceUsd: undefined })}
                        className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                        title="Скинути до авто-розрахунку"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}

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
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] text-slate-400">Тип каменя</label>
                      <InfoHelper helpKey="gemstoneType" />
                    </div>
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

                  {/* Custom Name field if 'other' is selected */}
                  {gem.type === 'other' ? (
                    <div>
                      <label className="block text-[11px] text-amber-300 mb-0.5 font-medium">
                        Власна назва каменя
                      </label>
                      <input
                        type="text"
                        placeholder="напр. Танзаніт, Опал..."
                        value={gem.customName || ''}
                        onChange={(e) => handleUpdateGem(gem.id, { customName: e.target.value })}
                        className="w-full bg-slate-800 border border-amber-500/50 rounded-lg px-2.5 py-1.5 text-amber-100 focus:outline-none focus:border-amber-400 font-medium"
                      />
                    </div>
                  ) : (
                    /* Origin */
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="block text-[11px] text-slate-400">Походження</label>
                        <InfoHelper helpKey="gemstoneOrigin" />
                      </div>
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
                  )}

                  {/* Count */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] text-slate-400">Кількість (шт)</label>
                      <InfoHelper helpKey="gemstoneCount" />
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={gem.count}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        handleUpdateGem(gem.id, { count: isNaN(val) || val < 1 ? 1 : val });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Carats per stone */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[11px] text-slate-400">
                        Вага 1 каменя (ct)
                      </label>
                      <InfoHelper helpKey="gemstoneCarat" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.001"
                      value={gem.caratsPerStone}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        handleUpdateGem(gem.id, { caratsPerStone: isNaN(val) || val <= 0 ? 0.01 : val });
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Additional characteristics & Manual Price Override */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-slate-800/60">
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] text-slate-400">Колір (Color)</label>
                      <InfoHelper helpKey="gemstone4Cs" />
                    </div>
                    <input
                      type="text"
                      placeholder="напр. D, G, 4"
                      value={gem.colorQuality || ''}
                      onChange={(e) => handleUpdateGem(gem.id, { colorQuality: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] text-slate-400">Чистота (Clarity)</label>
                      <InfoHelper helpKey="gemstone4Cs" />
                    </div>
                    <input
                      type="text"
                      placeholder="напр. VVS2, VS1, 3/4"
                      value={gem.clarityQuality || ''}
                      onChange={(e) => handleUpdateGem(gem.id, { clarityQuality: e.target.value })}
                      className="w-full bg-slate-800/80 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Manual price override */}
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="block text-[10px] text-amber-300 font-medium flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-amber-400" />
                        <span>Ручна ціна ($ USD)</span>
                      </label>
                      <InfoHelper helpKey="gemstoneCustomPrice" />
                    </div>
                    <input
                      type="number"
                      placeholder={`Авто: $${estimatedUsd}`}
                      value={gem.customTotalPriceUsd !== undefined ? gem.customTotalPriceUsd : ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleUpdateGem(gem.id, {
                          customTotalPriceUsd: val === '' ? undefined : Math.max(0, parseFloat(val) || 0),
                        });
                      }}
                      className="w-full bg-slate-800/90 border border-amber-500/40 rounded px-2 py-1 text-[11px] text-amber-200 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                  <div className="flex items-center space-x-1">
                    <Info className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Загальна вага каміння: {(gem.caratsPerStone * gem.count).toFixed(3)} ct</span>
                  </div>
                  {gem.type === 'other' && (
                    <div className="flex items-center space-x-1">
                      <label className="text-[10px] text-slate-400 mr-1">Походження:</label>
                      <select
                        value={gem.origin}
                        onChange={(e) => handleUpdateGem(gem.id, { origin: e.target.value as GemOrigin })}
                        className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-200"
                      >
                        <option value="natural">🍃 Натуральне</option>
                        <option value="lab">🧪 Лабораторне</option>
                        <option value="synthetic">✨ Штучне</option>
                      </select>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
