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

function safeParseJson(rawText: string): any {
  if (!rawText || typeof rawText !== "string") return {};

  let cleaned = rawText
    .replace(/^[\s\S]*?```(?:json)?\s*/i, "")
    .replace(/\s*```[\s\S]*$/i, "")
    .trim();

  // Try extracting the outermost valid JSON object if extra text surrounds it
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
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
        .replace(/,\s*([\}\]])/g, "$1")
        .replace(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/g, " ");
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
          repaired += "}";
        }
        const openBrackets = (repaired.match(/\[/g) || []).length;
        const closeBrackets = (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openBrackets - closeBrackets; i++) {
          repaired += "]";
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

        console.warn("JSON repair fallback triggered for input (truncated):", cleaned.slice(0, 150));
        return {};
      }
    }
  }
}

// Resilient Gemini generateContent caller with fallback models and retry for 503/429/quota
const FALLBACK_MODELS = [
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.1-pro-preview",
];

async function generateWithModelFallback(
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
        const msg = String(err?.message || err || "");
        const status = err?.status || err?.code || (msg.includes("503") ? 503 : (msg.includes("429") ? 429 : 0));
        const isQuota = msg.includes("resource_exhausted") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate-limits");
        const isTemporary = status === 503 || (!isQuota && status === 429) || msg.includes("high demand") || msg.includes("UNAVAILABLE");
        
        console.warn(`Model ${modelName} (attempt ${attempt}) call failed (status: ${status}, isQuota: ${isQuota}):`, msg.slice(0, 150));
        
        if (isQuota) {
          // If quota exceeded for this model, immediately switch to next model without waiting
          break;
        } else if (attempt === 1 && isTemporary) {
          // Brief backoff before retry on same model
          await new Promise((r) => setTimeout(r, 500));
        } else {
          // Move on to next model
          break;
        }
      }
    }
  }

  throw lastError || new Error("Усі AI моделі наразі недоступні через пікове навантаження");
}

