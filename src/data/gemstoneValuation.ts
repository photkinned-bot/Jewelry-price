import { GemstoneItem, GemType } from '../types';

export interface GemOptionMeta {
  type: GemType;
  nameUk: string;
  defaultOrigin: 'natural' | 'lab' | 'synthetic';
  basePriceUsdPerCaratNatural: number; // приблизна базова ціна за 1 карат (для ~0.3-0.5ct)
  basePriceUsdPerCaratLab: number;
}

export const GEM_OPTIONS_META: GemOptionMeta[] = [
  {
    type: 'diamond',
    nameUk: 'Діамант (Diamond)',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 2500, // природний діамант ~0.5ct середніх характеристик
    basePriceUsdPerCaratLab: 250,      // лабораторний діамант (роститься за $100-$300/ct)
  },
  {
    type: 'lab_diamond',
    nameUk: 'Лабораторний діамант (Lab-grown)',
    defaultOrigin: 'lab',
    basePriceUsdPerCaratNatural: 2500,
    basePriceUsdPerCaratLab: 200,
  },
  {
    type: 'emerald',
    nameUk: 'Смарагд (Emerald)',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 1200,
    basePriceUsdPerCaratLab: 120,
  },
  {
    type: 'ruby',
    nameUk: 'Рубін (Ruby)',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 1500,
    basePriceUsdPerCaratLab: 100,
  },
  {
    type: 'sapphire',
    nameUk: 'Сапфір (Sapphire)',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 900,
    basePriceUsdPerCaratLab: 80,
  },
  {
    type: 'cubic_zirconia',
    nameUk: 'Фіаніт / Муасаніт',
    defaultOrigin: 'synthetic',
    basePriceUsdPerCaratNatural: 2, // фіаніти фактично коштують копійки
    basePriceUsdPerCaratLab: 15,    // муасаніти ~ $15-30/ct
  },
  {
    type: 'topaz',
    nameUk: 'Топаз / Гранат / Аметист',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 35,
    basePriceUsdPerCaratLab: 10,
  },
  {
    type: 'pearl',
    nameUk: 'Перли (Pearls)',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 50,
    basePriceUsdPerCaratLab: 15,
  },
  {
    type: 'other',
    nameUk: 'Інше каміння / Напівдорогоцінне',
    defaultOrigin: 'natural',
    basePriceUsdPerCaratNatural: 20,
    basePriceUsdPerCaratLab: 5,
  },
];

/**
 * Оцінює ринкову вартість каменя з урахуванням каратності, походження та параметрів
 */
export function calculateGemstoneUsdValue(gem: GemstoneItem): number {
  if (gem.customPricePerCaratUsd && gem.customPricePerCaratUsd > 0) {
    return gem.customPricePerCaratUsd * gem.caratsPerStone * gem.count;
  }

  const meta = GEM_OPTIONS_META.find((m) => m.type === gem.type) || GEM_OPTIONS_META[0];
  const isNatural = gem.origin === 'natural';
  
  // Базова ціна за 1 карат залежно від походження
  let basePricePerCarat = isNatural ? meta.basePriceUsdPerCaratNatural : meta.basePriceUsdPerCaratLab;

  // Нелінійний прогресивний коефіцієнт ціни залежно від розміру каменя (для діамантів та коштовних каменів)
  // Великий камінь (наприклад 1ct або 2ct) коштує набагато дорожче за карат ніж дрібна крошка
  let caratMultiplier = 1;
  const singleCarat = gem.caratsPerStone;

  if (gem.type === 'diamond' || gem.type === 'emerald' || gem.type === 'ruby' || gem.type === 'sapphire') {
    if (singleCarat <= 0.05) {
      caratMultiplier = 0.25; // дрібна діамантова крошка (меле) ~ $300-$500/ct
    } else if (singleCarat <= 0.15) {
      caratMultiplier = 0.45;
    } else if (singleCarat <= 0.3) {
      caratMultiplier = 0.75;
    } else if (singleCarat <= 0.5) {
      caratMultiplier = 1.0;
    } else if (singleCarat <= 0.7) {
      caratMultiplier = 1.4;
    } else if (singleCarat <= 1.0) {
      caratMultiplier = 2.2;
    } else if (singleCarat <= 1.5) {
      caratMultiplier = 3.5;
    } else if (singleCarat <= 2.0) {
      caratMultiplier = 5.0;
    } else {
      caratMultiplier = 7.5;
    }
  }

  // Коригування за чистотою/кольором якщо вказані у форматі (наприклад VVS1 / D)
  let clarityColorMultiplier = 1.0;
  if (gem.clarityQuality) {
    const q = gem.clarityQuality.toUpperCase();
    if (q.includes('IF') || q.includes('FL') || q.includes('1/')) clarityColorMultiplier *= 1.35;
    else if (q.includes('VVS') || q.includes('2/')) clarityColorMultiplier *= 1.15;
    else if (q.includes('VS') || q.includes('3/')) clarityColorMultiplier *= 1.0;
    else if (q.includes('SI') || q.includes('5/')) clarityColorMultiplier *= 0.75;
    else if (q.includes('I') || q.includes('P') || q.includes('7/')) clarityColorMultiplier *= 0.5;
  }

  const finalPricePerCarat = basePricePerCarat * caratMultiplier * clarityColorMultiplier;
  const totalCarats = gem.caratsPerStone * gem.count;
  
  return Math.max(0.1, Math.round(totalCarats * finalPricePerCarat * 10) / 10);
}
