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

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Live / Benchmark metal spot prices per gram in USD, UAH, EUR
app.get("/api/metal-rates", (_req, res) => {
  // Benchmark rates per gram for 100% pure (999) metals
  const usdToUah = 41.5;
  const eurToUah = 45.2;

  // Prices per pure gram in USD
  const gold999PerGramUsd = 88.5; // ~ $2750/oz
  const silver999PerGramUsd = 1.05; // ~ $32.5/oz
  const platinum999PerGramUsd = 31.8; // ~ $990/oz
  const palladium999PerGramUsd = 34.2; // ~ $1060/oz

  res.json({
    updatedAt: new Date().toISOString(),
    currencies: {
      USD: 1,
      UAH: usdToUah,
      EUR: 1 / (eurToUah / usdToUah), // EUR/USD ~1.09
    },
    exchangeRates: {
      USD_UAH: usdToUah,
      EUR_UAH: eurToUah,
    },
    // Standard pure metal prices per 1 gram in USD
    pureMetalRatesUsd: {
      gold: gold999PerGramUsd,
      silver: silver999PerGramUsd,
      platinum: platinum999PerGramUsd,
      palladium: palladium999PerGramUsd,
    },
  });
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