// Heuristic fallback parser when AI models are temporarily experiencing 503/high-demand
function extractJewelryFromUserNotes(notes: string, rawImagesCount: number) {
  const fullText = notes || "";
  const lowerText = fullText.toLowerCase();

  let itemType = "ring";
  if (/сережк|серьг/i.test(lowerText)) itemType = "earrings";
  else if (/ланцюж|цеп|колье|кольє|намисто/i.test(lowerText)) itemType = "necklace";
  else if (/браслет/i.test(lowerText)) itemType = "bracelet";
  else if (/підвіс|подвес|кулон/i.test(lowerText)) itemType = "pendant";
  else if (/хрестик|крестик|ладанка|обручк/i.test(lowerText)) itemType = "other";

  let metalType = "gold";
  let purity = 585;
  if (/срібл|серебр|925/i.test(lowerText) && !/позолот/i.test(lowerText)) {
    metalType = "silver";
    purity = 925;
  } else if (/платин|950/i.test(lowerText)) {
    metalType = "platinum";
    purity = 950;
  } else if (/паладі|паллади/i.test(lowerText)) {
    metalType = "palladium";
    purity = 500;
  }

  const purityMatch = fullText.match(/\b(375|585|750|925|950|999)\b/);
  if (purityMatch) purity = Number(purityMatch[1]);

  let metalWeightGrams: number | null = null;
  const weightMatch =
    fullText.match(/(?:вага|вес|weight)[\s:=]*([0-9]+[.,]?[0-9]*)\s*(?:г|g|гр|грамм)?/i) ||
    fullText.match(/\b([0-9]+[.,][0-9]{1,2})\s*(?:г|g|гр)\b/i);
  if (weightMatch && weightMatch[1]) {
    const val = parseFloat(weightMatch[1].replace(",", "."));
    if (val > 0.1 && val < 500) metalWeightGrams = val;
  }

  let price: number | null = null;
  const priceMatch =
    fullText.match(/(?:ціна|цена|price|вартість)[\s:=]*([0-9\s]{3,})/i) ||
    fullText.match(/([0-9\s]{3,})\s*(?:грн|uah|usd|\$|€|eur|₴)/i);
  if (priceMatch && priceMatch[1]) {
    const cleanNum = priceMatch[1].replace(/\s/g, "");
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0) price = val;
  }

  let currency = "UAH";
  if (/\$|usd|дол/i.test(lowerText)) currency = "USD";
  else if (/€|eur|євро|евро/i.test(lowerText)) currency = "EUR";

  const gemstones: any[] = [];
  if (/діамант|диамант|бриллиант|diamond/i.test(lowerText)) {
    gemstones.push({
      type: "Діамант",
      count: 1,
      carats: 0.05,
      clarity: "VS2",
      color: "G",
      origin: "natural",
    });
  } else if (/фіаніт|фианит|циркон|цирконій|zirconia/i.test(lowerText)) {
    gemstones.push({
      type: "Фіаніт",
      count: 3,
      carats: 0.03,
      clarity: "",
      color: "White",
      origin: "synthetic",
    });
  } else if (/смарагд|изумруд|emerald/i.test(lowerText)) {
    gemstones.push({
      type: "Смарагд",
      count: 1,
      carats: 0.2,
      clarity: "",
      color: "Green",
      origin: "natural",
    });
  } else if (/топаз|topaz/i.test(lowerText)) {
    gemstones.push({
      type: "Топаз",
      count: 1,
      carats: 0.5,
      clarity: "",
      color: "Blue",
      origin: "natural",
    });
  }

  return {
    title: notes ? `Ювелірний виріб (${metalType === 'gold' ? 'Золото' : metalType === 'silver' ? 'Срібло' : 'Метал'} ${purity})` : "Ювелірний виріб",
    itemType,
    brand: null,
    store: null,
    productUrl: null,
    photoUrl: null,
    metalType,
    purity,
    metalWeightGrams,
    price,
    currency,
    coatingType: /роді|родиир/i.test(lowerText) ? "rhodium_white" : /позолот/i.test(lowerText) ? "gilding" : "none",
    surfaceFinish: /матов|сатин/i.test(lowerText) ? "matte_sandblast" : "polished",
    gemstones,
    aiNotes: "Увага: через пікове навантаження на AI, базові параметри витягнуто з введених даних. Перевірте значення у формі.",
  };
}

