import {
  CoatingOption,
  EngravingOption,
  LaborComplexityOption,
  MetalOption,
  MetalRates,
  MetalType,
  SurfaceFinishOption,
} from '../types';

export const DEFAULT_METAL_RATES: MetalRates = {
  updatedAt: new Date().toISOString(),
  source: 'Офіційні котирування НБУ (bank.gov.ua) та LBMA',
  officialSourceUrl: 'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json',
  currencies: {
    USD: 1,
    UAH: 41.5,
    EUR: 0.92,
  },
  pureMetalRatesUsd: {
    gold: 88.5,      // ~$2750/oz (88.5 $/g)
    silver: 1.05,    // ~$32.5/oz (1.05 $/g)
    platinum: 31.8,  // ~$990/oz (31.8 $/g)
    palladium: 34.2, // ~$1060/oz (34.2 $/g)
  },
  coatingRatesUsd: {
    none: { base: 0, perGram: 0 },
    rhodium_white: { base: 3.5, perGram: 0.8 },
    rhodium_black: { base: 4.5, perGram: 1.0 },
    gilding: { base: 3.0, perGram: 0.9 },
    blackening: { base: 2.0, perGram: 0.4 },
    combined: { base: 6.0, perGram: 1.4 },
  },
  finishRatesUsd: {
    polished: { base: 0, perGram: 0 },
    matte_sandblast: { base: 2.0, perGram: 0.5 },
    satin_brushed: { base: 1.5, perGram: 0.4 },
    diamond_cut: { base: 3.0, perGram: 0.8 },
    combined_texture: { base: 3.5, perGram: 0.9 },
  },
  engravingRatesUsd: {
    none: { base: 0 },
    laser: { base: 8.5 }, // ~$8.50 USD (~350 UAH)
    hand: { base: 22.0 }, // ~$22.00 USD (~900 UAH)
  },
};

