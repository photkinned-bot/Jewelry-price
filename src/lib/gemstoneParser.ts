import { GemstoneItem, GemType, GemOrigin } from '../types';
import { calculateGemstoneUsdValue } from '../data/gemstoneValuation';

/**
 * Intelligent parser for jewelry tag and AI gemstone information
 */

interface RawGemInput {
  type?: string;
  name?: string;
  stone?: string;
  title?: string;
  description?: string;
  nameUk?: string;
  count?: number | string;
  qty?: number | string;
  quantity?: number | string;
  amount?: number | string;
  pieces?: number | string;
  pcs?: number | string;
  carats?: number | string;
  carat?: number | string;
  weight?: number | string;
  caratsPerStone?: number | string;
  caratWeight?: number | string;
  ct?: number | string;
  size?: number | string;
  clarity?: string;
  clarityQuality?: string;
  color?: string;
  colorQuality?: string;
  origin?: string;
  price?: number | string;
  priceUsd?: number | string;
  cost?: number | string;
  value?: number | string;
  customTotalPriceUsd?: number | string;
}

/**
 * Parse any raw gemstone representation (string or object) into a normalized GemstoneItem
 */
export function parseSingleGemstone(
  raw: string | RawGemInput,
  index: number = 0
): GemstoneItem | null {
  if (!raw) return null;

  let textToAnalyze = '';
  let count: number = 1;
  let carats: number = 0;
  let colorQuality: string = '';
  let clarityQuality: string = '';
  let originOverride: GemOrigin | undefined = undefined;
  let customPriceUsd: number | undefined = undefined;

  if (typeof raw === 'string') {
    textToAnalyze = raw.trim();
  } else if (typeof raw === 'object') {
    textToAnalyze = [
      raw.type,
      raw.name,
      raw.stone,
      raw.title,
      raw.nameUk,
      raw.description,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Parse Count
    const rawCount = raw.count ?? raw.qty ?? raw.quantity ?? raw.amount ?? raw.pieces ?? raw.pcs;
    if (typeof rawCount === 'number' && !isNaN(rawCount) && rawCount > 0) {
      count = Math.round(rawCount);
    } else if (typeof rawCount === 'string') {
      const numMatch = rawCount.match(/(\d+)/);
      if (numMatch) count = parseInt(numMatch[1], 10);
    }

    // Parse Carats
    const rawCarats =
      raw.carats ??
      raw.caratsPerStone ??
      raw.carat ??
      raw.weight ??
      raw.caratWeight ??
      raw.ct ??
      raw.size;
    if (typeof rawCarats === 'number' && !isNaN(rawCarats) && rawCarats > 0) {
      carats = rawCarats;
    } else if (typeof rawCarats === 'string') {
      const numMatch = rawCarats.replace(',', '.').match(/([0-9]+\.?[0-9]*)/);
      if (numMatch) carats = parseFloat(numMatch[1]);
    }

    // Color & Clarity
    if (raw.color || raw.colorQuality) colorQuality = String(raw.color || raw.colorQuality).trim();
    if (raw.clarity || raw.clarityQuality) clarityQuality = String(raw.clarity || raw.clarityQuality).trim();

    // Origin
    if (raw.origin) {
      const orig = String(raw.origin).toLowerCase();
      if (orig.includes('lab') || orig.includes('вирощ')) originOverride = 'lab';
      else if (orig.includes('synth') || orig.includes('штуч') || orig.includes('фіан') || orig.includes('цирк'))
        originOverride = 'synthetic';
      else if (orig.includes('nat') || orig.includes('природ') || orig.includes('нат'))
        originOverride = 'natural';
    }

    // Custom Price
    const rawPrice = raw.price ?? raw.priceUsd ?? raw.cost ?? raw.value ?? raw.customTotalPriceUsd;
    if (typeof rawPrice === 'number' && !isNaN(rawPrice) && rawPrice > 0) {
      customPriceUsd = rawPrice;
    } else if (typeof rawPrice === 'string') {
      const priceMatch = rawPrice.replace(',', '.').match(/([0-9]+\.?[0-9]*)/);
      if (priceMatch) customPriceUsd = parseFloat(priceMatch[1]);
    }
  }

  // If text is empty, return null
  if (!textToAnalyze && carats === 0 && !raw) return null;

  const lower = textToAnalyze.toLowerCase();

  // 1. Try to extract count from text if count is 1 (e.g. "3 Фіаніти", "2 Бр Кр57", "12 шт")
  if (count <= 1) {
    const countMatch = textToAnalyze.match(/^(\d+)\s*(?:шт|x|х|\*|бр|фіан|диам|диамант|діамант|сапф|смарагд|топаз)/i) ||
      textToAnalyze.match(/(\d+)\s*(?:шт|pcs)/i);
    if (countMatch) {
      const parsedCount = parseInt(countMatch[1], 10);
      if (parsedCount > 0) count = parsedCount;
    }
  }

  // 2. Try to extract carats from text if carats <= 0 (e.g. "0.08ct", "0,15 карат", "0.05 ct", "1.20ct")
  if (carats <= 0) {
    const caratMatch = textToAnalyze.replace(',', '.').match(/([0-9]+\.?[0-9]*)\s*(?:ct|к-т|карат|крт|кт)/i) ||
      textToAnalyze.replace(',', '.').match(/(?:кр-57|кр57|круг|огранка|вставка)[^0-9]*([0-9]+\.?[0-9]+)/i);
    if (caratMatch) {
      const parsedCarat = parseFloat(caratMatch[1]);
      if (parsedCarat > 0) {
        // If count > 1 and total carats is specified (e.g., "2 Бр 0.14ct"), check if it's total or per stone
        carats = parsedCarat;
      }
    }
  }

  // 3. Try to extract color/clarity fraction from text if not present (e.g. "3/4", "4/5", "2/3А", "3/4A", "D/VS1", "F-VS2")
  if (!colorQuality || !clarityQuality) {
    const fractionMatch = textToAnalyze.match(/\b([1-9]|D|E|F|G|H|I|J)\s*[\/\-]\s*([1-9]|IF|VVS[12]?|VS[12]?|SI[12]?|I[123]?)[A-Za-zА-Яа-я]?\b/i);
    if (fractionMatch) {
      if (!colorQuality) colorQuality = fractionMatch[1].toUpperCase();
      if (!clarityQuality) clarityQuality = fractionMatch[2].toUpperCase();
    }
  }

  // 4. Identify Stone Type and Name
  let type: GemType = 'other';
  let nameUk = 'Вставка';
  let customName: string | undefined = undefined;
  let defaultOrigin: GemOrigin = 'natural';

  if (/діамант|диамант|бриллиант|бриліант|diamond|\bбр[\.\s]|\bбр\b/i.test(lower)) {
    if (/лабораторн|lab|вирощен|cvd|hpht/i.test(lower) || originOverride === 'lab') {
      type = 'lab_diamond';
      nameUk = 'Лабораторний діамант';
      defaultOrigin = 'lab';
    } else {
      type = 'diamond';
      nameUk = 'Діамант';
      defaultOrigin = 'natural';
    }
    if (carats <= 0) carats = 0.05; // Industry default for single accent diamond if unstated
  } else if (/фіаніт|фианит|циркон|цирконій|zircon|\bcz\b|муасан|кубічний|куб\.?\s*циркон/i.test(lower)) {
    type = 'cubic_zirconia';
    nameUk = /муасан/i.test(lower) ? 'Муасаніт' : 'Фіаніт';
    defaultOrigin = 'synthetic';
    if (carats <= 0) carats = 0.03;
  } else if (/смарагд|изумруд|emerald/i.test(lower)) {
    type = 'emerald';
    nameUk = 'Смарагд';
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.25;
  } else if (/рубін|рубин|ruby/i.test(lower)) {
    type = 'ruby';
    nameUk = 'Рубін';
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.30;
  } else if (/сапфір|сапфир|sapphire/i.test(lower)) {
    type = 'sapphire';
    nameUk = 'Сапфір';
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.35;
  } else if (/топаз|topaz/i.test(lower)) {
    type = 'topaz';
    nameUk = 'Топаз';
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.50;
  } else if (/перл|жемчуг|pearl/i.test(lower)) {
    type = 'pearl';
    nameUk = 'Перли';
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.50;
  } else if (/аметист|гранат|кварц|хризоліт|цитрин|турмалін|опал|аквамарин|шпінель/i.test(lower)) {
    type = 'topaz'; // Grouped with semi-precious gems category
    const cleanWord = textToAnalyze.split(/[\s,.-]+/)[0] || 'Напівдорогоцінний камінь';
    nameUk = cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1);
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.50;
  } else {
    type = 'other';
    nameUk = textToAnalyze ? textToAnalyze.slice(0, 30) : 'Вставка';
    customName = textToAnalyze || undefined;
    defaultOrigin = 'natural';
    if (carats <= 0) carats = 0.05;
  }

  const finalOrigin: GemOrigin = originOverride || defaultOrigin;

  const item: GemstoneItem = {
    id: 'gem-' + index + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    type,
    nameUk,
    customName,
    count: Math.max(1, count),
    caratsPerStone: Math.round(Math.max(0.005, carats) * 1000) / 1000,
    origin: finalOrigin,
    colorQuality: colorQuality || undefined,
    clarityQuality: clarityQuality || undefined,
    customTotalPriceUsd: customPriceUsd && customPriceUsd > 0 ? customPriceUsd : undefined,
  };

  return item;
}

