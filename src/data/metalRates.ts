import { LaborComplexityOption, MetalOption, MetalRates, MetalType } from '../types';

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
};

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
