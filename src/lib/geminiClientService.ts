import { GoogleGenAI, Type } from '@google/genai';
import { AiAdviceResult, CalculationInputs, CoatingType, SurfaceFinishType } from '../types';
import { generateRuleBasedAdvice } from './ruleBasedAdviceEngine';
import { fetchProductImageFromUrl, extractImageFromHtml } from './productImageService';
import { normalizeGemstonesList } from './gemstoneParser';

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

function safeParseJson(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') return {};

  let cleaned = rawText
    .replace(/^[\s\S]*?```(?:json)?\s*/i, '')
    .replace(/\s*```[\s\S]*$/i, '')
    .trim();

  // Try extracting the outermost valid JSON object if extra text surrounds it
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(cleaned);
  } catch {
    // 2. Syntax cleanup attempt: trailing commas, unescaped newlines inside strings
    try {
      const sanitized = cleaned
        .replace(/,\s*([\}\]])/g, '$1')
        .replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, ' ');
      return JSON.parse(sanitized);
    } catch {
      // 3. Balancing repair attempt for truncated JSON responses
      try {
        let repaired = cleaned;
        const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          repaired += '"';
        }
        const openBraces = (repaired.match(/\{/g) || []).length;
        const closeBraces = (repaired.match(/\}/g) || []).length;
        for (let i = 0; i < openBraces - closeBraces; i++) {
          repaired += '}';
        }
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          repaired += ']';
        }
        return JSON.parse(repaired);
      } catch {
        // 4. Regex extraction for known keys so we never throw or crash
        const result: Record<string, any> = {};

        const summaryMatch =
          cleaned.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
          cleaned.match(/"summary"\s*:\s*"([^"\n\r]+)/i);
        if (summaryMatch) result.summary = summaryMatch[1].replace(/\\"/g, '"');

        const ratingMatch = cleaned.match(/"investmentRating"\s*:\s*(\d+(?:\.\d+)?)/i);
        if (ratingMatch) result.investmentRating = Number(ratingMatch[1]);

        const expMatch = cleaned.match(/"investmentExplanation"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
        if (expMatch) result.investmentExplanation = expMatch[1].replace(/\\"/g, '"');

        const adviceMatch =
          cleaned.match(/"advice"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i) ||
          cleaned.match(/"advice"\s*:\s*"([^"\n\r]+)/i);
        if (adviceMatch) result.advice = adviceMatch[1].replace(/\\"/g, '"');

        const discMatch = cleaned.match(/"recommendedDiscountPercent"\s*:\s*(\d+(?:\.\d+)?)/i);
        if (discMatch) result.recommendedDiscountPercent = Number(discMatch[1]);

        const titleMatch = cleaned.match(/"title"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/i);
        if (titleMatch) result.title = titleMatch[1];

        const itemTypeMatch = cleaned.match(/"itemType"\s*:\s*"([^"]+)"/i);
        if (itemTypeMatch) result.itemType = itemTypeMatch[1];

        const metalMatch = cleaned.match(/"metalType"\s*:\s*"([^"]+)"/i);
        if (metalMatch) result.metalType = metalMatch[1];

        const purityMatch = cleaned.match(/"purity"\s*:\s*(\d+)/i);
        if (purityMatch) result.purity = Number(purityMatch[1]);

        const weightMatch = cleaned.match(/"metalWeightGrams"\s*:\s*(\d+(?:\.\d+)?)/i);
        if (weightMatch) result.metalWeightGrams = Number(weightMatch[1]);

        const priceMatch = cleaned.match(/"price"\s*:\s*(\d+(?:\.\d+)?)/i);
        if (priceMatch) result.price = Number(priceMatch[1]);

        const currMatch = cleaned.match(/"currency"\s*:\s*"([^"]+)"/i);
        if (currMatch) result.currency = currMatch[1];

        if (Object.keys(result).length > 0) {
          return result;
        }

        console.warn('JSON repair fallback triggered in client (truncated):', cleaned.slice(0, 150));
        return {};
      }
    }
  }
}

export interface AnalyzeJewelryParams {
  url?: string;
  images?: string[];
  userNotes?: string;
  apiKeyOverride?: string;
}

/**
 * Universal analysis function: tries server API first, then falls back to direct client-side Gemini call
 */