// Heuristic fallback parser from extracted webpage data when Gemini is temporarily unavailable
function extractJewelryHeuristically(pageData: {
  targetUrl: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  jsonLdBlocks?: any[];
  textContent: string;
}): any {
  const fullText = `${pageData.title || ""} ${pageData.description || ""} ${pageData.textContent || ""}`;
  const lowerText = fullText.toLowerCase();

  // 1. Detect item type
  let itemType = "ring";
  if (/сережк|серьг/i.test(lowerText)) itemType = "earrings";
  else if (/ланцюж|цеп|колье|кольє|намисто/i.test(lowerText)) itemType = "necklace";
  else if (/браслет/i.test(lowerText)) itemType = "bracelet";
  else if (/підвіс|подвес|кулон/i.test(lowerText)) itemType = "pendant";
  else if (/хрестик|крестик|ладанка|обручк/i.test(lowerText)) itemType = "other";

  // 2. Detect metal & purity
  let metalType = "gold";
  let purity = 585;

  if (/срібл|серебр|925/i.test(lowerText) && !/позолот/i.test(lowerText)) {
    metalType = "silver";
    purity = 925;
  } else if (/платин|950/i.test(lowerText)) {
    metalType = "platinum";
    purity = 950;
  } else if (/паладі|паллади/i.test(lowerText)) {
    metalType = "palladium";
    purity = 500;
  }

  const purityMatch = fullText.match(/\b(375|585|750|925|950|999)\b/);
  if (purityMatch) {
    purity = Number(purityMatch[1]);
  }

  // 3. Detect price from JSON-LD or text
  let price = 0;
  let currency = "UAH";

  if (Array.isArray(pageData.jsonLdBlocks)) {
    for (const block of pageData.jsonLdBlocks) {
      const checkOffer = (obj: any) => {
        if (!obj) return;
        if (obj.offers) {
          const offer = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
          if (offer?.price) price = Number(offer.price);
          if (offer?.priceCurrency) currency = offer.priceCurrency;
        } else if (obj.price) {
          price = Number(obj.price);
          if (obj.priceCurrency) currency = obj.priceCurrency;
        }
      };
      checkOffer(block);
      if (block["@graph"] && Array.isArray(block["@graph"])) {
        block["@graph"].forEach(checkOffer);
      }
    }
  }

  if (!price || isNaN(price)) {
    const priceMatch = fullText.match(/(\d[\d\s]{2,})\s*(?:грн|UAH|₴)/i);
    if (priceMatch) {
      const numStr = priceMatch[1].replace(/\s/g, "");
      price = Number(numStr) || 0;
    }
  }

  // 4. Detect weight
  let metalWeightGrams = 0;
  const weightMatch =
    fullText.match(/(?:вага|вес|weight|середня вага)[\s:]*([0-9]+[.,]?[0-9]*)\s*(?:г|g|гр|грамм)?/i) ||
    fullText.match(/([0-9]+[.,][0-9]{1,2})\s*(?:г|g|гр)\b/i);
  if (weightMatch && weightMatch[1]) {
    const parsedWeight = parseFloat(weightMatch[1].replace(",", "."));
    if (parsedWeight > 0.1 && parsedWeight < 500) {
      metalWeightGrams = parsedWeight;
    }
  }

  // 5. Detect brand / store
  let brand = "";
  let store = "";
  if (/zolotiyvik/i.test(pageData.targetUrl) || /золотий вік/i.test(fullText)) {
    brand = "Золотий Вік";
    store = "Золотий Вік";
  } else if (/sovajewelry|sova/i.test(pageData.targetUrl) || /\bsova\b/i.test(fullText)) {
    brand = "SOVA";
    store = "SOVA Jewelry";
  } else if (/ukrzoloto|укрзолото/i.test(pageData.targetUrl) || /укрзолото/i.test(fullText)) {
    brand = "Укрзолото";
    store = "Укрзолото";
  } else if (/zarina/i.test(pageData.targetUrl) || /zarina/i.test(fullText)) {
    brand = "Zarina";
    store = "Ювелірний дім Zarina";
  } else if (/aurum/i.test(pageData.targetUrl) || /aurum/i.test(fullText)) {
    brand = "AURUM";
    store = "AURUM";
  } else if (/kuz\.ua|кюз/i.test(pageData.targetUrl) || /кюз/i.test(fullText)) {
    brand = "Київський Ювелірний Завод";
    store = "КЮЗ";
  }

  // 6. Detect gemstones
  const gemstones: any[] = [];
  if (/діамант|бриллиант|diamond/i.test(lowerText)) {
    gemstones.push({
      type: "Діамант",
      count: 1,
      carats: 0.05,
      clarity: "VS2",
      color: "G",
      origin: "natural",
    });
  } else if (/фіаніт|фианит|циркон|цирконій|zirconia/i.test(lowerText)) {
    gemstones.push({
      type: "Фіаніт",
      count: 3,
      carats: 0.03,
      clarity: "",
      color: "White",
      origin: "synthetic",
    });
  } else if (/смарагд|изумруд|emerald/i.test(lowerText)) {
    gemstones.push({
      type: "Смарагд",
      count: 1,
      carats: 0.2,
      clarity: "",
      color: "Green",
      origin: "natural",
    });
  } else if (/топаз|topaz/i.test(lowerText)) {
    gemstones.push({
      type: "Топаз",
      count: 1,
      carats: 0.5,
      clarity: "",
      color: "Blue",
      origin: "natural",
    });
  } else if (/перл|жемчуг|pearl/i.test(lowerText)) {
    gemstones.push({
      type: "Перли",
      count: 1,
      carats: 0.3,
      clarity: "",
      color: "White",
      origin: "natural",
    });
  }

  return {
    title: pageData.title || "Ювелірний виріб",
    itemType,
    brand: brand || null,
    store: store || null,
    productUrl: pageData.targetUrl,
    photoUrl: pageData.imageUrl || "",
    metalType,
    purity,
    metalWeightGrams,
    price,
    currency,
    coatingType: /роді|родиир/i.test(lowerText) ? "rhodium_white" : /позолот/i.test(lowerText) ? "gilding" : "none",
    surfaceFinish: /матов|сатин/i.test(lowerText) ? "matte_sandblast" : "polished",
    gemstones,
    aiNotes: "Параметри витягнуто зі структури та характеристик сторінки магазину.",
  };
}
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

