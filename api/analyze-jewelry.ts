import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

function resolveAbsoluteUrl(imgUrl: string, baseUrl: string): string {
  if (!imgUrl) return '';
  const trimmed = imgUrl.trim();
  if (trimmed.startsWith('data:image/')) return trimmed;
  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  try {
    return new URL(trimmed, baseUrl).href;
  } catch {
    return trimmed;
  }
}

function extractHtmlMetadata(html: string, pageUrl: string) {
  let imageUrl: string | undefined;
  let title: string | undefined;
  let description: string | undefined;

  const ogImgMatch =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
    html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImgMatch && ogImgMatch[1]) {
    imageUrl = ogImgMatch[1].trim();
  }

  if (!imageUrl) {
    const twImgMatch =
      html.match(/<meta[^>]+name=["']twitter:image(?:[:_]src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?:[:_]src)?["']/i);
    if (twImgMatch && twImgMatch[1]) {
      imageUrl = twImgMatch[1].trim();
    }
  }

  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  const descMatch =
    html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  if (descMatch && descMatch[1]) {
    description = descMatch[1].trim();
  }

  if (imageUrl) {
    imageUrl = resolveAbsoluteUrl(imageUrl, pageUrl);
  }

  return { imageUrl, title, description };
}

async function fetchAndExtractProductPage(url: string) {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  const response = await fetch(targetUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити сторінку товару (HTTP ${response.status})`);
  }

  const html = await response.text();
  const meta = extractHtmlMetadata(html, targetUrl);

  const jsonLdBlocks: any[] = [];
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      jsonLdBlocks.push(parsed);
    } catch {}
  }

  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');

  const textContent = cleanHtml
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16000);

  let imageBase64: string | null = null;
  if (meta.imageUrl && (meta.imageUrl.startsWith('http://') || meta.imageUrl.startsWith('https://'))) {
    try {
      const imgRes = await fetch(meta.imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString('base64');
        const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        imageBase64 = `data:${contentType};base64,${base64}`;
      }
    } catch (imgErr) {
      console.warn('Could not fetch product image for vision analysis:', imgErr);
    }
  }

  return {
    targetUrl,
    title: meta.title,
    description: meta.description,
    imageUrl: meta.imageUrl,
    jsonLdBlocks,
    textContent,
    imageBase64,
  };
}

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
    const { url, imagesBase64, imageBase64, userNotes, userApiKey } = req.body || {};
    const apiKey = userApiKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        error: 'GEMINI_API_KEY не вказано в середовищі Vercel.',
      });
    }

    const rawImages: string[] = Array.isArray(imagesBase64) && imagesBase64.length > 0
      ? [...imagesBase64]
      : (imageBase64 ? [imageBase64] : []);

    const hasUrl = typeof url === 'string' && url.trim().length > 0;

    if (!hasUrl && rawImages.length === 0) {
      return res.status(400).json({ success: false, error: 'Вкажіть посилання на товар або завантажте фото' });
    }

    let pageData: Awaited<ReturnType<typeof fetchAndExtractProductPage>> | null = null;
    if (hasUrl) {
      try {
        pageData = await fetchAndExtractProductPage(url);
        if (pageData.imageBase64 && rawImages.length === 0) {
          rawImages.push(pageData.imageBase64);
        }
      } catch (err: any) {
        console.warn('Failed to fetch webpage:', err);
      }
    }

    const ai = new GoogleGenAI({ apiKey });
    const imageParts = rawImages.map((img) => ({
      inlineData: {
        data: img.replace(/^data:image\/\w+;base64,/, ''),
        mimeType: 'image/jpeg',
      },
    }));

    let promptText = '';
    if (pageData) {
      promptText = `Ти — провідний експерт-гемолог, оцінювач ювелірних виробів та аналітик цін в ювелірних магазинах.
Тобі надано інформацію та характеристики зі сторінки товару в інтернет-магазині:
Посилання: ${pageData.targetUrl}
Заголовок сторінки: ${pageData.title || 'Не вказано'}
Опис товару: ${pageData.description || 'Не вказано'}
JSON-LD структуровані дані: ${JSON.stringify(pageData.jsonLdBlocks).slice(0, 4000)}
Текст та характеристики зі сторінки товару:
${pageData.textContent.slice(0, 8000)}

${rawImages.length > 0 ? 'Також надано зображення товару для візуального аналізу.' : ''}
${userNotes ? `\nВАЖЛИВО! КОРИСТУВАЧ ВКАЗАВ ПРИМІТКИ / ПАРАМЕТРИ (МАЮТЬ НАЙВИЩИЙ ПРІОРИТЕТ, якщо вага, ціна або характеристики вказані тут, ОБОВ'ЯЗКОВО візьми їх): "${userNotes}"\n` : ''}

Уважно проаналізуй всі дані зі сторінки та фотографій, витягни всі параметри прикраси у форматі JSON:
- title: повна та чітка назва прикраси українською мовою (наприклад: "Золота каблучка з фіанітами", "Сережки з білого золота 585 з діамантами")
- itemType: тип виробу ("ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other")
- brand: бренд або виробник (наприклад "Золотий Вік", "SOVA", "Zarina", "КЮЗ", "Укрзолото", "Столична Ювелірна Фабрика", "Pandora", "Cartier" або назва магазину)
- store: назва інтернет-магазину або платформи
- productUrl: ${JSON.stringify(pageData.targetUrl)}
- photoUrl: ${JSON.stringify(pageData.imageUrl || '')}
- metalType: метал ("gold" | "silver" | "platinum" | "palladium")
- purity: числове значення проби (наприклад 585, 750, 925, 950, 999). Якщо золото 585 -> 585.
- metalWeightGrams: вага виробу в грамах як число (наприклад 3.45). Якщо вага не вказана на сайті і не вказана в примітках, встанови null (НЕ вигадуй зі стелі!).
- price: актуальна ціна покупки в магазині (число, акційна/поточна ціна зі знижкою якщо є).
- currency: валюта ("UAH" | "USD" | "EUR")
- coatingType: тип покриття ("none" | "rhodium_white" | "rhodium_black" | "gilding" | "blackening" | "combined")
- surfaceFinish: характер поверхні ("polished" | "matte_sandblast" | "satin_brushed" | "diamond_cut" | "combined_texture")
- gemstones: масив вставок каміння (якщо є) з полями:
    - type: назва каменя українською ("Діамант", "Фіаніт", "Смарагд", "Сапфір", "Топаз", "Перли" тощо)
    - count: кількість каменів (число)
    - carats: вага в каратах на 1 камінь або сумарно (число)
    - clarity: чистота якщо вказана (напр "VS2", "3" або "")
    - color: колір якщо вказаний (напр "G", "4" або "")
    - origin: походження ("natural" для натуральних/дорогоцінних, "synthetic" для фіанітів/цирконію, "lab" для вирощених)
- aiNotes: стислий експертний коментар гемолога (1-2 речення про витягнуті характеристики товару).`;
    } else {
      promptText = `Ти — експерт гемолог та оцінювач ювелірних виробів.
Тобі надано ${rawImages.length > 1 ? `${rawImages.length} зображень одного ювелірного виробу (лицьова/зворотна сторона бирки, сам виріб, проба/клеймо, чек, сертифікат)` : 'зображення ювелірного виробу (бирка, чек, сертифікат або виріб)'}.
${userNotes ? `\nВАЖЛИВО! КОРИСТУВАЧ ВКАЗАВ ДОДАТКОВІ ПРИМІТКИ (МАЮТЬ НАЙВИЩИЙ ПРІОРИТЕТ, якщо вага, ціна чи проба вказані тут, ОБОВ'ЯЗКОВО підстав їх): "${userNotes}"\n` : ''}

Уважно проаналізуй ВСІ надані зображення, зістав та витягни параметри виробу у форматі JSON:
- title: назва виробу українською мовою
- itemType: тип виробу ("ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other")
- brand: бренд або виробник (або null)
- store: магазин (або null)
- productUrl: null
- photoUrl: null
- metalType: метал ("gold" | "silver" | "platinum" | "palladium")
- purity: проба (число, наприклад 585, 750, 925, 950)
- metalWeightGrams: вага металу або виробу в грамах як число (якщо вказана в примітках або чітко видно на бирці). Якщо ваги немає ні на бирці, ні в примітках, встанови null (НЕ вигадуй 3.5 чи будь-яку іншу цифру!).
- price: ціна в магазині (число, якщо вказана на бирці чи в примітках, інакше null)
- currency: валюта ("UAH" | "USD" | "EUR")
- coatingType: тип покриття ("none" | "rhodium_white" | "rhodium_black" | "gilding" | "blackening" | "combined")
- surfaceFinish: характер поверхні ("polished" | "matte_sandblast" | "satin_brushed" | "diamond_cut" | "combined_texture")
- gemstones: ОБОВ'ЯЗКОВО витягни всі вставки/каміння з бирки (наприклад '1 Бр. Кр57 0.05 3/4', '3 Фіаніти', 'Топаз 0.5ct', 'Смарагд') як масив об'єктів { type, count, carats, clarity, color, origin }
- aiNotes: стислий аналіз того, що зображено на фотографіях та які параметри були розпізнані.`;
    }

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
            brand: { type: Type.STRING },
            store: { type: Type.STRING },
            productUrl: { type: Type.STRING },
            photoUrl: { type: Type.STRING },
            metalType: { type: Type.STRING },
            purity: { type: Type.NUMBER },
            metalWeightGrams: { type: Type.NUMBER },
            price: { type: Type.NUMBER },
            currency: { type: Type.STRING },
            coatingType: { type: Type.STRING },
            surfaceFinish: { type: Type.STRING },
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
    if (pageData) {
      if (!parsed.productUrl) parsed.productUrl = pageData.targetUrl;
      if (!parsed.photoUrl && pageData.imageUrl) parsed.photoUrl = pageData.imageUrl;
    }

    return res.status(200).json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Vercel analyze-jewelry error:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Server error' });
  }
}
