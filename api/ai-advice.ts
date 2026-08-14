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
Проаналізуй розрахунок ювелірного виробу:
- Назва: ${calculationDetails.title}
- Вартість сировини (метал + каміння): ${calculationDetails.materialsCost} ${calculationDetails.currency}
- Робота та втрати: ${calculationDetails.laborCost} ${calculationDetails.currency}
- Загальна собівартість: ${calculationDetails.costBasis} ${calculationDetails.currency}
- Ціна в магазині: ${calculationDetails.retailPrice} ${calculationDetails.currency}
- Націнка магазину: ${calculationDetails.markupAmount} ${calculationDetails.currency} (${calculationDetails.markupPercent}%)
- Індекс націнки: ${calculationDetails.markupRatio}x
- Метал: ${calculationDetails.metalPurity} ${calculationDetails.metalType}, вага ${calculationDetails.metalWeight}г
- Вставки: ${JSON.stringify(calculationDetails.gemstones || [])}

Дай професійний та зрозумілий висновок українською мовою у вигляді JSON зі структурою:
1. summary (загальна оцінка вигідності покупки 2-3 речення)
2. investmentRating (оцінка ліквідності від 1 до 10)
3. pros (3 ключові переваги даного виробу)
4. cons (2-3 застереження або ризики)
5. advice (порада покупцеві, як торгуватись або що уточнити у продавця)
6. recommendedDiscountPercent (рекомендована знижка у відсотках)`;

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