// Helper function to fetch and extract rich product page data from online jewelry store URL
async function fetchAndExtractProductPage(url: string) {
  let targetUrl = url.trim();
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    targetUrl = "https://" + targetUrl;
  }

  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Не вдалося завантажити сторінку товару (HTTP ${response.status})`);
  }

  const html = await response.text();
  const meta = extractHtmlMetadata(html, targetUrl);

  // Extract structured JSON-LD schemas
  const jsonLdBlocks: any[] = [];
  const jsonLdMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      jsonLdBlocks.push(parsed);
    } catch {}
  }

  // Strip script, style, and svg tags for clean text extraction
  const cleanHtml = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, " ");

  // Extract text representation
  const textContent = cleanHtml
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16000);

  // Attempt to fetch product image as base64 so Gemini Vision can also inspect the jewelry piece
  let imageBase64: string | null = null;
  if (meta.imageUrl && (meta.imageUrl.startsWith("http://") || meta.imageUrl.startsWith("https://"))) {
    try {
      const imgRes = await fetch(meta.imageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuf).toString("base64");
        const contentType = imgRes.headers.get("content-type") || "image/jpeg";
        imageBase64 = `data:${contentType};base64,${base64}`;
      }
    } catch (imgErr) {
      console.warn("Could not fetch product image for vision analysis:", imgErr);
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

// Analyze jewelry from product store URL, uploaded images, or combination using Gemini
app.post("/api/analyze-jewelry", async (req, res) => {
  try {
    const { url, imagesBase64, imageBase64, mimeType = "image/jpeg", userNotes } = req.body || {};

    const rawImages: string[] = Array.isArray(imagesBase64) && imagesBase64.length > 0
      ? [...imagesBase64]
      : (imageBase64 ? [imageBase64] : []);

    const hasUrl = typeof url === "string" && url.trim().length > 0;

    if (!hasUrl && rawImages.length === 0) {
      return res.status(400).json({
        error: "Будь ласка, вкажіть посилання на товар у магазині або завантажте фото біржі чи виробу",
      });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(400).json({
        error: "Для автоматичного AI розпізнавання потрібен ключ GEMINI_API_KEY. Будь ласка, вкажіть GEMINI_API_KEY у налаштуваннях середовища.",
      });
    }

    let pageData: Awaited<ReturnType<typeof fetchAndExtractProductPage>> | null = null;
    if (hasUrl) {
      try {
        pageData = await fetchAndExtractProductPage(url);
        // If webpage has an image and no images were uploaded by the user, attach it
        if (pageData.imageBase64 && rawImages.length === 0) {
          rawImages.push(pageData.imageBase64);
        }
      } catch (err: any) {
        console.warn("Failed to fetch product webpage directly:", err);
      }
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

    let promptText = "";

    if (pageData) {
      promptText = `Ти — провідний експерт-гемолог, оцінювач ювелірних виробів та аналітик цін в ювелірних магазинах.