export const COATING_OPTIONS: CoatingOption[] = [
  {
    id: 'none',
    nameUk: 'Без покриття',
    descriptionUk: 'Натуральний колір металу сплаву без гальванічного покриття',
    baseRateUsd: 0,
    rateUsdPerGram: 0,
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  {
    id: 'rhodium_white',
    nameUk: 'Білий родій',
    descriptionUk: 'Захисне дзеркально-біле покриття рідкісним металом платинової групи',
    baseRateUsd: 3.5,
    rateUsdPerGram: 0.8,
    badgeColor: 'bg-slate-100 text-slate-900 border-slate-300',
  },
  {
    id: 'rhodium_black',
    nameUk: 'Чорний родій',
    descriptionUk: 'Преміальне графітово-чорне покриття для стильного контрасту',
    baseRateUsd: 4.5,
    rateUsdPerGram: 1.0,
    badgeColor: 'bg-zinc-900 text-zinc-100 border-zinc-700',
  },
  {
    id: 'gilding',
    nameUk: 'Позолота',
    descriptionUk: 'Гальванічне нанесення шару золота 750/999 проби',
    baseRateUsd: 3.0,
    rateUsdPerGram: 0.9,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    id: 'blackening',
    nameUk: 'Чорніння (Оксидування)',
    descriptionUk: 'Зачорнення рельєфу та заглиблень для контрастного візерунку',
    baseRateUsd: 2.0,
    rateUsdPerGram: 0.4,
    badgeColor: 'bg-slate-950 text-slate-300 border-slate-800',
  },
  {
    id: 'combined',
    nameUk: 'Комбіноване покриття',
    descriptionUk: 'Поєднання двох покриттів (наприклад, білий родій + позолота або чорніння)',
    baseRateUsd: 6.0,
    rateUsdPerGram: 1.4,
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700/60',
  },
];

export const SURFACE_FINISH_OPTIONS: SurfaceFinishOption[] = [
  {
    id: 'polished',
    nameUk: 'Полірована (Глянцева)',
    descriptionUk: 'Гладке дзеркальне полірування поверхні виробу',
    baseRateUsd: 0,
    rateUsdPerGram: 0,
    badgeColor: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  {
    id: 'matte_sandblast',
    nameUk: 'Матова (Піскоструйна)',
    descriptionUk: 'Оксамитова безбликова поверхня після струминної обробки мікрокульками',
    baseRateUsd: 2.0,
    rateUsdPerGram: 0.5,
    badgeColor: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  {
    id: 'satin_brushed',
    nameUk: 'Сатинована (Шовкова)',
    descriptionUk: 'Тонка шовковиста направлена текстура поверхні',
    baseRateUsd: 1.5,
    rateUsdPerGram: 0.4,
    badgeColor: 'bg-slate-800 text-slate-200 border-slate-700',
  },
  {
    id: 'diamond_cut',
    nameUk: 'Алмазна грань',
    descriptionUk: 'Нанесення сліпучо блискучих граней алмазним різаком',
    baseRateUsd: 3.0,
    rateUsdPerGram: 0.8,
    badgeColor: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'combined_texture',
    nameUk: 'Комбінована фактура',
    descriptionUk: 'Контрастні поєднання полірованих і матованих ділянок',
    baseRateUsd: 3.5,
    rateUsdPerGram: 0.9,
    badgeColor: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
];

export const ENGRAVING_OPTIONS: EngravingOption[] = [
  {
    id: 'none',
    nameUk: 'Без гравіювання',
    descriptionUk: 'Без нанесення написів, дат чи символів на виріб',
    baseRateUsd: 0,
    badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
  },
  {
    id: 'laser',
    nameUk: 'Лазерне гравіювання',
    descriptionUk: 'Високоточне чітке нанесення тексту, дат або візерунків лазерним променем',
    baseRateUsd: 8.5,
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    id: 'hand',
    nameUk: 'Ручне гравіювання',
    descriptionUk: 'Традиційна майстерна робота ювеліра-гравера штихелем з художнім рельєфом',
    baseRateUsd: 22.0,
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
];

export const METAL_OPTIONS: MetalOption[] = [
  {
    id: 'gold',
    nameUk: 'Золото',
    purities: [375, 585, 750, 900, 916, 999],
    defaultPurity: 585,
    colorClass: 'text-amber-500 border-amber-400 bg-amber-50/50',
    bgGradient: 'from-amber-500 to-yellow-600',
  },
  {
    id: 'silver',
    nameUk: 'Срібло',
    purities: [800, 875, 925, 960, 999],
    defaultPurity: 925,
    colorClass: 'text-slate-400 border-slate-300 bg-slate-50/50',
    bgGradient: 'from-slate-400 to-slate-600',
  },
  {
    id: 'platinum',
    nameUk: 'Платина',
    purities: [850, 900, 950, 999],
    defaultPurity: 950,
    colorClass: 'text-cyan-600 border-cyan-400 bg-cyan-50/50',
    bgGradient: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'palladium',
    nameUk: 'Паладій',
    purities: [500, 850, 950, 999],
    defaultPurity: 950,
    colorClass: 'text-zinc-500 border-zinc-400 bg-zinc-50/50',
    bgGradient: 'from-zinc-500 to-stone-700',
  },
];

export const LABOR_COMPLEXITY_OPTIONS: LaborComplexityOption[] = [
  {
    id: 'stamping',
    titleUk: 'Просте штампування / Легка робота',
    descriptionUk: 'Прості гладкі обручки, базові сережки-пусети без вишуканого декору чи складних деталей',
    laborRateUsdPerGram: 3.5,
    typicalWastagePercent: 5,
  },
  {
    id: 'standard_casting',
    titleUk: 'Стандартне литво з закріпкою',
    descriptionUk: 'Класичні каблучки з камінням, ажурні підвіски, ланцюжки машинного плетіння',
    laborRateUsdPerGram: 7.0,
    typicalWastagePercent: 8,
  },
  {
    id: 'complex_handcraft',
    titleUk: 'Складна ручна робота',
    descriptionUk: 'Ручна закріпка багатьох дрібних каменів (паве), складні замок та плетіння, філігрань',
    laborRateUsdPerGram: 14.0,
    typicalWastagePercent: 10,
  },
  {
    id: 'exclusive_designer',
    titleUk: 'Ексклюзивний дизайнерський ювелірний витвір',
    descriptionUk: 'Авторський дизайн, мікромоделювання, висока ювелірна майстерність (Haute Joaillerie)',
    laborRateUsdPerGram: 28.0,
    typicalWastagePercent: 12,
  },
];

export function convertCurrency(amountUsd: number, targetCurrency: 'UAH' | 'USD' | 'EUR', rates: MetalRates): number {
  if (targetCurrency === 'USD') return amountUsd;
  if (targetCurrency === 'UAH') return amountUsd * rates.currencies.UAH;
  if (targetCurrency === 'EUR') return amountUsd * rates.currencies.EUR;
  return amountUsd;
}

export function convertToUsd(amountInCurrency: number, sourceCurrency: 'UAH' | 'USD' | 'EUR', rates: MetalRates): number {
  if (sourceCurrency === 'USD') return amountInCurrency;
  if (sourceCurrency === 'UAH') return amountInCurrency / rates.currencies.UAH;
  if (sourceCurrency === 'EUR') return amountInCurrency / rates.currencies.EUR;
  return amountInCurrency;
}

export function formatMoney(amount: number, currency: 'UAH' | 'USD' | 'EUR'): string {
  const rounded = Math.round(amount * 100) / 100;
  if (currency === 'UAH') {
    return `${rounded.toLocaleString('uk-UA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ₴`;
  }
  if (currency === 'USD') {
    return `$${rounded.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `€${rounded.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
