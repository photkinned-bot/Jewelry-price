import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));

// Initialize Gemini AI client on server side
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
};

function safeParseJson(rawText: string) {
  if (!rawText) return {};
  try {
    const cleaned = rawText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse JSON text from Gemini:", rawText);
    throw new Error("Не вдалося розпарсити відповідь від AI");
  }
}

// Fallback rule-based advice generation if AI service is unavailable
function generateRuleBasedAdvice(calc: any) {
  const markupPercent = Number(calc.markupPercent) || 0;
  const retailPrice = Number(calc.retailPrice) || 0;
  const materialsCost = Number(calc.materialsCost) || 0;
  const costBasis = Number(calc.costBasis) || 0;
  const title = calc.title || "Ювелірний виріб";

  let investmentRating = 6;
  if (markupPercent <= 35) investmentRating = 9;
  else if (markupPercent <= 70) investmentRating = 8;
  else if (markupPercent <= 120) investmentRating = 6;
  else if (markupPercent <= 200) investmentRating = 4;
  else investmentRating = 3;

  const pros: string[] = [];
  const cons: string[] = [];

  if (materialsCost > 0 && retailPrice > 0) {
    const rawRatio = Math.round((materialsCost / retailPrice) * 100);
    if (rawRatio >= 50) {
      pros.push(`Висока частка дорогоцінного металу та каміння (${rawRatio}% від ціни)`);
    } else {
      cons.push(`Лише ${rawRatio}% ціни магазину покривається чистою вартістю матеріалів`);
    }
  }

  if (markupPercent <= 50) {
    pros.push("Поміркована торговельна націнка магазину");
  } else {
    cons.push(`Суттєва націнка магазину (+${Math.round(markupPercent)}% до собівартості)`);
  }

  if (Array.isArray(calc.gemstones) && calc.gemstones.length > 0) {
    pros.push(`Виріб містить вставки дорогоцінного каміння (${calc.gemstones.length} шт)`);
  } else {
    pros.push("Відсутні вставки — простіший догляд та вища ліквідність металу");
  }

  let recommendedDiscount = 10;
  if (markupPercent > 150) recommendedDiscount = 25;
  else if (markupPercent > 100) recommendedDiscount = 20;
  else if (markupPercent > 60) recommendedDiscount = 15;

  return {
    summary: `Аналіз виробу "${title}": собівартість становить близько ${Math.round(costBasis)} ${calc.currency}, а роздрібна націнка дорівнює ${Math.round(markupPercent)}%. ${markupPercent > 100 ? "Ціна є завищеною для мас-маркету, рекомендується аргументований торг." : "Пропозиція знаходиться в межах адекватної ринкової норми."}`,
    investmentRating,
    investmentExplanation: `Оцінка ${investmentRating}/10 на основі збереження капіталу в металі та рівня націнки.`,
    pros: pros.length > 0 ? pros : ["Класичний ювелірний виріб", "Гарантія якості металу"],
    cons: cons.length > 0 ? cons : ["Стандартні ризики роздрібного магазину"],
    advice: `Запитайте у продавця про діючі акції чи персональну знижку. Запропонуйте ціну зі знижкою ${recommendedDiscount}%, аргументуючи знанням реальної собівартості металу та роботи.`,
    recommendedDiscountPercent: recommendedDiscount,
    isFallback: true,
  };
}

// Cache for official metal and currency exchange rates
interface CachedRates {
  updatedAt: string;
  source: string;
  officialSourceUrl: string;
  currencies: {
    USD: number;
    UAH: number;
    EUR: number;
  };
  pureMetalRatesUsd: {
    gold: number;
    silver: number;
    platinum: number;
    palladium: number;
  };
}

let cachedMetalRates: CachedRates | null = null;
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache

