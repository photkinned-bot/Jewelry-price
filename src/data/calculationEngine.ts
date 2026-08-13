import { CalculationInputs, CalculationResult, MetalRates } from '../types';

import { calculateGemstoneUsdValue } from './gemstoneValuation';
import { convertCurrency, convertToUsd, LABOR_COMPLEXITY_OPTIONS } from './metalRates';

export function calculateJewelryBreakdown(
  inputs: CalculationInputs,
  rates: MetalRates
): CalculationResult {
  // 1. Convert Retail Price to USD
  const retailPriceUsd = convertToUsd(inputs.retailPrice, inputs.currency, rates);

  // 2. Pure metal rate per gram (USD) for 999 purity
  const pureMetalRateUsdPerGram = rates.pureMetalRatesUsd[inputs.metalType] || rates.pureMetalRatesUsd.gold;

  // 3. Weight & pure metal content
  const totalWeightGrams = Math.max(0.1, inputs.metalWeightGrams || 0);
  const purityFraction = (inputs.purity || 585) / 1000;
  const pureMetalWeightGrams = totalWeightGrams * purityFraction;

  // Raw alloy metal cost in USD
  const pureMetalPriceUsd = pureMetalWeightGrams * pureMetalRateUsdPerGram;
  const alloyMetalPriceUsd = pureMetalPriceUsd; // Базова вартість сировинного металу

  // 4. Gemstones total value
  let gemstonesTotalUsd = 0;
  if (inputs.gemstones && inputs.gemstones.length > 0) {
    gemstonesTotalUsd = inputs.gemstones.reduce((sum, gem) => sum + calculateGemstoneUsdValue(gem), 0);
  }

  // Raw Materials Total (Метал + Каміння)
  const rawMaterialsTotalUsd = alloyMetalPriceUsd + gemstonesTotalUsd;

  // 5. Metal loss / Wastage (Угар)
  const wastagePercent = typeof inputs.wastagePercent === 'number' ? inputs.wastagePercent : 8;
  // Вартість металу, що втрачається в процесі литва/обробки
  const wastageMetalCostUsd = pureMetalPriceUsd * (wastagePercent / 100);

  // 6. Labor cost
  const laborComplexityOption =
    LABOR_COMPLEXITY_OPTIONS.find((l) => l.id === inputs.laborComplexity) || LABOR_COMPLEXITY_OPTIONS[1];
  
  let laborCostUsd = totalWeightGrams * laborComplexityOption.laborRateUsdPerGram;
  if (inputs.customLaborCostUsd && inputs.customLaborCostUsd > 0) {
    laborCostUsd = inputs.customLaborCostUsd;
  }

  // 7. Hallmark / Proba testing fee
  const hallmarkCostUsd = inputs.hallmarkCostUsd || 1.5;

  // 8. Total Production Cost (Чиста собівартість виготовлення)
  const productionCostUsd = rawMaterialsTotalUsd + wastageMetalCostUsd + laborCostUsd + hallmarkCostUsd;

  // 9. Markup calculations
  const markupAmountUsd = Math.max(0, retailPriceUsd - productionCostUsd);
  const markupPercent = productionCostUsd > 0 ? (markupAmountUsd / productionCostUsd) * 100 : 0;
  const markupRatio = productionCostUsd > 0 ? retailPriceUsd / productionCostUsd : 1;

  // 10. Asset preservation ratio (Коефіцієнт збереження капіталу в металі/камінні)
  // Який % грошей збережено в сировині при заставі або перепродажу брухту
  const assetPreservationRatioPercent =
    retailPriceUsd > 0 ? Math.min(100, (rawMaterialsTotalUsd / retailPriceUsd) * 100) : 0;

  // 11. Pawnshop estimate (Ломбард)
  // Ломбарди купують метал за ~80% від ціни чистих 999 металів і ~20-40% від задекларованого натурального каміння
  const pawnshopMetalUsd = pureMetalPriceUsd * 0.82;
  const pawnshopGemsUsd = gemstonesTotalUsd * 0.3; // каміння в ломбарді зазвичай оцінюють з величезним дисконтом
  const pawnshopEstimateUsd = pawnshopMetalUsd + pawnshopGemsUsd;

  // 12. Markup Category
  let markupCategory: 'wholesale' | 'fair' | 'mass_market' | 'luxury_overpriced' = 'fair';
  if (markupPercent <= 35) {
    markupCategory = 'wholesale';
  } else if (markupPercent <= 110) {
    markupCategory = 'fair';
  } else if (markupPercent <= 250) {
    markupCategory = 'mass_market';
  } else {
    markupCategory = 'luxury_overpriced';
  }

  // Converted display values
  const curr = inputs.currency;
  return {
    pureMetalWeightGrams: Math.round(pureMetalWeightGrams * 100) / 100,
    pureMetalPriceUsd,
    alloyMetalPriceUsd,
    gemstonesTotalUsd,
    rawMaterialsTotalUsd,
    wastageMetalCostUsd,
    laborCostUsd,
    hallmarkCostUsd,
    productionCostUsd,
    retailPriceUsd,
    markupAmountUsd,
    markupPercent: Math.round(markupPercent),
    markupRatio: Math.round(markupRatio * 10) / 10,
    assetPreservationRatioPercent: Math.round(assetPreservationRatioPercent),
    pawnshopEstimateUsd,

    displayCurrency: curr,
    rawMaterialsTotal: convertCurrency(rawMaterialsTotalUsd, curr, rates),
    productionCostTotal: convertCurrency(productionCostUsd, curr, rates),
    laborAndLossesTotal: convertCurrency(wastageMetalCostUsd + laborCostUsd + hallmarkCostUsd, curr, rates),
    retailPrice: inputs.retailPrice,
    markupAmount: convertCurrency(markupAmountUsd, curr, rates),
    pawnshopEstimate: convertCurrency(pawnshopEstimateUsd, curr, rates),

    markupCategory,
  };
}
