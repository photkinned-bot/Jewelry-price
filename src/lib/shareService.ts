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
 * Encodes gemstones into an ultra-compact string: type.count.carats.origin.price
 */
function serializeGemstones(gemstones?: GemstoneItem[]): string {
  if (!gemstones || gemstones.length === 0) return '';
  return gemstones
    .map((g) => {
      const shortType = GEM_SHORT_MAP[g.type] || g.type || 'd';
      const parts = [
        shortType,
        g.count || 1,
        g.caratsPerStone || 0,
        g.origin === 'lab' ? 'l' : 'n',
      ];
      if (g.customTotalPriceUsd) {
        parts.push(Math.round(g.customTotalPriceUsd));
      }
      return parts.join('.');
    })
    .join(',');
}

/**
 * Decodes gemstone string back to GemstoneItem array
 */
function deserializeGemstones(str: string): GemstoneItem[] {
  if (!str) return [];
  const items: GemstoneItem[] = [];
  const entries = str.split(',');

  for (let i = 0; i < entries.length; i++) {
    const parts = entries[i].split('.');
    if (parts.length >= 3) {
      const rawType = parts[0] || 'd';
      const type = (SHORT_TO_GEM_MAP[rawType] || rawType || 'diamond') as GemType;
      const count = Math.max(1, parseInt(parts[1], 10) || 1);
      const caratsPerStone = Math.max(0, parseFloat(parts[2]) || 0);
      const origin: GemOrigin = parts[3] === 'l' ? 'lab' : 'natural';
      const customPrice = parts[4] ? parseFloat(parts[4]) : undefined;

      items.push({
        id: `shared-gem-${Date.now()}-${i}`,
        type,
        nameUk: GEM_NAMES_MAP[type] || 'Дорогоцінний камінь',
        count,
        caratsPerStone,
        origin,
        customTotalPriceUsd: customPrice,
      });
    }
  }

  return items;
}

/**
 * Generates an ultra-compact, human-readable shareable URL
 * Example: https://site.com/?m=g&p=585&w=4.2&r=28500
 */