export async function analyzeJewelryUnified(
  params: AnalyzeJewelryParams
): Promise<Partial<CalculationInputs>> {
  const { url, images = [], userNotes = '', apiKeyOverride } = params;

  // 1. Try server endpoint first (fast, handles server-side proxying and CORS)
  try {
    const response = await fetch('/api/analyze-jewelry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url?.trim() || undefined,
        imagesBase64: images.length > 0 ? images : undefined,
        userNotes: userNotes.trim() || undefined,
        userApiKey: apiKeyOverride || getStoredUserApiKey() || undefined,
      }),
    });

    if (response.ok) {
      const resData = await response.json();
      if (resData.success && resData.data) {
        const isUrlScan = Boolean(url && url.trim().length > 0);
        return mapParsedDataToInputs(resData.data, isUrlScan, url, userNotes);
      }
    }
  } catch (serverErr) {
    console.info('Server /api/analyze-jewelry unavailable or failed, trying client-side fallback:', serverErr);
  }

  // 2. Client-side fallback via direct Gemini API
  return await analyzeJewelryClientSideFallback(params);
}

const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.7-flash',
  'gemini-3.1-pro-preview',
];

async function generateWithClientModelFallback(
  ai: GoogleGenAI,
  requestPayload: {
    contents: any;
    config?: any;
  }
) {
  let lastError: any = null;

  for (const modelName of FALLBACK_MODELS) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: requestPayload.contents,
          config: requestPayload.config,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err || '');
        const status = err?.status || err?.code || (msg.includes('503') ? 503 : (msg.includes('429') ? 429 : 0));
        const isQuota = msg.includes('resource_exhausted') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rate-limits');
        const isTemporary = status === 503 || (!isQuota && status === 429) || msg.includes('high demand') || msg.includes('UNAVAILABLE');

        console.warn(`Client direct model ${modelName} (attempt ${attempt}) call failed (status: ${status}, isQuota: ${isQuota}):`, msg.slice(0, 150));
        
        if (isQuota) {
          // If quota exceeded for this model, immediately switch to next model without waiting
          break;
        } else if (attempt === 1 && isTemporary) {
          await new Promise((r) => setTimeout(r, 500));
        } else {
          break;
        }
      }
    }
  }

  throw lastError || new Error('Усі AI моделі наразі недоступні через навантаження');
}

/**
 * Fallback browser-side call to Gemini Vision / Language API
 */
