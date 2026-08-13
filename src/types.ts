export type MetalType = 'gold' | 'silver' | 'platinum' | 'palladium';

export interface MetalOption {
  id: MetalType;
  nameUk: string;
  purities: number[];
  defaultPurity: number;
  colorClass: string;
  bgGradient: string;
}

export type GemType = 
  | 'diamond'
  | 'lab_diamond'
  | 'emerald'
  | 'ruby'
  | 'sapphire'
  | 'cubic_zirconia' // Фіаніт / Муасаніт
  | 'topaz'
  | 'pearl'
  | 'other';

export type GemOrigin = 'natural' | 'lab' | 'synthetic';

export interface GemstoneItem {
  id: string;
  type: GemType;
  nameUk: string;
  customName?: string; // Власна назва для типу "Інший камінь"
  count: number;
  caratsPerStone: number; // або вага в каратах 1 штуки
  origin: GemOrigin;
  colorQuality?: string; // наприклад "D-F" або "4"
  clarityQuality?: string; // наприклад "VVS" або "3"
  customPricePerCaratUsd?: number;
  customTotalPriceUsd?: number; // Ручна ціна за каміння ($ USD)
}

export type LaborComplexity = 'stamping' | 'standard_casting' | 'complex_handcraft' | 'exclusive_designer';

export interface LaborComplexityOption {
  id: LaborComplexity;
  titleUk: string;
  descriptionUk: string;
  laborRateUsdPerGram: number; // вартість роботи за грам
  typicalWastagePercent: number; // % угару (втрат металу)
}

export type CoatingType = 
  | 'none'           // Без покриття
  | 'rhodium_white'  // Білий родій
  | 'rhodium_black'  // Чорний родій
  | 'gilding'        // Позолота
  | 'blackening'     // Чорніння (Оксидування)
  | 'combined';      // Комбіноване покриття

export interface CoatingOption {
  id: CoatingType;
  nameUk: string;
  descriptionUk: string;
  baseRateUsd: number;    // Фіксована базова вартість обробки
  rateUsdPerGram: number; // Вартість за грам виробу
  badgeColor: string;
}

export type SurfaceFinishType = 
  | 'polished'        // Полірована (Глянцева)
  | 'matte_sandblast' // Матова (Піскоструйна)
  | 'satin_brushed'   // Сатинована (Матова щіткою)
  | 'diamond_cut'     // Алмазна грань
  | 'combined_texture';// Комбінована фактура

export interface SurfaceFinishOption {
  id: SurfaceFinishType;
  nameUk: string;
  descriptionUk: string;
  baseRateUsd: number;
  rateUsdPerGram: number;
  badgeColor: string;
}

export type Currency = 'UAH' | 'USD' | 'EUR';

export interface MetalRates {
  updatedAt: string;
  source?: string;
  officialSourceUrl?: string;
  currencies: {
    USD: number;
    UAH: number;
    EUR: number;
  };
  pureMetalRatesUsd: {
    gold: number;      // 999 gold per gram USD
    silver: number;    // 999 silver per gram USD
    platinum: number;  // 999 platinum per gram USD
    palladium: number; // 999 palladium per gram USD
  };
  coatingRatesUsd?: Record<CoatingType, { base: number; perGram: number }>;
  finishRatesUsd?: Record<SurfaceFinishType, { base: number; perGram: number }>;
}

export interface CalculationInputs {
  id?: string;
  title: string;
  itemType: 'ring' | 'necklace' | 'earrings' | 'bracelet' | 'pendant' | 'other';
  brandName?: string;
  storeName?: string;
  metalType: MetalType;
  purity: number; // 585, 750, 925, etc.
  metalWeightGrams: number;
  wastagePercent: number; // угар, наприклад 8%
  laborComplexity: LaborComplexity;
  customLaborCostUsd?: number;
  coatingType?: CoatingType; // тип покриття (родій, позолота, чорніння)
  customCoatingCostUsd?: number; // кастомна вартість покриття
  surfaceFinish?: SurfaceFinishType; // характер поверхні (полірована, матова піскоструй)
  customFinishCostUsd?: number; // кастомна вартість обробки поверхні
  gemstones: GemstoneItem[];
  hallmarkCostUsd: number; // клеймування та випробовування
  retailPrice: number; // Ціна в магазині
  currency: Currency;
  notes?: string;
  photoUrl?: string;
}

export interface CalculationResult {
  pureMetalWeightGrams: number; // вага чистого 999 металу
  pureMetalPriceUsd: number;
  alloyMetalPriceUsd: number; // вартість сировини металу
  gemstonesTotalUsd: number;
  rawMaterialsTotalUsd: number; // Метал + каміння
  wastageMetalCostUsd: number; // вартість втраченого металу
  laborCostUsd: number; // вартість роботи
  coatingCostUsd: number; // вартість покриття (родій/позолота/чорніння)
  finishCostUsd: number; // вартість обробки поверхні (поліровка/піскоструй)
  finishingAndCoatingTotalUsd: number; // Сумарне оздоблення
  hallmarkCostUsd: number; // клеймування
  productionCostUsd: number; // Загальна собівартість виготовлення (матеріали + втрати + робота + покриття/поверхня)
  retailPriceUsd: number; // Ціна магазину в USD
  markupAmountUsd: number; // Націнка магазину
  markupPercent: number; // % націнки
  markupRatio: number; // Коефіцієнт (наприклад 2.5x)
  assetPreservationRatioPercent: number; // Скільки % від ціни магазину складає чистий брухт + каміння
  pawnshopEstimateUsd: number; // Орієнтовна викупна ціна ломбарду (75-85% від чистого металу)
  
  // Конвертовані значення в обрану валюту
  displayCurrency: Currency;
  rawMaterialsTotal: number;
  productionCostTotal: number;
  laborAndLossesTotal: number;
  coatingCostTotal: number;
  finishCostTotal: number;
  finishingAndCoatingTotal: number;
  retailPrice: number;
  markupAmount: number;
  pawnshopEstimate: number;
  
  // Ризик-статус націнки
  markupCategory: 'wholesale' | 'fair' | 'mass_market' | 'luxury_overpriced';
}

export interface AiAdviceResult {
  summary: string;
  investmentRating: number; // 1 to 10
  investmentExplanation: string;
  pros: string[];
  cons: string[];
  advice: string;
  recommendedDiscountPercent?: number;
}

export interface SavedCalculation {
  id: string;
  createdAt: string;
  inputs: CalculationInputs;
  result: CalculationResult;
  aiAdvice?: AiAdviceResult;
}
