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
    const { imagesBase64, imageBase64, userNotes, userApiKey } = req.body || {};
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY не вказано в середовищі Vercel.',
      });
    }

    const rawImages: string[] = Array.isArray(imagesBase64) && imagesBase64.length > 0
      ? imagesBase64
      : (imageBase64 ? [imageBase64] : []);

    if (rawImages.length === 0) {
      return res.status(400).json({ success: false, error: 'Зображення відсутні для аналізу' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const imageParts = rawImages.map((img) => ({
      inlineData: {
        data: img.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: 'image/jpeg',
      },
    }));

    const promptText = `Ти — експерт гемолог та оцінювач ювелірних виробів.
Тобі надано ${rawImages.length > 1 ? `${rawImages.length} зображень одного ювелірного виробу (лицьова/зворотна сторона бирки, сам виріб, проба/клеймо, чек, сертифікат)` : 'зображення ювелірного виробу (бирка, чек, сертифікат або виріб)'}.
Уважно проаналізуй ВСІ надані зображення, зістав та витягни або оціни всі параметри виробу у форматі JSON:
- Назва виробу (title)
- Тип виробу (itemType: "ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other")
- Метал (metalType: "gold" | "silver" | "platinum" | "palladium")
- Проба (purity: число, наприклад 585, 750, 925, 950)
- Вага в грамах (metalWeightGrams: число або null)
- Ціна в магазині (price: число або null)
- Валюта (currency: "UAH" | "USD" | "EUR")
- Бренд (brand: назва бренду або null)
- Вставки каміння (gemstones: масив об'єктів з полями: type, count, carats, clarity, color, origin)
- Нотатки AI (aiNotes: стислий аналіз того, що зображено та які параметри були розпізнані).
${userNotes ? `Додаткові нотатки користувача: ${userNotes}` : ''}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        ...imageParts,
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

    const parsed = JSON.parse(response.text || '{}');
    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Vercel analyze-jewelry error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Server error' });
  }
}
