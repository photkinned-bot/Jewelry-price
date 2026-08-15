import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { calculationDetails, userApiKey } = req.body || {};
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY не вказано в середовищі Vercel.',
      });
    }

    if (!calculationDetails) {
      return res.status(400).json({ success: false, error: 'Дані розрахунку відсутні' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Ти — незалежний ювелірний консультант, експерт з оцінки та інвестиційної цінності прикрас.
Проаналізуй актуальний розрахунок ювелірного виробу:
- Назва: ${calculationDetails.title || 'Ювелірний виріб'}
- Категорія/тип: ${calculationDetails.itemType || 'прикраса'}
- Бренд / Виробник: ${calculationDetails.brandName ? calculationDetails.brandName : 'Не вказано / Безіменний'}
- Магазин / Мережа: ${calculationDetails.storeName ? calculationDetails.storeName : 'Не вказано'}
- Метал: ${calculationDetails.metalPurity} проба ${calculationDetails.metalType}, вага ${calculationDetails.metalWeight} г
- Вставки каміння: ${JSON.stringify(calculationDetails.gemstones || [])}
- Складність роботи: ${calculationDetails.laborComplexity || 'стандартна'}
- Покриття / фактура: ${calculationDetails.coatingType || 'none'}, ${calculationDetails.surfaceFinish || 'polished'}
- Гравіювання: ${calculationDetails.engravingType || 'none'} ${calculationDetails.engravingText ? `("${calculationDetails.engravingText}")` : ''}
- Вартість сировини (чистий метал + каміння): ${calculationDetails.materialsCost} ${calculationDetails.currency}
- Робота, угар та обробка: ${calculationDetails.laborCost} ${calculationDetails.currency}
- Повна собівартість виготовлення: ${calculationDetails.costBasis} ${calculationDetails.currency}
- Ціна в магазині: ${calculationDetails.retailPrice} ${calculationDetails.currency}
- Націнка магазину: ${calculationDetails.markupAmount} ${calculationDetails.currency} (${calculationDetails.markupPercent}%)
- Коефіцієнт націнки: ${calculationDetails.markupRatio}x
- Орієнтовна ломбардна ліквідність металу: ${calculationDetails.pawnshopEstimate ? `${calculationDetails.pawnshopEstimate} ${calculationDetails.currency}` : 'не розраховано'}
${calculationDetails.userComment || calculationDetails.notes ? `- Коментар/нотатки покупця: ${calculationDetails.userComment || calculationDetails.notes}` : ''}

ОБОВ'ЯЗКОВО врахуй бренд (${calculationDetails.brandName || 'не вказано'}) та магазин (${calculationDetails.storeName || 'не вказано'}) при оцінці преміальності, репутації та адекватності націнки.
Дай професійний та зрозумілий висновок українською мовою у вигляді JSON зі структурою:
1. summary (загальна оцінка вигідності покупки 2-3 речення з урахуванням бренду, металу та націнки)
2. investmentRating (оцінка ліквідності від 1 до 10)
3. pros (3 ключові переваги даного виробу або пропозиції)
4. cons (2-3 застереження або ризики)
5. advice (порада покупцеві: аргументи для торгу саме в цьому магазині/для цього бренду, на що звернути увагу)
6. recommendedDiscountPercent (рекомендована знижка у відсотках, яку доречно просити)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            investmentRating: { type: Type.NUMBER },
            investmentExplanation: { type: Type.STRING },
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            advice: { type: Type.STRING },
            recommendedDiscountPercent: { type: Type.NUMBER },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.status(200).json({ success: true, advice: parsed });
  } catch (error: any) {
    console.error('Vercel ai-advice error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Server error' });
  }
}