async function fetchLiveRatesFromNbu(forceRefresh = false): Promise<CachedRates> {
  const now = Date.now();
  if (!forceRefresh && cachedMetalRates && (now - lastFetchTimestamp < CACHE_TTL_MS)) {
    return cachedMetalRates;
  }

  let usdToUah = 44.71;
  let eurToUah = 51.62;
  let eurToUsd = 1.15;
  let goldGramUsd = 88.5;
  let silverGramUsd = 1.05;
  let platinumGramUsd = 31.8;
  let palladiumGramUsd = 34.2;
  let sourceLabel = "Національний Банк України (bank.gov.ua) + LBMA Spot Market";

  try {
    // 1. Fetch official rates directly from the National Bank of Ukraine (NBU) API
    const nbuRes = await fetch("https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json", {
      headers: { "User-Agent": "JewelryApp/1.0" },
    });

    if (nbuRes.ok) {
      const nbuData = await nbuRes.json();
      if (Array.isArray(nbuData)) {
        const usdItem = nbuData.find((item: any) => item.cc === "USD");
        const eurItem = nbuData.find((item: any) => item.cc === "EUR");
        const xauItem = nbuData.find((item: any) => item.cc === "XAU"); // Золото
        const xagItem = nbuData.find((item: any) => item.cc === "XAG"); // Срібло
        const xptItem = nbuData.find((item: any) => item.cc === "XPT"); // Платина
        const xpdItem = nbuData.find((item: any) => item.cc === "XPD"); // Паладій

        if (usdItem?.rate) usdToUah = Number(usdItem.rate);
        if (eurItem?.rate) eurToUah = Number(eurItem.rate);

        if (usdToUah > 0 && eurToUah > 0) {
          eurToUsd = eurToUah / usdToUah;
        }

        // Convert NBU accounting prices (in UAH per troy ounce / 31.1034768g) to USD/g
        if (xauItem?.rate && usdToUah > 0) {
          const goldUahPerGram = Number(xauItem.rate) / 31.1034768; // 1 troy oz = 31.1034768 grams
          const goldUsdG = goldUahPerGram / usdToUah;
          if (goldUsdG >= 40 && goldUsdG <= 250) {
            goldGramUsd = goldUsdG;
          }
        }

        if (xagItem?.rate && usdToUah > 0) {
          const silverUahPerGram = Number(xagItem.rate) / 31.1034768;
          const silverUsdG = silverUahPerGram / usdToUah;
          if (silverUsdG >= 0.3 && silverUsdG <= 10) {
            silverGramUsd = silverUsdG;
          }
        }

        if (xptItem?.rate && usdToUah > 0) {
          const platinumUahPerGram = Number(xptItem.rate) / 31.1034768;
          const platinumUsdG = platinumUahPerGram / usdToUah;
          if (platinumUsdG >= 10 && platinumUsdG <= 150) {
            platinumGramUsd = platinumUsdG;
          }
        }

        if (xpdItem?.rate && usdToUah > 0) {
          const palladiumUahPerGram = Number(xpdItem.rate) / 31.1034768;
          const palladiumUsdG = palladiumUahPerGram / usdToUah;
          if (palladiumUsdG >= 10 && palladiumUsdG <= 150) {
            palladiumGramUsd = palladiumUsdG;
          }
        }

        sourceLabel = "Офіційне джерело: НБУ (bank.gov.ua)";
      }
    }
  } catch (err) {
    console.warn("NBU API fetch error, using live backup open-er API:", err);
  }

  // 2. Backup check for EUR/USD exchange cross rate
  try {
    const backupRes = await fetch("https://open.er-api.com/v6/latest/USD");
    if (backupRes.ok) {
      const erData = await backupRes.json();
      if (erData?.rates?.EUR) {
        eurToUsd = 1 / Number(erData.rates.EUR);
      }
    }
  } catch (err) {
    // Keep standard fallback
  }

  cachedMetalRates = {
    updatedAt: new Date().toISOString(),
    source: sourceLabel,
    officialSourceUrl: "https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?json",
    currencies: {
      USD: 1,
      UAH: Math.round(usdToUah * 100) / 100,
      EUR: Math.round(eurToUsd * 100) / 100,
    },
    pureMetalRatesUsd: {
      gold: Math.round(goldGramUsd * 100) / 100,
      silver: Math.round(silverGramUsd * 100) / 100,
      platinum: Math.round(platinumGramUsd * 100) / 100,
      palladium: Math.round(palladiumGramUsd * 100) / 100,
    },
  };

  lastFetchTimestamp = now;
  return cachedMetalRates;
}

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Helper to resolve relative URL to absolute
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

