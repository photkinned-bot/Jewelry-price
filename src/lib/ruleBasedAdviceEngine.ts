import { AiAdviceResult } from '../types';

export function generateRuleBasedAdvice(calc: any): AiAdviceResult {
  const markupPercent = Number(calc.markupPercent) || 0;
  const retailPrice = Number(calc.retailPrice) || 0;
  const materialsCost = Number(calc.materialsCost) || 0;
  const costBasis = Number(calc.costBasis) || 0;
  const title = calc.title || 'Ювелірний виріб';
  const brandName = calc.brandName ? String(calc.brandName).trim() : '';
  const storeName = calc.storeName ? String(calc.storeName).trim() : '';

  let investmentRating = 6;
  if (markupPercent <= 35) investmentRating = 9;
  else if (markupPercent <= 70) investmentRating = 8;
  else if (markupPercent <= 120) investmentRating = 6;
  else if (markupPercent <= 200) investmentRating = 4;
  else investmentRating = 3;

  const pros: string[] = [];
  const cons: string[] = [];

  if (brandName) {
    pros.push(`Вказано бренд: «${brandName}» — додає впізнаваності та сервісної підтримки`);
  }

  if (materialsCost > 0 && retailPrice > 0) {
    const rawRatio = Math.round((materialsCost / retailPrice) * 100);
    if (rawRatio >= 50) {
      pros.push(`Висока частка дорогоцінного металу та каміння (${rawRatio}% від ціни)`);
    } else {
      cons.push(`Лише ${rawRatio}% ціни магазину покривається чистою вартістю матеріалів`);
    }
  }

  if (markupPercent <= 50) {
    pros.push('Поміркована торговельна націнка магазину');
  } else {
    cons.push(`Суттєва націнка магазину (+${Math.round(markupPercent)}% до собівартості)`);
  }

  if (Array.isArray(calc.gemstones) && calc.gemstones.length > 0) {
    pros.push(`Виріб містить вставки дорогоцінного каміння (${calc.gemstones.length} шт)`);
  } else {
    pros.push('Відсутні вставки — простіший догляд та вища ліквідність металу');
  }

  let recommendedDiscount = 10;
  if (markupPercent > 150) recommendedDiscount = 25;
  else if (markupPercent > 100) recommendedDiscount = 20;
  else if (markupPercent > 60) recommendedDiscount = 15;

  const targetLabel = brandName
    ? `виробу від бренду "${brandName}" (${title})`
    : storeName
    ? `виробу "${title}" у магазині "${storeName}"`
    : `виробу "${title}"`;

  const negotiationTarget = storeName
    ? `у магазині "${storeName}"`
    : brandName
    ? `для прикраси бренду "${brandName}"`
    : 'у продавця';

  return {
    summary: `Аналіз ${targetLabel}: собівартість становить близько ${Math.round(costBasis)} ${calc.currency || ''}, а роздрібна націнка дорівнює ${Math.round(markupPercent)}%. ${markupPercent > 100 ? 'Ціна є завищеною для мас-маркету, рекомендується аргументований торг.' : 'Пропозиція знаходиться в межах адекватної ринкової норми.'}`,
    investmentRating,
    investmentExplanation: `Оцінка ${investmentRating}/10 на основі збереження капіталу в металі та рівня націнки.`,
    pros: pros.length > 0 ? pros : ['Класичний ювелірний виріб', 'Гарантія якості металу'],
    cons: cons.length > 0 ? cons : ['Стандартні ризики роздрібного магазину'],
    advice: `Запитайте ${negotiationTarget} про діючі дисконтні програми або сезонну знижку. Запропонуйте ціну зі знижкою ${recommendedDiscount}%, аргументуючи знанням чистої вартості металу та розрахункової собівартості.`,
    recommendedDiscountPercent: recommendedDiscount,
  };
}
