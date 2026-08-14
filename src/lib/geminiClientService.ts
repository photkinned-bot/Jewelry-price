import { GoogleGenAI, Type } from '@google/genai';
import { AiAdviceResult, CalculationInputs } from '../types';
import { generateRuleBasedAdvice } from './ruleBasedAdviceEngine';

const LOCAL_KEY_STORAGE_NAME = 'user_gemini_api_key_v1';

export function getStoredUserApiKey(): string {
  try {
    const saved = localStorage.getItem(LOCAL_KEY_STORAGE_NAME);
    if (saved) return saved.trim();
  } catch {}
  return (import.meta.env.VITE_GEMINI_API_KEY as string) || '';
}

export function saveUserApiKey(key: string): void {
  try {
    if (!key) {
      localStorage.removeItem(LOCAL_KEY_STORAGE_NAME);
    } else {
      localStorage.setItem(LOCAL_KEY_STORAGE_NAME, key.trim());
    }
  } catch (e) {
    console.error('Failed to save API key:', e);
  }
}

function safeParseJson(rawText: string) {
  if (!rawText) return {};
  try {
    const cleaned = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error('Failed to parse JSON text from Gemini client:', rawText);
    throw new Error('Не вдалося розпарсити відповідь від AI');
  }
}

/**
 * Direct browser-side call to Gemini Vision API
 */
export async function analyzeJewelryImageClientSide(
  imageBase64: string,
  userNotes: string,
  apiKeyOverride?: string
): Promise<Partial<CalculationInputs>> {
  const apiKey = apiKeyOverride || getStoredUserApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY_GITHUB_PAGES');
  }

  const ai = new GoogleGenAI({ apiKey });
  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const promptText = `Ти — експерт гемолог та оцінювач ювелірних виробів.
Проаналізуй це зображення (це може бути ювелірний виріб, бирка з магазину, товарний чек або сертифікат).
Витягни або оціни всі параметри виробу у форматі JSON:
- Назва виробу (title)
- Тип виробу (itemType: "ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other")
- Метал (metalType: "gold" | "silver" | "platinum" | "palladium")
- Проба (purity: число, наприклад 585, 750, 925, 950)
- Вага в грамах (metalWeightGrams: число або null якщо не видно)
- Ціна в магазині (price: число або null якщо не видно)
- Валюта (currency: "UAH" | "USD" | "EUR")
- Бренд (brand: назва бренду або виробника, або null)
- Вставки каміння (gemstones: масив об'єктів з полями: type (напр. "Діамант", "Смарагд", "Фіаніт"), count (кількість), carats (вага в каратах на 1 камінь або сумарно), clarity (чистота), color (колір), origin ("natural" | "lab" | "synthetic")))
- Нотатки AI (aiNotes: стислий аналіз того, що зображено та які параметри були розпізнані або припущені).
${userNotes ? `Додаткова інформація від користувача: ${userNotes}` : ''}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      {
        inlineData: {
          data: cleanBase64,
          mimeType: 'image/jpeg',
        },
      },
      { text: promptText },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          itemType: { type: Type.STRING },
          metalType: { type: Type.STRING },
          purity: { type: Type.NUMBER },
          metalWeightGrams: { type: Type.NUMBER },
          price: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          brand: { type: Type.STRING },
          gemstones: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                count: { type: Type.NUMBER },
                carats: { type: Type.NUMBER },
                clarity: { type: Type.STRING },
                color: { type: Type.STRING },
                origin: { type: Type.STRING },
              },
            },
          },
          aiNotes: { type: Type.STRING },
        },
      },
    },
  });

  const parsed = safeParseJson(response.text || '{}');

  const mappedInputs: Partial<CalculationInputs> = {
    title: parsed.title || 'Ювелірний виріб з фото',
    itemType: parsed.itemType || 'ring',
    metalType: (['gold', 'silver', 'platinum', 'palladium'].includes(parsed.metalType)
      ? parsed.metalType
      : 'gold') as any,
    purity: typeof parsed.purity === 'number' ? parsed.purity : 585,
    metalWeightGrams: typeof parsed.metalWeightGrams === 'number' ? parsed.metalWeightGrams : 4.0,
    retailPrice: typeof parsed.price === 'number' ? parsed.price : 0,
    brandName: parsed.brand || '',
    currency: (['UAH', 'USD', 'EUR'].includes(parsed.currency) ? parsed.currency : 'UAH') as any,
    notes: parsed.aiNotes || '',
    photoUrl: imageBase64,
  };

  if (Array.isArray(parsed.gemstones) && parsed.gemstones.length > 0) {
    mappedInputs.gemstones = parsed.gemstones.map((g: any, i: number) => ({
      id: 'scanned-gem-' + i + '-' + Date.now(),
      type: g.type?.toLowerCase().includes('діамант') ? 'diamond' : 'other',
      nameUk: g.type || 'Вставка',
      count: typeof g.count === 'number' ? g.count : 1,
      caratsPerStone: typeof g.carats === 'number' ? g.carats : 0.05,
      origin: g.origin || 'natural',
      clarityQuality: g.clarity || '',
      colorQuality: g.color || '',
    }));
  }

  return mappedInputs;
}

/**
 * Direct browser-side call to Gemini Advice API
 */
export async function getAiAdviceClientSide(
  calculationDetails: any,
  apiKeyOverride?: string
): Promise<AiAdviceResult> {
  const apiKey = apiKeyOverride || getStoredUserApiKey();

  if (!apiKey) {
    // If no API Key is available on GitHub Pages, generate instant rule-based expert advice
    return generateRuleBasedAdvice(calculationDetails);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Ти — незалежний ювелірний консультант, експерт з оцінки та інвестиційної цінності прикрас.
Проаналізуй розрахунок ювелірного виробу:
- Назва: ${calculationDetails.title}
- Вартість сировини (метал + каміння): ${calculationDetails.materialsCost} ${calculationDetails.currency}
- Робота та втрати (угар, литво, закріпка): ${calculationDetails.laborCost} ${calculationDetails.currency}
- Загальна собівартість: ${calculationDetails.costBasis} ${calculationDetails.currency}
- Ціна в магазині: ${calculationDetails.retailPrice} ${calculationDetails.currency}
- Націнка магазину: ${calculationDetails.markupAmount} ${calculationDetails.currency} (${calculationDetails.markupPercent}%)
- Індекс націнки: ${calculationDetails.markupRatio}x
- Метал: ${calculationDetails.metalPurity} ${calculationDetails.metalType}, вага ${calculationDetails.metalWeight}г
- Вставки: ${JSON.stringify(calculationDetails.gemstones || [])}

Дай професійний та зрозумілий висновок українською мовою у вигляді JSON зі структурою:
1. summary (загальна оцінка вигідності покупки 2-3 речення)
2. investmentRating (оцінка ліквідності від 1 до 10)
3. pros (3 ключові переваги даного виробу або пропозиції)
4. cons (2-3 застереження або ризики)
5. advice (порада покупцеві, як торгуватись або що уточнити у продавця перед покупкою)
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

    const parsed = safeParseJson(response.text || '{}');
    return {
      summary: parsed.summary || 'Аналіз завершено.',
      investmentRating: parsed.investmentRating || 7,
      investmentExplanation: parsed.investmentExplanation || '',
      pros: parsed.pros || [],
      cons: parsed.cons || [],
      advice: parsed.advice || '',
      recommendedDiscountPercent: parsed.recommendedDiscountPercent || 10,
    };
  } catch (err) {
    console.warn('Client-side Gemini call failed, falling back to rule-based advice:', err);
    return generateRuleBasedAdvice(calculationDetails);
  }
}