export function getShareUrl(
  inputs: CalculationInputs,
  currency: Currency = 'UAH',
  overrideBaseUrl?: string
): string {
  const baseUrl = overrideBaseUrl || getCleanBaseUrl();
  const params = new URLSearchParams();

  // Ultra-compact metal code: g = gold, s = silver, pt = platinum, pd = palladium
  const metalCode =
    inputs.metalType === 'gold' ? 'g' :
    inputs.metalType === 'silver' ? 's' :
    inputs.metalType === 'platinum' ? 'pt' : 'pd';

  params.set('m', metalCode);
  if (inputs.purity) params.set('p', inputs.purity.toString());
  if (inputs.metalWeightGrams) params.set('w', inputs.metalWeightGrams.toString());
  if (inputs.retailPrice) params.set('r', inputs.retailPrice.toString());
  if (currency && currency !== 'UAH') params.set('c', currency);

  // Optional details (only included if set/non-default to keep link tiny)
  if (inputs.title && inputs.title.trim()) params.set('t', inputs.title.trim());
  if (inputs.itemType && inputs.itemType !== 'ring') params.set('type', inputs.itemType);
  if (inputs.storeName && inputs.storeName.trim()) params.set('s', inputs.storeName.trim());
  if (inputs.brandName && inputs.brandName.trim()) params.set('b', inputs.brandName.trim());

  if (inputs.laborComplexity && inputs.laborComplexity !== 'standard_casting') {
    const laborCode =
      inputs.laborComplexity === 'stamping' ? 'st' :
      inputs.laborComplexity === 'complex_handcraft' ? 'ch' :
      inputs.laborComplexity === 'exclusive_designer' ? 'ed' : 'sc';
    params.set('l', laborCode);
  }
  if (inputs.customLaborCostUsd) {
    params.set('lc', inputs.customLaborCostUsd.toString());
  }

  if (inputs.coatingType && inputs.coatingType !== 'none') {
    params.set('co', inputs.coatingType);
  }
  if (inputs.surfaceFinish && inputs.surfaceFinish !== 'polished') {
    params.set('sf', inputs.surfaceFinish);
  }

  if (inputs.engravingType && inputs.engravingType !== 'none') {
    params.set('eg', inputs.engravingType);
    if (inputs.engravingText) params.set('et', inputs.engravingText);
  }

  if (inputs.wastagePercent && inputs.wastagePercent !== 8) {
    params.set('wg', inputs.wastagePercent.toString());
  }

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

    // 1. Check compact parameters first (?m=g / ?p=585 / ?w=...)
    const metal = getParam('m') || getParam('metal');
    const purity = getParam('p') || getParam('purity');
    const weight = getParam('w') || getParam('weight');

    if (metal || purity || weight) {
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

      const parsedInputs: CalculationInputs = {
        ...EMPTY_CALCULATION_INPUTS,
        id: `shared-${Date.now()}`,
        title: getParam('t') || getParam('title') || '',
        itemType: (getParam('type') as any) || 'ring',
        metalType,
        purity: purity ? parseInt(purity, 10) : (metalType === 'gold' ? 585 : metalType === 'silver' ? 925 : 950),
        metalWeightGrams: weight ? parseFloat(weight) : 0,
        retailPrice: getParam('r') ? parseFloat(getParam('r')!) : 0,
        currency,
        storeName: getParam('s') || getParam('store') || '',
        brandName: getParam('b') || getParam('brand') || '',
        laborComplexity,
        customLaborCostUsd: getParam('lc') ? parseFloat(getParam('lc')!) : undefined,
        coatingType: (getParam('co') as CoatingType) || 'none',
        surfaceFinish: (getParam('sf') as SurfaceFinishType) || 'polished',
        engravingType: (getParam('eg') as EngravingType) || 'none',
        engravingText: getParam('et') || '',
        wastagePercent: getParam('wg') ? parseFloat(getParam('wg')!) : 8,
        gemstones: getParam('g') ? deserializeGemstones(getParam('g')!) : [],
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
    const keysToRemove = ['m', 'metal', 'p', 'purity', 'w', 'weight', 'r', 'c', 't', 'title', 'type', 's', 'b', 'l', 'lc', 'co', 'sf', 'eg', 'et', 'wg', 'g', 'calc'];
    keysToRemove.forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
  } catch (err) {
    console.warn('Could not replace browser history state:', err);
  }
}

export type ShareFormatMode = 'link_only' | 'short_summary' | 'full_details';

/**
 * Formats sharing message based on selected mode
 */
export function formatShareContent(
  mode: ShareFormatMode,
  inputs: CalculationInputs,
  result: CalculationResult,
  currency: Currency,
  shareUrl: string
): string {
  // Mode 1: Pure single short link (NO text clutter, zero risk in Viber)
  if (mode === 'link_only') {
    return shareUrl;
  }

  const metalName =
    inputs.metalType === 'gold' ? 'Золото' :
    inputs.metalType === 'silver' ? 'Срібло' :
    inputs.metalType === 'platinum' ? 'Платина' : 'Паладій';

  const title = inputs.title?.trim() || `${metalName} ${inputs.purity}`;

  // Mode 2: Ultra-short single sentence + link
  if (mode === 'short_summary') {
    return `💎 ${title} (${inputs.metalWeightGrams}г) • Собівартість: ${formatMoney(result.rawMaterialsTotal, currency)} | Ціна: ${formatMoney(result.retailPrice, currency)}\n${shareUrl}`;
  }

  // Mode 3: Detailed calculation summary
  const gemsSummary = inputs.gemstones && inputs.gemstones.length > 0
    ? inputs.gemstones.map((g) => `${g.count}x ${g.nameUk} (${g.caratsPerStone * g.count}ct)`).join(', ')
    : 'Без каміння';

  const lines = [
    `💎 Розрахунок: «${title}»`,
    inputs.storeName ? `🏬 Магазин: ${inputs.storeName}` : '',
    `⚖️ ${metalName} ${inputs.purity} (${inputs.metalWeightGrams} г)`,
    `✨ Вставки: ${gemsSummary}`,
    `🪙 Собівартість сировини: ${formatMoney(result.rawMaterialsTotal, currency)}`,
    `💰 Роздрібна ціна: ${formatMoney(result.retailPrice, currency)}`,
    `📊 Націнка: ${result.markupRatio}x (+${result.markupPercent}%)`,
    '',
    `🔍 Посилання на розрахунок:`,
    shareUrl,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Generates direct social network and messenger sharing URLs
 */
export function getSocialShareLinks(shareUrl: string, textToSend: string, title: string) {
  const encodedText = encodeURIComponent(textToSend);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(`Ювелірний розрахунок: ${title || 'Прикраса'}`);

  return {
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(title ? `💎 ${title}` : '')}`,
    viber: `viber://forward?text=${encodedText}`,
    viberWeb: `https://302.viber.com/send?text=${encodedText}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedText}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodeURIComponent(title ? `💎 ${title}` : '')}`,
    email: `mailto:?subject=${encodedTitle}&body=${encodedText}`,
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
