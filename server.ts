import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize Gemini AI client on server side
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing from environment variables.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

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

// Analyze image (tag, receipt, or jewelry piece) using Gemini Vision API
app.post("/api/analyze-jewelry", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", userNotes } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Зображення є обов'язковим для аналізу" });
    }

    const ai = getAiClient();
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

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
- Вставки каміння (gemstones: масив об'єктів з полями: type (напр. "Діамант", "Смарагд", "Фіаніт"), count (кількість), carats (вага в каратах на 1 камінь або сумарно), clarity (чистота, напр "VVS2", "VS1", "3/4" або null), color (колір, напр "D", "G", "4" або null), origin ("natural" | "lab" | "synthetic")))
- Нотатки AI (aiNotes: стислий аналіз того, що зображено та які параметри були розпізнані або припущені).
${userNotes ? `Додаткова інформація від користувача: ${userNotes}` : ""}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType,
            },
          },
          { text: promptText },
        ],
      },
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
    const parsedData = JSON.parse(text);
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
2. investmentRating (оцінка ліквідності від 1 до 10 та пояснення)
3. Pros (3 ключові переваги даного виробу або пропозиції)
4. Cons (2-3 застереження або ризики)
5. Advice (порада покупцеві, як торгуватись або що уточнити у продавця перед покупкою)
6. NegotiableDiscount (рекомендована знижка у відсотках, яку варто просити в магазині)`;

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
    const parsedData = JSON.parse(text);
    res.json({ success: true, advice: parsedData });
  } catch (error: any) {
    console.error("Error in /api/ai-advice:", error);
    res.status(500).json({ error: error?.message || "Помилка генерації порад" });
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