// Helper to extract image metadata from HTML
function extractHtmlMetadata(html: string, pageUrl: string) {
  let imageUrl: string | undefined;
  let title: string | undefined;
  let description: string | undefined;

  // 1. OpenGraph Image
  const ogImgMatch =
    html.match(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i) ||
    html.match(/<meta[^>]+name=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogImgMatch && ogImgMatch[1]) {
    imageUrl = ogImgMatch[1].trim();
  }

  // 2. Twitter Image
  if (!imageUrl) {
    const twImgMatch =
      html.match(/<meta[^>]+name=["']twitter:image(?:[:_]src)?["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?:[:_]src)?["']/i);
    if (twImgMatch && twImgMatch[1]) {
      imageUrl = twImgMatch[1].trim();
    }
  }

  // 3. Schema.org JSON-LD
  if (!imageUrl) {
    const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match[1];
        const parsed = JSON.parse(jsonContent);
        const findImg = (obj: any) => {
          if (!obj || typeof obj !== 'object') return;
          if (obj.image) {
            if (typeof obj.image === 'string') imageUrl = obj.image;
            else if (Array.isArray(obj.image) && obj.image[0]) {
              imageUrl = typeof obj.image[0] === 'string' ? obj.image[0] : obj.image[0].url;
            } else if (obj.image.url) {
              imageUrl = obj.image.url;
            }
          }
          if (!imageUrl && obj['@graph'] && Array.isArray(obj['@graph'])) {
            obj['@graph'].forEach(findImg);
          }
        };
        findImg(parsed);
        if (imageUrl) break;
      } catch {
        // Ignore invalid JSON
      }
    }
  }

  // 4. Link rel image_src / itemprop image
  if (!imageUrl) {
    const linkMatch =
      html.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i);
    if (linkMatch && linkMatch[1]) {
      imageUrl = linkMatch[1].trim();
    }
  }

  // Title
  const titleMatch =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Description
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

// Endpoint to fetch and extract product image from an online store URL
app.all("/api/fetch-product-image", async (req, res) => {
  const rawUrl = (req.method === "POST" ? req.body?.url : req.query?.url) as string | undefined;

  if (!rawUrl || typeof rawUrl !== "string") {
    return res.status(400).json({ success: false, error: "Параметр url обовʼязковий" });
  }

  let targetUrl = rawUrl.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  // If already an image file extension
  if (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?.*)?$/i.test(targetUrl)) {
    return res.json({
      success: true,
      imageUrl: targetUrl,
    });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      signal: AbortSignal.timeout(10000),
    });

    const contentType = response.headers.get("content-type") || "";
    if (contentType.startsWith("image/")) {
      return res.json({
        success: true,
        imageUrl: targetUrl,
      });
    }

    const html = await response.text();
    const extracted = extractHtmlMetadata(html, targetUrl);

    if (extracted.imageUrl) {
      return res.json({
        success: true,
        imageUrl: extracted.imageUrl,
        title: extracted.title,
        description: extracted.description,
      });
    }

    return res.status(404).json({
      success: false,
      error: "Не знайдено превʼю зображення для вказаної сторінки",
    });
  } catch (error: any) {
    console.error("fetch-product-image error:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Помилка завантаження сторінки",
    });
  }
});

// Live / Official metal spot prices per gram from NBU
app.get("/api/metal-rates", async (req, res) => {
  try {
    const forceRefresh = req.query.force === "true";
    const liveRates = await fetchLiveRatesFromNbu(forceRefresh);
    res.json(liveRates);
  } catch (error: any) {
    console.error("Error fetching metal rates:", error);
    res.status(500).json({ error: "Не вдалося отримати актуальні курси" });
  }
});