Тобі надано інформацію та характеристики зі сторінки товару в інтернет-магазині:
Посилання: ${pageData.targetUrl}
Заголовок сторінки: ${pageData.title || "Не вказано"}
Опис товару: ${pageData.description || "Не вказано"}
JSON-LD структуровані дані: ${JSON.stringify(pageData.jsonLdBlocks).slice(0, 4000)}
Текст та характеристики зі сторінки товару:
${pageData.textContent.slice(0, 8000)}

${rawImages.length > 0 ? "Також надано зображення товару для візуального аналізу." : ""}
${userNotes ? `\nВАЖЛИВО! КОРИСТУВАЧ ВКАЗАВ ПРИМІТКИ / ПАРАМЕТРИ (МАЮТЬ НАЙВИЩИЙ ПРІОРИТЕТ, якщо вага, ціна або характеристики вказані тут, ОБОВ'ЯЗКОВО візьми їх): "${userNotes}"\n` : ""}

Уважно проаналізуй всі дані зі сторінки та фотографій, витягни всі параметри прикраси у форматі JSON:
- title: повна та чітка назва прикраси українською мовою (наприклад: "Золота каблучка з фіанітами", "Сережки з білого золота 585 з діамантами")
- itemType: тип виробу ("ring" | "necklace" | "earrings" | "bracelet" | "pendant" | "other")
- brand: бренд або виробник (наприклад "Золотий Вік", "SOVA", "Zarina", "КЮЗ", "Укрзолото", "Столична Ювелірна Фабрика", "Pandora", "Cartier" або назва магазину)
- store: назва інтернет-магазину або платформи
- productUrl: ${JSON.stringify(pageData.targetUrl)}
- photoUrl: ${JSON.stringify(pageData.imageUrl || "")}
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
Тобі надано ${rawImages.length > 1 ? `${rawImages.length} зображень одного ювелірного виробу (лицьова і зворотна сторона біржової бирки, фото самого виробу, клейма/проби, чек або сертифікат)` : "зображення ювелірного виробу (бирка, чек, сертифікат або сам виріб)"}.
${userNotes ? `\nВАЖЛИВО! КОРИСТУВАЧ ВКАЗАВ ДОДАТКОВІ ПРИМІТКИ (МАЮТЬ НАЙВИЩИЙ ПРІОРИТЕТ, якщо вага, ціна чи проба вказані тут, ОБОВ'ЯЗКОВО підстав їх): "${userNotes}"\n` : ""}

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

    let parsedData: any = {};
    try {
      const response = await generateWithModelFallback(ai, {
        contents: [
          ...imageParts,
          { text: promptText },
        ],
        config: {
          responseMimeType: "application/json",
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

      const text = response.text || "{}";
      parsedData = safeParseJson(text);
    } catch (aiErr: any) {
      console.warn("AI generation failed with all models, checking fallback options:", aiErr);
      if (pageData) {
        // Use smart heuristic fallback from scraped page data
        parsedData = extractJewelryHeuristically(pageData);
      } else if (userNotes || rawImages.length > 0) {
        // Use smart heuristic fallback from user notes and input
        parsedData = extractJewelryFromUserNotes(userNotes || "", rawImages.length);
      } else {
        throw aiErr;
      }
    }

    // Fallbacks if pageData has URL or photo
    if (pageData) {
      if (!parsedData.productUrl) parsedData.productUrl = pageData.targetUrl;
      if (!parsedData.photoUrl && pageData.imageUrl) parsedData.photoUrl = pageData.imageUrl;
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error("Error in /api/analyze-jewelry:", error);
    res.status(500).json({ error: error?.message || "Помилка аналізу ювелірного виробу" });
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

    const response = await generateWithModelFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
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