async function analyzeJewelryClientSideFallback(
  params: AnalyzeJewelryParams
): Promise<Partial<CalculationInputs>> {
  const { url, images = [], userNotes = '', apiKeyOverride } = params;
  const apiKey = apiKeyOverride || getStoredUserApiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY_GITHUB_PAGES');
  }

  const ai = new GoogleGenAI({ apiKey });
  const rawImages = [...images];
  let extractedWebText = '';
  let extractedWebImage = '';
  let webTitle = '';

  const isUrlScan = Boolean(url && url.trim().length > 0);

  // If a URL was provided, attempt to fetch page info via client proxy
  if (isUrlScan) {
    try {
      const imgRes = await fetchProductImageFromUrl(url!.trim());
      if (imgRes.success) {
        if (imgRes.imageUrl) extractedWebImage = imgRes.imageUrl;
        if (imgRes.title) webTitle = imgRes.title;
        if (imgRes.description) extractedWebText = imgRes.description;
      }
    } catch (e) {
      console.warn('Client proxy extraction warning:', e);
    }
  }

  const imageParts = rawImages.map((img) => ({
    inlineData: {
      data: img.replace(/^data:image\/\w+;base64,/, ''),
      mimeType: 'image/jpeg',
    },
  }));

  let promptText = '';
  if (isUrlScan) {
    promptText = `Ти — провідний експерт-гемолог, оцінювач ювелірних виробів та аналітик цін.
Проаналізуй ювелірний виріб за посиланням на магазин: ${url!.trim()}
${webTitle ? `Заголовок сторінки: ${webTitle}` : ''}
${extractedWebText ? `Опис товару зі сторінки: ${extractedWebText}` : ''}
${rawImages.length > 0 ? 'Також надано зображення виробу.' : ''}
${userNotes ? `\nВАЖЛИВО! КОРИСТУВАЧ ВКАЗАВ ПРИМІТКИ / ПАРАМЕТРИ (МАЮТЬ НАЙВИЩИЙ ПРІОРИТЕТ, якщо вага, ціна або характеристики вказані тут, ОБОВ'ЯЗКОВО візьми їх): "${userNotes}"\n` : ''}

Уважно розпізнай характеристики прикраси у форматі JSON:
- title: повна назва прикраси українською
- itemType: "ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other"
- brand: бренд (наприклад SOVA, Золотий Вік, Zarina, КЮЗ, Укрзолото тощо)
- store: назва магазину
- productUrl: ${JSON.stringify(url!.trim())}
- photoUrl: ${JSON.stringify(extractedWebImage || '')}
- metalType: "gold" | "silver" | "platinum" | "palladium"
- purity: числове значення проби (наприклад 585, 750, 925, 950)
- metalWeightGrams: вага металу або виробу в грамах як число. Якщо вага не вказана на сайті чи в примітках, встанови null (НЕ вигадуй зі стелі!).
- price: актуальна ціна в магазині (число). Якщо не вказано і немає в примітках, встанови null.
- currency: "UAH" | "USD" | "EUR"
- coatingType: "none" | "rhodium_white" | "rhodium_black" | "gilding" | "blackening" | "combined"
- surfaceFinish: "polished" | "matte_sandblast" | "satin_brushed" | "diamond_cut" | "combined_texture"
- gemstones: масив вставок каміння (якщо є). Для кожного:
    - type: назва українською ("Діамант", "Фіаніт", "Смарагд", "Сапфір", "Топаз", "Перли" тощо)
    - count: кількість штук (число)
    - carats: вага в каратах (на 1 камінь або сумарно)
    - clarity: чистота
    - color: колір
    - origin: "natural" | "lab" | "synthetic"
- aiNotes: стислий висновок AI гемолога про розпізнані характеристики.`;
  } else {
    promptText = `Ти — експерт гемолог та оцінювач ювелірних виробів.
Тобі надано ${rawImages.length > 1 ? `${rawImages.length} зображень одного ювелірного виробу (лицьова/зворотна сторона бирки, сам виріб, проба/клеймо, чек, сертифікат)` : 'зображення ювелірного виробу (бирка, чек, сертифікат або виріб)'}.
${userNotes ? `\nВАЖЛИВО! КОРИСТУВАЧ ВКАЗАВ ДОДАТКОВІ ПРИМІТКИ (МАЮТЬ НАЙВИЩИЙ ПРІОРИТЕТ, якщо вага, ціна чи проба вказані тут, ОБОВ'ЯЗКОВО підстав їх): "${userNotes}"\n` : ''}

Уважно проаналізуй ВСІ надані зображення, зістав та витягни параметри виробу у форматі JSON:
- title: назва виробу українською
- itemType: "ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other"
- brand: бренд або виробник (або null)
- store: магазин (або null)
- productUrl: null
- photoUrl: null
- metalType: "gold" | "silver" | "platinum" | "palladium"
- purity: проба число (наприклад 585, 750, 925, 950)
- metalWeightGrams: вага металу або виробу в грамах як число (якщо вказана в примітках або чітко видно на бирці). Якщо ваги немає ні на бирці, ні в примітках, встанови null (НЕ вигадуй 3.5 чи будь-яку іншу цифру!).
- price: ціна в магазині (число, якщо вказана на бирці чи в примітках, інакше null)
- currency: "UAH" | "USD" | "EUR"
- coatingType: "none" | "rhodium_white" | "rhodium_black" | "gilding" | "blackening" | "combined"
- surfaceFinish: "polished" | "matte_sandblast" | "satin_brushed" | "diamond_cut" | "combined_texture"
- gemstones: ОБОВ'ЯЗКОВО витягни всі вставки/каміння з бирки (наприклад '1 Бр. Кр57 0.05 3/4', '3 Фіаніти', 'Топаз 0.5ct', 'Смарагд') як масив об'єктів { type, count, carats, clarity, color, origin }
- aiNotes: стислий аналіз того, що зображено на фотографіях та які параметри були розпізнані.`;
  }

  let parsed: any = {};
  try {
    const response = await generateWithClientModelFallback(ai, {
      contents: [
        ...imageParts,
        { text: promptText },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
        maxOutputTokens: 2048,
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

    parsed = safeParseJson(response.text || '{}');
  } catch (aiErr) {
    console.warn('Client-side direct AI call failed with all models, using local fallback:', aiErr);
    // If user provided notes, URL or photos, construct a best-effort result
    const notesWeight = extractWeightFromNotes(userNotes);
    const notesPrice = extractPriceFromNotes(userNotes);
    parsed = {
      title: webTitle || (userNotes ? userNotes.slice(0, 40) : 'Ювелірний виріб'),
      itemType: /сережк/i.test(userNotes) ? 'earrings' : /ланцюж|колье|кольє/i.test(userNotes) ? 'necklace' : /браслет/i.test(userNotes) ? 'bracelet' : 'ring',
      brand: '',
      store: '',
      productUrl: url || '',
      photoUrl: extractedWebImage || '',
      metalType: /срібл|925/i.test(userNotes) ? 'silver' : /платин/i.test(userNotes) ? 'platinum' : 'gold',
      purity: /925/i.test(userNotes) ? 925 : /750/i.test(userNotes) ? 750 : 585,
      metalWeightGrams: notesWeight,
      price: notesPrice,
      currency: /\$|usd/i.test(userNotes) ? 'USD' : /€|eur/i.test(userNotes) ? 'EUR' : 'UAH',
      coatingType: 'none',
      surfaceFinish: 'polished',
      gemstones: [],
      aiNotes: 'Параметри визначено на основі наданих даних.',
    };
  }

  return mapParsedDataToInputs(parsed, isUrlScan, url, userNotes);
}

/**
 * Maps raw parsed AI JSON data to CalculationInputs structure
 */
function extractWeightFromNotes(notes: string): number | null {
  if (!notes) return null;
  // Match patterns like "вага 4.5г", "вага: 4.5", "4.5 г", "вес 3.8", "weight 5.2g"
  const weightRegex = /(?:вага|вес|weight)[\s:=]*([0-9]+[.,]?[0-9]*)\s*(?:г|g|гр|грамм)?/i;
  const match = notes.match(weightRegex);
  if (match && match[1]) {
    const val = parseFloat(match[1].replace(',', '.'));
    if (!isNaN(val) && val > 0 && val < 500) return val;
  }

  // Match standalone number with "г" or "g", e.g. "4.2г" or "4.2 г"
  const standaloneMatch = notes.match(/\b([0-9]+[.,]?[0-9]*)\s*(?:г|g|гр)\b/i);
  if (standaloneMatch && standaloneMatch[1]) {
    const val = parseFloat(standaloneMatch[1].replace(',', '.'));
    if (!isNaN(val) && val > 0 && val < 500) return val;
  }
  return null;
}

function extractPriceFromNotes(notes: string): number | null {
  if (!notes) return null;
  // Match "ціна 15000", "цена: 20 000 грн", "15000 грн"
  const priceRegex = /(?:ціна|цена|price|вартість|стоимость)[\s:=]*([0-9\s]{3,})/i;
  const match = notes.match(priceRegex);
  if (match && match[1]) {
    const cleanNum = match[1].replace(/\s/g, '');
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0) return val;
  }

  const currencyMatch = notes.match(/([0-9\s]{3,})\s*(?:грн|uah|usd|\$|€|eur|₴)/i);
  if (currencyMatch && currencyMatch[1]) {
    const cleanNum = currencyMatch[1].replace(/\s/g, '');
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0) return val;
  }
  return null;
}

function mapGemstoneFromAI(g: any, index: number): import('../types').GemstoneItem {
  const rawType = (g.type || g.name || 'Вставка').trim();
  const lower = rawType.toLowerCase();

  let type: import('../types').GemType = 'other';
  let nameUk = rawType;
  let customName: string | undefined = undefined;
  let defaultOrigin: import('../types').GemOrigin = 'natural';

  if (/діамант|диамант|бриллиант|бриліант|diamond|бр[\.\s]/i.test(lower)) {
    if (/лабораторн|lab|вирощен/i.test(lower) || g.origin === 'lab') {
      type = 'lab_diamond';
      nameUk = 'Лабораторний діамант';
      defaultOrigin = 'lab';
    } else {
      type = 'diamond';
      nameUk = 'Діамант';
      defaultOrigin = 'natural';
    }
  } else if (/фіаніт|фианит|циркон|цирконій|zircon|cz|муасан/i.test(lower)) {
    type = 'cubic_zirconia';
    nameUk = /муасан/i.test(lower) ? 'Муасаніт' : 'Фіаніт';
    defaultOrigin = 'synthetic';
  } else if (/смарагд|изумруд|emerald/i.test(lower)) {
    type = 'emerald';
    nameUk = 'Смарагд';
    defaultOrigin = 'natural';
  } else if (/рубін|рубин|ruby/i.test(lower)) {
    type = 'ruby';
    nameUk = 'Рубін';
    defaultOrigin = 'natural';
  } else if (/сапфір|сапфир|sapphire/i.test(lower)) {
    type = 'sapphire';
    nameUk = 'Сапфір';
    defaultOrigin = 'natural';
  } else if (/топаз|гранат|аметист|кварц|хризоліт|цитрин|topaz/i.test(lower)) {
    type = 'topaz';
    nameUk = rawType.charAt(0).toUpperCase() + rawType.slice(1);
    defaultOrigin = 'natural';
  } else if (/перл|жемчуг|pearl/i.test(lower)) {
    type = 'pearl';
    nameUk = 'Перли';
    defaultOrigin = 'natural';
  } else {
    type = 'other';
    nameUk = 'Інше каміння';
    customName = rawType;
    defaultOrigin = 'natural';
  }

  const origin: import('../types').GemOrigin = (['natural', 'lab', 'synthetic'].includes(g.origin)
    ? g.origin
    : defaultOrigin) as import('../types').GemOrigin;

  const count = typeof g.count === 'number' && g.count > 0 ? Math.round(g.count) : 1;
  const carats = typeof g.carats === 'number' && g.carats > 0 ? g.carats : 0.05;

  return {
    id: 'scanned-gem-' + index + '-' + Date.now(),
    type,
    nameUk,
    customName,
    count,
    caratsPerStone: carats,
    origin,
    clarityQuality: g.clarity || '',
    colorQuality: g.color || '',
  };
}

function mapParsedDataToInputs(
  parsed: any,
  isUrlScan: boolean,
  fallbackUrl?: string,
  userNotes?: string
): Partial<CalculationInputs> {
  const notesWeight = userNotes ? extractWeightFromNotes(userNotes) : null;
  const notesPrice = userNotes ? extractPriceFromNotes(userNotes) : null;

  // Metal weight: notes have highest priority, then AI detected weight. If missing, set to 0 (never default to 3.5!)
  let metalWeightGrams = 0;
  if (notesWeight !== null && notesWeight > 0) {
    metalWeightGrams = notesWeight;
  } else if (typeof parsed.metalWeightGrams === 'number' && parsed.metalWeightGrams > 0) {
    metalWeightGrams = parsed.metalWeightGrams;
  }

  // Retail price: notes have highest priority, then AI detected price
  let retailPrice = 0;
  if (notesPrice !== null && notesPrice > 0) {
    retailPrice = notesPrice;
  } else if (typeof parsed.price === 'number' && parsed.price > 0) {
    retailPrice = parsed.price;
  }

  const mapped: Partial<CalculationInputs> = {
    title: parsed.title || 'Ювелірний виріб',
    itemType: (['ring', 'necklace', 'earrings', 'bracelet', 'pendant', 'other'].includes(parsed.itemType)
      ? parsed.itemType
      : 'ring') as any,
    metalType: (['gold', 'silver', 'platinum', 'palladium'].includes(parsed.metalType)
      ? parsed.metalType
      : 'gold') as any,
    purity: typeof parsed.purity === 'number' && parsed.purity > 0 ? parsed.purity : 585,
    metalWeightGrams,
    retailPrice,
    brandName: parsed.brand || '',
    storeName: parsed.store || '',
    productUrl: parsed.productUrl || (isUrlScan ? fallbackUrl : '') || '',
    currency: (['UAH', 'USD', 'EUR'].includes(parsed.currency) ? parsed.currency : 'UAH') as any,
    notes: parsed.aiNotes || '',
    // Only set photoUrl if scanned from an online store URL; NEVER overwrite with uploaded tag photos!
    ...(isUrlScan && parsed.photoUrl ? { photoUrl: parsed.photoUrl } : {}),
  };

  if (['none', 'rhodium_white', 'rhodium_black', 'gilding', 'blackening', 'combined'].includes(parsed.coatingType)) {
    mapped.coatingType = parsed.coatingType as CoatingType;
  }

  if (['polished', 'matte_sandblast', 'satin_brushed', 'diamond_cut', 'combined_texture'].includes(parsed.surfaceFinish)) {
    mapped.surfaceFinish = parsed.surfaceFinish as SurfaceFinishType;
  }

  // Extract and normalize gemstones from parsed AI data or user notes / description
  const rawGemstones = parsed.gemstones || parsed.stones || parsed.inserts || parsed.vstavki || parsed.gemstone;
  const normalizedGems = normalizeGemstonesList(
    rawGemstones,
    userNotes ? `${userNotes} ${parsed.aiNotes || ''} ${parsed.title || ''}` : `${parsed.aiNotes || ''} ${parsed.title || ''}`
  );
  
  if (normalizedGems.length > 0) {
    mapped.gemstones = normalizedGems;
  }

  return mapped;
}

/**
 * Backward-compatible helper for analyzing jewelry images
 */
export async function analyzeJewelryImageClientSide(
  imagesInput: string | string[],
  userNotes: string,
  apiKeyOverride?: string
): Promise<Partial<CalculationInputs>> {
  const images = Array.isArray(imagesInput) ? imagesInput : [imagesInput];
  return analyzeJewelryUnified({
    images,
    userNotes,
    apiKeyOverride,
  });
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
    return generateRuleBasedAdvice(calculationDetails);
  }

  try {
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

    const response = await generateWithClientModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 1500,
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