// Analyze images (tag, receipt, or jewelry piece) using Gemini Vision API
app.post("/api/analyze-jewelry", async (req, res) => {
  try {
    const { imagesBase64, imageBase64, mimeType = "image/jpeg", userNotes } = req.body;

    const rawImages: string[] = Array.isArray(imagesBase64) && imagesBase64.length > 0
      ? imagesBase64
      : (imageBase64 ? [imageBase64] : []);

    if (rawImages.length === 0) {
      return res.status(400).json({ error: "Будь ласка, надайте хоча б одне зображення для аналізу" });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({
        error: "Для автоматичного розпізнавання фото потрібен ключ GEMINI_API_KEY. Будь ласка, вкажіть GEMINI_API_KEY у налаштуваннях середовища.",
      });
    }

    const imageParts = rawImages.map((img) => {
      const cleanBase64 = img.replace(/^data:image\/\w+;base64,/, "");
      return {
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      };
    });

    const promptText = `Ти — експерт гемолог та оцінювач ювелірних виробів.
Тобі надано ${rawImages.length > 1 ? `${rawImages.length} зображень одного ювелірного виробу (це можуть бути лицьова і зворотна сторона біржової бирки, фото самого виробу, клейма/проби, чек або сертифікат)` : "зображення ювелірного виробу (бирка, чек, сертифікат або сам виріб)"}.
Уважно проаналізуй ВСІ надані зображення, зістав та витягни або оціни всі параметри виробу у форматі JSON:
- Назва виробу (title)
- Тип виробу (itemType: "ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other")
- Метал (metalType: "gold" | "silver" | "platinum" | "palladium")
- Проба (purity: число, наприклад 585, 750, 925, 950)
- Вага в грамах (metalWeightGrams: число або null якщо не видно)
- Ціна в магазині (price: число або null якщо не видно)
- Валюта (currency: "UAH" | "USD" | "EUR")
- Бренд (brand: назва бренду або виробника, або null)
- Вставки каміння (gemstones: масив об'єктів з полями: type (напр. "Діамант", "Смарагд", "Фіаніт"), count (кількість), carats (вага в каратах на 1 камінь або сумарно), clarity (чистота, напр "VVS2", "VS1", "3/4" або null), color (колір, напр "D", "G", "4" або null), origin ("natural" | "lab" | "synthetic")))
- Нотатки AI (aiNotes: стислий аналіз того, що зображено на фотографіях та які параметри були розпізнані).
${userNotes ? `Додаткова інформація від користувача: ${userNotes}` : ""}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: [
        ...imageParts,
        { text: promptText },
      ],
      config: {
        responseMimeType: "application/json",
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

    const text = response.text || "{}";
    const parsedData = safeParseJson(text);
    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error in /api/analyze-jewelry:", error);
    res.status(500).json({ error: error?.message || "Помилка аналізу зображення" });
  }
});

// Get AI Advice on calculation deal
app.post("/api/ai-advice", async (req, res) => {
  try {
    const { calculationDetails } = req.body;

    if (!calculationDetails) {
      return res.status(400).json({ error: "Дані калькуляції обов'язкові" });
    }

    const ai = getAiClient();
    if (!ai) {
      // Return smart rule-based advice as fallback if GEMINI_API_KEY is missing
      const fallbackAdvice = generateRuleBasedAdvice(calculationDetails);
      return res.json({ success: true, advice: fallbackAdvice });
    }

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
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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

    const text = response.text || "{}";
    const parsedData = safeParseJson(text);
    res.json({ success: true, advice: parsedData });
  } catch (error: any) {
    console.error("Error in /api/ai-advice:", error);
    // If Gemini call fails, return fallback rule-based advice instead of failing
    try {
      const fallbackAdvice = generateRuleBasedAdvice(req.body.calculationDetails || {});
      res.json({ success: true, advice: fallbackAdvice });
    } catch {
      res.status(500).json({ error: error?.message || "Помилка генерації порад" });
    }
  }
});

// Vite middleware & production static handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