/**
 * Extracts gemstones from free-form text (e.g. user notes, product title, description, or scanned text)
 */
export function extractGemstonesFromFreeText(text: string): GemstoneItem[] {
  if (!text || typeof text !== 'string') return [];

  const foundItems: GemstoneItem[] = [];
  const normalized = text.replace(/\r\n|\r|\n/g, ' ');

  // Look for tag notation patterns like:
  // "1 Бр. Кр-57 0.08 3/4" or "2 діаманти 0.1ct" or "3 Фіаніти" or "Вставка: Сапфір 0.5ct"
  const lines = normalized.split(/[,;\n•\|]|(?:\s+(?:та|і|плюс|\+)\s+)/);

  for (let i = 0; i < lines.length; i++) {
    const chunk = lines[i].trim();
    if (!chunk) continue;

    // Check if chunk mentions a gemstone keyword
    if (
      /діамант|диамант|брилліант|бриллиант|diamond|\bбр[\.\s]|\bбр\b|фіаніт|циркон|смарагд|изумруд|сапфір|рубін|топаз|перл|муасан|аметист|гранат|кварц|вставка/i.test(
        chunk
      )
    ) {
      const parsed = parseSingleGemstone(chunk, foundItems.length);
      if (parsed) {
        foundItems.push(parsed);
      }
    }
  }

  return foundItems;
}

/**
 * Normalizes an array of raw gemstones from AI or web scraping into clean GemstoneItem[]
 */
export function normalizeGemstonesList(
  rawList: any,
  fallbackText?: string
): GemstoneItem[] {
  const result: GemstoneItem[] = [];

  if (Array.isArray(rawList) && rawList.length > 0) {
    for (let i = 0; i < rawList.length; i++) {
      const parsed = parseSingleGemstone(rawList[i], i);
      if (parsed) {
        result.push(parsed);
      }
    }
  } else if (rawList && typeof rawList === 'object') {
    const parsed = parseSingleGemstone(rawList, 0);
    if (parsed) result.push(parsed);
  } else if (typeof rawList === 'string' && rawList.trim().length > 0) {
    const extracted = extractGemstonesFromFreeText(rawList);
    result.push(...extracted);
  }

  // If list is still empty, scan fallbackText (e.g. userNotes or product title)
  if (result.length === 0 && fallbackText) {
    const fromText = extractGemstonesFromFreeText(fallbackText);
    result.push(...fromText);
  }

  return result;
}
