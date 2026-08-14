import {
  CalculationInputs,
  CalculationResult,
  Currency,
  MetalType,
  LaborComplexity,
  CoatingType,
  SurfaceFinishType,
  EngravingType,
  GemstoneItem,
  GemType,
  GemOrigin,
} from '../types';
import { formatMoney } from '../data/metalRates';
import { EMPTY_CALCULATION_INPUTS } from '../data/sampleItems';

export interface SharedPayload {
  v: number;
  inputs: CalculationInputs;
  currency?: Currency;
}

const STORAGE_CUSTOM_DOMAIN_KEY = 'jewelry_calc_custom_share_domain';

/**
 * Gets saved custom public domain if user configured one (e.g. github.io or vercel.app)
 */
export function getSavedCustomDomain(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(STORAGE_CUSTOM_DOMAIN_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Saves custom public domain
 */
export function saveCustomDomain(domain: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (domain.trim()) {
      let clean = domain.trim();
      if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
        clean = 'https://' + clean;
      }
      localStorage.setItem(STORAGE_CUSTOM_DOMAIN_KEY, clean);
    } else {
      localStorage.removeItem(STORAGE_CUSTOM_DOMAIN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns whether current runtime is in a private AI Studio / Cloud Run dev preview
 */
export function isDevSandboxEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.includes('run.app') || host.includes('localhost') || host.includes('127.0.0.1');
}

/**
 * Returns clean base URL with trailing slash for GitHub Pages / subfolder hosting compatibility
 */
export function getCleanBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  
  // 1. If custom domain is set by user, use it
  const customDomain = getSavedCustomDomain();
  if (customDomain) {
    let clean = customDomain;
    if (!clean.endsWith('/') && !clean.endsWith('.html')) {
      clean += '/';
    }
    return clean;
  }

  const loc = window.location;
  let path = loc.pathname || '/';

  // If path doesn't end with a slash and is not a static .html file, append slash
  // This prevents GitHub Pages 404 errors when query parameters are appended
  if (!path.endsWith('/') && !path.endsWith('.html')) {
    path = path + '/';
  }

  return `${loc.origin}${path}`;
}

/**
 * Gemstone type to Ukrainian label mapping for decoding
 */
const GEM_NAMES_MAP: Record<GemType, string> = {
  diamond: 'Діамант (Diamond)',
  lab_diamond: 'Лабораторний діамант (Lab-grown)',
  emerald: 'Смарагд (Emerald)',
  ruby: 'Рубін (Ruby)',
  sapphire: 'Сапфір (Sapphire)',
  cubic_zirconia: 'Фіаніт / Муасаніт',
  topaz: 'Топаз / Гранат / Аметист',
  pearl: 'Перли (Перлина)',
  other: 'Інший дорогоцінний камінь',
};

const GEM_SHORT_MAP: Record<GemType, string> = {
  diamond: 'd',
  lab_diamond: 'ld',
  emerald: 'em',
  ruby: 'rb',
  sapphire: 'sp',
  cubic_zirconia: 'cz',
  topaz: 'tp',
  pearl: 'pr',
  other: 'ot',
};

const SHORT_TO_GEM_MAP: Record<string, GemType> = {
  d: 'diamond',
  ld: 'lab_diamond',
  em: 'emerald',
  rb: 'ruby',
  sp: 'sapphire',
  cz: 'cubic_zirconia',
  tp: 'topaz',
  pr: 'pearl',
  ot: 'other',
};

/**
 * Encodes gemstones into an ultra-compact, robust string:
 * Format per gem: type~count~carats~origin~customTotalPrice~customPricePerCarat~customName~color~clarity
 * Separator between gems: ';'
 */
function serializeGemstones(gemstones?: GemstoneItem[]): string {
  if (!gemstones || gemstones.length === 0) return '';
  return gemstones
    .map((g) => {
      const shortType = GEM_SHORT_MAP[g.type] || g.type || 'd';
      const originCode = g.origin === 'lab' ? 'l' : g.origin === 'synthetic' ? 's' : 'n';
      const count = g.count || 1;
      const carats = g.caratsPerStone || 0;
      const customTotalPriceStr =
        g.customTotalPriceUsd !== undefined && g.customTotalPriceUsd !== null && !isNaN(g.customTotalPriceUsd)
          ? String(Math.round(g.customTotalPriceUsd * 100) / 100)
          : '';
      const customPricePerCaratStr =
        g.customPricePerCaratUsd !== undefined && g.customPricePerCaratUsd !== null && !isNaN(g.customPricePerCaratUsd)
          ? String(Math.round(g.customPricePerCaratUsd * 100) / 100)
          : '';
      const customNameStr = g.customName ? encodeURIComponent(g.customName.trim()).replace(/~/g, '%7E') : '';
      const colorStr = g.colorQuality ? encodeURIComponent(g.colorQuality.trim()).replace(/~/g, '%7E') : '';
      const clarityStr = g.clarityQuality ? encodeURIComponent(g.clarityQuality.trim()).replace(/~/g, '%7E') : '';

      const parts = [
        shortType,
        String(count),
        String(carats),
        originCode,
        customTotalPriceStr,
        customPricePerCaratStr,
        customNameStr,
        colorStr,
        clarityStr,
      ];

      // Trim trailing empty parts to keep URL as compact as possible
      while (parts.length > 4 && parts[parts.length - 1] === '') {
        parts.pop();
      }

      return parts.join('~');
    })
    .join(';');
}

/**
 * Decodes gemstone string back to GemstoneItem array
 * Supports current '~' delimiter, ':' alternative, and legacy '.' format
 */
function deserializeGemstones(str: string): GemstoneItem[] {
  if (!str) return [];
  const items: GemstoneItem[] = [];
  
  // Split multiple stones by ';' or ',' (if separated by comma)
  const gemEntries = str.split(/[;,]/);

  for (let i = 0; i < gemEntries.length; i++) {
    const rawEntry = gemEntries[i].trim();
    if (!rawEntry) continue;

    let delimiter = '~';
    if (rawEntry.includes('~')) {
      delimiter = '~';
    } else if (rawEntry.includes(':')) {
      delimiter = ':';
    } else if (rawEntry.includes('.')) {
      delimiter = '.';
    }

    const parts = rawEntry.split(delimiter);
    if (parts.length >= 2) {
      const rawType = parts[0] || 'd';
      const type = (SHORT_TO_GEM_MAP[rawType] || rawType || 'diamond') as GemType;
      const count = Math.max(1, parseInt(parts[1], 10) || 1);

      let caratsPerStone = 0;
      let origin: GemOrigin = 'natural';
      let customTotalPriceUsd: number | undefined = undefined;
      let customPricePerCaratUsd: number | undefined = undefined;
      let customName: string | undefined = undefined;
      let colorQuality: string | undefined = undefined;
      let clarityQuality: string | undefined = undefined;

      if (delimiter === '.') {
        // Smart parse legacy format where decimal numbers like 0.1 might have been split
        let curIdx = 2;
        if (parts[curIdx] === '0' && parts[curIdx + 1] && /^\d+$/.test(parts[curIdx + 1])) {
          caratsPerStone = parseFloat(`0.${parts[curIdx + 1]}`) || 0;
          curIdx += 2;
        } else {
          caratsPerStone = parseFloat(parts[curIdx]) || 0;
          curIdx += 1;
        }

        const rawOrigin = parts[curIdx];
        curIdx += 1;
        if (rawOrigin === 'l' || rawOrigin === 'lab') origin = 'lab';
        else if (rawOrigin === 's' || rawOrigin === 'synthetic') origin = 'synthetic';
        else if (type === 'cubic_zirconia') origin = 'synthetic';
        else if (type === 'lab_diamond') origin = 'lab';

        if (parts[curIdx] !== undefined && parts[curIdx] !== '') {
          // Check if custom price had a decimal point split
          if (parts[curIdx + 1] && /^\d+$/.test(parts[curIdx + 1])) {
            customTotalPriceUsd = parseFloat(`${parts[curIdx]}.${parts[curIdx + 1]}`);
            curIdx += 2;
          } else {
            customTotalPriceUsd = parseFloat(parts[curIdx]);
            curIdx += 1;
          }
        }
        if (parts[curIdx]) {
          try { customName = decodeURIComponent(parts[curIdx]); } catch { customName = parts[curIdx]; }
        }
        if (parts[curIdx + 1]) {
          try { colorQuality = decodeURIComponent(parts[curIdx + 1]); } catch { colorQuality = parts[curIdx + 1]; }
        }
        if (parts[curIdx + 2]) {
          try { clarityQuality = decodeURIComponent(parts[curIdx + 2]); } catch { clarityQuality = parts[curIdx + 2]; }
        }
      } else {
        // Unambiguous modern format (using '~' or ':')
        caratsPerStone = Math.max(0, parseFloat(parts[2]) || 0);

        const rawOrigin = parts[3];
        if (rawOrigin === 'l' || rawOrigin === 'lab') origin = 'lab';
        else if (rawOrigin === 's' || rawOrigin === 'synthetic') origin = 'synthetic';
        else if (type === 'cubic_zirconia') origin = 'synthetic';
        else if (type === 'lab_diamond') origin = 'lab';

        const customTotalVal = parts[4] && parts[4] !== '' ? parseFloat(parts[4]) : undefined;
        if (typeof customTotalVal === 'number' && !isNaN(customTotalVal)) {
          customTotalPriceUsd = customTotalVal;
        }

        const customPerCaratVal = parts[5] && parts[5] !== '' ? parseFloat(parts[5]) : undefined;
        if (typeof customPerCaratVal === 'number' && !isNaN(customPerCaratVal)) {
          customPricePerCaratUsd = customPerCaratVal;
        }

        if (parts[6] && parts[6] !== '') {
          try { customName = decodeURIComponent(parts[6]); } catch { customName = parts[6]; }
        }
        if (parts[7] && parts[7] !== '') {
          try { colorQuality = decodeURIComponent(parts[7]); } catch { colorQuality = parts[7]; }
        }
        if (parts[8] && parts[8] !== '') {
          try { clarityQuality = decodeURIComponent(parts[8]); } catch { clarityQuality = parts[8]; }
        }
      }

      items.push({
        id: `shared-gem-${Date.now()}-${i}`,
        type,
        nameUk: GEM_NAMES_MAP[type] || 'Дорогоцінний камінь',
        customName,
        count,
        caratsPerStone,
        origin,
        colorQuality,
        clarityQuality,
        customTotalPriceUsd,
        customPricePerCaratUsd,
      });
    }
  }

  return items;
}

/**
 * Generates an ultra-compact, human-readable shareable URL
 * Preserves all inputs, gemstone pricing, and store product links
 */
export function getShareUrl(
  inputs: CalculationInputs,
  currency: Currency = 'UAH',
  overrideBaseUrl?: string
): string {
  const baseUrl = overrideBaseUrl || getCleanBaseUrl();
  const params = new URLSearchParams();

  // Metal code: g = gold, s = silver, pt = platinum, pd = palladium
  const metalCode =
    inputs.metalType === 'gold' ? 'g' :
    inputs.metalType === 'silver' ? 's' :
    inputs.metalType === 'platinum' ? 'pt' : 'pd';

  params.set('m', metalCode);
  if (inputs.purity) params.set('p', inputs.purity.toString());
  if (inputs.metalWeightGrams) params.set('w', inputs.metalWeightGrams.toString());
  if (inputs.retailPrice) params.set('r', inputs.retailPrice.toString());
  if (currency && currency !== 'UAH') params.set('c', currency);

  // Essential store/brand/title & product URL
  if (inputs.title && inputs.title.trim()) params.set('t', inputs.title.trim());
  if (inputs.itemType && inputs.itemType !== 'ring') params.set('type', inputs.itemType);
  if (inputs.brandName && inputs.brandName.trim()) params.set('b', inputs.brandName.trim());
  if (inputs.storeName && inputs.storeName.trim()) params.set('s', inputs.storeName.trim());
  if (inputs.productUrl && inputs.productUrl.trim()) params.set('u', inputs.productUrl.trim());

  // Labor
  if (inputs.laborComplexity && inputs.laborComplexity !== 'standard_casting') {
    const laborCode =
      inputs.laborComplexity === 'stamping' ? 'st' :
      inputs.laborComplexity === 'complex_handcraft' ? 'ch' :
      inputs.laborComplexity === 'exclusive_designer' ? 'ed' : 'sc';
    params.set('l', laborCode);
  }
  if (inputs.customLaborCostUsd !== undefined && inputs.customLaborCostUsd > 0) {
    params.set('lc', inputs.customLaborCostUsd.toString());
  }

  // Coating
  if (inputs.coatingType && inputs.coatingType !== 'none') {
    params.set('co', inputs.coatingType);
  }
  if (inputs.customCoatingCostUsd !== undefined && inputs.customCoatingCostUsd >= 0) {
    params.set('cco', inputs.customCoatingCostUsd.toString());
  }

  // Surface finish
  if (inputs.surfaceFinish && inputs.surfaceFinish !== 'polished') {
    params.set('sf', inputs.surfaceFinish);
  }
  if (inputs.customFinishCostUsd !== undefined && inputs.customFinishCostUsd >= 0) {
    params.set('csf', inputs.customFinishCostUsd.toString());
  }

  // Engraving
  if (inputs.engravingType && inputs.engravingType !== 'none') {
    params.set('eg', inputs.engravingType);
  }
  if (inputs.engravingText && inputs.engravingText.trim()) {
    params.set('et', inputs.engravingText.trim());
  }
  if (inputs.customEngravingCostUsd !== undefined && inputs.customEngravingCostUsd >= 0) {
    params.set('ceg', inputs.customEngravingCostUsd.toString());
  }

  // Loss percentage
  if (inputs.wastagePercent !== undefined && inputs.wastagePercent !== 8) {
    params.set('wg', inputs.wastagePercent.toString());
  }

  // Hallmark fee
  if (inputs.hallmarkCostUsd !== undefined && inputs.hallmarkCostUsd !== 1.5) {
    params.set('hm', inputs.hallmarkCostUsd.toString());
  }

  // Notes
  if (inputs.notes && inputs.notes.trim()) {
    params.set('nt', inputs.notes.trim());
  }

  // Gemstones
  if (inputs.gemstones && inputs.gemstones.length > 0) {
    const serializedGems = serializeGemstones(inputs.gemstones);
    if (serializedGems) params.set('g', serializedGems);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Encodes data to a URL-safe Base64 string (legacy fallback)
 */
export function encodeDataToUrlSafe(data: unknown): string {
  try {
    const jsonStr = JSON.stringify(data);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error('Error encoding share data:', err);
    return '';
  }
}

/**
 * Decodes URL-safe Base64 string back to an object (legacy fallback)
 */
export function decodeDataFromUrlSafe<T = unknown>(str: string): T | null {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    return JSON.parse(decoded) as T;
  } catch (err) {
    console.error('Error decoding share data:', err);
    return null;
  }
}

/**
 * Parses the current URL to check if a shared calculation is present
 * Supports both compact query params (?m=g&p=585...), hash parameters, and legacy Base64 (?calc=...)
 */
export function parseShareUrlFromLocation(): { inputs: CalculationInputs; currency?: Currency } | null {
  try {
    if (typeof window === 'undefined') return null;

    const urlParams = new URLSearchParams(window.location.search);
    let hashParams = new URLSearchParams();
    if (window.location.hash) {
      const hashStr = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      hashParams = new URLSearchParams(hashStr);
    }

    const getParam = (key: string): string | null => {
      return urlParams.get(key) || hashParams.get(key);
    };

    // 1. Check compact parameters (?m=g / ?p=585 / ?w=... / ?r=...)
    const metal = getParam('m') || getParam('metal');
    const purity = getParam('p') || getParam('purity');
    const weight = getParam('w') || getParam('weight');
    const retail = getParam('r') || getParam('retail') || getParam('price');
    const title = getParam('t') || getParam('title');

    if (metal || purity || weight || retail || title) {
      const validMetalTypes: MetalType[] = ['gold', 'silver', 'platinum', 'palladium'];
      let metalType: MetalType = 'gold';
      if (metal) {
        if (metal === 'g' || metal === 'gold') metalType = 'gold';
        else if (metal === 's' || metal === 'silver') metalType = 'silver';
        else if (metal === 'pt' || metal === 'platinum') metalType = 'platinum';
        else if (metal === 'pd' || metal === 'palladium') metalType = 'palladium';
        else if (validMetalTypes.includes(metal as MetalType)) metalType = metal as MetalType;
      }

      const currencyParam = getParam('c') || getParam('currency');
      const currency: Currency = (currencyParam === 'USD' || currencyParam === 'EUR' || currencyParam === 'UAH')
        ? currencyParam
        : 'UAH';

      const laborParam = getParam('l') || getParam('labor');
      let laborComplexity: LaborComplexity = 'standard_casting';
      if (laborParam === 'st' || laborParam === 'stamping') laborComplexity = 'stamping';
      else if (laborParam === 'sc' || laborParam === 'standard_casting') laborComplexity = 'standard_casting';
      else if (laborParam === 'ch' || laborParam === 'complex_handcraft') laborComplexity = 'complex_handcraft';
      else if (laborParam === 'ed' || laborParam === 'exclusive_designer') laborComplexity = 'exclusive_designer';

      const customLaborVal = getParam('lc') || getParam('laborCost');
      const customCoatingVal = getParam('cco') || getParam('customCoating');
      const customFinishVal = getParam('csf') || getParam('customFinish');
      const customEngravingVal = getParam('ceg') || getParam('customEngraving');
      const hallmarkVal = getParam('hm') || getParam('hallmark');
      const productUrlVal = getParam('u') || getParam('url') || getParam('productUrl') || '';

      const parsedInputs: CalculationInputs = {
        ...EMPTY_CALCULATION_INPUTS,
        id: `shared-${Date.now()}`,
        title: title || '',
        itemType: (getParam('type') as any) || 'ring',
        metalType,
        purity: purity ? parseInt(purity, 10) : (metalType === 'gold' ? 585 : metalType === 'silver' ? 925 : 950),
        metalWeightGrams: weight ? parseFloat(weight) : 0,
        retailPrice: retail ? parseFloat(retail) : 0,
        currency,
        brandName: getParam('b') || getParam('brand') || '',
        storeName: getParam('s') || getParam('store') || '',
        productUrl: productUrlVal,
        laborComplexity,
        customLaborCostUsd: customLaborVal ? parseFloat(customLaborVal) : undefined,
        coatingType: (getParam('co') as CoatingType) || 'none',
        customCoatingCostUsd: customCoatingVal ? parseFloat(customCoatingVal) : undefined,
        surfaceFinish: (getParam('sf') as SurfaceFinishType) || 'polished',
        customFinishCostUsd: customFinishVal ? parseFloat(customFinishVal) : undefined,
        engravingType: (getParam('eg') as EngravingType) || 'none',
        engravingText: getParam('et') || getParam('engravingText') || '',
        customEngravingCostUsd: customEngravingVal ? parseFloat(customEngravingVal) : undefined,
        wastagePercent: getParam('wg') ? parseFloat(getParam('wg')!) : 8,
        hallmarkCostUsd: hallmarkVal ? parseFloat(hallmarkVal) : 1.5,
        notes: getParam('nt') || getParam('notes') || undefined,
        gemstones: (getParam('g') || getParam('gems')) ? deserializeGemstones((getParam('g') || getParam('gems'))!) : [],
      };

      return {
        inputs: parsedInputs,
        currency,
      };
    }

    // 2. Legacy fallback check (?calc=... or #calc=...)
    const calcParam = getParam('calc');
    if (calcParam) {
      const payload = decodeDataFromUrlSafe<SharedPayload>(calcParam);
      if (payload && payload.inputs && typeof payload.inputs === 'object') {
        return {
          inputs: payload.inputs,
          currency: payload.currency,
        };
      }
    }

    return null;
  } catch (err) {
    console.warn('Failed to parse share parameter from URL:', err);
    return null;
  }
}

/**
 * Cleans share parameters from the URL bar without reloading the page
 */
export function removeShareParamFromBrowserUrl(): void {
  try {
    const url = new URL(window.location.href);
    const keysToRemove = [
      'm', 'metal', 'p', 'purity', 'w', 'weight', 'r', 'retail', 'price',
      'c', 'currency', 't', 'title', 'type', 's', 'store', 'b', 'brand',
      'u', 'url', 'productUrl', 'l', 'labor', 'lc', 'laborCost',
      'co', 'coating', 'cco', 'sf', 'finish', 'csf', 'eg', 'engraving',
      'et', 'engravingText', 'ceg', 'wg', 'wastage', 'hm', 'hallmark',
      'nt', 'notes', 'g', 'gems', 'gemstones', 'calc',
    ];
    keysToRemove.forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
  } catch (err) {
    console.warn('Could not replace browser history state:', err);
  }
}

export type ShareFormatMode = 'link_only' | 'short_summary' | 'full_details';

/**
 * Formats sharing message based on selected mode
 * Designed to look clean, compact, and engaging in Viber, Telegram, WhatsApp
 */
export function formatShareContent(
  mode: ShareFormatMode,
  inputs: CalculationInputs,
  result: CalculationResult,
  currency: Currency,
  shareUrl: string
): string {
  // Mode 1: Pure short link
  if (mode === 'link_only') {
    return shareUrl;
  }

  const metalName =
    inputs.metalType === 'gold' ? 'Золото' :
    inputs.metalType === 'silver' ? 'Срібло' :
    inputs.metalType === 'platinum' ? 'Платина' : 'Паладій';

  const title = inputs.title?.trim() || `${metalName} ${inputs.purity}`;

  const gemsList = inputs.gemstones && inputs.gemstones.length > 0
    ? inputs.gemstones
        .map((g) => {
          const name = g.type === 'other' && g.customName ? g.customName : g.nameUk.split(' ')[0];
          return `${g.count}x ${name} (${(g.caratsPerStone * g.count).toFixed(2)}ct)`;
        })
        .join(', ')
    : null;

  // Mode 2: Ultra-neat compact messenger message (default)
  if (mode === 'short_summary') {
    const lines = [
      `💎 ${title}`,
      `⚖️ ${metalName} ${inputs.purity} (${inputs.metalWeightGrams}г)${gemsList ? ` • ${gemsList}` : ''}`,
      inputs.storeName || inputs.brandName ? `🏬 ${[inputs.brandName, inputs.storeName].filter(Boolean).join(' • ')}` : '',
      `💰 Ціна в магазині: ${formatMoney(result.retailPrice, currency)}`,
      `🪙 Собівартість сировини: ${formatMoney(result.rawMaterialsTotal, currency)} (націнка ${result.markupRatio}x)`,
      '',
      `🔗 Відкрити повний розрахунок:`,
      shareUrl,
    ].filter(Boolean);

    return lines.join('\n');
  }

  // Mode 3: Detailed calculation report
  const gemsSummary = gemsList || 'Без каміння';

  const lines = [
    `💎 Ювелірний розрахунок: «${title}»`,
    inputs.storeName ? `🏬 Магазин: ${inputs.storeName}` : '',
    inputs.brandName ? `🏷️ Бренд: ${inputs.brandName}` : '',
    `⚖️ Матеріал: ${metalName} ${inputs.purity} (${inputs.metalWeightGrams} г)`,
    `✨ Вставки: ${gemsSummary}`,
    `🪙 Собівартість сировини (метал + каміння): ${formatMoney(result.rawMaterialsTotal, currency)}`,
    `🛠️ Виробнича собівартість: ${formatMoney(result.productionCostTotal, currency)}`,
    `💰 Роздрібна ціна: ${formatMoney(result.retailPrice, currency)}`,
    `📊 Націнка магазину: ${result.markupRatio}x (+${result.markupPercent}%)`,
    `🏦 Ліквідність / викуп: ~${formatMoney(result.pawnshopEstimate, currency)}`,
    '',
    `🔍 Посилання на відкриття параметрів:`,
    shareUrl,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generates direct social network and messenger sharing URLs
 */
export function getSocialShareLinks(shareUrl: string, textToSend: string, title: string) {
  const encodedFullText = encodeURIComponent(textToSend);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`Ювелірний розрахунок: ${title || 'Прикраса'}`);
  
  // For Telegram, text without repeating URL because url param is already attached
  const textWithoutUrl = textToSend.replace(shareUrl, '').trim();
  const encodedTelegramText = encodeURIComponent(textWithoutUrl);

  return {
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTelegramText}`,
    viber: `viber://forward?text=${encodedFullText}`,
    viberWeb: `https://302.viber.com/send?text=${encodedFullText}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedFullText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTelegramText}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedFullText}`,
  };
}

/**
 * Native Share API trigger for mobile, tablet & desktop OS share sheets
 */
export async function triggerDeviceShare(data: {
  title: string;
  text?: string;
  url: string;
}): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: data.title,
        text: data.text,
        url: data.url,
      });
      return true;
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.warn('Native share failed:', err);
      }
      return false;
    }
  }
  return false;
}
